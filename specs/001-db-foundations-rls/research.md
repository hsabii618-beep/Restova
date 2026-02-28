# Research: Phase 1 - Database foundations and RLS perimeter

## Decisions

### 1. `is_restaurant_member()` Implementation
- **Decision**: Simple join against `restaurant_users` table using `auth.uid()`.
- **Rationale**: Supabase RLS is highly optimized for this pattern. For further optimization, we can use a security definer function to avoid recursive RLS issues.
- **Alternatives**: Using a custom JWT claim (`app_metadata`) would be faster but more complex to sync when a user's role changes. Join is more reliable for MVP.

### 2. RLS Verification Strategy
- **Decision**: SQL-based verification querying `pg_tables` and `pg_policy`.
- **Rationale**: Ensures `rowsecurity` is `true` for all tables in the `public` schema (excluding system tables).
- **Alternatives**: Manual check (unreliable).

### 3. Automated Isolation Test
- **Decision**: A standalone SQL script using `SET ROLE` and `set_config('request.jwt.claims', ...)` to simulate different users.
- **Rationale**: Allows testing without external dependencies (no Node.js needed for DB-only phase). It can be executed via `psql` or Supabase SQL Editor.
- **Alternatives**: `pgTAP` (adds a dependency/schema to the DB); Node.js scripts (requires environment setup).

## RLS/FORCE RLS Plan per Table

| Table | RLS Mandatory | FORCE RLS | Policy Summary |
|-------|---------------|-----------|----------------|
| `restaurants` | Yes | Yes | Public can see slug; Owner/Manager can update. |
| `restaurant_users` | Yes | Yes | Members can see fellow members; Owner can manage. |
| `categories` | Yes | Yes | Public read; Manager/Owner manage. |
| `menu_items` | Yes | Yes | Public read; Manager/Owner manage. |
| `orders` | Yes | Yes | Creator (anon if allowed) or Restaurant Member access. |
| `order_items` | Yes | Yes | Cascade from `orders` or direct member access. |
| `payments` | Yes | Yes | Members only. |
| `order_adjustments` | Yes | Yes | Members only. |

## Required Indexes Plan

- `orders(restaurant_id, status, created_at DESC)`: For active order lists.
- `orders(restaurant_id, expires_at)`: For expiry cron.
- `order_items(order_id)`: For order lookups.
- `restaurant_users(user_id, restaurant_id)`: For authentication/RLS performance.
- `menu_items(restaurant_id, category_id)`: For menu rendering.
