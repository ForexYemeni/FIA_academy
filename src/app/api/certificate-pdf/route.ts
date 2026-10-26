import { NextRequest, NextResponse } from 'next/server'

/**
 * ============================================================================
 * /api/certificate-pdf — بروكسي الشهادات الملكي (فرع Cloudflare v10.22)
 * ============================================================================
 *
 * رسم الشهادات يستخدم @napi-rs/canvas (وحدة أصلية لا تعمل على Workers)،
 * لذا يمرَّر هذا المسار الطلب شفافياً إلى خادم الرسم الأصلي (Vercel)
 * الذي يشغّل نفس كود v10.21 الحرفي — العميل لا يلاحظ أي فرق:
 *   - نفس المسار على نفس الأصل (origin) — بلا CORS وبلا تعديل للعميل
 *   - PNG وPDF وdownload=1 كلها تُمرر كما هي
 *   - رد الخادم الأصلي (بايتات الملف أو الخطأ) يُعاد حرفياً
 *
 * ملاحظة تشغيلية: إذا كان حساب Vercel متوقفاً مؤقتاً، يُعاد خطأ واضح 503
 * مع رسالة عربية — ويعمل تلقائياً فور عودة الحساب.
 * ============================================================================
 */

const CERT_ORIGIN = process.env.CERT_SERVICE_ORIGIN || 'https://fiaacademy.vercel.app'

export async function GET(req: NextRequest) {
  try {
    const incoming = new URL(req.url)
    const target = `${CERT_ORIGIN}/api/certificate-pdf${incoming.search}`

    const upstream = await fetch(target, {
      method: 'GET',
      headers: {
        // تمرير هوية الطلب كما هي لخادم الرسم الأصلي
        'User-Agent': req.headers.get('user-agent') || 'FIA-Cloudflare-Proxy',
        Accept: req.headers.get('accept') || '*/*',
      },
      // بايتات الملف قد تكون كبيرة (3040×2760) — لا مهلة قصيرة
      signal: AbortSignal.timeout(55_000),
    })

    // إعادة الرد الحرفي مع ترويسات التنزيل
    const headers = new Headers()
    const passthrough = [
      'content-type',
      'content-disposition',
      'content-length',
      'cache-control',
    ]
    for (const h of passthrough) {
      const v = upstream.headers.get(h)
      if (v) headers.set(h, v)
    }

    if (!upstream.ok) {
      // خطأ من الخادم الأصلي — نضيف رسالة عربية واضحة إن كان الحساب موقوفاً
      const text = await upstream.text().catch(() => '')
      const paused =
        upstream.status === 402 ||
        /account.{0,40}paused|DEPLOYMENT_NOT_FOUND|FUNCTION_NOT_FOUND/i.test(text)
      return new NextResponse(
        JSON.stringify({
          error: paused
            ? 'خدمة رسم الشهادات في وضع الصيانة مؤقتاً — جرّب بعد قليل'
            : 'تعذر توليد الشهادة من الخادم الأصلي',
          upstream_status: upstream.status,
        }),
        { status: upstream.status === 404 ? 404 : 502, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const body = await upstream.arrayBuffer()
    return new NextResponse(body, { status: upstream.status, headers })
  } catch (e) {
    return new NextResponse(
      JSON.stringify({
        error: 'خدمة الشهادات غير متاحة حالياً — حاول لاحقاً',
        detail: e instanceof Error ? e.message : String(e),
      }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
