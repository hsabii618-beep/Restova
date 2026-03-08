/**
 * frontend/lib/server/staff-invitation-validation.ts
 * Validation logic for staff invitation Phase 1
 */

export const ALLOWED_INVITE_ROLES = ['manager', 'cashier'] as const;
export type InvitedRole = typeof ALLOWED_INVITE_ROLES[number];

export function validateInvitedRole(role: string): role is InvitedRole {
    return ALLOWED_INVITE_ROLES.includes(role as InvitedRole);
}

const FORBIDDEN_NAME_PLACEHOLDERS = [
    'test',
    'admin',
    'aaa',
    'user',
    'cashier1'
];

export function validateStaffFullName(fullName: string): { isValid: boolean; error?: string } {
    const trimmed = fullName.trim();
    
    if (!trimmed) {
        return { isValid: false, error: "Full name is required." };
    }

    if (trimmed.length < 3) {
        return { isValid: false, error: "Full name must be at least 3 characters." };
    }

    if (trimmed.length > 100) {
        return { isValid: false, error: "Full name must be at most 100 characters." };
    }

    const lowerName = trimmed.toLowerCase();
    
    // Heuristic: reject only specific obvious placeholders
    const isPlaceholder = FORBIDDEN_NAME_PLACEHOLDERS.some(placeholder => 
        lowerName === placeholder
    );

    if (isPlaceholder) {
        return { isValid: false, error: "Please enter your real full name as recognized by your manager." };
    }

    return { isValid: true };
}

export type InvitationStatus = 'pending' | 'consumed_pending_approval' | 'approved' | 'rejected' | 'revoked' | 'expired';

export function validateInvitationStateTransition(currentStatus: InvitationStatus, nextStatus: InvitationStatus): boolean {
    // Phase 1 -> Phase 2 transitions:
    
    if (currentStatus === 'pending') {
        return ['consumed_pending_approval', 'revoked', 'expired'].includes(nextStatus);
    }

    if (currentStatus === 'consumed_pending_approval') {
        return ['approved', 'rejected'].includes(nextStatus);
    }
    
    return false;
}
