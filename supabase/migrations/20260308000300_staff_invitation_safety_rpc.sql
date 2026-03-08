CREATE OR REPLACE FUNCTION public.approve_staff_invitation(
    p_invitation_id UUID,
    p_restaurant_id UUID,
    p_acting_user_id UUID
)
RETURNS TABLE (
    success BOOLEAN,
    error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_invitation RECORD;
    v_is_owner BOOLEAN;
BEGIN
    -- 1. Verify Authorization: acting user must be owner of the restaurant
    SELECT EXISTS (
        SELECT 1 FROM public.restaurant_users
        WHERE restaurant_id = p_restaurant_id
        AND user_id = p_acting_user_id
        AND role = 'owner'
    ) INTO v_is_owner;

    IF NOT v_is_owner THEN
        RETURN QUERY SELECT false, 'Forbidden: Only owners can approve invitations.';
        RETURN;
    END IF;

    -- 2. Lock internal row for update, strictly scoped by restaurant_id
    SELECT * INTO v_invitation
    FROM public.staff_invitations
    WHERE id = p_invitation_id
    AND restaurant_id = p_restaurant_id
    FOR UPDATE;

    -- 3. Validate existence
    IF v_invitation.id IS NULL THEN
        RETURN QUERY SELECT false, 'Invitation not found in this restaurant scope.';
        RETURN;
    END IF;

    -- 4. Idempotency: if already approved
    IF v_invitation.status = 'approved' THEN
        RETURN QUERY SELECT true, NULL::TEXT;
        RETURN;
    END IF;

    -- 5. State validation
    IF v_invitation.status = 'rejected' THEN
        RETURN QUERY SELECT false, 'Invitation already rejected';
        RETURN;
    ELSIF v_invitation.status = 'revoked' THEN
        RETURN QUERY SELECT false, 'Invitation revoked';
        RETURN;
    ELSIF v_invitation.status = 'expired' THEN
        RETURN QUERY SELECT false, 'Invitation expired';
        RETURN;
    ELSIF v_invitation.status = 'pending' THEN
        RETURN QUERY SELECT false, 'Invitation not yet consumed';
        RETURN;
    ELSIF v_invitation.status != 'consumed_pending_approval' THEN
        RETURN QUERY SELECT false, 'Invalid invitation status';
        RETURN;
    END IF;

    -- 6. Clock-based Expiry check
    IF v_invitation.expires_at < NOW() THEN
        RETURN QUERY SELECT false, 'Invitation expired';
        RETURN;
    END IF;

    -- 7. Execute Approval Task (Atomic)
    -- Insert membership if not exists
    INSERT INTO public.restaurant_users (
        restaurant_id,
        user_id,
        role
    )
    VALUES (
        p_restaurant_id,
        v_invitation.consumed_by_user_id,
        v_invitation.role::public.user_role
    )
    ON CONFLICT (restaurant_id, user_id) DO NOTHING;

    -- Update invitation status
    UPDATE public.staff_invitations
    SET status = 'approved',
        approved_at = NOW(),
        approved_by_user_id = p_acting_user_id,
        updated_at = NOW()
    WHERE id = p_invitation_id;

    RETURN QUERY SELECT true, NULL::TEXT;
END;
$$;

/**
 * Safe, idempotent rejection of a staff invitation.
 * Strictly enforces owner authorization and tenant boundaries.
 */
CREATE OR REPLACE FUNCTION public.reject_staff_invitation(
    p_invitation_id UUID,
    p_restaurant_id UUID,
    p_acting_user_id UUID
)
RETURNS TABLE (
    success BOOLEAN,
    error_message TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_invitation RECORD;
    v_is_owner BOOLEAN;
BEGIN
    -- 1. Verify Authorization: acting user must be owner of the restaurant
    SELECT EXISTS (
        SELECT 1 FROM public.restaurant_users
        WHERE restaurant_id = p_restaurant_id
        AND user_id = p_acting_user_id
        AND role = 'owner'
    ) INTO v_is_owner;

    IF NOT v_is_owner THEN
        RETURN QUERY SELECT false, 'Forbidden: Only owners can reject invitations.';
        RETURN;
    END IF;

    -- 2. Lock row, strictly scoped by restaurant_id
    SELECT * INTO v_invitation
    FROM public.staff_invitations
    WHERE id = p_invitation_id
    AND restaurant_id = p_restaurant_id
    FOR UPDATE;

    IF v_invitation.id IS NULL THEN
        RETURN QUERY SELECT false, 'Invitation not found in this restaurant scope.';
        RETURN;
    END IF;

    -- 3. Idempotency
    IF v_invitation.status = 'rejected' THEN
        RETURN QUERY SELECT true, NULL::TEXT;
        RETURN;
    END IF;

    -- 4. State validation
    IF v_invitation.status = 'approved' THEN
        RETURN QUERY SELECT false, 'Cannot reject an approved invitation';
        RETURN;
    ELSIF v_invitation.status = 'revoked' THEN
        RETURN QUERY SELECT false, 'Invitation revoked';
        RETURN;
    ELSIF v_invitation.status != 'consumed_pending_approval' THEN
        RETURN QUERY SELECT false, 'Invitation not in a state that can be rejected';
        RETURN;
    END IF;

    -- 5. Execute Rejection
    UPDATE public.staff_invitations
    SET status = 'rejected',
        rejected_at = NOW(),
        updated_at = NOW()
    WHERE id = p_invitation_id;

    RETURN QUERY SELECT true, NULL::TEXT;
END;
$$;