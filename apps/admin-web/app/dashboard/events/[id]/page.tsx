'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, ApiError } from '../../../lib/api-client.js';
import type { EventDetail, EquipmentInfo, UserInfo } from '../../../lib/api-client.js';
import { StatusBadge, formatDateRange, formatDate } from '../../page.js';

const TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
};

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Allocation modal state
  const [allocModal, setAllocModal] = useState(false);
  const [equipment, setEquipment] = useState<EquipmentInfo[]>([]);
  const [allocForm, setAllocForm] = useState({ equipmentId: '', quantity: '1', startAt: '', endAt: '', notes: '' });
  const [allocError, setAllocError] = useState('');
  const [allocSaving, setAllocSaving] = useState(false);

  // Assignment modal state
  const [assignModal, setAssignModal] = useState(false);
  const [crew, setCrew] = useState<UserInfo[]>([]);
  const [assignForm, setAssignForm] = useState({ crewProfileId: '', roleInEvent: '', startAt: '', endAt: '', notes: '' });
  const [assignError, setAssignError] = useState('');
  const [assignSaving, setAssignSaving] = useState(false);

  // Status transition
  const [transitioning, setTransitioning] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.getEvent(id);
      setEvent(res.data);
      // Pre-fill alloc/assign times from event schedule
      setAllocForm((f) => ({
        ...f,
        startAt: res.data.startAt.slice(0, 16),
        endAt: res.data.endAt.slice(0, 16),
      }));
      setAssignForm((f) => ({
        ...f,
        startAt: res.data.startAt.slice(0, 16),
        endAt: res.data.endAt.slice(0, 16),
      }));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load event.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  async function handleTransition(toStatus: string) {
    if (!event) return;
    if (!confirm(`Transition event from ${event.status} to ${toStatus}?`)) return;
    setTransitioning(true);
    try {
      await api.transitionEventStatus(event.id, toStatus);
      await load();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'Transition failed.');
    } finally {
      setTransitioning(false);
    }
  }

  async function openAllocModal() {
    if (!equipment.length) {
      const res = await api.getEquipment({ limit: '100' });
      setEquipment(res.data);
    }
    setAllocModal(true);
    setAllocError('');
  }

  async function submitAllocation(e: React.FormEvent) {
    e.preventDefault();
    if (!event || !allocForm.equipmentId) { setAllocError('Select equipment.'); return; }
    setAllocSaving(true);
    setAllocError('');
    try {
      await api.createAllocation(event.id, {
        equipmentId: allocForm.equipmentId,
        quantity: Number(allocForm.quantity),
        startAt: new Date(allocForm.startAt).toISOString(),
        endAt: new Date(allocForm.endAt).toISOString(),
        notes: allocForm.notes || undefined,
      });
      setAllocModal(false);
      await load();
    } catch (err) {
      setAllocError(err instanceof ApiError ? err.message : 'Failed to add allocation.');
    } finally {
      setAllocSaving(false);
    }
  }

  async function cancelAllocation(allocationId: string) {
    if (!event) return;
    if (!confirm('Cancel this equipment allocation?')) return;
    try {
      await api.cancelAllocation(event.id, allocationId);
      await load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Failed to cancel.');
    }
  }

  async function openAssignModal() {
    if (!crew.length) {
      const res = await api.getUsers({ role: 'CREW', limit: '100' });
      setCrew(res.data.filter((u) => u.isActive && u.crewProfile?.isActive));
    }
    setAssignModal(true);
    setAssignError('');
  }

  async function submitAssignment(e: React.FormEvent) {
    e.preventDefault();
    if (!event || !assignForm.crewProfileId) { setAssignError('Select crew member.'); return; }
    if (!assignForm.roleInEvent) { setAssignError('Role is required.'); return; }
    setAssignSaving(true);
    setAssignError('');
    try {
      const crewMember = crew.find((c) => c.crewProfile?.id === assignForm.crewProfileId);
      await api.createAssignment(event.id, {
        crewProfileId: assignForm.crewProfileId,
        roleInEvent: assignForm.roleInEvent,
        startAt: new Date(assignForm.startAt).toISOString(),
        endAt: new Date(assignForm.endAt).toISOString(),
        notes: assignForm.notes || undefined,
      });
      setAssignModal(false);
      await load();
    } catch (err) {
      setAssignError(err instanceof ApiError ? err.message : 'Failed to assign crew.');
    } finally {
      setAssignSaving(false);
    }
  }

  async function cancelAssignment(assignmentId: string) {
    if (!event) return;
    if (!confirm('Remove this crew assignment?')) return;
    try {
      await api.cancelAssignment(event.id, assignmentId);
      await load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Failed to cancel.');
    }
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><div className="spinner" style={{ width: '32px', height: '32px' }} /></div>;
  if (error) return <div style={{ color: '#f87171', padding: '24px' }}>{error}</div>;
  if (!event) return null;

  const canTransitionTo = TRANSITIONS[event.status] ?? [];

  return (
    <>
      {/* Header */}
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span className="tag">{event.code}</span>
            <StatusBadge status={event.status} />
          </div>
          <h1 className="page-title">{event.name}</h1>
          <p className="page-subtitle">{formatDateRange(event.startAt, event.endAt)} · {event.location}</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {canTransitionTo.map((s) => (
            <button
              key={s}
              className={`btn btn-sm ${s === 'CANCELLED' ? 'btn-danger' : 'btn-primary'}`}
              disabled={transitioning}
              onClick={() => void handleTransition(s)}
            >
              → {s.replace('_', ' ')}
            </button>
          ))}
          <Link href="/dashboard/events" className="btn btn-secondary btn-sm">← Events</Link>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px' }}>
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Event details */}
          <div className="card">
            <h2 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px' }}>Event Details</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Detail label="Client" value={event.clientName ?? '—'} />
              <Detail label="Timezone" value={event.timezone} />
              <Detail label="Created by" value={event.createdBy.fullName} />
              <Detail label="Responsible" value={event.responsibleUser?.fullName ?? '—'} />
            </div>
            {event.notes && (
              <div style={{ marginTop: '16px', padding: '12px', background: 'var(--bg-surface)', borderRadius: '6px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                {event.notes}
              </div>
            )}
          </div>

          {/* Equipment Allocations */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '14px', fontWeight: 600 }}>Equipment Allocations ({event.allocations.length})</h2>
              {!['COMPLETED', 'CANCELLED'].includes(event.status) && (
                <button className="btn btn-secondary btn-sm" onClick={() => void openAllocModal()} id="btn-add-allocation">
                  + Add Equipment
                </button>
              )}
            </div>
            {!event.allocations.length ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No equipment allocated yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {event.allocations.map((a) => (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--bg-surface)', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: '13.5px' }}>{a.equipment?.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        Qty: <strong>{a.quantity}</strong> · {a.equipment?.code}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <StatusBadge status={a.status} />
                      {a.status !== 'CANCELLED' && !['COMPLETED', 'CANCELLED'].includes(event.status) && (
                        <button className="btn btn-danger btn-sm" onClick={() => void cancelAllocation(a.id)}>Cancel</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Crew Assignments */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '14px', fontWeight: 600 }}>Crew Assignments ({event.assignments.length})</h2>
              {!['COMPLETED', 'CANCELLED'].includes(event.status) && (
                <button className="btn btn-secondary btn-sm" onClick={() => void openAssignModal()} id="btn-add-assignment">
                  + Assign Crew
                </button>
              )}
            </div>
            {!event.assignments.length ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No crew assigned yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {event.assignments.map((a) => (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--bg-surface)', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div className="avatar" style={{ width: '28px', height: '28px', fontSize: '11px' }}>
                        {a.crewProfile?.user.fullName.charAt(0)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 500, fontSize: '13.5px' }}>{a.crewProfile?.user.fullName}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{a.roleInEvent}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="tag">{a.jobStatus}</span>
                      {a.status !== 'CANCELLED' && !['COMPLETED', 'CANCELLED'].includes(event.status) && (
                        <button className="btn btn-danger btn-sm" onClick={() => void cancelAssignment(a.id)}>Remove</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column — Status history */}
        <div className="card" style={{ alignSelf: 'start' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px' }}>Status History</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {event.statusHistory.map((h, i) => (
              <div key={h.id} style={{ display: 'flex', gap: '10px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: i === event.statusHistory.length - 1 ? 'var(--accent)' : 'var(--border)', flexShrink: 0, marginTop: '4px' }} />
                  {i < event.statusHistory.length - 1 && (
                    <div style={{ width: '1px', flex: 1, background: 'var(--border)', margin: '4px 0' }} />
                  )}
                </div>
                <div style={{ paddingBottom: '16px', minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 500 }}>
                    {h.fromStatus ? `${h.fromStatus} → ` : ''}<strong>{h.toStatus}</strong>
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                    {h.changedBy.fullName} · {formatDate(h.createdAt)}
                  </div>
                  {h.reason && (
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>{h.reason}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Allocation Modal */}
      {allocModal && (
        <div className="dialog-overlay" onClick={() => setAllocModal(false)}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <span className="dialog-title">Add Equipment Allocation</span>
              <button className="close-btn" onClick={() => setAllocModal(false)}>✕</button>
            </div>
            <form onSubmit={(e) => void submitAllocation(e)}>
              <div className="dialog-body">
                <div className="form-group">
                  <label className="form-label required">Equipment</label>
                  <select className="form-select" value={allocForm.equipmentId}
                    onChange={(e) => setAllocForm((f) => ({ ...f, equipmentId: e.target.value }))}>
                    <option value="">— Select —</option>
                    {equipment.filter((eq) => eq.isActive).map((eq) => (
                      <option key={eq.id} value={eq.id}>
                        {eq.name} ({eq.code}) — {eq.usableQuantity} usable
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label required">Quantity</label>
                  <input type="number" min="1" className="form-input" value={allocForm.quantity}
                    onChange={(e) => setAllocForm((f) => ({ ...f, quantity: e.target.value }))} />
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label required">Start</label>
                    <input type="datetime-local" className="form-input" value={allocForm.startAt}
                      onChange={(e) => setAllocForm((f) => ({ ...f, startAt: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label required">End</label>
                    <input type="datetime-local" className="form-input" value={allocForm.endAt}
                      onChange={(e) => setAllocForm((f) => ({ ...f, endAt: e.target.value }))} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <input className="form-input" placeholder="Optional" value={allocForm.notes}
                    onChange={(e) => setAllocForm((f) => ({ ...f, notes: e.target.value }))} />
                </div>
                {allocError && <div style={{ color: '#f87171', fontSize: '13px' }}>{allocError}</div>}
              </div>
              <div className="dialog-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setAllocModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={allocSaving} id="btn-confirm-allocation">
                  {allocSaving ? 'Saving…' : 'Add Allocation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assignment Modal */}
      {assignModal && (
        <div className="dialog-overlay" onClick={() => setAssignModal(false)}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <span className="dialog-title">Assign Crew Member</span>
              <button className="close-btn" onClick={() => setAssignModal(false)}>✕</button>
            </div>
            <form onSubmit={(e) => void submitAssignment(e)}>
              <div className="dialog-body">
                <div className="form-group">
                  <label className="form-label required">Crew Member</label>
                  <select className="form-select" value={assignForm.crewProfileId}
                    onChange={(e) => setAssignForm((f) => ({ ...f, crewProfileId: e.target.value }))}>
                    <option value="">— Select —</option>
                    {crew.map((u) => (
                      <option key={u.crewProfile?.id} value={u.crewProfile?.id ?? ''}>
                        {u.fullName} ({u.email})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label required">Role in Event</label>
                  <input className="form-input" placeholder="e.g. Stage Manager, Lighting Tech"
                    value={assignForm.roleInEvent}
                    onChange={(e) => setAssignForm((f) => ({ ...f, roleInEvent: e.target.value }))} />
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label required">Start</label>
                    <input type="datetime-local" className="form-input" value={assignForm.startAt}
                      onChange={(e) => setAssignForm((f) => ({ ...f, startAt: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label required">End</label>
                    <input type="datetime-local" className="form-input" value={assignForm.endAt}
                      onChange={(e) => setAssignForm((f) => ({ ...f, endAt: e.target.value }))} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <input className="form-input" placeholder="Optional" value={assignForm.notes}
                    onChange={(e) => setAssignForm((f) => ({ ...f, notes: e.target.value }))} />
                </div>
                {assignError && <div style={{ color: '#f87171', fontSize: '13px' }}>{assignError}</div>}
              </div>
              <div className="dialog-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setAssignModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={assignSaving} id="btn-confirm-assignment">
                  {assignSaving ? 'Saving…' : 'Assign Crew'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontSize: '13.5px', color: 'var(--text-primary)' }}>{value}</div>
    </div>
  );
}
