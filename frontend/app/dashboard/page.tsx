import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

/**
 * Dashboard Hub: Determines which restaurant context to load.
 * - 0 restaurants -> Onboarding
 * - 1 restaurant -> Direct to [slug]
 * - Multiple -> Choice page
 */
export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/dashboard");
  }

  const { data: memberships, error } = await supabase
    .from("restaurant_users")
    .select(`
      restaurants (
        slug
      )
    `)
    .eq("user_id", user.id);

  if (error) {
    console.error("Dashboard hub error:", error);
    return (
      <div className="p-8 text-red-500">
        <h3>System error loading your memberships.</h3>
        <pre>{JSON.stringify(error, null, 2)}</pre>
      </div>
    );
  }

  if (!memberships || memberships.length === 0) {
    redirect("/dashboard/onboarding");
  }

  if (memberships.length === 1) {
    const slug = (memberships[0].restaurants as any)?.slug;
    if (slug) {
      redirect(`/dashboard/${slug}`);
    }
  }

  // Multiple restaurants
  redirect("/dashboard/select-restaurant");
}
