import Link from 'next/link';
import { Zap } from 'lucide-react';
import React from 'react';
import '@/app/styles.css';

export function AuthLayout({
    children,
    title,
    subtitle,
}: {
    children: React.ReactNode;
    title: string;
    subtitle?: React.ReactNode;
}) {
    return (
        <div className="r3" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', justifyContent: 'center', alignItems: 'center', padding: '24px' }}>
            <div style={{ position: 'absolute', top: 32, left: 32 }}>
                <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ background: 'var(--color-brand-primary)', color: 'white', padding: '6px', borderRadius: '8px' }}>
                        <Zap size={20} />
                    </div>
                    <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.5px' }}>Restova</span>
                </Link>
            </div>

            <div style={{ maxWidth: '420px', width: '100%', zIndex: 1 }}>
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <h1 style={{ fontSize: '32px', fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-1px', marginBottom: '8px' }}>{title}</h1>
                    {subtitle && (
                        <p style={{ fontSize: '16px', color: 'var(--color-text-muted)' }}>{subtitle}</p>
                    )}
                </div>

                <div style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-default)', borderRadius: '20px', padding: '32px', boxShadow: 'var(--shadow-lg)' }}>
                    {children}
                </div>
            </div>

            {/* Background decoration to match the brand feel */}
            <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: '600px',
                height: '600px',
                background: 'radial-gradient(circle at center, var(--color-brand-glow), transparent 70%)',
                transform: 'translate(-50%, -50%)',
                pointerEvents: 'none',
                zIndex: 0
            }} />
        </div>
    );
}
