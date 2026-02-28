-- 20260228000400_rls_policies.sql
-- Enable RLS and FORCE RLS on all tenant tables and define members-only policies

-- Function to help with order_items RLS as it doesn't have restaurant_id directly
CREATE OR REPLACE FUNCTION public.can_access_order(p_order_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.orders o
        WHERE o.id = p_order_id
          AND public.is_restaurant_member(o.restaurant_id)
    );
END;
$$;

-- Function to help with role-based RLS
CREATE OR REPLACE FUNCTION public.is_restaurant_manager_or_owner(p_restaurant_id uuid)
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
          AND ru.role IN ('owner', 'manager')
    );
END;
$$;

-- 1. restaurants
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurants FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view their restaurant" ON public.restaurants;
CREATE POLICY "Members can view their restaurant"
    ON public.restaurants
    FOR SELECT
    USING (public.is_restaurant_member(id));

DROP POLICY IF EXISTS "Managers/Owners can update their restaurant" ON public.restaurants;
CREATE POLICY "Managers/Owners can update their restaurant"
    ON public.restaurants
    FOR UPDATE
    USING (public.is_restaurant_manager_or_owner(id));

-- 2. restaurant_users
ALTER TABLE public.restaurant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_users FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view restaurant users" ON public.restaurant_users;
CREATE POLICY "Members can view restaurant users"
    ON public.restaurant_users
    FOR SELECT
    USING (public.is_restaurant_member(restaurant_id));

DROP POLICY IF EXISTS "Managers/Owners can manage restaurant users" ON public.restaurant_users;
CREATE POLICY "Managers/Owners can manage restaurant users"
    ON public.restaurant_users
    FOR ALL
    USING (public.is_restaurant_manager_or_owner(restaurant_id))
    WITH CHECK (public.is_restaurant_manager_or_owner(restaurant_id));

-- 3. categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can manage categories" ON public.categories;
CREATE POLICY "Members can manage categories"
    ON public.categories
    FOR ALL
    USING (public.is_restaurant_member(restaurant_id))
    WITH CHECK (public.is_restaurant_member(restaurant_id));

-- 4. menu_items
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can manage menu items" ON public.menu_items;
CREATE POLICY "Members can manage menu items"
    ON public.menu_items
    FOR ALL
    USING (public.is_restaurant_member(restaurant_id))
    WITH CHECK (public.is_restaurant_member(restaurant_id));

-- 5. orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can manage orders" ON public.orders;
CREATE POLICY "Members can manage orders"
    ON public.orders
    FOR ALL
    USING (public.is_restaurant_member(restaurant_id))
    WITH CHECK (public.is_restaurant_member(restaurant_id));

-- 6. order_items
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can manage order items" ON public.order_items;
CREATE POLICY "Members can manage order items"
    ON public.order_items
    FOR ALL
    USING (public.can_access_order(order_id))
    WITH CHECK (public.can_access_order(order_id));

-- 7. payments
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view payments" ON public.payments;
CREATE POLICY "Members can view payments"
    ON public.payments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM public.orders o
            WHERE o.id = public.payments.order_id
              AND public.is_restaurant_member(o.restaurant_id)
        )
    );

DROP POLICY IF EXISTS "Members can insert payments" ON public.payments;
CREATE POLICY "Members can insert payments"
    ON public.payments
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.orders o
            WHERE o.id = public.payments.order_id
              AND public.is_restaurant_member(o.restaurant_id)
        )
    );

-- 8. order_adjustments
ALTER TABLE public.order_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_adjustments FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view adjustments" ON public.order_adjustments;
CREATE POLICY "Members can view adjustments"
    ON public.order_adjustments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM public.orders o
            WHERE o.id = public.order_adjustments.order_id
              AND public.is_restaurant_member(o.restaurant_id)
        )
    );

DROP POLICY IF EXISTS "Members can insert adjustments" ON public.order_adjustments;
CREATE POLICY "Members can insert adjustments"
    ON public.order_adjustments
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.orders o
            WHERE o.id = public.order_adjustments.order_id
              AND public.is_restaurant_member(o.restaurant_id)
        )
    );