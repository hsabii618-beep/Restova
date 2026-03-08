-- 20260307000100_fix_restaurant_users_rls_loop.sql

-- 1. Redefine is_restaurant_member as plpgsql so it cannot be inlined by the query planner,
-- ensuring the SECURITY DEFINER context is strictly respected to avoid infinite recursion.
CREATE OR REPLACE FUNCTION public.is_restaurant_member(p_restaurant_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.restaurant_users ru
    WHERE ru.restaurant_id = p_restaurant_id
      AND ru.user_id = auth.uid()
  );
END;
$$;

-- 2. Drop the recursive inline policies that were accidentally introduced in 20260301000300
DROP POLICY IF EXISTS "Members can view restaurant users" ON public.restaurant_users;
DROP POLICY IF EXISTS "Managers/Owners can manage restaurant users" ON public.restaurant_users;

-- 3. Recreate the policies using the plpgsql functions
CREATE POLICY "Members can view restaurant users"
    ON public.restaurant_users
    FOR SELECT
    USING (public.is_restaurant_member(restaurant_id));

CREATE POLICY "Managers/Owners can manage restaurant users"
    ON public.restaurant_users
    FOR ALL
    USING (public.is_restaurant_manager_or_owner(restaurant_id))
    WITH CHECK (public.is_restaurant_manager_or_owner(restaurant_id));
