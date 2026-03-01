-- 20260301000200_fix_schema_reconciliation.sql

-- 1. Remove references to restaurant_users in payments
ALTER TABLE public.payments 
DROP CONSTRAINT IF EXISTS payments_cashier_user_id_fkey;

-- 2. Drop restaurant_users table
DROP TABLE IF EXISTS public.restaurant_users CASCADE;

-- 3. Update security helpers to use owner_id on restaurants
CREATE OR REPLACE FUNCTION public.is_restaurant_member(p_restaurant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.restaurants r
    WHERE r.id = p_restaurant_id
      AND r.owner_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_restaurant_manager_or_owner(p_restaurant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.restaurants r
    WHERE r.id = p_restaurant_id
      AND r.owner_id = auth.uid()
  );
$$;

-- 4. Re-link payments to auth.users
ALTER TABLE public.payments 
ADD CONSTRAINT payments_cashier_user_id_fkey FOREIGN KEY (cashier_user_id) REFERENCES auth.users(id);
