-- 20260301000100_add_owner_id_to_restaurants.sql
-- Add owner_id to restaurants table as expected by the application code

ALTER TABLE public.restaurants 
ADD COLUMN owner_id uuid REFERENCES auth.users(id);

-- Update RLS policies to use owner_id as well (as backup or transition)
-- Note: the current policies in 20260228000400_rls_policies.sql use is_restaurant_member(id)
-- which relies on restaurant_users table.
