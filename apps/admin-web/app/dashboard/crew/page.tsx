'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api, ApiError } from '../../lib/api-client.js';
import type { UserInfo, ListResponse } from '../../lib/api-client.js';
import { formatDate } from '../page.js';

interface CreateForm {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  skills: string;
}

const FORM_INIT: CreateForm = { email: '', password: '', fullName: '', phone: '', skills: '' };

export default function CrewPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [res, setRes] = useState<ListResponse<UserInfo> | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<CreateForm>(FORM_INIT);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState('');

  const search = searchParams.get('search') ?? '';
  const page = Number(searchParams.get('page') ?? '1');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { role: 'CREW', page: String(page), limit: '15' };
      if (search) params['search'] = search;
      setRes(await api.getUsers(params));
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { void load(); }, [load]);

  function setParam(key: string, value: string) {
    const p = new URLSearchParams(searchParams.toString());
    if (value) p.set(key, value); else p.delete(key);
    p.delete('page');
    router.push(`/dashboard/crew?${p.toString()}`);
  }

  function setField(key: keyof CreateForm, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setFormErrors((e) => { const n = { ...e }; delete n[key]; return n; });
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) e['email'] = 'Valid email required.';
    if (form.password.length < 8) e['password'] = 'Password must be at least 8 characters.';
    if (!form.fullName.trim()) e['fullName'] = 'Full name is required.';
    setFormErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setServerError('');
    try {
      await api.createUser({
        email: form.email,
        password: form.password,
        fullName: form.fullName,
        role: 'CREW',
        phone: form.phone || undefined,
        skills: form.skills || undefined,
      });
      setShowModal(false);
      setForm(FORM_INIT);
      await load();
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : 'Failed to create crew member.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(user: UserInfo) {
    if (!confirm(`${user.isActive ? 'Deactivate' : 'Activate'} ${user.fullName}?`)) return;
    try {
      await api.updateUser(user.id, { isActive: !user.isActive });
      await load();
    } catch { alert('Update failed.'); }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Crew Members</h1>
          <p className="page-subtitle">{res ? `${res.meta.total} crew members` : 'Loading…'}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)} id="btn-add-crew">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Add Crew Member
        </button>
      </div>

      {/* Search */}
      <div className="filter-bar">
        <div className="search-bar">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <input
            placeholder="Search crew…"
            defaultValue={search}
            onChange={(e) => {
              clearTimeout((window as Window & { _crst?: ReturnType<typeof setTimeout> })._crst);
              (window as Window & { _crst?: ReturnType<typeof setTimeout> })._crst = setTimeout(() => setParam('search', e.target.value), 400);
            }}
          />
        </div>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Skills</th>
              <th>Last Login</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px' }}><div className="spinner" style={{ margin: '0 auto' }} /></td></tr>
            ) : !res?.data.length ? (
              <tr><td colSpan={7}><div className="empty-state"><p>No crew members found.</p></div></td></tr>
            ) : (
              res.data.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div className="avatar" style={{ width: '28px', height: '28px', fontSize: '11px' }}>
                        {user.fullName.charAt(0)}
                      </div>
                      <span style={{ fontWeight: 500 }}>{user.fullName}</span>
                    </div>
                  </td>
                  <td className="muted">{user.email}</td>
                  <td className="muted">{user.crewProfile?.phone ?? '—'}</td>
                  <td className="muted" style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user.crewProfile?.skills || '—'}
                  </td>
                  <td className="muted">{user.lastLoginAt ? formatDate(user.lastLoginAt) : 'Never'}</td>
                  <td>
                    <span className={`badge ${user.isActive ? 'badge-active' : 'badge-cancelled'}`}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <button
                      className={`btn btn-sm ${user.isActive ? 'btn-secondary' : 'btn-primary'}`}
                      onClick={() => void toggleActive(user)}
                    >
                      {user.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {res && res.meta.totalPages > 1 && (
          <div className="pagination">
            <span>Showing {(page - 1) * 15 + 1}–{Math.min(page * 15, res.meta.total)} of {res.meta.total}</span>
            <div className="pagination-controls">
              <button className="page-btn" disabled={page <= 1} onClick={() => setParam('page', String(page - 1))}>‹</button>
              {Array.from({ length: res.meta.totalPages }, (_, i) => i + 1).map((p) => (
                <button key={p} className={`page-btn${p === page ? ' active' : ''}`} onClick={() => setParam('page', String(p))}>{p}</button>
              ))}
              <button className="page-btn" disabled={page >= res.meta.totalPages} onClick={() => setParam('page', String(page + 1))}>›</button>
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="dialog-overlay" onClick={() => setShowModal(false)}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <span className="dialog-title">Add Crew Member</span>
              <button className="close-btn" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={(e) => void handleCreate(e)}>
              <div className="dialog-body">
                <div className="form-group">
                  <label className="form-label required">Full Name</label>
                  <input className="form-input" placeholder="Budi Santoso" value={form.fullName}
                    onChange={(e) => setField('fullName', e.target.value)} />
                  {formErrors['fullName'] && <span className="form-error">{formErrors['fullName']}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label required">Email</label>
                  <input type="email" className="form-input" placeholder="budi@epms.local" value={form.email}
                    onChange={(e) => setField('email', e.target.value)} />
                  {formErrors['email'] && <span className="form-error">{formErrors['email']}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label required">Password</label>
                  <input type="password" className="form-input" placeholder="Min 8 characters" value={form.password}
                    onChange={(e) => setField('password', e.target.value)} />
                  {formErrors['password'] && <span className="form-error">{formErrors['password']}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input className="form-input" placeholder="+62 812 3456 7890" value={form.phone}
                    onChange={(e) => setField('phone', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Skills</label>
                  <input className="form-input" placeholder="Audio engineer, Lighting, Stage" value={form.skills}
                    onChange={(e) => setField('skills', e.target.value)} />
                </div>
                {serverError && <div style={{ color: '#f87171', fontSize: '13px' }}>{serverError}</div>}
              </div>
              <div className="dialog-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving} id="btn-confirm-crew">
                  {saving ? 'Creating…' : 'Create Crew Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
