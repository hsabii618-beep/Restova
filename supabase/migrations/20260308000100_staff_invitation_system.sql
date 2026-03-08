-- 20260308000100_staff_invitation_system.sql
-- Create staff_invitations table for Phase 1 of Staff Onboarding

CREATE TABLE public.staff_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    role text NOT NULL CHECK (role IN ('manager', 'cashier')),
    token_hash text NOT NULL UNIQUE,
    status text NOT NULL CHECK (status IN ('pending', 'consumed_pending_approval', 'approved', 'rejected', 'revoked', 'expired')),
    created_by_user_id UUID NOT NULL REFERENCES auth.users(id),
    consumed_by_user_id UUID REFERENCES auth.users(id),
    consumed_email text,
    consumed_full_name text,
    used_at timestamptz,
    expires_at timestamptz NOT NULL,
    revoked_at timestamptz,
    approved_at timestamptz,
    rejected_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Documentation check: required columns match the list in the prompt.

-- Indexes
CREATE INDEX idx_staff_invitations_restaurant_id ON public.staff_invitations(restaurant_id);
CREATE INDEX idx_staff_invitations_restaurant_status ON public.staff_invitations(restaurant_id, status);
CREATE INDEX idx_staff_invitations_expires_at ON public.staff_invitations(expires_at);

-- RLS Policies
ALTER TABLE public.staff_invitations ENABLE ROW LEVEL SECURITY;

-- Owner of a restaurant can create invitation rows for that restaurant
-- Owner of a restaurant can read invitation rows for that restaurant
-- (Using the existing RLS helper pattern if available, or direct check)

CREATE POLICY "Owners can manage invitations for their restaurant"
ON public.staff_invitations
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.restaurant_users
        WHERE restaurant_users.restaurant_id = staff_invitations.restaurant_id
        AND restaurant_users.user_id = auth.uid()
        AND restaurant_users.role = 'owner'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.restaurant_users
        WHERE restaurant_users.restaurant_id = staff_invitations.restaurant_id
        AND restaurant_users.user_id = auth.uid()
        AND restaurant_users.role = 'owner'
    )
);

-- Consumption happens via server route (service role), so no public policy for update needed for consumes.
-- However, we must ensure even authenticated users don't have direct access unless they are the owner.
-- The prompt says "no public direct table access by raw token". Our logic will use supabaseAdmin.

-- Trigger for updated_at
CREATE TRIGGER set_staff_invitations_updated_at
BEFORE UPDATE ON public.staff_invitations
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
