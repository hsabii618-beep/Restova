# Research: Phase 2 — Auth + Restaurant Provisioning

## Decisions

### 1. Supabase Auth Integration
- **Decision**: Use `@supabase/ssr` for auth in Next.js App Router.
- **Rationale**: Official and recommended way to handle auth with cookies in Next.js.
- **Alternatives**: Client-side only auth (rejected because we need middleware protection).

### 2. Route Protection (Middleware)
- **Decision**: Use Next.js Middleware to protect `/dashboard/*`.
- **Rationale**: Centralized route protection; prevents unauthenticated users from even seeing the dashboard layout.

### 3. Server-Side Provisioning (POST /api/restaurants)
- **Decision**: Use Supabase Service Role client in a Next.js Route Handler.
- **Rationale**: To ensure the `restaurants` record is created atomically with the correct `owner_id`. The service role bypasses RLS, but the API handler will verify the user's session first.
- **Security**: The `SUPABASE_SERVICE_ROLE_KEY` will be stored in Vercel environment variables and never exposed to the client.

### 4. Single Restaurant Constraint (MVP)
- **Decision**: Check for existing records in `restaurants` where `owner_id` matches the user's ID before creating a new one.
- **Rationale**: Enforces the MVP requirement of one restaurant per account. Returning 409 Conflict if an ownership already exists.

## Tech Context Findings
- Next.js 14+ with App Router.
- Supabase Auth for identity.
- Supabase PostgreSQL for restaurant storage.
- Middleware for session verification.

## Best Practices
- Use `cookies()` in Route Handlers to retrieve the user's session.
- Validate input using a schema library (like Zod) or simple validation in the handler.
- Standardized error responses (JSON).
