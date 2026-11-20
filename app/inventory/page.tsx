// Render this page as a client component because it uses React state and browser events.
"use client";

// Import the hooks for local state and initial data loading.
import { useAccount } from '../account-context';
import { useEffect, useState } from 'react';
// Import the shared app shell and page header.
import { Layout, Header } from '../components';
// Import the expiry classification and rupee formatting helpers.
import { expiryStatus, money } from '@/lib/format';

// Describe the fields on one inventory row returned by the API.
type Item = {
  // Hold the batch ID as text.
  id: string;
  // Hold the product's readable name.
  product_name: string;
  // Hold the product category.
  category: string;
  // Hold the stock amount returned as text.
  quantity: string;
  // Hold the measurement unit.
  unit: string;
  // Hold the purchase date as YYYY-MM-DD text.
  purchase_date: string;
  // Hold the expiry date as YYYY-MM-DD text.
  expiry_date: string;
  // Hold the per-unit cost returned as text.
  cost_per_unit: string;
  // Hold the supplier name.
  supplier: string;
// Finish the API row type.
};

// Validate an unknown API response before rendering it as inventory.
function isItemList(value: unknown): value is Item[] {
  // Require an array and check every entry.
  return Array.isArray(value) && value.every(item =>
    // Require each entry to be a non-null object.
    typeof item === 'object' && item !== null &&
    // Require an ID string.
    typeof item.id === 'string' &&
    // Require a product name string.
    typeof item.product_name === 'string' &&
    // Require a category string.
    typeof item.category === 'string' &&
    // Require a quantity string.
    typeof item.quantity === 'string' &&
    // Require a unit string.
    typeof item.unit === 'string' &&
    // Require a purchase date string.
    typeof item.purchase_date === 'string' &&
    // Require an expiry date string.
    typeof item.expiry_date === 'string' &&
    // Require a unit-cost string.
    typeof item.cost_per_unit === 'string' &&
    // Require a supplier string.
    typeof item.supplier === 'string'
  // Finish checking all array items.
  );
// End the inventory response validator.
}

// Describe the values kept in the add or edit form.
type InventoryForm = {
  // Store the product name input.
  name: string;
  // Store the selected category.
  category: string;
  // Store the quantity input as text.
  quantity: string;
  // Store the selected unit.
  unit: string;
  // Store the date picker value for purchase.
  purchase_date: string;
  // Store the date picker value for expiry.
  expiry_date: string;
  // Store the cost input as text.
  cost_per_unit: string;
  // Store the supplier input.
  supplier: string;
// Finish the form type.
};

// Create a new set of form defaults.
function newForm(): InventoryForm {
  // Read the current time.
  const now = new Date();
  // Adjust for the browser's timezone before extracting the local YYYY-MM-DD date.
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  // Return a fresh object for the input controls.
  return {
    // Start with a blank product name.
    name: '',
    // Select Dairy initially.
    category: 'Dairy',
    // Start with a quantity of ten.
    quantity: '10',
    // Default to a count of units.
    unit: 'units',
    // Set the purchase date to today in the user's timezone.
    purchase_date: localDate,
    // Leave the expiry date blank for the user to fill.
    expiry_date: '',
    // Start with zero cost.
    cost_per_unit: '0',
    // Leave the supplier blank.
    supplier: ''
  // Finish the default form object.
  };
// End the defaults helper.
}

// Render the stock management page.
export default function Inventory() {
  const canManage = useAccount()?.role === 'admin';
  // Keep the loaded batch rows in state.
  const [items, setItems] = useState<Item[]>([]);
  // Store the current error message.
  const [error, setError] = useState('');
  // Store the current success message.
  const [message, setMessage] = useState('');
  // Track whether a save request is running.
  const [loading, setLoading] = useState(false);
  // Track whether the inventory list is loading.
  const [loadingInventory, setLoadingInventory] = useState(true);
  // Remember the batch being edited; null means add mode.
  const [editingId, setEditingId] = useState<string | null>(null);
  // Initialize form state with the defaults helper.
  const [form, setForm] = useState<InventoryForm>(newForm);

  // Load the latest inventory list from the server.
  async function load() {
    // Mark the list as loading.
    setLoadingInventory(true);
    // Ensure the loading flag resets even if the request fails.
    try {
      // Send a GET request to the inventory endpoint.
      const response = await fetch('/api/inventory');
      // Read the JSON response as an unknown value.
      const result: unknown = await response.json();
      // Check whether the request failed.
      if (!response.ok) {
        // Test for an error field in an object response.
        const message = typeof result === 'object' && result !== null && 'error' in result
          // Use the returned error when available.
          ? String(result.error)
          // Otherwise use the generic inventory-read error.
          : 'Could not load inventory.';
        // Pass the error back to the caller.
        throw new Error(message);
      // End the unsuccessful-response branch.
      }
      // Reject a success response that does not contain valid inventory rows.
      if (!isItemList(result)) throw new Error('Inventory response had an unexpected format.');
      // Store the validated rows.
      setItems(result);
    // Always run cleanup when loading ends.
    } finally {
      // Hide the loading indicator.
      setLoadingInventory(false);
    // Finish list-loading cleanup.
    }
  // End the list loader.
  }

  // Register the effect that runs when the page first mounts.
  useEffect(() => {
    // Load the rows and show an error if the request fails.
    load().catch(e => setError(e instanceof Error ? e.message : 'Could not load inventory.'));
  // Use an empty dependency list for the initial load.
  }, []);

  // Handle edits to an input or select field.
  function change(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    // Copy the current form and replace the field whose name matches the control.
    setForm(current => ({ ...current, [e.target.name]: e.target.value }));
  // End the field change handler.
  }

  // Fill the edit form from the selected inventory row.
  function edit(item: Item) {
    // Clear the previous error.
    setError('');
    // Clear the previous success message.
    setMessage('');
    // Switch to edit mode for the selected batch ID.
    setEditingId(item.id);
    // Set the form to the stored batch data.
    setForm({
      // Fill the product name from the row.
      name: item.product_name,
      // Fill the category from the row.
      category: item.category,
      // Fill the quantity from the row.
      quantity: item.quantity,
      // Fill the measurement unit from the row.
      unit: item.unit,
      // Fill the purchase date from the row.
      purchase_date: item.purchase_date,
      // Fill the expiry date from the row.
      expiry_date: item.expiry_date,
      // Fill the unit cost from the row.
      cost_per_unit: item.cost_per_unit,
      // Fill the supplier from the row.
      supplier: item.supplier
    // Finish populating the form.
    });
  // End the edit handler.
  }

  // Exit editing when the cancel button is clicked.
  function cancelEdit() {
    // Clear the editing ID to return to add mode.
    setEditingId(null);
    // Restore the new-batch form defaults.
    setForm(newForm());
    // Clear the previous error.
    setError('');
    // Clear the previous success message.
    setMessage('');
  // End the cancel handler.
  }

  // Handle an inventory form submission.
  async function submit(e: React.FormEvent) {
    // Prevent the browser from reloading the page on submit.
    e.preventDefault();
    // Show the saving state.
    setLoading(true);
    // Clear the previous error.
    setError('');
    // Clear the previous success message.
    setMessage('');
    // Handle failures from sending or reloading data.
    try {
      // Check whether this is an edit or a new batch.
      const isEditing = editingId !== null;
      // Choose the batch-specific URL for edits and the collection URL for adds.
      const response = await fetch(isEditing ? `/api/inventory/${editingId}` : '/api/inventory', {
        // Use PATCH to update and POST to create.
        method: isEditing ? 'PATCH' : 'POST',
        // Mark the request body as JSON.
        headers: { 'Content-Type': 'application/json' },
        // Convert the form object to JSON.
        body: JSON.stringify(form)
      // Finish sending the request.
      });
      // Read its JSON response without assuming a shape.
      const result: unknown = await response.json();
      // Check whether the server rejected the save.
      if (!response.ok) {
        // Check for the error field on an object result.
        const errorMessage = typeof result === 'object' && result !== null && 'error' in result
          // Use the server's message if available.
          ? String(result.error)
          // Otherwise use the generic save error.
          : 'Could not save inventory.';
        // Forward the error to the catch block.
        throw new Error(errorMessage);
      // Finish the unsuccessful-response branch.
      }
      // Show the success message that matches the operation.
      setMessage(isEditing ? 'Inventory batch updated.' : 'Inventory batch saved.');
      // Return to add mode.
      setEditingId(null);
      // Reset the form inputs.
      setForm(newForm());
      // Reload the batch list to show the saved changes.
      await load();
    // Catch save or reload errors.
    } catch (e) {
      // Show the error message to the user.
      setError(e instanceof Error ? e.message : 'Could not save inventory.');
    // Always run cleanup at the end of the submit handler.
    } finally {
      // Leave the saving state.
      setLoading(false);
    // Finish cleanup.
    }
  // End the submit handler.
  }

  // Return the inventory form and table markup.
  return (
    // Line 366 — Use the shared shell and highlight Inventory in the sidebar.
    // Set the heading and subtitle for inventory management.
    // Open the inventory form panel.
    // Line 369 — Use a heading that reflects add or edit mode.
    // Line 370 — Bind the form to the submit handler and use its grid styling.
    // Line 371 — Start the product name field.
    // Line 372 — Label the required product name.
    // Line 373 — Bind the name to state and keep the product fixed when editing an existing batch.
    // Line 374 — End the product name field.
    // Line 375 — Start the category field.
    // Line 376 — Label the category control.
    // Line 377 — Bind the dropdown to state and keep the category fixed when editing.
    // Line 378 — Turn the allowed categories into dropdown options.
    // Line 379 — End the category dropdown.
    // Line 380 — End the category field.
    // Line 381 — Start the quantity field.
    // Line 382 — Label the required stock quantity.
    // Line 383 — Allow decimals with a minimum of 0.01 for new batches and zero for edits.
    // Line 384 — End the quantity field.
    // Line 385 — Start the unit field.
    // Line 386 — Label the stock measurement unit.
    // Line 387 — Bind the unit dropdown to the form.
    // Line 388 — List the measurement units offered by the page.
    // Line 389 — End the unit dropdown.
    // Line 390 — End the unit field.
    // Line 391 — Start the purchase date field.
    // Line 392 — Label the date the batch was purchased.
    // Line 393 — Bind a required date picker to the purchase date.
    // Line 394 — End the purchase date field.
    // Line 395 — Start the expiry date field.
    // Line 396 — Label the required expiry date.
    // Line 397 — Bind a required date picker to the expiry date.
    // Line 398 — End the expiry date field.
    // Line 399 — Start the cost field.
    // Line 400 — Label per-unit cost in rupees.
    // Line 401 — Bind a non-negative decimal cost input to the form.
    // Line 402 — End the cost field.
    // Line 403 — Start the supplier field.
    // Line 404 — Label the optional supplier name.
    // Line 405 — Bind the supplier text input to form state.
    // Line 406 — End the supplier field.
    // Line 407 — Open the action row spanning the full form width.
    // Line 408 — Disable the save button during the request and show the label for the current mode.
    // Line 409 — Offer Cancel in edit mode and keep it from submitting the form.
    // Line 410 — End the form action row.
    // Line 411 — End the inventory form.
    // Line 412 — Display a success notice when one exists.
    // Display an error notice when one exists.
    // End the form panel.
    // Line 415 — Open the batch listing panel.
    // Line 416 — Show the count of loaded batch rows.
    // Line 417 — Wrap the table so it can scroll when wider than its container.
    // Line 418 — Start the inventory table.
    // Line 419 — Start the table header.
    // Label the product, batch details, expiry risk and action columns.
    // Line 421 — End the table header.
    // Line 422 — Start the rows area.
    // Line 423 — Choose loading or data rows based on the loading flag.
    // Display a loading row across all eight columns.
    // Line 425 — Otherwise iterate over the loaded batches.
    // Line 426 — Compute the expiry label and CSS class for the batch.
    // Line 427 — Return one table row for the batch.
    // Line 428 — Use the batch ID as the React list key.
    // Line 429 — Show the product and its supplier, with text for a missing supplier.
    // Line 430 — Show the product category.
    // Line 431 — Show the quantity and unit together.
    // Line 432 — Show the purchase date.
    // Line 433 — Show the expiry date.
    // Line 434 — Format the unit cost as Indian rupees.
    // Line 435 — Style the expiry status using the computed class and show its label.
    // Open the selected batch in the edit form on click.
    // Line 437 — End the batch row.
    // Line 438 — Finish returning a row.
    // Line 439 — Finish mapping the saved batches.
    // Show a first-batch hint if loading is complete and the list is empty.
    // Line 441 — End the data rows.
    // Line 442 — End the inventory table.
    // Line 443 — End the table wrapper.
    // Line 444 — End the batch listing panel.
    // Line 445 — End the shared app shell.
    <Layout active="inventory">
      <Header eyebrow="INVENTORY MANAGEMENT" title="Food inventory" subtitle={canManage ? "Register batches and monitor expiry dates." : "View current stock and monitor expiry dates."} />
      {canManage && <div className="panel" style={{ marginBottom: 20 }}>
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
      </div>}
      {error && <div className="notice error">{error}</div>}
      <section className="panel">
        <h2>Inventory batches ({items.length})</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Product</th><th>Category</th><th>Quantity</th><th>Purchase</th><th>Expiry</th><th>Cost/unit</th><th>Risk</th>{canManage && <th>Actions</th>}</tr>
            </thead>
            <tbody>
              {loadingInventory
                ? <tr><td colSpan={canManage ? 8 : 7} className="empty">Loading inventory…</td></tr>
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
                    {canManage && <td><button type="button" className="btn secondary" onClick={() => edit(item)}>Edit</button></td>}
                  </tr>
                );
              })}
              {!loadingInventory && !items.length && <tr><td colSpan={canManage ? 8 : 7} className="empty">{canManage ? "No inventory yet. Add your first batch above." : "No inventory yet."}</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </Layout>
  // Finish returning the page markup.
  );
// End the Inventory component.
}
