'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { env } from '@/lib/env';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error: signError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signError) {
        setError(signError.message ?? 'Prihlásenie zlyhalo.');
        setLoading(false);
        return;
      }
      const token = data.session?.access_token;
      if (!token) {
        setError('Nepodarilo sa získať token.');
        setLoading(false);
        return;
      }
      const res = await fetch(`${env.apiUrl}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setError('API neoverilo prihlásenie. Skontrolujte SUPABASE_JWT_SECRET.');
        setLoading(false);
        return;
      }
      sessionStorage.setItem('supabase_token', token);
      router.push('/projects');
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Chyba pri prihlásení.';
      if (msg === 'Failed to fetch') {
        setError(
          'Sieťová chyba. Skontrolujte: 1) či beží API (npm run dev:api, port 3001), 2) či NEXT_PUBLIC_API_URL je http://localhost:3001, 3) pripojenie na Supabase.'
        );
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '400px',
          background: 'var(--becode-surface-elevated)',
          borderRadius: 'var(--becode-radius-lg)',
          padding: '2rem',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
          border: '1px solid var(--becode-border)',
        }}
      >
        <h1 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>
          Prihlásenie – Admin
        </h1>
        <form onSubmit={handleSubmit}>
          <label
            htmlFor="email"
            style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--becode-text-muted)' }}
          >
            E-mail
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            style={{
              width: '100%',
              padding: '0.75rem',
              marginBottom: '1rem',
              background: 'var(--becode-input-bg)',
              border: '1px solid var(--becode-border)',
              borderRadius: 'var(--becode-radius)',
              color: 'var(--becode-text)',
            }}
          />
          <label
            htmlFor="password"
            style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--becode-text-muted)' }}
          >
            Heslo
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            style={{
              width: '100%',
              padding: '0.75rem',
              marginBottom: '0.5rem',
              background: 'var(--becode-input-bg)',
              border: '1px solid var(--becode-border)',
              borderRadius: 'var(--becode-radius)',
              color: 'var(--becode-text)',
            }}
          />
          <p style={{ marginBottom: '1rem', textAlign: 'right' }}>
            <a
              href="/reset-password"
              style={{ fontSize: '0.8rem', color: 'var(--becode-primary)', textDecoration: 'none' }}
            >
              Zabudnuté heslo?
            </a>
          </p>
          {error && (
            <p
              style={{
                marginBottom: '1rem',
                padding: '0.75rem',
                background: 'var(--becode-error-bg)',
                borderRadius: 'var(--becode-radius)',
                color: 'var(--becode-error-text)',
                fontSize: '0.875rem',
              }}
            >
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: loading ? 'var(--becode-border)' : 'var(--becode-primary)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--becode-radius)',
              fontWeight: 600,
            }}
          >
            {loading ? 'Prihlasujem…' : 'Prihlásiť sa'}
          </button>
        </form>
        <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: 'var(--becode-text-muted)' }}>
          <a href="/">Späť na úvod</a>
        </p>
      </div>
    </main>
  );
}
