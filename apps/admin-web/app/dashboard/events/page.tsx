'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { api, ApiError } from '../../lib/api-client';
import type { EventInfo, ListResponse } from '../../lib/api-client';
import { StatusBadge, formatDate } from '../utils';

const STATUS_OPTIONS = ['', 'DRAFT', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

export default function EventsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [res, setRes] = useState<ListResponse<EventInfo> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const status = searchParams.get('status') ?? '';
  const search = searchParams.get('search') ?? '';
  const page = Number(searchParams.get('page') ?? '1');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string> = { page: String(page), limit: '15' };
      if (status) params['status'] = status;
      if (search) params['search'] = search;
      setRes(await api.getEvents(params));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load events.');
    } finally {
      setLoading(false);
    }
  }, [status, search, page]);

  useEffect(() => { void load(); }, [load]);

  function setParam(key: string, value: string) {
    const p = new URLSearchParams(searchParams.toString());
    if (value) p.set(key, value); else p.delete(key);
    p.delete('page');
    router.push(`/dashboard/events?${p.toString()}`);
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Events</h1>
          <p className="page-subtitle">
            {res ? `${res.meta.total} events found` : 'Loading…'}
          </p>
        </div>
        <Link href="/dashboard/events/new" className="btn btn-primary" id="btn-create-event">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          New Event
        </Link>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <div className="search-bar">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <input
            placeholder="Search events…"
            defaultValue={search}
            onChange={(e) => {
              clearTimeout((window as Window & { _st?: ReturnType<typeof setTimeout> })._st);
              (window as Window & { _st?: ReturnType<typeof setTimeout> })._st = setTimeout(() => setParam('search', e.target.value), 400);
            }}
          />
        </div>
        <select
          className="form-select"
          style={{ width: 'auto' }}
          value={status}
          onChange={(e) => setParam('status', e.target.value)}
          id="filter-status"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s || 'All Statuses'}</option>
          ))}
        </select>
        {(status || search) && (
          <button className="btn btn-secondary btn-sm" onClick={() => router.push('/dashboard/events')}>
            Clear filters
          </button>
        )}
      </div>

      {error && (
        <div style={{ padding: '12px 16px', background: 'var(--danger)15', border: '1px solid var(--danger)30', borderRadius: '8px', color: '#f87171', marginBottom: '16px', fontSize: '13px' }}>
          {error}
        </div>
      )}

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Client</th>
              <th>Location</th>
              <th>Start Date</th>
              <th>End Date</th>
              <th>Status</th>
              <th>Eq / Crew</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '40px' }}>
                  <div className="spinner" style={{ margin: '0 auto' }} />
                </td>
              </tr>
            ) : !res?.data.length ? (
              <tr>
                <td colSpan={9}>
                  <div className="empty-state">
                    <p>No events found.</p>
                  </div>
                </td>
              </tr>
            ) : (
              res.data.map((event) => (
                <tr key={event.id}>
                  <td>
                    <span className="tag">{event.code}</span>
                  </td>
                  <td style={{ fontWeight: 500 }}>{event.name}</td>
                  <td className="muted">{event.clientName ?? '—'}</td>
                  <td className="muted">{event.location}</td>
                  <td className="muted">{formatDate(event.startAt)}</td>
                  <td className="muted">{formatDate(event.endAt)}</td>
                  <td><StatusBadge status={event.status} /></td>
                  <td className="muted" style={{ fontSize: '12px' }}>
                    {event._count?.allocations ?? 0} eq · {event._count?.assignments ?? 0} crew
                  </td>
                  <td>
                    <Link href={`/dashboard/events/${event.id}`} className="btn btn-secondary btn-sm">
                      View
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {res && res.meta.totalPages > 1 && (
          <div className="pagination">
            <span>
              Showing {(page - 1) * 15 + 1}–{Math.min(page * 15, res.meta.total)} of {res.meta.total}
            </span>
            <div className="pagination-controls">
              <button
                className="page-btn"
                disabled={page <= 1}
                onClick={() => setParam('page', String(page - 1))}
              >‹</button>
              {Array.from({ length: res.meta.totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  className={`page-btn${p === page ? ' active' : ''}`}
                  onClick={() => setParam('page', String(p))}
                >{p}</button>
              ))}
              <button
                className="page-btn"
                disabled={page >= res.meta.totalPages}
                onClick={() => setParam('page', String(page + 1))}
              >›</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
