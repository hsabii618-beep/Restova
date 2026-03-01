import { describe, it, expect } from 'vitest'
import { getUserAToken, getUserBToken } from '../setup'

// IMPORTANT: These tests assume Next dev server is running at localhost:3000
const API_URL = 'http://localhost:3001/api/restaurants'

describe('Restaurant Provisioning API', () => {
  it('should return 401 for unauthenticated POST requests', async () => {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test Restaurant', slug: 'test-restaurant' }),
    })
    expect(response.status).toBe(401)
  })

  it('should return 201 when authenticated user creates their first restaurant', async () => {
    const token = getUserAToken()
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ name: 'User A Rest', slug: 'user-a-rest' }),
    })
    expect(response.status).toBe(201)
    const data = await response.json()
    expect(data.name).toBe('User A Rest')
    expect(data.membership.role).toBe('owner')
  })

  it('should return 409 for duplicate slug', async () => {
    const tokenB = getUserBToken()
    // User B tries to use User A's slug
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenB}`
      },
      body: JSON.stringify({ name: 'Another Rest', slug: 'user-a-rest' }),
    })
    expect(response.status).toBe(409)
  })

  it('should return 409 when user attempts to create a second restaurant', async () => {
    const tokenA = getUserAToken()
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      },
      body: JSON.stringify({ name: 'User A Second Rest', slug: 'user-a-second' }),
    })
    expect(response.status).toBe(409)
  })
})
