-- 20260228000100_core_enums.sql
-- Create core enums for the Restova database

CREATE TYPE public.user_role AS ENUM (
    'owner',
    'manager',
    'cashier'
);

CREATE TYPE public.order_type AS ENUM (
    'dine_in',
    'takeaway',
    'delivery'
);

CREATE TYPE public.order_status AS ENUM (
    'new',
    'editing',
    'awaiting_payment',
    'paid',
    'preparing',
    'ready',
    'completed',
    'cancelled'
);

CREATE TYPE public.payment_method AS ENUM (
    'cash',
    'card'
);

CREATE TYPE public.adjustment_action AS ENUM (
    'add_item',
    'remove_item',
    'update_item',
    'edit_note'
);
