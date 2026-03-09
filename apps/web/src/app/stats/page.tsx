'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase';

type Employee = {
  id: number;
  first_name: string;
  last_name: string;
  hourly_rate: number;
};

type TimeEntry = {
  id: number;
  employee_id: number;
  project_id: number | null;
  worked_hours: number;
  work_date: string; // ISO date string
};

type PeriodPreset = '7' | '30' | '90' | '365';

export default function StatsPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [period, setPeriod] = useState<PeriodPreset>('30');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [newEmployeeId, setNewEmployeeId] = useState<number | null>(null);
  const [newProjectId, setNewProjectId] = useState<string>('');
  const [newDate, setNewDate] = useState<string>('');
  const [newHours, setNewHours] = useState<string>('');

  useEffect(() => {
    const supabase = createClient();
    async function loadEmployees() {
      const { data, error } = await supabase
        .from('employees')
        .select('id, first_name, last_name, hourly_rate')
        .order('last_name', { ascending: true });
      if (error) {
        console.error('Chyba pri načítaní zamestnancov pre štatistiky:', error.message);
        setEmployees([]);
        setLoading(false);
        return;
      }
      const mapped: Employee[] =
        data?.map((e: any) => ({
          id: Number(e.id),
          first_name: e.first_name ?? '',
          last_name: e.last_name ?? '',
          hourly_rate: Number(e.hourly_rate ?? 0),
        })) ?? [];
      setEmployees(mapped);
      const firstId = mapped[0]?.id ?? null;
      setSelectedEmployeeId(firstId);
      setNewEmployeeId(firstId);
    }
    loadEmployees();
  }, []);

  useEffect(() => {
    if (!selectedEmployeeId) return;
    const supabase = createClient();
    async function loadEntries() {
      setLoading(true);
      const days = Number(period);
      const to = new Date();
      const from = new Date();
      from.setDate(to.getDate() - days + 1);
      const fromIso = from.toISOString().slice(0, 10);
      const toIso = to.toISOString().slice(0, 10);

      const { data, error } = await supabase
        .from('employee_time_entries')
        .select('id, employee_id, project_id, worked_hours, work_date')
        .eq('employee_id', selectedEmployeeId)
        .gte('work_date', fromIso)
        .lte('work_date', toIso)
        .order('work_date', { ascending: true });

      if (error) {
        console.error('Chyba pri načítaní výkazov hodín:', error.message);
        setEntries([]);
      } else {
        setEntries(
          (data ?? []).map((e: any) => ({
            id: Number(e.id),
            employee_id: Number(e.employee_id),
            project_id: e.project_id ? Number(e.project_id) : null,
            worked_hours: Number(e.worked_hours ?? 0),
            work_date: e.work_date,
          })),
        );
      }
      setLoading(false);
    }
    loadEntries();
  }, [selectedEmployeeId, period]);

  const selectedEmployee = useMemo(
    () => employees.find((e) => e.id === selectedEmployeeId) ?? null,
    [employees, selectedEmployeeId],
  );

  const stats = useMemo(() => {
    const totalHours = entries.reduce((sum, e) => sum + e.worked_hours, 0);
    const rate = selectedEmployee?.hourly_rate ?? 0;
    const totalEarnings = totalHours * rate;
    return { totalHours, rate, totalEarnings };
  }, [entries, selectedEmployee]);

  async function handleAddEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!newEmployeeId || !newDate || !newHours) return;
    const supabase = createClient();
    setSaving(true);
    const { error } = await supabase.from('employee_time_entries').insert({
      employee_id: newEmployeeId,
      project_id: newProjectId ? Number(newProjectId) : null,
      worked_hours: Number(newHours),
      work_date: newDate,
    });
    if (error) {
      console.error('Chyba pri pridaní výkazu hodín:', error.message);
      setSaving(false);
      return;
    }
    setNewHours('');
    setNewProjectId('');
    // znovu načítaj štatistiky
    if (newEmployeeId === selectedEmployeeId) {
      const days = Number(period);
      const to = new Date();
      const from = new Date();
      from.setDate(to.getDate() - days + 1);
      const fromIso = from.toISOString().slice(0, 10);
      const toIso = to.toISOString().slice(0, 10);
      const { data } = await supabase
        .from('employee_time_entries')
        .select('id, employee_id, project_id, worked_hours, work_date')
        .eq('employee_id', selectedEmployeeId)
        .gte('work_date', fromIso)
        .lte('work_date', toIso)
        .order('work_date', { ascending: true });
      setEntries(
        (data ?? []).map((e: any) => ({
          id: Number(e.id),
          employee_id: Number(e.employee_id),
          project_id: e.project_id ? Number(e.project_id) : null,
          worked_hours: Number(e.worked_hours ?? 0),
          work_date: e.work_date,
        })),
      );
    }
    setSaving(false);
  }

  return (
    <main
      style={{
        padding: '2rem',
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
          <h1 style={{ fontSize: '1.5rem' }}>Štatistiky zamestnancov</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--becode-text-muted)' }}>
            Sleduj odpracované hodiny a zárobok podľa obdobia.
          </p>
        </div>
        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
            alignItems: 'center',
          }}
        >
          <select
            value={selectedEmployeeId ?? ''}
            onChange={(e) => setSelectedEmployeeId(Number(e.target.value) || null)}
            style={{
              padding: '0.4rem 0.7rem',
              background: 'var(--becode-input-bg)',
              borderRadius: 'var(--becode-radius)',
              border: '1px solid var(--becode-border)',
              color: 'var(--becode-text)',
              minWidth: 180,
            }}
          >
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.first_name} {e.last_name}
              </option>
            ))}
          </select>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as PeriodPreset)}
            style={{
              padding: '0.4rem 0.7rem',
              background: 'var(--becode-input-bg)',
              borderRadius: 'var(--becode-radius)',
              border: '1px solid var(--becode-border)',
              color: 'var(--becode-text)',
            }}
          >
            <option value="7">Posledných 7 dní</option>
            <option value="30">Posledných 30 dní</option>
            <option value="90">Posledných 3 mesiace</option>
            <option value="365">Posledný rok</option>
          </select>
        </div>
      </header>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div
          style={{
            background: 'var(--becode-surface-elevated)',
            borderRadius: 'var(--becode-radius-lg)',
            border: '1px solid var(--becode-border)',
            padding: '1rem',
          }}
        >
          <h2 style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>Odpracované hodiny</h2>
          <p style={{ fontSize: '1.3rem', fontWeight: 600 }}>{stats.totalHours.toFixed(2)} h</p>
        </div>
        <div
          style={{
            background: 'var(--becode-surface-elevated)',
            borderRadius: 'var(--becode-radius-lg)',
            border: '1px solid var(--becode-border)',
            padding: '1rem',
          }}
        >
          <h2 style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>Hodinovka</h2>
          <p style={{ fontSize: '1.3rem', fontWeight: 600 }}>
            {stats.rate.toFixed(2)} € / h
          </p>
        </div>
        <div
          style={{
            background: 'var(--becode-surface-elevated)',
            borderRadius: 'var(--becode-radius-lg)',
            border: '1px solid var(--becode-border)',
            padding: '1rem',
          }}
        >
          <h2 style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>Zárobok za obdobie</h2>
          <p
            style={{
              fontSize: '1.3rem',
              fontWeight: 600,
              color: 'var(--becode-primary)',
            }}
          >
            {stats.totalEarnings.toFixed(2)} €
          </p>
        </div>
      </section>

      <section
        style={{
          marginBottom: '1.5rem',
          background: 'var(--becode-surface-elevated)',
          borderRadius: 'var(--becode-radius-lg)',
          border: '1px solid var(--becode-border)',
          padding: '1rem',
        }}
      >
        <h2 style={{ fontSize: '0.95rem', marginBottom: '0.75rem' }}>Pridať výkaz hodín</h2>
        <form
          onSubmit={handleAddEntry}
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.75rem',
            alignItems: 'flex-end',
          }}
        >
          <select
            value={newEmployeeId ?? ''}
            onChange={(e) => setNewEmployeeId(Number(e.target.value) || null)}
            style={{
              padding: '0.4rem 0.7rem',
              background: 'var(--becode-input-bg)',
              borderRadius: 'var(--becode-radius)',
              border: '1px solid var(--becode-border)',
              color: 'var(--becode-text)',
              minWidth: 180,
            }}
          >
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.first_name} {e.last_name}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            style={{
              padding: '0.4rem 0.7rem',
              background: 'var(--becode-input-bg)',
              borderRadius: 'var(--becode-radius)',
              border: '1px solid var(--becode-border)',
              color: 'var(--becode-text)',
            }}
          />
          <input
            type="number"
            value={newHours}
            onChange={(e) => setNewHours(e.target.value)}
            placeholder="Hodiny"
            step="0.25"
            style={{
              padding: '0.4rem 0.7rem',
              background: 'var(--becode-input-bg)',
              borderRadius: 'var(--becode-radius)',
              border: '1px solid var(--becode-border)',
              color: 'var(--becode-text)',
              width: 110,
            }}
          />
          <input
            type="number"
            value={newProjectId}
            onChange={(e) => setNewProjectId(e.target.value)}
            placeholder="ID projektu (voliteľné)"
            style={{
              padding: '0.4rem 0.7rem',
              background: 'var(--becode-input-bg)',
              borderRadius: 'var(--becode-radius)',
              border: '1px solid var(--becode-border)',
              color: 'var(--becode-text)',
              minWidth: 160,
            }}
          />
          <button
            type="submit"
            disabled={!newEmployeeId || !newDate || !newHours || saving}
            style={{
              padding: '0.45rem 1rem',
              background: 'var(--becode-primary)',
              color: '#fff',
              borderRadius: 'var(--becode-radius)',
              border: 'none',
              fontWeight: 600,
            }}
          >
            {saving ? 'Ukladám…' : 'Uložiť výkaz'}
          </button>
        </form>
      </section>

      <section
        style={{
          background: 'var(--becode-surface-elevated)',
          borderRadius: 'var(--becode-radius-lg)',
          border: '1px solid var(--becode-border)',
          padding: '1rem',
          overflowX: 'auto',
        }}
      >
        <h2 style={{ fontSize: '0.95rem', marginBottom: '0.5rem' }}>Výkazy za zvolené obdobie</h2>
        {loading ? (
          <p style={{ fontSize: '0.875rem', color: 'var(--becode-text-muted)' }}>
            Načítavam výkazy…
          </p>
        ) : entries.length === 0 ? (
          <p style={{ fontSize: '0.875rem', color: 'var(--becode-text-muted)' }}>
            Zatiaľ žiadne výkazy pre toto obdobie.
          </p>
        ) : (
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '0.85rem',
            }}
          >
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '0.4rem' }}>Dátum</th>
                <th style={{ textAlign: 'right', padding: '0.4rem' }}>Projekt ID</th>
                <th style={{ textAlign: 'right', padding: '0.4rem' }}>Hodiny</th>
                <th style={{ textAlign: 'right', padding: '0.4rem' }}>Zárobok (€)</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td
                    style={{
                      padding: '0.4rem',
                      borderTop: '1px solid var(--becode-border)',
                    }}
                  >
                    {entry.work_date}
                  </td>
                  <td
                    style={{
                      padding: '0.4rem',
                      borderTop: '1px solid var(--becode-border)',
                      textAlign: 'right',
                    }}
                  >
                    {entry.project_id ?? '—'}
                  </td>
                  <td
                    style={{
                      padding: '0.4rem',
                      borderTop: '1px solid var(--becode-border)',
                      textAlign: 'right',
                    }}
                  >
                    {entry.worked_hours.toFixed(2)}
                  </td>
                  <td
                    style={{
                      padding: '0.4rem',
                      borderTop: '1px solid var(--becode-border)',
                      textAlign: 'right',
                    }}
                  >
                    {(entry.worked_hours * (selectedEmployee?.hourly_rate ?? 0)).toFixed(2)} €
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}

