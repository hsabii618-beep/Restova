import { NextResponse, type NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/server/auth'
import { getRestaurantForUser, updateRestaurant } from '@/lib/server/restaurants'
import { securityAudit, SECURITY_CONFIG } from '@/lib/server/security'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, supabase, error: authError } = await getAuthUser(request)

    if (!user || authError) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
    }

    const { id } = await params

    // Call the helper with the user-scoped client to apply RLS
    const { data, error } = await getRestaurantForUser(user.id, id, supabase)

    if (error) {
      // Mapping PostgREST and RLS errors to appropriate status codes
      const status = error.status === 500 ? 500 : error.status
      const message = error.status === 500 ? 'Internal error' : error.message
      return NextResponse.json({ error: message }, { status })
    }

    if (!data) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error(`Unexpected error in GET /api/restaurants/[id]:`, err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Security Audit
    const audit = await securityAudit(request, {
      requireSafeOrigin: true,
      rateLimitKey: 'settings-update',
      rateLimitConfig: SECURITY_CONFIG.SETTINGS_UPDATE
    });
    if (!audit.allowed) return audit.response!;

    const { user, supabase, error: authError } = await getAuthUser(request)

    if (!user || authError) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    // White-list fields that can be updated via this endpoint
    const allowedFields = ['name', 'is_open', 'custom_domain', 'menu_path', 'is_menu_public', 'slug']
    const payload: any = {}

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        payload[field] = body[field]
      }
    }

    if (Object.keys(payload).length === 0) {
      return NextResponse.json({ error: 'No valid fields provided' }, { status: 400 })
    }

    const { data, error } = await updateRestaurant(user.id, id, payload, supabase)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error(`Unexpected error in PATCH /api/restaurants/[id]:`, err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
