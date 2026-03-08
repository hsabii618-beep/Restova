-- 20260307000000_update_rls_active_restaurant_check.sql
-- Enforce that write actions require the restaurant to be active and not deleted.

-- 1. Redefine is_restaurant_manager_or_owner to also require active restaurant
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
        JOIN public.restaurants r ON r.id = ru.restaurant_id
        WHERE ru.restaurant_id = p_restaurant_id
          AND ru.user_id = auth.uid()
          AND ru.role IN ('owner', 'manager')
          AND r.is_active = true
          AND r.deleted_at IS NULL
    );
END;
$$;

-- 2. Create is_active_restaurant_member for broad write access checks
CREATE OR REPLACE FUNCTION public.is_active_restaurant_member(p_restaurant_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.restaurant_users ru
        JOIN public.restaurants r ON r.id = ru.restaurant_id
        WHERE ru.restaurant_id = p_restaurant_id
          AND ru.user_id = auth.uid()
          AND r.is_active = true
          AND r.deleted_at IS NULL
    );
END;
$$;

-- 3. Create can_write_order for order_items check
CREATE OR REPLACE FUNCTION public.can_write_order(p_order_id uuid)
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
          AND public.is_active_restaurant_member(o.restaurant_id)
    );
END;
$$;

-- 4. Update Policies for Categories
DROP POLICY IF EXISTS "Members can manage categories" ON public.categories;
CREATE POLICY "Members can view categories"
    ON public.categories
    FOR SELECT
    USING (public.is_restaurant_member(restaurant_id));
CREATE POLICY "Active members can manage categories"
    ON public.categories
    FOR ALL
    USING (public.is_active_restaurant_member(restaurant_id))
    WITH CHECK (public.is_active_restaurant_member(restaurant_id));

-- 5. Update Policies for Menu Items
DROP POLICY IF EXISTS "Members can manage menu items" ON public.menu_items;
CREATE POLICY "Members can view menu items"
    ON public.menu_items
    FOR SELECT
    USING (public.is_restaurant_member(restaurant_id));
CREATE POLICY "Active members can manage menu items"
    ON public.menu_items
    FOR ALL
    USING (public.is_active_restaurant_member(restaurant_id))
    WITH CHECK (public.is_active_restaurant_member(restaurant_id));

-- 6. Update Policies for Orders
DROP POLICY IF EXISTS "Members can manage orders" ON public.orders;
CREATE POLICY "Members can view orders"
    ON public.orders
    FOR SELECT
    USING (public.is_restaurant_member(restaurant_id));
CREATE POLICY "Active members can manage orders"
    ON public.orders
    FOR ALL
    USING (public.is_active_restaurant_member(restaurant_id))
    WITH CHECK (public.is_active_restaurant_member(restaurant_id));

-- 7. Update Policies for Order Items
DROP POLICY IF EXISTS "Members can manage order items" ON public.order_items;
CREATE POLICY "Members can view order items"
    ON public.order_items
    FOR SELECT
    USING (public.can_access_order(order_id));
CREATE POLICY "Active members can manage order items"
    ON public.order_items
    FOR ALL
    USING (public.can_write_order(order_id))
    WITH CHECK (public.can_write_order(order_id));

-- 8. Update Policies for Payments
DROP POLICY IF EXISTS "Members can insert payments" ON public.payments;
CREATE POLICY "Active members can insert payments"
    ON public.payments
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.orders o
            WHERE o.id = public.payments.order_id
              AND public.is_active_restaurant_member(o.restaurant_id)
        )
    );

-- 9. Update Policies for Order Adjustments
DROP POLICY IF EXISTS "Members can insert adjustments" ON public.order_adjustments;
CREATE POLICY "Active members can insert adjustments"
    ON public.order_adjustments
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.orders o
            WHERE o.id = public.order_adjustments.order_id
              AND public.is_active_restaurant_member(o.restaurant_id)
        )
    );
