import { NextResponse, type NextRequest } from "next/server";
import { getAuthUser } from "@/lib/server/auth";
import { securityAudit, SECURITY_CONFIG } from "@/lib/server/security";

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string, orderId: string }> }
) {
    try {
        // 1. Security Audit
        const audit = await securityAudit(request, {
            requireSafeOrigin: true,
            rateLimitKey: 'order-update',
            rateLimitConfig: SECURITY_CONFIG.STAFF_MANAGEMENT
        });
        if (!audit.allowed) return audit.response!;

        const { user, supabase, error: authError } = await getAuthUser(request);
        if (!user || authError) {
            return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
        }

        const { id, orderId } = await params;

        // Verify current user is a member
        const { data: memberCheck } = await supabase
            .from("restaurant_users")
            .select("id, role")
            .eq("restaurant_id", id)
            .eq("user_id", user.id)
            .maybeSingle();

        if (!memberCheck) {
            return NextResponse.json({ error: "Forbidden: Not part of restaurant" }, { status: 403 });
        }

        const body = await request.json().catch(() => ({}));
        const { customerName, type, status, items, payment } = body;

        if (status === "cancelled") {
            // Simple cancellation path
            const { error: cancelError } = await supabase
                .from("orders")
                .update({ status: "cancelled" })
                .eq("id", orderId)
                .eq("restaurant_id", id);

            if (cancelError) return NextResponse.json({ error: "Failed to cancel order." }, { status: 500 });
            return NextResponse.json({ message: "Order cancelled" }, { status: 200 });
        }

        if (!type || !items || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ error: "Invalid payload. Needs type and items." }, { status: 400 });
        }

        // 1. Update order metadata
        const { error: orderError } = await supabase
            .from("orders")
            .update({
                customer_name: customerName || "Guest",
                type: type,
                status: status || "new"
            })
            .eq("id", orderId)
            .eq("restaurant_id", id);

        if (orderError) {
            console.error("Order Update Error:", orderError);
            return NextResponse.json({ error: orderError?.message || "Failed to update order" }, { status: 500 });
        }

        // 2. Overwrite items (simplest approach: delete existing, insert new)
        await supabase.from("order_items").delete().eq("order_id", orderId);

        const orderItemsPayload = items.map((item: any) => ({
            order_id: orderId,
            item_id: item.item_id,
            qty: item.qty,
            unit_price: item.unit_price,
            notes: item.notes || null
        }));

        const { error: itemsError } = await supabase
            .from("order_items")
            .insert(orderItemsPayload);

        if (itemsError) {
            console.error("Order Items Insert Error:", itemsError);
            return NextResponse.json({ error: "Failed to save order items." }, { status: 500 });
        }

        // 3. Optional: Map Cashier Payments
        if (payment && status === "paid") {
            const creatorName = user.user_metadata?.full_name || user.user_metadata?.name || user.email || "Staff Member";
            const totalRequired = orderItemsPayload.reduce((acc: number, it: any) => acc + (it.qty * it.unit_price), 0);
            const received = parseFloat(payment.receivedAmount) || totalRequired;
            const change = received > totalRequired ? received - totalRequired : 0;

            const { error: paymentError } = await supabase.from("payments").insert({
                order_id: orderId,
                method: payment.method || "cash",
                received_amount: received,
                change_amount: change,
                cashier_user_id: memberCheck.id,
                cashier_name: creatorName
            });

            if (paymentError) {
                console.error("Payment insert error", paymentError);
            }
        }

        return NextResponse.json({ message: "Order updated successfully", order_id: orderId }, { status: 200 });

    } catch (err: any) {
        console.error("Order API PUT error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
