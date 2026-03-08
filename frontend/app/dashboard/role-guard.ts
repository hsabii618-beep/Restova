import { requireTenantContext } from "@/lib/server/tenant-context"

export async function requireDashboardRole(allowedRoles: string[]) {
  return requireTenantContext(allowedRoles)
}
