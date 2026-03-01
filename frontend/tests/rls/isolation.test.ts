import { describe, it, expect } from 'vitest'
import { getUserAToken, getUserBToken } from '../setup'

// IMPORTANT: These tests assume Next dev server is running at localhost:3000
const API_URL = 'http://localhost:3001/api/restaurants'

describe('RLS Isolation', () => {
  it('User B cannot read User A restaurant data via API', async () => {
    // 1. User A creates a restaurant
    const tokenA = getUserAToken()
    const createRes = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      },
      body: JSON.stringify({ name: 'User A Isolation Rest', slug: 'user-a-iso' }),
    })
    const restaurantA = await createRes.json()
    const restaurantId = restaurantA.id

    // 2. User B tries to fetch User A's restaurant
    const tokenB = getUserBToken()
    const response = await fetch(`${API_URL}/${restaurantId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokenB}`
      },
    })

    // Expect 403 or 404
    expect([403, 404]).toContain(response.status)
  })
})
