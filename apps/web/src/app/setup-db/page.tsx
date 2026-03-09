'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function SetupDbPage() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password.trim()) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/setup-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Chyba');
      setMessage({ type: 'success', text: data.message || 'Tabuľka employees bola vytvorená.' });
      setPassword('');
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Nepodarilo sa vytvoriť tabuľku.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: '2rem', maxWidth: 480, margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Nastavenie databázy</h1>
      <p style={{ fontSize: '0.875rem', color: 'var(--becode-text-muted)', marginBottom: '1.5rem' }}>
        Zadaj heslo k databáze (Supabase → Project Settings → Database). Tabuľky <code>employees</code>, <code>projects</code> a <code>employee_time_entries</code> sa vytvoria automaticky.
      </p>

      <form
        onSubmit={handleSubmit}
        style={{
          background: 'var(--becode-surface-elevated)',
          borderRadius: 'var(--becode-radius-lg)',
          border: '1px solid var(--becode-border)',
          padding: '1.5rem',
        }}
      >
        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
          Heslo k databáze
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Database password"
          disabled={loading}
          style={{
            width: '100%',
            padding: '0.5rem 0.75rem',
            background: 'var(--becode-input-bg)',
            borderRadius: 'var(--becode-radius)',
            border: '1px solid var(--becode-border)',
            color: 'var(--becode-text)',
            marginBottom: '1rem',
          }}
        />
        {message && (
          <p
            style={{
              marginBottom: '1rem',
              fontSize: '0.875rem',
              color: message.type === 'success' ? '#22c55e' : '#ef4444',
            }}
          >
            {message.text}
          </p>
        )}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '0.5rem 1rem',
              background: 'var(--becode-primary)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--becode-radius)',
              fontWeight: 600,
            }}
          >
            {loading ? 'Vytváram…' : 'Vytvoriť tabuľku'}
          </button>
          <Link
            href="/employees"
            style={{
              padding: '0.5rem 1rem',
              background: 'transparent',
              color: 'var(--becode-text-muted)',
              border: '1px solid var(--becode-border)',
              borderRadius: 'var(--becode-radius)',
              textDecoration: 'none',
              fontSize: '0.9rem',
            }}
          >
            Späť na Zamestnancov
          </Link>
        </div>
      </form>
    </main>
  );
}
