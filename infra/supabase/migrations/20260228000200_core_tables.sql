-- 20260228000200_core_tables.sql
-- Create core tables for the Restova database

-- restaurants
CREATE TABLE public.restaurants (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid,
    name text NOT NULL,
    slug text UNIQUE NOT NULL,
    is_open boolean DEFAULT true NOT NULL,
    order_sequence integer DEFAULT 0 NOT NULL,
    settings jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- restaurant_users
CREATE TABLE public.restaurant_users (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    role public.user_role NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    UNIQUE(user_id, restaurant_id)
);

-- categories
CREATE TABLE public.categories (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    name text NOT NULL,
    position integer NOT NULL DEFAULT 0,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- menu_items
CREATE TABLE public.menu_items (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    price numeric(10,2) NOT NULL,
    is_available boolean DEFAULT true NOT NULL,
    modifiers jsonb DEFAULT '{}'::jsonb NOT NULL,
    image_path text,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- orders
CREATE TABLE public.orders (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    display_number integer NOT NULL,
    customer_name text NOT NULL,
    type public.order_type NOT NULL,
    customer_note text,
    status public.order_status NOT NULL DEFAULT 'new',
    is_locked boolean DEFAULT false NOT NULL,
    expires_at timestamptz NOT NULL,
    deleted_at timestamptz,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- order_items
CREATE TABLE public.order_items (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    -- Patch: item_id is nullable to support 'ON DELETE SET NULL' which preserves history
    item_id uuid REFERENCES public.menu_items(id) ON DELETE SET NULL,
    qty integer NOT NULL DEFAULT 1,
    unit_price numeric(10,2) NOT NULL,
    notes text,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- payments
CREATE TABLE public.payments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    method public.payment_method NOT NULL,
    received_amount numeric(10,2) NOT NULL,
    change_amount numeric(10,2) NOT NULL DEFAULT 0,
    cashier_user_id uuid NOT NULL REFERENCES public.restaurant_users(id),
    created_at timestamptz DEFAULT now() NOT NULL
);

-- order_adjustments
CREATE TABLE public.order_adjustments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    action public.adjustment_action NOT NULL,
    previous_payload jsonb NOT NULL,
    new_payload jsonb NOT NULL,
    performed_by uuid NOT NULL REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now() NOT NULL
);

-- Automatically update updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_restaurants_updated_at BEFORE UPDATE ON public.restaurants FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_menu_items_updated_at BEFORE UPDATE ON public.menu_items FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
