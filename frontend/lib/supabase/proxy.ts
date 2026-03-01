import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

function getSupabaseKeys() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  // ندعم الاثنين لتفادي كسر إعدادك الحالي
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)'
    )
  }

  return { url, key }
}

export async function updateSession(request: NextRequest) {
  // مهم: نمرر headers للـ NextResponse حتى لا نفقد السياق
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const { url, key } = getSupabaseKeys()

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value)
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  // robust auth check
  let hasAuth = false
  try {
    const { data: userData, error } = await supabase.auth.getUser()
    if (!error && userData?.user) {
      hasAuth = true
    }
  } catch (error) {
    hasAuth = false
  }

  // protection logic
  if (request.nextUrl.pathname.startsWith('/dashboard') && !hasAuth) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    url.searchParams.set('next', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  return response
}
