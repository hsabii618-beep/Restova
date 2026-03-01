import { type NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export async function getAuthUser(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.split(' ')[1]

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    let supabase;
    if (token) {
      // Create a user-scoped client using the Bearer token for RLS
      supabase = createClient(url, anonKey, {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        },
        auth: {
          persistSession: false
        }
      })
    } else {
      // Fallback to cookie-based server client
      supabase = await createSupabaseServerClient()
    }

    const { data, error } = await supabase.auth.getUser()
    return { user: data?.user, supabase, error }
  } catch (err) {
    return { user: null, supabase: null, error: err }
  }
}
