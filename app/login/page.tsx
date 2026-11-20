'use client';

import { FormEvent, useState } from 'react';
import type { UserRole } from '@/lib/auth';

export default function LoginPage() {
  const [role, setRole] = useState<UserRole>('staff');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.get('email'), password: form.get('password'), role })
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Sign in failed.');
      }
      // Return to a local page and start a fresh navigation with the new session cookie.
      const next = new URLSearchParams(window.location.search).get('next');
      const target = new URL(next || '/', window.location.origin);
      window.location.replace(target.origin === window.location.origin ? target.pathname + target.search : '/');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Sign in failed. Please try again.');
      setLoading(false);
    }
  }

  return (
    <main className="login-shell">
      <form className="login-card" onSubmit={submit}>
        <div className="login-brand"><span className="brand-mark" aria-hidden="true" />FreshTrack</div>
        <h1>Sign in</h1>
        <fieldset className="role-picker" disabled={loading}>
          <legend>Account type</legend>
          {(['staff', 'admin'] as const).map(value => (
            <label key={value}>
              <input type="radio" name="role" value={value} checked={role === value}
                onChange={() => { setRole(value); setError(''); }} />
              {value === 'admin' ? 'Administrator' : 'Staff'}
            </label>
          ))}
        </fieldset>
        <label>Email<input name="email" type="email" required autoComplete="username" /></label>
        <label>Password<input name="password" type="password" required autoComplete="current-password" /></label>
        {error && <div role="alert" className="form-error">{error}</div>}
        <button className="primary-button" disabled={loading}>{loading ? 'Signing in…' : 'Sign in as ' + role}</button>
      </form>
    </main>
  );
}
