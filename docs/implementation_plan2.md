# Restova – Final Implementation Plan (v2.2)

**Status**: FINAL / READY FOR SPEC KIT  
**Date**: 2026-02-28  
**Governance**: Governed by [Restova Constitution](../.specify/memory/constitution.md)

---

## 1. Executive Summary
Restova is a multi-tenant SaaS for restaurant order management. It uses a QR-driven public menu for customers and a realtime dashboard for cashiers. The system handles the full lifecycle from order creation to payment recording, printing, and automated expiry.

### Core Mandates (from Constitution)
- **RLS First**: Every database operation MUST enforce `restaurant_id` isolation.
- **Server Authority**: No pricing or totals calculated on the frontend.
- **Realtime Sync**: Cashier dashboards must be "alive" with Supabase Realtime.
- **Audit Trails**: Every manual order adjustment must be logged.

---

## 2. Technical Stack
- **Frontend/API**: Next.js 14+ (App Router) on Vercel.
- **Backend**: Supabase (Postgres, Auth, Realtime, Storage, Vault).
- **Styling**: Vanilla CSS for 80mm thermal print optimization.
- **Integrations**: WhatsApp (wa.me) for delivery verification.
- **Workflow**: GitHub Spec Kit (`/speckit.specify`, `/speckit.plan`, `/speckit.tasks`).

---

## 3. Data Model (Validated)
All tables MUST have `restaurant_id` and RLS enabled.

| Table | Primary Responsibility |
|-------|------------------------|
| `restaurants` | Tenant settings, slug, and open/closed status. |
| `restaurant_users` | Staff mapping (Owner, Manager, Cashier). |
| `categories` | Menu organization. |
| `menu_items` | Pricing, availability, and modifiers. |
| `orders` | Core transaction record; includes `display_number` and `expires_at`. |
| `order_items` | Snapshot of items at time of order (qty, unit_price). |
| `payments` | Audit of cash/card transactions (record-only). |
| `order_adjustments` | Audit log of every manual edit made by staff. |

---

## 4. Execution Strategy (Phased Build Plan)

### Phase 1: Foundational Setup (Priority: CRITICAL)
*Goal: Establish the secure multi-tenant perimeter.*
- [ ] Initialize Supabase project (Auth, DB, Storage).
- [ ] Implement `is_restaurant_member(restaurant_id)` SQL helper.
- [ ] Configure RLS policies for all tables.
- [ ] Setup Next.js Route Handlers with Service Role protection for sensitive writes.
- [ ] **Verification**: Automated tests proving User A cannot see Restaurant B's data.

### Phase 2: Menu Management & Public Access
*Goal: Allow restaurants to build their digital presence.*
- [ ] Category & Menu Item CRUD (Manager role).
- [ ] Image uploads to Supabase Storage.
- [ ] Public Menu view (`/r/[slug]`) with SSR for SEO and performance.
- [ ] QR Code generation API.

### Phase 3: The Ordering Engine
*Goal: Customer-to-Cashier realtime pipeline.*
- [ ] Public order submission (Atomic `display_number` increment).
- [ ] Server-side total calculation (ignore frontend inputs).
- [ ] Realtime notification service for new orders.
- [ ] WhatsApp "Confirm Location" link generation for delivery orders.

### Phase 4: Cashier Workflow & Integrity
*Goal: Staff operations and financial recording.*
- [ ] Cashier Dashboard (Realtime list of active orders).
- [ ] Manual Order Editor (must write to `order_adjustments`).
- [ ] Payment Recording (Locks order after payment is confirmed).
- [ ] Thermal Print Engine (80mm CSS layout + `window.print()`).

### Phase 5: Operational Automation
*Goal: Managing order lifecycle and cleanup.*
- [ ] 90-minute Expiry Logic (Supabase Cron or Edge Function).
- [ ] Extension Flow (Staff can add 15 mins to active orders).
- [ ] Soft-delete implementation for historical data preservation.

---

## 5. Security & Verification Gates
1. **Gate 1 (Implementation)**: Any PR adding a table MUST include the RLS migration.
2. **Gate 2 (Calculation)**: Any PR affecting price MUST include a server-side test for total accuracy.
3. **Gate 3 (Secrets)**: `SUPABASE_SERVICE_ROLE_KEY` is restricted to server-side environments; CI/CD must fail if found in client bundles.

---

## 6. Deployment & Monitoring
- **Vercel**: Production/Preview deployments.
- **Sentry**: Error tracking for both Frontend and API Routes.
- **Supabase Logs**: Audit monitoring for RLS violations.

---

## 7. Appendix: Spec Kit Commands
To initiate work on a phase, use:
1. `/speckit.specify` with the phase goal.
2. `/speckit.plan` to generate the `data-model.md` and `contracts/`.
3. `/speckit.tasks` to generate the `tasks.md` file using the `tasks-template.md` structure.
