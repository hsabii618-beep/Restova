'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { validateStaffFullName } from '@/lib/server/staff-invitation-validation';
import Link from 'next/link';

interface InviteClientProps {
    token: string;
    initialInvitation: any;
    initialError: string | null;
}

export function InviteClient({ token, initialInvitation, initialError }: InviteClientProps) {
    const [user, setUser] = useState<any>(null);
    const [fullName, setFullName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(initialError);
    const [success, setSuccess] = useState(false);
    const router = useRouter();
    const supabase = createSupabaseBrowserClient();

    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
        };
        checkUser();
    }, [supabase]);

    const handleGoogleLogin = async () => {
        setError(null);
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(window.location.pathname)}`,
            },
        });
        if (error) setError(error.message);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // Client-side quick check
        const { isValid, error: nameError } = validateStaffFullName(fullName);
        if (!isValid) {
            setError(nameError || "Invalid name");
            setLoading(false);
            return;
        }

        try {
            const response = await fetch('/api/staff-invitations/consume', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, fullName }),
            });

            const result = await response.json();

            if (!response.ok) {
                setError(result.error || "Failed to process invitation.");
            } else {
                setSuccess(true);
            }
        } catch (err) {
            setError("A system error occurred. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    // 1. Error States (Expired/Used/Revoked)
    if (error && !user && error !== initialError) {
        // Just show the error
    }

    if (success) {
        return (
            <AuthLayout 
                title="Invitation Received" 
                subtitle="Your request is now pending approval."
            >
                <div className="flex flex-col gap-6 text-center mt-6">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        We've registered your join request for <strong>{initialInvitation?.restaurants?.name}</strong>.
                    </p>
                    <div className="p-4 bg-muted/30 rounded-lg border border-border/50 text-sm">
                        <p className="font-medium text-foreground">Next Step</p>
                        <p className="text-muted-foreground mt-1">
                            Your manager has been notified. Once they approve your account, you'll be able to access the dashboard.
                        </p>
                    </div>
                    <Link href="/" className="text-brand-primary font-semibold hover:underline mt-4 block">Return to Homepage</Link>
                </div>
            </AuthLayout>
        );
    }

    // Handle initial specific errors shown formally
    if (initialError && !success) {
        return (
            <AuthLayout title="Invitation Issue" subtitle={initialError}>
                <div className="flex flex-col gap-4 text-center mt-6">
                    <p className="text-muted-foreground">This invitation link is no longer active.</p>
                    <Link href="/" className="text-brand-primary font-semibold hover:underline mt-4 block">Return to Homepage</Link>
                </div>
            </AuthLayout>
        );
    }

    // 2. Unauthenticated State
    if (!user) {
        return (
            <AuthLayout 
                title="Join the team" 
                subtitle={
                    <>
                        You've been invited to join <strong>{initialInvitation?.restaurants?.name}</strong> as a <strong>{initialInvitation?.role}</strong>.
                    </>
                }
            >
                <div className="space-y-6 mt-6">
                    <p className="text-sm text-muted-foreground text-center">
                        To accept this invitation, please sign in with Google.
                    </p>
                    <button
                        onClick={handleGoogleLogin}
                        type="button"
                        className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-border bg-card text-foreground font-semibold hover:bg-accent transition-colors"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" className="w-5 h-5">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        Continue with Google
                    </button>
                </div>
            </AuthLayout>
        );
    }

    // 3. Authenticated - Name Submission State
    return (
        <AuthLayout 
            title="Complete your profile" 
            subtitle={
                <>
                    Joining <strong>{initialInvitation?.restaurants?.name}</strong> as a <strong>{initialInvitation?.role}</strong>.
                </>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-6 mt-6">
                {error && (
                    <div className="p-3 text-sm bg-destructive/10 border border-destructive/20 text-destructive rounded-lg">
                        {error}
                    </div>
                )}
                
                <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Your Full Name</label>
                    <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. John Smith"
                        className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all"
                        required
                        disabled={loading}
                    />
                    <p className="text-[12px] text-muted-foreground leading-snug">
                        Please enter your real full name as recognized by your manager. They will use this to verify and approve your account.
                    </p>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-foreground text-background font-bold py-3 rounded-xl hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                    {loading ? 'Processing...' : 'Accept Invitation'}
                </button>

                <p className="text-center text-xs text-muted-foreground italic">
                    Logged in as {user.email}
                </p>
            </form>
        </AuthLayout>
    );
}
