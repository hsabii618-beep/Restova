import { createSupabaseAdminClient } from './supabase-admin';
import crypto from 'crypto';
import { validateInvitedRole, validateStaffFullName, InvitationStatus } from './staff-invitation-validation';
import { logSecurityEvent } from './security';

const SERVER_SECRET = process.env.STAFF_INVITE_SECRET || 'fallback-secret-development-only';

/**
 * Generates a cryptographically secure random token
 */
export function generateInvitationToken(): string {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * Hashes a token using HMAC-SHA256 with a server secret
 */
export function hashInvitationToken(token: string): string {
    return crypto.createHmac('sha256', SERVER_SECRET).update(token).digest('hex');
}

/**
 * Create a new staff invitation
 */
export async function createStaffInvitation({
    restaurantId,
    role,
    createdByUserId
}: {
    restaurantId: string;
    role: string;
    createdByUserId: string;
}) {
    if (!validateInvitedRole(role)) {
        return { data: null, error: { status: 400, message: "Invalid role specified." } };
    }

    const rawToken = generateInvitationToken();
    const tokenHash = hashInvitationToken(rawToken);
    
    // Set expiry to 7 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const supabaseAdmin = createSupabaseAdminClient();

    const { data, error } = await supabaseAdmin
        .from('staff_invitations')
        .insert({
            restaurant_id: restaurantId,
            role,
            token_hash: tokenHash,
            status: 'pending',
            created_by_user_id: createdByUserId,
            expires_at: expiresAt.toISOString()
        })
        .select('id, expires_at')
        .single();

    if (error) {
        console.error("Error creating staff invitation:", error);
        return { data: null, error: { status: 500, message: "Failed to create invitation." } };
    }

    logSecurityEvent('staff_invite_created', { restaurantId, role, createdByUserId, invitationId: data.id });

    // Build the invite URL
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_URL || 'http://localhost:3000';
    const inviteUrl = `${rootDomain}/staff-invite/${rawToken}`;

    return { 
        data: { 
            id: data.id, 
            inviteUrl, 
            expiresAt: data.expires_at 
        }, 
        error: null 
    };
}

/**
 * Validates a raw token and returns invitation details if valid
 */
export async function validateInvitationToken(rawToken: string) {
    if (!rawToken) return { data: null, error: 'Token is required.' };
    
    const tokenHash = hashInvitationToken(rawToken);
    const supabaseAdmin = createSupabaseAdminClient();

    const { data: invitation, error } = await supabaseAdmin
        .from('staff_invitations')
        .select(`
            id,
            status,
            expires_at,
            role,
            restaurant_id,
            restaurants (
                name
            )
        `)
        .eq('token_hash', tokenHash)
        .maybeSingle();

    if (error) {
        console.error("Database error validating token:", error);
        return { data: null, error: 'System error' };
    }

    if (!invitation) return { data: null, error: 'Invalid invitation token.' };

    const now = new Date();
    const expiresAt = new Date(invitation.expires_at);

    if (invitation.status !== 'pending') {
        const message = invitation.status === 'consumed_pending_approval' 
            ? 'This invitation has already been used.' 
            : 'This invitation is no longer valid.';
        return { data: invitation, error: message };
    }

    if (now > expiresAt) {
        return { data: invitation, error: 'This invitation has expired.' };
    }

    return { data: invitation, error: null };
}

/**
 * Consumes an invitation and transitions it to consumed_pending_approval
 * Uses an atomic update to prevent race conditions
 */
export async function consumeStaffInvitation({
    rawToken,
    userId,
    email,
    fullName
}: {
    rawToken: string;
    userId: string;
    email: string;
    fullName: string;
}) {
    const { isValid, error: nameError } = validateStaffFullName(fullName);
    if (!isValid) {
        return { data: null, error: nameError };
    }

    const tokenHash = hashInvitationToken(rawToken);
    const supabaseAdmin = createSupabaseAdminClient();

    // ATOMIC UPDATE: Only update if status is 'pending' and not expired
    const { data, error } = await supabaseAdmin
        .from('staff_invitations')
        .update({
            status: 'consumed_pending_approval' as InvitationStatus,
            consumed_by_user_id: userId,
            consumed_email: email,
            consumed_full_name: fullName.trim(),
            used_at: new Date().toISOString()
        })
        .eq('token_hash', tokenHash)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .select()
        .maybeSingle();

    if (error) {
        console.error("Error consuming invitation:", error);
        return { data: null, error: "Failed to process invitation." };
    }

    if (!data) {
        // If update affected zero rows, it was either already consumed, expired, or invalid token
        // We'll re-validate to give a better error message if needed, or just generic error
        return { data: null, error: "Invitation could not be used. It may be expired or already consumed." };
    }

    logSecurityEvent('staff_invite_consumed', { invitationId: data.id, userId, email });

    return { data, error: null };
}

/**
 * List invitations for a restaurant grouped by status
 */
export async function listStaffInvitations(restaurantId: string) {
    const supabaseAdmin = createSupabaseAdminClient();

    const { data, error } = await supabaseAdmin
        .from('staff_invitations')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error listing invitations:", error);
        return { data: null, error };
    }

    const grouped = {
        pending_invites: data.filter(i => i.status === 'pending'),
        pending_approvals: data.filter(i => i.status === 'consumed_pending_approval'),
        approved: data.filter(i => i.status === 'approved'),
        rejected: data.filter(i => i.status === 'rejected'),
    };

    return { data: grouped, error: null };
}

/**
 * Approve a staff invitation using a database transaction (via RPC)
 */
export async function approveStaffInvitation({
    invitationId,
    restaurantId,
    approvedByUserId
}: {
    invitationId: string;
    restaurantId: string;
    approvedByUserId: string;
}) {
    const supabaseAdmin = createSupabaseAdminClient();

    // Call the atomic RPC function
    const { data, error } = await supabaseAdmin.rpc('approve_staff_invitation', {
        p_invitation_id: invitationId,
        p_restaurant_id: restaurantId,
        p_acting_user_id: approvedByUserId
    });

    if (error) {
        console.error("RPC Error in approveStaffInvitation:", error);
        return { error: 'System error during approval' };
    }

    // data is returned as an array of rows: { success: boolean, error_message: string }
    const result = (Array.isArray(data) ? data[0] : data) as { success: boolean, error_message: string | null };

    if (!result.success) {
        return { error: result.error_message || 'Failed to approve invitation' };
    }

    // Log the success event
    // Note: We don't have the staffUserId here easily without querying again, 
    // but the RPC ensures the membership is created.
    logSecurityEvent('staff_invite_approved', { 
        invitationId, 
        restaurantId, 
        approvedByUserId,
        timestamp: new Date().toISOString()
    });

    return { error: null };
}

/**
 * Reject a staff invitation using a database transaction (via RPC)
 */
export async function rejectStaffInvitation({
    invitationId,
    restaurantId,
    actingUserId
}: {
    invitationId: string;
    restaurantId: string;
    actingUserId: string;
}) {
    const supabaseAdmin = createSupabaseAdminClient();

    const { data, error } = await supabaseAdmin.rpc('reject_staff_invitation', {
        p_invitation_id: invitationId,
        p_restaurant_id: restaurantId,
        p_acting_user_id: actingUserId
    });

    if (error) {
        console.error("RPC Error in rejectStaffInvitation:", error);
        return { error: 'System error during rejection' };
    }

    const result = (Array.isArray(data) ? data[0] : data) as { success: boolean, error_message: string | null };

    if (!result.success) {
        return { error: result.error_message || 'Failed to reject invitation' };
    }

    logSecurityEvent('staff_invite_rejected', { 
        invitationId, 
        restaurantId,
        actingUserId,
        timestamp: new Date().toISOString()
    });

    return { error: null };
}
