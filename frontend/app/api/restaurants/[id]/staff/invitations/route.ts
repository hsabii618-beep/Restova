/**
 * frontend/app/api/restaurants/[id]/staff/invitations/route.ts
 * Create a new staff invitation (Owner only)
 */

import { NextResponse, type NextRequest } from "next/server";
import { getAuthUser } from "@/lib/server/auth";
import { securityAudit, SECURITY_CONFIG } from "@/lib/server/security";
import { createStaffInvitation, listStaffInvitations } from "@/lib/server/staff-invitations";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const { user, supabase, error: authError } = await getAuthUser(request);
        if (!user || authError) {
            return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
        }

        // 1. Security Audit (Rate Limit per Owner)
        const audit = await securityAudit(request, {
            requireSafeOrigin: true,
            rateLimitKey: `staff-invite-create:${user.id}`,
            rateLimitConfig: SECURITY_CONFIG.STAFF_INVITATION
        });
        if (!audit.allowed) return audit.response!;

        // 2. Role Check

        const { data: memberCheck } = await supabase
            .from("restaurant_users")
            .select("role")
            .eq("restaurant_id", id)
            .eq("user_id", user.id)
            .maybeSingle();

        if (!memberCheck || memberCheck.role !== "owner") {
            return NextResponse.json({ error: "Forbidden: Only owners can create invitations" }, { status: 403 });
        }

        // 3. Payload Validation
        const body = await request.json().catch(() => ({}));
        const { role } = body;

        if (!role) {
            return NextResponse.json({ error: "Role is required." }, { status: 400 });
        }

        // 4. Create Invitation
        const { data, error } = await createStaffInvitation({
            restaurantId: id,
            role,
            createdByUserId: user.id
        });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }

        return NextResponse.json({
            inviteUrl: data.inviteUrl,
            expiresAt: data.expiresAt
        }, { status: 201 });

    } catch (err) {
        console.error("Staff Invitation API error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // 1. Auth & Role Check
        const { user, supabase, error: authError } = await getAuthUser(request);
        if (!user || authError) {
            return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
        }

        const { data: memberCheck } = await supabase
            .from("restaurant_users")
            .select("role")
            .eq("restaurant_id", id)
            .eq("user_id", user.id)
            .maybeSingle();

        if (!memberCheck || memberCheck.role !== "owner") {
            return NextResponse.json({ error: "Forbidden: Only owners can list invitations" }, { status: 403 });
        }

        // 2. List Invitations
        const { data: invitations, error: listError } = await listStaffInvitations(id);

        if (listError) {
            return NextResponse.json({ error: "Failed to load invitations." }, { status: 500 });
        }

        return NextResponse.json(invitations);

    } catch (err) {
        console.error("Staff Invitation List API error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
