# Implementation Plan: Cashier Realtime Active Orders View

**Branch**: `001-cashier-realtime-orders` | **Date**: 2026-03-02 | **Spec**: [specs/001-cashier-realtime-orders/spec.md](spec.md)
**Input**: Feature specification from `/specs/001-cashier-realtime-orders/spec.md`

## Summary

Implement a secure, realtime cashier dashboard in Next.js that displays active orders for the authenticated restaurant. The implementation uses Supabase Realtime (`postgres_changes`) to push updates to the client in under 1 second. Security is enforced via database-level Row Level Security (RLS), ensuring strict multi-tenant isolation.

## Technical Context

**Language/Version**: Next.js 14/15+ (App Router), TypeScript 5+  
**Primary Dependencies**: `@supabase/ssr`, React 18/19  
**Storage**: PostgreSQL (Supabase)  
**Testing**: Vitest (Frontend), Supabase SQL Tests (RLS)  
**Target Platform**: Web Browser (Optimized for desktop/tablet)  
**Project Type**: Web Application  
**Performance Goals**: < 1 second latency for realtime updates  
**Constraints**: Tenant isolation by `restaurant_id`, server-authoritative filtering via RLS  
**Scale/Scope**: Realtime order list view for active orders

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Tenant Isolation**: PASS. RLS is already in place; feature will use standard `anon` key.
- **II. Server-Side Authority**: PASS. No mutations; filtering is server-enforced via RLS.
- **III. Realtime-First**: PASS. Using Supabase Realtime as the primary data delivery mechanism.
- **IV. Auditability**: PASS. Read-only view; no changes to audit posture.
- **V. Testing Discipline**: PASS. Plan includes isolation and realtime behavior tests.

## Project Structure

### Documentation (this feature)

```text
specs/001-cashier-realtime-orders/
├── plan.md              # This file
├── research.md          # Component & sync decisions
├── data-model.md        # Order entity & state transitions
├── quickstart.md        # Development & test guide
└── checklists/
    └── requirements.md  # Quality checklist
```

### Source Code (repository root)

```text
frontend/
├── app/
│   └── dashboard/
│       ├── page.tsx               # Entry point (Server Component)
│       └── active-orders-view.tsx # Realtime list (Client Component)
├── components/
│   └── dashboard/
│       └── order-card.tsx         # Individual order display
└── tests/
    └── integration/
        └── realtime-orders.test.ts # Realtime behavior test
infra/
└── supabase/
    └── tests/
        └── sql/
            └── isolation_test.sql # RLS verification
```

**Structure Decision**: Standard Next.js App Router structure. `page.tsx` handles initial auth and context; `active-orders-view.tsx` manages the realtime subscription and state.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

*(No violations identified)*
