import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function POST() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    return NextResponse.json({ error: "Missing server env" }, { status: 500 })
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } })

  const { data: existing } = await admin
    .from("restaurants")
    .select("id")
    .eq("owner_id", user.id)
    .is("deleted_at", null)
    .eq("is_active", true)
    .maybeSingle()

  if (existing) {
    const { data: member } = await admin
      .from("restaurant_users")
      .select("id")
      .eq("restaurant_id", existing.id)
      .eq("user_id", user.id)
      .maybeSingle()

    if (!member) {
      await admin
        .from("restaurant_users")
        .insert({ restaurant_id: existing.id, user_id: user.id, role: "owner" })
    }

    revalidatePath("/dashboard")
    return NextResponse.json({ restaurant: existing }, { status: 200 })
  }

  const baseSlug = `my-restaurant-${user.id.slice(0, 8).toLowerCase()}`
  let restaurantData = null

  const attempt1 = await admin
    .from("restaurants")
    .insert({ name: "My Restaurant", slug: baseSlug, owner_id: user.id })
    .select("id")
    .maybeSingle()

  if (attempt1.data) {
    restaurantData = attempt1.data
  } else {
    const attempt2 = await admin
      .from("restaurants")
      .insert({ name: "My Restaurant", slug: `${baseSlug}-${Date.now()}`, owner_id: user.id })
      .select("id")
      .maybeSingle()

    if (attempt2.data) {
      restaurantData = attempt2.data
    }
  }

  if (!restaurantData) {
    return NextResponse.json({ error: "Insert failed" }, { status: 500 })
  }

  await admin
    .from("restaurant_users")
    .insert({ restaurant_id: restaurantData.id, user_id: user.id, role: "owner" })

  revalidatePath("/dashboard")
  return NextResponse.json({ restaurant: restaurantData }, { status: 201 })
}
