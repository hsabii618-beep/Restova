import { requireDashboardRole } from "../role-guard";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import StaffManager, { StaffMember } from "./staff-manager";

export default async function StaffPage() {
    const { user: currentUser, restaurantId } = await requireDashboardRole(["owner"]);

    const supabase = await createSupabaseServerClient();

    // Use service role just to lookup auth.users metadata safely server-side
    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false, autoRefreshToken: false } }
    );

    // Fetch all staff linkages
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

    return <StaffManager restaurantId={restaurantId} staff={enhancedStaff} currentUserId={currentUser.id} />;
}
