'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '../lib/api-client.js';
import type { EventInfo, EquipmentInfo, UserInfo } from '../lib/api-client.js';

type DashStats = {
  totalEvents: number;
  activeEvents: number;
  totalEquipment: number;
  totalCrew: number;
  upcomingEvents: EventInfo[];
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [eventsRes, confirmedRes, inProgressRes, equipmentRes, crewRes] = await Promise.all([
          api.getEvents({ limit: '5', page: '1' }),
          api.getEvents({ status: 'CONFIRMED', limit: '1' }),
          api.getEvents({ status: 'IN_PROGRESS', limit: '1' }),
          api.getEquipment({ limit: '1' }),
          api.getUsers({ role: 'CREW', limit: '1' }),
        ]);

        // Get upcoming = CONFIRMED events ordered by startAt
        const upcomingRes = await api.getEvents({ status: 'CONFIRMED', limit: '5' });

        setStats({
          totalEvents: eventsRes.meta.total,
          activeEvents: confirmedRes.meta.total + inProgressRes.meta.total,
          totalEquipment: equipmentRes.meta.total,
          totalCrew: crewRes.meta.total,
          upcomingEvents: upcomingRes.data,
        });
      } catch {
        // silently fail — user sees partial data
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
        <div className="spinner" style={{ width: '32px', height: '32px' }} />
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Overview of event production operations</p>
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
        <StatCard
          label="Total Events"
          value={stats?.totalEvents ?? 0}
          icon="📅"
          color="#6366f1"
          href="/dashboard/events"
        />
        <StatCard
          label="Active Events"
          value={stats?.activeEvents ?? 0}
          icon="🎬"
          color="#f59e0b"
          href="/dashboard/events?status=CONFIRMED"
        />
        <StatCard
          label="Equipment Items"
          value={stats?.totalEquipment ?? 0}
          icon="📦"
          color="#22c55e"
          href="/dashboard/equipment"
        />
        <StatCard
          label="Crew Members"
          value={stats?.totalCrew ?? 0}
          icon="👥"
          color="#3b82f6"
          href="/dashboard/crew"
        />
      </div>

      {/* Upcoming Events */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 600 }}>Upcoming Events</h2>
            <Link href="/dashboard/events" className="btn btn-secondary btn-sm">View all</Link>
          </div>

          {!stats?.upcomingEvents.length ? (
            <div className="empty-state" style={{ padding: '32px' }}>
              <p>No confirmed events</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {stats.upcomingEvents.map((event) => (
                <Link
                  key={event.id}
                  href={`/dashboard/events/${event.id}`}
                  style={{ textDecoration: 'none' }}
                >
                  <div
                    style={{
                      padding: '12px',
                      background: 'var(--bg-surface)',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)',
                      transition: 'border-color 0.15s',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '13.5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>
                          {event.name}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {event.code} · {event.location}
                        </div>
                      </div>
                      <StatusBadge status={event.status} />
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                      {formatDateRange(event.startAt, event.endAt)}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="card">
          <h2 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px' }}>Quick Actions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <QuickAction
              href="/dashboard/events/new"
              icon="➕"
              label="Create New Event"
              desc="Start planning a new event"
              color="#6366f1"
            />
            <QuickAction
              href="/dashboard/equipment/new"
              icon="📦"
              label="Add Equipment"
              desc="Register new equipment item"
              color="#22c55e"
            />
            <QuickAction
              href="/dashboard/crew/new"
              icon="👤"
              label="Add Crew Member"
              desc="Create a new crew account"
              color="#3b82f6"
            />
            <QuickAction
              href="/dashboard/events"
              icon="📋"
              label="View All Events"
              desc="Manage event production"
              color="#f59e0b"
            />
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  label, value, icon, color, href,
}: {
  label: string;
  value: number;
  icon: string;
  color: string;
  href: string;
}) {
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <div className="stat-card" style={{ cursor: 'pointer', transition: 'border-color 0.15s, transform 0.15s' }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = color; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.transform = 'none'; }}
      >
        <div className="stat-icon" style={{ background: `${color}20` }}>
          <span style={{ fontSize: '20px' }}>{icon}</span>
        </div>
        <div>
          <div className="stat-value">{value.toLocaleString()}</div>
          <div className="stat-label">{label}</div>
        </div>
      </div>
    </Link>
  );
}

function QuickAction({
  href, icon, label, desc, color,
}: {
  href: string;
  icon: string;
  label: string;
  desc: string;
  color: string;
}) {
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px',
          background: 'var(--bg-surface)',
          borderRadius: '8px',
          border: '1px solid var(--border-subtle)',
          cursor: 'pointer',
          transition: 'border-color 0.15s',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = color; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-subtle)'; }}
      >
        <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
          {icon}
        </div>
        <div>
          <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)' }}>{label}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{desc}</div>
        </div>
      </div>
    </Link>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    DRAFT: 'badge-draft',
    CONFIRMED: 'badge-confirmed',
    IN_PROGRESS: 'badge-inprogress',
    COMPLETED: 'badge-completed',
    CANCELLED: 'badge-cancelled',
    ACTIVE: 'badge-active',
    PENDING: 'badge-pending',
  };
  const labels: Record<string, string> = {
    DRAFT: 'Draft',
    CONFIRMED: 'Confirmed',
    IN_PROGRESS: 'In Progress',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
    ACTIVE: 'Active',
    PENDING: 'Pending',
  };
  return (
    <span className={`badge ${map[status] ?? 'badge-draft'}`}>
      {labels[status] ?? status}
    </span>
  );
}

export function formatDateRange(startAt: string, endAt: string): string {
  const start = new Date(startAt);
  const end = new Date(endAt);
  const opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false };
  return `${start.toLocaleString('id-ID', opts)} → ${end.toLocaleString('id-ID', opts)}`;
}

export function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}
