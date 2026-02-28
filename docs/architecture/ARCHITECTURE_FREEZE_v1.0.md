# Restova Architecture Freeze v1.0

**Status:** GOVERNANCE DOCUMENT  
**Version:** 1.0  
**Date:** 2026-02-28  
**Authority:** Supervisor  

---

# ⚠️ GOVERNANCE NOTICE

This document defines non-negotiable architectural decisions for Restova.

Any deviation requires:

- An issue titled: `[ARCH CHANGE REQUEST]`
- Explicit Supervisor approval
- Version bump (v1.1, v2.0, etc.)
- Migration impact analysis

AI agents are strictly prohibited from altering architectural decisions.

---

# 1. Purpose

This document freezes core architectural decisions before feature implementation begins.

It prevents:

- Architectural drift
- Hidden design changes inside feature PRs
- Future refactor cost explosion
- Multi-tenant security regression

This document governs all implementation work.

---

# 2. Core Architectural Principles

## 2.1 RLS First (Non-Negotiable)

Every tenant-scoped table MUST:

- Include `restaurant_id`
- Have RLS enabled
- Enforce tenant isolation via policies

Cross-restaurant data access is strictly forbidden.

---

## 2.2 Server Authority

- All totals and pricing are calculated server-side.
- The frontend is never trusted for financial values.
- Any client-submitted totals must be ignored.

---

## 2.3 Audit Integrity

Every manual modification to an order MUST be recorded in:
`order_adjustments`




No silent mutations allowed.

---

# 3. Realtime Architecture (Frozen)

## Decision

Use **Supabase Realtime via `postgres_changes`**.

Do NOT use:

- Polling
- Custom broadcast channels for MVP
- Client-side refresh loops

---

## Channel Strategy

One channel per restaurant:
`restaurant-{restaurant_id}-orders`


Subscription must filter by:
`restaurant_id = eq.{restaurant_id}`


---

## Acceptance Criteria

- New orders appear in cashier dashboard ≤ 1 second (95% cases).
- No cross-tenant events visible.
- RLS + filter validation tested.

---

# 4. Atomic Order Numbering (display_number)

## Decision

`display_number` is generated inside PostgreSQL using a function and transaction.

It MUST NOT be generated in:

- Next.js
- Frontend
- Any application-layer counter

---

## Required Mechanism

Postgres function:
next_display_number(restaurant_id uuid)


Implementation must:

- Increment `restaurants.order_sequence`
- Return the new value
- Execute inside a single transaction

---

## Concurrency Requirement

Under concurrent load:

- No duplicate display numbers allowed.
- Rollback gaps are acceptable.
- Duplicates are unacceptable.

---

# 5. Order Expiry Mechanism (Frozen)

## Decision

Expiry is handled inside Supabase via:

- Scheduled Cron
- SQL function execution

NOT via:

- Vercel cron
- Frontend timers
- Polling logic

---

## Expiry Rules

An order expires if:

- `status IN ('new','awaiting_payment')`
- `expires_at <= now()`
- `is_locked = false`

On expiry:

- `status = 'cancelled'`
- Audit record created
- Realtime update triggered

---

## Timing Constraint

Expiry must execute within ≤ 2 minutes of expiration time.

---

# 6. Soft Delete Policy

Soft delete applies to:

- `orders.deleted_at`

Rules:

- Operational queries must filter `deleted_at IS NULL`.
- Updating deleted orders is forbidden.
- RLS must prevent mutation of deleted entities.

Soft delete does NOT physically remove records.

---

# 7. Printing Architecture

## Decision

Printing is a frontend-rendered printable page.

Route:
`GET /print/order/{orderId}`


Uses:

- 80mm optimized CSS
- `window.print()`

---

## Optional

Printing event audit may be logged separately.

---

## Prohibited

- Automatic printer detection
- Server-triggered print commands

---

# 8. Database Policy Requirements

Mandatory indexes:

- `orders(restaurant_id, status, created_at DESC)`
- `orders(restaurant_id, expires_at)`
- `order_items(order_id)`
- `restaurant_users(user_id, restaurant_id)`

All tenant tables MUST enforce RLS.

---

# 9. Security Constraints

## Service Role Key

`SUPABASE_SERVICE_ROLE_KEY`:

- Server-side only
- Never exposed in client bundles
- CI must fail if detected in frontend

---

## Role Enforcement

Roles:

- owner
- manager
- cashier

Authorization must be enforced by:

- RLS (primary)
- Server validation (secondary)

---

# 10. Implementation Contracts for AI Agents

AI Agents:

- Implement features.
- Add migrations.
- Add tests.
- Respect file boundaries.

AI Agents MUST NOT:

- Redesign architecture.
- Change realtime model.
- Modify numbering mechanism.
- Replace expiry engine.
- Introduce cross-tenant queries.

---

# 11. Required Test Gates

Every relevant PR must include:

1. RLS isolation test
2. Atomic numbering concurrency test
3. Expiry logic test
4. Secret exposure check

No PR merges without passing gates.

---

# 12. Change Management

Any architecture modification requires:

1. `[ARCH CHANGE REQUEST]` issue
2. Justification
3. Impact analysis
4. Supervisor approval
5. Version bump

---

# 13. Final Statement

This document is the architectural constitution of Restova.

All implementation phases must conform strictly to this freeze.

Version 1.0 is effective immediately.

