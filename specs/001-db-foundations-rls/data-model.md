# Data Model: Phase 1 - Database foundations and RLS perimeter

## Tables

### `restaurants`
- `id` (uuid, pk): Unique restaurant identifier.
- `organization_id` (uuid): For future multi-owner scenarios.
- `name` (text): Display name.
- `slug` (text, unique): Used in URLs.
- `is_open` (boolean, default true): Operational status.
- `order_sequence` (integer, default 0): Per-restaurant counter for `display_number`.
- `settings` (jsonb): Custom configuration.
- `created_at`, `updated_at` (timestamptz).

### `restaurant_users`
- `id` (uuid, pk).
- `user_id` (uuid, references auth.users).
- `restaurant_id` (uuid, references restaurants).
- `role` (user_role): Enum: 'owner', 'manager', 'cashier'.
- `created_at` (timestamptz).

### `categories`
- `id` (uuid, pk).
- `restaurant_id` (uuid, references restaurants).
- `name` (text).
- `position` (integer).
- `is_active` (boolean, default true).
- `created_at`, `updated_at` (timestamptz).

### `menu_items`
- `id` (uuid, pk).
- `restaurant_id` (uuid, references restaurants).
- `category_id` (uuid, references categories).
- `name` (text).
- `description` (text).
- `price` (numeric(10,2)).
- `is_available` (boolean, default true).
- `modifiers` (jsonb).
- `image_path` (text).
- `created_at`, `updated_at` (timestamptz).

### `orders`
- `id` (uuid, pk).
- `restaurant_id` (uuid, references restaurants).
- `display_number` (integer): Sequential order number per restaurant.
- `customer_name` (text).
- `type` (order_type): Enum: 'dine_in', 'takeaway', 'delivery'.
- `customer_note` (text).
- `status` (order_status): Enum: 'new', 'editing', 'awaiting_payment', 'paid', 'preparing', 'ready', 'completed', 'cancelled'.
- `is_locked` (boolean, default false): Locked after payment.
- `expires_at` (timestamptz).
- `deleted_at` (timestamptz): For soft deletes.
- `created_at`, `updated_at` (timestamptz).

### `order_items`
- `id` (uuid, pk).
- `order_id` (uuid, references orders).
- `item_id` (uuid, references menu_items).
- `qty` (integer).
- `unit_price` (numeric(10,2)).
- `notes` (text).
- `created_at` (timestamptz).

### `payments`
- `id` (uuid, pk).
- `order_id` (uuid, references orders).
- `method` (payment_method): Enum: 'cash', 'card'.
- `received_amount` (numeric(10,2)).
- `change_amount` (numeric(10,2)).
- `cashier_user_id` (uuid, references restaurant_users).
- `created_at` (timestamptz).

### `order_adjustments`
- `id` (uuid, pk).
- `order_id` (uuid, references orders).
- `action` (adjustment_action): Enum: 'add_item', 'remove_item', 'update_item', 'edit_note'.
- `previous_payload`, `new_payload` (jsonb).
- `performed_by` (uuid, references auth.users).
- `created_at` (timestamptz).

## Enums
- `user_role`: owner, manager, cashier.
- `order_type`: dine_in, takeaway, delivery.
- `order_status`: new, editing, awaiting_payment, paid, preparing, ready, completed, cancelled.
- `payment_method`: cash, card.
- `adjustment_action`: add_item, remove_item, update_item, edit_note.
