export { sanitizeText, validateDomain, validateMenuPath, validateEmail, validateName, normalizeSlug, validateSlug } from "./restaurant-validation"
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { logSecurityEvent } from './security'

interface RestaurantRow {
  id: string
  name: string
  slug: string
  [key: string]: unknown
}

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
  const sanitizedName = sanitizeText(name, 100);
  const normalizedSlug = normalizeSlug(slug);

  if (!validateName(sanitizedName)) {
    return { data: null, error: { status: 400, message: "Invalid restaurant name (2-100 characters required)." } }
  }

  const slugError = validateSlug(normalizedSlug);
  if (slugError) {
    return { data: null, error: { status: 400, message: slugError } }
  }

  const { data: existingRestaurant, error: checkError } = await supabaseAdmin
    .from("restaurants")
    .select("id")
    .eq("owner_id", userId)
    .maybeSingle()

  if (checkError) {
    return { data: null, error: { status: 500, message: checkError.message } }
  }

  if (existingRestaurant) {
    return { data: null, error: { status: 409, message: "Conflict" } }
  }

  const { data: restaurant, error: createError } = await supabaseAdmin
    .from("restaurants")
    .insert({ name, slug: normalizedSlug, owner_id: userId, is_active: false })
    .select()
    .single()

  if (createError) {
    if ((createError as { code?: string }).code === "23505") {
      return { data: null, error: { status: 409, message: "Conflict" } }
    }
    return { data: null, error: { status: 500, message: createError.message } }
  }

  const { error: memberError } = await supabaseAdmin
    .from("restaurant_users")
    .insert({ user_id: userId, restaurant_id: restaurant.id, role: "owner" })

  if (memberError) {
    return { data: null, error: { status: 500, message: memberError.message } }
  }

  return { data: { ...restaurant, membership: { role: "owner" } }, error: null }
}

export async function listUserRestaurants(userId: string, supabase?: SupabaseClient) {
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
    data: (data as RestaurantRow[]).map((r) => ({
      ...r,
      role: 'owner'
    })),
    error: null
  }
}

export async function getRestaurantForUser(userId: string, restaurantId: string, supabase?: SupabaseClient) {
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



export async function checkSlugAvailability(slug: string, restaurantId?: string) {
  const normalized = normalizeSlug(slug)
  const validationError = validateSlug(normalized)
  if (validationError) return { available: false, message: validationError }

  // 1. Check reserved_slugs table
  const { data: reserved } = await supabaseAdmin
    .from('reserved_slugs')
    .select('restaurant_id')
    .eq('slug', normalized)
    .maybeSingle()

  if (reserved) {
    if (restaurantId && reserved.restaurant_id === restaurantId) {
      return { available: true, message: "This is your current URL." }
    }
    return { available: false, message: "This URL is already taken or permanently reserved." }
  }

  // 2. Check restaurants table (for safety against un-reserved but active slugs)
  const { data: existing } = await supabaseAdmin
    .from('restaurants')
    .select('id')
    .eq('slug', normalized)
    .maybeSingle()

  if (existing) {
    if (restaurantId && existing.id === restaurantId) {
      return { available: true, message: "This is your current URL." }
    }
    return { available: false, message: "This URL is already taken." }
  }

  return { available: true, message: "Available" }
}

export async function updateRestaurant(userId: string, restaurantId: string, payload: Partial<RestaurantRow & { slug?: string }>, supabase?: SupabaseClient) {
  const client = supabase || supabaseAdmin

  // 1. Sanitize and Validate Name
  if (payload.name) {
    payload.name = sanitizeText(payload.name, 100);
    if (!payload.name) return { data: null, error: { status: 400, message: "Restaurant name is required." } }
  }

  // 2. Sanitize and Validate Custom Domain
  if (payload.custom_domain) {
    const domain = (payload.custom_domain as string).trim().toLowerCase();
    if (!validateDomain(domain)) {
      return { data: null, error: { status: 400, message: "Invalid custom domain format." } }
    }
    payload.custom_domain = domain;
  }

  // 3. Sanitize and Validate Menu Path
  if (payload.menu_path) {
    const path = (payload.menu_path as string).trim().toLowerCase();
    if (!validateMenuPath(path)) {
      return { data: null, error: { status: 400, message: "Invalid menu path format. Use lowercase letters, numbers, and hyphens." } }
    }
    payload.menu_path = path;
  }

  // Handle Slug Locking Logic
  if (payload.slug) {
    const normalized = normalizeSlug(payload.slug)
    const errorMsg = validateSlug(normalized)
    if (errorMsg) return { data: null, error: { status: 400, message: errorMsg } }

    payload.slug = normalized

    // 1. Check if slug belongs to another restaurant or is reserved
    const { data: existingReserved } = await supabaseAdmin
      .from('reserved_slugs')
      .select('restaurant_id')
      .eq('slug', normalized)
      .maybeSingle()

    if (existingReserved && existingReserved.restaurant_id !== restaurantId) {
      return { data: null, error: { status: 409, message: "This URL is already taken or reserved." } }
    }

    // 2. Check current restaurants table
    const { data: existingRestaurant } = await supabaseAdmin
      .from('restaurants')
      .select('id')
      .eq('slug', normalized)
      .neq('id', restaurantId)
      .maybeSingle()

    if (existingRestaurant) {
      return { data: null, error: { status: 409, message: "This URL is already taken." } }
    }

    // 3. Prevent changing if already locked
    const { data: currentRes } = await supabaseAdmin
      .from('restaurants')
      .select('is_slug_locked, slug')
      .eq('id', restaurantId)
      .single()

    if (currentRes?.is_slug_locked && currentRes.slug !== normalized) {
      return { data: null, error: { status: 400, message: "URL slug is locked and cannot be changed." } }
    }

    // 4. If everything ok, we will also lock it
    payload.is_slug_locked = true
  }

  const { data, error } = await client
    .from('restaurants')
    .update(payload)
    .eq('id', restaurantId)
    // Extra safety if using admin client
    .match(supabase ? {} : { owner_id: userId })
    .select()
    .single()

  if (error) {
    if (error.code === '42501') {
      logSecurityEvent('FORBIDDEN_UPDATE_ATTEMPT', { userId, restaurantId });
      return { data: null, error: { status: 403, message: 'Forbidden' } }
    }
    return { data: null, error: { status: 500, message: error.message } }
  }

  // 5. If slug was updated and locked, record it in reserved_slugs
  if (payload.slug) {
    await supabaseAdmin
      .from('reserved_slugs')
      .upsert({
        slug: payload.slug,
        restaurant_id: restaurantId,
        reserved_at: new Date().toISOString()
      })
  }

  return { data, error: null }
}

export async function getPublicMenu(identifier: string, menuPath: string) {
  // 1. Resolve restaurant by slug or custom domain
  // SECURITY: identifier must be alphanumeric/dots/hyphens to prevent PostgREST injection
  const safeIdentifier = identifier.trim().toLowerCase();
  const safeMenuPath = menuPath.trim().toLowerCase();

  if (!/^[a-z0-9.-]+$/.test(safeIdentifier) || !/^[a-z0-9-]+$/.test(safeMenuPath)) {
    return { data: null, error: { status: 404, message: 'Menu not found' } }
  }

  const { data: restaurant, error: resError } = await supabaseAdmin
    .from('restaurants')
    .select('id, name, slug, custom_domain, menu_path, is_open, is_menu_public')
    .or(`slug.eq."${safeIdentifier}",custom_domain.eq."${safeIdentifier}"`)
    .eq('menu_path', safeMenuPath)
    .eq('is_menu_public', true)
    .maybeSingle()

  if (resError || !restaurant) {
    return { data: null, error: { status: 404, message: 'Menu not found' } }
  }

  // 2. Fetch categories and items
  const { data: categories, error: catError } = await supabaseAdmin
    .from('categories')
    .select(`
      id,
      name,
      position,
      menu_items (
        id,
        name,
        description,
        price,
        is_available,
        image_path
      )
    `)
    .eq('restaurant_id', restaurant.id)
    .eq('is_active', true)
    .order('position')

  if (catError) {
    return { data: null, error: { status: 500, message: catError.message } }
  }

  // Filter out unavailable items if needed, or let frontend handle
  const menuData = {
    restaurant,
    categories: (categories || []).map(cat => ({
      ...cat,
      menu_items: (cat.menu_items || []).filter((item: any) => item.is_available)
    }))
  }

  return { data: menuData, error: null }
}
