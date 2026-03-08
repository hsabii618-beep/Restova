import { NextResponse, type NextRequest } from "next/server";
import { getAuthUser } from "@/lib/server/auth";
import { securityAudit, SECURITY_CONFIG } from "@/lib/server/security";

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string, targetUserId: string }> }
) {
    try {
        const { id, targetUserId } = await params;

        // 1. Security Audit
        const audit = await securityAudit(request, {
            requireSafeOrigin: true,
            rateLimitKey: `staff-mgmt-put:${id}`,
            rateLimitConfig: SECURITY_CONFIG.STAFF_MANAGEMENT
        });
        if (!audit.allowed) return audit.response!;

        const { user, supabase, error: authError } = await getAuthUser(request);
        if (!user || authError) {
            return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
        }

        if (user.id === targetUserId) {
            return NextResponse.json({ error: "Forbidden: Cannot edit self" }, { status: 403 });
        }

        // Verify current user is owner
        const { data: memberCheck } = await supabase
            .from("restaurant_users")
            .select("role")
            .eq("restaurant_id", id)
            .eq("user_id", user.id)
            .maybeSingle();

        if (!memberCheck || memberCheck.role !== "owner") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await request.json().catch(() => ({}));
        const { role } = body;

        if (role && role !== "manager" && role !== "cashier") {
            return NextResponse.json({ error: "Invalid role" }, { status: 400 });
        }

        // Update ONLY membership info
        const { error: updateError } = await supabase
            .from("restaurant_users")
            .update({ role })
            .eq("restaurant_id", id)
            .eq("user_id", targetUserId);

        if (updateError) {
            return NextResponse.json({ error: updateError.message }, { status: 500 });
        }

        return NextResponse.json({ message: "Staff updated successfully" });

    } catch (err) {
        console.error("Staff update error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string, targetUserId: string }> }
) {
    try {
        const { id, targetUserId } = await params;

        // 1. Security Audit
        const audit = await securityAudit(request, {
            requireSafeOrigin: true,
            rateLimitKey: `staff-mgmt-del:${id}`,
            rateLimitConfig: SECURITY_CONFIG.STAFF_MANAGEMENT
        });
        if (!audit.allowed) return audit.response!;

        const { user, supabase, error: authError } = await getAuthUser(request);
        if (!user || authError) {
            return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
        }

        if (user.id === targetUserId) {
            return NextResponse.json({ error: "Forbidden: Cannot delete self" }, { status: 403 });
        }

        // Verify current user is owner
        const { data: memberCheck } = await supabase
            .from("restaurant_users")
            .select("role")
            .eq("restaurant_id", id)
            .eq("user_id", user.id)
            .maybeSingle();

        if (!memberCheck || memberCheck.role !== "owner") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Delete ONLY the membership linkage
        const { error: deleteError } = await supabase
            .from("restaurant_users")
            .delete()
            .eq("restaurant_id", id)
            .eq("user_id", targetUserId);

        if (deleteError) {
            return NextResponse.json({ error: deleteError.message }, { status: 500 });
        }

        return NextResponse.json({ message: "Staff membership removed successfully" });

    } catch (err) {
        console.error("Staff delete error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
