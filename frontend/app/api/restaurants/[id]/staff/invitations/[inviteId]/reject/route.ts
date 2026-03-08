/**
 * frontend/app/api/restaurants/[id]/staff/invitations/[inviteId]/reject/route.ts
 * Reject a staff invitation (Owner only)
 */

import { NextResponse, type NextRequest } from "next/server";
import { getAuthUser } from "@/lib/server/auth";
import { rejectStaffInvitation } from "@/lib/server/staff-invitations";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string, inviteId: string }> }
) {
    try {
        const { id: restaurantId, inviteId } = await params;

        // 1. Auth & Role Check
        const { user, supabase, error: authError } = await getAuthUser(request);
        if (!user || authError) {
            return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
        }

        const { data: memberCheck } = await supabase
            .from("restaurant_users")
            .select("role")
            .eq("restaurant_id", restaurantId)
            .eq("user_id", user.id)
            .maybeSingle();

        if (!memberCheck || memberCheck.role !== "owner") {
            return NextResponse.json({ error: "Forbidden: Only owners can reject invitations" }, { status: 403 });
        }

        // 2. Reject
        const { error } = await rejectStaffInvitation({
            invitationId: inviteId,
            restaurantId,
            actingUserId: user.id
        });

        if (error) {
            return NextResponse.json({ error }, { status: 400 });
        }

        return NextResponse.json({ success: true });

    } catch (err) {
        console.error("Staff Invitation Reject API error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
