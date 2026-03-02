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
async function getOrCreateTestUser(email: string) {
  const { error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: 'password123',
    email_confirm: true
  })
  if (error) {
    if (error.status === 422 || error.message.includes('already registered')) {
      const { data: signInData, error: signInError } = await supabaseAnon.auth.signInWithPassword({
        email,
        password: 'password123'
      })
      if (signInError) throw new Error(`Sign-in fallback failed: ${signInError.message}`)
      if (!signInData.session?.access_token) throw new Error(`No access token returned for ${email}`)
      return { user: signInData.user, token: signInData.session.access_token }
    }
    throw new Error(`Admin createUser failed for ${email}: [${error.status}] ${error.message}`)
  }
  const { data: signInData, error: signInError } = await supabaseAnon.auth.signInWithPassword({
    email,
    password: 'password123'
  })
  if (signInError) throw new Error(`Sign-in after creation failed for ${email}: ${signInError.message}`)
  if (!signInData.session?.access_token) throw new Error(`No access token returned after creation for ${email}`)
  return { user: signInData.user, token: signInData.session.access_token }
}
beforeAll(async () => {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data: restaurants } = await supabaseAdmin
    .from('restaurants')
    .select('id')
    .or(`slug.like.user-a-%,slug.like.user-b-%,slug.eq.test-restaurant,slug.eq.admin-test-rest,created_at.gte.${yesterday}`)
  if (restaurants && restaurants.length > 0) {
    const rIds = restaurants.map((r: { id: string }) => r.id)
    const { data: orders } = await supabaseAdmin.from('orders').select('id').in('restaurant_id', rIds)
    if (orders && orders.length > 0) {
      const oIds = orders.map((o: { id: string }) => o.id)
      await supabaseAdmin.from('order_adjustments').delete().in('order_id', oIds)
      await supabaseAdmin.from('payments').delete().in('order_id', oIds)
      await supabaseAdmin.from('order_items').delete().in('order_id', oIds)
      await supabaseAdmin.from('orders').delete().in('id', oIds)
    }
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
})
export const getUserAToken = () => tokenA
export const getUserBToken = () => tokenB
export const getAdminToken = () => tokenAdmin
export const getUserAId = () => userA?.id
export const getUserBId = () => userB?.id
export const getAdminId = () => userAdmin?.id
afterAll(async () => {
  if (userA?.id) await supabaseAdmin.auth.admin.deleteUser(userA.id)
  if (userB?.id) await supabaseAdmin.auth.admin.deleteUser(userB.id)
  if (userAdmin?.id) await supabaseAdmin.auth.admin.deleteUser(userAdmin.id)
})
