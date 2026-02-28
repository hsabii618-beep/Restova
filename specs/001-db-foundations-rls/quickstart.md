# Quickstart: Phase 1 - Database foundations and RLS perimeter

## Environment Setup
1. Create a new project in Supabase.
2. Initialize local repository: `supabase init`.

## Local Development & Migrations
1. Link project: `supabase link --project-ref <your-project-ref>`.
2. Apply migrations: `supabase db reset`.

## Verification Steps

### 1. Verify RLS & FORCE RLS Enforcement
Run the following query in the Supabase SQL Editor to ensure all tenant tables are strictly secured:

```sql
SELECT 
    relname as tablename, 
    relrowsecurity as rls_enabled, 
    relforcerowsecurity as force_rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' 
AND relname IN (
    'restaurants', 'restaurant_users', 'categories', 'menu_items', 
    'orders', 'order_items', 'payments', 'order_adjustments'
);
```
**Success Criteria**: All rows MUST show `t` (true) for both `rls_enabled` and `force_rls_enabled`.

### 2. Run Isolation Tests
Execute the isolation test suite to verify multi-tenant boundaries:

```bash
# Path to isolation test
# infra/supabase/tests/sql/isolation_test.sql
```

1. Open `infra/supabase/tests/sql/isolation_test.sql`.
2. Copy the content into the Supabase SQL Editor.
3. Run and verify that all "Pass" assertions are met and cross-tenant queries return 0 rows.
