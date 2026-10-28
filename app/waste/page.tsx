"use client";

import { useEffect, useState } from 'react';
import { Layout, Header } from '../components';
import { money } from '@/lib/format';

type Product = { product_id: string; product_name: string };
type InventoryItem = { product_id: string | number; product_name: string; quantity: string | number };
type Waste = {
  id: string | number;
  product_name: string;
  quantity: string | number;
  reason: string;
  estimated_loss: string | number;
  wasted_at: string;
  notes: string;
  unit: string | null;
};

function hasError(value: unknown): value is { error: string } {
  return typeof value === 'object' && value !== null && 'error' in value && typeof value.error === 'string';
}

function isInventoryList(value: unknown): value is InventoryItem[] {
  return Array.isArray(value) && value.every(item =>
    typeof item === 'object' && item !== null &&
    (typeof item.product_id === 'string' || typeof item.product_id === 'number') &&
    typeof item.product_name === 'string' &&
    (typeof item.quantity === 'string' || typeof item.quantity === 'number')
  );
}

function isWasteList(value: unknown): value is Waste[] {
  return Array.isArray(value) && value.every(item =>
    typeof item === 'object' && item !== null &&
    (typeof item.id === 'string' || typeof item.id === 'number') &&
    typeof item.product_name === 'string' &&
    (typeof item.quantity === 'string' || typeof item.quantity === 'number') &&
    typeof item.reason === 'string' &&
    (typeof item.estimated_loss === 'string' || typeof item.estimated_loss === 'number') &&
    typeof item.wasted_at === 'string' &&
    typeof item.notes === 'string' &&
    (typeof item.unit === 'string' || item.unit === null)
  );
}

export default function Waste() {
  const [products, setProducts] = useState<Product[]>([]);
  const [items, setItems] = useState<Waste[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    product_id: '',
    quantity: '1',
    reason: 'Expired',
    estimated_loss: '0',
    notes: ''
  });

  async function load() {
    setLoading(true);
    try {
      const [inventoryResponse, wasteResponse] = await Promise.all([
        fetch('/api/inventory'),
        fetch('/api/waste')
      ]);
      const inventory: unknown = await inventoryResponse.json();
      const waste: unknown = await wasteResponse.json();
      if (!inventoryResponse.ok) throw new Error(hasError(inventory) ? inventory.error : 'Could not load inventory.');
      if (!wasteResponse.ok) throw new Error(hasError(waste) ? waste.error : 'Could not load waste records.');
      if (!isInventoryList(inventory) || !isWasteList(waste)) {
        throw new Error('The server returned data in an unexpected format.');
      }

      const availableProducts = [...new Map(
        inventory
          .filter(item => Number(item.quantity) > 0)
          .map(item => [String(item.product_id), { product_id: String(item.product_id), product_name: item.product_name }])
      ).values()];

      setProducts(availableProducts);
      setItems(waste);
      setForm(current => ({
        ...current,
        product_id: availableProducts.some(product => product.product_id === current.product_id)
          ? current.product_id
          : String(availableProducts[0]?.product_id ?? '')
      }));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load().catch(e => setError(e instanceof Error ? e.message : 'Could not load waste records.'));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/waste', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const result: unknown = await response.json();
      if (!response.ok) throw new Error(hasError(result) ? result.error : 'Could not record waste.');
      setMessage('Waste recorded and inventory quantity reduced.');
      setForm(current => ({ ...current, quantity: '1', estimated_loss: '0', notes: '' }));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not record waste.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Layout active="waste">
      <Header eyebrow="WASTE MANAGEMENT" title="Waste records" subtitle="Record food waste to build useful waste analytics." />
      <div className="panel" style={{ marginBottom: 20 }}>
        <h2>Record wasted food</h2>
        {loading && <div className="notice">Loading inventory…</div>}
        {!loading && !products.length && <div className="notice">No available stock. Add or restock inventory before recording waste.</div>}
        <form onSubmit={submit} className="form-grid">
          <div className="field">
            <label>Product *</label>
            <select required value={form.product_id} onChange={e => setForm({ ...form, product_id: e.target.value })}>
              <option value="">Select product</option>
              {products.map(product => <option value={product.product_id} key={product.product_id}>{product.product_name}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Quantity wasted *</label>
            <input type="number" min="0.01" step="0.01" required value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} />
          </div>
          <div className="field">
            <label>Reason *</label>
            <select value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })}>
              {['Expired', 'Spoilage', 'Over-preparation', 'Damaged packaging', 'Unsold food', 'Other'].map(reason => <option key={reason}>{reason}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Estimated loss (₹)</label>
            <input type="number" min="0" step="0.01" value={form.estimated_loss} onChange={e => setForm({ ...form, estimated_loss: e.target.value })} />
          </div>
          <div className="field full">
            <label>Notes</label>
            <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Optional context" />
          </div>
          <div className="field full">
            <button className="btn" disabled={!products.length || saving || loading}>{saving ? 'Saving…' : 'Record waste'}</button>
          </div>
        </form>
        {message && <div className="notice">{message}</div>}
        {error && <div className="notice error">{error}</div>}
      </div>
      <section className="panel">
        <h2>Recent waste records</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Date</th><th>Product</th><th>Quantity</th><th>Reason</th><th>Estimated loss</th><th>Notes</th></tr></thead>
            <tbody>
              {loading
                ? <tr><td colSpan={6} className="empty">Loading waste records…</td></tr>
                : items.map(item => (
                <tr key={item.id}>
                  <td>{item.wasted_at}</td><td>{item.product_name}</td><td>{item.quantity}{item.unit ? ` ${item.unit}` : ''}</td>
                  <td>{item.reason}</td><td>{money(item.estimated_loss)}</td><td>{item.notes || '—'}</td>
                </tr>
              ))}
              {!loading && !items.length && <tr><td colSpan={6} className="empty">No waste records yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </Layout>
  );
}
