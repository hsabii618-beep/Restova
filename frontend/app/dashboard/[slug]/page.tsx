import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Users } from "lucide-react";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function RestaurantDashboardPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/dashboard/${slug}`);
  }

  // 1. Resolve and Verify Membership
  // SECURITY: Explicitly scope by user_id and slug to prevent cross-tenant exposure
  const { data: memberData, error: memberError } = await supabase
    .from("restaurant_users")
    .select(`
      role,
      restaurants!inner (
        id, 
        name, 
        slug
      )
    `)
    .eq("user_id", user.id)
    .eq("restaurants.slug", slug)
    .maybeSingle();

  if (memberError || !memberData) {
    console.error("Dashboard overview auth error:", memberError);
    redirect("/dashboard/select-restaurant");
  }

  const role = memberData.role;
  const restaurantRow = memberData.restaurants;
  const restaurant = (Array.isArray(restaurantRow) ? restaurantRow[0] : restaurantRow) as { id: string, name: string, slug: string };

  // 2. Fetch pending staff approvals for banner
  let pendingApprovalsCount = 0;
  if (role === 'owner') {
    const { count } = await supabase
      .from("staff_invitations")
      .select("*", { count: 'exact', head: true })
      .eq("restaurant_id", restaurant.id)
      .eq("status", "consumed_pending_approval");
    pendingApprovalsCount = count || 0;
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Overview</h2>
          <p className="text-neutral-500 text-sm">Welcome back to {restaurant.name}.</p>
        </div>
      </div>

      {pendingApprovalsCount > 0 && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex gap-4 items-center">
            <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-blue-700 dark:text-blue-400">Join Requests</h4>
              <p className="text-sm text-blue-600/80 dark:text-blue-400/60">You have {pendingApprovalsCount} new staff member{pendingApprovalsCount > 1 ? 's' : ''} waiting for your approval.</p>
            </div>
          </div>
          <Link 
            href={`/dashboard/${slug}/staff`} 
            className="px-5 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold rounded-lg transition-colors text-center"
          >
            Review Requests
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-6 border border-neutral-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-black">
          <h3 className="text-sm font-medium text-neutral-500 mb-1">Restaurant Status</h3>
          <div className="text-lg font-bold flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>
            Online & Accepting Orders
          </div>
        </div>
        <div className="p-6 border border-neutral-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-black">
          <h3 className="text-sm font-medium text-neutral-500 mb-1">Today&apos;s Revenue</h3>
          <div className="text-2xl font-bold text-neutral-400">---</div>
        </div>
        <div className="p-6 border border-neutral-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-black">
          <h3 className="text-sm font-medium text-neutral-500 mb-1">Active Orders</h3>
          <div className="text-2xl font-bold text-neutral-400">---</div>
        </div>
      </div>

      <div className="p-6 border border-neutral-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-black min-h-[300px]">
        <h3 className="font-semibold mb-4">Recent Activity</h3>
        <div className="flex items-center justify-center h-40 text-sm text-neutral-500 italic">
          No recent activity to display.
        </div>
      </div>
    </div>
  );
}
