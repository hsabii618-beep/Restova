-- 20260228000500_performance_indexes.sql
-- Create required architectural indexes for performance

-- Orders performance
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_status_created 
    ON public.orders (restaurant_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_restaurant_expires 
    ON public.orders (restaurant_id, expires_at);

-- Order items lookup
CREATE INDEX IF NOT EXISTS idx_order_items_order_id 
    ON public.order_items (order_id);

-- Auth and RLS performance
CREATE INDEX IF NOT EXISTS idx_restaurant_users_user_restaurant 
    ON public.restaurant_users (user_id, restaurant_id);

-- Menu rendering performance
CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant_category 
    ON public.menu_items (restaurant_id, category_id);
