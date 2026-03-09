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
  work_date: string;
};

type Project = {
  id: number;
  project: string;
  project_date: string | null;
  amount_without_vat: number;
  cost: number;
  total_hours: number;
};

type PeriodPreset = '7' | '30' | '90' | '365';

export default function StatsPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
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
        console.error('Chyba pri načítaní zamestnancov:', error.message);
        setEmployees([]);
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
    const supabase = createClient();
    async function loadProjects() {
      const { data, error } = await supabase
        .from('projects')
        .select('id, project, project_date, amount_without_vat, cost, total_hours')
        .order('id', { ascending: false });
      if (error) {
        console.error('Chyba pri načítaní projektov:', error.message);
        setProjects([]);
        return;
      }
      setProjects(
        (data ?? []).map((p: any) => ({
          id: Number(p.id),
          project: p.project ?? '',
          project_date: p.project_date ?? null,
          amount_without_vat: Number(p.amount_without_vat ?? 0),
          cost: Number(p.cost ?? 0),
          total_hours: Number(p.total_hours ?? 0),
        }))
      );
    }
    loadProjects();
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
          }))
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

  const projectStats = useMemo(() => {
    const revenue = projects.reduce((s, p) => s + p.amount_without_vat, 0);
    const cost = projects.reduce((s, p) => s + p.cost, 0);
    const profit = revenue - cost;
    const totalHours = projects.reduce((s, p) => s + p.total_hours, 0);
    return { revenue, cost, profit, totalHours, count: projects.length };
  }, [projects]);

  const employeeStats = useMemo(() => {
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

  const cardStyle = {
    background: 'var(--becode-surface-elevated)',
    borderRadius: 'var(--becode-radius-lg)',
    border: '1px solid var(--becode-border)',
    padding: '1.25rem',
  };

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
      <header className="becode-header-flex" style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 600 }}>Štatistiky</h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--becode-text-muted)', marginTop: '0.25rem' }}>
          Súhrn projektov, zamestnancov a výkazov hodín.
        </p>
      </header>

      {/* Súhrn projektov */}
      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem', fontWeight: 600 }}>
          Súhrn projektov
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1rem',
          }}
        >
          <div style={cardStyle}>
            <h3 style={{ fontSize: '0.8rem', color: 'var(--becode-text-muted)', marginBottom: '0.5rem' }}>
              Počet projektov
            </h3>
            <p style={{ fontSize: '1.5rem', fontWeight: 600 }}>{projectStats.count}</p>
          </div>
          <div style={cardStyle}>
            <h3 style={{ fontSize: '0.8rem', color: 'var(--becode-text-muted)', marginBottom: '0.5rem' }}>
              Počet zamestnancov
            </h3>
            <p style={{ fontSize: '1.5rem', fontWeight: 600 }}>{employees.length}</p>
          </div>
          <div style={cardStyle}>
            <h3 style={{ fontSize: '0.8rem', color: 'var(--becode-text-muted)', marginBottom: '0.5rem' }}>
              Príjmy (bez DPH)
            </h3>
            <p style={{ fontSize: '1.5rem', fontWeight: 600 }}>
              {projectStats.revenue.toFixed(2)} €
            </p>
          </div>
          <div style={cardStyle}>
            <h3 style={{ fontSize: '0.8rem', color: 'var(--becode-text-muted)', marginBottom: '0.5rem' }}>
              Náklady
            </h3>
            <p style={{ fontSize: '1.5rem', fontWeight: 600 }}>
              {projectStats.cost.toFixed(2)} €
            </p>
          </div>
          <div style={cardStyle}>
            <h3 style={{ fontSize: '0.8rem', color: 'var(--becode-text-muted)', marginBottom: '0.5rem' }}>
              Čistý zisk
            </h3>
            <p
              style={{
                fontSize: '1.5rem',
                fontWeight: 600,
                color: projectStats.profit >= 0 ? 'var(--becode-primary)' : 'var(--becode-error-text)',
              }}
            >
              {projectStats.profit.toFixed(2)} €
            </p>
          </div>
          <div style={cardStyle}>
            <h3 style={{ fontSize: '0.8rem', color: 'var(--becode-text-muted)', marginBottom: '0.5rem' }}>
              Celkové hodiny
            </h3>
            <p style={{ fontSize: '1.5rem', fontWeight: 600 }}>
              {projectStats.totalHours.toFixed(1)} h
            </p>
          </div>
        </div>
      </section>

      {/* Štatistiky projektov – tabuľka */}
      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem', fontWeight: 600 }}>
          Projekty – detail
        </h2>
        <div
          style={{
            ...cardStyle,
            overflowX: 'auto',
          }}
        >
          {projects.length === 0 ? (
            <p style={{ fontSize: '0.9rem', color: 'var(--becode-text-muted)' }}>
              Zatiaľ žiadne projekty.
            </p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '0.6rem', borderBottom: '1px solid var(--becode-border)', color: 'var(--becode-text-muted)' }}>ID</th>
                  <th style={{ textAlign: 'left', padding: '0.6rem', borderBottom: '1px solid var(--becode-border)', color: 'var(--becode-text-muted)' }}>Názov</th>
                  <th style={{ textAlign: 'left', padding: '0.6rem', borderBottom: '1px solid var(--becode-border)', color: 'var(--becode-text-muted)' }}>Dátum</th>
                  <th style={{ textAlign: 'right', padding: '0.6rem', borderBottom: '1px solid var(--becode-border)', color: 'var(--becode-text-muted)' }}>Príjmy (€)</th>
                  <th style={{ textAlign: 'right', padding: '0.6rem', borderBottom: '1px solid var(--becode-border)', color: 'var(--becode-text-muted)' }}>Náklady (€)</th>
                  <th style={{ textAlign: 'right', padding: '0.6rem', borderBottom: '1px solid var(--becode-border)', color: 'var(--becode-text-muted)' }}>Zisk (€)</th>
                  <th style={{ textAlign: 'right', padding: '0.6rem', borderBottom: '1px solid var(--becode-border)', color: 'var(--becode-text-muted)' }}>Hodiny</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => {
                  const profit = p.amount_without_vat - p.cost;
                  return (
                    <tr key={p.id}>
                      <td style={{ padding: '0.6rem', borderTop: '1px solid var(--becode-border)' }}>{p.id}</td>
                      <td style={{ padding: '0.6rem', borderTop: '1px solid var(--becode-border)' }}>{p.project || '—'}</td>
                      <td style={{ padding: '0.6rem', borderTop: '1px solid var(--becode-border)' }}>{p.project_date ?? '—'}</td>
                      <td style={{ padding: '0.6rem', borderTop: '1px solid var(--becode-border)', textAlign: 'right' }}>{p.amount_without_vat.toFixed(2)}</td>
                      <td style={{ padding: '0.6rem', borderTop: '1px solid var(--becode-border)', textAlign: 'right' }}>{p.cost.toFixed(2)}</td>
                      <td
                        style={{
                          padding: '0.6rem',
                          borderTop: '1px solid var(--becode-border)',
                          textAlign: 'right',
                          color: profit >= 0 ? 'var(--becode-primary)' : 'var(--becode-error-text)',
                          fontWeight: 500,
                        }}
                      >
                        {profit.toFixed(2)}
                      </td>
                      <td style={{ padding: '0.6rem', borderTop: '1px solid var(--becode-border)', textAlign: 'right' }}>{p.total_hours.toFixed(1)} h</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Štatistiky zamestnancov */}
      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem', fontWeight: 600 }}>
          Štatistiky zamestnancov
        </h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--becode-text-muted)', marginBottom: '1rem' }}>
          Sleduj odpracované hodiny a zárobok podľa obdobia (výkazy hodín).
        </p>
        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
            alignItems: 'center',
            marginBottom: '1rem',
          }}
        >
          <select
            value={selectedEmployeeId ?? ''}
            onChange={(e) => setSelectedEmployeeId(Number(e.target.value) || null)}
            style={{
              padding: '0.5rem 0.85rem',
              background: 'var(--becode-input-bg)',
              borderRadius: 'var(--becode-radius)',
              border: '1px solid var(--becode-border)',
              color: 'var(--becode-text)',
              minWidth: 200,
              fontSize: '0.9rem',
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
              padding: '0.5rem 0.85rem',
              background: 'var(--becode-input-bg)',
              borderRadius: 'var(--becode-radius)',
              border: '1px solid var(--becode-border)',
              color: 'var(--becode-text)',
              fontSize: '0.9rem',
            }}
          >
            <option value="7">Posledných 7 dní</option>
            <option value="30">Posledných 30 dní</option>
            <option value="90">Posledných 3 mesiace</option>
            <option value="365">Posledný rok</option>
          </select>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginBottom: '1.5rem',
          }}
        >
          <div style={cardStyle}>
            <h3 style={{ fontSize: '0.8rem', color: 'var(--becode-text-muted)', marginBottom: '0.5rem' }}>Odpracované hodiny</h3>
            <p style={{ fontSize: '1.35rem', fontWeight: 600 }}>{employeeStats.totalHours.toFixed(2)} h</p>
          </div>
          <div style={cardStyle}>
            <h3 style={{ fontSize: '0.8rem', color: 'var(--becode-text-muted)', marginBottom: '0.5rem' }}>Hodinovka</h3>
            <p style={{ fontSize: '1.35rem', fontWeight: 600 }}>{employeeStats.rate.toFixed(2)} € / h</p>
          </div>
          <div style={cardStyle}>
            <h3 style={{ fontSize: '0.8rem', color: 'var(--becode-text-muted)', marginBottom: '0.5rem' }}>Zárobok za obdobie</h3>
            <p style={{ fontSize: '1.35rem', fontWeight: 600, color: 'var(--becode-primary)' }}>
              {employeeStats.totalEarnings.toFixed(2)} €
            </p>
          </div>
        </div>

        <div style={{ ...cardStyle, marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '0.95rem', marginBottom: '0.75rem' }}>Pridať výkaz hodín</h3>
          <form
            onSubmit={handleAddEntry}
            style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'flex-end' }}
          >
            <select
              value={newEmployeeId ?? ''}
              onChange={(e) => setNewEmployeeId(Number(e.target.value) || null)}
              style={{
                padding: '0.5rem 0.85rem',
                background: 'var(--becode-input-bg)',
                borderRadius: 'var(--becode-radius)',
                border: '1px solid var(--becode-border)',
                color: 'var(--becode-text)',
                minWidth: 200,
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
                padding: '0.5rem 0.85rem',
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
                padding: '0.5rem 0.85rem',
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
                padding: '0.5rem 0.85rem',
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
                padding: '0.5rem 1.25rem',
                background: 'var(--becode-primary)',
                color: '#fff',
                borderRadius: 'var(--becode-radius)',
                border: 'none',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {saving ? 'Ukladám…' : 'Uložiť výkaz'}
            </button>
          </form>
        </div>

        <div style={{ ...cardStyle, overflowX: 'auto' }}>
          <h3 style={{ fontSize: '0.95rem', marginBottom: '0.5rem' }}>Výkazy za zvolené obdobie</h3>
          {loading ? (
            <p style={{ fontSize: '0.875rem', color: 'var(--becode-text-muted)' }}>Načítavam výkazy…</p>
          ) : entries.length === 0 ? (
            <p style={{ fontSize: '0.875rem', color: 'var(--becode-text-muted)' }}>
              Zatiaľ žiadne výkazy pre toto obdobie.
            </p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid var(--becode-border)', color: 'var(--becode-text-muted)' }}>Dátum</th>
                  <th style={{ textAlign: 'right', padding: '0.5rem', borderBottom: '1px solid var(--becode-border)', color: 'var(--becode-text-muted)' }}>Projekt ID</th>
                  <th style={{ textAlign: 'right', padding: '0.5rem', borderBottom: '1px solid var(--becode-border)', color: 'var(--becode-text-muted)' }}>Hodiny</th>
                  <th style={{ textAlign: 'right', padding: '0.5rem', borderBottom: '1px solid var(--becode-border)', color: 'var(--becode-text-muted)' }}>Zárobok (€)</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td style={{ padding: '0.5rem', borderTop: '1px solid var(--becode-border)' }}>{entry.work_date}</td>
                    <td style={{ padding: '0.5rem', borderTop: '1px solid var(--becode-border)', textAlign: 'right' }}>
                      {entry.project_id ?? '—'}
                    </td>
                    <td style={{ padding: '0.5rem', borderTop: '1px solid var(--becode-border)', textAlign: 'right' }}>
                      {entry.worked_hours.toFixed(2)}
                    </td>
                    <td style={{ padding: '0.5rem', borderTop: '1px solid var(--becode-border)', textAlign: 'right' }}>
                      {(entry.worked_hours * (selectedEmployee?.hourly_rate ?? 0)).toFixed(2)} €
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </main>
  );
}
