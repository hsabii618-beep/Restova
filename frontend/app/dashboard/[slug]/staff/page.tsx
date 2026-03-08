import { requireDashboardRole } from "@/app/dashboard/role-guard";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/server/supabase-admin";
import StaffManager, { StaffMember } from "./staff-manager";
import { listStaffInvitations } from "@/lib/server/staff-invitations";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function StaffPage({ params }: Props) {
    const { slug } = await params;
    const { user: currentUser, restaurantId } = await requireDashboardRole(["owner", "manager"], slug);

    const supabase = await createSupabaseServerClient();
    const supabaseAdmin = createSupabaseAdminClient();

    // 1. Fetch active staff members
    const { data: staffData } = await supabase
        .from("restaurant_users")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("created_at", { ascending: true });

    // Map to include real user email and name 
    const enhancedStaff: StaffMember[] = await Promise.all(
        (staffData || []).map(async (member) => {
            const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(member.user_id);
            return {
                id: member.id,
                user_id: member.user_id,
                role: member.role,
                email: user?.email || "Unknown Email",
                name: user?.user_metadata?.name || user?.user_metadata?.full_name || "Unknown User",
            };
        })
    );

    // 2. Fetch invitations (only for owners or high managers)
    let invitations = null;
    const isOwner = (staffData || []).find(s => s.user_id === currentUser.id)?.role === 'owner';
    
    if (isOwner) {
        const { data: invitesResult } = await listStaffInvitations(restaurantId);
        invitations = invitesResult;
    }

    return (
        <StaffManager 
            restaurantId={restaurantId} 
            staff={enhancedStaff} 
            currentUserId={currentUser.id} 
            invitations={invitations}
            isOwner={isOwner}
        />
    );
}
