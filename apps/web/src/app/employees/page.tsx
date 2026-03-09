'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase';

type EmployeeRow = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  hourly_rate: number;
};

const inputStyle = {
  width: '100%',
  padding: '0.5rem 0.75rem',
  background: 'var(--becode-input-bg)',
  borderRadius: 'var(--becode-radius)',
  border: '1px solid var(--becode-border)',
  color: 'var(--becode-text)',
  fontSize: '0.9rem',
  outline: 'none',
} as const;

export default function EmployeesPage() {
  const [rows, setRows] = useState<EmployeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);
  const [savingNew, setSavingNew] = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [newError, setNewError] = useState<React.ReactNode | null>(null);
  const [newEmp, setNewEmp] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    hourly_rate: 0,
  });

  useEffect(() => {
    loadEmployees();
  }, []);

  async function loadEmployees() {
    const supabase = createClient();
    setLoading(true);
    const { data, error } = await supabase
      .from('employees')
      .select('id, first_name, last_name, email, phone, hourly_rate')
      .order('id', { ascending: true });
    if (error) {
      console.error('Chyba pri načítaní zamestnancov:', error.message);
      setRows([]);
    } else {
      setRows(
        (data ?? []).map((e: any) => ({
          id: Number(e.id),
          first_name: e.first_name ?? '',
          last_name: e.last_name ?? '',
          email: e.email ?? '',
          phone: e.phone ?? '',
          hourly_rate: Number(e.hourly_rate ?? 0),
        })),
      );
    }
    setLoading(false);
  }

  const avgRate = useMemo(
    () =>
      rows.length
        ? rows.reduce((sum, r) => sum + (r.hourly_rate || 0), 0) / rows.length
        : 0,
    [rows],
  );

  async function saveNewEmployee() {
    if (!newEmp.first_name.trim() || !newEmp.last_name.trim()) {
      setNewError('Vyplň aspoň meno a priezvisko.');
      return;
    }
    setSavingNew(true);
    setNewError(null);

    const supabase = createClient();
    const { error } = await supabase.from('employees').insert({
      first_name: newEmp.first_name.trim(),
      last_name: newEmp.last_name.trim(),
      email: newEmp.email.trim() || null,
      phone: newEmp.phone.trim() || null,
      hourly_rate: newEmp.hourly_rate || 0,
    });

    if (error) {
      console.error('Chyba pri ukladaní zamestnanca:', error.message);
      const msg = error.message || '';
      const isTableMissing = msg.includes('Could not find the table');
      setNewError(
        isTableMissing ? (
          <>
            Tabuľka <code>employees</code> neexistuje.{' '}
            <a href="/setup-db" style={{ color: 'var(--becode-primary)', textDecoration: 'underline' }}>
              Nastav databázu
            </a>
          </>
        ) : (
          `Nepodarilo sa uložiť zamestnanca: ${msg}`
        )
      );
      setSavingNew(false);
      return;
    }

    setNewEmp({ first_name: '', last_name: '', email: '', phone: '', hourly_rate: 0 });
    setShowNewForm(false);
    setSavingNew(false);
    void loadEmployees();
  }

  async function deleteRow(id: number) {
    const supabase = createClient();
    await supabase.from('employees').delete().eq('id', id);
  }

  function updateRow<K extends keyof EmployeeRow>(id: number, field: K, value: EmployeeRow[K]) {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  }

  async function saveRow(row: EmployeeRow) {
    setSavingId(row.id);
    const supabase = createClient();
    const { error } = await supabase.from('employees').upsert({
      id: row.id,
      first_name: row.first_name,
      last_name: row.last_name,
      email: row.email,
      phone: row.phone,
      hourly_rate: row.hourly_rate,
    });
    setSavingId(null);
    if (error) console.error('Chyba pri ukladaní:', error.message);
    else void loadEmployees();
  }

  function addRow() {
    setShowNewForm(true);
  }

  function removeRow(id: number) {
    setRows((prev) => prev.filter((r) => r.id !== id));
    void deleteRow(id);
    loadEmployees();
  }

  return (
    <main
      style={{
        padding: '2rem',
        width: '100%',
        maxWidth: '1100px',
        margin: '0 auto',
      }}
    >
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
          gap: '1rem',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.5rem' }}>Zamestnanci</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--becode-text-muted)' }}>
            Meno, kontakt a hodinovka pre výpočet nákladov na projekty.
          </p>
        </div>
        <button
          type="button"
          onClick={addRow}
          style={{
            padding: '0.5rem 1rem',
            background: 'var(--becode-primary)',
            color: '#fff',
            borderRadius: 'var(--becode-radius)',
            border: 'none',
            fontWeight: 600,
          }}
        >
          Pridať zamestnanca
        </button>
      </header>

      {loading && (
        <p style={{ marginBottom: '0.75rem', color: 'var(--becode-text-muted)', fontSize: '0.875rem' }}>
          Načítavam zamestnancov…
        </p>
      )}

      {showNewForm && (
        <section
          style={{
            marginBottom: '1.5rem',
            background: 'var(--becode-surface-elevated)',
            borderRadius: 'var(--becode-radius-lg)',
            border: '1px solid var(--becode-primary)',
            padding: '1.5rem',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}
        >
          <h2
            style={{
              fontSize: '0.95rem',
              marginBottom: '1rem',
              color: 'var(--becode-primary)',
              fontWeight: 600,
            }}
          >
            Nový zamestnanec
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
              gap: '0.75rem 1rem',
              marginBottom: '1rem',
            }}
          >
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem', color: 'var(--becode-text-muted)' }}>Meno</label>
              <input
                type="text"
                value={newEmp.first_name}
                onChange={(e) => setNewEmp((p) => ({ ...p, first_name: e.target.value }))}
                placeholder="Meno"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem', color: 'var(--becode-text-muted)' }}>Priezvisko</label>
              <input
                type="text"
                value={newEmp.last_name}
                onChange={(e) => setNewEmp((p) => ({ ...p, last_name: e.target.value }))}
                placeholder="Priezvisko"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem', color: 'var(--becode-text-muted)' }}>E‑mail</label>
              <input
                type="email"
                value={newEmp.email}
                onChange={(e) => setNewEmp((p) => ({ ...p, email: e.target.value }))}
                placeholder="email@firma.sk"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem', color: 'var(--becode-text-muted)' }}>Tel. číslo</label>
              <input
                type="tel"
                value={newEmp.phone}
                onChange={(e) => setNewEmp((p) => ({ ...p, phone: e.target.value }))}
                placeholder="+421 ..."
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem', color: 'var(--becode-text-muted)' }}>Hodinovka (€)</label>
              <input
                type="number"
                value={newEmp.hourly_rate || ''}
                onChange={(e) => setNewEmp((p) => ({ ...p, hourly_rate: Number(e.target.value) || 0 }))}
                placeholder="0"
                style={{ ...inputStyle, width: '100%' }}
              />
            </div>
          </div>
          {newError && (
            <p
              style={{
                marginBottom: '0.75rem',
                fontSize: '0.8rem',
                color: '#ff6b6b',
              }}
            >
              {newError}
            </p>
          )}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={saveNewEmployee}
              style={{
                padding: '0.5rem 1rem',
                background: savingNew ? 'var(--becode-primary-muted)' : 'var(--becode-primary)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--becode-radius)',
                fontWeight: 600,
                fontSize: '0.9rem',
              }}
            >
              Uložiť zamestnanca
            </button>
            <button
              type="button"
              onClick={() => { setShowNewForm(false); setNewEmp({ first_name: '', last_name: '', email: '', phone: '', hourly_rate: 0 }); }}
              style={{
                padding: '0.5rem 1rem',
                background: 'transparent',
                color: 'var(--becode-text-muted)',
                border: '1px solid var(--becode-border)',
                borderRadius: 'var(--becode-radius)',
                fontSize: '0.9rem',
              }}
            >
              Zrušiť
            </button>
          </div>
        </section>
      )}

      <section
        style={{
          marginBottom: '1.5rem',
          display: 'flex',
          gap: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            background: 'var(--becode-surface-elevated)',
            borderRadius: 'var(--becode-radius-lg)',
            border: '1px solid var(--becode-border)',
            padding: '1rem 1.25rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          }}
        >
          <p style={{ fontSize: '0.75rem', marginBottom: '0.25rem', color: 'var(--becode-text-muted)', fontWeight: 500 }}>Počet zamestnancov</p>
          <p style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--becode-text)' }}>{rows.length}</p>
        </div>
        <div
          style={{
            background: 'var(--becode-surface-elevated)',
            borderRadius: 'var(--becode-radius-lg)',
            border: '1px solid var(--becode-border)',
            padding: '1rem 1.25rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          }}
        >
          <p style={{ fontSize: '0.75rem', marginBottom: '0.25rem', color: 'var(--becode-text-muted)', fontWeight: 500 }}>Priemerná hodinovka</p>
          <p style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--becode-text)' }}>{avgRate.toFixed(2)} €</p>
        </div>
      </section>

      <section
        style={{
          background: 'var(--becode-surface-elevated)',
          borderRadius: 'var(--becode-radius-lg)',
          border: '1px solid var(--becode-border)',
          padding: '1.25rem',
          overflowX: 'auto',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        }}
      >
        <h2 style={{ fontSize: '0.95rem', marginBottom: '0.75rem', color: 'var(--becode-text-muted)', fontWeight: 500 }}>
          Zoznam zamestnancov
        </h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '0.5rem 0.6rem', color: 'var(--becode-text-muted)', fontWeight: 500, fontSize: '0.8rem' }}>Meno</th>
              <th style={{ textAlign: 'left', padding: '0.5rem 0.6rem', color: 'var(--becode-text-muted)', fontWeight: 500, fontSize: '0.8rem' }}>Priezvisko</th>
              <th style={{ textAlign: 'left', padding: '0.5rem 0.6rem', color: 'var(--becode-text-muted)', fontWeight: 500, fontSize: '0.8rem' }}>E‑mail</th>
              <th style={{ textAlign: 'left', padding: '0.5rem 0.6rem', color: 'var(--becode-text-muted)', fontWeight: 500, fontSize: '0.8rem' }}>Tel. číslo</th>
              <th style={{ textAlign: 'right', padding: '0.5rem 0.6rem', color: 'var(--becode-text-muted)', fontWeight: 500, fontSize: '0.8rem' }}>Hodinovka (€)</th>
              <th style={{ width: 120 }} />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !loading ? (
              <tr>
                <td colSpan={6} style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--becode-text-muted)', fontSize: '0.875rem' }}>
                  Zatiaľ žiadni zamestnanci. Klikni na „Pridať zamestnanca“.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} style={{ borderTop: '1px solid var(--becode-border)' }}>
                  <td style={{ padding: '0.5rem 0.6rem' }}>
                    <input type="text" value={row.first_name} onChange={(e) => updateRow(row.id, 'first_name', e.target.value)} placeholder="Meno" style={inputStyle} />
                  </td>
                  <td style={{ padding: '0.5rem 0.6rem' }}>
                    <input type="text" value={row.last_name} onChange={(e) => updateRow(row.id, 'last_name', e.target.value)} placeholder="Priezvisko" style={inputStyle} />
                  </td>
                  <td style={{ padding: '0.5rem 0.6rem' }}>
                    <input type="email" value={row.email} onChange={(e) => updateRow(row.id, 'email', e.target.value)} placeholder="email@firma.sk" style={inputStyle} />
                  </td>
                  <td style={{ padding: '0.5rem 0.6rem' }}>
                    <input type="tel" value={row.phone} onChange={(e) => updateRow(row.id, 'phone', e.target.value)} placeholder="+421 ..." style={inputStyle} />
                  </td>
                  <td style={{ padding: '0.5rem 0.6rem', textAlign: 'right' }}>
                    <input type="number" value={row.hourly_rate || ''} onChange={(e) => updateRow(row.id, 'hourly_rate', Number(e.target.value) || 0)} style={{ ...inputStyle, width: 70, textAlign: 'right' }} />
                  </td>
                  <td style={{ padding: '0.5rem 0.6rem' }}>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button type="button" onClick={() => saveRow(row)} disabled={savingId === row.id} style={{ padding: '0.35rem 0.7rem', background: 'var(--becode-primary)', color: '#fff', border: 'none', borderRadius: 'var(--becode-radius)', fontSize: '0.8rem', fontWeight: 500 }}>
                        {savingId === row.id ? '…' : 'Uložiť'}
                      </button>
                      <button type="button" onClick={() => removeRow(row.id)} style={{ padding: '0.35rem 0.7rem', background: 'transparent', border: '1px solid var(--becode-border)', borderRadius: 'var(--becode-radius)', color: 'var(--becode-text-muted)', fontSize: '0.8rem' }}>
                        Zmazať
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}

