'use client'

import { useRef, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  CheckCircle2, XCircle, Download, Calendar, Award, Shield,
  Sparkles, FileText, Copy, Loader2,
} from 'lucide-react'
import { toast } from 'sonner'

export default function VerifyClient({ certificate }: { certificate: any }) {
  const certRef = useRef<HTMLDivElement>(null)
  const [downloading, setDownloading] = useState(false)

  if (!certificate) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 via-white to-rose-50 px-4" dir="rtl">
        <Card className="relative p-10 text-center max-w-md border-rose-500/40 shadow-xl overflow-hidden">
          <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-l from-rose-500 via-red-400 to-rose-500 opacity-70" />
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-rose-500/15 rounded-full blur-2xl pointer-events-none" />
          <div className="relative inline-block mb-4">
            <div className="absolute inset-0 bg-rose-500/20 rounded-full blur-2xl animate-pulse" />
            <div className="relative w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center shadow-xl border border-white/30">
              <XCircle className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="relative text-2xl font-bold text-navy mb-2">الشهادة غير موجودة</h1>
          <p className="relative text-sm text-muted-foreground mb-6">
            لم نتمكن من العثور على شهادة بهذا الرقم. تأكد من صحة الرقم أو تواصل مع الإدارة.
          </p>
          <a href="/" className="relative inline-block bg-gradient-to-r from-navy to-navy-light hover:from-navy-light hover:to-navy text-gold px-6 py-3 rounded-xl font-bold text-sm shadow-md active:scale-[0.97] transition-all">العودة للرئيسية</a>
        </Card>
      </div>
    )
  }

  const issuedAt = certificate.issued_at ? new Date(certificate.issued_at) : null
  const isVerified = certificate.status === 'صالحة'

  // Download certificate as PNG image using html-to-image
  const downloadAsImage = async () => {
    if (!certRef.current) return
    setDownloading(true)
    try {
      // Dynamically import html-to-image (it's a client-only lib)
      const htmlToImage = await import('html-to-image')
      const dataUrl = await htmlToImage.toPng(certRef.current, {
        quality: 0.95,
        pixelRatio: 2,
        backgroundColor: '#FBF7EC',
        cacheBust: true,
      })
      const link = document.createElement('a')
      link.download = `FIA-Certificate-${certificate.certificate_number}.png`
      link.href = dataUrl
      link.click()
      toast.success('تم تنزيل الشهادة كصورة')
    } catch (e: any) {
      // Fallback — use the browser's print-to-PDF
      toast.info('تعذّر التنزيل المباشر — استخدم طباعة / حفظ PDF')
      window.print()
    } finally {
      setDownloading(false)
    }
  }

  // Copy certificate number
  const copyCertNumber = async () => {
    try {
      await navigator.clipboard.writeText(certificate.certificate_number)
      toast.success('تم نسخ رقم الشهادة')
    } catch {
      const ta = document.createElement('textarea')
      ta.value = certificate.certificate_number
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      toast.success('تم نسخ رقم الشهادة')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy/5 via-white to-gold/5 py-12 px-4" dir="rtl">
      <div className="max-w-5xl mx-auto">
        {/* ⚡ Magical state-aware status banner */}
        <div className="relative text-center mb-8 overflow-hidden">
          {/* State-aware gradient backdrop */}
          <div className={`absolute inset-0 ${isVerified ? 'bg-emerald-500/5' : 'bg-rose-500/5'} blur-2xl pointer-events-none`} />
          <div className={`relative inline-block mb-3`}>
            <div className={`absolute inset-0 ${isVerified ? 'bg-emerald-500/20' : 'bg-rose-500/20'} rounded-full blur-2xl animate-pulse`} />
            <div className={`relative w-20 h-20 mx-auto rounded-2xl ${isVerified ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gradient-to-br from-rose-500 to-red-600'} flex items-center justify-center shadow-xl border border-white/30`}>
              {isVerified ? <CheckCircle2 className="w-12 h-12 text-white" /> : <XCircle className="w-12 h-12 text-white" />}
            </div>
          </div>
          <h1 className={`relative text-2xl font-bold ${isVerified ? 'text-emerald-600' : 'text-rose-600'} mb-1`}>
            {isVerified ? '✓ شهادة معتمدة وموثقة' : '✗ شهادة ملغاة'}
          </h1>
          <p className="relative text-sm text-muted-foreground">
            تم التحقق من صحة هذه الشهادة في {new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* === CERTIFICATE CARD — ref for image download === */}
        <div ref={certRef} className="relative">
          {/* Outer glow */}
          <div className="absolute -inset-4 bg-gradient-to-r from-gold/15 via-navy/5 to-gold/15 rounded-3xl blur-2xl" />

          <Card className="relative overflow-hidden border-2 border-gold/40 shadow-2xl" style={{ background: 'linear-gradient(135deg, #FFFEF7 0%, #FBF7EC 50%, #FFFEF7 100%)' }}>
            {/* Top gold bar */}
            <div className="h-4 bg-gradient-to-r from-gold via-gold-light to-gold" />

            {/* Inner ornamental border */}
            <div className="p-2">
              <div className="border-2 border-gold/25 rounded-xl p-1">
                <div className="border border-gold/15 rounded-lg overflow-hidden">

                  {/* === CERTIFICATE CONTENT === */}
                  <div className="relative px-6 py-10 md:px-16 md:py-14" style={{
                    backgroundImage: 'radial-gradient(circle at 20% 20%, rgba(201,169,97,0.03) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(10,31,68,0.02) 0%, transparent 50%)'
                  }}>

                    {/* === HEADER: Logo + Academy Name === */}
                    <div className="text-center mb-10">
                      <div className="inline-block mb-4">
                        <img
                          src="/fia/logo-certificate.png"
                          alt="أكاديمية المستقبل الدولية"
                          className="w-28 h-28 md:w-36 md:h-36 object-contain mx-auto"
                        />
                      </div>
                      <div className="flex items-center justify-center gap-3 mb-2">
                        <div className="w-16 h-px bg-gradient-to-l from-gold to-transparent" />
                        <h1 className="text-2xl md:text-4xl font-bold text-navy tracking-tight">أكاديمية المستقبل الدولية</h1>
                        <div className="w-16 h-px bg-gradient-to-r from-gold to-transparent" />
                      </div>
                      <p className="text-xs md:text-sm text-gold font-semibold tracking-[0.4em] uppercase">Future International Academy</p>
                    </div>

                    {/* === Certificate title === */}
                    <div className="text-center mb-10">
                      <div className="inline-flex items-center gap-3 bg-navy/5 border border-gold/20 rounded-full px-6 py-2">
                        <Award className="w-5 h-5 text-gold" />
                        <span className="text-lg md:text-xl font-bold text-navy">شهادة إكمال معتمدة</span>
                        <Award className="w-5 h-5 text-gold" />
                      </div>
                    </div>

                    {/* === Body: Student + Course === */}
                    <div className="text-center py-8">
                      <p className="text-base md:text-lg text-muted-foreground mb-4">تشهد أكاديمية المستقبل الدولية بأن</p>

                      <h2 className="text-3xl md:text-5xl font-bold text-navy mb-6 leading-tight"
                          style={{ fontFamily: 'var(--font-cairo), sans-serif', letterSpacing: '-0.02em' }}>
                        {certificate.student_name}
                      </h2>

                      {/* Decorative line under name */}
                      <div className="flex items-center justify-center gap-3 mb-6">
                        <div className="w-24 h-px bg-gradient-to-l from-gold/60 to-transparent" />
                        <Sparkles className="w-4 h-4 text-gold" />
                        <div className="w-24 h-px bg-gradient-to-r from-gold/60 to-transparent" />
                      </div>

                      <p className="text-base md:text-lg text-muted-foreground mb-3">قد أتمّ بنجاح جميع متطلبات دورة</p>

                      <h3 className="text-xl md:text-3xl font-bold text-gold mb-6 leading-snug">{certificate.course_title || 'دورة معتمدة'}</h3>

                      {certificate.has_external_accreditation && certificate.external_accreditation_body && (
                        <div className="inline-flex items-center gap-2 bg-navy/5 border border-gold/30 rounded-full px-5 py-2 mb-6">
                          <Shield className="w-4 h-4 text-gold" />
                          <span className="text-xs md:text-sm font-medium text-navy">معتمدة من: {certificate.external_accreditation_body}</span>
                        </div>
                      )}
                    </div>

                    {/* === Divider === */}
                    <div className="flex items-center justify-center gap-4 my-8">
                      <div className="flex-1 h-px bg-gradient-to-l from-gold/40 to-transparent" />
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-gold/40" />
                        <div className="w-3 h-3 rounded-full bg-gold/60" />
                        <div className="w-2 h-2 rounded-full bg-gold/40" />
                      </div>
                      <div className="flex-1 h-px bg-gradient-to-r from-gold/40 to-transparent" />
                    </div>

                    {/* === Footer: Cert info grid === */}
                    <div className="grid grid-cols-3 gap-4 md:gap-8 mt-8">
                      {/* Cert number */}
                      <div className="text-center">
                        <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-navy/5 border border-gold/10 mb-2">
                          <FileText className="w-5 h-5 text-navy" />
                        </div>
                        <div className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wider mb-1">رقم الشهادة</div>
                        <div className="font-mono font-bold text-navy text-xs md:text-sm" dir="ltr">{certificate.certificate_number}</div>
                      </div>

                      {/* Issue date */}
                      <div className="text-center border-x border-gold/10">
                        <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-navy/5 border border-gold/10 mb-2">
                          <Calendar className="w-5 h-5 text-navy" />
                        </div>
                        <div className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wider mb-1">تاريخ الإصدار</div>
                        <div className="font-bold text-navy text-xs md:text-sm">
                          {issuedAt ? issuedAt.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
                        </div>
                      </div>

                      {/* Status */}
                      <div className="text-center">
                        <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-navy/5 border border-gold/10 mb-2">
                          <Shield className="w-5 h-5 text-navy" />
                        </div>
                        <div className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wider mb-1">الحالة</div>
                        <div className={`font-bold text-xs md:text-sm ${isVerified ? 'text-green-600' : 'text-red-500'}`}>{certificate.status}</div>
                      </div>
                    </div>

                    {/* === Issuer === */}
                    <div className="text-center mt-10 pt-8 border-t border-gold/15">
                      <div className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-widest mb-2">صادر عن</div>
                      <div className="font-bold text-navy text-sm md:text-base mb-1">{certificate.issued_by || 'أكاديمية المستقبل الدولية'}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom gold bar */}
            <div className="h-4 bg-gradient-to-r from-gold via-gold-light to-gold" />
          </Card>
        </div>

        {/* Action buttons — magical */}
        <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
          {/* Download as image */}
          <button
            onClick={downloadAsImage}
            disabled={downloading}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-navy to-navy-light hover:from-navy-light hover:to-navy text-gold px-6 py-3 rounded-xl font-bold text-sm shadow-md transition-all active:scale-[0.97] disabled:opacity-50"
          >
            {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {downloading ? 'جاري التنزيل...' : 'تنزيل الشهادة (صورة)'}
          </button>

          {/* Copy cert number */}
          <button
            onClick={copyCertNumber}
            className="inline-flex items-center gap-2 border border-gold/30 text-gold hover:bg-gold/10 px-6 py-3 rounded-xl font-bold text-sm transition-all active:scale-[0.97]"
          >
            <Copy className="w-4 h-4" /> نسخ رقم الشهادة
          </button>

          {/* Print */}
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 border border-navy/20 text-navy hover:bg-navy/5 px-6 py-3 rounded-xl font-bold text-sm transition-all active:scale-[0.97]"
          >
            <FileText className="w-4 h-4" /> طباعة / PDF
          </button>
        </div>
      </div>
    </div>
  )
}
