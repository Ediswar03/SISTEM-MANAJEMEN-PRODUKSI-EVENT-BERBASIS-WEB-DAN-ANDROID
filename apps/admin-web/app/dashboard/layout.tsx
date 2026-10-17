'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { api, clearTokens, getAccessToken, getRefreshToken } from '../lib/api-client';
import type { UserInfo } from '../lib/api-client';

// Navigation items — exact match Figma
const NAV_SECTIONS = [
  {
    label: null,
    links: [
      { href: '/dashboard',           icon: '▦', label: 'Dashboard' },
      { href: '/dashboard/events',    icon: '▣', label: 'Manajemen Event' },
      { href: '/dashboard/schedule',  icon: '▦', label: 'Kalender Jadwal' },
    ],
  },
  {
    label: 'SUMBER DAYA',
    links: [
      { href: '/dashboard/equipment', icon: '◈', label: 'Resource & Alat' },
      { href: '/dashboard/crew',      icon: '♙', label: 'Manajemen Kru' },
    ],
  },
  {
    label: 'ANALITIK',
    links: [
      { href: '/dashboard/conflicts', icon: '▲', label: 'Validasi Konflik' },
      { href: '/dashboard/reports',   icon: '▤', label: 'Laporan' },
    ],
  },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) { router.replace('/login'); return; }
    api.getMe()
      .then((res) => setUser(res.data))
      .catch(() => { clearTokens(); router.replace('/login'); });
  }, [router]);

  async function handleLogout() {
    const rt = getRefreshToken();
    if (rt) {
      try { await api.logout(rt); } catch { /* best-effort */ }
    }
    clearTokens();
    router.replace('/login');
  }

  if (!user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f7fa' }}>
        <div className="spinner" style={{ width: '32px', height: '32px' }} />
      </div>
    );
  }

  // Initials for avatar
  const initials = user.fullName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div style={{ display: 'flex', minHeight: '100dvh', background: '#f5f7fa' }}>
      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside
        style={{
          position: 'fixed', inset: '0 auto 0 0', zIndex: 20,
          width: '248px', display: 'flex', flexDirection: 'column',
          background: 'var(--sidebar-bg)',
          padding: '28px 16px',
        }}
      >
        {/* Brand */}
        <div style={{ padding: '0 12px' }}>
          <p className="font-bold-face" style={{ fontSize: '21px', lineHeight: 1, color: '#fff' }}>STAGEFLOW</p>
          <p className="font-medium-face" style={{ marginTop: '9px', fontSize: '10px', color: '#adbacf', letterSpacing: '0.08em' }}>
            EVENT PRODUCTION
          </p>
        </div>

        {/* Nav */}
        <nav style={{ marginTop: '42px', flex: 1 }} aria-label="Navigasi utama">
          {NAV_SECTIONS.map((section, si) => (
            <div key={si} style={{ marginBottom: '8px' }}>
              {section.label && (
                <p
                  className="font-bold-face"
                  style={{
                    fontSize: '10px', color: 'var(--sidebar-section-text)',
                    padding: '12px 14px 6px', letterSpacing: '0.08em',
                  }}
                >
                  {section.label}
                </p>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {section.links.map((link) => {
                  const isActive = link.href === '/dashboard'
                    ? pathname === '/dashboard'
                    : pathname.startsWith(link.href);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '12px',
                        height: '42px', padding: '0 14px',
                        borderRadius: '9px',
                        fontSize: '13px', textDecoration: 'none',
                        transition: 'all 0.15s',
                        background: isActive ? 'var(--sidebar-active-bg)' : 'transparent',
                        color: isActive ? 'var(--sidebar-active)' : 'var(--sidebar-text)',
                        fontFamily: isActive ? "'Inter:Medium', sans-serif" : "'Inter:Regular', sans-serif",
                        fontWeight: isActive ? 500 : 400,
                      }}
                    >
                      <span
                        className="symbol-regular"
                        aria-hidden="true"
                        style={{ width: '14px', textAlign: 'center', fontSize: '12px', flexShrink: 0 }}
                      >
                        {link.icon}
                      </span>
                      {link.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Preferences */}
          <div style={{ marginTop: '20px', borderTop: '1px solid var(--sidebar-border)', paddingTop: '16px' }}>
            <p className="font-bold-face" style={{ fontSize: '10px', color: '#8c9cb2', padding: '0 14px 8px', letterSpacing: '0.08em' }}>
              PREFERENSI
            </p>
            <Link
              href="/dashboard/settings"
              style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                height: '38px', padding: '0 14px',
                fontSize: '13px', color: 'var(--sidebar-text)', textDecoration: 'none',
                transition: 'color 0.15s',
                borderRadius: '9px',
              }}
            >
              <span className="symbol-regular" aria-hidden="true">⚙</span>
              Pengaturan
            </Link>
          </div>
        </nav>

        {/* User profile footer */}
        <button
          onClick={() => void handleLogout()}
          style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            borderRadius: '8px', padding: '8px 12px',
            background: 'transparent', border: 'none', cursor: 'pointer',
            width: '100%', textAlign: 'left',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#202d43'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          id="logout-btn"
          title="Klik untuk sign out"
        >
          <span
            className="font-bold-face"
            style={{
              display: 'grid', placeItems: 'center',
              width: '38px', height: '38px', borderRadius: '50%',
              background: '#385482', fontSize: '12px', color: '#fff',
              flexShrink: 0,
            }}
          >
            {initials}
          </span>
          <span style={{ minWidth: 0 }}>
            <span
              className="font-medium-face"
              style={{ display: 'block', fontSize: '13px', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            >
              {user.fullName}
            </span>
            <span style={{ display: 'block', marginTop: '3px', fontSize: '11px', color: '#a8b8cc' }}>
              {user.role === 'ADMIN' ? 'Administrator' : 'Crew'}
            </span>
          </span>
        </button>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <main style={{ marginLeft: '248px', flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
        {/* Topbar */}
        <div
          style={{
            height: '52px', background: '#fff',
            borderBottom: '1px solid #e0e5ed',
            display: 'flex', alignItems: 'center',
            padding: '0 32px', gap: '12px',
            position: 'sticky', top: 0, zIndex: 10,
            boxShadow: '0 1px 0 #e0e5ed',
          }}
        >
          <div style={{ flex: 1 }}>
            <BreadCrumb pathname={pathname} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              className="font-bold-face"
              style={{
                display: 'grid', placeItems: 'center',
                width: '30px', height: '30px', borderRadius: '50%',
                background: '#385482', fontSize: '11px', color: '#fff',
              }}
            >
              {initials}
            </span>
            <span style={{ fontSize: '13px', color: '#6e7a8f' }}>{user.email}</span>
          </div>
        </div>

        {/* Page content */}
        <div style={{ flex: 1, padding: '28px 40px 28px 32px' }}>
          {children}
        </div>
      </main>
    </div>
  );
}

function BreadCrumb({ pathname }: { pathname: string }) {
  const LABELS: Record<string, string> = {
    dashboard: 'Dashboard',
    events: 'Events',
    schedule: 'Schedule',
    equipment: 'Resource & Alat',
    crew: 'Manajemen Kru',
    conflicts: 'Conflicts',
    reports: 'Reports',
    new: 'New',
  };
  const parts = pathname.split('/').filter(Boolean);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#6e7a8f' }}>
      {parts.map((part, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span style={{ opacity: 0.5 }}>/</span>}
          <span style={{
            color: i === parts.length - 1 ? '#1f293b' : '#6e7a8f',
            fontWeight: i === parts.length - 1 ? 500 : 400,
            textTransform: 'capitalize',
          }}>
            {LABELS[part] ?? part.replace(/-/g, ' ')}
          </span>
        </React.Fragment>
      ))}
    </div>
  );
}
