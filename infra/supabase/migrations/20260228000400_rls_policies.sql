-- 20260228000400_rls_policies.sql
-- Enable RLS and FORCE RLS on all tenant tables and define members-only policies

-- Function to help with order_items RLS as it doesn't have restaurant_id directly
CREATE OR REPLACE FUNCTION public.can_access_order(order_id uuid)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.orders
        WHERE orders.id = can_access_order.order_id
        AND public.is_restaurant_member(orders.restaurant_id)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. restaurants
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurants FORCE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their restaurant"
    ON public.restaurants
    FOR SELECT
    USING (public.is_restaurant_member(id));

CREATE POLICY "Members can update their restaurant"
    ON public.restaurants
    FOR UPDATE
    USING (public.is_restaurant_member(id));

-- 2. restaurant_users
ALTER TABLE public.restaurant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_users FORCE ROW LEVEL SECURITY;

CREATE POLICY "Members can view restaurant users"
    ON public.restaurant_users
    FOR SELECT
    USING (public.is_restaurant_member(restaurant_id));

CREATE POLICY "Owners can manage restaurant users"
    ON public.restaurant_users
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.restaurant_users ru
            WHERE ru.restaurant_id = public.restaurant_users.restaurant_id
            AND ru.user_id = auth.uid()
            AND ru.role = 'owner'
        )
    );

-- 3. categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories FORCE ROW LEVEL SECURITY;

CREATE POLICY "Members can manage categories"
    ON public.categories
    FOR ALL
    USING (public.is_restaurant_member(restaurant_id));

-- 4. menu_items
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items FORCE ROW LEVEL SECURITY;

CREATE POLICY "Members can manage menu items"
    ON public.menu_items
    FOR ALL
    USING (public.is_restaurant_member(restaurant_id));

-- 5. orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders FORCE ROW LEVEL SECURITY;

CREATE POLICY "Members can manage orders"
    ON public.orders
    FOR ALL
    USING (public.is_restaurant_member(restaurant_id));

-- 6. order_items
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items FORCE ROW LEVEL SECURITY;

CREATE POLICY "Members can manage order items"
    ON public.order_items
    FOR ALL
    USING (public.can_access_order(order_id));

-- 7. payments
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments FORCE ROW LEVEL SECURITY;

CREATE POLICY "Members can view payments"
    ON public.payments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.orders
            WHERE orders.id = public.payments.order_id
            AND public.is_restaurant_member(orders.restaurant_id)
        )
    );

CREATE POLICY "Members can insert payments"
    ON public.payments
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.orders
            WHERE orders.id = public.payments.order_id
            AND public.is_restaurant_member(orders.restaurant_id)
        )
    );

-- 8. order_adjustments
ALTER TABLE public.order_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_adjustments FORCE ROW LEVEL SECURITY;

CREATE POLICY "Members can view adjustments"
    ON public.order_adjustments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.orders
            WHERE orders.id = public.order_adjustments.order_id
            AND public.is_restaurant_member(orders.restaurant_id)
        )
    );

CREATE POLICY "Members can insert adjustments"
    ON public.order_adjustments
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.orders
            WHERE orders.id = public.order_adjustments.order_id
            AND public.is_restaurant_member(orders.restaurant_id)
        )
    );
