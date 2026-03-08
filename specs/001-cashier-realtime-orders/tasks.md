# Tasks: Cashier Realtime Active Orders View

**Input**: Design documents from `/specs/001-cashier-realtime-orders/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: Tests are requested in the plan (integration and SQL isolation).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 [P] Create directory `frontend/components/dashboard` for UI components
- [ ] T002 [P] Verify `order_status` enum and `orders` table structure in Supabase migrations

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T003 Update `frontend/app/dashboard/page.tsx` to fetch and provide restaurant context to child components
- [ ] T004 [P] Setup Supabase client types for the `orders` table if not already present

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - View Active Orders (Priority: P1) 🎯 MVP

**Goal**: Display the initial list of active orders for the authenticated restaurant.

**Independent Test**: Log in as a cashier and verify that existing active orders are displayed correctly on the dashboard.

### Implementation for User Story 1

- [ ] T005 [P] [US1] Create `frontend/components/dashboard/order-card.tsx` to display order details
- [ ] T006 [US1] Create `frontend/app/dashboard/active-orders-view.tsx` with initial fetch logic (Server Component or Client Component fetch)
- [ ] T007 [US1] Update `frontend/app/dashboard/page.tsx` to render the `ActiveOrdersView` component
- [ ] T008 [US1] Implement sorting by `created_at` ASC in `frontend/app/dashboard/active-orders-view.tsx`

**Checkpoint**: At this point, the dashboard displays a static list of active orders.

---

## Phase 4: User Story 2 - Realtime Order Updates (Priority: P1)

**Goal**: Automatically update the order list when changes occur in the database.

**Independent Test**: Insert/update an order in Supabase and verify the UI updates within 1 second without refresh.

### Tests for User Story 2

- [ ] T009 [US2] Create integration test `frontend/tests/integration/realtime-orders.test.ts` to verify state updates on Postgres changes

### Implementation for User Story 2

- [ ] T010 [US2] Implement Supabase Realtime subscription in `frontend/app/dashboard/active-orders-view.tsx`
- [ ] T011 [US2] Implement `INSERT` event handling to add new orders to the state in `frontend/app/dashboard/active-orders-view.tsx`
- [ ] T012 [US2] Implement `UPDATE` event handling to update status or remove completed orders in `frontend/app/dashboard/active-orders-view.tsx`

**Checkpoint**: The dashboard now updates in realtime.

---

## Phase 5: User Story 3 - Secure Multi-Tenant Isolation (Priority: P1)

**Goal**: Ensure data is isolated by `restaurant_id` at the database level.

**Independent Test**: Verify that orders from "Restaurant B" never appear for "Restaurant A" users.

### Tests for User Story 3

- [ ] T013 [US3] Create SQL isolation test `supabase/tests/sql/isolation_test.sql` to verify RLS on `orders` table

### Implementation for User Story 3

- [ ] T014 [US3] Verify that the authenticated Supabase session is used for all queries in `frontend/app/dashboard/active-orders-view.tsx`
- [ ] T015 [US3] Double-check that `restaurant_id` filtering is applied in the initial fetch and realtime channel setup

**Checkpoint**: Cross-tenant isolation is verified and tested.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T016 [P] Add connection status indicator (Live/Connecting) to `frontend/app/dashboard/active-orders-view.tsx`
- [ ] T017 [P] Add empty state "No active orders" to `frontend/app/dashboard/active-orders-view.tsx`
- [ ] T018 Run final validation against `specs/001-cashier-realtime-orders/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Can start immediately.
- **Foundational (Phase 2)**: Depends on T001, T002.
- **User Story 1 (Phase 3)**: Depends on Phase 2 completion.
- **User Story 2 (Phase 4)**: Depends on US1 (requires the view and list state).
- **User Story 3 (Phase 5)**: Can run in parallel with US1/US2 implementation, but T013 is a priority for verification.
- **Polish (Phase 6)**: Depends on US1 and US2 completion.

### Parallel Opportunities

- T001 and T002 can run in parallel.
- T005 (OrderCard) can be built while T003 (Foundational Auth) is being worked on.
- T013 (SQL Test) can be developed independently of the frontend work.

---

## Parallel Example: User Story 1

```bash
# Developer A: UI Components
Task: "Create frontend/components/dashboard/order-card.tsx"

# Developer B: Logic & Data Fetching
Task: "Create frontend/app/dashboard/active-orders-view.tsx with initial fetch logic"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 & 2.
2. Complete Phase 3 (US1) - Dashboard now shows active orders on load.
3. Validate US1 manually.

### Incremental Delivery

1. Add US2 (Realtime) - Dashboard now stays in sync.
2. Add US3 (Isolation Tests) - Security is verified.
3. Apply Polish (Phase 6) - UI feedback for connectivity.

---

## Notes

- All tasks include exact file paths.
- Each user story phase provides an independent test criteria.
- Realtime latency target (<1s) should be verified during T009/T010.
