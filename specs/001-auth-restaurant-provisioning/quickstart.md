# Quickstart: Phase 2 — Auth + Restaurant Provisioning

## Setup

1.  **Supabase Auth**:
    *   Enable Email provider in Supabase Dashboard.
    *   Ensure "Confirm Email" is enabled (as per spec).
2.  **Environment Variables**:
    *   `NEXT_PUBLIC_SUPABASE_URL`
    *   `NEXT_PUBLIC_SUPABASE_ANON_KEY`
    *   `SUPABASE_SERVICE_ROLE_KEY` (Server-side only)

## Verification Scenarios

### 1. Authentication
1.  Navigate to `/auth/signup`.
2.  Register with a valid email/password.
3.  Confirm email via the link sent (Supabase mock or real).
4.  Navigate to `/auth/login` and sign in.
5.  Access `/dashboard`.

### 2. Restaurant Provisioning
1.  In `/dashboard/restaurants`, enter a restaurant name and slug.
2.  Submit.
3.  Verify the restaurant appears in the list.
4.  Try to create another restaurant with the same account (verify 409 Conflict).
5.  Try to use a slug that is already taken by another user (verify 409 Conflict).

### 3. RLS Isolation
1.  Login as User A.
2.  Try to fetch `/api/restaurants/{id_of_restaurant_B}`.
3.  Verify 403 Forbidden.
