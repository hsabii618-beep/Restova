/**
 * frontend/app/staff-invite/[token]/page.tsx
 * Staff invitation landing page
 */

import { Metadata } from 'next';
import { validateInvitationToken } from '@/lib/server/staff-invitations';
import { InviteClient } from './invite-client';
import { AuthLayout } from '@/components/auth/AuthLayout';
import Link from 'next/link';

export const metadata: Metadata = {
    title: 'Staff Invitation | Restova',
    description: 'Join a restaurant team on Restova',
};

export default async function StaffInvitePage({
    params
}: {
    params: Promise<{ token: string }>;
}) {
    const { token } = await params;
    const { data: invitation, error } = await validateInvitationToken(token);

    // If invitation is null or has some fatal error before we even show UI
    if (!invitation && error === 'Invalid invitation token.') {
        return (
            <AuthLayout title="Invalid Invitation" subtitle="This link is incorrect or has been removed.">
                <div className="flex flex-col gap-4 text-center mt-6">
                    <p className="text-muted-foreground">Please ask your manager for a new invitation link.</p>
                    <Link href="/" className="text-brand-primary font-semibold hover:underline mt-4 block">Return to Homepage</Link>
                </div>
            </AuthLayout>
        );
    }

    return (
        <InviteClient 
            token={token} 
            initialInvitation={invitation} 
            initialError={error} 
        />
    );
}
