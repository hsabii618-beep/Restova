import { requireTenantContext } from "@/lib/server/tenant-context"

export async function requireDashboardRole(allowedRoles: string[], slug: string) {
  return requireTenantContext(allowedRoles, slug)
}
