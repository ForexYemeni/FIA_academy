import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import {
  renderCertificatePNG,
  renderCertificatePDF,
} from '@/lib/certificate-render'

export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * ============================================================================
 * /api/certificate-pdf — ملف الشهادة الرسمي (PNG أو PDF) من خادم الموقع
 * ============================================================================
 *
 * v2.8: الرسم كله انتقل إلى src/lib/certificate-render.ts — يرسم الخادم
 * نفس تصميم certificate-card.tsx الفاخر المعروض في التطبيق حرفياً
 * (@napi-rs/canvas + خط Cairo مدمج من ملفات TTF):
 *   - PNG: 3040×2760 بجودة أصلية ثابتة على كل الأجهزة
 *   - PDF: صفحة واحدة بنفس الصورة المرسومة (تطابق تام)
 *
 * داخل تطبيق APK: الجلب يمر عبر fetchServerCertBase64 في
 * certificate-viewer.tsx → FIANativeBridge (Chunked) → ألبوم «Fia academy»
 * في المعرض (صورة) أو مجلد «Fia academy» في التنزيلات (PDF).
 *
 * `?download=1` يفرض Content-Disposition: attachment ليالتقطه
 * DownloadListener في WebView إن فشل الحفظ المباشر بالجسر.
 * ============================================================================
 */

export async function GET(req: NextRequest) {
  try {
    const certNum = req.nextUrl.searchParams.get('number')
    const certId = req.nextUrl.searchParams.get('id')
    const format = req.nextUrl.searchParams.get('format') || 'pdf'
    const downloadMode = req.nextUrl.searchParams.get('download') === '1'

    if (!certNum && !certId) {
      return NextResponse.json({ error: 'رقم الشهادة أو المعرّف مطلوب' }, { status: 400 })
    }

    let query = supabaseAdmin.from('certificates').select('*')
    if (certNum) query = query.eq('certificate_number', certNum)
    else if (certId) query = query.eq('id', certId)

    const { data: cert, error } = await query.single()
    if (error || !cert) {
      return NextResponse.json({ error: 'الشهادة غير موجودة' }, { status: 404 })
    }

    const issueDate = cert.issued_at
      ? new Date(cert.issued_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })
      : new Date().toLocaleDateString('ar-EG')

    // نفس رابط التحقق الذي يرسمه QR في certificate-card.tsx المعروضة
    const verifyUrl = `https://fiaacademy.vercel.app/verify/${encodeURIComponent(cert.certificate_number)}`

    // Fetch founder's signature, signatory name & position from founder bio (added via admin dashboard)
    // The signature is OPTIONAL — area remains clean if no signature has been added/approved
    let founderSignature: string | null = null
    let signatoryName: string | null = null
    let signatoryPosition: string | null = null
    try {
      const { data: trainers } = await supabaseAdmin.from('trainers').select('*')
      if (trainers) {
        const founder = trainers.find((t: any) => t.password && t.password.startsWith('__TEAM_MEMBER__:founder'))
        if (founder) {
          const bioSeparator = '\n\n===FIA_EXTRA===\n'
          const idx = founder.bio ? founder.bio.indexOf(bioSeparator) : -1
          if (idx !== -1) {
            const extraJson = founder.bio.substring(idx + bioSeparator.length)
            const extra = JSON.parse(extraJson)
            founderSignature = extra.signature || null
            signatoryName = extra.signatory_name || founder.name || null
            signatoryPosition = extra.signatory_position || 'المدير التنفيذي'
          }
        }
      }
    } catch {}

    if (format === 'png') {
      const pngBytes = await renderCertificatePNG(
        cert,
        issueDate,
        verifyUrl,
        founderSignature,
        signatoryName,
        signatoryPosition
      )
      const headers = new Headers()
      headers.set('Content-Type', 'image/png')
      const disposition = downloadMode ? 'attachment' : 'inline'
      headers.set('Content-Disposition', `${disposition}; filename="FIA-Certificate-${cert.certificate_number}.png"`)
      headers.set('Cache-Control', 'public, max-age=3600')
      return new NextResponse(new Uint8Array(pngBytes), { status: 200, headers })
    } else {
      const pdfBytes = await renderCertificatePDF(
        cert,
        issueDate,
        verifyUrl,
        founderSignature,
        signatoryName,
        signatoryPosition
      )
      const headers = new Headers()
      headers.set('Content-Type', 'application/pdf')
      const disposition = downloadMode ? 'attachment' : 'inline'
      headers.set('Content-Disposition', `${disposition}; filename="FIA-Certificate-${cert.certificate_number}.pdf"`)
      headers.set('Cache-Control', 'public, max-age=3600')
      return new NextResponse(new Uint8Array(pdfBytes), { status: 200, headers })
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
