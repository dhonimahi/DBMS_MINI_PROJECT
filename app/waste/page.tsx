// Run this page in the browser so it can manage form state and events.
"use client";

// Import React's local state and effect hooks.
import { useEffect, useState } from 'react';
// Import the shared shell and page header.
import { Layout, Header } from '../components';
// Import the helper that formats rupees.
import { money } from '@/lib/format';

// Describe the product ID and label used by the waste form.
type Product = { product_id: string; product_name: string };
// Describe the fields read from an inventory row when checking which products are in stock.
type InventoryItem = { product_id: string | number; product_name: string; quantity: string | number };
// Describe the shape of a waste history row.
type Waste = {
  // Accept a record ID returned as text or a number.
  id: string | number;
  // Hold the product name.
  product_name: string;
  // Accept the discarded quantity as text or a number.
  quantity: string | number;
  // Hold the recorded disposal reason.
  reason: string;
  // Accept the estimated loss as text or a number.
  estimated_loss: string | number;
  // Hold the disposal timestamp returned by the API.
  wasted_at: string;
  // Hold the record's notes.
  notes: string;
  // Allow a text unit or null when a unit is unavailable.
  unit: string | null;
// Finish the waste history type.
};

// Recognize an error response containing a message.
function hasError(value: unknown): value is { error: string } {
  // Require a non-null object and a string error field.
  return typeof value === 'object' && value !== null && 'error' in value && typeof value.error === 'string';
// End the error shape checker.
}

// Validate the inventory list used to populate the product dropdown.
function isInventoryList(value: unknown): value is InventoryItem[] {
  // Require an array and test every item.
  return Array.isArray(value) && value.every(item =>
    // Require a non-null object for each item.
    typeof item === 'object' && item !== null &&
    // Accept a product ID stored as text or a number.
    (typeof item.product_id === 'string' || typeof item.product_id === 'number') &&
    // Require the product name to be text.
    typeof item.product_name === 'string' &&
    // Accept a quantity stored as text or a number.
    (typeof item.quantity === 'string' || typeof item.quantity === 'number')
  // Finish checking all inventory items.
  );
// End the inventory list validator.
}

// Validate the API response before displaying waste records.
function isWasteList(value: unknown): value is Waste[] {
  // Require an array and check every row.
  return Array.isArray(value) && value.every(item =>
    // Reject null or primitive entries.
    typeof item === 'object' && item !== null &&
    // Accept a waste ID that is text or a number.
    (typeof item.id === 'string' || typeof item.id === 'number') &&
    // Require a product name string.
    typeof item.product_name === 'string' &&
    // Accept a quantity that is text or a number.
    (typeof item.quantity === 'string' || typeof item.quantity === 'number') &&
    // Require a reason string.
    typeof item.reason === 'string' &&
    // Accept estimated loss that is text or a number.
    (typeof item.estimated_loss === 'string' || typeof item.estimated_loss === 'number') &&
    // Require a timestamp string.
    typeof item.wasted_at === 'string' &&
    // Require a notes string.
    typeof item.notes === 'string' &&
    // Accept an explicit null or a string unit.
    (typeof item.unit === 'string' || item.unit === null)
  // Finish checking all waste rows.
  );
// End the waste list validator.
}

// Render the waste form and recorded waste list.
export default function Waste() {
  // Keep the in-stock products in state.
  const [products, setProducts] = useState<Product[]>([]);
  // Keep validated waste rows in state.
  const [items, setItems] = useState<Waste[]>([]);
  // Store the current error message.
  const [error, setError] = useState('');
  // Store the current success message.
  const [message, setMessage] = useState('');
  // Track whether a waste request is being saved.
  const [saving, setSaving] = useState(false);
  // Track whether the form options and history are loading.
  const [loading, setLoading] = useState(true);
  // Initialize the form fields in state.
  const [form, setForm] = useState({
    // Start without a selected product.
    product_id: '',
    // Start with a quantity of one.
    quantity: '1',
    // Select Expired as the default reason.
    reason: 'Expired',
    // Start with a zero monetary estimate.
    estimated_loss: '0',
    // Start with empty notes.
    notes: ''
  // Finish initializing the form.
  });

  // Refresh the available products and waste history.
  async function load() {
    // Show the loading state.
    setLoading(true);
    // Ensure the loading indicator is cleared if any request fails.
    try {
      // Request both API resources in parallel.
      const [inventoryResponse, wasteResponse] = await Promise.all([
        // Get the inventory batches used to identify products with stock.
        fetch('/api/inventory'),
        // Get the waste history rows.
        fetch('/api/waste')
      // Wait until both requests return.
      ]);
      // Parse the inventory response without assuming its shape.
      const inventory: unknown = await inventoryResponse.json();
      // Parse the waste response without assuming its shape.
      const waste: unknown = await wasteResponse.json();
      // Report the inventory API error or use a fallback message.
      if (!inventoryResponse.ok) throw new Error(hasError(inventory) ? inventory.error : 'Could not load inventory.');
      // Report the waste API error or use a fallback message.
      if (!wasteResponse.ok) throw new Error(hasError(waste) ? waste.error : 'Could not load waste records.');
      // Validate both response arrays before using them.
      if (!isInventoryList(inventory) || !isWasteList(waste)) {
        // Stop and report an unexpected shape if either response is invalid.
        throw new Error('The server returned data in an unexpected format.');
      // Finish the response shape check.
      }

      // Use a Map keyed by product ID to collapse multiple batches to one product option.
      const availableProducts = [...new Map(
        // Use the validated inventory rows as input.
        inventory
          // Keep only rows that currently have positive stock.
          .filter(item => Number(item.quantity) > 0)
          // Create an ID-keyed option containing the product ID and name.
          .map(item => [String(item.product_id), { product_id: String(item.product_id), product_name: item.product_name }])
      // Extract the distinct product options as an array.
      ).values()];

      // Store the available product options for the dropdown.
      setProducts(availableProducts);
      // Store the waste history for the table.
      setItems(waste);
      // Update product selection based on the previous form.
      setForm(current => ({
        // Carry forward the other form fields.
        ...current,
        // Check whether the selected product still appears in the available options.
        product_id: availableProducts.some(product => product.product_id === current.product_id)
          // Keep the current product if it is still available.
          ? current.product_id
          // Otherwise select the first available product or leave the selection blank.
          : String(availableProducts[0]?.product_id ?? '')
      // Finish updating the form.
      }));
    // Always run cleanup after loading.
    } finally {
      // Clear the loading indicator.
      setLoading(false);
    // Finish loading cleanup.
    }
  // End the data loader.
  }

  // Register an effect for the page's first load.
  useEffect(() => {
    // Fetch the initial data and display a readable error if loading fails.
    load().catch(e => setError(e instanceof Error ? e.message : 'Could not load waste records.'));
  // Use an empty dependency list for the initial load.
  }, []);

  // Handle a submission of the waste form.
  async function submit(e: React.FormEvent) {
    // Prevent the default browser form navigation.
    e.preventDefault();
    // Ignore a duplicate submit while a waste save is in progress.
    if (saving) return;
    // Mark the waste operation as saving.
    setSaving(true);
    // Clear the previous error.
    setError('');
    // Clear the previous success message.
    setMessage('');
    // Catch any request or reload failure.
    try {
      // Send the form to the waste endpoint.
      const response = await fetch('/api/waste', {
        // Use HTTP POST to create a record and deduct its stock.
        method: 'POST',
        // Send JSON content.
        headers: { 'Content-Type': 'application/json' },
        // Serialize the current form values.
        body: JSON.stringify(form)
      // Finish sending the waste request.
      });
      // Read the response JSON as unknown.
      const result: unknown = await response.json();
      // Report the API's message or a generic waste error on failure.
      if (!response.ok) throw new Error(hasError(result) ? result.error : 'Could not record waste.');
      // Tell the user that the server recorded the waste and reduced stock.
      setMessage('Waste recorded and inventory quantity reduced.');
      // Reset quantity, estimated loss and notes while preserving other fields.
      setForm(current => ({ ...current, quantity: '1', estimated_loss: '0', notes: '' }));
      // Reload stock and history so the page reflects the write.
      await load();
    // Handle any save or reload error.
    } catch (e) {
      // Show the error message.
      setError(e instanceof Error ? e.message : 'Could not record waste.');
    // Always run cleanup when the request finishes.
    } finally {
      // Clear the saving flag.
      setSaving(false);
    // Finish submit cleanup.
    }
  // End the submit handler.
  }

  // Return the waste form and recent history markup.
  return (
    // Line 296 — Use the shared shell and highlight Waste records in the sidebar.
    // Line 297 — Show the waste management heading and description.
    // Line 298 — Open the form panel.
    // Line 299 — Label the form for recording discarded food.
    // Line 300 — Show a notice while inventory is being loaded.
    // Explain how to proceed if loading ends with no products in stock.
    // Line 302 — Attach the submit handler and grid layout to the form.
    // Line 303 — Start the product field.
    // Line 304 — Label the required product selection.
    // Line 305 — Link product selection to React state.
    // Line 306 — Provide an empty prompt.
    // Line 307 — Create a dropdown option for each product with stock.
    // Line 308 — End the product selector.
    // Line 309 — End the product field.
    // Line 310 — Start the quantity field.
    // Line 311 — Label the required disposal quantity.
    // Line 312 — Accept decimal quantities of at least 0.01 and update the form when changed.
    // Line 313 — End the quantity field.
    // Line 314 — Start the reason field.
    // Line 315 — Label the required waste reason.
    // Line 316 — Bind the reason dropdown to form state.
    // Line 317 — Render the list of supported waste reasons.
    // Line 318 — End the reason selector.
    // Line 319 — End the reason field.
    // Line 320 — Start the estimated loss field.
    // Line 321 — Label the monetary input in rupees.
    // Line 322 — Accept a non-negative decimal loss and update form state when changed.
    // Line 323 — End the loss field.
    // Line 324 — Start the full-width notes field.
    // Line 325 — Label the optional notes.
    // Line 326 — Bind the notes input to the form and show placeholder text.
    // Line 327 — End the notes field.
    // Line 328 — Start the full-width action row.
    // Line 329 — Disable submit while loading or saving, or when no product is in stock.
    // Line 330 — End the action row.
    // Line 331 — End the waste form.
    // Line 332 — Display a success notice when one exists.
    // Line 333 — Display an error notice when one exists.
    // Line 334 — End the form panel.
    // Line 335 — Start the history panel.
    // Line 336 — Label the list of recent disposals.
    // Line 337 — Wrap the table so it can scroll on narrow screens.
    // Line 338 — Start the waste history table.
    // Line 339 — Name the date, product, quantity, reason, loss and notes columns.
    // Line 340 — Start the table body.
    // Line 341 — Choose whether to show a loading row or recorded data.
    // Line 342 — Show a single loading message across the full table.
    // Line 343 — Otherwise render a row per returned waste record.
    // Line 344 — Use the record ID as a stable React key.
    // Line 345 — Show the date, product and quantity, appending a unit when present.
    // Line 346 — Show the reason, format the loss as rupees and use a dash for empty notes.
    // Line 347 — End one waste history row.
    // Line 348 — End the list mapping.
    // Line 349 — Show an empty-state row once loading ends if there are no records.
    // Line 350 — End the table body.
    // Line 351 — End the waste history table.
    // Line 352 — End the scrollable wrapper.
    // Line 353 — End the history panel.
    // Line 354 — End the shared app shell.
    <Layout active="waste">
      <Header eyebrow="WASTE MANAGEMENT" title="Waste records" subtitle="Record food waste to build useful waste analytics." />
      <div className="panel" style={{ marginBottom: 20 }}>
        <h2>Record wasted food</h2>
        {loading && <div className="notice">Loading inventory…</div>}
        {!loading && !products.length && <div className="notice">No stock is available to record as waste.</div>}
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
  // Finish returning the waste page markup.
  );
// End the Waste page component.
}
