# Feature Specification: Cashier Realtime Active Orders View

**Feature Branch**: `001-cashier-realtime-orders`  
**Created**: 2026-03-02  
**Status**: Draft  
**Input**: User description: "Title: Phase 4 – Cashier Realtime Active Orders View Description: Implement a secure, realtime cashier dashboard that lists active orders for the authenticated restaurant user. The dashboard must: Subscribe to Supabase Realtime for the orders table. Only display orders where: restaurant_id matches the authenticated user’s restaurant status IN ('new','editing','awaiting_payment','paid','preparing','ready') deleted_at IS NULL Sort orders by created_at ASC Update automatically when: A new order is inserted An order status changes Enforce server-authoritative filtering (no client-only filtering) This spec does NOT include: Editing logic Payment logic Printing logic This is read-only realtime visibility only. --- Acceptance Criteria: Cashier user can access /dashboard Orders appear in less than 1 second after creation Status changes reflect without refresh Cross-tenant isolation verified (restaurant A cannot see restaurant B) No frontend total calculations Query uses authenticated Supabase session (not service role)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Active Orders (Priority: P1)

As a cashier, I want to see a live list of active orders for my restaurant so that I can monitor current operations without manually refreshing the page.

**Why this priority**: This is the core functionality of the dashboard and essential for restaurant operations.

**Independent Test**: Log in as a cashier and verify that existing active orders (with correct statuses) are displayed immediately on the dashboard.

**Acceptance Scenarios**:

1. **Given** I am an authenticated cashier for "Restaurant A", **When** I navigate to `/dashboard`, **Then** I see a list of orders for "Restaurant A" with statuses 'new', 'editing', 'awaiting_payment', 'paid', 'preparing', or 'ready'.
2. **Given** I am viewing the dashboard, **When** I look at the order list, **Then** the orders are sorted by their creation time, with the oldest orders at the top.

---

### User Story 2 - Realtime Order Updates (Priority: P1)

As a cashier, I want the dashboard to update automatically when new orders arrive or when their status changes, so that I always have the most current information.

**Why this priority**: Realtime updates are a key requirement for operational efficiency in a high-paced restaurant environment.

**Independent Test**: Create or update an order in the database and verify it appears or updates in the UI within 1 second.

**Acceptance Scenarios**:

1. **Given** I am viewing the dashboard, **When** a new order is inserted into the database for my restaurant, **Then** it appears in the list in under 1 second without a page refresh.
2. **Given** an order is currently visible on my dashboard, **When** its status is changed (e.g., from 'preparing' to 'ready') in the database, **Then** the UI reflects this change immediately.
3. **Given** an order is visible on my dashboard, **When** its status is changed to a non-active status (e.g., 'completed' or 'cancelled'), **Then** it is removed from the active orders list automatically.

---

### User Story 3 - Secure Multi-Tenant Isolation (Priority: P1)

As a restaurant owner, I want to ensure that my restaurant's orders are only visible to my authorized staff, so that my business data remains private and secure.

**Why this priority**: Security and data isolation are non-negotiable in a multi-tenant platform.

**Independent Test**: Verify that a cashier logged into "Restaurant A" cannot see orders for "Restaurant B", even if they attempt to manipulate client-side filters.

**Acceptance Scenarios**:

1. **Given** I am an authenticated cashier for "Restaurant A", **When** an order is created or updated for "Restaurant B", **Then** I do not see that order on my dashboard or receive any realtime notifications for it.
2. **Given** I am an authenticated cashier, **When** the system fetches orders, **Then** the filtering by `restaurant_id` is enforced by the server/database (RLS) based on my authenticated session.

---

## Edge Cases

- **Connection Loss**: If the realtime subscription (Websocket) is interrupted, the UI should provide an indication of the connection status and attempt to reconnect/resync.
- **Empty State**: When there are no active orders for the restaurant, the dashboard should display a clear "No active orders" message instead of a blank screen.
- **Rapid Updates**: If multiple orders are updated simultaneously, the UI must remain stable and responsive without flickering or missed updates.

## Assumptions

- **Existing Data Model**: The `orders` table already exists with fields for `restaurant_id`, `status`, `created_at`, and `deleted_at`.
- **Database Permissions**: Appropriate Row Level Security (RLS) policies are already in place or will be configured to support the server-authoritative filtering requirement.
- **Authentication**: Users are authenticated and their `restaurant_id` is accessible via their JWT/session.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST establish a Supabase Realtime subscription to the `orders` table.
- **FR-002**: System MUST enforce server-authoritative filtering using the authenticated user's session to ensure only orders belonging to their `restaurant_id` are returned.
- **FR-003**: System MUST filter orders by status, including only: 'new', 'editing', 'awaiting_payment', 'paid', 'preparing', 'ready'.
- **FR-004**: System MUST exclude any orders where the `deleted_at` timestamp is NOT NULL.
- **FR-005**: System MUST sort the active order list by `created_at` in ascending order (oldest first).
- **FR-006**: System MUST update the UI automatically on `INSERT` and `UPDATE` events from the realtime stream.
- **FR-007**: System MUST NOT perform order total calculations on the frontend; all displayed data must be derived directly from the database record.

### Key Entities

- **Order**: Represents a customer's request. Key attributes for this view: `id`, `restaurant_id`, `status`, `created_at`, `deleted_at`.
- **Restaurant**: The multi-tenant entity. Orders are isolated by `restaurant_id`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Dashboard reflects database changes (inserts/updates) in under 1 second in 95% of cases.
- **SC-002**: 100% of orders displayed on the dashboard belong to the authenticated user's restaurant (zero cross-tenant leakage).
- **SC-003**: Cashiers can view the list of active orders immediately upon navigating to `/dashboard` without requiring a manual refresh.
- **SC-004**: The system maintains realtime synchronization for at least 8 hours of continuous dashboard usage without requiring a page reload.
