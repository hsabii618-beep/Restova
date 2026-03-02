import { NextRequest, NextResponse } from "next/server"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { getAuthUser } from "@/lib/server/auth"
import { isPlatformAdminEmail } from "@/lib/server/platform-admin"
import { logAdminAction } from "@/lib/server/audit-logger"
import { headers } from "next/headers"

type Payload = {
  name?: string
  slug?: string
  ownerEmail?: string
}

function getEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !service) throw new Error("Missing env")
  return { url, service }
}

function normalizeSlug(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
}

async function findUserIdByEmail(admin: SupabaseClient<any>, email: string) {
  const target = email.toLowerCase()
  let page = 1
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    if (error) return null
    const users = data?.users ?? []
    const found = users.find((u) => (u.email ?? "").toLowerCase() === target)
    if (found?.id) return found.id
    if (users.length < 200) return null
    page += 1
    if (page > 50) return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user } = await getAuthUser(request)
    if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 })
    
    if (!isPlatformAdminEmail(user.email)) {
       return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    let body: Payload | null = null
    try {
      body = (await request.json()) as Payload
    } catch {
      body = null
    }
    if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })

    const name = (body.name ?? "").trim()
    const slugRaw = (body.slug ?? "").trim()
    const ownerEmail = (body.ownerEmail ?? "").trim().toLowerCase()

    if (!name || !slugRaw || !ownerEmail) {
      return NextResponse.json({ error: "name, slug, ownerEmail are required" }, { status: 400 })
    }

    const slug = normalizeSlug(slugRaw)
    if (!slug) return NextResponse.json({ error: "Invalid slug" }, { status: 400 })

    const { url, service } = getEnv()
    const admin = createClient(url, service, { auth: { autoRefreshToken: false, persistSession: false } })

    let ownerId: string | null = null

    const { data: created, error: createUserError } = await admin.auth.admin.createUser({
      email: ownerEmail,
      email_confirm: true,
    })

    if (!createUserError && created.user?.id) {
      ownerId = created.user.id
    } else {
      const msg = (createUserError?.message ?? "").toLowerCase()
      const status = (createUserError as { status?: number } | null)?.status
      const isExists = status === 422 || msg.includes("already") || msg.includes("registered") || msg.includes("exists")
      if (!isExists) return NextResponse.json({ error: "Owner create failed" }, { status: 500 })
      ownerId = await findUserIdByEmail(admin, ownerEmail)
      if (!ownerId) return NextResponse.json({ error: "Owner lookup failed" }, { status: 500 })
    }

    const { data: existingRestaurant, error: checkError } = await admin
      .from("restaurants")
      .select("id")
      .eq("owner_id", ownerId)
      .limit(1)
      .maybeSingle()

    if (checkError) return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    if (existingRestaurant?.id) return NextResponse.json({ error: "Conflict" }, { status: 409 })

    const { data: restaurant, error: createRestaurantError } = await admin
      .from("restaurants")
      .insert({ name, slug, owner_id: ownerId })
      .select("id,name,slug,owner_id,created_at")
      .single()

    if (createRestaurantError) {
      if ((createRestaurantError as { code?: string }).code === "23505") {
        return NextResponse.json({ error: "Conflict" }, { status: 409 })
      }
      return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }

    const { error: membershipError } = await admin
      .from("restaurant_users")
      .insert({ user_id: ownerId, restaurant_id: restaurant.id, role: "owner" })

    if (membershipError) return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })

    const head = await headers()
    await logAdminAction({
      actorUserId: user.id,
      actorEmail: user.email!,
      action: "restaurant.provisioned",
      targetRestaurantId: restaurant.id,
      metadata: { name, slug, ownerEmail },
      ip: head.get("x-forwarded-for"),
      userAgent: head.get("user-agent")
    })

    return NextResponse.json(restaurant, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { user } = await getAuthUser(request)
    if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 })
    if (!isPlatformAdminEmail(user.email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const pageSize = parseInt(searchParams.get("pageSize") || "20")
    const query = searchParams.get("query")
    const status = searchParams.get("status") || "active"

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const { url, service } = getEnv()
    const admin = createClient(url, service, { auth: { autoRefreshToken: false, persistSession: false } })

    let dbQuery = admin
      .from("restaurants")
      .select("id,name,slug,owner_id,is_active,deleted_at,created_at", { count: "exact" })

    if (status === "active") {
      dbQuery = dbQuery.is("deleted_at", null).eq("is_active", true)
    } else if (status === "suspended") {
      dbQuery = dbQuery.is("deleted_at", null).eq("is_active", false)
    } else if (status === "deleted") {
      dbQuery = dbQuery.not("deleted_at", "is", null)
    }

    if (query) {
      dbQuery = dbQuery.or(`name.ilike.%${query}%,slug.ilike.%${query}%`)
    }

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
