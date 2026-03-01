import { NextResponse, type NextRequest } from 'next/server'
import { provisionRestaurant, listUserRestaurants } from '@/lib/server/restaurants'
import { getAuthUser } from '@/lib/server/auth'

export async function POST(request: NextRequest) {
  try {
    const { user } = await getAuthUser(request)

    if (!user) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
    }

    let body
    try {
      body = await request.json()
    } catch (err) {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const { name, slug } = body

    if (!name || !slug) {
      return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 })
    }

    const { data, error } = await provisionRestaurant({
      userId: user.id,
      name,
      slug
    })

    if (error) {
      // Map status codes according to specification
      const status = error.status === 500 ? 500 : error.status
      const message = error.status === 500 ? 'Internal Server Error' : error.message

      if (error.status === 500) {
        console.error(`Unknown Error: ${error.message}`)
      }

      return NextResponse.json({ error: message }, { status })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    console.error(`Unexpected error in POST /api/restaurants:`, err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { user, supabase } = await getAuthUser(request)

    if (!user) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
    }

    // Pass user-scoped client if available to ensure RLS applies
    const { data, error } = await listUserRestaurants(user.id, supabase)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error(`Unexpected error in GET /api/restaurants:`, err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
