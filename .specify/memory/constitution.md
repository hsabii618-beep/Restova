<!--
Sync Impact Report
- Version change: none → 1.0.0
- List of modified principles:
  - Added: I. Tenant Isolation & Security (NON-NEGOTIABLE)
  - Added: II. Server-Side Authority
  - Added: III. Realtime-First Operations
  - Added: IV. Auditability & Integrity
  - Added: V. Testing & Verification Discipline
- Added sections: Technical Stack & Constraints, Development Workflow
- Removed sections: none
- Templates requiring updates: 
  - ✅ .specify/templates/plan-template.md (checked, aligned)
  - ✅ .specify/templates/spec-template.md (checked, aligned)
  - ✅ .specify/templates/tasks-template.md (checked, aligned)
- Follow-up TODOs: none
-->

# Restova Constitution
Restova is a production-grade, full-stack multi-tenant SaaS for restaurant order management.

## Core Principles

### I. Tenant Isolation & Security (NON-NEGOTIABLE)
All database writes MUST include `restaurant_id`. Row-Level Security (RLS) MUST be enforced at the database level and validated server-side. The `SUPABASE_SERVICE_ROLE_KEY` must NEVER be exposed to the client or committed to the repository.

### II. Server-Side Authority
Totals, pricing, and business logic MUST be computed server-side on authoritative API routes. The frontend MUST NOT be trusted for final totals, data validation, or sensitive state transitions.

### III. Realtime-First Operations
Order flow and cashier dashboards MUST utilize realtime subscriptions (Supabase Realtime) to ensure instant delivery and synchronization across all connected clients.

### IV. Auditability & Integrity
All order modifications MUST be recorded in an audit trail (`order_adjustments`) capturing previous/new payloads and the actor. Soft-deletes MUST be used for critical accounting data (orders, payments) to preserve historical integrity.

### V. Testing & Verification Discipline
Every PR MUST include unit tests for mutation logic (edits, payments, expiry) and integration tests for security/RLS. Feature implementation is considered incomplete without verified acceptance criteria and automated verification.

## Technical Stack & Constraints

- **Framework**: Next.js (App Router) deployed on Vercel.
- **Backend**: Supabase (Authentication, PostgreSQL, Realtime, Storage, and Vault).
- **Architecture**: Serverless-first; all writes through Next.js Route Handlers.
- **Printing**: Browser-based `window.print()` using dedicated thermal-optimized (80mm) CSS layouts.
- **Payments**: Record-only for MVP (Cash/Card via onsite TPE); no external gateway integration.

## Development Workflow

- **Spec Kit**: Use GitHub Spec Kit commands (`/speckit.specify`, `/speckit.plan`, `/speckit.clarify`) for all feature development.
- **Phased Build**: Adhere to the established Phased Build Plan (Phase 1: Core Data, Phase 2: Menu, Phase 3: Ordering, etc.).
- **Security Gates**: All PRs must pass RLS validation and security checks before merging.
- **Monitoring**: Sentry and basic metrics alerts must be configured for all production features.

## Governance
This Constitution supersedes all other development practices. Amendments require a version increment according to Semantic Versioning rules and a Sync Impact Report.

- MAJOR: Backward incompatible governance/principle removals or redefinitions.
- MINOR: New principle/section added or materially expanded guidance.
- PATCH: Clarifications, wording, typo fixes, non-semantic refinements.

**Version**: 1.0.0 | **Ratified**: 2026-02-28 | **Last Amended**: 2026-02-28
