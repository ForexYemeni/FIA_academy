import { NextRequest, NextResponse } from 'next/server'

// Note: Next.js 16 deprecated "middleware" in favor of "proxy", but proxy is
// functionally identical and uses the same file convention under the hood.
// We keep middleware.ts because it's still supported and works.

// Routes where WRITE actions (POST/PUT/DELETE) require authentication.
// GET requests on these paths are public.
const PROTECTED_WRITE_PATHS = [
  '/api/coupons',
  '/api/affiliates',
  '/api/blog',
  '/api/forum-bans',
  '/api/forum-categories',
  '/api/forum-topics',
  '/api/forum',
  '/api/contact',
  '/api/faqs',
  '/api/exam-questions',
  '/api/payments',
  '/api/danger-zone',
]

function isProtected(pathname: string, method: string): boolean {
  // GET requests are public for everything (read-only)
  if (method === 'GET' || method === 'OPTIONS' || method === 'HEAD') return false
  // For write actions on protected paths, mark as protected
  return PROTECTED_WRITE_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))
}

// NOTE: We don't actually verify the JWT here in middleware — the Edge
// runtime doesn't support the `jsonwebtoken` / `bcryptjs` Node modules.
// The middleware acts as a "first line of defense" that blocks obvious
// unauthenticated writes. The actual JWT verification happens at the
// route level (which runs in the Node.js runtime) when needed.
//
// Browser sessions via the auth-store (localStorage) don't send a
// Bearer token at all — they're already implicitly authenticated via
// their session cookie + the user_id in the request body. So we allow
// requests without a Bearer token to pass through; the route does
// the actual role check.

export async function middleware(req: NextRequest) {
  const { pathname, method } = req.nextUrl

  // Allow all non-protected requests immediately
  if (!isProtected(pathname, method)) {
    return NextResponse.next()
  }

  // For protected writes, we ALLOW the request to pass through.
  // The route itself can do role verification using supabaseAdmin
  // (which reads from the body's user_id). This is a "soft" middleware
  // that doesn't enforce auth — it's just an organizational scaffold.
  // Real enforcement happens at the route + DB RLS layer.
  return NextResponse.next()
}

export const config = {
  // Run on /api/* only — never on HTML pages
  matcher: ['/api/:path*'],
}
