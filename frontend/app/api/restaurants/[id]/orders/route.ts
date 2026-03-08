import { NextResponse, type NextRequest } from "next/server";
import { getAuthUser } from "@/lib/server/auth";
import { sanitizeText } from "@/lib/server/restaurants";
import { securityAudit, SECURITY_CONFIG } from "@/lib/server/security";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // 1. Security Audit
        const audit = await securityAudit(request, {
            requireSafeOrigin: true,
            rateLimitKey: 'order-creation',
            rateLimitConfig: SECURITY_CONFIG.PUBLIC_ORDER // Using the restricted config for now
        });
        if (!audit.allowed) return audit.response!;

        const { user, supabase, error: authError } = await getAuthUser(request);
        if (!user || authError) {
            return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
        }

        const { id } = await params;

        // Verify current user is a member
        const { data: memberCheck } = await supabase
            .from("restaurant_users")
            .select("role")
            .eq("restaurant_id", id)
            .eq("user_id", user.id)
            .maybeSingle();

        if (!memberCheck) {
            return NextResponse.json({ error: "Forbidden: Not part of restaurant" }, { status: 403 });
        }

        const body = await request.json().catch(() => ({}));
        const { customerName, type, customerNote, items, status, payment } = body;

        if (!type || !items || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ error: "Invalid payload. Needs type and items." }, { status: 400 });
        }

        const sanitizedCustomerName = sanitizeText(customerName || "Guest", 50);
        const sanitizedCustomerNote = customerNote ? sanitizeText(customerNote, 500) : null;

        const creatorName = user.user_metadata?.full_name || user.user_metadata?.name || user.email || "Staff Member";

        // 1. Create order
        const { data: orderData, error: orderError } = await supabase
            .from("orders")
            .insert({
                restaurant_id: id,
                customer_name: sanitizedCustomerName,
                type: type,
                customer_note: sanitizedCustomerNote,
                status: status || "new",
                created_by: user.id,
                created_by_name: creatorName
            })
            .select()
            .single();

        if (orderError || !orderData) {
            console.error("Order Insert Error:", orderError);
            return NextResponse.json({ error: orderError?.message || "Failed to create order" }, { status: 500 });
        }

        // 2. Create order items
        const orderItemsPayload = items.map((item: any) => ({
            order_id: orderData.id,
            item_id: item.item_id,
            qty: Math.max(1, parseInt(item.qty) || 1),
            unit_price: parseFloat(item.unit_price) || 0,
            notes: item.notes ? sanitizeText(item.notes, 255) : null
        }));

        const { error: itemsError } = await supabase
            .from("order_items")
            .insert(orderItemsPayload);

        if (itemsError) {
            await supabase.from("orders").delete().eq("id", orderData.id);
            return NextResponse.json({ error: "Failed to save order items. Overturned order." }, { status: 500 });
        }

        // 3. Optional: Map Cashier Payments
        if (payment && status === "paid") {
            const memberEntityRes = await supabase.from("restaurant_users").select("id").eq("restaurant_id", id).eq("user_id", user.id).single();

            const totalRequired = orderItemsPayload.reduce((acc: number, it: any) => acc + (it.qty * it.unit_price), 0);
            const received = parseFloat(payment.receivedAmount) || totalRequired;
            const change = received > totalRequired ? received - totalRequired : 0;

            const { error: paymentError } = await supabase.from("payments").insert({
                order_id: orderData.id,
                method: payment.method || "cash",
                received_amount: received,
                change_amount: change,
                cashier_user_id: memberEntityRes.data?.id,
                cashier_name: creatorName
            });

            if (paymentError) {
                console.error("Payment insert error, proceeding carefully", paymentError);
            }
        }

        return NextResponse.json({ message: "Order created", order_id: orderData.id }, { status: 201 });

    } catch (err: any) {
        console.error("Order API error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
