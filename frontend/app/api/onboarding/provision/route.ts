import { NextResponse, type NextRequest } from "next/server"
import { provisionRestaurant } from "@/lib/server/restaurants"
import { getAuthUser } from "@/lib/server/auth"
import { revalidatePath } from "next/cache"
import { securityAudit, SECURITY_CONFIG } from "@/lib/server/security"

export async function POST(request: NextRequest) {
  // 1. Security Audit (CSRF + Rate Limiting)
  const audit = await securityAudit(request, {
    requireSafeOrigin: true,
    rateLimitKey: 'provisioning',
    rateLimitConfig: SECURITY_CONFIG.SETTINGS_UPDATE
  });
  if (!audit.allowed) return audit.response!;

  const { user, error: authError } = await getAuthUser(request)

  if (!user || authError) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body = {}
  try {
    body = await request.json()
  } catch (e) {
    // ignore
  }
  const { name, slug } = body as { name?: string, slug?: string };

  if (!name || !slug) {
    return NextResponse.json({ error: "Restaurant name and slug are required." }, { status: 400 })
  }

  const { data, error } = await provisionRestaurant({
    userId: user.id,
    name,
    slug
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }

  revalidatePath("/dashboard")
  return NextResponse.json({ restaurant: data }, { status: 201 })
}
