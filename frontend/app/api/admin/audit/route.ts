import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getAuthUser } from "@/lib/server/auth"
import { isPlatformAdminEmail } from "@/lib/server/platform-admin"

function getEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !service) throw new Error("Missing env")
  return { url, service }
}

export async function GET(request: NextRequest) {
  try {
    const { user } = await getAuthUser(request)
    if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 })
    if (!isPlatformAdminEmail(user.email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const pageSize = parseInt(searchParams.get("pageSize") || "20")
    const restaurantId = searchParams.get("restaurantId")
    const action = searchParams.get("action")
    const actor = searchParams.get("actor")
    const fromDate = searchParams.get("from")
    const toDate = searchParams.get("to")

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const { url, service } = getEnv()
    const admin = createClient(url, service, { auth: { autoRefreshToken: false, persistSession: false } })

    let dbQuery = admin
      .from("admin_audit_logs")
      .select("*", { count: "exact" })

    if (restaurantId) dbQuery = dbQuery.eq("target_restaurant_id", restaurantId)
    if (action) dbQuery = dbQuery.eq("action", action)
    if (actor) dbQuery = dbQuery.or(`actor_email.ilike.%${actor}%,actor_user_id.eq.${actor}`)
    if (fromDate) dbQuery = dbQuery.gte("created_at", fromDate)
    if (toDate) dbQuery = dbQuery.lte("created_at", toDate)

    const { data, count, error } = await dbQuery
      .order("created_at", { ascending: false })
      .range(from, to)

    if (error) return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })

    return NextResponse.json({
      items: data ?? [],
      total: count ?? 0,
      page,
      pageSize
    }, { status: 200 })
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
