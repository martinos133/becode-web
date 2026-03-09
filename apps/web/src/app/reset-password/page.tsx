'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

type Mode = 'request' | 'set' | 'success';
type SuccessFrom = 'request' | 'set' | null;

export default function ResetPasswordPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('request');
  const [successFrom, setSuccessFrom] = useState<SuccessFrom>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const hashParams = typeof window !== 'undefined' ? window.location.hash : '';
    const isRecovery = hashParams.includes('type=recovery');

    if (isRecovery) {
      const supabase = createClient();
      const checkSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) setMode('set');
      };
      checkSession();
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'PASSWORD_RECOVERY') setMode('set');
      });
      return () => subscription.unsubscribe();
    }
  }, []);

  async function handleRequestReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const redirectTo =
        typeof window !== 'undefined'
          ? `${window.location.origin}/reset-password`
          : '';
      const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      });
      if (err) {
        setError(err.message ?? 'Nepodarilo sa odoslať email.');
        setLoading(false);
        return;
      }
      setSuccessFrom('request');
      setMode('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chyba pri odosielaní.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError('Heslá sa nezhodujú.');
      return;
    }
    if (password.length < 6) {
      setError('Heslo musí mať aspoň 6 znakov.');
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) {
        setError(err.message ?? 'Nepodarilo sa zmeniť heslo.');
        setLoading(false);
        return;
      }
      setSuccessFrom('set');
      setMode('success');
      setTimeout(() => router.push('/login'), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chyba pri zmene hesla.');
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '0.75rem',
    marginBottom: '1rem',
    background: 'var(--becode-input-bg)',
    border: '1px solid var(--becode-border)',
    borderRadius: 'var(--becode-radius)',
    color: 'var(--becode-text)',
  } as const;

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
          {mode === 'request' && 'Zabudnuté heslo'}
          {mode === 'set' && 'Nastaviť nové heslo'}
          {mode === 'success' && 'Hotovo'}
        </h1>

        {mode === 'request' && (
          <form onSubmit={handleRequestReset}>
            <p style={{ marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--becode-text-muted)' }}>
              Zadajte e-mail a pošleme vám odkaz na obnovenie hesla.
            </p>
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
              style={inputStyle}
            />
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
              {loading ? 'Odosielam…' : 'Odoslať odkaz'}
            </button>
          </form>
        )}

        {mode === 'set' && (
          <form onSubmit={handleSetPassword}>
            <label
              htmlFor="password"
              style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--becode-text-muted)' }}
            >
              Nové heslo
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              style={inputStyle}
            />
            <label
              htmlFor="confirmPassword"
              style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--becode-text-muted)' }}
            >
              Potvrdiť heslo
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              style={inputStyle}
            />
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
              {loading ? 'Ukladám…' : 'Uložiť nové heslo'}
            </button>
          </form>
        )}

        {mode === 'success' && (
          <p style={{ color: 'var(--becode-text-muted)', marginBottom: '1rem' }}>
            {successFrom === 'request'
              ? 'Skontrolujte e-mail a kliknite na odkaz na obnovenie hesla.'
              : 'Heslo bolo úspešne zmenené. Presmerovávam na prihlásenie…'}
          </p>
        )}

        <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: 'var(--becode-text-muted)' }}>
          <a href="/login">Späť na prihlásenie</a>
        </p>
      </div>
    </main>
  );
}
