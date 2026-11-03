import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify, SignJWT } from 'jose';

export type UserRole = 'admin' | 'staff';

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

export const SESSION_COOKIE = 'freshtrack_session';

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value) throw new Error('SESSION_SECRET is missing.');
  return new TextEncoder().encode(value);
}

export async function createSessionToken(user: SessionUser) {
  return new SignJWT({ name: user.name, email: user.email, role: user.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(secret());
}

export async function readSession(request: NextRequest): Promise<SessionUser | null> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (typeof payload.sub !== 'string' || typeof payload.name !== 'string' ||
        typeof payload.email !== 'string' || !['admin', 'staff'].includes(String(payload.role))) {
      return null;
    }
    return { id: payload.sub, name: payload.name, email: payload.email, role: payload.role as UserRole };
  } catch {
    return null;
  }
}

export function requireRole(request: NextRequest, roles: UserRole[]) {
  return readSession(request).then(user => user && roles.includes(user.role) ? user : null);
}

export function authorizationError() {
  return NextResponse.json({ error: 'You must be signed in with permission to perform this action.' }, { status: 401 });
}
