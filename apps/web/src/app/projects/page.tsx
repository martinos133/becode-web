'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { ConfirmModal } from '@/components/ConfirmModal';

/** Fixné kategórie – zisk sa delí rovnomerne /3 */
const CATEGORIES = [
  { key: 'beCode' as const, label: 'BeCode' },
  { key: 'vlado' as const, label: 'Vlado' },
  { key: 'mato' as const, label: 'Maťo' },
];

type EmployeeOption = { id: number; label: string; hourlyRate: number };

type ProjectEmployee = { employeeId: number; hours: number };

type Row = {
  id: number;
  project: string;
  projectDate: string;
  amountWithoutVat: number;
  manualCost: number;
  projectEmployees: ProjectEmployee[];
};

const inputBase = {
  padding: '0.6rem 0.85rem',
  background: 'var(--becode-input-bg)',
  borderRadius: 'var(--becode-radius)',
  border: '1px solid var(--becode-border)',
  color: 'var(--becode-text)',
  fontSize: '0.95rem',
  transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
  width: '100%',
  maxWidth: '100%',
  boxSizing: 'border-box',
} as const;

export default function ProjectsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [nextId, setNextId] = useState(1);
  const [loading, setLoading] = useState(true);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  useEffect(() => {
    const supabase = createClient();
    async function loadEmployees() {
      const { data } = await supabase
        .from('employees')
        .select('id, first_name, last_name, hourly_rate')
        .order('first_name');
      const opts: EmployeeOption[] = (data ?? []).map((e: any) => ({
        id: Number(e.id),
        label: [e.first_name, e.last_name].filter(Boolean).join(' ') || `Zamestnanec #${e.id}`,
        hourlyRate: Number(e.hourly_rate ?? 0),
      }));
      setEmployees(opts);
    }
    loadEmployees();
  }, []);

  useEffect(() => {
    const supabase = createClient();
    async function load() {
      setLoading(true);
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('id, project, project_date, amount_without_vat, cost, manual_cost')
        .order('id', { ascending: true });
      if (projectsError) {
        console.error('Chyba pri načítaní projektov z DB:', projectsError.message);
        setRows([]);
        setLoading(false);
        return;
      }
      const projectIds = (projectsData ?? []).map((p: any) => Number(p.id));
      let projectEmployeesByProject: Record<number, ProjectEmployee[]> = {};
      if (projectIds.length > 0) {
        const { data: peData } = await supabase
          .from('project_employees')
          .select('project_id, employee_id, worked_hours')
          .in('project_id', projectIds);
        (peData ?? []).forEach((pe: any) => {
          const pid = Number(pe.project_id);
          if (!projectEmployeesByProject[pid]) projectEmployeesByProject[pid] = [];
          projectEmployeesByProject[pid].push({
            employeeId: Number(pe.employee_id),
            hours: Number(pe.worked_hours ?? 0),
          });
        });
      }
      const mapped: Row[] = (projectsData ?? []).map((r: any) => ({
        id: Number(r.id),
        project: r.project ?? '',
        projectDate: r.project_date ? r.project_date.slice(0, 10) : '',
        amountWithoutVat: Number(r.amount_without_vat ?? 0),
        manualCost: Number(r.manual_cost ?? 0),
        projectEmployees: projectEmployeesByProject[Number(r.id)] ?? [],
      }));
      setRows(mapped);
      const maxId = mapped.reduce((max, r) => Math.max(max, r.id), 0);
      setNextId(maxId + 1 || 1);
      setLoading(false);
    }
    load();
  }, []);

  function costFromEmployees(row: Row): number {
    return row.projectEmployees.reduce((sum, pe) => {
      const emp = employees.find((e) => e.id === pe.employeeId);
      return sum + pe.hours * (emp?.hourlyRate ?? 0);
    }, 0);
  }

  function totalCost(row: Row): number {
    return costFromEmployees(row) + row.manualCost;
  }

  function totalHoursFromEmployees(row: Row): number {
    return row.projectEmployees.reduce((s, pe) => s + pe.hours, 0);
  }

  function profit(row: Row): number {
    return row.amountWithoutVat - totalCost(row);
  }

  function profitPerCategory(row: Row): number {
    return profit(row) / 3;
  }

  async function syncRowToDb(row: Row) {
    const supabase = createClient();
    const { error: projectError } = await supabase.from('projects').upsert({
      id: row.id,
      project: row.project,
      project_date: row.projectDate || null,
      amount_without_vat: row.amountWithoutVat,
      cost: totalCost(row),
      manual_cost: row.manualCost,
      total_hours: totalHoursFromEmployees(row),
    });
    if (projectError) {
      console.error('Chyba pri ukladaní projektu do DB:', projectError.message);
      return;
    }
    await supabase.from('project_employees').delete().eq('project_id', row.id);
    if (row.projectEmployees.length > 0) {
      await supabase.from('project_employees').insert(
        row.projectEmployees.map((pe) => ({
          project_id: row.id,
          employee_id: pe.employeeId,
          worked_hours: pe.hours,
        }))
      );
    }
  }

  async function deleteRowFromDb(id: number) {
    const supabase = createClient();
    await supabase.from('projects').delete().eq('id', id);
  }

  function updateRow<T extends keyof Row>(id: number, field: T, value: Row[T]) {
    setRows((prev) => {
      const updated = prev.map((row) => (row.id === id ? { ...row, [field]: value } : row));
      const changed = updated.find((r) => r.id === id);
      if (changed) void syncRowToDb(changed);
      return updated;
    });
  }

  function addRow() {
    const today = new Date().toISOString().slice(0, 10);
    setRows((prev) => {
      const newRow: Row = {
        id: nextId,
        project: '',
        projectDate: today,
        amountWithoutVat: 0,
        manualCost: 0,
        projectEmployees: [],
      };
      void syncRowToDb(newRow);
      return [...prev, newRow];
    });
    setNextId((id) => id + 1);
  }

  function addEmployeeToRow(projectId: number, employeeId: number) {
    setRows((prev) => {
      const next = prev.map((r) => {
        if (r.id !== projectId) return r;
        if (r.projectEmployees.some((pe) => pe.employeeId === employeeId)) return r;
        return {
          ...r,
          projectEmployees: [...r.projectEmployees, { employeeId, hours: 0 }],
        };
      });
      const changed = next.find((r) => r.id === projectId);
      if (changed) void syncRowToDb(changed);
      return next;
    });
  }

  function updateEmployeeHours(projectId: number, employeeId: number, hours: number) {
    setRows((prev) => {
      const next = prev.map((r) => {
        if (r.id !== projectId) return r;
        return {
          ...r,
          projectEmployees: r.projectEmployees.map((pe) =>
            pe.employeeId === employeeId ? { ...pe, hours } : pe
          ),
        };
      });
      const changed = next.find((r) => r.id === projectId);
      if (changed) void syncRowToDb(changed);
      return next;
    });
  }

  function removeEmployeeFromRow(projectId: number, employeeId: number) {
    setRows((prev) => {
      const next = prev.map((r) => {
        if (r.id !== projectId) return r;
        return {
          ...r,
          projectEmployees: r.projectEmployees.filter((pe) => pe.employeeId !== employeeId),
        };
      });
      const changed = next.find((r) => r.id === projectId);
      if (changed) void syncRowToDb(changed);
      return next;
    });
  }

  function removeRow(id: number) {
    setDeleteConfirmId(id);
  }

  function confirmDelete() {
    if (deleteConfirmId === null) return;
    setRows((prev) => prev.filter((row) => row.id !== deleteConfirmId));
    void deleteRowFromDb(deleteConfirmId);
    setDeleteConfirmId(null);
  }

  const totals = useMemo(() => {
    const revenue = rows.reduce((sum, r) => sum + r.amountWithoutVat, 0);
    const cost = rows.reduce((sum, r) => sum + totalCost(r), 0);
    const profit = revenue - cost;
    return { revenue, cost, profit };
  }, [rows, employees]);

  return (
    <main
      className="becode-page-padding"
      style={{
        padding: '1.5rem 2rem',
        width: '100%',
        maxWidth: '100%',
        minWidth: 0,
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
        <h1 style={{ fontSize: '1.75rem', fontWeight: 600 }}>Projekty &amp; výsledok</h1>
        <button
          type="button"
          className="projects-add-btn"
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
          onMouseOver={(e) => {
            e.currentTarget.style.background = 'var(--becode-primary-hover)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = 'var(--becode-primary)';
          }}
        >
          Pridať projekt
        </button>
      </header>
      {loading && (
        <p
          style={{
            marginBottom: '0.75rem',
            color: 'var(--becode-text-muted)',
            fontSize: '0.875rem',
          }}
        >
          Načítavam projekty…
        </p>
      )}

      {/* Súhrn – hneď na začiatku pre prehľad */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div
          style={{
            background: 'var(--becode-surface-elevated)',
            borderRadius: 'var(--becode-radius-lg)',
            border: '1px solid var(--becode-border)',
            padding: '1rem 1.25rem',
          }}
        >
          <p style={{ fontSize: '0.75rem', marginBottom: '0.25rem', color: 'var(--becode-text-muted)', fontWeight: 500 }}>Príjmy</p>
          <p style={{ fontSize: '1.25rem', fontWeight: 600 }}>{totals.revenue.toFixed(2)} €</p>
        </div>
        <div
          style={{
            background: 'var(--becode-surface-elevated)',
            borderRadius: 'var(--becode-radius-lg)',
            border: '1px solid var(--becode-border)',
            padding: '1rem 1.25rem',
          }}
        >
          <p style={{ fontSize: '0.75rem', marginBottom: '0.25rem', color: 'var(--becode-text-muted)', fontWeight: 500 }}>Náklady</p>
          <p style={{ fontSize: '1.25rem', fontWeight: 600 }}>{totals.cost.toFixed(2)} €</p>
        </div>
        <div
          style={{
            background: 'var(--becode-surface-elevated)',
            borderRadius: 'var(--becode-radius-lg)',
            border: '1px solid var(--becode-border)',
            padding: '1rem 1.25rem',
          }}
        >
          <p style={{ fontSize: '0.75rem', marginBottom: '0.25rem', color: 'var(--becode-text-muted)', fontWeight: 500 }}>Zisk</p>
          <p
            style={{
              fontSize: '1.25rem',
              fontWeight: 600,
              color: totals.profit >= 0 ? 'var(--becode-primary)' : 'var(--becode-error-text)',
            }}
          >
            {totals.profit.toFixed(2)} €
          </p>
        </div>
      </section>

      <section
        style={{
          background: 'var(--becode-surface-elevated)',
          borderRadius: 'var(--becode-radius-lg)',
          border: '1px solid var(--becode-border)',
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
        }}
      >
        {/* Mobil – karty */}
        <div className="projects-mobile-cards">
          {rows.map((row) => {
            const rowProfit = profit(row);
            const share = profitPerCategory(row);
            const cardStyle = {
              background: 'var(--becode-surface)',
              borderRadius: 'var(--becode-radius-lg)',
              border: '1px solid var(--becode-border)',
              padding: '1.25rem',
              marginBottom: '1rem',
            };
            const fieldStyle = { marginBottom: '1rem' };
            const labelStyle = { display: 'block', marginBottom: '0.35rem', fontSize: '0.75rem', color: 'var(--becode-text-muted)', fontWeight: 500 } as const;
            return (
              <div key={row.id} style={cardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--becode-text-muted)' }}>Projekt #{row.id}</span>
                  <button
                    type="button"
                    onClick={() => removeRow(row.id)}
                    style={{
                      padding: '0.35rem 0.6rem',
                      background: 'transparent',
                      borderRadius: 'var(--becode-radius)',
                      border: '1px solid var(--becode-border)',
                      color: 'var(--becode-error-text)',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                    }}
                  >
                    Zmazať
                  </button>
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Dátum</label>
                  <input
                    type="date"
                    value={row.projectDate}
                    onChange={(e) => updateRow(row.id, 'projectDate', e.target.value)}
                    style={{ ...inputBase }}
                  />
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Názov projektu</label>
                  <input
                    type="text"
                    value={row.project}
                    onChange={(e) => updateRow(row.id, 'project', e.target.value)}
                    placeholder="Názov projektu"
                    style={{ ...inputBase }}
                  />
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Suma bez DPH (€)</label>
                  <input
                    type="number"
                    value={row.amountWithoutVat || ''}
                    onChange={(e) => updateRow(row.id, 'amountWithoutVat', Number(e.target.value) || 0)}
                    style={{ ...inputBase, textAlign: 'right' }}
                  />
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Zamestnanci</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {row.projectEmployees.map((pe) => {
                      const emp = employees.find((e) => e.id === pe.employeeId);
                      return (
                        <div
                          key={pe.employeeId}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.5rem',
                            background: 'var(--becode-primary-muted)',
                            borderRadius: 'var(--becode-radius)',
                          }}
                        >
                          <span style={{ flex: 1, fontSize: '0.9rem', fontWeight: 500 }}>{emp?.label ?? `#${pe.employeeId}`}</span>
                          <input
                            type="number"
                            min={0}
                            step={0.5}
                            value={pe.hours || ''}
                            onChange={(e) => updateEmployeeHours(row.id, pe.employeeId, Number(e.target.value) || 0)}
                            placeholder="h"
                            style={{ ...inputBase, width: 72, padding: '0.4rem', textAlign: 'right' }}
                          />
                          <button type="button" onClick={() => removeEmployeeFromRow(row.id, pe.employeeId)} style={{ padding: '0.25rem', background: 'transparent', border: 'none', color: 'var(--becode-text-muted)', cursor: 'pointer', fontSize: '1.1rem' }} aria-label="Odstrániť">×</button>
                        </div>
                      );
                    })}
                    <select
                      value=""
                      onChange={(e) => {
                        const id = e.target.value ? Number(e.target.value) : 0;
                        if (id) addEmployeeToRow(row.id, id);
                        e.target.value = '';
                      }}
                      style={{
                        padding: '0.5rem',
                        background: 'transparent',
                        borderRadius: 'var(--becode-radius)',
                        border: '1px dashed var(--becode-border)',
                        color: 'var(--becode-text-muted)',
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        width: '100%',
                      }}
                    >
                      <option value="">+ Pridať zamestnanca</option>
                      {employees.filter((e) => !row.projectEmployees.some((pe) => pe.employeeId === e.id)).map((emp) => (
                        <option key={emp.id} value={emp.id}>{emp.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Náklady</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>{totalCost(row).toFixed(2)} €</span>
                    <input
                      type="number"
                      min={0}
                      value={row.manualCost || ''}
                      onChange={(e) => updateRow(row.id, 'manualCost', Number(e.target.value) || 0)}
                      placeholder="+ Ručné"
                      style={{ ...inputBase, flex: 1, padding: '0.4rem', fontSize: '0.85rem', textAlign: 'right' }}
                      title="Ručné náklady"
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--becode-border)' }}>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--becode-text-muted)' }}>Zisk</span>
                    <p style={{ fontSize: '1.1rem', fontWeight: 600, color: rowProfit >= 0 ? 'var(--becode-primary)' : 'var(--becode-error-text)' }}>{rowProfit.toFixed(2)} €</p>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--becode-text-muted)' }}>BeCode / Vlado / Maťo</span>
                    <p style={{ fontSize: '1rem', fontWeight: 500, color: share >= 0 ? 'var(--becode-primary)' : 'var(--becode-error-text)' }}>{share.toFixed(2)} €</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop – tabuľka */}
        <div className="projects-desktop-table">
        <div className="becode-table-scroll">
        <table
          className="becode-projects-table"
          style={{
            width: '100%',
            tableLayout: 'fixed',
            borderCollapse: 'collapse',
            fontSize: '0.95rem',
          }}
        >
          <colgroup>
            <col style={{ width: '3%' }} />
            <col style={{ width: '9%' }} />
            <col style={{ width: '18%' }} />
            <col style={{ width: '16%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '9%' }} />
            <col style={{ width: '9%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '5%' }} />
          </colgroup>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '0.85rem 0.6rem', borderBottom: '1px solid var(--becode-border)', color: 'var(--becode-text-muted)', fontWeight: 500 }}>ID</th>
              <th style={{ textAlign: 'left', padding: '0.85rem 0.6rem', borderBottom: '1px solid var(--becode-border)', color: 'var(--becode-text-muted)', fontWeight: 500 }}>Dátum</th>
              <th style={{ textAlign: 'left', padding: '0.85rem 0.6rem', borderBottom: '1px solid var(--becode-border)', color: 'var(--becode-text-muted)', fontWeight: 500 }}>Názov projektu</th>
              <th style={{ textAlign: 'right', padding: '0.85rem 0.6rem', borderBottom: '1px solid var(--becode-border)', color: 'var(--becode-text-muted)', fontWeight: 500 }}>Suma bez DPH (€)</th>
              <th style={{ textAlign: 'left', padding: '0.85rem 0.6rem', borderBottom: '1px solid var(--becode-border)', color: 'var(--becode-text-muted)', fontWeight: 500 }}>Zamestnanci</th>
              <th style={{ textAlign: 'right', padding: '0.85rem 0.6rem', borderBottom: '1px solid var(--becode-border)', color: 'var(--becode-text-muted)', fontWeight: 500 }}>Počet hodín</th>
              <th style={{ textAlign: 'right', padding: '0.85rem 0.6rem', borderBottom: '1px solid var(--becode-border)', color: 'var(--becode-text-muted)', fontWeight: 500 }}>Náklady (€)</th>
              {CATEGORIES.map((cat) => (
                <th key={cat.key} style={{ textAlign: 'right', padding: '0.85rem 0.6rem', borderBottom: '1px solid var(--becode-border)', color: 'var(--becode-text-muted)', fontWeight: 500 }}>
                  {cat.label} (€)
                </th>
              ))}
              <th style={{ textAlign: 'right', padding: '0.85rem 0.6rem', borderBottom: '1px solid var(--becode-border)', color: 'var(--becode-text-muted)', fontWeight: 500 }}>Zisk (€)</th>
              <th style={{ width: 60, padding: '0.85rem 0.6rem', borderBottom: '1px solid var(--becode-border)' }} />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const rowProfit = profit(row);
              const share = profitPerCategory(row);
              return (
                <tr key={row.id}>
                  <td style={{ padding: '0.85rem 0.6rem', borderTop: '1px solid var(--becode-border)' }}>
                    {row.id}
                  </td>
                  <td style={{ padding: '0.85rem 0.6rem', borderTop: '1px solid var(--becode-border)' }}>
                    <input
                      type="date"
                      value={row.projectDate}
                      onChange={(e) => updateRow(row.id, 'projectDate', e.target.value)}
                      style={{ ...inputBase }}
                    />
                  </td>
                  <td style={{ padding: '0.85rem 0.6rem', borderTop: '1px solid var(--becode-border)' }}>
                    <input
                      type="text"
                      value={row.project}
                      onChange={(e) => updateRow(row.id, 'project', e.target.value)}
                      placeholder="Názov projektu"
                      style={{ ...inputBase }}
                    />
                  </td>
                  <td
                    style={{
                      padding: '0.85rem 0.6rem',
                      borderTop: '1px solid var(--becode-border)',
                      textAlign: 'right',
                    }}
                  >
                    <input
                      type="number"
                      value={row.amountWithoutVat || ''}
                      onChange={(e) =>
                        updateRow(row.id, 'amountWithoutVat', Number(e.target.value) || 0)
                      }
                      style={{ ...inputBase, textAlign: 'right' }}
                    />
                  </td>
                  <td style={{ padding: '0.85rem 0.6rem', borderTop: '1px solid var(--becode-border)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      {row.projectEmployees.map((pe) => {
                        const emp = employees.find((e) => e.id === pe.employeeId);
                        return (
                          <span
                            key={pe.employeeId}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              padding: '0.4rem 0.65rem',
                              background: 'var(--becode-primary-muted)',
                              borderRadius: 'var(--becode-radius)',
                              fontSize: '0.9rem',
                              fontWeight: 500,
                            }}
                          >
                            {emp?.label ?? `#${pe.employeeId}`}
                            <button
                              type="button"
                              onClick={() => removeEmployeeFromRow(row.id, pe.employeeId)}
                              style={{
                                marginLeft: 'auto',
                                padding: '0.15rem 0.35rem',
                                background: 'rgba(0,0,0,0.2)',
                                border: 'none',
                                borderRadius: 4,
                                color: 'var(--becode-text-muted)',
                                cursor: 'pointer',
                                fontSize: '0.8rem',
                                lineHeight: 1,
                              }}
                              aria-label="Odstrániť"
                            >
                              ×
                            </button>
                          </span>
                        );
                      })}
                      <select
                        value=""
                        onChange={(e) => {
                          const id = e.target.value ? Number(e.target.value) : 0;
                          if (id) addEmployeeToRow(row.id, id);
                          e.target.value = '';
                        }}
                        style={{
                          padding: '0.5rem 2.25rem 0.5rem 0.75rem',
                          background: 'transparent',
                          borderRadius: 'var(--becode-radius)',
                          border: '1px dashed var(--becode-border)',
                          color: 'var(--becode-text-muted)',
                          fontSize: '0.9rem',
                          cursor: 'pointer',
                          transition: 'border-color 0.15s ease, color 0.15s ease',
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.borderColor = 'var(--becode-primary)';
                          e.currentTarget.style.color = 'var(--becode-primary)';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.borderColor = 'var(--becode-border)';
                          e.currentTarget.style.color = 'var(--becode-text-muted)';
                        }}
                      >
                        <option value="">+ Pridať zamestnanca</option>
                        {employees
                          .filter((e) => !row.projectEmployees.some((pe) => pe.employeeId === e.id))
                          .map((emp) => (
                            <option key={emp.id} value={emp.id}>
                              {emp.label}
                            </option>
                          ))}
                      </select>
                    </div>
                  </td>
                  <td
                    style={{
                      padding: '0.85rem 0.6rem',
                      borderTop: '1px solid var(--becode-border)',
                      textAlign: 'right',
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      {row.projectEmployees.map((pe) => (
                        <input
                          key={pe.employeeId}
                          type="number"
                          min={0}
                          step={0.5}
                          value={pe.hours || ''}
                          onChange={(e) =>
                            updateEmployeeHours(row.id, pe.employeeId, Number(e.target.value) || 0)
                          }
                          placeholder="0"
                          style={{
                            ...inputBase,
                            padding: '0.4rem 0.5rem',
                            textAlign: 'right',
                            width: '100%',
                            minWidth: 64,
                          }}
                        />
                      ))}
                      {row.projectEmployees.length === 0 && (
                        <span style={{ color: 'var(--becode-text-muted)', fontSize: '0.85rem' }}>
                          –
                        </span>
                      )}
                      {row.projectEmployees.length > 0 && (
                        <span
                          style={{
                            fontSize: '0.75rem',
                            color: 'var(--becode-text-muted)',
                            marginTop: '0.2rem',
                          }}
                        >
                          Spolu: {totalHoursFromEmployees(row).toFixed(1)} h
                        </span>
                      )}
                    </div>
                  </td>
                  <td
                    style={{
                      padding: '0.85rem 0.6rem',
                      borderTop: '1px solid var(--becode-border)',
                      textAlign: 'right',
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <span
                        style={{
                          fontSize: '1rem',
                          fontWeight: 600,
                          color: 'var(--becode-text)',
                        }}
                      >
                        {totalCost(row).toFixed(2)} €
                      </span>
                      <input
                        type="number"
                        min={0}
                        value={row.manualCost || ''}
                        onChange={(e) =>
                          updateRow(row.id, 'manualCost', Number(e.target.value) || 0)
                        }
                        placeholder="+ Ručné"
                        style={{ ...inputBase, padding: '0.35rem 0.5rem', textAlign: 'right', fontSize: '0.85rem' }}
                        title="Dodatočné ručné náklady"
                      />
                      {row.projectEmployees.length > 0 && costFromEmployees(row) > 0 && (
                        <span
                          style={{
                            fontSize: '0.7rem',
                            color: 'var(--becode-text-muted)',
                          }}
                        >
                          z toho: {costFromEmployees(row).toFixed(2)} € (hodiny)
                        </span>
                      )}
                    </div>
                  </td>
                  {CATEGORIES.map((cat) => (
                    <td
                      key={cat.key}
                      style={{
                        padding: '0.85rem 0.6rem',
                        borderTop: '1px solid var(--becode-border)',
                        textAlign: 'right',
                        color: share >= 0 ? 'var(--becode-primary)' : 'var(--becode-error-text)',
                        fontWeight: 500,
                      }}
                    >
                      {share.toFixed(2)}
                    </td>
                  ))}
                  <td
                    style={{
                      padding: '0.85rem 0.6rem',
                      borderTop: '1px solid var(--becode-border)',
                      textAlign: 'right',
                      color: rowProfit >= 0 ? 'var(--becode-primary)' : 'var(--becode-error-text)',
                      fontWeight: 600,
                    }}
                  >
                    {rowProfit.toFixed(2)}
                  </td>
                  <td
                    style={{
                      padding: '0.85rem 0.6rem',
                      borderTop: '1px solid var(--becode-border)',
                      textAlign: 'right',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => removeRow(row.id)}
                      style={{
                        padding: '0.35rem 0.6rem',
                        background: 'transparent',
                        borderRadius: 'var(--becode-radius)',
                        border: '1px solid var(--becode-border)',
                        color: 'var(--becode-text-muted)',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        transition: 'border-color 0.15s ease, color 0.15s ease',
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.borderColor = 'var(--becode-error-text)';
                        e.currentTarget.style.color = 'var(--becode-error-text)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.borderColor = 'var(--becode-border)';
                        e.currentTarget.style.color = 'var(--becode-text-muted)';
                      }}
                    >
                      Zmazať
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
        </div>
      </section>

      <ConfirmModal
        open={deleteConfirmId !== null}
        title="Zmazať projekt"
        message="Naozaj chcete zmazať tento projekt? Táto akcia sa nedá vrátiť späť."
        confirmLabel="Zmazať"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirmId(null)}
      />
    </main>
  );
}
