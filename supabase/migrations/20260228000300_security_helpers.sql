-- 20260228000300_security_helpers.sql
-- Create security helper functions for RLS

CREATE OR REPLACE FUNCTION public.is_restaurant_member(p_restaurant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.restaurant_users ru
    WHERE ru.restaurant_id = p_restaurant_id
      AND ru.user_id = auth.uid()
  );
$$;