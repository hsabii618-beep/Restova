# Implementation Plan: Phase 2 — Auth + Restaurant Provisioning

**Branch**: `001-auth-restaurant-provisioning` | **Date**: 2026-02-28 | **Spec**: [specs/001-auth-restaurant-provisioning/spec.md](spec.md)
**Input**: Feature specification for secure auth and restaurant onboarding.

## Summary

This feature implements the core onboarding flow for restaurant owners. It covers authentication setup, route protection for the dashboard, and a server-side restaurant provisioning process that enforces a single restaurant per account constraint via an `owner_id` column on the `restaurants` table.

## Technical Context

**Language/Version**: TypeScript / Next.js 14+ (App Router)  
**Primary Dependencies**: `@supabase/ssr`, `@supabase/supabase-js`, `lucide-react` (icons)  
**Storage**: Supabase Auth (Identity), Supabase PostgreSQL (`restaurants` table with `owner_id`)  
**Testing**: Vitest / Playwright (for RLS and API integration tests)  
**Target Platform**: Vercel / Supabase  
**Project Type**: Web Application / API  
**Performance Goals**: <500ms for provisioning POST  
**Constraints**: Single restaurant per account; service role server-only; RLS enforced.  
**Scale/Scope**: Auth flow and initial restaurant setup.

## Constitution Check

- [ ] **Tenant Isolation**: Every database write MUST include `restaurant_id` (or `id` for restaurant creation) and RLS MUST be enforced.
- [ ] **Server Authority**: Restaurant creation and ownership assignment MUST happen server-side via Route Handlers.
- [ ] **Realtime Sync**: N/A for this phase.
- [ ] **Audit Trail**: N/A for this phase.
- [ ] **Security**: `SUPABASE_SERVICE_ROLE_KEY` MUST NEVER be exposed in the client code.
- [ ] **Verification**: Unit/integration tests for RLS isolation and API responses are mandatory.

## Security & Environment Contract

- **`SUPABASE_SERVICE_ROLE_KEY`**: This key MUST NEVER be exposed to the client. It is used exclusively in server-side Route Handlers and server-only modules (`lib/server/*`).
- **Deployment**: In Vercel, this MUST be set as an environment variable (not `NEXT_PUBLIC_`).
- **Verification**: Phase 4 includes a mandatory build-time scan to ensure no leak occurs in `.next` bundles.

### PR #1: Auth Infrastructure & Route Protection
- **Goal**: Setup Supabase Auth and protect `/dashboard`.
- **Files**:
  - `frontend/lib/supabase/client.ts`: Anon client.
  - `frontend/lib/supabase/server.ts`: Server client (cookies).
  - `frontend/middleware.ts`: Route protection.
  - `frontend/app/auth/signup/page.tsx`: Signup UI.
  - `frontend/app/auth/login/page.tsx`: Login UI.
- **Tests**: Verify unauthenticated users are redirected to login.

### PR #2: Restaurant Provisioning & Owner Onboarding
- **Goal**: Implement restaurant creation with ownership and single-tenant constraint.
- **Files**:
  - `frontend/lib/server/restaurants.ts`: Server-only provisioning logic (uses `owner_id`).
  - `frontend/app/api/restaurants/route.ts`: POST (create), GET (list).
  - `frontend/app/api/restaurants/[id]/route.ts`: GET (details).
  - `frontend/app/dashboard/restaurants/page.tsx`: Provisioning UI.
  - `tests/rls/isolation.test.ts`: RLS isolation tests.
  - `tests/api/restaurants.test.ts`: API integration tests.
- **Tests**: 409 Conflict test; RLS isolation test; list restaurants test.

## Project Structure

```text
frontend/
├── app/
│   ├── auth/
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── dashboard/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── restaurants/page.tsx
│   └── api/
│       └── restaurants/
│           ├── route.ts
│           └── [id]/route.ts
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   └── server.ts
│   └── server/
│       └── restaurants.ts
└── middleware.ts

tests/
├── rls/
│   └── isolation.test.ts
└── api/
    └── restaurants.test.ts
```
