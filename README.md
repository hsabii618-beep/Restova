# Restova

Production-grade, full-stack multi-tenant SaaS for restaurant order management.

## Project Overview

Restova is a QR-driven ordering system designed for restaurants, providing a seamless flow from public menu to realtime cashier dashboards.

- **Frontend**: Next.js (App Router) on Vercel
- **Backend**: Supabase (PostgreSQL, Realtime, Storage, Auth)
- **Architecture**: Serverless-first with multi-tenant Row-Level Security (RLS)
- **Key Features**: Realtime order notifications, manual order editing, thermal printing support, and order expiry management.

## Constitution

The project is governed by the [Restova Constitution](.specify/memory/constitution.md), which outlines our core principles:
1. **Tenant Isolation & Security**: Strict RLS and `restaurant_id` enforcement.
2. **Server-Side Authority**: All business logic and totals computed server-side.
3. **Realtime-First Operations**: Instant order synchronization.
4. **Auditability & Integrity**: Comprehensive audit trails for modifications.
5. **Testing Discipline**: Mandatory tests for all mutation logic.

## Workflow

This project uses the **Spec Kit** workflow for development.
- Specification: `.specify/templates/spec-template.md`
- Implementation Plan: `.specify/templates/plan-template.md`
- Memory/Constitution: `.specify/memory/constitution.md`
