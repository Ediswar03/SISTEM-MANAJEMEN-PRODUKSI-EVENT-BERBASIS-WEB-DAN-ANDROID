'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { api } from '../../lib/api-client';
import type { EventInfo } from '../../lib/api-client';
import { StatusBadge } from '../utils';

interface ConflictItem {
  id: string;
  type: 'EQUIPMENT' | 'CREW';
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  resourceId: string;
  resourceName: string;
  event1: EventInfo;
  event2: EventInfo;
  overlapStart: string;
  overlapEnd: string;
}

/** Deteksi konflik dari daftar event yang di-load dari API */
function detectConflicts(events: EventInfo[]): ConflictItem[] {
  const conflicts: ConflictItem[] = [];
  // Simplified: look for events with same location that overlap
  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      const a = events[i]!;
      const b = events[j]!;
      if (a.status === 'CANCELLED' || b.status === 'CANCELLED') continue;

      const aStart = new Date(a.startAt);
      const aEnd = new Date(a.endAt);
      const bStart = new Date(b.startAt);
      const bEnd = new Date(b.endAt);

      // Overlap check
      if (aStart < bEnd && aEnd > bStart) {
        const overlapStart = aStart > bStart ? aStart : bStart;
        const overlapEnd = aEnd < bEnd ? aEnd : bEnd;

        // Only flag if both are active/upcoming
        if (['DRAFT', 'CONFIRMED', 'IN_PROGRESS'].includes(a.status) &&
            ['DRAFT', 'CONFIRMED', 'IN_PROGRESS'].includes(b.status) &&
            a.location === b.location && a.location) {
          conflicts.push({
            id: `${a.id}-${b.id}`,
            type: 'EQUIPMENT',
            severity: a.status === 'IN_PROGRESS' || b.status === 'IN_PROGRESS' ? 'HIGH' : 'MEDIUM',
            resourceId: a.location,
            resourceName: `Lokasi: ${a.location}`,
            event1: a,
            event2: b,
            overlapStart: overlapStart.toISOString(),
            overlapEnd: overlapEnd.toISOString(),
          });
        }
      }
    }
  }
  return conflicts;
}

function SeverityBadge({ severity }: { severity: string }) {
  const styles: Record<string, { bg: string; color: string; label: string }> = {
    HIGH:   { bg: '#ef444420', color: '#f87171', label: 'Tinggi' },
    MEDIUM: { bg: '#f59e0b20', color: '#fbbf24', label: 'Sedang' },
    LOW:    { bg: '#3b82f620', color: '#60a5fa', label: 'Rendah' },
  };
  const s = styles[severity] ?? styles['MEDIUM']!;
  return (
    <span className="badge" style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

export default function ConflictsPage() {
  const [events, setEvents] = useState<EventInfo[]>([]);
  const [conflicts, setConflicts] = useState<ConflictItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ConflictItem | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getEvents({ limit: '100', page: '1' });
      setEvents(res.data);
      setConflicts(detectConflicts(res.data));
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = filter === 'ALL' ? conflicts : conflicts.filter(c => c.severity === filter);
  const highCount = conflicts.filter(c => c.severity === 'HIGH').length;
  const mediumCount = conflicts.filter(c => c.severity === 'MEDIUM').length;

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Validasi Konflik Jadwal</h1>
          <p className="page-subtitle">
            Deteksi otomatis potensi benturan jadwal event dan resource
          </p>
        </div>
        <button className="btn btn-secondary" onClick={() => void load()} id="btn-refresh-conflicts">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#ef444420' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <div>
            <div className="stat-value" style={{ color: '#f87171' }}>{highCount}</div>
            <div className="stat-label">Konflik Tinggi</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#f59e0b20' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div>
            <div className="stat-value" style={{ color: '#fbbf24' }}>{mediumCount}</div>
            <div className="stat-label">Konflik Sedang</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#22c55e20' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div>
            <div className="stat-value" style={{ color: '#4ade80' }}>{events.length}</div>
            <div className="stat-label">Event Diperiksa</div>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="filter-bar">
        {(['ALL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((f) => (
          <button
            key={f}
            className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter(f)}
          >
            {f === 'ALL' ? `Semua (${conflicts.length})` : f === 'HIGH' ? `Tinggi (${highCount})` : f === 'MEDIUM' ? `Sedang (${mediumCount})` : `Rendah (${conflicts.filter(c => c.severity === 'LOW').length})`}
          </button>
        ))}
      </div>

      {/* Conflicts table */}
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Tingkat</th>
              <th>Resource Bermasalah</th>
              <th>Event 1</th>
              <th>Event 2</th>
              <th>Overlap</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '40px' }}>
                  <div className="spinner" style={{ margin: '0 auto' }} />
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <div className="empty-state">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <p style={{ marginTop: '8px' }}>
                      {conflicts.length === 0
                        ? 'Tidak ada konflik jadwal yang terdeteksi. Semua event berjalan baik.'
                        : 'Tidak ada konflik untuk filter yang dipilih.'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((c) => (
                <tr key={c.id}>
                  <td><SeverityBadge severity={c.severity} /></td>
                  <td style={{ fontWeight: 500 }}>{c.resourceName}</td>
                  <td>
                    <div style={{ fontWeight: 500, fontSize: '13px' }}>{c.event1.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}><span className="tag">{c.event1.code}</span></div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500, fontSize: '13px' }}>{c.event2.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}><span className="tag">{c.event2.code}</span></div>
                  </td>
                  <td className="muted" style={{ fontSize: '12px' }}>
                    {new Date(c.overlapStart).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    {' → '}
                    {new Date(c.overlapEnd).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => setSelected(c)}>
                        Detail
                      </button>
                      <Link href={`/dashboard/events/${c.event1.id}`} className="btn btn-sm" style={{ background: '#6366f120', color: '#a78bfa', border: '1px solid #6366f130' }}>
                        Event 1
                      </Link>
                      <Link href={`/dashboard/events/${c.event2.id}`} className="btn btn-sm" style={{ background: '#6366f120', color: '#a78bfa', border: '1px solid #6366f130' }}>
                        Event 2
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Detail dialog */}
      {selected && (
        <div className="dialog-overlay" onClick={() => setSelected(null)}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <span className="dialog-title">Detail Konflik</span>
              <button className="close-btn" onClick={() => setSelected(null)}>✕</button>
            </div>
            <div className="dialog-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <SeverityBadge severity={selected.severity} />
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{selected.resourceName}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ padding: '14px', background: 'var(--bg-surface)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600 }}>EVENT 1</div>
                  <div style={{ fontWeight: 600 }}>{selected.event1.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{selected.event1.code}</div>
                  <div style={{ marginTop: '8px' }}><StatusBadge status={selected.event1.status} /></div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                    {new Date(selected.event1.startAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                    {' – '}
                    {new Date(selected.event1.endAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                  </div>
                </div>
                <div style={{ padding: '14px', background: 'var(--bg-surface)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600 }}>EVENT 2</div>
                  <div style={{ fontWeight: 600 }}>{selected.event2.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{selected.event2.code}</div>
                  <div style={{ marginTop: '8px' }}><StatusBadge status={selected.event2.status} /></div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                    {new Date(selected.event2.startAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                    {' – '}
                    {new Date(selected.event2.endAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                  </div>
                </div>
              </div>

              <div style={{ padding: '12px', background: '#ef444410', border: '1px solid #ef444430', borderRadius: '8px', marginTop: '4px' }}>
                <div style={{ fontSize: '11px', color: '#f87171', fontWeight: 600, marginBottom: '6px' }}>⚠ OVERLAP TERDETEKSI</div>
                <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                  {new Date(selected.overlapStart).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })}
                  {' sampai '}
                  {new Date(selected.overlapEnd).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })}
                </div>
              </div>
            </div>
            <div className="dialog-footer">
              <button className="btn btn-secondary" onClick={() => setSelected(null)}>Tutup</button>
              <Link href={`/dashboard/events/${selected.event1.id}`} className="btn btn-primary">Kelola Event 1</Link>
              <Link href={`/dashboard/events/${selected.event2.id}`} className="btn btn-primary">Kelola Event 2</Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
