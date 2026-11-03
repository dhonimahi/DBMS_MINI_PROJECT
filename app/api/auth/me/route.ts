import { NextRequest, NextResponse } from 'next/server';
import { readSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const user = await readSession(request);
  return user
    ? NextResponse.json(user)
    : NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
}
