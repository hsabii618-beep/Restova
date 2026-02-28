# Implementation Plan: Phase 1 - Database foundations and RLS perimeter

**Branch**: `001-db-foundations-rls` | **Date**: 2026-02-28 | **Spec**: [specs/001-db-foundations-rls/spec.md](spec.md)
**Input**: Feature specification for core database schema and security perimeter.

## Summary

Initialize the Restova database schema on Supabase, ensuring strict multi-tenant isolation via Row-Level Security (RLS). This phase focuses purely on the database layer, creating all core tables, enums, and security policies required for subsequent features. It strictly follows `ARCHITECTURE_FREEZE_v1.0.md`.

## Technical Context

**Language/Version**: PostgreSQL 15+ (Supabase)  
**Primary Dependencies**: Supabase Auth (for `auth.uid()`)  
**Storage**: PostgreSQL  
**Testing**: SQL-based isolation verification (e.g., pgTAP or custom verification scripts)  
**Target Platform**: Supabase  
**Project Type**: Database Schema  
**Performance Goals**: Optimized queries for realtime dashboards (indexes on `restaurant_id`).  
**Constraints**: ARCHITECTURE_FREEZE_v1.0.md compliance; RLS + FORCE RLS mandatory.  
**Scale/Scope**: 8 core tables + audit trail; Multi-tenant isolation.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Tenant Isolation**: Does every write include `restaurant_id` and have an associated RLS policy?
- [x] **Server Authority**: Are all totals, pricing, and business logic computed server-side? (Schema supports this)
- [x] **Realtime Sync**: Does this feature require realtime updates for the cashier/customer? (Schema supports `postgres_changes`)
- [x] **Audit Trail**: Does this modification need to be recorded in `order_adjustments`? (Schema includes this table)
- [x] **Security**: Is `SUPABASE_SERVICE_ROLE_KEY` kept server-side? (Constraint noted)
- [x] **Verification**: Are there unit/integration tests for mutation logic and RLS? (Planned)

## Project Structure

### Documentation (this feature)

```text
specs/001-db-foundations-rls/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (N/A for DB only)
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
infra/
└── supabase/
    └── migrations/
        ├── 20260228000100_initial_schema.sql
        ├── 20260228000200_security_helpers.sql
        ├── 20260228000300_rls_policies.sql
        └── 20260228000400_performance_indexes.sql
```

**Structure Decision**: Standard Supabase migration structure.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None      | N/A        | N/A                                 |
