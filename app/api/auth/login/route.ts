import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { createSessionToken, SESSION_COOKIE } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const input = await request.json().catch(() => null);
  if (typeof input?.email !== 'string' || typeof input?.password !== 'string') {
    return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
  }

  // Role selection is checked against the stored account, never used to grant privileges.
  const result = await query(
    `SELECT id, full_name, password_hash, role, session_version FROM app_users
     WHERE email = $1 AND is_active LIMIT 1`, [input.email.trim().toLowerCase()]
  );
  const user = result.rows[0];
  if (!user || (input.role !== undefined && input.role !== user.role) ||
      !(await bcrypt.compare(input.password, user.password_hash))) {
    return NextResponse.json({ error: 'Check your account type, email and password.' }, { status: 401 });
  }

  const token = await createSessionToken(String(user.id), user.session_version);
  const response = NextResponse.json({ ok: true, user: { name: user.full_name, role: user.role } });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production',
    maxAge: 8 * 60 * 60, path: '/'
  });
  return response;
}
