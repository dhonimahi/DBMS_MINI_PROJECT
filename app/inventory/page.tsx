"use client";

import { useEffect, useState } from 'react';
import { Layout, Header } from '../components';
import { expiryStatus, money } from '@/lib/format';

type Item = {
  id: string;
  product_name: string;
  category: string;
  quantity: string;
  unit: string;
  purchase_date: string;
  expiry_date: string;
  cost_per_unit: string;
  supplier: string;
};

function isItemList(value: unknown): value is Item[] {
  return Array.isArray(value) && value.every(item =>
    typeof item === 'object' && item !== null &&
    typeof item.id === 'string' &&
    typeof item.product_name === 'string' &&
    typeof item.category === 'string' &&
    typeof item.quantity === 'string' &&
    typeof item.unit === 'string' &&
    typeof item.purchase_date === 'string' &&
    typeof item.expiry_date === 'string' &&
    typeof item.cost_per_unit === 'string' &&
    typeof item.supplier === 'string'
  );
}

type InventoryForm = {
  name: string;
  category: string;
  quantity: string;
  unit: string;
  purchase_date: string;
  expiry_date: string;
  cost_per_unit: string;
  supplier: string;
};

function newForm(): InventoryForm {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  return {
    name: '',
    category: 'Dairy',
    quantity: '10',
    unit: 'units',
    purchase_date: localDate,
    expiry_date: '',
    cost_per_unit: '0',
    supplier: ''
  };
}

export default function Inventory() {
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingInventory, setLoadingInventory] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<InventoryForm>(newForm);

  async function load() {
    setLoadingInventory(true);
    try {
      const response = await fetch('/api/inventory');
      const result: unknown = await response.json();
      if (!response.ok) {
        const message = typeof result === 'object' && result !== null && 'error' in result
          ? String(result.error)
          : 'Could not load inventory.';
        throw new Error(message);
      }
      if (!isItemList(result)) throw new Error('Inventory response had an unexpected format.');
      setItems(result);
    } finally {
      setLoadingInventory(false);
    }
  }

  useEffect(() => {
    load().catch(e => setError(e instanceof Error ? e.message : 'Could not load inventory.'));
  }, []);

  function change(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm(current => ({ ...current, [e.target.name]: e.target.value }));
  }

  function edit(item: Item) {
    setError('');
    setMessage('');
    setEditingId(item.id);
    setForm({
      name: item.product_name,
      category: item.category,
      quantity: item.quantity,
      unit: item.unit,
      purchase_date: item.purchase_date,
      expiry_date: item.expiry_date,
      cost_per_unit: item.cost_per_unit,
      supplier: item.supplier
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(newForm());
    setError('');
    setMessage('');
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const isEditing = editingId !== null;
      const response = await fetch(isEditing ? `/api/inventory/${editingId}` : '/api/inventory', {
        method: isEditing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        const errorMessage = typeof result === 'object' && result !== null && 'error' in result
          ? String(result.error)
          : 'Could not save inventory.';
        throw new Error(errorMessage);
      }
      setMessage(isEditing ? 'Inventory batch updated.' : 'Inventory batch saved.');
      setEditingId(null);
      setForm(newForm());
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save inventory.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout active="inventory">
      <Header eyebrow="INVENTORY MANAGEMENT" title="Food inventory" subtitle="Register batches and monitor expiry dates." />
      <div className="panel" style={{ marginBottom: 20 }}>
        <h2>{editingId === null ? 'Add inventory batch' : 'Edit inventory batch'}</h2>
        <form onSubmit={submit} className="form-grid">
          <div className="field">
            <label>Product name *</label>
            <input name="name" value={form.name} onChange={change} required disabled={editingId !== null} placeholder="e.g. Fresh milk" />
          </div>
          <div className="field">
            <label>Category</label>
            <select name="category" value={form.category} onChange={change} disabled={editingId !== null}>
              {['Dairy', 'Bakery', 'Vegetables', 'Fruits', 'Meat & seafood', 'Dry goods', 'Beverages', 'Other'].map(value => <option key={value}>{value}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Quantity *</label>
            <input name="quantity" type="number" min={editingId === null ? '0.01' : '0'} step="0.01" value={form.quantity} onChange={change} required />
          </div>
          <div className="field">
            <label>Unit</label>
            <select name="unit" value={form.unit} onChange={change}>
              {['units', 'kg', 'g', 'litres', 'ml', 'packets', 'boxes'].map(value => <option key={value}>{value}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Purchase date</label>
            <input type="date" name="purchase_date" value={form.purchase_date} onChange={change} required />
          </div>
          <div className="field">
            <label>Expiry date *</label>
            <input type="date" name="expiry_date" value={form.expiry_date} onChange={change} required />
          </div>
          <div className="field">
            <label>Cost per unit (₹)</label>
            <input name="cost_per_unit" type="number" min="0" step="0.01" value={form.cost_per_unit} onChange={change} />
          </div>
          <div className="field">
            <label>Supplier</label>
            <input name="supplier" value={form.supplier} onChange={change} placeholder="Supplier name" />
          </div>
          <div className="field full">
            <button className="btn" disabled={loading}>{loading ? 'Saving…' : editingId === null ? 'Save inventory batch' : 'Update batch'}</button>
            {editingId !== null && <button type="button" className="btn secondary" onClick={cancelEdit} style={{ marginLeft: 8 }}>Cancel</button>}
          </div>
        </form>
        {message && <div className="notice">{message}</div>}
        {error && <div className="notice error">{error}</div>}
      </div>
      <section className="panel">
        <h2>Inventory batches ({items.length})</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Product</th><th>Category</th><th>Quantity</th><th>Purchase</th><th>Expiry</th><th>Cost/unit</th><th>Risk</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {loadingInventory
                ? <tr><td colSpan={8} className="empty">Loading inventory…</td></tr>
                : items.map(item => {
                const status = expiryStatus(item.expiry_date);
                return (
                  <tr key={item.id}>
                    <td><strong>{item.product_name}</strong><div className="small">{item.supplier || 'No supplier'}</div></td>
                    <td>{item.category}</td>
                    <td>{item.quantity} {item.unit}</td>
                    <td>{item.purchase_date}</td>
                    <td>{item.expiry_date}</td>
                    <td>{money(item.cost_per_unit)}</td>
                    <td><span className={`status ${status.className}`}>{status.label}</span></td>
                    <td><button type="button" className="btn secondary" onClick={() => edit(item)}>Edit</button></td>
                  </tr>
                );
              })}
              {!loadingInventory && !items.length && <tr><td colSpan={8} className="empty">No inventory yet. Add your first batch above.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </Layout>
  );
}
