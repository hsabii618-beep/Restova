-- 20260307000300_restaurant_public_settings.sql
-- Add fields for public menu URL and custom domains

ALTER TABLE public.restaurants 
ADD COLUMN IF NOT EXISTS custom_domain text UNIQUE,
ADD COLUMN IF NOT EXISTS menu_path text DEFAULT 'menu' NOT NULL,
ADD COLUMN IF NOT EXISTS domain_verified boolean DEFAULT false NOT NULL,
ADD COLUMN IF NOT EXISTS is_menu_public boolean DEFAULT true NOT NULL;
