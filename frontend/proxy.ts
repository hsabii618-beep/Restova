import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'

export async function proxy(request: NextRequest) {
  const url = request.nextUrl;
  const path = url.pathname;

  // 1. Session and Auth Protection (existing logic)
  const isProtected =
    path.startsWith('/dashboard') ||
    path.startsWith('/admin') ||
    path.startsWith('/api');

  if (isProtected) {
    return await updateSession(request);
  }

  // 2. Public Menu Routing
  const isExcluded =
    path.startsWith("/login") ||
    path.startsWith("/signup") ||
    path.startsWith("/verify") ||
    path.startsWith("/auth") ||
    path.startsWith("/forgot-password") ||
    path.startsWith("/reset-password") ||
    path === "/";

  if (!isExcluded) {
    const hostname = request.headers
      .get("host")!
      .replace(".localhost:3000", `.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`);

    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost:3000";

    // a. Custom Domains
    if (hostname !== rootDomain && hostname !== "localhost:3000") {
      return NextResponse.rewrite(new URL(`/public-menu/${hostname}${path}`, request.url));
    }

    // b. Platform domain with slug/path
    const pathParts = path.split('/').filter(Boolean);
    if (pathParts.length >= 2) {
      return NextResponse.rewrite(new URL(`/public-menu/${pathParts[0]}/${pathParts[1]}`, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except for:
     * 1. /_next (Next.js internals)
     * 2. /_static (inside /public)
     * 3. all root files inside /public (e.g. /favicon.ico)
     */
    "/((?!_next/|_static/|_vercel|[\\w-]+\\.\\w+).*)",
  ],
}
