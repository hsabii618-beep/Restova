# Feature Specification: Phase 2 — Auth + Restaurant Provisioning (Owner Onboarding)

**Feature Branch**: `001-auth-restaurant-provisioning`  
**Created**: 2026-02-28  
**Status**: Draft  
**Input**: User description: "Title: Phase 2 — Auth + Restaurant Provisioning (Owner Onboarding) Description: Implement secure authentication and the initial restaurant provisioning flow. A user can sign up / sign in, then create a restaurant, and becomes its owner via owner_id on restaurants. All tenant isolation must remain enforced via RLS and server-side authority..."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Secure Account Creation and Authentication (Priority: P1)

As a new restaurant owner, I want to create a secure account and sign in to access the management dashboard, so that I can start setting up my restaurant.

**Why this priority**: Fundamental requirement for any user interaction. Secure access is critical for multi-tenant data protection.

**Independent Test**: A user can register at `/auth/signup`, receive a confirmation (if configured) or login directly, and access `/dashboard`. If they logout, they are redirected away from `/dashboard` and cannot re-enter via direct URL without logging in.

**Acceptance Scenarios**:

1. **Given** an unauthenticated user, **When** they visit `/dashboard`, **Then** they are redirected to `/auth/login`.
2. **Given** a new user, **When** they submit valid email and password at `/auth/signup`, **Then** an account is created in Supabase Auth and the user MUST confirm their email address before being able to log in.
3. **Given** an authenticated user, **When** they click logout, **Then** their session is terminated and they cannot access `/dashboard` until they login again.

---

### User Story 2 - Restaurant Provisioning and Ownership (Priority: P2)

As an authenticated user, I want to create a new restaurant with a unique name and slug, so that I can become its owner and start managing its menu and orders.

**Why this priority**: Core business value. This establishes the tenant boundary and assigns the initial administrative permissions.

**Independent Test**: An authenticated user submits a restaurant name and slug. The system validates the slug is unique, creates the restaurant record, and automatically links the user as the 'owner' by setting `owner_id` to the user's ID. The user can then see this restaurant in their dashboard list.

**Acceptance Scenarios**:

1. **Given** an authenticated user, **When** they submit a unique name and slug to `/api/restaurants`, **Then** a 201 response is returned with the restaurant details including an 'owner' role indicator (derived from `owner_id`).
2. **Given** an authenticated user, **When** they submit a slug that already exists, **Then** a 409 Conflict error is returned.
3. **Given** User A who has created Restaurant A, **When** User A lists their restaurants, **Then** only Restaurant A is returned.
4. **Given** an authenticated user who already owns Restaurant A, **When** they submit a new restaurant provisioning request, **Then** the system returns 409 Conflict and no additional restaurant is created.

---

### User Story 3 - Protected Dashboard Access (Priority: P3)

As a restaurant owner, I want to view my restaurant's specific details in a protected dashboard, so that I can manage my business without interference from other users.

**Why this priority**: Ensures the tenant isolation and data privacy promised by the architecture.

**Independent Test**: User A attempts to fetch details for Restaurant B (owned by User B) via `/api/restaurants/{id}`. The system must return a 403 Forbidden or 404 Not Found, even if the ID is known to User A.

**Acceptance Scenarios**:

1. **Given** User A is an owner of Restaurant A, **When** User A requests `/api/restaurants/{id_of_A}`, **Then** the details of Restaurant A are returned successfully.
2. **Given** User A and Restaurant B (owned by User B), **When** User A requests `/api/restaurants/{id_of_B}`, **Then** the system rejects the request with a 403 or 404 error.

---

### Edge Cases

- **Invalid Slug Patterns**: Slugs must be normalized (lowercase, hyphenated). Empty or non-alphanumeric (except hyphens) slugs should be rejected with a 400 error.
- **Session Expiry**: If a user's session expires while they are on the dashboard, subsequent API calls should return 401, and the middleware should redirect them to login on the next page transition.
- **Single Restaurant Constraint (MVP)**: If the authenticated user already owns a restaurant (where `owner_id` matches their user ID), attempts to provision another restaurant must be rejected with 409 Conflict.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a secure Sign Up flow using email/password via Supabase Auth.
- **FR-002**: System MUST provide a Sign In and Sign Out flow with persistent sessions across browser refreshes.
- **FR-003**: System MUST protect all routes under `/dashboard/*` via middleware, redirecting unauthenticated users to `/auth/login`.
- **FR-004**: System MUST allow authenticated users to create a restaurant by providing a Name and a unique Slug.
- **FR-005**: System MUST automatically assign the 'owner' role by setting `owner_id` on the `restaurants` table to the creator's user ID.
- **FR-006**: System MUST ensure that users can only list and view details for restaurants where they are the owner (`owner_id` = `auth.uid()`).
- **FR-007**: System MUST validate slug uniqueness server-side and enforce normalization (lowercase, hyphenated).
- **FR-008**: System MUST perform all provisioning writes (restaurant creation with `owner_id`) server-side to prevent client-side manipulation of IDs or roles.
- **FR-009**: System MUST restrict restaurant provisioning to one restaurant per account in MVP; subsequent provisioning attempts must return 409 Conflict.

### Key Entities *(include if feature involves data)*

- **Auth User**: Represented by Supabase Auth (email, id).
- **Restaurant**: Core tenant entity (id, owner_id, name, slug, settings). `owner_id` links an Auth User to a Restaurant.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of unauthenticated attempts to access `/dashboard` are successfully redirected to `/auth/login`.
- **SC-002**: Restaurant provisioning (POST request) completes in under 500ms (p95) under normal load.
- **SC-003**: Zero instances of User A accessing Restaurant B data via API or RLS during integration testing.
- **SC-004**: System correctly rejects duplicate slugs with a 409 response code 100% of the time.
- **SC-005**: Next.js client bundles contain zero references to `SUPABASE_SERVICE_ROLE_KEY`.
