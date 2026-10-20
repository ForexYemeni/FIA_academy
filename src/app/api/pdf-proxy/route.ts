import { NextRequest, NextResponse } from 'next/server'

// ============================================================
// PDF PROXY — fetches the PDF from Telegram (or any URL) server-side
// and streams it back to the client with proper CORS headers.
//
// WHY: PDF.js runs in the browser and uses fetch() to download the PDF.
// Telegram's file URLs (https://api.telegram.org/file/bot.../...) do NOT
// return CORS headers (no Access-Control-Allow-Origin). This causes the
// browser to block the fetch with a CORS error — the student sees
// 'فشل في تحميل ملف PDF. قد يكون الرابط منتهي الصلاحية.'
//
// Google Docs Viewer (the old viewer) didn't have this issue because
// Google's servers fetched the PDF server-side, not from the browser.
//
// SOLUTION: This proxy route fetches the PDF from the server (no CORS
// restriction server-side) and re-serves it with
// `Access-Control-Allow-Origin: *` so PDF.js can fetch it from our
// own origin.
//
// USAGE: Client calls `/api/pdf-proxy?url=<encoded Telegram URL>` and
// uses the proxy URL as the source for PDF.js. The proxy fetches the
// original URL server-side, sets the right Content-Type and CORS
// headers, and streams the bytes back.
// ============================================================

export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl.searchParams.get('url')
    if (!url) {
      return new NextResponse('Missing url parameter', { status: 400 })
    }

    // ⚡ Security: Only allow proxying URLs from api.telegram.org
    // (our PDFs are hosted there). Block everything else to prevent
    // this proxy from being used as an open SSRF (Server-Side Request
    // Forgery) vector — an attacker could otherwise use our server to
    // fetch arbitrary URLs and probe internal services.
    let parsedUrl: URL
    try {
      parsedUrl = new URL(url)
    } catch {
      return new NextResponse('Invalid URL', { status: 400 })
    }
    if (parsedUrl.hostname !== 'api.telegram.org') {
      return new NextResponse('Proxy only allows api.telegram.org', { status: 403 })
    }

    // Fetch the PDF server-side. Telegram's file URLs are public
    // (the bot token is in the URL path, not a query param), so
    // no auth headers are needed.
    const upstream = await fetch(url, {
      // Use a generous timeout — large PDFs on slow connections can
      // take a while. Vercel's maxDuration is 30s for this route.
      signal: AbortSignal.timeout(28000),
    })
    if (!upstream.ok) {
      return new NextResponse(`Upstream returned ${upstream.status}`, { status: 502 })
    }

    // Stream the upstream body back to the client. We DON'T buffer the
    // entire file in memory — we pipe the stream directly so large PDFs
    // don't OOM (out-of-memory) the function.
    const contentType = upstream.headers.get('content-type') || 'application/pdf'
    const contentLength = upstream.headers.get('content-length')

    const headers: Record<string, string> = {
      'Content-Type': contentType,
      // ⚡ CORS — allow our own origin (and any origin, since this is
      // a public proxy for Telegram files)
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range',
      // ⚡ Expose Range header so PDF.js can request byte ranges for
      // efficient streaming of large PDFs (it sends `Range: bytes=0-...`
      // to download only the needed portion)
      'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges',
      // ⚡ Disable caching — Telegram file URLs contain the bot token
      // and expire eventually. Caching could leak stale URLs.
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    }
    if (contentLength) {
      headers['Content-Length'] = contentLength
    }
    // Tell clients we support range requests (PDF.js uses this)
    headers['Accept-Ranges'] = 'bytes'

    return new NextResponse(upstream.body, {
      status: 200,
      headers,
    })
  } catch (e: any) {
    console.error('[pdf-proxy] Error:', e)
    return new NextResponse(`Proxy error: ${e.message}`, { status: 500 })
  }
}
