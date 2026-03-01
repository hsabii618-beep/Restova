import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Use service role for provisioning to ensure atomicity and proper linking
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export async function provisionRestaurant({ userId, name, slug }: { userId: string, name: string, slug: string }) {
  // 1. Normalize slug
  const normalizedSlug = slug
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')

  if (!normalizedSlug) {
    return { data: null, error: { status: 400, message: 'Invalid slug' } }
  }

  // 2. Enforce single restaurant constraint
  // Architecture hint: membership is handled inside 'restaurants' table via 'owner_id' column
  // Try explicit schema prefix if implicit fails
  const { data: existingRestaurant, error: checkError } = await supabaseAdmin
    .from('restaurants')
    .select('id')
    .eq('owner_id', userId)
    .maybeSingle()

  if (checkError) {
    return { data: null, error: { status: 500, message: checkError.message } }
  }

  if (existingRestaurant) {
    return { data: null, error: { status: 409, message: 'Conflict' } }
  }

  // 3. Create restaurant
  const { data: restaurant, error: createError } = await supabaseAdmin
    .from('restaurants')
    .insert({
      name,
      slug: normalizedSlug,
      owner_id: userId
    })
    .select()
    .single()

  if (createError) {
    if (createError.code === '23505') { // Unique violation
      return { data: null, error: { status: 409, message: 'Conflict' } }
    }
    return { data: null, error: { status: 500, message: createError.message } }
  }

  // 4. Return with membership object as expected by tests
  return {
    data: {
      ...restaurant,
      membership: { role: 'owner' }
    },
    error: null
  }
}

export async function listUserRestaurants(userId: string, supabase?: any) {
  const client = supabase || supabaseAdmin
  const query = client
    .from('restaurants')
    .select(`
        id,
        name,
        slug
    `)

  if (!supabase) {
    query.eq('owner_id', userId)
  }

  const { data, error } = await query

  if (error) {
    return { data: null, error: { status: 500, message: error.message } }
  }

  return {
    data: data.map((r: any) => ({
      ...r,
      role: 'owner'
    })),
    error: null
  }
}

export async function getRestaurantForUser(userId: string, restaurantId: string, supabase?: any) {
  const client = supabase || supabaseAdmin

  // If a user-scoped client is provided, we rely on RLS and don't strictly need eq('owner_id', userId)
  // but keeping it for safety if the client is supabaseAdmin.
  const query = client
    .from('restaurants')
    .select(`*`)
    .eq('id', restaurantId)

  if (!supabase) {
    query.eq('owner_id', userId)
  }

  const { data, error } = await query.maybeSingle()

  if (error) {
    // 42501 = Insufficient Privilege (RLS)
    // PGRST116 = JSON object requested, multiple (or no) rows returned
    // 22P02 = invalid input syntax for type uuid
    if (error.code === '42501' || error.code === 'PGRST116' || error.code === '22P02') {
      return { data: null, error: { status: 404, message: 'Not found' } }
    }
    return { data: null, error: { status: 500, message: error.message } }
  }

  if (!data) {
    return { data: null, error: { status: 404, message: 'Not found' } }
  }

  return { data, error: null }
}
