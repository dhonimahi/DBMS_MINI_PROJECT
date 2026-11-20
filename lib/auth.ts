import { jwtVerify, SignJWT } from 'jose';

export type UserRole = 'admin' | 'staff';
export type SessionUser = { id: string; name: string; email: string; role: UserRole };
export const SESSION_COOKIE = 'freshtrack_session';

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value) throw new Error('SESSION_SECRET is missing.');
  return new TextEncoder().encode(value);
}

export function createSessionToken(id: string, version: number) {
  // PostgreSQL stores the current version so an admin can invalidate an old login.
  return new SignJWT({ version })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(id)
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(secret());
}

export async function readSession(token?: string) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ['HS256'] });
    if (!payload.sub || !/^\d+$/.test(payload.sub)) return null;
    // Cookies from before account management use the initial version.
    const version = payload.version ?? 0;
    if (typeof version !== 'number' || !Number.isSafeInteger(version)) return null;
    return { id: payload.sub, version };
  } catch {
    return null;
  }
}
