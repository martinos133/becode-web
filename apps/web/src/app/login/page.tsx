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
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chyba pri prihlásení.');
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
          background: '#1e293b',
          borderRadius: '12px',
          padding: '2rem',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
        }}
      >
        <h1 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>
          Prihlásenie – Admin
        </h1>
        <form onSubmit={handleSubmit}>
          <label
            htmlFor="email"
            style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}
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
              background: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '8px',
              color: '#e2e8f0',
            }}
          />
          <label
            htmlFor="password"
            style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}
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
              marginBottom: '1rem',
              background: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '8px',
              color: '#e2e8f0',
            }}
          />
          {error && (
            <p
              style={{
                marginBottom: '1rem',
                padding: '0.75rem',
                background: 'rgba(239,68,68,0.2)',
                borderRadius: '8px',
                color: '#fca5a5',
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
              background: loading ? '#475569' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600,
            }}
          >
            {loading ? 'Prihlasujem…' : 'Prihlásiť sa'}
          </button>
        </form>
        <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#94a3b8' }}>
          <a href="/">Späť na úvod</a>
        </p>
      </div>
    </main>
  );
}
