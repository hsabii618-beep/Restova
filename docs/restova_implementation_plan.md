# Restova – Full Stack SaaS Implementation Plan

**Version:** 2.1\
**Date:** 2026-02-27\
**Status:** Draft — Supervisor-reviewed

---

## Short summary

Restova is a production-grade, full‑stack multi-tenant SaaS for restaurant order management (QR-driven menus → realtime orders → POS-like cashier workflows). This document is a complete implementation plan (product + tech + execution) that incorporates all decisions and details discussed during our planning sessions, ready to be used with the GitHub Spec Kit workflow.

> Key constraints: No external payment gateway for now (card payments are recorded as TPE/onsite), serverless-first architecture, Supabase-backed data & realtime, Next.js frontend, Vercel hosting. Cloudflare is optional and can be added later for WAF/CDN needs.

---

## Entities referenced (single-shot)

- Supabase: Authentication, PostgreSQL Database, Realtime, Storage, and Vault.
- Vercel: Frontend hosting (Next.js).
- Next.js: Frontend framework (App Router).
- Cloudflare: Optional WAF/CDN (to be added later).
- Electron: Optional local printing agent (future phase but not now).
- GitHub: Spec Kit usage and repository hosting.
- WhatsApp: Delivery verification via prefilled message links.



---

# Table of Contents

1. [Goals & Scope](#goals--scope)
2. [Decisions Summary](#decisions-summary)
3. [High-level Architecture](#high-level-architecture)
4. [Data Model (Core Tables)](#data-model-core-tables)
5. [Row-Level Security & Policies](#row-level-security--policies)
6. [API Surface (Contract)](#api-surface-contract)
7. [Customer & Cashier UX Flows (detailed)](#customer--cashier-ux-flows-detailed)
8. [Printing & WhatsApp Integration Details](#printing--whatsapp-integration-details)
9. [Order Editing, Locking & Audit Trail](#order-editing-locking--audit-trail)
10. [Order Expiration Logic (90-minute rule)](#order-expiration-logic-90-minute-rule)
11. [Spec Kit & AI Agent Workflow](#spec-kit--ai-agent-workflow)
12. [Env & Deployment](#env--deployment)
13. [Phased Build Plan (tables)](#phased-build-plan-tables)
14. [File Structure & Migrations](#file-structure--migrations)
15. [Verification Checklist & Acceptance Criteria](#verification-checklist--acceptance-criteria)
16. [Non-functional Requirements & Scaling Roadmap](#non-functional-requirements--scaling-roadmap)
17. [Appendix: Snippets & Examples](#appendix-snippets--examples)

---

## Goals & Scope

- Deliver a fully functioning SaaS product that covers:
  - Public menu per restaurant (QR + slug) with item- and order-level notes.
  - Realtime orders delivered to a cashier dashboard.
  - Manual order editing by cashiers (pre-payment), audit trail for edits.
  - Payment recording (cash / card via onsite TPE) and locking after payment.
  - Invoice printing using browser print dialog (thermal printers supported by user choice).
  - Restaurant lifecycle controls: open/closed state stops ordering.
  - Order expiration handling (90 minutes) with 15-minute extension option.
- Exclude for now: online payments, Stripe integration, automated TPE integration.

---

## Decisions Summary

| Area            | Decision                                                                                                                                                                         |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Architecture    | Serverless-first: Next.js + entity["organization","Supabase","backend platform"] + entity["organization","Vercel","deployment platform"]                                   |
| Backend         | Next.js Route Handlers (API) — single runtime for frontend + API routes                                                                                                          |
| Printing        | Browser `window.print()` with a dedicated printable invoice page (80mm layout) — upgrade path: entity["organization","Electron","desktop framework"] if auto-detection needed |
| Realtime        | entity["organization","Supabase","backend platform"] Realtime (Postgres changes or realtime API)                                                                              |
| Payments        | Record only: `cash` or `card` (card = TPE/onsite)                                                                                                                                |
| Order edits     | Allowed until `is_locked = true` (set after payment)                                                                                                                             |
| Order expiry    | 90 minutes after creation; notify cashier; option to extend 15 minutes                                                                                                           |
| Security        | RLS enforced; use service role only on server-side; secrets in Vault                                                                                                             |
| Spec management | Use entity["organization","GitHub","code hosting"] Spec Kit workflow (commands: `/speckit.specify`, `/speckit.plan`, `/speckit.clarify`)                                      |

---

## High-level Architecture

```text
Customer Browser (mobile/tablet) --> Next.js Public Menu (SSR/Edge)
       │                                         │
       └─ POST /api/restaurants/{slug}/orders ──> Next.js API Route
                                                 │
                                        Supabase Postgres (Auth, RLS, Storage)
                                                 │
                                      Supabase Realtime pushes events
                                                 │
                                   Cashier Dashboard (Next.js, protected)
                                                 │
                                 Printable / PDF invoice -> window.print()
```

Notes:

- All writes go through server-side Route Handlers that validate and enforce `restaurant_id` and RLS rules.
- No FastAPI; no containerized monolith at MVP.

---

## Data Model (Core Tables)

The following core tables form the MVP schema. Add standard `created_at`, `updated_at` timestamps and triggers where applicable.

### restaurants

| column           | type                 | notes                                  |
| ---------------- | -------------------- | -------------------------------------- |
| id               | UUID PK              | gen\_random\_uuid()                    |
| organization\_id | UUID                 | optional multi-owner scenario          |
| name             | text                 |                                        |
| slug             | text UNIQUE          | public menu URL                        |
| is\_open         | boolean DEFAULT true | blocks ordering when false             |
| order\_sequence  | integer DEFAULT 0    | per-restaurant incremental counter     |
| settings         | jsonb                | delivery options, print template, etc. |

### restaurant\_users

| column         | type                              | notes |
| -------------- | --------------------------------- | ----- |
| id             | UUID PK                           |       |
| user\_id       | UUID REFERENCES auth.users(id)    |       |
| restaurant\_id | UUID REFERENCES restaurants(id)   |       |
| role           | enum('owner','manager','cashier') |       |

### categories

| column         | type                 |
| -------------- | -------------------- |
| id             | UUID                 |
| restaurant\_id | UUID                 |
| name           | text                 |
| position       | int                  |
| is\_active     | boolean DEFAULT true |

### menu\_items

| column         | type                 |                       |
| -------------- | -------------------- | --------------------- |
| id             | UUID                 |                       |
| restaurant\_id | UUID                 |                       |
| category\_id   | UUID                 |                       |
| name           | text                 |                       |
| description    | text                 |                       |
| price          | numeric(10,2)        |                       |
| is\_available  | boolean DEFAULT true |                       |
| modifiers      | jsonb                | optional sizes/extras |
| image\_path    | text                 | storage path          |

### orders

| column          | type                                                                                         | notes                               |
| --------------- | -------------------------------------------------------------------------------------------- | ----------------------------------- |
| id              | UUID PK                                                                                      |                                     |
| restaurant\_id  | UUID                                                                                         |                                     |
| display\_number | integer                                                                                      | assigned by DB (++order\_sequence)  |
| customer\_name  | text                                                                                         |                                     |
| type            | enum('dine\_in','takeaway','delivery')                                                       |                                     |
| customer\_note  | text                                                                                         | global order-level note (sanitized) |
| status          | enum('new','editing','awaiting\_payment','paid','preparing','ready','completed','cancelled') |                                     |
| is\_locked      | boolean DEFAULT false                                                                        | set true after payment              |
| expires\_at     | timestamptz                                                                                  | created\_at + INTERVAL '90 minutes' |
| deleted\_at     | timestamptz                                                                                  | soft-delete option for orders       |

### order\_items

| column      | type                            |                                 |
| ----------- | ------------------------------- | ------------------------------- |
| id          | UUID                            |                                 |
| order\_id   | UUID REFERENCES orders(id)      |                                 |
| item\_id    | UUID REFERENCES menu\_items(id) |                                 |
| qty         | integer                         |                                 |
| unit\_price | numeric(10,2)                   |                                 |
| notes       | text                            | item-level note (e.g. no onion) |

### payments

| column            | type                                  |
| ----------------- | ------------------------------------- |
| id                | UUID                                  |
| order\_id         | UUID                                  |
| method            | enum('cash','card')                   |
| received\_amount  | numeric(10,2)                         |
| change\_amount    | numeric(10,2)                         |
| cashier\_user\_id | UUID REFERENCES restaurant\_users(id) |
| created\_at       | timestamptz                           |

### order\_adjustments (audit)

| column            | type                                                         |
| ----------------- | ------------------------------------------------------------ |
| id                | UUID                                                         |
| order\_id         | UUID                                                         |
| action            | enum('add\_item','remove\_item','update\_item','edit\_note') |
| previous\_payload | jsonb                                                        |
| new\_payload      | jsonb                                                        |
| performed\_by     | UUID                                                         |
| created\_at       | timestamptz                                                  |

Notes:

- Totals are **always** calculated server-side as SUM(qty \* unit\_price) + taxes (if later) etc. The frontend must never be trusted for final totals.
- Use soft-delete `deleted_at` for orders/payments to preserve audit/accounting history.

---

## Row-Level Security & Policies

- Implement `is_restaurant_member(restaurant_id)` helper function that checks `restaurant_users` and `auth.uid()`.
- FORCE RLS on all tenant tables: `restaurants`, `menu_items`, `orders`, `order_items`, `payments`, `order_adjustments`.
- Policies examples:
  - `restaurants`: owner-only selects/updates for restaurant settings; public select for `slug` reads with restrictions.
  - `menu_items`: manager/owner access; public read for items where `is_available = true`.
  - `orders`: insert allowed via API route (server role performs check), selects allowed for related restaurant\_users.

Security rules must be added as migrations and tested with the RLS test cases in the verification checklist.

---

## API Surface (Contract)

All endpoints (except `/health` and public menu GET) require a Supabase JWT.

### Public

- `GET /r/{slug}` — public restaurant home
- `GET /r/{slug}/menu` — public menu JSON (includes categories/items)
- `POST /r/{slug}/orders` — create order (body: items, customer\_name, customer\_note, type)

### Authenticated (restaurant users)

- `GET /restaurants` — owner: list restaurants

- `POST /restaurants` — create restaurant

- `GET /restaurants/{id}` — owner/manager

- `PATCH /restaurants/{id}` — owner/manager

- `POST /restaurants/{id}/qr` — generate QR PNG/PDF

- `GET /restaurants/{id}/categories`

- `POST /restaurants/{id}/categories`

- `PATCH /restaurants/{id}/categories/{catId}`

- `DELETE /restaurants/{id}/categories/{catId}`

- `GET /restaurants/{id}/menu_items`

- `POST /restaurants/{id}/menu_items`

- `PATCH /restaurants/{id}/menu_items/{itemId}`

- `DELETE /restaurants/{id}/menu_items/{itemId}`

- `GET /restaurants/{id}/orders?status=...` — cashier/manager view (realtime subscription recommended)

- `PATCH /restaurants/{id}/orders/{orderId}` — cashier edits order (only if is\_locked = false)

- `POST /restaurants/{id}/orders/{orderId}/pay` — record payment (cash/card) & lock

- `POST /restaurants/{id}/orders/{orderId}/print` — returns printable page or triggers PDF generation

- `POST /restaurants/{id}/orders/{orderId}/extend-expiry` — extend by 15 minutes (cashier)

- `POST /restaurants/{id}/orders/{orderId}/cancel` — cancel order

- `POST /restaurants/{id}/orders/{orderId}/complete` — mark completed

### Admin (platform\_admin)

- `GET /admin/stats` — basic platform metrics

---

## Customer & Cashier UX Flows (detailed)

### Customer Flow (mobile)

1. Scan QR or open `https://.../r/{slug}`.
2. Browse categories and menu items.
3. For each item, optional item-level note (e.g. "no onions").
4. Proceed to checkout: fill `What should we call you?` and choose `Dine in / Takeaway / Delivery`.
5. Optional global order note (sanitized, max 500 chars).
6. Submit -> receives `display_number` and success screen with a Quick WhatsApp button if Delivery was selected.

WhatsApp button uses a prefilled message (example):

```
https://wa.me/<whatsapp_number>?text=Hello%2C%20this%20is%20order%20%23{display_number}%20for%20{restaurant_name}%20-%20please%20confirm%20and%20share%20your%20location.
```

When clicked it should open the user's WhatsApp with the message pre-filled (the message MUST include the order number). The system should prefer wa.me links for MVP.

### Cashier Flow

- Receives realtime notification (sound + visual) for new orders.
- Order card shows: display\_number, customer\_name, type, items with item-notes, global note, created\_at.
- Buttons initially: Select Payment Method (Cash / Card) — Print — Confirm are disabled until cashier selects payment method.
- Cash flow: open small modal to input `received_amount` — system calculates `change_amount` and shows it. When cashier confirms payment:
  - Payment row is created in `payments`.
  - `is_locked` is set to true for order.
  - Print is enabled and `Confirm` finalizes the order (moves to `awaiting_payment`->`paid` transition as appropriate).
- Edit flow: if cashier needs to change items before payment, `Edit` opens an editor allowing add/remove/update item (backend recalculates totals and writes to `order_adjustments`).

---

## Printing & WhatsApp Integration Details

### Printing (MVP)

- Implement a printable route `/print/order/{orderId}` that renders a print-optimized invoice.
- Use CSS tailored for 80mm thermal printers (e.g., `@page { size: 80mm auto; margin: 0; }`).
- Use `window.print()` to open the browser print dialog; user chooses the thermal printer.
- Invoice must include cashier name, payment details, item-level notes, and global note.
- Use the standard print approach; do not attempt automatic printer detection in browser (security limits).

### WhatsApp Verification (Delivery)

- Use `wa.me` prefilled link to let customer message the restaurant with the order number to confirm his order and in the same time to send his location.
- Message template must be assembled server-side (or in a route) and URL-encoded.
- Later: upgrade path to WhatsApp Business API for automated confirmations.

---

## Order Editing, Locking & Audit Trail

Rules:

- Edits allowed only when `is_locked = false`.
- After payment (`payments` entry exists), set `is_locked = true`.
- All edits must be recorded in `order_adjustments` with previous/new payloads and `performed_by`.
- All totals are recomputed server-side on each change.
- The cashier UI must show history of adjustments for the order.

Edge cases:

- If two cashiers edit simultaneously, apply last-write-wins with warning and record conflicts in the audit log. Preferably implement a quick optimistic locking token (e.g., `updated_at` check) before applying changes.

---

## Order Expiration Logic (90-minute rule)

- When creating an order, set `expires_at = now() + interval '90 minutes'`.
- Background scheduler (or Supabase cron/task) checks for orders where `status = 'new' OR 'awaiting_payment'` and `expires_at <= now()`.
- For each expiring order, do:
  - Push a realtime notification to the cashier interface: "Order #X will be cancelled in 0 minutes — Cancel / Extend 15 min".
  - If cashier clicks **Extend**, `expires_at += interval '15 minutes'` and record adjustment.
  - If cashier clicks **Cancel**, set `status = 'cancelled'`, record audit, and remove from active queue.

UI requirement: visible countdown or flags for orders that are within the final 10 minutes.

---

## Spec Kit & AI Agent Workflow

We will use the GitHub Spec Kit repo pattern. You said you'll operate the Spec Kit manually; I will produce Spec Kit–friendly artifacts.

### Commands you will use in the repo

- `/speckit.specify` — detailed feature spec (I will produce these snippets below)
- `/speckit.plan` — task plan per phase (I'll output tables)
- `/speckit.clarify` — open questions and edge cases

### AI Agent Rules (enforced in PRs)

1. **Never** include `SUPABASE_SERVICE_ROLE_KEY` or any secret in client code or PRs.
2. All DB writes must include `restaurant_id` and be validated server-side.
3. Totals & pricing must be computed server-side on authoritative API routes.
4. RLS must be present in migrations and tested by automated tests.
5. Agents must add unit tests for any logic that mutates orders (editing, payments, expiry).
6. Agents must include acceptance tests for the 90-minute expiry flow and extend path.
7. Agents must produce a short `README.md` for the feature they implement with `how to test` steps.

Example spec invocation you'll paste to Spec Kit (feature: order creation):

```
/speckit.specify
Title: Public order creation
Description: Customer submits an order via public menu. Server validates availability, creates order with display_number, sets expires_at = now()+90m.
Acceptance Criteria:
 - POST /r/{slug}/orders returns 201 and display_number
 - order appears in Supabase orders table with status='new'
 - expires_at set correctly
 - realtime push delivered to cashier
```

---

## Env & Deployment

**Frontend (.env)**

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_API_URL=/api
NEXT_PUBLIC_PLATFORM_NAME=Restova
```

**Backend / Server (.env) — server-only**

```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=   # server-only, do not commit
SUPABASE_ANON_KEY=
JWT_SECRET=
SENTRY_DSN=
ADMIN_EMAILS=admin@restova.example
STORAGE_BUCKET=restaurant-assets
```

**Deployment**

- Frontend & API: deploy to entity["organization","Vercel","deployment platform"].
- DB/Auth/Storage: hosted on entity["organization","Supabase","backend platform"].

Optional:

- Add entity["organization","Cloudflare","web infrastructure"] in front of Vercel for WAF, bot protection and advanced routing once traffic grows.

---

## Phased Build Plan (detailed tables)

### Phase 0 — Setup & Foundations (1 week)

| Task                 | Owner               | Success Criteria                                            |
| -------------------- | ------------------- | ----------------------------------------------------------- |
| Repo init & Spec Kit | Supervisor / GitHub | Repo + Spec Kit ready (`/speckit.specify` sample committed) |
| Supabase project     | Backend             | Auth, DB, Storage created                                   |
| Vercel project       | Frontend            | Next.js deployed `Hello world`                              |
| Basic env & secrets  | DevOps              | Service role stored in Vault; env examples added            |

### Phase 1 — Core Data & Auth (1 week)

| Task             | Owner    | Success Criteria                                                        |
| ---------------- | -------- | ----------------------------------------------------------------------- |
| DB migrations    | Backend  | Tables: restaurants, users, menu, orders, payments, adjustments created |
| RLS policies     | Backend  | is\_restaurant\_member() implemented; RLS forced on tables              |
| Auth integration | Frontend | Supabase auth flow (signup/login) works                                 |
| Role seeding     | Backend  | Create sample owner/manager/cashier users for testing                   |

### Phase 2 — Menu Management & QR (1 week)

| Task            | Owner            | Success Criteria                                             |
| --------------- | ---------------- | ------------------------------------------------------------ |
| Category CRUD   | Frontend/Backend | Manager can create/edit/delete categories                    |
| Menu items CRUD | Frontend/Backend | Manager can manage items & images (Supabase Storage)         |
| Public menu     | Frontend         | Public menu renders by slug, respects is\_open/is\_available |
| QR generator    | Backend          | Generate downloadable PNG & PDF QR pointing to public menu   |

### Phase 3 — Ordering & Realtime (2 weeks)

| Task                | Owner            | Success Criteria                                             |
| ------------------- | ---------------- | ------------------------------------------------------------ |
| Public order create | Frontend/Backend | POST /r/{slug}/orders creates order, returns display\_number |
| Realtime push       | Backend          | New order appears in cashier dashboard instantly             |
| Order numbering     | Backend          | display\_number increments atomically per restaurant         |
| Customer notes      | Frontend         | Item-level notes + global note saved                         |
| Validation          | Backend          | item availability enforced; total computed server-side       |

### Phase 4 — Cashier Workflow & Editing (2 weeks)

| Task              | Owner            | Success Criteria                                                     |
| ----------------- | ---------------- | -------------------------------------------------------------------- |
| Cashier dashboard | Frontend         | Lists active orders with notifications                               |
| Manual editing    | Frontend/Backend | Cashier can add/remove/update order items; order\_adjustments logged |
| Payment recording | Backend          | POST pay records payment and sets is\_locked=true                    |
| Lock & complete   | Backend          | After payment editing disabled; complete removes from active list    |
| Printing          | Frontend         | Print page renders & window\.print() works with sample data          |

### Phase 5 — Expiry & Operational Features (1 week)

| Task             | Owner            | Success Criteria                                 |
| ---------------- | ---------------- | ------------------------------------------------ |
| Expiry scheduler | Backend          | Orders expiring within 90 minutes notify cashier |
| Extend flow      | Frontend/Backend | Cashier can extend 15 minutes; audit recorded    |
| Cancel flow      | Backend          | Cancellation workflow implemented & logged       |

### Phase 6 — Stabilize, Testing & Hardening (2 weeks)

| Task              | Owner   | Success Criteria                                      |
| ----------------- | ------- | ----------------------------------------------------- |
| RLS testing       | Backend | Tests proving cross-tenant access is blocked          |
| Load tests        | DevOps  | Order creation throughput tested to expected baseline |
| Indexes & queries | Backend | Slow queries optimized, indexes added                 |
| Monitoring        | DevOps  | Sentry + basic metrics alerts configured              |

### Phase 7 — Launch & Post-launch (ongoing)

| Task             | Owner      | Success Criteria                                                 |
| ---------------- | ---------- | ---------------------------------------------------------------- |
| Beta rollout     | Product    | First 10 restaurants onboarded                                   |
| Feedback loop    | Product    | Issues triaged; hotfixes deployed                                |
| Roadmap planning | Supervisor | Prioritize Kitchen screen, analytics, Cloudflare, Electron agent |

---

## File Structure & Migrations

```
/ (mono-repo)
├── frontend/ (Next.js, App Router)
│   ├── app/
│   ├── components/
│   ├── lib/supabase.ts
│   └── styles/print.css
├── backend/ (server-only route handlers if needed)
│   ├── api/
│   └── jobs/
├── infra/
│   └── supabase/migrations/
├── docs/
│   └── runbook.md
└── specs/ (speckit artifacts)
```

Migrations should be versioned and include RLS policy SQL files.

---

## Verification Checklist & Acceptance Criteria

### Basic acceptance

-

### Security & Data integrity

-

---

## Non-functional Requirements & Scaling Roadmap

- Realtime latency target: < 1s for order delivery to cashier.
- Order create latency target: < 200ms under normal load.
- Design for 500+ restaurants: add caching/redis and job workers when needed.
- Optional Cloudflare adoption when traffic or attack-surface grows.

---

## Appendix: Snippets & Examples

### WhatsApp prefilled link (example template)

```
https://wa.me/{{whatsapp_number}}?text={{url_encoded_message}}
```

Message example:

```
Hello, this is order #{{display_number}} for {{restaurant_name}} — please confirm and share your location so delivery can be arranged.
```

### Print trigger (frontend)

```javascript
// opens print dialog for the current printable route
function openPrint() {
  window.print();
}
```

### Server-side total calculation (pseudo)

```sql
SELECT SUM(q.qty * q.unit_price) as subtotal
FROM order_items q
WHERE q.order_id = :order_id;
```

### Order expiry SQL (cron example)

```sql
-- find expired orders
SELECT id FROM orders WHERE status IN ('new','awaiting_payment') AND expires_at <= now();
```

---

## Final notes (Supervisor)

- Use the Spec Kit commands and the Spec sections I will generate next to produce `/speckit.specify` files for each Phase task.
- I will supervise AI agents: ensure each PR contains tests, migration SQL, and a short README with steps to test the feature.
- Keep secrets in Vault and never surface them in PRs or code.

If you want, I will now:

1. Generate a set of `/speckit.specify` feature specs for Phase 1–3 (ready to paste into Spec Kit).
2. Or generate the SQL migrations for the DB schema above (ready to run on Supabase).

Which do you want next?

