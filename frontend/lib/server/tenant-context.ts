import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase/server"

/**
 * Validates that the current user is a member of the restaurant identified by the slug.
 * SECURITY: This is the primary server-side guard for cross-tenant access.
 */
export async function requireTenantContext(allowedRoles: string[], slug?: string) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login?next=/dashboard")
  }

  // 1. Build query for membership
  const query = supabase
    .from("restaurant_users")
    .select(`
      role,
      restaurant_id,
      restaurants!inner (
        id,
        name,
        slug,
        is_active,
        deleted_at
      )
    `)
    .eq("user_id", user.id)

  // 2. Scope to slug if provided (Mandatory for /dashboard/[slug] routes)
  if (slug) {
    query.eq("restaurants.slug", slug)
  } else {
    // Fallback for legacy calls or hub - order by latest
    query.order("created_at", { ascending: false }).limit(1)
  }

  const { data: memberships, error } = await query

  if (error || !memberships || memberships.length === 0) {
    console.error("Tenant authorization error:", error)
    redirect("/dashboard/select-restaurant")
  }

  const membership = memberships[0]
  const role = membership.role
  const restaurant = membership.restaurants as any

  // 3. Role verification
  if (!role || !allowedRoles.includes(role)) {
    // Forbidden if user is in restaurant but wrong role
    // For now, redirect to specialized slug root
    redirect(`/dashboard/${restaurant.slug}`)
  }

  // 4. Status verification
  if (restaurant.deleted_at || !restaurant.is_active) {
    redirect(`/dashboard/${restaurant.slug}`)
  }

  return {
    user,
    role,
    restaurantId: membership.restaurant_id,
    restaurant,
  }
}
