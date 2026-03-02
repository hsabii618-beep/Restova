import { describe, it, expect } from 'vitest'
import { getAdminToken, getUserAToken, RUN_ID } from '../setup'

const API_BASE = 'http://localhost:3001/api/admin'

describe('Admin API Layer', () => {
  let restaurantId: string
  const TEST_SLUG = `admin-test-${RUN_ID}`

  it('should return 401 for unauthenticated requests', async () => {
    const response = await fetch(`${API_BASE}/restaurants`)
    expect(response.status).toBe(401)
  })

  it('should return 403 for non-admin users', async () => {
    const token = getUserAToken()
    const response = await fetch(`${API_BASE}/restaurants`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    expect(response.status).toBe(403)
  })

  it('should allow admin to provision a restaurant', async () => {
    const token = getAdminToken()
    const response = await fetch(`${API_BASE}/restaurants`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        name: 'Admin Test Rest',
        slug: TEST_SLUG,
        ownerEmail: `owner-${RUN_ID}@test.com`
      })
    })
    expect(response.status).toBe(201)
    const data = await response.json()
    restaurantId = data.id
    expect(data.slug).toBe(TEST_SLUG)
  })

  it('should allow admin to get restaurant details', async () => {
    const token = getAdminToken()
    const response = await fetch(`${API_BASE}/restaurants/${restaurantId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.id).toBe(restaurantId)
    expect(data.restaurant_users).toBeDefined()
  })

  it('should allow admin to suspend a restaurant', async () => {
    const token = getAdminToken()
    const response = await fetch(`${API_BASE}/restaurants/${restaurantId}/suspend`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    })
    expect(response.status).toBe(200)

    const check = await fetch(`${API_BASE}/restaurants/${restaurantId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const data = await check.json()
    expect(data.is_active).toBe(false)
  })

  it('should allow admin to activate a restaurant', async () => {
    const token = getAdminToken()
    const response = await fetch(`${API_BASE}/restaurants/${restaurantId}/activate`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    })
    expect(response.status).toBe(200)

    const check = await fetch(`${API_BASE}/restaurants/${restaurantId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const data = await check.json()
    expect(data.is_active).toBe(true)
  })

  it('should allow admin to delete a restaurant (soft delete)', async () => {
    const token = getAdminToken()
    const response = await fetch(`${API_BASE}/restaurants/${restaurantId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    })
    expect(response.status).toBe(200)

    const check = await fetch(`${API_BASE}/restaurants/${restaurantId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const data = await check.json()
    expect(data.deleted_at).not.toBeNull()
  })

  it('should return audit logs', async () => {
    const token = getAdminToken()
    const response = await fetch(`${API_BASE}/audit?restaurantId=${restaurantId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.items.length).toBeGreaterThan(0)
    expect(data.items[0].target_restaurant_id).toBe(restaurantId)
  })

  it('should return restaurants list with items key and pagination info', async () => {
    const token = getAdminToken()
    const response = await fetch(`${API_BASE}/restaurants`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.items).toBeDefined()
    expect(Array.isArray(data.items)).toBe(true)
    expect(data.total).toBeDefined()
    expect(typeof data.total).toBe('number')
    expect(data.page).toBeDefined()
    expect(data.pageSize).toBeDefined()
  })
})
