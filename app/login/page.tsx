'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    const form = new FormData(event.currentTarget);
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: form.get('email'), password: form.get('password') })
    });
    if (!response.ok) {
      const data = await response.json();
      setError(data.error || 'Sign in failed.');
      setLoading(false);
      return;
    }
    const next = new URLSearchParams(window.location.search).get('next');
    router.replace(next && next.startsWith('/') ? next : '/');
    router.refresh();
  }

  return (
    <main className="login-shell">
      <form className="login-card" onSubmit={submit}>
        <div className="eyebrow"><span />FreshTrack access</div>
        <h1>Sign in</h1>
        <p>Admin and staff accounts use role-based access.</p>
        <label>Email<input name="email" type="email" required autoComplete="username" /></label>
        <label>Password<input name="password" type="password" required autoComplete="current-password" /></label>
        {error && <div className="form-error">{error}</div>}
        <button className="primary-button" disabled={loading}>{loading ? 'Signing in...' : 'Sign in'}</button>
      </form>
    </main>
  );
}
