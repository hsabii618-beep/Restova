'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { AuthLayout } from '@/components/auth/AuthLayout';

export default function ResetPasswordPage() {
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const router = useRouter();

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);
        setError(null);

        const supabase = createSupabaseBrowserClient();
        const { error: updateError } = await supabase.auth.updateUser({
            password,
        });

        if (updateError) {
            setError(updateError.message);
        } else {
            setMessage('Password updated successfully. You can now log in.');
            setTimeout(() => {
                router.push('/login');
            }, 3000);
        }
        setLoading(false);
    };

    return (
        <AuthLayout
            title="Set generic new password"
            subtitle="Enter your new password below."
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

            <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label htmlFor="password" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)' }}>New Password</label>
                    <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
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
                    {loading ? 'Updating...' : 'Update Password'}
                </button>
            </form>
        </AuthLayout>
    );
}
