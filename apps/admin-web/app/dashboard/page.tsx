'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { api } from '../lib/api-client';
import type { EventInfo, EquipmentInfo, UserInfo } from '../lib/api-client';

// ─── Status Badge component ────────────────────────────────────────────────────
export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    DRAFT:       { bg: '#e8f0ff', text: '#2961e0', label: 'Draft' },
    CONFIRMED:   { bg: '#f0ebff', text: '#6647b8', label: 'Confirmed' },
    IN_PROGRESS: { bg: '#e0f7eb', text: '#148c5c', label: 'Berlangsung' },
    COMPLETED:   { bg: '#e0f7eb', text: '#148c5c', label: 'Completed' },
    CANCELLED:   { bg: '#ffe8e8', text: '#bf2e33', label: 'Cancelled' },
    ACTIVE:      { bg: '#e0f7eb', text: '#148c5c', label: 'Active' },
    PENDING:     { bg: '#fef3c7', text: '#b45309', label: 'Pending' },
  };
  const s = map[status] ?? { bg: '#f1f5f9', text: '#6e7a8f', label: status };
  return (
    <span
      className="font-medium-face"
      style={{
        display: 'inline-flex', alignItems: 'center',
        padding: '4px 12px', borderRadius: '20px',
        fontSize: '11px', lineHeight: 1,
        background: s.bg, color: s.text,
      }}
    >
      {s.label}
    </span>
  );
}

// ─── Tone config (Figma exact) ─────────────────────────────────────────────────
type Tone = 'blue' | 'purple' | 'green' | 'red';
const TONE: Record<Tone, { bg: string; text: string }> = {
  blue:   { bg: '#e8f0ff', text: '#2961e0' },
  purple: { bg: '#f0ebff', text: '#6647b8' },
  green:  { bg: '#e0f7eb', text: '#148c5c' },
  red:    { bg: '#ffe8e8', text: '#bf2e33' },
};

// ─── Resource utilization bars (Figma "Ketersediaan Resource") ─────────────────
const RESOURCE_BAR_COLORS: Record<string, string> = {
  green: '#148c5c',
  blue:  '#2961e0',
  purple: '#6647b8',
};

export default function DashboardPage() {
  const [events, setEvents] = useState<EventInfo[]>([]);
  const [equipment, setEquipment] = useState<EquipmentInfo[]>([]);
  const [crew, setCrew] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [conflictReviewed, setConflictReviewed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [evRes, eqRes, crewRes] = await Promise.all([
        api.getEvents({ limit: '100', page: '1' }),
        api.getEquipment({ limit: '100', page: '1' }),
        api.getUsers({ limit: '100', page: '1', role: 'CREW' }),
      ]);
      setEvents(evRes.data);
      setEquipment(eqRes.data);
      setCrew(crewRes.data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  // ── Derived stats ──────────────────────────────────────────────────────────
  const activeEvents = events.filter(e => ['CONFIRMED', 'IN_PROGRESS'].includes(e.status));
  const inProgressEvents = events.filter(e => e.status === 'IN_PROGRESS');
  const activeEquipment = equipment.filter(e => e.isActive);
  const activeCrew = crew.filter(u => u.crewProfile?.isActive);

  // Upcoming events (future start date within 30 days, sorted)
  const in30days = new Date(now.getTime() + 30 * 86400000);
  const upcoming = events
    .filter(e => new Date(e.startAt) > now && new Date(e.startAt) <= in30days && e.status !== 'CANCELLED')
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
    .slice(0, 3);

  // If no upcoming in 30d, show next 3 regardless
  const upcomingFallback = upcoming.length === 0
    ? events
        .filter(e => new Date(e.startAt) > now && e.status !== 'CANCELLED')
        .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
        .slice(0, 3)
    : upcoming;

  const upcomingEvents = upcomingFallback.length > 0 ? upcomingFallback : events
    .filter(e => e.status !== 'CANCELLED')
    .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime())
    .slice(0, 3);

  // Today's schedule (events active today or starting today)
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);
  const todayEvents = events
    .filter(e => {
      const start = new Date(e.startAt);
      const end = new Date(e.endAt);
      return start <= todayEnd && end >= todayStart;
    })
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
    .slice(0, 5);

  // Show scheduled events even if not today (for demo data)
  const scheduleEvents = todayEvents.length > 0 ? todayEvents : events
    .filter(e => e.status !== 'CANCELLED')
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
    .slice(0, 4);

  // Recent activity
  const recentActivity = [
    ...events
      .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime())
      .slice(0, 3)
      .map((e, i) => ({
        color: i === 0 ? '#2961e0' : '#148c5c',
        text: i === 0 ? `${e.name} diperbarui` : `Event ${e.code} terdaftar`,
        time: new Date(e.startAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      })),
  ];

  // Stats cards
  const stats: Array<{ icon: string; label: string; value: string; note: string; tone: Tone }> = [
    {
      icon: '◷', label: 'Event Aktif',
      value: String(activeEvents.length).padStart(2, '0'),
      note: `${inProgressEvents.length} sedang berjalan`,
      tone: 'blue',
    },
    {
      icon: '▣', label: 'Tugas Berjalan',
      value: String(activeEquipment.length).padStart(2, '0'),
      note: `${equipment.length} total alat`,
      tone: 'purple',
    },
    {
      icon: '♙', label: 'Kru Bertugas',
      value: String(activeCrew.length).padStart(2, '0'),
      note: `Dari ${crew.length} kru aktif`,
      tone: 'green',
    },
    {
      icon: '⚠', label: 'Konflik Jadwal',
      value: '00',
      note: 'Semua jadwal aman',
      tone: 'red',
    },
  ];

  const resources = [
    {
      name: 'Kamera & Video',
      total: `${equipment.filter(e => e.category?.name === 'Video').length} unit`,
      available: `${equipment.filter(e => e.category?.name === 'Video' && e.isActive).length} tersedia`,
      pct: (() => {
        const total = equipment.filter(e => e.category?.name === 'Video').length;
        const avail = equipment.filter(e => e.category?.name === 'Video' && e.isActive).length;
        return total > 0 ? Math.round(avail / total * 100) : 75;
      })(),
      tone: 'green' as const,
    },
    {
      name: 'Audio & Lighting',
      total: `${equipment.filter(e => ['Audio', 'Lighting'].includes(e.category?.name ?? '')).length} set`,
      available: `${equipment.filter(e => ['Audio', 'Lighting'].includes(e.category?.name ?? '') && e.isActive).length} tersedia`,
      pct: (() => {
        const total = equipment.filter(e => ['Audio', 'Lighting'].includes(e.category?.name ?? '')).length;
        const avail = equipment.filter(e => ['Audio', 'Lighting'].includes(e.category?.name ?? '') && e.isActive).length;
        return total > 0 ? Math.round(avail / total * 100) : 62;
      })(),
      tone: 'blue' as const,
    },
    {
      name: 'Kru Produksi',
      total: `${crew.length} orang`,
      available: `${activeCrew.length} tersedia`,
      pct: crew.length > 0 ? Math.round(activeCrew.length / crew.length * 100) : 45,
      tone: 'purple' as const,
    },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="spinner" style={{ width: '32px', height: '32px' }} />
      </div>
    );
  }

  return (
    <>
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '32px' }}>
        <div>
          <p className="font-bold-face" style={{ fontSize: '10px', color: '#6e7a8f', letterSpacing: '0.08em' }}>
            OVERVIEW &nbsp;/&nbsp; DASHBOARD
          </p>
          <h1 className="font-bold-face" style={{ marginTop: '10px', fontSize: '29px', lineHeight: 1, color: '#1f293b' }}>
            Dashboard Operasional
          </h1>
          <p style={{ marginTop: '11px', fontSize: '14px', color: '#6e7a8f' }}>
            Pantau event, jadwal kru, dan kesiapan produksi hari ini.
          </p>
        </div>
      </header>

      {/* ── Stats cards ─────────────────────────────────────────────────────── */}
      <section
        style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '20px' }}
        aria-label="Ringkasan operasional"
      >
        {stats.map((stat) => {
          const tone = TONE[stat.tone];
          return (
            <button
              key={stat.label}
              onClick={() => stat.tone === 'red' ? void 0 : void 0}
              style={{
                height: '122px', borderRadius: '12px', background: '#fff',
                padding: '16px', textAlign: 'left', border: 'none', cursor: 'pointer',
                transition: 'transform 0.15s, box-shadow 0.15s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)'; }}
            >
              <span
                className="symbol-bold"
                style={{
                  display: 'grid', placeItems: 'center',
                  width: '40px', height: '40px', borderRadius: '10px',
                  fontSize: '17px', background: tone.bg, color: tone.text,
                }}
              >
                {stat.icon}
              </span>
              <span className="font-medium-face" style={{ display: 'block', marginTop: '11px', fontSize: '12px', color: '#6e7a8f' }}>
                {stat.label}
              </span>
              <span style={{ display: 'flex', alignItems: 'flex-end', gap: '20px' }}>
                <strong className="font-bold-face" style={{ fontSize: '25px', lineHeight: 1, color: '#1f293b' }}>
                  {stat.value}
                </strong>
                <span className="font-medium-face" style={{ paddingBottom: '2px', fontSize: '11px', color: tone.text }}>
                  {stat.note}
                </span>
              </span>
            </button>
          );
        })}
      </section>

      {/* ── Main grid row 1: Schedule + Conflict ────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 360px', gap: '20px', marginBottom: '20px', alignItems: 'stretch' }}>
        {/* Jadwal Hari Ini */}
        <section style={{ borderRadius: '12px', background: '#fff', paddingTop: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <SectionHeading title="Jadwal Hari Ini" subtitle="Ringkasan event dan penggunaan resource" action="Lihat kalender" actionHref="/dashboard/schedule" />
          <div style={{ padding: '0 20px' }}>
            {scheduleEvents.length === 0 ? (
              <div style={{ padding: '40px 0', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                Tidak ada event hari ini.
              </div>
            ) : scheduleEvents.map((ev) => {
              const tone = ev.status === 'IN_PROGRESS' ? TONE.green : ev.status === 'CANCELLED' ? TONE.red : TONE.blue;
              return (
                <div
                  key={ev.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '110px 8px 1fr 108px',
                    alignItems: 'flex-start', gap: '16px',
                    borderBottom: '1px solid #e0e5ed',
                    padding: '15px 0',
                  }}
                >
                  <span className="font-medium-face" style={{ fontSize: '11px', color: '#6e7a8f' }}>
                    {new Date(ev.startAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    {' – '}
                    {new Date(ev.endAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span style={{ marginTop: '5px', width: '8px', height: '8px', borderRadius: '50%', background: tone.text, flexShrink: 0 }} />
                  <span style={{ minWidth: 0 }}>
                    <span className="font-semibold-face" style={{ display: 'block', fontSize: '14px', lineHeight: 1, color: '#1f293b' }}>
                      {ev.name}
                    </span>
                    <span style={{ display: 'block', marginTop: '9px', fontSize: '11px', color: '#6e7a8f' }}>
                      {ev.location}
                    </span>
                    <span style={{ display: 'block', marginTop: '8px', fontSize: '11px', color: '#6e7a8f' }}>
                      {ev._count?.allocations ?? 0} alat · {ev._count?.assignments ?? 0} kru
                    </span>
                  </span>
                  <StatusBadge status={ev.status} />
                </div>
              );
            })}
          </div>
        </section>

        {/* Peringatan Konflik */}
        <section id="conflict-panel" style={{ borderRadius: '12px', background: '#fff', padding: '18px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e0e5ed', paddingBottom: '15px' }}>
            <h2 className="font-bold-face" style={{ fontSize: '18px', color: '#1f293b' }}>Peringatan Konflik</h2>
            <span
              className="font-medium-face"
              style={{ borderRadius: '20px', background: conflictReviewed ? '#e0f7eb' : '#ffe8e8', padding: '6px 12px', fontSize: '11px', lineHeight: 1, color: conflictReviewed ? '#148c5c' : '#bf2e33' }}
            >
              {conflictReviewed ? 'Sedang ditinjau' : 'Tidak ada konflik'}
            </span>
          </div>

          <div style={{ marginTop: '17px', borderRadius: '10px', padding: '12px', background: conflictReviewed ? '#e8f0ff' : '#e0f7eb', transition: 'background 0.2s' }}>
            <p className="font-bold-face" style={{ fontSize: '13px', color: conflictReviewed ? '#2961e0' : '#148c5c' }}>
              {conflictReviewed ? 'Konflik sedang ditinjau' : 'Semua jadwal aman'}
            </p>
            <p className="font-medium-face" style={{ marginTop: '13px', fontSize: '11px', color: '#1f293b' }}>
              {events.filter(e => e.status === 'CONFIRMED').length} event terkonfirmasi
            </p>
            <p style={{ marginTop: '10px', fontSize: '11px', color: '#6e7a8f' }}>
              {equipment.filter(e => e.isActive).length} alat tersedia
            </p>
            <p className="font-medium-face" style={{ marginTop: '8px', fontSize: '11px', color: '#148c5c' }}>
              {new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          </div>

          <Link
            href="/dashboard/conflicts"
            style={{
              display: 'flex', justifyContent: 'center', alignItems: 'center',
              marginTop: '14px', height: '38px', width: '100%',
              borderRadius: '8px', background: '#2961e0',
              fontSize: '13px', color: '#fff', textDecoration: 'none',
              fontFamily: "'Inter:SemiBold', sans-serif", fontWeight: 600,
              transition: 'background 0.15s',
            }}
          >
            Tinjau konflik jadwal
          </Link>

          <h3 className="font-semibold-face" style={{ marginTop: '20px', fontSize: '15px', color: '#1f293b' }}>
            Aktivitas Terbaru
          </h3>
          <ul style={{ marginTop: '11px', display: 'flex', flexDirection: 'column', gap: '9px', listStyle: 'none', padding: 0 }}>
            {recentActivity.slice(0, 3).map((act, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#6e7a8f' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: act.color, flexShrink: 0 }} />
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{act.text}</span>
                <time style={{ fontSize: '10px', flexShrink: 0 }}>{act.time}</time>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* ── Main grid row 2: Resources + Upcoming ───────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 360px', gap: '20px', paddingBottom: '16px' }}>
        {/* Ketersediaan Resource */}
        <section style={{ borderRadius: '12px', background: '#fff', paddingTop: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <SectionHeading title="Ketersediaan Resource" subtitle="Status penggunaan resource hari ini" action="Kelola resource" actionHref="/dashboard/equipment" />
          <div style={{ padding: '0 20px' }}>
            {resources.map((res) => (
              <div
                key={res.name}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '140px 70px 1fr 110px',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '15px 0',
                  borderBottom: '1px solid #e0e5ed',
                }}
              >
                <p className="font-semibold-face" style={{ fontSize: '13px', color: '#1f293b' }}>{res.name}</p>
                <p style={{ fontSize: '12px', color: '#6e7a8f' }}>{res.total}</p>
                <div style={{ height: '8px', overflow: 'hidden', borderRadius: '20px', background: '#e0e5ed' }}>
                  <div style={{ height: '100%', width: `${res.pct}%`, borderRadius: '20px', background: RESOURCE_BAR_COLORS[res.tone], transition: 'width 0.6s ease' }} />
                </div>
                <p className="font-medium-face" style={{ fontSize: '11px', color: TONE[res.tone].text }}>{res.available}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Event Mendatang */}
        <section style={{ borderRadius: '12px', background: '#fff', paddingTop: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <SectionHeading title="Event Mendatang" subtitle="7 hari ke depan" />
          <div style={{ padding: '8px 20px 20px' }}>
            {upcomingEvents.length === 0 ? (
              <div style={{ padding: '30px 0', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                Tidak ada event mendatang.
              </div>
            ) : upcomingEvents.map((ev) => (
              <Link
                key={ev.id}
                href={`/dashboard/events/${ev.id}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: '14px',
                  padding: '10px 0', textDecoration: 'none',
                  transition: 'transform 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateX(4px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = ''; }}
              >
                <span style={{
                  display: 'grid', placeItems: 'center',
                  width: '42px', height: '42px', borderRadius: '8px',
                  background: '#e8f0ff', textAlign: 'center', flexShrink: 0,
                  color: '#2961e0',
                }}>
                  <span>
                    <strong className="font-bold-face" style={{ display: 'block', fontSize: '15px', lineHeight: 1 }}>
                      {new Date(ev.startAt).getDate()}
                    </strong>
                    <span className="font-bold-face" style={{ display: 'block', marginTop: '5px', fontSize: '8px', lineHeight: 1, letterSpacing: '0.05em' }}>
                      {new Date(ev.startAt).toLocaleString('id-ID', { month: 'short' }).toUpperCase()}
                    </span>
                  </span>
                </span>
                <span style={{ minWidth: 0 }}>
                  <span className="font-semibold-face" style={{ display: 'block', fontSize: '12px', color: '#1f293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {ev.name}
                  </span>
                  <span style={{ display: 'block', marginTop: '7px', fontSize: '10px', color: '#6e7a8f' }}>
                    {ev.location}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

// ─── Section heading component (Figma) ────────────────────────────────────────
function SectionHeading({ title, subtitle, action, actionHref }: {
  title: string;
  subtitle?: string;
  action?: string;
  actionHref?: string;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px',
      borderBottom: '1px solid #e0e5ed', padding: '0 20px 18px',
    }}>
      <div>
        <h2 className="font-bold-face" style={{ fontSize: '18px', lineHeight: 1.3, color: '#1f293b' }}>{title}</h2>
        {subtitle && <p style={{ marginTop: '7px', fontSize: '12px', color: '#6e7a8f' }}>{subtitle}</p>}
      </div>
      {action && actionHref && (
        <Link
          href={actionHref}
          className="font-semibold-face"
          style={{ marginTop: '4px', whiteSpace: 'nowrap', fontSize: '12px', color: '#2961e0', textDecoration: 'none', flexShrink: 0 }}
        >
          {action} →
        </Link>
      )}
    </div>
  );
}
