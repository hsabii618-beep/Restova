# Quickstart: Cashier Realtime Active Orders View

## Purpose
This document provides instructions for developing and testing the real-time cashier dashboard.

## Development Prerequisites

1.  **Supabase Access**: Ensure you have access to the project's Supabase instance.
2.  **Authentication**: You must be logged in as a cashier or manager associated with a restaurant.
3.  **Active Orders**: You should have orders in the `orders` table with active statuses (e.g., `new`, `preparing`).

## Local Development

1.  **Start Dev Server**:
    ```bash
    cd frontend && npm run dev
    ```
2.  **Access Dashboard**: Navigate to `http://localhost:3000/dashboard`.
3.  **Realtime Check**:
    -   Open two browser windows.
    -   In one, view the `/dashboard`.
    -   In the other (or via Supabase SQL editor), insert or update an order for your restaurant.
    -   Verify the dashboard updates in under 1 second without a refresh.

## Testing Isolation

1.  **Login as User A** (Restaurant A).
2.  **Attempt to View/Fetch Orders** for Restaurant B.
3.  **Verify** that RLS blocks the request and the realtime channel does not broadcast Restaurant B's data.

## Useful SQL Snippets

### Manually Inserting a Test Order
```sql
INSERT INTO public.orders (restaurant_id, customer_name, type, status)
VALUES ('<RESTAURANT_ID>', 'Test Customer', 'dine_in', 'new');
```

### Updating an Order Status
```sql
UPDATE public.orders SET status = 'ready' WHERE id = '<ORDER_ID>';
```
