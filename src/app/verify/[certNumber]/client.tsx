'use client'

/**
 * ============================================================================
 * FIA ACADEMY — CERTIFICATE VERIFY PAGE
 * ============================================================================
 *
 * Public verification page — opens when user visits /verify/[certNumber].
 *
 * Renders the same unified luxury CertificateViewer used by the dashboard,
 * so the on-screen cert looks identical to the dashboard's cert, AND the
 * downloaded PNG/PDF matches what the user sees on screen.
 *
 * The page wraps the CertificateViewer in a hero status banner that tells
 * the visitor whether the certificate is valid or revoked.
 *
 * Previous implementation used a custom inline cert element with Tailwind 4
 * classes inside certRef — the html-to-image fallback worked, but the
 * primary download path silently failed for some users due to the same
 * lab/oklch color parsing issue that affected the dashboard. By using
 * the shared CertificateViewer + CertificateCard, both pages now use
 * the SAME inline-styled (HEX-only) cert element, with the SAME proven
 * html-to-image export pipeline.
 * ============================================================================
 */

import {
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { CertificateViewer } from '@/components/fia/certificate-viewer'

export default function VerifyClient({
  certificate,
}: {
  certificate: any
}) {
  // === NOT FOUND STATE ===
  if (!certificate) {
    return (
      <div
        className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 via-white to-rose-50 px-4"
        dir="rtl"
      >
        <Card className="relative p-10 text-center max-w-md border-rose-500/40 shadow-xl overflow-hidden">
          <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-l from-rose-500 via-red-400 to-rose-500 opacity-70" />
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-rose-500/15 rounded-full blur-2xl pointer-events-none" />
          <div className="relative inline-block mb-4">
            <div className="absolute inset-0 bg-rose-500/20 rounded-full blur-2xl animate-pulse" />
            <div className="relative w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center shadow-xl border border-white/30">
              <XCircle className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="relative text-2xl font-bold text-navy mb-2">
            الشهادة غير موجودة
          </h1>
          <p className="relative text-sm text-muted-foreground mb-6">
            لم نتمكن من العثور على شهادة بهذا الرقم. تأكد من صحة الرقم أو
            تواصل مع الإدارة.
          </p>
          <a
            href="/"
            className="relative inline-block bg-gradient-to-r from-navy to-navy-light hover:from-navy-light hover:to-navy text-gold px-6 py-3 rounded-xl font-bold text-sm shadow-md active:scale-[0.97] transition-all"
          >
            العودة للرئيسية
          </a>
        </Card>
      </div>
    )
  }

  const isVerified = certificate.status === 'صالحة'
  const verifiedAt = new Date().toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-navy/5 via-white to-gold/5 py-12 px-4"
      dir="rtl"
    >
      <div className="max-w-5xl mx-auto">
        {/* === Magical state-aware status banner === */}
        <div className="relative text-center mb-8 overflow-hidden">
          <div
            className={`absolute inset-0 ${
              isVerified ? 'bg-emerald-500/5' : 'bg-rose-500/5'
            } blur-2xl pointer-events-none`}
          />
          <div className="relative inline-block mb-3">
            <div
              className={`absolute inset-0 ${
                isVerified ? 'bg-emerald-500/20' : 'bg-rose-500/20'
              } rounded-full blur-2xl animate-pulse`}
            />
            <div
              className={`relative w-20 h-20 mx-auto rounded-2xl ${
                isVerified
                  ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
                  : 'bg-gradient-to-br from-rose-500 to-red-600'
              } flex items-center justify-center shadow-xl border border-white/30`}
            >
              {isVerified ? (
                <CheckCircle2 className="w-12 h-12 text-white" />
              ) : (
                <XCircle className="w-12 h-12 text-white" />
              )}
            </div>
          </div>
          <h1
            className={`relative text-2xl font-bold ${
              isVerified ? 'text-emerald-600' : 'text-rose-600'
            } mb-1`}
          >
            {isVerified ? '✓ شهادة معتمدة وموثقة' : '✗ شهادة ملغاة'}
          </h1>
          <p className="relative text-sm text-muted-foreground">
            تم التحقق من صحة هذه الشهادة في {verifiedAt}
          </p>
        </div>

        {/* === The unified luxury CertificateViewer === */}
        <div className="bg-white rounded-3xl shadow-2xl p-6 md:p-10 border border-gold/20">
          <CertificateViewer certificate={certificate} />
        </div>

        {/* Footer info */}
        <div className="text-center mt-8 text-xs text-muted-foreground">
          <p>
            للتحقق من صحة الشهادة، ادخل رقمها في صفحة{' '}
            <a href="/verify" className="text-gold font-bold hover:underline">
              التحقق من الشهادات
            </a>
          </p>
          <p className="mt-2 text-gold font-bold tracking-wide">
            ✦ أكاديمية المستقبل الدولية — نحو مستقبل أفضل معاً ✦
          </p>
        </div>
      </div>
    </div>
  )
}
