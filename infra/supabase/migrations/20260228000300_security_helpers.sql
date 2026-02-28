-- 20260228000300_security_helpers.sql
-- Create security helper functions for RLS

CREATE OR REPLACE FUNCTION public.is_restaurant_member(p_restaurant_id uuid)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.restaurant_users
        WHERE restaurant_users.restaurant_id = p_restaurant_id
        AND restaurant_users.user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;
