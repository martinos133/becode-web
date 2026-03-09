'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { ConfirmModal } from '@/components/ConfirmModal';

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
  padding: '0.55rem 0.8rem',
  background: 'var(--becode-input-bg)',
  borderRadius: 'var(--becode-radius)',
  border: '1px solid var(--becode-border)',
  color: 'var(--becode-text)',
  fontSize: '0.9rem',
  outline: 'none',
  transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
} as const;

export default function EmployeesPage() {
  const [rows, setRows] = useState<EmployeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [savingNew, setSavingNew] = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingSnapshot, setEditingSnapshot] = useState<EmployeeRow | null>(null);
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

  function startEditing(row: EmployeeRow) {
    setEditingId(row.id);
    setEditingSnapshot({ ...row });
  }

  function cancelEditing() {
    if (editingId !== null && editingSnapshot !== null) {
      setRows((prev) =>
        prev.map((r) => (r.id === editingId ? { ...editingSnapshot } : r))
      );
    }
    setEditingId(null);
    setEditingSnapshot(null);
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
    setEditingId(null);
    setEditingSnapshot(null);
    if (error) console.error('Chyba pri ukladaní:', error.message);
    else void loadEmployees();
  }

  function addRow() {
    setShowNewForm(true);
  }

  function removeRow(id: number) {
    setDeleteConfirmId(id);
  }

  function confirmDelete() {
    if (deleteConfirmId === null) return;
    setRows((prev) => prev.filter((r) => r.id !== deleteConfirmId));
    void deleteRow(deleteConfirmId);
    void loadEmployees();
    setDeleteConfirmId(null);
  }

  return (
    <main
      className="becode-page-padding"
      style={{
        padding: '1.5rem 2rem',
        width: '100%',
        maxWidth: '100%',
        margin: 0,
      }}
    >
      <header
        className="becode-header-flex"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.75rem',
          gap: '1rem',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 600 }}>Zamestnanci</h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--becode-text-muted)', marginTop: '0.25rem' }}>
            Meno, kontakt a hodinovka pre výpočet nákladov na projekty.
          </p>
        </div>
        <button
          type="button"
          className="employees-add-btn"
          onClick={addRow}
          style={{
            padding: '0.5rem 1.25rem',
            background: 'var(--becode-primary)',
            color: '#fff',
            borderRadius: 'var(--becode-radius)',
            border: 'none',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background 0.15s ease',
          }}
          onMouseOver={(e) => { e.currentTarget.style.background = 'var(--becode-primary-hover)'; }}
          onMouseOut={(e) => { e.currentTarget.style.background = 'var(--becode-primary)'; }}
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
            border: '1px solid var(--becode-border)',
            padding: '1.25rem 1.5rem',
          }}
        >
          <h2
            style={{
              fontSize: '1rem',
              marginBottom: '1.25rem',
              color: 'var(--becode-text)',
              fontWeight: 600,
            }}
          >
            Nový zamestnanec
          </h2>
          <div
            className="new-employee-fields"
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
              disabled={savingNew}
              style={{
                padding: '0.5rem 1.25rem',
                background: savingNew ? 'var(--becode-primary-muted)' : 'var(--becode-primary)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--becode-radius)',
                fontWeight: 600,
                fontSize: '0.9rem',
                cursor: savingNew ? 'not-allowed' : 'pointer',
              }}
            >
              Uložiť zamestnanca
            </button>
            <button
              type="button"
              onClick={() => { setShowNewForm(false); setNewEmp({ first_name: '', last_name: '', email: '', phone: '', hourly_rate: 0 }); setNewError(null); }}
              style={{
                padding: '0.5rem 1.25rem',
                background: 'transparent',
                color: 'var(--becode-text-muted)',
                border: '1px solid var(--becode-border)',
                borderRadius: 'var(--becode-radius)',
                fontSize: '0.9rem',
                cursor: 'pointer',
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
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
        }}
      >
        <div
          style={{
            background: 'var(--becode-surface-elevated)',
            borderRadius: 'var(--becode-radius-lg)',
            border: '1px solid var(--becode-border)',
            padding: '1.25rem 1.5rem',
          }}
        >
          <p style={{ fontSize: '0.8rem', marginBottom: '0.5rem', color: 'var(--becode-text-muted)', fontWeight: 500 }}>Počet zamestnancov</p>
          <p style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--becode-text)' }}>{rows.length}</p>
        </div>
        <div
          style={{
            background: 'var(--becode-surface-elevated)',
            borderRadius: 'var(--becode-radius-lg)',
            border: '1px solid var(--becode-border)',
            padding: '1.25rem 1.5rem',
          }}
        >
          <p style={{ fontSize: '0.8rem', marginBottom: '0.5rem', color: 'var(--becode-text-muted)', fontWeight: 500 }}>Priemerná hodinovka</p>
          <p style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--becode-primary)' }}>{avgRate.toFixed(2)} € / h</p>
        </div>
      </section>

      <section
        style={{
          background: 'var(--becode-surface-elevated)',
          borderRadius: 'var(--becode-radius-lg)',
          border: '1px solid var(--becode-border)',
          padding: '1rem 1.25rem',
        }}
      >
        <h2 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--becode-text)', fontWeight: 600 }}>
          Zoznam zamestnancov
        </h2>

        {/* Mobil – karty */}
        <div className="employees-mobile-cards">
          {rows.length === 0 && !loading ? (
            <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--becode-text-muted)', fontSize: '0.9rem' }}>
              Zatiaľ žiadni zamestnanci. Klikni na „Pridať zamestnanca“.
            </p>
          ) : (
            rows.map((row) => {
              const isEditing = editingId === row.id;
              const cardStyle = {
                background: isEditing ? 'var(--becode-primary-muted)' : 'var(--becode-surface)',
                borderRadius: 'var(--becode-radius-lg)',
                border: '1px solid var(--becode-border)',
                padding: '1.25rem',
                marginBottom: '1rem',
              };
              const fieldStyle = { marginBottom: '1rem' };
              const labelStyle = { display: 'block', marginBottom: '0.35rem', fontSize: '0.75rem', color: 'var(--becode-text-muted)', fontWeight: 500 } as const;
              return (
                <div key={row.id} style={cardStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1rem', fontWeight: 600 }}>
                      {row.first_name || row.last_name ? `${row.first_name} ${row.last_name}`.trim() : `Zamestnanec #${row.id}`}
                    </span>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {isEditing ? (
                        <>
                          <button
                            type="button"
                            onClick={() => saveRow(row)}
                            disabled={savingId === row.id}
                            style={{
                              padding: '0.5rem 1rem',
                              background: 'var(--becode-primary)',
                              color: '#fff',
                              border: 'none',
                              borderRadius: 'var(--becode-radius)',
                              fontSize: '0.9rem',
                              fontWeight: 500,
                              cursor: savingId === row.id ? 'wait' : 'pointer',
                            }}
                          >
                            {savingId === row.id ? '…' : 'Uložiť'}
                          </button>
                          <button
                            type="button"
                            onClick={cancelEditing}
                            style={{
                              padding: '0.5rem 1rem',
                              background: 'transparent',
                              border: '1px solid var(--becode-border)',
                              borderRadius: 'var(--becode-radius)',
                              color: 'var(--becode-text-muted)',
                              fontSize: '0.9rem',
                              cursor: 'pointer',
                            }}
                          >
                            Zrušiť
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startEditing(row)}
                          style={{
                            padding: '0.5rem 1rem',
                            background: 'var(--becode-primary)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 'var(--becode-radius)',
                            fontSize: '0.9rem',
                            fontWeight: 500,
                            cursor: 'pointer',
                          }}
                        >
                          Upraviť
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => removeRow(row.id)}
                        disabled={isEditing}
                        style={{
                          padding: '0.5rem 1rem',
                          background: 'transparent',
                          border: '1px solid var(--becode-border)',
                          borderRadius: 'var(--becode-radius)',
                          color: 'var(--becode-error-text)',
                          fontSize: '0.9rem',
                          cursor: isEditing ? 'not-allowed' : 'pointer',
                          opacity: isEditing ? 0.5 : 1,
                        }}
                      >
                        Zmazať
                      </button>
                    </div>
                  </div>
                  <div style={fieldStyle}>
                    <label style={labelStyle}>Meno</label>
                    {isEditing ? (
                      <input type="text" value={row.first_name} onChange={(e) => updateRow(row.id, 'first_name', e.target.value)} placeholder="Meno" style={inputStyle} />
                    ) : (
                      <p style={{ margin: 0, color: 'var(--becode-text)' }}>{row.first_name || '–'}</p>
                    )}
                  </div>
                  <div style={fieldStyle}>
                    <label style={labelStyle}>Priezvisko</label>
                    {isEditing ? (
                      <input type="text" value={row.last_name} onChange={(e) => updateRow(row.id, 'last_name', e.target.value)} placeholder="Priezvisko" style={inputStyle} />
                    ) : (
                      <p style={{ margin: 0, color: 'var(--becode-text)' }}>{row.last_name || '–'}</p>
                    )}
                  </div>
                  <div style={fieldStyle}>
                    <label style={labelStyle}>E‑mail</label>
                    {isEditing ? (
                      <input type="email" value={row.email} onChange={(e) => updateRow(row.id, 'email', e.target.value)} placeholder="email@firma.sk" style={inputStyle} />
                    ) : (
                      <p style={{ margin: 0, color: 'var(--becode-text-muted)' }}>{row.email || '–'}</p>
                    )}
                  </div>
                  <div style={fieldStyle}>
                    <label style={labelStyle}>Tel. číslo</label>
                    {isEditing ? (
                      <input type="tel" value={row.phone} onChange={(e) => updateRow(row.id, 'phone', e.target.value)} placeholder="+421 ..." style={inputStyle} />
                    ) : (
                      <p style={{ margin: 0, color: 'var(--becode-text-muted)', wordBreak: 'break-all' }}>{row.phone || '–'}</p>
                    )}
                  </div>
                  <div style={fieldStyle}>
                    <label style={labelStyle}>Hodinovka (€)</label>
                    {isEditing ? (
                      <input type="number" value={row.hourly_rate || ''} onChange={(e) => updateRow(row.id, 'hourly_rate', Number(e.target.value) || 0)} style={{ ...inputStyle, textAlign: 'right' }} />
                    ) : (
                      <p style={{ margin: 0, color: 'var(--becode-primary)', fontWeight: 600, fontSize: '1.1rem' }}>{row.hourly_rate ? `${row.hourly_rate} €` : '–'}</p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop – tabuľka */}
        <div className="employees-desktop-table becode-table-scroll" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '0.75rem 0.6rem', borderBottom: '1px solid var(--becode-border)', color: 'var(--becode-text-muted)', fontWeight: 500, fontSize: '0.8rem' }}>Meno</th>
              <th style={{ textAlign: 'left', padding: '0.75rem 0.6rem', borderBottom: '1px solid var(--becode-border)', color: 'var(--becode-text-muted)', fontWeight: 500, fontSize: '0.8rem' }}>Priezvisko</th>
              <th style={{ textAlign: 'left', padding: '0.75rem 0.6rem', borderBottom: '1px solid var(--becode-border)', color: 'var(--becode-text-muted)', fontWeight: 500, fontSize: '0.8rem' }}>E‑mail</th>
              <th style={{ textAlign: 'left', padding: '0.75rem 0.6rem', borderBottom: '1px solid var(--becode-border)', color: 'var(--becode-text-muted)', fontWeight: 500, fontSize: '0.8rem', minWidth: 120 }}>Tel. číslo</th>
              <th style={{ textAlign: 'right', padding: '0.75rem 0.6rem', borderBottom: '1px solid var(--becode-border)', color: 'var(--becode-text-muted)', fontWeight: 500, fontSize: '0.8rem' }}>Hodinovka (€)</th>
              <th style={{ width: 200, padding: '0.75rem 0.6rem', borderBottom: '1px solid var(--becode-border)' }} />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !loading ? (
              <tr>
                <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--becode-text-muted)', fontSize: '0.9rem' }}>
                  Zatiaľ žiadni zamestnanci. Klikni na „Pridať zamestnanca“.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const isEditing = editingId === row.id;
                return (
                  <tr
                    key={row.id}
                    style={{
                      borderTop: '1px solid var(--becode-border)',
                      background: isEditing ? 'var(--becode-primary-muted)' : undefined,
                    }}
                  >
                    <td style={{ padding: '0.75rem 0.6rem' }}>
                      {isEditing ? (
                        <input
                          type="text"
                          value={row.first_name}
                          onChange={(e) => updateRow(row.id, 'first_name', e.target.value)}
                          placeholder="Meno"
                          style={inputStyle}
                        />
                      ) : (
                        <span style={{ color: 'var(--becode-text)' }}>{row.first_name || '–'}</span>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem 0.6rem' }}>
                      {isEditing ? (
                        <input
                          type="text"
                          value={row.last_name}
                          onChange={(e) => updateRow(row.id, 'last_name', e.target.value)}
                          placeholder="Priezvisko"
                          style={inputStyle}
                        />
                      ) : (
                        <span style={{ color: 'var(--becode-text)' }}>{row.last_name || '–'}</span>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem 0.6rem' }}>
                      {isEditing ? (
                        <input
                          type="email"
                          value={row.email}
                          onChange={(e) => updateRow(row.id, 'email', e.target.value)}
                          placeholder="email@firma.sk"
                          style={inputStyle}
                        />
                      ) : (
                        <span style={{ color: 'var(--becode-text-muted)' }}>{row.email || '–'}</span>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem 0.6rem', minWidth: 120 }}>
                      {isEditing ? (
                        <input
                          type="tel"
                          value={row.phone}
                          onChange={(e) => updateRow(row.id, 'phone', e.target.value)}
                          placeholder="+421 ..."
                          style={inputStyle}
                        />
                      ) : (
                        <span style={{ color: 'var(--becode-text-muted)', whiteSpace: 'nowrap' }}>{row.phone || '–'}</span>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem 0.6rem', textAlign: 'right' }}>
                      {isEditing ? (
                        <input
                          type="number"
                          value={row.hourly_rate || ''}
                          onChange={(e) =>
                            updateRow(row.id, 'hourly_rate', Number(e.target.value) || 0)
                          }
                          style={{ ...inputStyle, width: 80, textAlign: 'right' }}
                        />
                      ) : (
                        <span style={{ color: 'var(--becode-primary)', fontWeight: 500 }}>
                          {row.hourly_rate ? `${row.hourly_rate} €` : '–'}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem 0.6rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              onClick={() => saveRow(row)}
                              disabled={savingId === row.id}
                              style={{
                                padding: '0.4rem 0.85rem',
                                background: 'var(--becode-primary)',
                                color: '#fff',
                                border: 'none',
                                borderRadius: 'var(--becode-radius)',
                                fontSize: '0.85rem',
                                fontWeight: 500,
                                cursor: savingId === row.id ? 'wait' : 'pointer',
                                transition: 'background 0.15s ease',
                              }}
                            >
                              {savingId === row.id ? '…' : 'Uložiť'}
                            </button>
                            <button
                              type="button"
                              onClick={cancelEditing}
                              style={{
                                padding: '0.4rem 0.85rem',
                                background: 'transparent',
                                border: '1px solid var(--becode-border)',
                                borderRadius: 'var(--becode-radius)',
                                color: 'var(--becode-text-muted)',
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                              }}
                            >
                              Zrušiť
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => startEditing(row)}
                            style={{
                              padding: '0.4rem 0.85rem',
                              background: 'var(--becode-primary)',
                              color: '#fff',
                              border: 'none',
                              borderRadius: 'var(--becode-radius)',
                              fontSize: '0.85rem',
                              fontWeight: 500,
                              cursor: 'pointer',
                              transition: 'background 0.15s ease',
                            }}
                          >
                            Upraviť
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => removeRow(row.id)}
                          disabled={isEditing}
                          style={{
                            padding: '0.4rem 0.85rem',
                            background: 'transparent',
                            border: '1px solid var(--becode-border)',
                            borderRadius: 'var(--becode-radius)',
                            color: 'var(--becode-text-muted)',
                            fontSize: '0.85rem',
                            cursor: isEditing ? 'not-allowed' : 'pointer',
                            opacity: isEditing ? 0.5 : 1,
                            transition: 'border-color 0.15s ease, color 0.15s ease',
                          }}
                          onMouseOver={(e) => {
                            if (!isEditing) {
                              e.currentTarget.style.borderColor = 'var(--becode-error-text)';
                              e.currentTarget.style.color = 'var(--becode-error-text)';
                            }
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.borderColor = 'var(--becode-border)';
                            e.currentTarget.style.color = 'var(--becode-text-muted)';
                          }}
                        >
                          Zmazať
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        </div>
      </section>

      <ConfirmModal
        open={deleteConfirmId !== null}
        title="Zmazať zamestnanca"
        message="Naozaj chcete zmazať tohto zamestnanca? Táto akcia sa nedá vrátiť späť."
        confirmLabel="Zmazať"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirmId(null)}
      />
    </main>
  );
}

