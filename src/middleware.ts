import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Define protected routes and their required authentication
  const protectedRoutes = {
    '/Manager': 'Manager',
    '/coordinator': 'Coordinator', 
    '/hrd': 'HR',
    '/Manager-Ops': 'Ops',
    '/task': 'Task'
  };

  // Check if the current path matches any protected route
  for (const [route, role] of Object.entries(protectedRoutes)) {
    if (pathname.startsWith(route)) {
      // For now, we'll let the client-side protection handle this
      // The ProtectiveRoute component will check sessionStorage
      // This middleware serves as a backup and can be extended for server-side auth
      break;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/Manager/:path*',
    '/coordinator/:path*', 
    '/hrd/:path*',
    '/Manager-Ops/:path*',
    '/task/:path*',
    '/login',
    '/dashboard/:path*'
  ]
};
