# Tasks: Phase 1 - Database foundations and RLS perimeter

**Input**: Design documents from `/specs/001-db-foundations-rls/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md

## Phase 1: Setup (Infrastructure)

- [X] **T001: Initialize Directory Structure**
  - **Description**: Create the required directory structure for Supabase migrations and SQL tests.
  - **Path**: `supabase/migrations/`, `supabase/tests/sql/`
  - **DoD**: Directories exist and `.gitkeep` files added if empty to ensure tracking.

---

## Phase 2: Foundational (Database Schema & Security)

**⚠️ CRITICAL**: All tasks in this phase MUST be completed before any application-layer work begins.

- [X] **T002: Core Database Enums**
  - **Description**: Implement `20260228000100_core_enums.sql` containing all required domain enums.
  - **Enums**: `user_role`, `order_type`, `order_status`, `payment_method`, `adjustment_action`.
  - **DoD**: `supabase db reset` runs without error; enums visible in `pg_type`.

- [X] **T003: Core Tenant Tables**
  - **Description**: Implement `20260228000200_core_tables.sql` defining the 8 core tables with `restaurant_id` (UUID).
  - **Tables**: `restaurants`, `restaurant_users`, `categories`, `menu_items`, `orders`, `order_items`, `payments`, `order_adjustments`.
  - **DoD**: All tables created with correct foreign keys and `NOT NULL` constraints on `restaurant_id`.

- [X] **T004: Security Helper Function**
  - **Description**: Implement `20260228000300_security_helpers.sql` with `is_restaurant_member(uuid)`.
  - **Requirements**: Must be `SECURITY DEFINER` and check `auth.uid()` against `restaurant_users`.
  - **DoD**: Function exists in `information_schema.routines`; manually verifiable via `SELECT is_restaurant_member(...)`.

- [X] **T005: RLS & FORCE RLS Perimeter**
  - **Description**: Implement `20260228000400_rls_policies.sql` to enable RLS/FORCE RLS and define "Members-only" policies.
  - **Requirements**: No public access; all Select/Insert/Update/Delete restricted to restaurant members.
  - **DoD**: System catalog query (from `quickstart.md`) returns `t` for `rls_enabled` and `force_rls_enabled` for all 8 tables.

- [X] **T006: Performance Indexes**
  - **Description**: Implement `20260228000500_performance_indexes.sql` with required architectural indexes.
  - **Indexes**: Tenant-based indexes on `orders`, `order_items`, `restaurant_users`, and `menu_items`.
  - **DoD**: All 5 mandatory indexes (from `plan.md`) exist in `pg_indexes`.

---

## Phase 3: Verification (Isolation Testing)

- [X] **T007: Isolation Test Suite**
  - **Description**: Create `supabase/tests/sql/isolation_test.sql` to programmatically verify multi-tenant boundaries.
  - **Tests**: 
    1. Anonymous access denied.
    2. User A cannot read Restaurant B data.
    3. User A cannot insert/update Restaurant B data.
  - **DoD**: Test script executes in SQL Editor and all assertions return `True` or expected 0-row results.

- [X] **T008: Final Quickstart Validation**
  - **Description**: Follow `quickstart.md` from scratch on a clean Supabase instance.
  - **DoD**: `supabase db reset` works; RLS verification query passes; Isolation tests pass.
