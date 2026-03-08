# Research: Cashier Realtime Active Orders View

## Decision: Component Architecture
- **Choice**: Next.js Client Component.
- **Rationale**: Realtime subscriptions via Supabase require browser-side Websockets.
- **Alternatives Considered**: Server Actions with polling (rejected due to latency and resource usage).

## Decision: State Management
- **Choice**: React `useState` for storing orders and `useEffect` for the subscription.
- **Rationale**: Simplest approach for local UI state management in a single-view dashboard.
- **Alternatives Considered**: React Query (not strictly necessary for a single-channel realtime feed, but could be used for the initial fetch).

## Decision: Supabase Realtime Implementation
- **Choice**: `supabase.channel('active_orders').on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, handleChanges).subscribe()`.
- **Rationale**: Standard Supabase pattern for Postgres changes.
- **Note on Filtering**: RLS is already active. The client will only receive updates for orders they are authorized to see. Client-side filtering will still be used to refine by `status` as per the spec.

## Decision: Initial Fetch & Sync
- **Approach**: 
  1. Fetch initial active orders using `supabase.from('orders').select('*').eq('restaurant_id', ...).in('status', [...]).is('deleted_at', null)`.
  2. Subscribe to changes.
  3. Re-fetch or manually update state on change events.
- **Rationale**: Ensures the UI starts with current data and transitions seamlessly to realtime updates.

## Decision: Connection Resilience
- **Approach**: Monitor the channel status and display a visual indicator (e.g., "Live" vs. "Connecting").
- **Rationale**: High-paced restaurant environments need to know if their order feed is active.
