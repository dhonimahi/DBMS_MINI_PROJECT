import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import nextEnv from '@next/env';
import { Pool } from 'pg';

nextEnv.loadEnvConfig(process.cwd());
const base = process.env.FRESHTRACK_BASE_URL || 'http://localhost:3000';

function request(path, method = 'GET', cookie = '', body) {
  return fetch(new URL(path, base), {
    method, redirect: 'manual',
    headers: { Cookie: cookie, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
}

async function signIn(email, password, role) {
  const response = await request('/api/auth/login', 'POST', '', { email, password, role });
  assert.equal(response.status, 200);
  return response.headers.get('set-cookie').split(';')[0];
}

test('administrator manages a staff login throughout its lifecycle', async () => {
  const admin = await signIn('admin@freshtrack.local', 'Admin123!', 'admin');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const email = 'test-' + randomUUID() + '@freshtrack.invalid';
  const newEmail = 'updated-' + email;
  const password = randomUUID();
  const newPassword = randomUUID();
  let id;

  try {
    const created = await request('/api/staff', 'POST', admin, { name: 'Role test', email, password });
    assert.equal(created.status, 201);
    id = (await created.json()).id;
    const save = data => request('/api/staff', 'PATCH', admin, { id, ...data });
    assert.ok((await (await request('/api/staff', 'GET', admin)).json()).some(row => row.id === id && row.active));
    assert.equal((await request('/api/auth/login', 'POST', '', { email, password, role: 'admin' })).status, 401);
    const staff = await signIn(email, password, 'staff');
    assert.equal((await request('/api/inventory', 'GET', staff)).status, 200);
    assert.equal((await request('/api/waste', 'GET', staff)).status, 200);
    // A malformed waste request reaches field validation, confirming staff can use the operation without writing business data.
    assert.equal((await request('/api/waste', 'POST', staff, {})).status, 400);
    assert.equal((await request('/api/staff', 'GET', staff)).status, 403);
    assert.equal((await request('/api/staff', 'POST', staff, {})).status, 403);
    assert.equal((await request('/api/staff', 'PATCH', staff, {})).status, 403);
    assert.equal((await request('/api/inventory', 'POST', staff, {})).status, 403);
    assert.equal((await request('/api/inventory/1', 'PATCH', staff, {})).status, 403);
    const adminInventory = await (await request('/inventory', 'GET', admin)).text();
    const staffInventory = await (await request('/inventory', 'GET', staff)).text();
    assert.match(adminInventory, />Add inventory batch</);
    assert.doesNotMatch(staffInventory, />Add inventory batch</);
    assert.match(staffInventory, />Log out</);
    assert.match(await (await request('/staff', 'GET', admin)).text(), />Staff directory</);
    assert.doesNotMatch(await (await request('/staff', 'GET', staff)).text(), />Staff directory</);

    assert.equal((await save({ action: 'details', name: 'Renamed staff', email: newEmail })).status, 200);
    assert.equal((await request('/api/auth/me', 'GET', staff)).status, 401);
    const renamed = await signIn(newEmail, password, 'staff');
    assert.equal((await (await request('/api/auth/me', 'GET', renamed)).json()).name, 'Renamed staff');
    assert.equal((await save({ action: 'password', password: newPassword })).status, 200);
    assert.equal((await request('/api/inventory', 'GET', renamed)).status, 401);
    assert.equal((await request('/api/auth/login', 'POST', '', { email: newEmail, password, role: 'staff' })).status, 401);
    const reset = await signIn(newEmail, newPassword, 'staff');
    assert.equal((await save({ action: 'status', active: false })).status, 200);
    assert.equal((await request('/api/waste', 'GET', reset)).status, 401);
    assert.equal((await request('/api/auth/login', 'POST', '', { email: newEmail, password: newPassword, role: 'staff' })).status, 401);
    assert.equal((await save({ action: 'status', active: true })).status, 200);
    assert.equal((await request('/api/auth/me', 'GET', reset)).status, 401);
    const active = await signIn(newEmail, newPassword, 'staff');

    const logout = await fetch(new URL('/api/auth/logout', base), {
      method: 'POST', redirect: 'manual',
      headers: { Cookie: active, 'Content-Type': 'application/x-www-form-urlencoded' }, body: ''
    });
    assert.equal(logout.status, 303);
    assert.equal(new URL(logout.headers.get('location')).pathname, '/login');
    assert.match(logout.headers.get('set-cookie'), /freshtrack_session=;/);
    assert.equal((await request('/api/inventory')).status, 401);
  } finally {
    // Delete only the randomized account created by this test, including its renamed email.
    try {
      await pool.query("DELETE FROM app_users WHERE role = 'staff' AND email IN ($1,$2)", [email, newEmail]);
    } finally {
      await pool.end();
    }
  }
});
