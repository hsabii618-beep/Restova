import 'dotenv/config'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env.server.local' })
import { createClient, type User } from '@supabase/supabase-js'
import { beforeAll, afterAll } from 'vitest'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey)

export const RUN_ID = `${Date.now()}-${Math.random().toString(16).slice(2)}`

let userA: User | null = null
let userB: User | null = null
let userAdmin: User | null = null

let tokenA: string
let tokenB: string
let tokenAdmin: string

async function findUserByEmail(email: string) {
  let page = 1
  const perPage = 200
  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage })
    if (error) return null
    const users = data?.users ?? []
    const match = users.find((u) => (u.email ?? '').toLowerCase() === email.toLowerCase())
    if (match) return match
    if (users.length < perPage) return null
    page += 1
  }
}

async function signIn(email: string) {
  const { data, error } = await supabaseAnon.auth.signInWithPassword({
    email,
    password: 'password123'
  })
  if (error) return null
  if (!data.session?.access_token) return null
  return { user: data.user, token: data.session.access_token }
}

async function ensurePasswordAndConfirm(userId: string) {
  await supabaseAdmin.auth.admin.updateUserById(userId, {
    password: 'password123',
    email_confirm: true
  })
}

async function getOrCreateTestUser(email: string) {
  const existing = await findUserByEmail(email)
  if (existing?.id) {
    await ensurePasswordAndConfirm(existing.id)
    const signed = await signIn(email)
    if (!signed) throw new Error(`Sign-in failed for existing user ${email}`)
    return signed
  }

  const attempt = await supabaseAdmin.auth.admin.createUser({
    email,
    password: 'password123',
    email_confirm: true
  })

  if (attempt.error) {
    const again = await findUserByEmail(email)
    if (again?.id) {
      await ensurePasswordAndConfirm(again.id)
      const signed = await signIn(email)
      if (!signed) throw new Error(`Sign-in failed for existing user ${email}`)
      return signed
    }
    throw new Error(`Admin createUser failed for ${email}: [${attempt.error.status}] ${attempt.error.message}`)
  }

  const after = await signIn(email)
  if (!after) throw new Error(`Sign-in after creation failed for ${email}`)
  return after
}

beforeAll(async () => {
  const yesterdayIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const yesterday = new Date(yesterdayIso).getTime()

  const { data: allRestaurants } = await supabaseAdmin
    .from('restaurants')
    .select('id,slug,created_at')
    .limit(5000)

  const targets = (allRestaurants ?? []).filter((r: any) => {
    const slug = String(r.slug ?? '')
    const createdAt = new Date(String(r.created_at ?? '')).getTime()
    return (
      slug.startsWith('user-a-') ||
      slug.startsWith('user-b-') ||
      slug === 'user-a-rest' ||
      slug === 'user-b-rest' ||
      slug === 'test-restaurant' ||
      slug === 'admin-test-rest' ||
      (Number.isFinite(createdAt) && createdAt >= yesterday)
    )
  })

  if (targets.length > 0) {
    const rIds = targets.map((r: any) => String(r.id))

    const { data: orders } = await supabaseAdmin.from('orders').select('id').in('restaurant_id', rIds)
    if (orders && orders.length > 0) {
      const oIds = orders.map((o: any) => String(o.id))
      await supabaseAdmin.from('order_adjustments').delete().in('order_id', oIds)
      await supabaseAdmin.from('payments').delete().in('order_id', oIds)
      await supabaseAdmin.from('order_items').delete().in('order_id', oIds)
      await supabaseAdmin.from('orders').delete().in('id', oIds)
    }

    await supabaseAdmin.from('admin_audit_logs').delete().in('target_restaurant_id', rIds)
    await supabaseAdmin.from('menu_items').delete().in('restaurant_id', rIds)
    await supabaseAdmin.from('categories').delete().in('restaurant_id', rIds)
    await supabaseAdmin.from('restaurants').delete().in('id', rIds)
  }

  const [resA, resB, resAdmin] = await Promise.all([
    getOrCreateTestUser(`usera+${RUN_ID}@restova.test`),
    getOrCreateTestUser(`userb+${RUN_ID}@restova.test`),
    getOrCreateTestUser(`admin@restova.test`)
  ])

  userA = resA.user
  tokenA = resA.token

  userB = resB.user
  tokenB = resB.token

  userAdmin = resAdmin.user
  tokenAdmin = resAdmin.token
}
)

export const getUserAToken = () => tokenA
export const getUserBToken = () => tokenB
export const getAdminToken = () => tokenAdmin

export const getUserAId = () => userA?.id
export const getUserBId = () => userB?.id
export const getAdminId = () => userAdmin?.id

afterAll(async () => {
  if (userA?.id) await supabaseAdmin.auth.admin.deleteUser(userA.id)
  if (userB?.id) await supabaseAdmin.auth.admin.deleteUser(userB.id)
}
)