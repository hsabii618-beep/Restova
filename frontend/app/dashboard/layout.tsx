import React from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import LogoutButton from "@/components/auth/logout-button";
import Link from "next/link";
import { LayoutDashboard, ShoppingBag, UtensilsCrossed, Users, BarChart3, Settings, FileText, PlusCircle } from "lucide-react";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/dashboard");
  }

  const { data: memberData } = await supabase
    .from("restaurant_users")
    .select(`
      role,
      created_at,
      restaurants ( id, name, slug, is_active, deleted_at )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const role = memberData?.role;
  const restaurantArray = memberData?.restaurants;
  const restaurant = restaurantArray ? (Array.isArray(restaurantArray) ? restaurantArray[0] : restaurantArray) : null;

  const isActive = restaurant && !restaurant.deleted_at && restaurant.is_active;

  // Minimal layout for Onboarding and Pending
  if (!isActive) {
    return (
      <div className="min-h-screen flex flex-col bg-neutral-50 dark:bg-neutral-950 font-sans text-neutral-900 dark:text-neutral-50">
        <header className="flex justify-between items-center px-6 py-4 bg-white dark:bg-black border-b border-neutral-200 dark:border-neutral-800">
          <h1 className="font-bold tracking-tighter uppercase text-lg">Restova</h1>
          <LogoutButton />
        </header>
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-50 font-sans">
      <Sidebar role={role} />
      <div className="flex flex-col flex-1 min-w-0">
        <Topbar user={user} role={role} restaurant={restaurant} />
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

function Sidebar({ role }: { role: string }) {
  const navLinks = getNavLinks(role);

  return (
    <aside className="w-64 bg-white dark:bg-black border-r border-neutral-200 dark:border-neutral-800 flex-col hidden md:flex shrink-0">
      <div className="h-16 flex items-center px-6 border-b border-neutral-200 dark:border-neutral-800">
        <span className="font-black tracking-tighter uppercase text-lg">Restova</span>
      </div>
      <nav className="flex-1 py-4 flex flex-col gap-1 px-3">
        {navLinks.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.name}
              href={link.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-50"
            >
              <Icon className="w-5 h-5" />
              {link.name}
            </Link>
          )
        })}
      </nav>
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

function getNavLinks(role: string) {
  if (role === 'owner') {
    return [
      { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
      { name: "Orders", href: "/dashboard/orders", icon: ShoppingBag },
      { name: "History", href: "/dashboard/history", icon: FileText },
      { name: "Menu", href: "/dashboard/menu", icon: UtensilsCrossed },
      { name: "Staff", href: "/dashboard/staff", icon: Users },
      { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
      { name: "Settings", href: "/dashboard/settings", icon: Settings },
    ];
  } else if (role === 'manager') {
    return [
      { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
      { name: "Orders", href: "/dashboard/orders", icon: ShoppingBag },
      { name: "History", href: "/dashboard/history", icon: FileText },
      { name: "Menu", href: "/dashboard/menu", icon: UtensilsCrossed },
      { name: "Reports", href: "/dashboard/reports", icon: FileText },
    ];
  } else if (role === 'cashier') {
    return [
      { name: "New Order", href: "/dashboard/new-order", icon: PlusCircle },
      { name: "Active Orders", href: "/dashboard/orders", icon: ShoppingBag },
      { name: "History", href: "/dashboard/history", icon: FileText },
    ];
  }
  return [];
}