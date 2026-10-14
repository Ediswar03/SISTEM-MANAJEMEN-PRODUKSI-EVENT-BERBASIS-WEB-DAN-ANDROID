'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { api, clearTokens, getAccessToken, getRefreshToken } from '../lib/api-client.js';
import type { UserInfo } from '../lib/api-client.js';

const NAV_ITEMS = [
  {
    section: 'Main',
    links: [
      { href: '/dashboard', label: 'Dashboard', icon: IconGrid },
      { href: '/dashboard/events', label: 'Events', icon: IconCalendar },
    ],
  },
  {
    section: 'Resources',
    links: [
      { href: '/dashboard/equipment', label: 'Equipment', icon: IconBox },
      { href: '/dashboard/crew', label: 'Crew', icon: IconUsers },
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
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)' }}>
        <div className="spinner" style={{ width: '32px', height: '32px' }} />
      </div>
    );
  }

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span>⚡ EPMS</span>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Production Management
          </p>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((section) => (
            <div key={section.section}>
              <div className="nav-section-label">{section.section}</div>
              {section.links.map((link) => {
                const isActive = pathname === link.href || (link.href !== '/dashboard' && pathname.startsWith(link.href));
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`nav-link${isActive ? ' active' : ''}`}
                  >
                    <link.icon size={16} />
                    {link.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div className="avatar">{user.fullName.charAt(0).toUpperCase()}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.fullName}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                <span className={`badge badge-${user.role.toLowerCase()}`} style={{ padding: '1px 6px', fontSize: '10px' }}>{user.role}</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => void handleLogout()}
            className="btn btn-secondary btn-sm"
            style={{ width: '100%', justifyContent: 'center' }}
            id="logout-btn"
          >
            <IconLogout size={13} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="main-content">
        <div className="topbar">
          <div style={{ flex: 1 }}>
            <BreadCrumb pathname={pathname} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="avatar" style={{ width: '28px', height: '28px', fontSize: '11px' }}>
              {user.fullName.charAt(0).toUpperCase()}
            </div>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{user.email}</span>
          </div>
        </div>
        <div className="page-content">{children}</div>
      </main>
    </div>
  );
}

function BreadCrumb({ pathname }: { pathname: string }) {
  const parts = pathname.replace('/dashboard', '').split('/').filter(Boolean);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-muted)' }}>
      <Link href="/dashboard" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
        Dashboard
      </Link>
      {parts.map((part, i) => (
        <React.Fragment key={i}>
          <span>/</span>
          <span style={{ color: i === parts.length - 1 ? 'var(--text-primary)' : 'var(--text-secondary)', textTransform: 'capitalize' }}>
            {part.replace(/-/g, ' ')}
          </span>
        </React.Fragment>
      ))}
    </div>
  );
}

// ─── Icon components (inline SVG to avoid external dep) ───────────────────────
type IconProps = { size?: number };

function IconGrid({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}
function IconCalendar({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}
function IconBox({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}
function IconUsers({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function IconLogout({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
