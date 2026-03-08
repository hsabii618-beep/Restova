import React from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import LogoutButton from "@/components/auth/logout-button";
import Link from "next/link";
import { 
  LayoutDashboard, 
  ShoppingBag, 
  UtensilsCrossed, 
  Users, 
  BarChart3, 
  Settings, 
  FileText, 
  PlusCircle,
  AlertCircle,
  BadgeCheck
} from "lucide-react";

interface Props {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function RestaurantDashboardLayout({ children, params }: Props) {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/dashboard/${slug}`);
  }

  // 1. Resolve slug and verify membership in one query
  // SECURITY: !inner join enforces that a membership record MUST exist for this user/restaurant
  const { data: memberData, error: memberError } = await supabase
    .from("restaurant_users")
    .select(`
      role,
      restaurants!inner ( 
        id, 
        name, 
        slug, 
        is_active, 
        deleted_at,
        is_open
      )
    `)
    .eq("user_id", user.id)
    .eq("restaurants.slug", slug)
    .maybeSingle();

  if (memberError) {
    console.error("Membership verification error:", memberError);
    return (
      <div className="p-8 text-red-500">
        <h3>Security verification failed.</h3>
      </div>
    );
  }

  // 2. Not a member or restaurant doesn't exist
  if (!memberData) {
    // SECURITY: Don't reveal if it exists or not if user isn't a member
    redirect("/dashboard/select-restaurant");
  }

  const role = memberData.role;
  const restaurant = memberData.restaurants as any;

  // 3. Handle Special States (Rejected / Inactive)
  if (restaurant.deleted_at) {
     return (
      <div className="max-w-xl mx-auto py-20 px-6">
        <header className="mb-12 border-b border-neutral-200 dark:border-neutral-800 pb-6">
          <h2 className="text-2xl font-black uppercase italic tracking-tighter">Restova</h2>
        </header>
        <div className="p-8 bg-white dark:bg-neutral-900 border border-red-200 dark:border-red-900/30 rounded-2xl shadow-xl shadow-red-500/5">
          <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/30 text-red-600 flex items-center justify-center mb-6">
             <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold mb-4">Application Rejected</h3>
          <p className="text-neutral-500 mb-8 font-medium">
            Your application for <b>{restaurant.name}</b> was not approved.
          </p>
          <div className="flex flex-col gap-4">
            <Link href="/dashboard/onboarding" className="px-6 py-3 bg-neutral-900 dark:bg-white text-white dark:text-black rounded-xl font-bold text-center hover:scale-[1.02] active:scale-95 transition-all">
              Submit New Application
            </Link>
            <Link href="/dashboard/select-restaurant" className="text-sm font-bold text-neutral-400 hover:text-neutral-600 text-center">
              Back to Selection
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!restaurant.is_active) {
    return (
      <div className="max-w-xl mx-auto py-20 px-6">
        <header className="mb-12 border-b border-neutral-200 dark:border-neutral-800 pb-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-black uppercase italic tracking-tighter">Restova</h2>
            <LogoutButton />
          </div>
        </header>
        <div className="p-8 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl">
           <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-950/30 text-orange-600 flex items-center justify-center mb-6">
             <BadgeCheck className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold mb-2">Pending Approval</h3>
          <p className="text-neutral-500 mb-6 font-medium">
            Review of <b>{restaurant.name}</b> is in progress. Once approved, your terminal will be unlocked.
          </p>
          <Link href="/dashboard/select-restaurant" className="text-sm font-bold text-orange-600 hover:underline">
            Switch Restaurant
          </Link>
        </div>
      </div>
    );
  }

  // 4. Fetch pending staff approvals count (for badge)
  let pendingStaffApprovals = 0;
  if (role === 'owner') {
    const { count } = await supabase
      .from("staff_invitations")
      .select("*", { count: 'exact', head: true })
      .eq("restaurant_id", restaurant.id)
      .eq("status", "consumed_pending_approval");
    pendingStaffApprovals = count || 0;
  }

  return (
    <div className="flex min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-50 font-sans">
      <Sidebar slug={slug} role={role} pendingApprovals={pendingStaffApprovals} />
      <div className="flex flex-col flex-1 min-w-0">
        <Topbar user={user} role={role} restaurant={restaurant} />
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

function Sidebar({ slug, role, pendingApprovals }: { slug: string, role: string; pendingApprovals?: number }) {
  const navLinks = getNavLinks(slug, role);

  return (
    <aside className="w-64 bg-white dark:bg-black border-r border-neutral-200 dark:border-neutral-800 flex-col hidden md:flex shrink-0">
      <div className="h-16 flex items-center px-6 border-b border-neutral-200 dark:border-neutral-800">
        <Link href={`/dashboard/${slug}`} className="font-black tracking-tighter uppercase text-lg italic bg-gradient-to-br from-neutral-900 to-neutral-500 dark:from-white dark:to-neutral-500 bg-clip-text text-transparent">
          Restova
        </Link>
      </div>
      <nav className="flex-1 py-4 flex flex-col gap-1 px-3">
        {navLinks.map((link) => {
          const Icon = link.icon;
          const showBadge = link.name === 'Staff' && pendingApprovals && pendingApprovals > 0;
          
          return (
            <Link
              key={link.name}
              href={link.href}
              className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-50"
            >
              <div className="flex items-center gap-3">
                <Icon className="w-5 h-5" />
                {link.name}
              </div>
              {showBadge && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white animate-pulse">
                  {pendingApprovals}
                </span>
              )}
            </Link>
          )
        })}
      </nav>
      <div className="p-4 border-t border-neutral-200 dark:border-neutral-800">
         <Link href="/dashboard/select-restaurant" className="flex items-center gap-3 px-3 py-2 text-sm font-bold text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors">
            <LayoutDashboard className="w-4 h-4" />
            Switch Restaurant
         </Link>
      </div>
    </aside>
  );
}

function Topbar({ user, role, restaurant }: { user: any, role: string, restaurant: any }) {
  const displayName = user.user_metadata?.full_name || user.user_metadata?.name || user.email;

  return (
    <header className="h-16 bg-white dark:bg-black border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-3">
        <span className="font-semibold text-lg tracking-tight leading-none">{restaurant.name}</span>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
          {role}
        </span>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400 hidden sm:inline-block">{displayName}</span>
        <LogoutButton />
      </div>
    </header>
  );
}

function getNavLinks(slug: string, role: string) {
  const base = `/dashboard/${slug}`;

  if (role === 'owner') {
    return [
      { name: "Overview", href: `${base}`, icon: LayoutDashboard },
      { name: "Orders", href: `${base}/orders`, icon: ShoppingBag },
      { name: "History", href: `${base}/history`, icon: FileText },
      { name: "Menu", href: `${base}/menu`, icon: UtensilsCrossed },
      { name: "Staff", href: `${base}/staff`, icon: Users },
      { name: "Analytics", href: `${base}/analytics`, icon: BarChart3 },
      { name: "Settings", href: `${base}/settings`, icon: Settings },
    ];
  } else if (role === 'manager') {
    return [
      { name: "Overview", href: `${base}`, icon: LayoutDashboard },
      { name: "Orders", href: `${base}/orders`, icon: ShoppingBag },
      { name: "History", href: `${base}/history`, icon: FileText },
      { name: "Menu", href: `${base}/menu`, icon: UtensilsCrossed },
      { name: "Reports", href: `${base}/reports`, icon: FileText },
    ];
  } else if (role === 'cashier') {
    return [
      { name: "New Order", href: `${base}/new-order`, icon: PlusCircle },
      { name: "Active Orders", href: `${base}/orders`, icon: ShoppingBag },
      { name: "History", href: `${base}/history`, icon: FileText },
    ];
  }
  return [];
}
