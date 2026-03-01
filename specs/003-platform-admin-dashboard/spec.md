# Feature Specification: Platform Admin Dashboard (Tenant Provisioning & Oversight)

**Feature Branch**: `003-platform-admin-dashboard`  
**Created**: 2026-03-01  
**Status**: Draft  

## Scope (MVP)

- Dedicated Platform Admin access gate (env allowlist).
- Admin UI shell + basic pages:
  - Admin home
  - Restaurants list
  - Restaurant detail
  - Provision new restaurant (create restaurant + owner)
- Admin API routes:
  - POST /api/admin/restaurants (create restaurant + owner mapping)
  - GET /api/admin/restaurants (list)
  - GET /api/admin/restaurants/:id (detail)
- Auditability:
  - Record all admin actions in `admin_audit_logs` (summary-only).

## Decisions (Locked for MVP)

- Admin Authentication Method: `ADMIN_EMAILS` allowlist in server env.
- Provisioning Minimum Fields: `name + slug + ownerEmail`.
- Audit Log Detail Level: action summary only.

## Functional Requirements

- FR-001: System MUST authenticate platform admins via `ADMIN_EMAILS` (server env).
- FR-002: System MUST restrict all `/admin` routes and `/api/admin/*` endpoints to platform admins via server-side validation.
- FR-003: System MUST provide provisioning flow: create restaurant + initial owner in one operation.
- FR-004: System MUST use server-only service role for privileged writes.
- FR-005: System MUST record every admin action in `admin_audit_logs` (summary).

## Acceptance Criteria

- Only platform admins can access `/admin` and call `/api/admin/*`.
- Admin can provision restaurant + owner; owner can log into `/dashboard`.
- No service role key in client bundles.
- Existing tenant isolation (RLS) remains enforced for restaurant-scoped tables.
