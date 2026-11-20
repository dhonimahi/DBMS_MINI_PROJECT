'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Header, Layout } from '../components';

type Staff = { id: string; name: string; email: string; active: boolean };
type Editor = { kind: 'create' } | { kind: 'details' | 'password'; staff: Staff };

export default function StaffManager() {
  const [rows, setRows] = useState<Staff[]>([]);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function refresh() {
    const response = await fetch('/api/staff', { cache: 'no-store' });
    if (!response.ok) throw new Error('Could not load staff accounts.');
    setRows(await response.json());
  }

  useEffect(() => {
    refresh().catch(cause => setError(cause.message)).finally(() => setLoading(false));
  }, []);

  function openEditor(next: Editor) {
    setError('');
    setMessage('');
    setEditor(next);
  }

  async function save(method: 'POST' | 'PATCH', data: Record<string, unknown>, success: string) {
    if (busy) return;
    setBusy(true);
    setMessage('');
    setError('');
    try {
      const response = await fetch('/api/staff', {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
      });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Could not save the account.');
      }
      setEditor(null);
      setMessage(success);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not reach the server.');
    } finally {
      setBusy(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editor) return;
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    if (editor.kind === 'create') {
      void save('POST', fields, 'Staff account created.');
    } else {
      void save('PATCH', { ...fields, action: editor.kind, id: editor.staff.id },
        editor.kind === 'password' ? 'Password reset. The staff member must sign in again.' : 'Staff details saved.');
    }
  }

  return (
    <Layout active="staff">
      <Header eyebrow="ADMINISTRATION" title="Staff accounts" subtitle="Manage staff sign-in details and access." />
      {error && <div role="alert" className="notice error">{error}</div>}
      {message && <div role="status" className="notice">{message}</div>}
      {editor && (
        <section className="panel staff-editor">
          <h2>{editor.kind === 'create' ? 'Create staff account' :
            (editor.kind === 'password' ? 'Reset password for ' : 'Edit account for ') + editor.staff.name}</h2>
          <form className="form-grid" onSubmit={submit}
            key={editor.kind + (editor.kind === 'create' ? '' : editor.staff.id)}>
            {editor.kind !== 'password' && <>
              <div className="field"><label htmlFor="staff-name">Full name</label>
                <input autoFocus id="staff-name" name="name" maxLength={120} required defaultValue={editor.kind === 'details' ? editor.staff.name : ''} /></div>
              <div className="field"><label htmlFor="staff-email">Sign-in email</label>
                <input id="staff-email" type="email" name="email" maxLength={255} required defaultValue={editor.kind === 'details' ? editor.staff.email : ''} /></div>
            </>}
            {editor.kind !== 'details' && <div className="field">
              <label htmlFor="staff-password">{editor.kind === 'create' ? 'Initial password' : 'New password'} (8+ characters)</label>
              <input id="staff-password" name="password" type="password" autoComplete="new-password" minLength={8} required />
            </div>}
            <div className="field full staff-actions">
              <button className="btn" disabled={busy}>{editor.kind === 'create' ? 'Create account' : 'Save changes'}</button>
              <button type="button" className="btn secondary" disabled={busy} onClick={() => setEditor(null)}>Cancel</button>
            </div>
          </form>
        </section>
      )}
      <section className="panel">
        <div className="staff-heading"><h2>Staff directory</h2>
          <button className="btn" disabled={busy} onClick={() => openEditor({ kind: 'create' })}>Add staff</button></div>
        <div className="table-wrap"><table>
          <thead><tr><th>ID</th><th>Staff member</th><th>Access</th><th>Account actions</th></tr></thead>
          <tbody>{rows.map(person => <tr key={person.id}>
            <td>{person.id}</td><td><strong>{person.name}</strong><div className="small">{person.email}</div></td>
            <td><span className={'status ' + (person.active ? 'status-safe' : 'status-expired')}>{person.active ? 'Active' : 'Inactive'}</span></td>
            <td><div className="staff-actions">
              <button className="btn secondary" disabled={busy} onClick={() => openEditor({ kind: 'details', staff: person })}>Edit</button>
              <button className="btn secondary" disabled={busy} onClick={() => openEditor({ kind: 'password', staff: person })}>Reset password</button>
              <button className="btn secondary" disabled={busy} onClick={() => void save('PATCH',
                { action: 'status', id: person.id, active: !person.active },
                person.name + (person.active ? ' has been deactivated.' : ' can sign in again.'))}>
                {person.active ? 'Deactivate' : 'Reactivate'}
              </button>
            </div></td>
          </tr>)}</tbody>
        </table></div>
        {loading ? <p className="empty">Loading staff…</p> :
          !rows.length && !error && <p className="empty">No staff accounts yet.</p>}
      </section>
    </Layout>
  );
}
