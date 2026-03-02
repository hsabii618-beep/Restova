import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getAuthUser } from "@/lib/server/auth"
import { isPlatformAdminEmail } from "@/lib/server/platform-admin"
import { logAdminAction } from "@/lib/server/audit-logger"
import { headers } from "next/headers"

function getEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !service) throw new Error("Missing env")
  return { url, service }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { user } = await getAuthUser(request)
    if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 })
    if (!isPlatformAdminEmail(user.email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const { url, service } = getEnv()
    const admin = createClient(url, service, { auth: { autoRefreshToken: false, persistSession: false } })

    const { data: existing, error: findError } = await admin
      .from("restaurants")
      .select("id, is_active, deleted_at")
      .eq("id", id)
      .single()

    if (findError || !existing) return NextResponse.json({ error: "Not Found" }, { status: 404 })
    if (existing.deleted_at) return NextResponse.json({ error: "Cannot suspend deleted restaurant" }, { status: 400 })

    const from_is_active = existing.is_active
    const to_is_active = false

    const { error: updateError } = await admin
      .from("restaurants")
      .update({ is_active: to_is_active })
      .eq("id", id)

    if (updateError) return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })

    const head = await headers()
    await logAdminAction({
      actorUserId: user.id,
      actorEmail: user.email!,
      action: "restaurant.suspended",
      targetRestaurantId: id,
      metadata: { from_is_active, to_is_active },
      ip: head.get("x-forwarded-for"),
      userAgent: head.get("user-agent")
    })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
