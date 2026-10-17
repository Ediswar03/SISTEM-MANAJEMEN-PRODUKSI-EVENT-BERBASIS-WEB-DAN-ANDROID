'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../../lib/api-client';
import type { EventInfo, EquipmentInfo } from '../../lib/api-client';
import { StatusBadge } from '../utils';

type Period = '7d' | '30d' | '90d' | '1y';

function getPeriodLabel(p: Period) {
  return { '7d': '7 Hari', '30d': '30 Hari', '90d': '90 Hari', '1y': '1 Tahun' }[p];
}

// Simple bar chart rendered via inline SVG
function BarChart({ data, labels, color = '#6366f1' }: { data: number[]; labels: string[]; color?: string }) {
  const max = Math.max(...data, 1);
  const barW = 30;
  const gap = 8;
  const chartH = 120;
  const totalW = data.length * (barW + gap) - gap;

  return (
    <svg width="100%" viewBox={`0 0 ${totalW} ${chartH + 30}`} style={{ overflow: 'visible' }}>
      {data.map((v, i) => {
        const h = (v / max) * chartH;
        const x = i * (barW + gap);
        return (
          <g key={i}>
            <rect
              x={x} y={chartH - h}
              width={barW} height={h}
              rx="4" fill={color} opacity="0.8"
            />
            <text x={x + barW / 2} y={chartH + 14} textAnchor="middle" fontSize="9" fill="#545c73">
              {labels[i]}
            </text>
            {v > 0 && (
              <text x={x + barW / 2} y={chartH - h - 4} textAnchor="middle" fontSize="9" fill="#8b92a8">
                {v}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export default function ReportsPage() {
  const [period, setPeriod] = useState<Period>('30d');
  const [events, setEvents] = useState<EventInfo[]>([]);
  const [equipment, setEquipment] = useState<EquipmentInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [evRes, eqRes] = await Promise.all([
        api.getEvents({ limit: '100', page: '1' }),
        api.getEquipment({ limit: '100', page: '1' }),
      ]);
      setEvents(evRes.data);
      setEquipment(eqRes.data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  // --- Derived stats ---
  const now = new Date();
  const periodMs: Record<Period, number> = {
    '7d': 7, '30d': 30, '90d': 90, '1y': 365,
  };
  const days = periodMs[period];
  const since = new Date(now.getTime() - days * 86400000);

  const eventsInPeriod = events.filter((e) => new Date(e.startAt) >= since);
  const completed = eventsInPeriod.filter(e => e.status === 'COMPLETED').length;
  const active = eventsInPeriod.filter(e => e.status === 'IN_PROGRESS').length;
  const confirmed = eventsInPeriod.filter(e => e.status === 'CONFIRMED').length;
  const cancelled = eventsInPeriod.filter(e => e.status === 'CANCELLED').length;

  // Events per month (last 6)
  const monthlyData: number[] = [];
  const monthlyLabels: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const m = d.getMonth();
    const y = d.getFullYear();
    const count = events.filter((e) => {
      const s = new Date(e.startAt);
      return s.getFullYear() === y && s.getMonth() === m;
    }).length;
    monthlyData.push(count);
    monthlyLabels.push(d.toLocaleDateString('id-ID', { month: 'short' }));
  }

  // Status distribution
  const statusCounts: Record<string, number> = {};
  eventsInPeriod.forEach((e) => { statusCounts[e.status] = (statusCounts[e.status] ?? 0) + 1; });

  const STATUS_COLORS: Record<string, string> = {
    DRAFT: '#3b82f6', CONFIRMED: '#6366f1', IN_PROGRESS: '#f59e0b',
    COMPLETED: '#22c55e', CANCELLED: '#ef4444',
  };

  // Equipment utilization
  const activeEquipment = equipment.filter(e => e.isActive).length;
  const utilizationRate = equipment.length > 0
    ? Math.round((activeEquipment / equipment.length) * 100)
    : 0;

  // Recent completed events table
  const recentCompleted = events
    .filter(e => e.status === 'COMPLETED')
    .sort((a, b) => new Date(b.endAt).getTime() - new Date(a.endAt).getTime())
    .slice(0, 8);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Laporan Produksi</h1>
          <p className="page-subtitle">Ringkasan performa dan statistik operasional event</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['7d', '30d', '90d', '1y'] as Period[]).map((p) => (
            <button
              key={p}
              className={`btn btn-sm ${period === p ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setPeriod(p)}
              id={`btn-period-${p}`}
            >
              {getPeriodLabel(p)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
          <div className="spinner" style={{ width: '32px', height: '32px' }} />
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: '#6366f120' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <div>
                <div className="stat-value">{eventsInPeriod.length}</div>
                <div className="stat-label">Total Event</div>
                <div className="stat-change" style={{ color: 'var(--text-muted)' }}>dalam {getPeriodLabel(period)} terakhir</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: '#22c55e20' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div>
                <div className="stat-value" style={{ color: '#4ade80' }}>{completed}</div>
                <div className="stat-label">Selesai</div>
                <div className="stat-change" style={{ color: '#4ade80' }}>
                  {eventsInPeriod.length > 0 ? Math.round((completed / eventsInPeriod.length) * 100) : 0}% sukses rate
                </div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: '#f59e0b20' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <div>
                <div className="stat-value" style={{ color: '#fbbf24' }}>{active + confirmed}</div>
                <div className="stat-label">Aktif / Terkonfirmasi</div>
                <div className="stat-change" style={{ color: 'var(--text-muted)' }}>{active} sedang berjalan</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: '#3b82f620' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                </svg>
              </div>
              <div>
                <div className="stat-value">{activeEquipment}</div>
                <div className="stat-label">Alat Aktif</div>
                <div className="stat-change" style={{ color: 'var(--text-muted)' }}>{utilizationRate}% utilisasi</div>
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '24px' }}>
            {/* Monthly bar chart */}
            <div className="card">
              <h2 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '20px' }}>Event per Bulan (6 Bulan Terakhir)</h2>
              <BarChart data={monthlyData} labels={monthlyLabels} color="#6366f1" />
            </div>

            {/* Status distribution */}
            <div className="card">
              <h2 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px' }}>Distribusi Status</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {Object.entries(statusCounts).map(([status, count]) => {
                  const pct = eventsInPeriod.length > 0 ? Math.round((count / eventsInPeriod.length) * 100) : 0;
                  const color = STATUS_COLORS[status] ?? '#6366f1';
                  return (
                    <div key={status}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>{status.replace('_', ' ')}</span>
                        <span style={{ color, fontWeight: 600 }}>{count} ({pct}%)</span>
                      </div>
                      <div style={{ height: '6px', background: 'var(--bg-hover)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '3px', transition: 'width 0.5s ease' }} />
                      </div>
                    </div>
                  );
                })}
                {Object.keys(statusCounts).length === 0 && (
                  <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>
                    Tidak ada data untuk periode ini
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Equipment summary + Recent completed */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px', marginBottom: '24px' }}>
            {/* Equipment utilization */}
            <div className="card">
              <h2 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px' }}>Utilisasi Peralatan</h2>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', padding: '20px 0' }}>
                <div style={{ position: 'relative', width: '100px', height: '100px' }}>
                  <svg viewBox="0 0 36 36" style={{ width: '100px', height: '100px', transform: 'rotate(-90deg)' }}>
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="var(--bg-hover)" strokeWidth="3" />
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="#6366f1" strokeWidth="3"
                      strokeDasharray={`${utilizationRate} ${100 - utilizationRate}`} strokeLinecap="round" />
                  </svg>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '20px', fontWeight: 700 }}>{utilizationRate}%</span>
                  </div>
                </div>
                <div style={{ marginTop: '16px', width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)', fontSize: '13px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Total Alat</span>
                    <span style={{ fontWeight: 600 }}>{equipment.length}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)', fontSize: '13px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Aktif</span>
                    <span style={{ fontWeight: 600, color: '#4ade80' }}>{activeEquipment}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '13px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Tidak Aktif</span>
                    <span style={{ fontWeight: 600, color: '#f87171' }}>{equipment.length - activeEquipment}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent completed events */}
            <div className="card">
              <h2 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px' }}>Event Selesai Terbaru</h2>
              {recentCompleted.length === 0 ? (
                <div className="empty-state"><p>Belum ada event yang selesai.</p></div>
              ) : (
                <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Event</th>
                        <th>Lokasi</th>
                        <th>Selesai</th>
                        <th>Resource</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentCompleted.map((ev) => (
                        <tr key={ev.id}>
                          <td>
                            <div style={{ fontWeight: 500 }}>{ev.name}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{ev.code}</div>
                          </td>
                          <td className="muted">{ev.location}</td>
                          <td className="muted" style={{ fontSize: '12px' }}>
                            {new Date(ev.endAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="muted" style={{ fontSize: '12px' }}>
                            {ev._count?.allocations ?? 0} alat · {ev._count?.assignments ?? 0} kru
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Cancellation rate */}
          {cancelled > 0 && (
            <div style={{ padding: '14px 18px', background: '#ef444410', border: '1px solid #ef444430', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <span style={{ fontSize: '13px', color: '#f87171' }}>
                <strong>{cancelled} event dibatalkan</strong> dalam {getPeriodLabel(period)} terakhir
                ({eventsInPeriod.length > 0 ? Math.round((cancelled / eventsInPeriod.length) * 100) : 0}% cancellation rate).
                Pertimbangkan untuk meninjau SOP konfirmasi event.
              </span>
            </div>
          )}
        </>
      )}
    </>
  );
}
