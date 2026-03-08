-- 20260307000400_slug_reservation_system.sql
-- Implement slug reservation and locking

CREATE TABLE IF NOT EXISTS public.reserved_slugs (
    slug text PRIMARY KEY,
    restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE SET NULL,
    reserved_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS for reserved_slugs
ALTER TABLE public.reserved_slugs ENABLE ROW LEVEL SECURITY;

-- Public can view reservations (needed for uniqueness checks / routing)
DROP POLICY IF EXISTS "Public can view reserved slugs" ON public.reserved_slugs;
CREATE POLICY "Public can view reserved slugs" 
    ON public.reserved_slugs 
    FOR SELECT 
    USING (true);

-- Add locking field to restaurants
ALTER TABLE public.restaurants 
ADD COLUMN IF NOT EXISTS is_slug_locked boolean DEFAULT false NOT NULL;

-- Index for lookup performance
CREATE INDEX IF NOT EXISTS idx_reserved_slugs_restaurant_id ON public.reserved_slugs(restaurant_id);
