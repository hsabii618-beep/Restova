# Feature Specification: Database Foundations and RLS Perimeter

**Feature Branch**: `001-db-foundations-rls`  
**Created**: 2026-02-28  
**Status**: Draft  
**Input**: User description: "Title: Phase 1 - Database foundations and RLS perimeter Description: Create core tables, enums, indexes, helper functions, and enforce RLS/FORCE RLS for multi-tenant isolation. This implementation MUST strictly follow ARCHITECTURE_FREEZE_v1.0.md. No architectural decisions may be modified. Scope: Database layer only. No API routes. No frontend logic. Acceptance Criteria: - All tenant tables include restaurant_id - RLS + FORCE RLS enabled for all tenant tables - is_restaurant_member(uuid) helper exists - Cross-tenant access is blocked (automated test) - Required indexes exist - Migrations are idempotent and apply cleanly from empty database File Boundaries: - infra/supabase/migrations/* only Security Constraints: - No secrets in client - Service role server-only - No cross-tenant policies allowed Out of Scope: - No order numbering logic - No expiry logic - No printing logic - No API routes - No auth UI"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Secure Multi-tenant Data Separation (Priority: P1)

As a restaurant owner, I want my restaurant's data (menus, orders, staff) to be strictly isolated from other restaurants so that I can ensure my business information is secure and private.

**Why this priority**: Essential for the multi-tenant SaaS model; ensures data privacy and trust from day one.

**Independent Test**: Can be tested by attempting to query or update data belonging to Restaurant A using a JWT or session belonging to a user only authorized for Restaurant B. The system must deny access.

**Acceptance Scenarios**:

1. **Given** two restaurants (A and B) and a user belonging only to Restaurant A, **When** the user attempts to select data from Restaurant B's tables, **Then** the database returns an empty set or denies access via RLS.
2. **Given** a user with a valid session for Restaurant A, **When** the user attempts to insert a record into a tenant table with a `restaurant_id` belonging to Restaurant B, **Then** the database rejects the insertion.

---

### User Story 2 - Idempotent Schema Deployment (Priority: P2)

As a developer, I want to be able to run database migrations against an empty or existing database so that I can reliably set up and update environments without manual intervention or data corruption.

**Why this priority**: Necessary for CI/CD pipelines and developer productivity; ensures the database state is predictable.

**Independent Test**: Run the full suite of migration scripts against a fresh database, then run them again. The second run should result in no changes and no errors.

**Acceptance Scenarios**:

1. **Given** an empty database, **When** all migration scripts are executed in order, **Then** the schema is created correctly including all tables, enums, and indexes.
2. **Given** a database with the current schema, **When** the same migration scripts are executed again, **Then** the system reports no changes needed and completes without error.

---

### Edge Cases

- **Service Role Access**: Ensure the database service role (which bypasses RLS) is only used for administrative tasks and never exposed to the client.
- **Policy Fail-Open**: Verify that if an RLS policy is missing or misconfigured, access is denied by default (using `FORCE RLS`).
- **Concurrent Migrations**: Ensure migrations handle locks or existing objects gracefully to avoid failures in high-availability environments.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: All tenant-specific tables MUST include a `restaurant_id` column of type UUID.
- **FR-002**: `RLS` (Row Level Security) and `FORCE RLS` MUST be enabled on every table containing tenant data.
- **FR-003**: System MUST implement a PostgreSQL helper function `is_restaurant_member(restaurant_uuid)` that returns a boolean based on the current `auth.uid()`.
- **FR-004**: Database migrations MUST be idempotent and stored in `infra/supabase/migrations/*`.
- **FR-005**: All RLS policies MUST strictly prevent cross-tenant read/write operations.
- **FR-006**: Core enums (e.g., order status, user roles) MUST be defined in the database schema.
- **FR-007**: Performance indexes MUST be created for `restaurant_id` and other frequently queried columns.

### Key Entities *(include if feature involves data)*

- **Restaurant**: The root tenant entity (id, slug, name, etc.).
- **Restaurant User**: Junction table between Auth Users and Restaurants, defining roles (Owner, Manager, Cashier).
- **Category/Menu Item**: Tenant-specific configuration data.
- **Order/Order Item/Payment**: Tenant-specific transactional data.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of tenant-specific tables have `RLS` and `FORCE RLS` enabled.
- **SC-002**: Zero unauthorized cross-tenant data leaks during automated security testing.
- **SC-003**: 100% of migration scripts execute successfully on a clean database in under 30 seconds.
- **SC-004**: Database helper functions demonstrate 100% accuracy in identifying valid tenant memberships.
