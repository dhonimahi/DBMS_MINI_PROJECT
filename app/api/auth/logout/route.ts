import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE } from '@/lib/auth';

export async function POST(request: NextRequest) {
  // A native form submission returns to login. API callers can still request JSON.
  const formPost = request.headers.get('content-type')?.startsWith('application/x-www-form-urlencoded');
  const response = formPost ? NextResponse.redirect(new URL('/login', request.url), 303) : NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
