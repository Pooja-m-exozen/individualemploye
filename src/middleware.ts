import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Middleware can't access localStorage directly, so we'll handle auth in the components
export function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ['/login', '/dashboard/:path*']
};
