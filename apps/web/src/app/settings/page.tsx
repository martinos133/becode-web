'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { env } from '@/lib/env';

type User = { id: string; email?: string; role: string };

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserError, setNewUserError] = useState<string | null>(null);
  const [newUserSuccess, setNewUserSuccess] = useState(false);
  const [newUserLoading, setNewUserLoading] = useState(false);

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

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    if (newPassword !== confirmPassword) {
      setPasswordError('Heslá sa nezhodujú.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('Heslo musí mať aspoň 6 znakov.');
      return;
    }
    setPasswordLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setPasswordError(error.message ?? 'Nepodarilo sa zmeniť heslo.');
        setPasswordLoading(false);
        return;
      }
      setPasswordSuccess(true);
      setNewPassword('');
      setConfirmPassword('');
      setShowChangePassword(false);
      setTimeout(() => setPasswordSuccess(false), 4000);
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Chyba pri zmene hesla.');
    } finally {
      setPasswordLoading(false);
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setNewUserError(null);
    if (!newUserEmail.trim() || !newUserPassword) {
      setNewUserError('E-mail a heslo sú povinné.');
      return;
    }
    if (newUserPassword.length < 6) {
      setNewUserError('Heslo musí mať aspoň 6 znakov.');
      return;
    }
    setNewUserLoading(true);
    try {
      const token = typeof window !== 'undefined' ? sessionStorage.getItem('supabase_token') : null;
      if (!token) {
        setNewUserError('Nie ste prihlásený.');
        setNewUserLoading(false);
        return;
      }
      const res = await fetch(`${env.apiUrl}/auth/create-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email: newUserEmail.trim(), password: newUserPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        setNewUserError(data?.error ?? 'Nepodarilo sa vytvoriť používateľa.');
        setNewUserLoading(false);
        return;
      }
      setNewUserSuccess(true);
      setNewUserEmail('');
      setNewUserPassword('');
      setTimeout(() => setNewUserSuccess(false), 4000);
    } catch (err) {
      setNewUserError(err instanceof Error ? err.message : 'Sieťová chyba.');
    } finally {
      setNewUserLoading(false);
    }
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
        <h1 style={{ fontSize: '1.5rem' }}>Nastavenia – Admin</h1>
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
        {passwordSuccess && (
          <p style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: 'var(--becode-primary)' }}>
            Heslo bolo zmenené.
          </p>
        )}
        {!showChangePassword ? (
          <button
            type="button"
            onClick={() => { setShowChangePassword(true); setPasswordSuccess(false); }}
            style={{
              marginTop: '1rem',
              padding: '0.5rem 1rem',
              background: 'transparent',
              color: 'var(--becode-primary)',
              border: '1px solid var(--becode-border)',
              borderRadius: 'var(--becode-radius)',
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            Zmeniť heslo
          </button>
        ) : (
          <form onSubmit={handleChangePassword} style={{ marginTop: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8rem', color: 'var(--becode-text-muted)' }}>
              Nové heslo
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={6}
              required
              style={{
                width: '100%',
                maxWidth: 280,
                padding: '0.5rem 0.75rem',
                marginBottom: '0.5rem',
                background: 'var(--becode-input-bg)',
                border: '1px solid var(--becode-border)',
                borderRadius: 'var(--becode-radius)',
                color: 'var(--becode-text)',
              }}
            />
            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8rem', color: 'var(--becode-text-muted)' }}>
              Potvrdiť heslo
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={6}
              required
              style={{
                width: '100%',
                maxWidth: 280,
                padding: '0.5rem 0.75rem',
                marginBottom: '0.5rem',
                background: 'var(--becode-input-bg)',
                border: '1px solid var(--becode-border)',
                borderRadius: 'var(--becode-radius)',
                color: 'var(--becode-text)',
              }}
            />
            {passwordError && (
              <p style={{ marginBottom: '0.5rem', fontSize: '0.8rem', color: 'var(--becode-error-text)' }}>
                {passwordError}
              </p>
            )}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="submit"
                disabled={passwordLoading}
                style={{
                  padding: '0.5rem 1rem',
                  background: 'var(--becode-primary)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 'var(--becode-radius)',
                  fontSize: '0.875rem',
                  cursor: passwordLoading ? 'wait' : 'pointer',
                }}
              >
                {passwordLoading ? '…' : 'Uložiť heslo'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowChangePassword(false);
                  setNewPassword('');
                  setConfirmPassword('');
                  setPasswordError(null);
                }}
                style={{
                  padding: '0.5rem 1rem',
                  background: 'transparent',
                  color: 'var(--becode-text-muted)',
                  border: '1px solid var(--becode-border)',
                  borderRadius: 'var(--becode-radius)',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                }}
              >
                Zrušiť
              </button>
            </div>
          </form>
        )}
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
        <h2 style={{ marginBottom: '0.75rem', fontSize: '1rem' }}>Vytvoriť nového používateľa</h2>
        <p style={{ marginBottom: '1rem', fontSize: '0.875rem', color: 'var(--becode-text-muted)' }}>
          Nový používateľ bude môcť sa prihlásiť s rovnakými oprávneniami ako vy.
        </p>
        <form onSubmit={handleCreateUser}>
          <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8rem', color: 'var(--becode-text-muted)' }}>
            E-mail
          </label>
          <input
            type="email"
            value={newUserEmail}
            onChange={(e) => setNewUserEmail(e.target.value)}
            required
            placeholder="novy@becode.sk"
            style={{
              width: '100%',
              maxWidth: 280,
              padding: '0.5rem 0.75rem',
              marginBottom: '0.5rem',
              background: 'var(--becode-input-bg)',
              border: '1px solid var(--becode-border)',
              borderRadius: 'var(--becode-radius)',
              color: 'var(--becode-text)',
            }}
          />
          <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8rem', color: 'var(--becode-text-muted)' }}>
            Heslo (min. 6 znakov)
          </label>
          <input
            type="password"
            value={newUserPassword}
            onChange={(e) => setNewUserPassword(e.target.value)}
            minLength={6}
            required
            placeholder="••••••••"
            style={{
              width: '100%',
              maxWidth: 280,
              padding: '0.5rem 0.75rem',
              marginBottom: '0.5rem',
              background: 'var(--becode-input-bg)',
              border: '1px solid var(--becode-border)',
              borderRadius: 'var(--becode-radius)',
              color: 'var(--becode-text)',
            }}
          />
          {newUserError && (
            <p style={{ marginBottom: '0.5rem', fontSize: '0.8rem', color: 'var(--becode-error-text)' }}>
              {newUserError}
            </p>
          )}
          {newUserSuccess && (
            <p style={{ marginBottom: '0.5rem', fontSize: '0.8rem', color: 'var(--becode-primary)' }}>
              Používateľ bol vytvorený.
            </p>
          )}
          <button
            type="submit"
            disabled={newUserLoading}
            style={{
              padding: '0.5rem 1rem',
              background: 'var(--becode-primary)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--becode-radius)',
              fontSize: '0.875rem',
              cursor: newUserLoading ? 'wait' : 'pointer',
            }}
          >
            {newUserLoading ? '…' : 'Vytvoriť používateľa'}
          </button>
        </form>
      </div>

      <p style={{ color: 'var(--becode-text-muted)', fontSize: '0.875rem' }}>
        <a href="/">Späť na úvod</a>
      </p>
    </main>
  );
}
