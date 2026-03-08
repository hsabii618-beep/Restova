import { NextResponse, type NextRequest } from "next/server";
import { getAuthUser } from "@/lib/server/auth";
import { createClient } from "@supabase/supabase-js";
import { securityAudit, SECURITY_CONFIG } from "@/lib/server/security";

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string, targetUserId: string }> }
) {
    try {
        // 1. Security Audit
        const audit = await securityAudit(request, {
            requireSafeOrigin: true,
            rateLimitKey: 'staff-management',
            rateLimitConfig: SECURITY_CONFIG.STAFF_MANAGEMENT
        });
        if (!audit.allowed) return audit.response!;

        const { user, supabase, error: authError } = await getAuthUser(request);
        if (!user || authError) {
            return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
        }

        const { id, targetUserId } = await params;

        if (user.id === targetUserId) {
            return NextResponse.json({ error: "Forbidden: Cannot edit self through this endpoint" }, { status: 403 });
        }

        // Verify current user is owner of this restaurant
        const { data: memberCheck } = await supabase
            .from("restaurant_users")
            .select("role")
            .eq("restaurant_id", id)
            .eq("user_id", user.id)
            .maybeSingle();

        if (!memberCheck || memberCheck.role !== "owner") {
            return NextResponse.json({ error: "Forbidden: Only owners can edit staff" }, { status: 403 });
        }

        // Ensure target user is in the same restaurant AND is NOT an owner
        const { data: targetCheck } = await supabase
            .from("restaurant_users")
            .select("role")
            .eq("restaurant_id", id)
            .eq("user_id", targetUserId)
            .maybeSingle();

        if (!targetCheck) {
            return NextResponse.json({ error: "Target user not found in this restaurant" }, { status: 404 });
        }

        if (targetCheck.role === "owner") {
            return NextResponse.json({ error: "Forbidden: Cannot edit an owner" }, { status: 403 });
        }

        const body = await request.json().catch(() => ({}));
        const { name, role, email, password } = body;

        if (role && role !== "manager" && role !== "cashier") {
            return NextResponse.json({ error: "Invalid role specified" }, { status: 400 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: { persistSession: false, autoRefreshToken: false }
        });

        // 1. Update role in restaurant_users if changed
        if (role && role !== targetCheck.role) {
            const { error: updateRoleError } = await supabaseAdmin
                .from("restaurant_users")
                .update({ role })
                .eq("restaurant_id", id)
                .eq("user_id", targetUserId);

            if (updateRoleError) {
                return NextResponse.json({ error: updateRoleError.message }, { status: 500 });
            }
        }

        // 2. Update auth.users metadata and email if requested
        const updates: any = {};
        if (name) {
            updates.user_metadata = { name: name, full_name: name };
        }
        if (email) {
            updates.email = email;
            updates.email_confirm = true; // Auto confirm so they don't lose access waiting for a link
        }
        if (password) {
            updates.password = password;
        }

        if (Object.keys(updates).length > 0) {
            const { error: updateUserError } = await supabaseAdmin.auth.admin.updateUserById(
                targetUserId,
                updates
            );

            if (updateUserError) {
                return NextResponse.json({ error: updateUserError.message }, { status: 500 });
            }
        }

        return NextResponse.json({ message: "Staff updated successfully" }, { status: 200 });

    } catch (err: any) {
        console.error("Staff update error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string, targetUserId: string }> }
) {
    try {
        // 1. Security Audit
        const audit = await securityAudit(request, {
            requireSafeOrigin: true,
            rateLimitKey: 'staff-management',
            rateLimitConfig: SECURITY_CONFIG.STAFF_MANAGEMENT
        });
        if (!audit.allowed) return audit.response!;

        const { user, supabase, error: authError } = await getAuthUser(request);
        if (!user || authError) {
            return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
        }

        const { id, targetUserId } = await params;

        if (user.id === targetUserId) {
            return NextResponse.json({ error: "Forbidden: Cannot delete self" }, { status: 403 });
        }

        // Verify current user is owner of this restaurant
        const { data: memberCheck } = await supabase
            .from("restaurant_users")
            .select("role")
            .eq("restaurant_id", id)
            .eq("user_id", user.id)
            .maybeSingle();

        if (!memberCheck || memberCheck.role !== "owner") {
            return NextResponse.json({ error: "Forbidden: Only owners can delete staff" }, { status: 403 });
        }

        // Ensure target user is in the same restaurant AND is NOT an owner
        const { data: targetCheck } = await supabase
            .from("restaurant_users")
            .select("role")
            .eq("restaurant_id", id)
            .eq("user_id", targetUserId)
            .maybeSingle();

        if (!targetCheck) {
            return NextResponse.json({ error: "Target user not found in this restaurant" }, { status: 404 });
        }

        if (targetCheck.role === "owner") {
            return NextResponse.json({ error: "Forbidden: Cannot delete an owner" }, { status: 403 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: { persistSession: false, autoRefreshToken: false }
        });

        // Delete user purely generated for this restaurant entirely
        // Since our creation endpoint generates a direct user account per staff role,
        // safe deletion implies cleaning out the user entirely from auth.users.
        // The CASCADE in DB schema unlinks them from restaurant_users automatically.
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);

        if (deleteError) {
            return NextResponse.json({ error: deleteError.message }, { status: 500 });
        }

        return NextResponse.json({ message: "Staff deleted successfully" }, { status: 200 });

    } catch (err: any) {
        console.error("Staff delete error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
