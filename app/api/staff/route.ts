import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import { checkApiAccess } from '@/lib/account';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

function error(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

async function readBody(request: NextRequest): Promise<Record<string, unknown> | null> {
  const body = await request.json().catch(() => null);
  return body && typeof body === 'object' && !Array.isArray(body) ? body : null;
}

function staffDetails(body: Record<string, unknown>) {
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!name || name.length > 120 || email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return { name, email };
}

function validPassword(password: unknown): password is string {
  // bcrypt accepts at most 72 bytes, including multi-byte characters.
  return typeof password === 'string' && password.length >= 8 && Buffer.byteLength(password) <= 72;
}

function databaseError(cause: unknown) {
  if ((cause as { code?: string })?.code === '23505') return error('That email is already in use.', 409);
  console.error('Staff account operation failed:', cause);
  return error('Could not save the staff account.', 500);
}

export async function GET() {
  const denied = await checkApiAccess('admin');
  if (denied) return denied;
  const result = await query(`SELECT id::text, full_name AS name, email, is_active AS active
    FROM app_users WHERE role = 'staff' ORDER BY full_name, id`);
  return NextResponse.json(result.rows);
}

export async function POST(request: NextRequest) {
  const denied = await checkApiAccess('admin');
  if (denied) return denied;
  const body = await readBody(request);
  if (!body) return error('Enter the new staff account details.');
  const details = staffDetails(body);
  if (!details) return error('Enter a name and a valid email address.');
  if (!validPassword(body.password)) return error('Use at least 8 characters and at most 72 bytes for the password.');
  try {
    const hash = await bcrypt.hash(body.password, 10);
    // The database assigns the ID and the server always assigns the staff role.
    const result = await query(
      `INSERT INTO app_users (full_name, email, password_hash, role)
       VALUES ($1, $2, $3, 'staff') RETURNING id::text`, [details.name, details.email, hash]
    );
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (cause) {
    return databaseError(cause);
  }
}

export async function PATCH(request: NextRequest) {
  const denied = await checkApiAccess('admin');
  if (denied) return denied;
  const body = await readBody(request);
  if (!body || typeof body.id !== 'string' || !/^[1-9]\d{0,18}$/.test(body.id)) return error('Choose a staff account.');
  // Each update targets staff only. Status and credential changes revoke old sessions atomically.
  try {
    let result;
    if (body.action === 'details') {
      const details = staffDetails(body);
      if (!details) return error('Enter a name and a valid email address.');
      result = await query(`UPDATE app_users SET full_name = $2, email = $3::varchar,
        session_version = session_version + CASE WHEN email <> $3::varchar THEN 1 ELSE 0 END
        WHERE id::text = $1 AND role = 'staff'`, [body.id, details.name, details.email]);
    } else if (body.action === 'password' && validPassword(body.password)) {
      const hash = await bcrypt.hash(body.password, 10);
      result = await query(`UPDATE app_users SET password_hash = $2, session_version = session_version + 1
        WHERE id::text = $1 AND role = 'staff'`, [body.id, hash]);
    } else if (body.action === 'status' && typeof body.active === 'boolean') {
      result = await query(`UPDATE app_users SET is_active = $2,
        session_version = session_version + CASE WHEN is_active <> $2 THEN 1 ELSE 0 END
        WHERE id::text = $1 AND role = 'staff'`, [body.id, body.active]);
    } else {
      return error(body.action === 'password' ? 'Use at least 8 characters and at most 72 bytes for the password.' : 'Invalid account update.');
    }
    return result.rowCount ? NextResponse.json({ ok: true }) : error('Staff account was not found.', 404);
  } catch (cause) {
    return databaseError(cause);
  }
}
