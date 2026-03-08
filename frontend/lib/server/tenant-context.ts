import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export async function requireTenantContext(allowedRoles: string[]) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login?next=/dashboard")
  }

  const { data: memberships } = await supabase
    .from("restaurant_users")
    .select(`
      role,
      restaurant_id,
      created_at,
      restaurants (*)
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(2)

  const membership = memberships?.[0]
  const role = membership?.role

  if (!role || !allowedRoles.includes(role)) {
    redirect("/dashboard")
  }

  return {
    user,
    role,
    restaurantId: membership.restaurant_id,
    restaurant: Array.isArray(membership.restaurants) ? membership.restaurants[0] : membership.restaurants,
    membershipCount: memberships?.length || 0
  }
}
