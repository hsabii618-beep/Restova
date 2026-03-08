import { NextResponse, type NextRequest } from "next/server";
import { getAuthUser } from "@/lib/server/auth";
import { securityAudit, SECURITY_CONFIG, rateLimit } from "@/lib/server/security";
import { consumeStaffInvitation } from "@/lib/server/staff-invitations";

export async function POST(request: NextRequest) {
    try {
        // 1. Payload Validation (Extract token early for rate limiting)
        const body = await request.json().catch(() => ({}));
        const { token, fullName } = body;

        if (!token) {
            return NextResponse.json({ error: "Token is required." }, { status: 400 });
        }

        // 2. Security Audit (IP Limit)
        const audit = await securityAudit(request, {
            requireSafeOrigin: true,
            rateLimitKey: 'staff-invite-consume-ip',
            rateLimitConfig: SECURITY_CONFIG.STAFF_CONSUME
        });
        if (!audit.allowed) return audit.response!;

        // 3. Token-specific Rate Limit
        const tokenLimit = await rateLimit(request, `staff-invite-token:${token}`, SECURITY_CONFIG.STAFF_INVITE_TOKEN_LIMIT);
        if (!tokenLimit.allowed) return tokenLimit.response!;

        // 4. Auth Check (Must be signed in to consume)
        const { user, error: authError } = await getAuthUser(request);
        if (!user || authError) {
            return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
        }

        if (!fullName) {
            return NextResponse.json({ error: "Full name is required." }, { status: 400 });
        }

        // 4. Consume Invitation
        const { error } = await consumeStaffInvitation({
            rawToken: token,
            userId: user.id,
            email: user.email || '',
            fullName
        });

        if (error) {
            // Map validation errors to 400 or system errors to 500
            const isValidationError = [
                'Invalid invitation token.',
                'This invitation has already been used.',
                'This invitation is no longer valid.',
                'This invitation has expired.',
                'Full name is required.',
                'Full name must be at least 5 characters.',
                'Full name must be at most 100 characters.',
                'Please enter your real full name as recognized by your manager.'
            ].includes(error);

            return NextResponse.json({ error }, { status: isValidationError ? 400 : 500 });
        }

        return NextResponse.json({ message: "Invitation consumed successfully. Pending approval." }, { status: 200 });

    } catch (err) {
        console.error("Staff Invitation Consume API error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
