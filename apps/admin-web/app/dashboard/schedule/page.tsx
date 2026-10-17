'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { api } from '../../lib/api-client';
import type { EventInfo } from '../../lib/api-client';
import { StatusBadge } from '../utils';

const STATUS_COLORS: Record<string, string> = {
  DRAFT:       '#3b82f6',
  CONFIRMED:   '#6366f1',
  IN_PROGRESS: '#f59e0b',
  COMPLETED:   '#22c55e',
  CANCELLED:   '#ef4444',
};

export default function SchedulePage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-indexed
  const [events, setEvents] = useState<EventInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<EventInfo | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Load events for a wider range to cover the whole month view
      const startOfMonth = new Date(year, month, 1).toISOString();
      const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
      const res = await api.getEvents({ limit: '100', page: '1' });
      // Filter events that overlap with the current month
      const filtered = res.data.filter((e) => {
        const start = new Date(e.startAt);
        const end = new Date(e.endAt);
        return start <= new Date(year, month + 1, 0) && end >= new Date(year, month, 1);
      });
      setEvents(filtered);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => { void load(); }, [load]);

  // Build calendar grid
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  const MONTH_NAMES = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  function eventsOnDay(day: number): EventInfo[] {
    const date = new Date(year, month, day);
    return events.filter((e) => {
      const start = new Date(e.startAt);
      const end = new Date(e.endAt);
      // normalize to day boundaries
      const sDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const eDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      return date >= sDay && date <= eDay;
    });
  }

  // Build grid cells: [prev month trailing, current month, next month leading]
  const cells: { day: number; currentMonth: boolean }[] = [];
  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({ day: daysInPrevMonth - i, currentMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, currentMonth: true });
  }
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    cells.push({ day: d, currentMonth: false });
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Kalender Jadwal</h1>
          <p className="page-subtitle">Tampilan visual jadwal semua event produksi</p>
        </div>
        <Link href="/dashboard/events/new" className="btn btn-primary" id="btn-create-event-schedule">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Event Baru
        </Link>
      </div>

      {/* Calendar navigation */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <button className="btn btn-secondary btn-sm" onClick={prevMonth} id="btn-prev-month">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
            Prev
          </button>
          <h2 style={{ fontSize: '17px', fontWeight: 700 }}>
            {MONTH_NAMES[month]} {year}
          </h2>
          <button className="btn btn-secondary btn-sm" onClick={nextMonth} id="btn-next-month">
            Next
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
          </button>
        </div>

        {/* Day headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px', marginBottom: '1px' }}>
          {DAY_NAMES.map((d) => (
            <div key={d} style={{ textAlign: 'center', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', padding: '6px 0' }}>
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
            <div className="spinner" style={{ width: '32px', height: '32px' }} />
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
            {cells.map((cell, idx) => {
              const isToday = cell.currentMonth && cell.day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
              const dayEvents = cell.currentMonth ? eventsOnDay(cell.day) : [];
              return (
                <div
                  key={idx}
                  style={{
                    minHeight: '90px',
                    padding: '6px',
                    background: cell.currentMonth ? 'var(--bg-surface)' : 'var(--bg-base)',
                    borderRadius: '6px',
                    border: isToday ? '1px solid var(--accent)' : '1px solid var(--border-subtle)',
                    opacity: cell.currentMonth ? 1 : 0.4,
                  }}
                >
                  <div style={{
                    fontSize: '12px',
                    fontWeight: isToday ? 700 : 500,
                    color: isToday ? 'var(--accent)' : cell.currentMonth ? 'var(--text-secondary)' : 'var(--text-muted)',
                    marginBottom: '4px',
                    width: '22px', height: '22px',
                    borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: isToday ? 'var(--accent-light)' : 'transparent',
                  }}>
                    {cell.day}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {dayEvents.slice(0, 3).map((ev) => (
                      <button
                        key={ev.id}
                        onClick={() => setSelected(ev)}
                        style={{
                          background: `${STATUS_COLORS[ev.status] ?? '#6366f1'}25`,
                          border: `1px solid ${STATUS_COLORS[ev.status] ?? '#6366f1'}50`,
                          borderLeft: `3px solid ${STATUS_COLORS[ev.status] ?? '#6366f1'}`,
                          borderRadius: '4px',
                          padding: '2px 5px',
                          fontSize: '10px',
                          fontWeight: 600,
                          color: STATUS_COLORS[ev.status] ?? '#6366f1',
                          cursor: 'pointer',
                          textAlign: 'left',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          width: '100%',
                        }}
                        title={ev.name}
                      >
                        {ev.name}
                      </button>
                    ))}
                    {dayEvents.length > 3 && (
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', paddingLeft: '4px' }}>
                        +{dayEvents.length - 3} lagi
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '20px' }}>
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <div key={status} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: color }} />
            {status.replace('_', ' ')}
          </div>
        ))}
      </div>

      {/* This month's events list */}
      <div className="card">
        <h2 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px' }}>
          Event di {MONTH_NAMES[month]} {year} ({events.length})
        </h2>
        {events.length === 0 ? (
          <div className="empty-state"><p>Tidak ada event di bulan ini.</p></div>
        ) : (
          <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>Kode</th>
                  <th>Nama Event</th>
                  <th>Lokasi</th>
                  <th>Mulai</th>
                  <th>Selesai</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev) => (
                  <tr key={ev.id}>
                    <td><span className="tag">{ev.code}</span></td>
                    <td style={{ fontWeight: 500 }}>{ev.name}</td>
                    <td className="muted">{ev.location}</td>
                    <td className="muted">{new Date(ev.startAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</td>
                    <td className="muted">{new Date(ev.endAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</td>
                    <td><StatusBadge status={ev.status} /></td>
                    <td>
                      <Link href={`/dashboard/events/${ev.id}`} className="btn btn-secondary btn-sm">Detail</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Event detail popup */}
      {selected && (
        <div className="dialog-overlay" onClick={() => setSelected(null)}>
          <div className="dialog" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: STATUS_COLORS[selected.status] ?? '#6366f1', flexShrink: 0 }} />
                <span className="dialog-title">{selected.name}</span>
              </div>
              <button className="close-btn" onClick={() => setSelected(null)}>✕</button>
            </div>
            <div className="dialog-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>KODE EVENT</div>
                  <span className="tag">{selected.code}</span>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>STATUS</div>
                  <StatusBadge status={selected.status} />
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>LOKASI</div>
                  <div style={{ fontSize: '13px' }}>{selected.location}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>KLIEN</div>
                  <div style={{ fontSize: '13px' }}>{selected.clientName ?? '—'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>MULAI</div>
                  <div style={{ fontSize: '13px' }}>{new Date(selected.startAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>SELESAI</div>
                  <div style={{ fontSize: '13px' }}>{new Date(selected.endAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</div>
                </div>
              </div>
            </div>
            <div className="dialog-footer">
              <button className="btn btn-secondary" onClick={() => setSelected(null)}>Tutup</button>
              <Link href={`/dashboard/events/${selected.id}`} className="btn btn-primary">Lihat Detail</Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
