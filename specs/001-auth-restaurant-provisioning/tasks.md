---

description: "Task list for Phase 2 — Auth + Restaurant Provisioning"
---

# Tasks: Phase 2 — Auth + Restaurant Provisioning

**Input**: Design documents from `/specs/001-auth-restaurant-provisioning/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/api.md, research.md

## Phase 1: Setup (Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Initialize Next.js project structure for auth and dashboard in `frontend/app/`
- [ ] T002 [P] Install dependencies: `@supabase/ssr`, `@supabase/supabase-js`, `lucide-react`
- [ ] T003 [P] Configure environment variables in `.env.local` (excl. service role key)

---

## Phase 2: Foundational (Auth & Route Protection) - PR #1

**Purpose**: Core auth infrastructure and secure dashboard access

**⚠️ CRITICAL**: No provisioning work can begin until auth is functional

### Implementation for User Story 1 (P1)

- [ ] T004 Create browser-side Supabase client in `frontend/lib/supabase/client.ts`
- [ ] T005 Create server-side Supabase client (cookie-based) in `frontend/lib/supabase/server.ts`
- [ ] T006 Implement Next.js Middleware for `/dashboard/*` protection in `frontend/middleware.ts`
- [ ] T007 Create basic dashboard layout shell in `frontend/app/dashboard/layout.tsx`
- [ ] T008 Implement Sign Up page with email/password in `frontend/app/auth/signup/page.tsx`
- [ ] T009 Implement Login page with session handling in `frontend/app/auth/login/page.tsx`
- [ ] T010 Implement Logout functionality in dashboard shell

**Checkpoint**: PR #1 Complete. User can sign up, confirm email, login, and access a protected `/dashboard`.

#### How to test PR #1:
1. Try to access `/dashboard` without being logged in (should redirect to `/auth/login`).
2. Register a new user at `/auth/signup`.
3. Confirm email (mock/Supabase dashboard) and log in.
4. Verify access to `/dashboard` and session persistence on refresh.

---

## Phase 3: Restaurant Provisioning & Owner Onboarding - PR #2

**Purpose**: Atomic restaurant creation and ownership assignment

### Tests for PR #2

- [ ] T011 [P] [US2] Create API integration tests for provisioning in `tests/api/restaurants.test.ts`
- [ ] T012 [P] [US2] Create RLS isolation tests in `tests/rls/isolation.test.ts`

### Implementation for User Story 2 & 3 (P2, P3)

- [ ] T013 [US2] Create server-only provisioning logic in `frontend/lib/server/restaurants.ts` (Single restaurant constraint using `owner_id` + Service Role usage)
- [ ] T014 [US2] Implement `POST /api/restaurants` for creation in `frontend/app/api/restaurants/route.ts`
- [ ] T015 [US2] Implement `GET /api/restaurants` for listing in `frontend/app/api/restaurants/route.ts` (filtered by `owner_id`)
- [ ] T016 [US3] Implement `GET /api/restaurants/[id]` for details in `frontend/app/api/restaurants/[id]/route.ts` (verified by `owner_id`)
- [ ] T017 [US2] Create restaurant provisioning UI in `frontend/app/dashboard/restaurants/page.tsx`
- [ ] T018 [US2] Integrate provisioning UI with `POST /api/restaurants` and handle 409 errors

**Checkpoint**: PR #2 Complete. User can provision one restaurant, see it in their list, and details are protected via RLS using `owner_id`.

#### How to test PR #2:
1. Log in as a user with no restaurant.
2. Navigate to `/dashboard/restaurants` and create a restaurant.
3. Verify successful creation and listing.
4. Attempt to create a second restaurant (should return 409 Conflict).
5. Attempt to use a slug that is already taken (should return 409 Conflict).
6. Run `tests/rls/isolation.test.ts` to ensure User A cannot see User B's restaurant.

---

## Phase 4: Polish & Cross-Cutting Concerns

**Purpose**: Refinements, security, and performance verification

- [ ] T019 [P] Add loading states and error toasts to auth/provisioning forms
- [ ] T020 [P] Update documentation in `docs/` with provisioning flow details
- [ ] T021 Run `quickstart.md` validation scenarios
- [ ] T022 [CRITICAL] [SC-005] Security Audit: Build project (`npm run build`) and scan `.next` bundles for `SUPABASE_SERVICE_ROLE_KEY` references.
- [ ] T023 [SC-002] Performance Benchmark: Measure `POST /api/restaurants` latency. Acceptance: P95 < 500ms.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2 / PR #1)**: Depends on Phase 1.
- **Provisioning (Phase 3 / PR #2)**: Depends on Phase 2 (requires session context).
- **Polish (Phase 4)**: Depends on Phase 3.

### Parallel Opportunities

- T002 and T003 can run in parallel.
- T011 and T012 (Tests) can be developed in parallel with T013-T017.
- T019, T020, T022, T023 can run in parallel.

---

## Implementation Strategy

### MVP First (PR #1 Only)

1. Complete Setup + Auth infrastructure.
2. Deliver PR #1 to establish secure perimeter.

### Incremental Delivery (PR #2)

1. Implement server-side logic and API routes.
2. Add RLS tests first (TDD) to ensure isolation before UI.
3. Complete provisioning UI and integration.
