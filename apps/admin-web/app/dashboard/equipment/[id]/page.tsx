'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, ApiError } from '../../../lib/api-client';
import type { EquipmentDetail } from '../../../lib/api-client';
import { formatDate } from '../../page';

const CONDITION_COLOR: Record<string, string> = {
  EXCELLENT: '#22c55e', GOOD: '#4ade80', FAIR: '#f59e0b', POOR: '#ef4444', UNUSABLE: '#6b7280',
};

export default function EquipmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [item, setItem] = useState<EquipmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ usableQuantity: '', condition: '', storageLocation: '', isActive: 'true' });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    api.getEquipmentItem(id)
      .then((r) => {
        setItem(r.data);
        setEditForm({
          usableQuantity: String(r.data.usableQuantity),
          condition: r.data.condition,
          storageLocation: r.data.storageLocation,
          isActive: String(r.data.isActive),
        });
      })
      .catch(() => router.replace('/dashboard/equipment'))
      .finally(() => setLoading(false));
  }, [id, router]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!item) return;
    setSaving(true);
    setSaveError('');
    try {
      await api.updateEquipment(id, {
        usableQuantity: Number(editForm.usableQuantity),
        condition: editForm.condition,
        storageLocation: editForm.storageLocation,
        isActive: editForm.isActive === 'true',
      } as Parameters<typeof api.updateEquipment>[1]);
      const updated = await api.getEquipmentItem(id);
      setItem(updated.data);
      setEditing(false);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><div className="spinner" style={{ width: '32px', height: '32px' }} /></div>;
  if (!item) return null;

  const activeAllocations = item.allocations.filter((a) => a.status !== 'CANCELLED');

  return (
    <>
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
            <span className="tag">{item.code}</span>
            <span className={`badge ${item.isActive ? 'badge-active' : 'badge-cancelled'}`}>
              {item.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
          <h1 className="page-title">{item.name}</h1>
          <p className="page-subtitle">{item.category.name} · {item.storageLocation}</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary" onClick={() => setEditing(!editing)}>
            {editing ? 'Cancel' : '✏️ Edit'}
          </button>
          <Link href="/dashboard/equipment" className="btn btn-secondary btn-sm">← Equipment</Link>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '20px' }}>
        {/* Left */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Stats bar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            {[
              { label: 'On Hand', value: item.quantityOnHand, color: '#3b82f6' },
              { label: 'Usable', value: item.usableQuantity, color: '#22c55e' },
              { label: 'Allocated', value: activeAllocations.reduce((s, a) => s + a.quantity, 0), color: '#f59e0b' },
            ].map((s) => (
              <div key={s.label} className="stat-card" style={{ padding: '16px' }}>
                <div className="stat-icon" style={{ background: `${s.color}20`, width: '36px', height: '36px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: s.color }} />
                </div>
                <div>
                  <div className="stat-value" style={{ fontSize: '24px' }}>{s.value}</div>
                  <div className="stat-label">{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Edit form */}
          {editing && (
            <form className="card" onSubmit={(e) => void handleSave(e)} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600 }}>Edit Equipment</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Usable Quantity</label>
                  <input type="number" min="0" max={item.quantityOnHand} className="form-input"
                    value={editForm.usableQuantity}
                    onChange={(e) => setEditForm((f) => ({ ...f, usableQuantity: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Condition</label>
                  <select className="form-select" value={editForm.condition}
                    onChange={(e) => setEditForm((f) => ({ ...f, condition: e.target.value }))}>
                    {['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'UNUSABLE'].map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Storage Location</label>
                <input className="form-input" value={editForm.storageLocation}
                  onChange={(e) => setEditForm((f) => ({ ...f, storageLocation: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" value={editForm.isActive}
                  onChange={(e) => setEditForm((f) => ({ ...f, isActive: e.target.value }))}>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
              {saveError && <div style={{ color: '#f87171', fontSize: '13px' }}>{saveError}</div>}
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}

          {/* Active Allocations */}
          <div className="card">
            <h2 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px' }}>
              Active Allocations ({activeAllocations.length})
            </h2>
            {!activeAllocations.length ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No active allocations.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {activeAllocations.map((a) => (
                  <div key={a.id} style={{ padding: '10px 12px', background: 'var(--bg-surface)', borderRadius: '6px', border: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: '13px' }}>
                        <Link href={`/dashboard/events/${a.eventId}`} style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                          View Event
                        </Link>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Qty: {a.quantity}</div>
                    </div>
                    <span className={`badge ${a.status === 'ACTIVE' ? 'badge-active' : 'badge-pending'}`}>{a.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right */}
        <div className="card" style={{ alignSelf: 'start', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 600 }}>Details</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <EqDetail label="Code" value={item.code} />
            <EqDetail label="Category" value={item.category.name} />
            <EqDetail label="Storage" value={item.storageLocation} />
            <EqDetail label="Condition">
              <span style={{ color: CONDITION_COLOR[item.condition] ?? '#fff', fontWeight: 600, fontSize: '13px' }}>
                ● {item.condition}
              </span>
            </EqDetail>
            {item.description && <EqDetail label="Description" value={item.description} />}
            {item.notes && <EqDetail label="Notes" value={item.notes} />}
          </div>
        </div>
      </div>
    </>
  );
}

function EqDetail({ label, value, children }: { label: string; value?: string | null; children?: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>{label}</div>
      {children ?? <div style={{ fontSize: '13.5px' }}>{value ?? '—'}</div>}
    </div>
  );
}
