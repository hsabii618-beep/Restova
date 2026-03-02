import { createClient } from "@supabase/supabase-js"

type AuditLogParams = {
  actorUserId: string
  actorEmail: string
  action: string
  targetRestaurantId?: string | null
  metadata?: Record<string, any>
  requestId?: string | null
  ip?: string | null
  userAgent?: string | null
}

export async function logAdminAction(params: AuditLogParams) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !service) throw new Error("Missing env")

  const admin = createClient(url, service, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  const { error } = await admin.from("admin_audit_logs").insert({
    actor_user_id: params.actorUserId,
    actor_email: params.actorEmail,
    action: params.action,
    target_restaurant_id: params.targetRestaurantId,
    metadata: params.metadata || {},
    request_id: params.requestId,
    ip: params.ip,
    user_agent: params.userAgent
  })

  if (error) {
    console.error("Failed to log admin action:", error)
  }
}
