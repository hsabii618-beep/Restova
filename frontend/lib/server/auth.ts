import { type NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export async function getAuthUser(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.split(' ')[1]

    let supabase
    if (token) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      
      supabase = createClient(url, anonKey, {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      })
    } else {
      supabase = await createSupabaseServerClient()
    }

    const { data, error } = await supabase.auth.getUser()
    return { user: data?.user, supabase, error }
  } catch (err) {
    return { user: null, supabase: null, error: err }
  }
}
