// Import the framework's request and response utilities.
import { NextRequest, NextResponse } from 'next/server';
// Import the helper and cookie name used for session checks.
import { readSession, SESSION_COOKIE } from '@/lib/auth';

// Run this middleware before processing a matching request.
export async function middleware(request: NextRequest) {
  // Get just the URL path for routing decisions.
  const { pathname } = request.nextUrl;
  // Allow unauthenticated access to login, auth endpoints and the logo asset.
  if (pathname.startsWith('/login') || pathname.startsWith('/api/auth') || pathname === '/freshtrack-mark.svg') {
    // Continue to the requested route or asset.
    return NextResponse.next();
  // Finish handling public paths.
  }

  // Read and verify the cookie on other matching routes.
  const user = await readSession(request.cookies.get(SESSION_COOKIE)?.value);
  // Handle requests without a valid logged-in user.
  if (!user) {
    // Handle API requests separately so callers receive JSON.
    if (pathname.startsWith('/api')) {
      // Return an HTTP 401 JSON error to an unauthenticated API caller.
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    // Finish the API-specific branch.
    }
    // Build the login URL on the same origin.
    const login = new URL('/login', request.url);
    // Tell the login page which URL path the browser originally requested.
    login.searchParams.set('next', pathname);
    // Prepare the redirect to the login page.
    const response = NextResponse.redirect(login);
    // Clear a missing or invalid session cookie on the response.
    response.cookies.delete(SESSION_COOKIE);
    // Send the redirect to the browser.
    return response;
  // Finish unauthenticated request handling.
  }
  // Continue with the original request when authentication succeeds.
  return NextResponse.next();
// End middleware.
}

// Export the route-matching configuration used by Next.js.
export const config = {
  // Exclude framework static assets, its image handler and the default favicon from middleware.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
// Finish the match configuration.
};
