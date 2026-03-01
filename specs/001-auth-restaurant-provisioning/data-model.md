# Data Model: Phase 2 — Auth + Restaurant Provisioning

## Entities

### Restaurant
- `id`: UUID (Primary Key)
- `owner_id`: UUID (References auth.users) - The owner of the restaurant.
- `name`: Text
- `slug`: Text (Unique, Normalized)
- `created_at`: Timestamptz
- `updated_at`: Timestamptz

## RLS Policies (Reinforcement)

### Restaurants
- `SELECT`: `owner_id = auth.uid()`
- `INSERT`: Server-side only (Service Role) during provisioning.
- `UPDATE`: `owner_id = auth.uid()`
