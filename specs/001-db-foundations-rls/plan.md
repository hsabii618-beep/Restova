# Implementation Plan: Phase 1 - Database foundations and RLS perimeter

**Branch**: `001-db-foundations-rls` | **Date**: 2026-02-28 | **Spec**: [specs/001-db-foundations-rls/spec.md](spec.md)
**Input**: Feature specification for core database schema and security perimeter.

## Summary

Initialize the Restova database schema on Supabase, focusing on multi-tenant isolation. This phase establishes the "Security Perimeter" by creating all core tables and enforcing strict Member-only RLS/FORCE RLS policies. It complies with `ARCHITECTURE_FREEZE_v1.0.md`.

## Technical Context

**Language/Version**: PostgreSQL 15+ (Supabase)  
**Primary Dependencies**: Supabase Auth  
**Storage**: PostgreSQL  
**Testing**: SQL-based isolation verification via `supabase/tests/sql/`  
**Target Platform**: Supabase  
**Project Type**: Database Schema  
**Performance Goals**: Optimized queries for active order lists and expiry checks.  
**Constraints**: ARCHITECTURE_FREEZE_v1.0.md; RLS + FORCE RLS mandatory.  
**Scale/Scope**: Database layer only. No API/Frontend/Logic.

## Constitution Check

- [x] **Tenant Isolation**: Every write includes `restaurant_id` and has an associated RLS policy.
- [x] **Server Authority**: Schema supports server-side calculations (Phase 1 scope).
- [x] **Realtime Sync**: Schema supports `postgres_changes`.
- [x] **Audit Trail**: `order_adjustments` table included.
- [x] **Security**: `SUPABASE_SERVICE_ROLE_KEY` constraint noted.
- [x] **Verification**: SQL-based RLS and isolation tests planned.

## Project Structure

### Documentation (this feature)

```text
specs/001-db-foundations-rls/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
infra/
└── supabase/
    ├── migrations/
    │   ├── 20260228000100_core_enums.sql
    │   ├── 20260228000200_core_tables.sql
    │   ├── 20260228000300_security_helpers.sql
    │   ├── 20260228000400_rls_policies.sql
    │   └── 20260228000500_performance_indexes.sql
    └── tests/
        └── sql/
            └── isolation_test.sql
```

## Migration Timeline

### 1. `20260228000100_core_enums.sql`
- **Enums**: `user_role`, `order_type`, `order_status`, `payment_method`, `adjustment_action`.

### 2. `20260228000200_core_tables.sql`
- **Tables**: `restaurants`, `restaurant_users`, `categories`, `menu_items`, `orders`, `order_items`, `payments`, `order_adjustments`.
- **Note**: All tenant tables include `restaurant_id`.

### 3. `20260228000300_security_helpers.sql`
- **Functions**: `is_restaurant_member(restaurant_id uuid)` (returns boolean).
- **Functionality**: Checks if `auth.uid()` exists in `restaurant_users` for the given `restaurant_id`.

### 4. `20260228000400_rls_policies.sql`
- **Actions**: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`, `ALTER TABLE ... FORCE ROW LEVEL SECURITY`.
- **Policies**: Members-only access (Select/Insert/Update) for all tenant tables based on `is_restaurant_member()`.
- **Restriction**: NO public policies (Phase 1).

### 5. `20260228000500_performance_indexes.sql`
- **Indexes**:
  - `orders(restaurant_id, status, created_at DESC)`
  - `orders(restaurant_id, expires_at)`
  - `order_items(order_id)`
  - `restaurant_users(user_id, restaurant_id)`
  - `menu_items(restaurant_id, category_id)`

## Verification Plan

### RLS & FORCE RLS Verification
Execute a system catalog query against `pg_class` to verify:
- `relrowsecurity` is true for all 8 core tables.
- `relforcerowsecurity` is true for all 8 core tables.

### Cross-Tenant Isolation
Execute `supabase/tests/sql/isolation_test.sql` to verify:
1. User A cannot read Restaurant B data.
2. User A cannot insert/update data for Restaurant B.
3. Anonymous access is denied for all operations in Phase 1.
