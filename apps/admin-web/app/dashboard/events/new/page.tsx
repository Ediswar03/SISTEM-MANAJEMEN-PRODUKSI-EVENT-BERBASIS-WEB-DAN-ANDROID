'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '../../../lib/api-client';
import type { UserInfo } from '../../../lib/api-client';

interface FormState {
  code: string;
  name: string;
  clientName: string;
  location: string;
  timezone: string;
  startAt: string;
  endAt: string;
  notes: string;
  responsibleUserId: string;
}

const INITIAL: FormState = {
  code: '', name: '', clientName: '', location: '',
  timezone: 'Asia/Jakarta', startAt: '', endAt: '',
  notes: '', responsibleUserId: '',
};

export default function NewEventPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(INITIAL);
  const [admins, setAdmins] = useState<UserInfo[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  useEffect(() => {
    void api.getUsers({ role: 'ADMIN', limit: '50' })
      .then((res) => { setAdmins(res.data); })
      .catch(() => {/* non-critical */});
  }, []);

  function set(key: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => { const n = { ...e }; delete n[key]; return n; });
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.code.trim()) e['code'] = 'Code is required.';
    else if (!/^[A-Z0-9-]+$/.test(form.code)) e['code'] = 'Only uppercase letters, numbers, and hyphens.';
    if (!form.name.trim()) e['name'] = 'Name is required.';
    if (!form.location.trim()) e['location'] = 'Location is required.';
    if (!form.startAt) e['startAt'] = 'Start date/time is required.';
    if (!form.endAt) e['endAt'] = 'End date/time is required.';
    if (form.startAt && form.endAt && new Date(form.startAt) >= new Date(form.endAt))
      e['endAt'] = 'End must be after start.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setServerError('');

    try {
      const res = await api.createEvent({
        code: form.code,
        name: form.name,
        clientName: form.clientName || undefined,
        location: form.location,
        timezone: form.timezone,
        startAt: new Date(form.startAt).toISOString(),
        endAt: new Date(form.endAt).toISOString(),
        notes: form.notes || undefined,
        responsibleUserId: form.responsibleUserId || undefined,
      });
      router.push(`/dashboard/events/${res.data.id}`);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to create event.';
      setServerError(msg);
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">New Event</h1>
          <p className="page-subtitle">Create a new event in DRAFT status</p>
        </div>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} style={{ maxWidth: '720px' }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label required" htmlFor="event-code">Event Code</label>
              <input id="event-code" className="form-input" placeholder="EVT-2026-001"
                value={form.code}
                onChange={(e) => set('code', e.target.value.toUpperCase())}
              />
              {errors['code'] && <span className="form-error">{errors['code']}</span>}
            </div>
            <div className="form-group">
              <label className="form-label required" htmlFor="event-name">Event Name</label>
              <input id="event-name" className="form-input" placeholder="Annual Conference 2026"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
              />
              {errors['name'] && <span className="form-error">{errors['name']}</span>}
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="event-client">Client Name</label>
              <input id="event-client" className="form-input" placeholder="PT. Klien Indonesia"
                value={form.clientName}
                onChange={(e) => set('clientName', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label required" htmlFor="event-location">Location</label>
              <input id="event-location" className="form-input" placeholder="Ballroom Grand Hotel Jakarta"
                value={form.location}
                onChange={(e) => set('location', e.target.value)}
              />
              {errors['location'] && <span className="form-error">{errors['location']}</span>}
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label required" htmlFor="event-start">Start Date & Time</label>
              <input id="event-start" type="datetime-local" className="form-input"
                value={form.startAt}
                onChange={(e) => set('startAt', e.target.value)}
              />
              {errors['startAt'] && <span className="form-error">{errors['startAt']}</span>}
            </div>
            <div className="form-group">
              <label className="form-label required" htmlFor="event-end">End Date & Time</label>
              <input id="event-end" type="datetime-local" className="form-input"
                value={form.endAt}
                onChange={(e) => set('endAt', e.target.value)}
              />
              {errors['endAt'] && <span className="form-error">{errors['endAt']}</span>}
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="event-timezone">Timezone</label>
              <select id="event-timezone" className="form-select"
                value={form.timezone}
                onChange={(e) => set('timezone', e.target.value)}
              >
                <option value="Asia/Jakarta">Asia/Jakarta (WIB)</option>
                <option value="Asia/Makassar">Asia/Makassar (WITA)</option>
                <option value="Asia/Jayapura">Asia/Jayapura (WIT)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="event-responsible">Responsible Person</label>
              <select id="event-responsible" className="form-select"
                value={form.responsibleUserId}
                onChange={(e) => set('responsibleUserId', e.target.value)}
              >
                <option value="">— None —</option>
                {admins.map((u) => (
                  <option key={u.id} value={u.id}>{u.fullName}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="event-notes">Notes</label>
            <textarea id="event-notes" className="form-textarea" placeholder="Additional notes…"
              rows={3}
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
            />
          </div>

          {serverError && (
            <div style={{ padding: '10px 14px', background: '#ef444415', border: '1px solid #ef444430', borderRadius: '6px', color: '#f87171', fontSize: '13px' }}>
              {serverError}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={() => router.back()}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting} id="btn-submit-event">
              {submitting ? <><div className="spinner" style={{ width: '14px', height: '14px' }} /> Creating…</> : 'Create Event'}
            </button>
          </div>
        </div>
      </form>
    </>
  );
}
