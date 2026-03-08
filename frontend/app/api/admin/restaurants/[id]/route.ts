import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getAuthUser } from "@/lib/server/auth"
import { isPlatformAdminEmail } from "@/lib/server/platform-admin"
import { logAdminAction } from "@/lib/server/audit-logger"
import { headers } from "next/headers"
import { securityAudit } from "@/lib/server/security"

function getEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !service) throw new Error("Missing env")
  return { url, service }
}

export async function GET(
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

    const { data: restaurant, error: restaurantError } = await admin
      .from("restaurants")
      .select("*, restaurant_users(*)")
      .eq("id", id)
      .single()

    if (restaurantError || !restaurant) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 })
    }

    return NextResponse.json(restaurant, { status: 200 })
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Security Audit
    const audit = await securityAudit(request, {
      requireSafeOrigin: true,
    });
    if (!audit.allowed) return audit.response!;

    const { id } = await params
    const { user } = await getAuthUser(request)
    if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 })
    if (!isPlatformAdminEmail(user.email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const { url, service } = getEnv()
    const admin = createClient(url, service, { auth: { autoRefreshToken: false, persistSession: false } })

    const { data: existing, error: findError } = await admin
      .from("restaurants")
      .select("id, deleted_at")
      .eq("id", id)
      .single()

    if (findError || !existing) return NextResponse.json({ error: "Not Found" }, { status: 404 })
    if (existing.deleted_at) return NextResponse.json({ error: "Already deleted" }, { status: 400 })

    const { error: deleteError } = await admin
      .from("restaurants")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)

    if (deleteError) return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })

    const head = await headers()
    await logAdminAction({
      actorUserId: user.id,
      actorEmail: user.email!,
      action: "restaurant.deleted",
      targetRestaurantId: id,
      ip: head.get("x-forwarded-for"),
      userAgent: head.get("user-agent")
    })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
