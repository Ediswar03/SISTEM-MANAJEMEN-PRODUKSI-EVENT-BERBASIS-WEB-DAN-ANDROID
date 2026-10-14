'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '../../../lib/api-client.js';
import type { CategoryInfo } from '../../../lib/api-client.js';

const CONDITIONS = ['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'UNUSABLE'];

interface FormState {
  categoryId: string;
  code: string;
  name: string;
  description: string;
  quantityOnHand: string;
  usableQuantity: string;
  condition: string;
  storageLocation: string;
  notes: string;
}

const INITIAL: FormState = {
  categoryId: '', code: '', name: '', description: '',
  quantityOnHand: '1', usableQuantity: '1',
  condition: 'GOOD', storageLocation: '', notes: '',
};

export default function NewEquipmentPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(INITIAL);
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  useEffect(() => {
    api.getCategories()
      .then((r: { data: CategoryInfo[] }) => { setCategories(r.data); if (r.data[0]) setForm((f) => ({ ...f, categoryId: r.data[0]!.id })); })
      .catch(() => {});
  }, []);

  function set(key: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => { const n = { ...e }; delete n[key]; return n; });
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.categoryId) e['categoryId'] = 'Category is required.';
    if (!form.code.trim()) e['code'] = 'Code is required.';
    else if (!/^[A-Z0-9-]+$/.test(form.code)) e['code'] = 'Only uppercase letters, numbers, hyphens.';
    if (!form.name.trim()) e['name'] = 'Name is required.';
    if (!form.storageLocation.trim()) e['storageLocation'] = 'Storage location is required.';
    const onHand = Number(form.quantityOnHand);
    const usable = Number(form.usableQuantity);
    if (isNaN(onHand) || onHand < 0) e['quantityOnHand'] = 'Must be 0 or more.';
    if (isNaN(usable) || usable < 0) e['usableQuantity'] = 'Must be 0 or more.';
    if (!isNaN(onHand) && !isNaN(usable) && usable > onHand) e['usableQuantity'] = 'Cannot exceed quantity on hand.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setServerError('');
    try {
      const res = await api.createEquipment({
        categoryId: form.categoryId,
        code: form.code,
        name: form.name,
        description: form.description || undefined,
        quantityOnHand: Number(form.quantityOnHand),
        usableQuantity: Number(form.usableQuantity),
        condition: form.condition,
        storageLocation: form.storageLocation,
        notes: form.notes || undefined,
      });
      router.push(`/dashboard/equipment/${res.data.id}`);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to create equipment.';
      setServerError(msg);
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Add Equipment</h1>
          <p className="page-subtitle">Register a new equipment item</p>
        </div>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} style={{ maxWidth: '720px' }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label required">Category</label>
              <select className="form-select" value={form.categoryId}
                onChange={(e) => set('categoryId', e.target.value)} id="eq-category">
                <option value="">— Select —</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {errors['categoryId'] && <span className="form-error">{errors['categoryId']}</span>}
            </div>
            <div className="form-group">
              <label className="form-label required">Equipment Code</label>
              <input className="form-input" placeholder="AUDIO-001" id="eq-code"
                value={form.code} onChange={(e) => set('code', e.target.value.toUpperCase())} />
              {errors['code'] && <span className="form-error">{errors['code']}</span>}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label required">Equipment Name</label>
            <input className="form-input" placeholder="Shure SM58 Microphone" id="eq-name"
              value={form.name} onChange={(e) => set('name', e.target.value)} />
            {errors['name'] && <span className="form-error">{errors['name']}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-textarea" rows={2} placeholder="Optional description"
              value={form.description} onChange={(e) => set('description', e.target.value)} />
          </div>

          <div className="form-grid-3">
            <div className="form-group">
              <label className="form-label required">Quantity on Hand</label>
              <input type="number" min="0" className="form-input" id="eq-qty-onhand"
                value={form.quantityOnHand} onChange={(e) => set('quantityOnHand', e.target.value)} />
              {errors['quantityOnHand'] && <span className="form-error">{errors['quantityOnHand']}</span>}
            </div>
            <div className="form-group">
              <label className="form-label required">Usable Quantity</label>
              <input type="number" min="0" className="form-input" id="eq-qty-usable"
                value={form.usableQuantity} onChange={(e) => set('usableQuantity', e.target.value)} />
              {errors['usableQuantity'] && <span className="form-error">{errors['usableQuantity']}</span>}
            </div>
            <div className="form-group">
              <label className="form-label required">Condition</label>
              <select className="form-select" value={form.condition}
                onChange={(e) => set('condition', e.target.value)} id="eq-condition">
                {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label required">Storage Location</label>
            <input className="form-input" placeholder="Gudang A - Rak 3" id="eq-storage"
              value={form.storageLocation} onChange={(e) => set('storageLocation', e.target.value)} />
            {errors['storageLocation'] && <span className="form-error">{errors['storageLocation']}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea className="form-textarea" rows={2} placeholder="Additional notes"
              value={form.notes} onChange={(e) => set('notes', e.target.value)} />
          </div>

          {serverError && (
            <div style={{ padding: '10px 14px', background: '#ef444415', border: '1px solid #ef444430', borderRadius: '6px', color: '#f87171', fontSize: '13px' }}>
              {serverError}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={() => router.back()}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting} id="btn-submit-equipment">
              {submitting ? <><div className="spinner" style={{ width: '14px', height: '14px' }} /> Saving…</> : 'Add Equipment'}
            </button>
          </div>
        </div>
      </form>
    </>
  );
}
