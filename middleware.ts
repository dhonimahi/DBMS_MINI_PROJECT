import { NextRequest, NextResponse } from 'next/server';
import { readSession, SESSION_COOKIE } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith('/login') || pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  const user = await readSession(request);
  if (!user) {
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }
    const login = new URL('/login', request.url);
    login.searchParams.set('next', pathname);
    const response = NextResponse.redirect(login);
    response.cookies.delete(SESSION_COOKIE);
    return response;
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
};
