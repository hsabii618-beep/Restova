import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Building2, ChevronRight, UserCircle } from "lucide-react";
import LogoutButton from "@/components/auth/logout-button";

export default async function SelectRestaurantPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/dashboard/select-restaurant");
  }

  const { data: memberships, error } = await supabase
    .from("restaurant_users")
    .select(`
      role,
      restaurants (
        id,
        name,
        slug
      )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-red-50 border border-red-200 p-6 rounded-2xl text-red-700 max-w-md w-full">
          <h3 className="font-bold text-lg mb-2">Error Loading Memberships</h3>
          <p className="text-sm opacity-80 mb-4">{error.message}</p>
          <Link href="/dashboard" className="text-sm font-bold underline">Retry</Link>
        </div>
      </div>
    );
  }

  if (!memberships || memberships.length === 0) {
    redirect("/dashboard/onboarding");
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 font-sans selection:bg-orange-100">
      <div className="max-w-xl mx-auto py-20 px-6">
        <div className="flex justify-between items-center mb-12">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Building2 className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-neutral-900 dark:text-white uppercase italic">Restova</h1>
          </div>
          <LogoutButton />
        </div>

        <div className="mb-10">
          <h2 className="text-3xl font-black tracking-tight mb-2">Select Restaurant</h2>
          <p className="text-neutral-500 font-medium">Which workspace would you like to access today?</p>
        </div>

        <div className="grid gap-4">
          {memberships.map((membership: any) => {
            const restaurant = membership.restaurants;
            if (!restaurant) return null;

            return (
              <Link
                key={restaurant.id}
                href={`/dashboard/${restaurant.slug}`}
                className="group p-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl hover:border-orange-500/30 hover:shadow-xl hover:shadow-orange-500/5 hover:-translate-y-0.5 transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400 group-hover:bg-orange-50 dark:group-hover:bg-orange-950/30 group-hover:text-orange-500 transition-colors">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-neutral-900 dark:text-white group-hover:text-orange-500 transition-colors">{restaurant.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                       <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500">
                        {membership.role}
                      </span>
                      <span className="text-xs text-neutral-400 font-medium">@{restaurant.slug}</span>
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-neutral-300 group-hover:text-orange-500 transition-colors" />
              </Link>
            );
          })}
        </div>

        <div className="mt-12 pt-12 border-t border-neutral-200 dark:border-neutral-800 flex flex-col items-center">
          <p className="text-sm text-neutral-400 font-medium mb-6">Need to set up a new location?</p>
          <Link
            href="/dashboard/onboarding"
            className="flex items-center gap-2 px-6 py-3 bg-neutral-900 dark:bg-white text-white dark:text-black rounded-xl font-bold hover:scale-105 active:scale-95 transition-all"
          >
            Create New Restaurant
          </Link>
        </div>
      </div>
    </div>
  );
}
