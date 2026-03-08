# Data Model: Cashier Realtime Active Orders View

## Core Tables

This feature primarily uses the existing `orders` table.

### `orders` Table (Existing)

| Field | Type | Description |
|-------|------|-------------|
| id | uuid | Primary key |
| restaurant_id | uuid | FK to restaurants |
| display_number | integer | Human-friendly order number |
| customer_name | text | Name of the customer |
| status | public.order_status | Current status of the order |
| created_at | timestamptz | Order creation timestamp |
| deleted_at | timestamptz | Soft-delete timestamp |

## State Transitions

The dashboard monitors orders in the following "Active" states:

- `new`
- `editing`
- `awaiting_payment`
- `paid`
- `preparing`
- `ready`

Orders that transition to `completed` or `cancelled` MUST be automatically removed from the active orders view.

## Security (RLS)

The dashboard relies on the following RLS policy on the `orders` table:

```sql
CREATE POLICY "Members can manage orders"
    ON public.orders
    FOR ALL
    USING (public.is_restaurant_member(restaurant_id))
    WITH CHECK (public.is_restaurant_member(restaurant_id));
```

This ensures that the Supabase Realtime channel only broadcasts authorized data to the client.
