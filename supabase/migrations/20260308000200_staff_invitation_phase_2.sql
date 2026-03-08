-- 20260308000200_staff_invitation_phase_2.sql
-- Add approved_by_user_id and refine RLS for staff_invitations

ALTER TABLE public.staff_invitations
ADD COLUMN approved_by_user_id UUID REFERENCES auth.users(id);

-- Drop old policy and recreate strictly based on restaurant ownership
DROP POLICY IF EXISTS "Owners can manage invitations for their restaurant" ON public.staff_invitations;

CREATE POLICY "Owners can manage invitations"
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

-- Ensure anyone can't read invitations even if they have the ID, unless they are the owner
-- Note: validateInvitationToken uses service role, so it bypasses RLS.
