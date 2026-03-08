import { logSecurityEvent } from './security'

export function sanitizeText(text: string, maxLength: number = 255): string {
  return text.trim().slice(0, maxLength)
}

export function validateDomain(domain: string): boolean {
  if (!domain) return true
  const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i
  const isValid = domain.length <= 253 && domainRegex.test(domain)
  if (!isValid) {
    logSecurityEvent('INVALID_DOMAIN_ATTEMPT', { domain })
  }
  return isValid
}

export function validateMenuPath(path: string): boolean {
  if (!path) return true
  const pathRegex = /^[a-z0-9](-?[a-z0-9])*$/
  return path.length >= 2 && path.length <= 40 && pathRegex.test(path)
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  return email.length <= 255 && emailRegex.test(email)
}

export function validateName(name: string): boolean {
  return name.length >= 2 && name.length <= 100
}

const RESERVED_SLUGS = [
  'admin', 'api', 'app', 'apps', 'auth', 'oauth', 'callback', 'login', 'signup', 'sign-in', 'sign-up', 'logout',
  'verify', 'reset', 'reset-password', 'forgot-password', 'dashboard', 'settings', 'account', 'accounts',
  'owner', 'manager', 'cashier', 'staff', 'menu', 'menus', 'orders', 'order', 'history', 'billing', 'checkout',
  'cart', 'payment', 'payments', 'support', 'help', 'contact', 'about', 'terms', 'privacy', 'security', 'status',
  'blog', 'docs', 'documentation', 'pricing', 'careers', 'jobs', 'www', 'root', 'system', 'internal', 'public',
  'static', 'assets', 'images', 'img', 'media', 'cdn', 'uploads', 'files', 'download', 'downloads', 'robots',
  'sitemap', 'manifest', 'favicon', 'icon', 'icons', 'opengraph-image', 'twitter-image', '_next'
]

export function normalizeSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function validateSlug(slug: string): string | null {
  if (!slug) return 'Slug is required.'
  if (slug.length < 3) return 'Slug must be at least 3 characters.'
  if (slug.length > 40) return 'Slug must be at most 40 characters.'

  if (slug.includes('.') || slug.includes('/') || slug.includes('\\') || slug.includes('%')) {
    return 'Invalid characters (dots or slashes not allowed).'
  }

  if (!/^[a-z0-9](-?[a-z0-9])*$/.test(slug)) {
    logSecurityEvent('INVALID_SLUG_ATTEMPT', { slug, reason: 'regex_failure' })
    return 'Slug can only contain lowercase letters, numbers, and single hyphens. Must start and end with a letter or number.'
  }

  if (RESERVED_SLUGS.includes(slug)) {
    logSecurityEvent('RESERVED_SLUG_ATTEMPT', { slug })
    return 'This slug is reserved for platform use.'
  }

  return null
}
