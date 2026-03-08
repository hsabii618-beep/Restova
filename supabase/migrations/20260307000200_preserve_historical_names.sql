-- 20260307000200_preserve_historical_names.sql
-- Update active transaction tables to preserve staff names securely post-deletion.

-- 1. Orders: Record who processed it, and preserve name as fallback string
ALTER TABLE public.orders 
ADD COLUMN created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN created_by_name text;

-- 2. Payments: relax the constraint to allow null cashiers
ALTER TABLE public.payments 
ALTER COLUMN cashier_user_id DROP NOT NULL;

-- Remove old restrictive FK
ALTER TABLE public.payments 
DROP CONSTRAINT payments_cashier_user_id_fkey;

-- Re-apply FK targeting restaurant_users but with ON DELETE SET NULL
ALTER TABLE public.payments 
ADD CONSTRAINT payments_cashier_user_id_fkey 
FOREIGN KEY (cashier_user_id) REFERENCES public.restaurant_users(id) ON DELETE SET NULL;

-- Keep historical name snapshot
ALTER TABLE public.payments 
ADD COLUMN cashier_name text;

-- 3. Order Adjustments: relax constraint
ALTER TABLE public.order_adjustments 
ALTER COLUMN performed_by DROP NOT NULL;

ALTER TABLE public.order_adjustments 
DROP CONSTRAINT order_adjustments_performed_by_fkey;

ALTER TABLE public.order_adjustments 
ADD CONSTRAINT order_adjustments_performed_by_fkey 
FOREIGN KEY (performed_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.order_adjustments 
ADD COLUMN performed_by_name text;
