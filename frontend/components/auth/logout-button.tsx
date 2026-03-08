'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export default function LogoutButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    if (loading) return;
    setLoading(true);

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Logout error:', error.message);
      setLoading(false);
    } else {
      router.push('/login');
      router.refresh();
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      style={{
        backgroundColor: 'transparent',
        border: '1px solid var(--color-brand-primary)',
        color: 'var(--color-brand-primary)',
        padding: '0.5rem 1rem',
        borderRadius: '4px',
        cursor: loading ? 'not-allowed' : 'pointer',
        fontSize: '0.9rem',
        fontFamily: 'inherit',
        opacity: loading ? 0.7 : 1,
      }}
    >
      {loading ? 'Logging out...' : 'Logout'}
    </button>
  );
}
