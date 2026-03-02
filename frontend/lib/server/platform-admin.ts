export function isPlatformAdminEmail(email?: string | null) {
  if (!email) {
    return false
  }
  
  const raw = process.env.ADMIN_EMAILS || ""
  
  const set = new Set(
    raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  )
  
  const target = email.trim().toLowerCase()
  return set.has(target)
}
