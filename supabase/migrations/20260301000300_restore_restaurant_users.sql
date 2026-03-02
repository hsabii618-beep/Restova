CREATE TABLE IF NOT EXISTS public.restaurant_users (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  role public.user_role NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, restaurant_id)
);

ALTER TABLE public.restaurant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_users FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view restaurant users" ON public.restaurant_users;
CREATE POLICY "Members can view restaurant users"
ON public.restaurant_users
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.restaurant_users ru
    WHERE ru.restaurant_id = public.restaurant_users.restaurant_id
      AND ru.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Managers/Owners can manage restaurant users" ON public.restaurant_users;
CREATE POLICY "Managers/Owners can manage restaurant users"
ON public.restaurant_users
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.restaurant_users ru
    WHERE ru.restaurant_id = public.restaurant_users.restaurant_id
      AND ru.user_id = auth.uid()
      AND ru.role IN ('owner', 'manager')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.restaurant_users ru
    WHERE ru.restaurant_id = public.restaurant_users.restaurant_id
      AND ru.user_id = auth.uid()
      AND ru.role IN ('owner', 'manager')
  )
);

CREATE INDEX IF NOT EXISTS idx_restaurant_users_user_restaurant
ON public.restaurant_users (user_id, restaurant_id);

ALTER TABLE public.payments
DROP CONSTRAINT IF EXISTS payments_cashier_user_id_fkey;

ALTER TABLE public.payments
ADD CONSTRAINT payments_cashier_user_id_fkey
FOREIGN KEY (cashier_user_id) REFERENCES public.restaurant_users(id);

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

CREATE OR REPLACE FUNCTION public.is_restaurant_manager_or_owner(p_restaurant_id uuid)
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
      AND ru.role IN ('owner', 'manager')
  );
$$;
