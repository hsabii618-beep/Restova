# Quickstart: Phase 1 - Database foundations and RLS perimeter

## Environment Setup
1. Create a new project in Supabase.
2. Ensure you have the Supabase CLI installed locally.
3. Login to Supabase CLI: `supabase login`.
4. Initialize your local repository: `supabase init`.

## Local Development & Migrations
1. Link your local project to the remote Supabase project: `supabase link --project-ref <your-project-ref>`.
2. Apply migrations locally: `supabase db reset`.
3. Verify migrations locally: `supabase db diff`.

## Verification Steps
1. **Apply Migrations**:
   Run the migration scripts in `infra/supabase/migrations/` in order.
2. **Verify RLS**:
   Run the following query to ensure RLS and FORCE RLS are enabled for all tenant tables:
   ```sql
   SELECT tablename, rowsecurity, (SELECT force_row_security FROM pg_tables pt WHERE pt.tablename = t.tablename) as force_rls
   FROM pg_tables t
   WHERE schemaname = 'public' AND tablename IN ('restaurants', 'restaurant_users', 'categories', 'menu_items', 'orders', 'order_items', 'payments', 'order_adjustments');
   ```
   All rows must show `true` for both `rowsecurity` and `force_rls`.
3. **Run Isolation Test**:
   Execute the `isolation_test.sql` script (to be created in `tests/sql/`) using the Supabase SQL Editor.
