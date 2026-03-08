'use client';

import React, { useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { AuthLayout } from '@/components/auth/AuthLayout';
import Link from 'next/link';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleResetRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);
        setError(null);

        const supabase = createSupabaseBrowserClient();
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
        });

        if (resetError) {
            setError(resetError.message);
        } else {
            setMessage('A password reset link has been sent to your email address.');
        }
        setLoading(false);
    };

    return (
        <AuthLayout
            title="Reset password"
            subtitle="Enter your email to receive a password reset link."
        >
            {message && (
                <div style={{ padding: '12px 16px', backgroundColor: 'var(--color-success-soft)', color: 'var(--color-success)', borderRadius: '8px', marginBottom: '24px', fontSize: '14px', fontWeight: 500 }}>
                    {message}
                </div>
            )}

            {error && (
                <div style={{ padding: '12px 16px', backgroundColor: 'var(--color-error-soft)', color: 'var(--color-error)', borderRadius: '8px', marginBottom: '24px', fontSize: '14px', fontWeight: 500 }}>
                    {error}
                </div>
            )}

            <form onSubmit={handleResetRequest} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label htmlFor="email" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Email address</label>
                    <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border-default)', fontSize: '15px', outline: 'none' }}
                    />
                </div>
                <button
                    type="submit"
                    disabled={loading || !!message}
                    className="r3-cta-white"
                    style={{
                        marginTop: '8px',
                        width: '100%',
                        opacity: (loading || !!message) ? 0.7 : 1,
                        cursor: (loading || !!message) ? 'not-allowed' : 'pointer'
                    }}
                >
                    {loading ? 'Sending...' : 'Send reset link'}
                </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '24px' }}>
                <Link href="/login" style={{ fontSize: '14px', color: 'var(--color-text-muted)', fontWeight: 500 }}>
                    Back to log in
                </Link>
            </div>
        </AuthLayout>
    );
}
