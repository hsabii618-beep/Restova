import { NextResponse, type NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/server/auth'
import { getRestaurantForUser } from '@/lib/server/restaurants'

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
