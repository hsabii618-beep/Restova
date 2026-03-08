# Research: Phase 1 - Database foundations and RLS perimeter

## Decisions

### 1. `is_restaurant_member()` Implementation
- **Decision**: Joins against `restaurant_users` table using `auth.uid()`.
- **Rationale**: Standard Supabase pattern. Function will be `SECURITY DEFINER` to allow RLS evaluation without circular dependencies.

### 2. RLS Verification Strategy
- **Decision**: Query `pg_class` system catalog for `relrowsecurity` and `relforcerowsecurity`.
- **Rationale**: Most accurate way to verify database-level enforcement status.

### 3. Automated Isolation Test
- **Decision**: SQL script at `supabase/tests/sql/isolation_test.sql`.
- **Rationale**: Keeps database tests co-located with the `infra/` boundary while resolving file organization conflicts. Uses `SET ROLE` to simulate JWT-based auth.

## RLS/FORCE RLS Plan per Table (Phase 1: Members Only)

| Table | RLS Mandatory | FORCE RLS | Phase 1 Policy Summary |
|-------|---------------|-----------|------------------------|
| `restaurants` | Yes | Yes | Members-only (Read/Update). *Public Slug Read: Phase 2.* |
| `restaurant_users` | Yes | Yes | Members-only (Read members of same restaurant). |
| `categories` | Yes | Yes | Members-only. *Public Read: Phase 2.* |
| `menu_items` | Yes | Yes | Members-only. *Public Read: Phase 2.* |
| `orders` | Yes | Yes | Members-only. *Public Creation: Phase 2.* |
| `order_items` | Yes | Yes | Members-only. |
| `payments` | Yes | Yes | Members-only. |
| `order_adjustments` | Yes | Yes | Members-only. |

## Required Indexes Plan

- `orders(restaurant_id, status, created_at DESC)`: Active order dashboard performance.
- `orders(restaurant_id, expires_at)`: Expiry worker efficiency.
- `order_items(order_id)`: Order detail lookup.
- `restaurant_users(user_id, restaurant_id)`: RLS evaluation performance.
- `menu_items(restaurant_id, category_id)`: Categorized menu rendering.
