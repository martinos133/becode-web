'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { env } from '@/lib/env';

type User = { id: string; email?: string; role: string };

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token =
      typeof window !== 'undefined' ? sessionStorage.getItem('supabase_token') : null;
    if (!token) {
      router.replace('/login');
      return;
    }
    fetch(`${env.apiUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) {
          router.replace('/login');
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data?.user) setUser(data.user);
      })
      .finally(() => setLoading(false));
  }, [router]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    if (typeof window !== 'undefined') sessionStorage.removeItem('supabase_token');
    router.replace('/login');
    router.refresh();
  }

  if (loading) {
    return (
      <main style={{ padding: '2rem', textAlign: 'center', color: 'var(--becode-text-muted)' }}>
        <p>Načítavam…</p>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <h1 style={{ fontSize: '1.5rem' }}>Dashboard – Admin</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Link
            href="/projects"
            style={{
              padding: '0.5rem 1rem',
              background: 'var(--becode-primary-muted)',
              color: 'var(--becode-primary)',
              borderRadius: 'var(--becode-radius)',
              border: '1px solid var(--becode-border)',
              fontSize: '0.875rem',
            }}
          >
            Projekty / zisk
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            style={{
              padding: '0.5rem 1rem',
              background: 'var(--becode-surface-elevated)',
              color: 'var(--becode-text)',
              border: '1px solid var(--becode-border)',
              borderRadius: 'var(--becode-radius)',
            }}
          >
            Odhlásiť sa
          </button>
        </div>
      </div>
      <div
        style={{
          background: 'var(--becode-surface-elevated)',
          borderRadius: 'var(--becode-radius-lg)',
          padding: '1.5rem',
          marginBottom: '1rem',
          border: '1px solid var(--becode-border)',
        }}
      >
        <h2 style={{ marginBottom: '0.75rem', fontSize: '1rem' }}>Prihlásený používateľ</h2>
        <p style={{ color: 'var(--becode-text-muted)' }}>
          <strong>E-mail:</strong> {user.email ?? user.id}
        </p>
        <p style={{ color: 'var(--becode-text-muted)' }}>
          <strong>Rola:</strong> {user.role}
        </p>
      </div>
      <p style={{ color: 'var(--becode-text-muted)', fontSize: '0.875rem' }}>
        <a href="/">Späť na úvod</a>
      </p>
    </main>
  );
}
