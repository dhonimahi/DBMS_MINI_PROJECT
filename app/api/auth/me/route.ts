import { NextResponse } from 'next/server';
import { currentAccount } from '@/lib/account';

export const dynamic = 'force-dynamic';

export async function GET() {
  const account = await currentAccount();
  return account ? NextResponse.json(account) : NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
}
