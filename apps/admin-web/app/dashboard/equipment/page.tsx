'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { api, ApiError } from '../../lib/api-client.js';
import type { CategoryInfo, EquipmentInfo, ListResponse } from '../../lib/api-client.js';
import { StatusBadge } from '../page.js';

const CONDITION_BADGE: Record<string, string> = {
  EXCELLENT: 'badge-completed',
  GOOD: 'badge-active',
  FAIR: 'badge-inprogress',
  POOR: 'badge-cancelled',
  UNUSABLE: 'badge-cancelled',
};

export default function EquipmentPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [res, setRes] = useState<ListResponse<EquipmentInfo> | null>(null);
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const categoryId = searchParams.get('categoryId') ?? '';
  const search = searchParams.get('search') ?? '';
  const page = Number(searchParams.get('page') ?? '1');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), limit: '15' };
      if (categoryId) params['categoryId'] = categoryId;
      if (search) params['search'] = search;
      const [eqRes, catRes] = await Promise.all([
        api.getEquipment(params),
        categories.length ? Promise.resolve({ data: categories }) : api.getCategories(),
      ]);
      setRes(eqRes);
      if (!categories.length) setCategories((catRes as { data: CategoryInfo[] }).data);
    } catch { /* show partial */ } finally {
      setLoading(false);
    }
  }, [page, categoryId, search, categories.length]);

  useEffect(() => { void load(); }, [load]);

  function setParam(key: string, value: string) {
    const p = new URLSearchParams(searchParams.toString());
    if (value) p.set(key, value); else p.delete(key);
    p.delete('page');
    router.push(`/dashboard/equipment?${p.toString()}`);
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Equipment</h1>
          <p className="page-subtitle">{res ? `${res.meta.total} items` : 'Loading…'}</p>
        </div>
        <Link href="/dashboard/equipment/new" className="btn btn-primary" id="btn-create-equipment">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Add Equipment
        </Link>
      </div>

      <div className="filter-bar">
        <div className="search-bar">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <input
            placeholder="Search equipment…"
            defaultValue={search}
            onChange={(e) => {
              clearTimeout((window as Window & { _eqst?: ReturnType<typeof setTimeout> })._eqst);
              (window as Window & { _eqst?: ReturnType<typeof setTimeout> })._eqst = setTimeout(() => setParam('search', e.target.value), 400);
            }}
          />
        </div>
        <select className="form-select" style={{ width: 'auto' }} value={categoryId}
          onChange={(e) => setParam('categoryId', e.target.value)} id="filter-category">
          <option value="">All Categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {(categoryId || search) && (
          <button className="btn btn-secondary btn-sm" onClick={() => router.push('/dashboard/equipment')}>
            Clear
          </button>
        )}
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Category</th>
              <th>On Hand</th>
              <th>Usable</th>
              <th>Condition</th>
              <th>Location</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: '40px' }}><div className="spinner" style={{ margin: '0 auto' }} /></td></tr>
            ) : !res?.data.length ? (
              <tr><td colSpan={9}><div className="empty-state"><p>No equipment found.</p></div></td></tr>
            ) : (
              res.data.map((eq) => (
                <tr key={eq.id}>
                  <td><span className="tag">{eq.code}</span></td>
                  <td style={{ fontWeight: 500 }}>{eq.name}</td>
                  <td className="muted">{eq.category.name}</td>
                  <td style={{ textAlign: 'right' }}>{eq.quantityOnHand}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{eq.usableQuantity}</td>
                  <td>
                    <span className={`badge ${CONDITION_BADGE[eq.condition] ?? 'badge-draft'}`} style={{ fontSize: '11px' }}>
                      {eq.condition}
                    </span>
                  </td>
                  <td className="muted">{eq.storageLocation}</td>
                  <td>
                    <span className={`badge ${eq.isActive ? 'badge-active' : 'badge-cancelled'}`}>
                      {eq.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <Link href={`/dashboard/equipment/${eq.id}`} className="btn btn-secondary btn-sm">
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
    </>
  );
}
