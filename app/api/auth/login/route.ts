import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { createSessionToken, SESSION_COOKIE } from '@/lib/auth';

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const input = body as { email?: unknown; password?: unknown };
  if (typeof input.email !== 'string' || typeof input.password !== 'string') {
    return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
  }

  const result = await query(
    'SELECT id, full_name, email, password_hash, role FROM app_users WHERE email = $1 LIMIT 1',
    [input.email.trim().toLowerCase()]
  );
  const user = result.rows[0];
  if (!user || !(await bcrypt.compare(input.password, user.password_hash))) {
    return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
  }

  const token = await createSessionToken({
    id: String(user.id),
    name: user.full_name,
    email: user.email,
    role: user.role
  });
  const response = NextResponse.json({ ok: true, user: { name: user.full_name, role: user.role } });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 8 * 60 * 60,
    path: '/'
  });
  return response;
}
