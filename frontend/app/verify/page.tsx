'use client';

import React, { Suspense } from 'react';

import { AuthLayout } from '@/components/auth/AuthLayout';
import Link from 'next/link';

function VerifyContent() {
    const [email, setEmail] = React.useState('');

    React.useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const em = params.get('email');
        if (em) setEmail(em);
    }, []);

    return (
        <AuthLayout
            title="Check your email"
            subtitle={<>We sent a verification link to <strong>{email || 'your email'}</strong></>}
        >
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <p style={{ fontSize: '15px', color: 'var(--color-text-secondary)', lineHeight: '1.6' }}>
                    Please click the link in the email to verify your account and safely log in. If you don&apos;t see it, check your spam folder.
                </p>

                <Link href="/login" className="r3-cta-white" style={{ display: 'inline-block', fontWeight: 600 }}>
                    Back to Login
                </Link>
            </div>
        </AuthLayout>
    );
}

export default function VerifyPage() {
    return <VerifyContent />;
}
