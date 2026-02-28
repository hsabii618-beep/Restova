---
description: "Task list template for feature implementation"
---

# Tasks: [FEATURE NAME]

**Input**: Design documents from `/specs/[###-feature-name]/`  
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/  

**Tests**: Include test tasks ONLY if explicitly requested in the feature specification.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

---

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Always include exact file paths in descriptions

---

# Path Conventions (Restova)

- Frontend (App Router): `frontend/app/`
- API Route Handlers: `frontend/app/api/`
- UI Components: `frontend/components/`
- Shared Utilities: `frontend/lib/`
- Supabase Migrations: `infra/supabase/migrations/`
- Specs: `specs/[###-feature-name]/`
- Tests:
  - Contract Tests: `tests/contract/`
  - Integration Tests: `tests/integration/`
  - Unit Tests: `tests/unit/`
- Documentation: `docs/`

---

# Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and base structure

- [ ] T001 Create folder structure according to Path Conventions
- [ ] T002 Initialize Next.js project in `frontend/`
- [ ] T003 [P] Configure ESLint + Prettier
- [ ] T004 [P] Setup Supabase client in `frontend/lib/supabase.ts`
- [ ] T005 Create environment variables structure (`.env.local`, `.env.example`)

---

# Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure required before ANY user story

### Mandatory Rules

- All database tables MUST include `restaurant_id` where applicable
- RLS MUST be enabled with `FORCE ROW LEVEL SECURITY`
- Service Role Key MUST NOT be used in client components
- Service Role usage allowed ONLY inside server route handlers

---

### Core Tasks

- [ ] T006 Setup Supabase migrations framework in `infra/supabase/migrations/`
- [ ] T007 Create base tables (`restaurants`, `users`) with RLS enabled
- [ ] T008 [P] Configure Supabase Auth integration
- [ ] T009 [P] Setup API middleware structure inside `frontend/app/api/`
- [ ] T010 Create reusable authorization helper in `frontend/lib/auth.ts`
- [ ] T011 Setup structured logging utility in `frontend/lib/logger.ts`
- [ ] T012 Configure environment validation logic in `frontend/lib/env.ts`

---

✅ **Checkpoint**: Foundation ready — user stories may now begin in parallel

---

# Phase 3: User Story 1 – [Title] (Priority: P1) 🎯 MVP

**Goal**: [Short description of business value]  
**Independent Test**: [Describe how to verify functionality end-to-end]

---

## Tests (ONLY if requested)

> Write tests FIRST and ensure they FAIL before implementation

- [ ] T013 [P] [US1] Contract test in `tests/contract/test_[feature].ts`
- [ ] T014 [P] [US1] Integration test in `tests/integration/test_[feature].ts`

---

## Implementation

- [ ] T015 [P] [US1] Create migration in `infra/supabase/migrations/[timestamp]_[entity].sql`
- [ ] T016 [US1] Implement business logic in `frontend/app/api/[feature]/route.ts`
- [ ] T017 [US1] Add validation logic inside `route.ts`
- [ ] T018 [US1] Enforce `restaurant_id` filtering in queries
- [ ] T019 [US1] Add structured logging
- [ ] T020 [US1] Create UI component in `frontend/components/[Feature].tsx` (if applicable)

---

✅ **Checkpoint**: User Story 1 fully functional and independently testable

---

# Phase 4: User Story 2 – [Title] (Priority: P2)

**Goal**: [Business value]  
**Independent Test**: [How to verify independently]

---

## Tests (Optional)

- [ ] T021 [P] [US2] Contract test in `tests/contract/test_[feature].ts`
- [ ] T022 [P] [US2] Integration test in `tests/integration/test_[feature].ts`

---

## Implementation

- [ ] T023 [P] [US2] Create migration in `infra/supabase/migrations/[timestamp]_[entity].sql`
- [ ] T024 [US2] Implement API logic in `frontend/app/api/[feature]/route.ts`
- [ ] T025 [US2] Add validation & RLS enforcement
- [ ] T026 [US2] Create UI component in `frontend/components/[Feature].tsx`
- [ ] T027 [US2] Integrate with US1 (without breaking independence)

---

✅ **Checkpoint**: US1 and US2 both independently working

---

# Phase 5: User Story 3 – [Title] (Priority: P3)

**Goal**: [Business value]  
**Independent Test**: [Verification method]

---

## Tests (Optional)

- [ ] T028 [P] [US3] Contract test in `tests/contract/test_[feature].ts`
- [ ] T029 [P] [US3] Integration test in `tests/integration/test_[feature].ts`

---

## Implementation

- [ ] T030 [P] [US3] Create migration in `infra/supabase/migrations/[timestamp]_[entity].sql`
- [ ] T031 [US3] Implement API route in `frontend/app/api/[feature]/route.ts`
- [ ] T032 [US3] Add UI integration in `frontend/components/[Feature].tsx`

---

✅ **Checkpoint**: All stories independently functional

---

# Phase N: Polish & Cross-Cutting Concerns

- [ ] TXXX [P] Documentation updates in `docs/`
- [ ] TXXX Code cleanup & refactoring
- [ ] TXXX Performance optimization
- [ ] TXXX [P] Additional unit tests in `tests/unit/`
- [ ] TXXX Security hardening review
- [ ] TXXX Validate quickstart.md instructions

---

# Dependencies & Execution Order

## Phase Dependencies

- Setup → No dependencies
- Foundational → Blocks ALL user stories
- User Stories → Can run in parallel after Foundational
- Polish → After required stories complete

---

## Within Each User Story

- Tests (if included) MUST fail before implementation
- Migrations before API logic
- API logic before UI integration
- Validate independently before moving to next priority

---

# Implementation Strategy

## MVP Strategy

1. Complete Setup
2. Complete Foundational (CRITICAL)
3. Complete User Story 1
4. STOP and validate
5. Deploy/demo MVP

---

## Incremental Delivery

Foundation → US1 → Validate → Deploy  
Add US2 → Validate → Deploy  
Add US3 → Validate → Deploy  

Each story must add value independently.

---

# Notes

- [P] = parallelizable task
- No cross-story hard coupling
- Always enforce `restaurant_id`
- Never expose Service Role Key to client
- Commit after each logical milestone