# Feature Specification: Platform Owner Admin Dashboard (Tenant Provisioning & Oversight)

**Feature Branch**: `003-platform-admin-dashboard`
**Created**: 2026-03-01
**Status**: Draft

## Roles Vocabulary (Project Standard)

- Platform Owner: full platform control (primary account)
- Platform Manager: limited platform control (optional delegated admin)
- Restaurant Manager: tenant owner/admin for a single restaurant
- Restaurant Supervisor: delegated restaurant staff with elevated permissions
- Cashier: POS/operator role for orders

## Scope (MVP)

- Dedicated Platform Owner access gate (env allowlist).
- Admin UI shell + basic pages:
  - Admin home
  - Restaurants list
  - Restaurant detail
  - Provision new restaurant (create restaurant + restaurant manager)
- Admin API routes:
  - POST /api/admin/restaurants (create restaurant + restaurant manager mapping)
  - GET /api/admin/restaurants (list)
  - GET /api/admin/restaurants/:id (detail)
- Auditability:
  - Record all admin actions in admin_audit_logs (summary-only).

## Decisions (Locked for MVP)

- Admin Authentication Method: ADMIN_EMAILS allowlist in server env.
- Provisioning Minimum Fields: name + slug + ownerEmail.
- Audit Log Detail Level: action summary only.

## Functional Requirements

- FR-001: System MUST authenticate Platform Owner via ADMIN_EMAILS (server env).
- FR-002: System MUST restrict all /admin routes and /api/admin/* endpoints to Platform Owner via server-side validation.
- FR-003: System MUST provide provisioning flow: create restaurant + initial Restaurant Manager in one operation.
- FR-004: System MUST use server-only service role for privileged writes.
- FR-005: System MUST record every admin action in admin_audit_logs (summary).

## Acceptance Criteria

- Only Platform Owner can access /admin and call /api/admin/*.
- Platform Owner can provision restaurant + Restaurant Manager; Restaurant Manager can log into /dashboard.
- No service role key in client bundles.
- Existing tenant isolation (RLS) remains enforced for restaurant-scoped tables.
