import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';
import { readSession, SESSION_COOKIE, type SessionUser, type UserRole } from './auth';
import { query } from './db';

// Check the current account on each request. React shares this lookup within a page render.
export const currentAccount = cache(async (): Promise<SessionUser | null> => {
  const session = await readSession(cookies().get(SESSION_COOKIE)?.value);
  if (!session) return null;
  const result = await query<SessionUser>(
    `SELECT id::text, full_name AS name, email, role FROM app_users
     WHERE id = $1 AND is_active AND session_version = $2`, [session.id, session.version]
  );
  return result.rows[0] ?? null;
});

export async function requirePageAccount(role?: UserRole) {
  const account = await currentAccount();
  if (!account) redirect('/login');
  if (role && account.role !== role) redirect('/');
  return account;
}

export async function checkApiAccess(role?: UserRole) {
  const account = await currentAccount();
  if (!account) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
  if (role && account.role !== role) {
    return NextResponse.json({ error: 'Administrator access is required.' }, { status: 403 });
  }
  return null;
}
