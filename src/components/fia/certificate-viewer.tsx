'use client'

import { useRef, useState } from 'react'
import { Card } from '@/components/ui/card'
import {
  Download, Calendar, Award, Shield, Sparkles, FileText, Copy,
  Loader2, CheckCircle2, X,
} from 'lucide-react'
import { toast } from 'sonner'

export function CertificateViewer({ certificate, onClose }: { certificate: any; onClose?: () => void }) {
  const certRef = useRef<HTMLDivElement>(null)
  const [downloading, setDownloading] = useState(false)

  const issuedAt = certificate.issued_at ? new Date(certificate.issued_at) : null
  const isVerified = certificate.status === 'صالحة'

  const downloadAsImage = async () => {
    if (!certRef.current) return
    setDownloading(true)
    try {
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
    } catch {
      toast.info('تعذّر التنزيل المباشر — استخدم طباعة / حفظ PDF')
      window.print()
    } finally {
      setDownloading(false)
    }
  }

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
    <div className="space-y-4" dir="rtl">
      {/* Status badge */}
      <div className={`text-center ${isVerified ? 'text-green-600' : 'text-red-600'}`}>
        <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold ${isVerified ? 'bg-green-500/15 border border-green-500/30' : 'bg-red-500/15 border border-red-500/30'}`}>
          {isVerified ? <CheckCircle2 className="w-4 h-4" /> : <X className="w-4 h-4" />}
          {isVerified ? 'شهادة معتمدة وموثقة' : 'شهادة ملغاة'}
        </div>
      </div>

      {/* === CERTIFICATE CARD — vertical (portrait) design === */}
      <div ref={certRef} className="relative">
        <div className="absolute -inset-2 bg-gradient-to-r from-gold/10 via-navy/5 to-gold/10 rounded-2xl blur-xl" />

        <Card className="relative overflow-hidden border-2 border-gold/40 shadow-xl" style={{ background: 'linear-gradient(135deg, #FFFEF7 0%, #FBF7EC 50%, #FFFEF7 100%)' }}>
          {/* Top gold bar */}
          <div className="h-3 bg-gradient-to-r from-gold via-gold-light to-gold" />

          {/* Inner ornamental border */}
          <div className="p-2">
            <div className="border-2 border-gold/20 rounded-xl p-1">
              <div className="border border-gold/10 rounded-lg overflow-hidden">

                {/* === CERTIFICATE CONTENT — vertical centered === */}
                <div className="relative px-6 py-8 md:px-12 md:py-10 text-center" style={{
                  backgroundImage: 'radial-gradient(circle at 20% 20%, rgba(201,169,97,0.04) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(10,31,68,0.03) 0%, transparent 50%)'
                }}>

                  {/* === Logo === */}
                  <div className="inline-block mb-4">
                    <img
                      src="/fia/logo-certificate.png"
                      alt="أكاديمية المستقبل الدولية"
                      className="w-24 h-24 md:w-32 md:h-32 object-contain mx-auto"
                    />
                  </div>

                  {/* === Academy name === */}
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <div className="w-12 h-px bg-gradient-to-l from-gold to-transparent" />
                    <h1 className="text-xl md:text-3xl font-bold text-navy tracking-tight">أكاديمية المستقبل الدولية</h1>
                    <div className="w-12 h-px bg-gradient-to-r from-gold to-transparent" />
                  </div>
                  <p className="text-[10px] md:text-xs text-gold font-semibold tracking-[0.3em] uppercase mb-5">Future International Academy</p>

                  {/* === Certificate title badge === */}
                  <div className="inline-flex items-center gap-2 bg-navy/5 border border-gold/20 rounded-full px-5 py-2 mb-6">
                    <Award className="w-4 h-4 text-gold" />
                    <span className="text-sm md:text-lg font-bold text-navy">شهادة إكمال معتمدة</span>
                    <Award className="w-4 h-4 text-gold" />
                  </div>

                  {/* === Student name === */}
                  <p className="text-sm md:text-base text-muted-foreground mb-3">تشهد أكاديمية المستقبل الدولية بأن</p>
                  <h2 className="text-2xl md:text-4xl font-bold text-navy mb-4 leading-tight">{certificate.student_name}</h2>

                  {/* Decorative line */}
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <div className="w-20 h-px bg-gradient-to-l from-gold/60 to-transparent" />
                    <Sparkles className="w-4 h-4 text-gold" />
                    <div className="w-20 h-px bg-gradient-to-r from-gold/60 to-transparent" />
                  </div>

                  {/* === Course title === */}
                  <p className="text-sm md:text-base text-muted-foreground mb-2">قد أتمّ بنجاح جميع متطلبات دورة</p>
                  <h3 className="text-lg md:text-2xl font-bold text-gold mb-4">{certificate.course_title || 'دورة معتمدة'}</h3>

                  {/* External accreditation */}
                  {certificate.has_external_accreditation && certificate.external_accreditation_body && (
                    <div className="inline-flex items-center gap-2 bg-navy/5 border border-gold/30 rounded-full px-4 py-1.5 mb-6">
                      <Shield className="w-3.5 h-3.5 text-gold" />
                      <span className="text-xs font-medium text-navy">معتمدة من: {certificate.external_accreditation_body}</span>
                    </div>
                  )}

                  {/* === Divider === */}
                  <div className="flex items-center justify-center gap-3 my-6">
                    <div className="flex-1 h-px bg-gradient-to-l from-gold/40 to-transparent" />
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-gold/40" />
                      <div className="w-2.5 h-2.5 rounded-full bg-gold/60" />
                      <div className="w-1.5 h-1.5 rounded-full bg-gold/40" />
                    </div>
                    <div className="flex-1 h-px bg-gradient-to-r from-gold/40 to-transparent" />
                  </div>

                  {/* === Footer: 3-column cert info === */}
                  <div className="grid grid-cols-3 gap-3 mt-6">
                    <div className="text-center">
                      <div className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-navy/5 border border-gold/10 mb-2">
                        <FileText className="w-4 h-4 text-navy" />
                      </div>
                      <div className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">رقم الشهادة</div>
                      <div className="font-mono font-bold text-navy text-[11px] md:text-sm" dir="ltr">{certificate.certificate_number}</div>
                    </div>
                    <div className="text-center border-x border-gold/10">
                      <div className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-navy/5 border border-gold/10 mb-2">
                        <Calendar className="w-4 h-4 text-navy" />
                      </div>
                      <div className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">تاريخ الإصدار</div>
                      <div className="font-bold text-navy text-[11px] md:text-sm">
                        {issuedAt ? issuedAt.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-navy/5 border border-gold/10 mb-2">
                        <Shield className="w-4 h-4 text-navy" />
                      </div>
                      <div className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">الحالة</div>
                      <div className={`font-bold text-[11px] md:text-sm ${isVerified ? 'text-green-600' : 'text-red-500'}`}>{certificate.status}</div>
                    </div>
                  </div>

                  {/* === Issuer === */}
                  <div className="text-center mt-8 pt-5 border-t border-gold/10">
                    <div className="text-[9px] text-muted-foreground uppercase tracking-widest mb-1">صادر عن</div>
                    <div className="font-bold text-navy text-xs md:text-sm">{certificate.issued_by || 'أكاديمية المستقبل الدولية'}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom gold bar */}
          <div className="h-3 bg-gradient-to-r from-gold via-gold-light to-gold" />
        </Card>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          onClick={downloadAsImage}
          disabled={downloading}
          className="inline-flex items-center gap-1.5 bg-navy hover:bg-navy-light text-white px-4 py-2 rounded-lg font-bold text-xs transition-all disabled:opacity-50"
        >
          {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          {downloading ? 'جاري...' : 'تنزيل (صورة)'}
        </button>
        <button
          onClick={copyCertNumber}
          className="inline-flex items-center gap-1.5 border border-gold/30 text-gold hover:bg-gold/10 px-4 py-2 rounded-lg font-bold text-xs transition-all"
        >
          <Copy className="w-3.5 h-3.5" /> نسخ الرقم
        </button>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 border border-navy/20 text-navy hover:bg-navy/5 px-4 py-2 rounded-lg font-bold text-xs transition-all"
        >
          <FileText className="w-3.5 h-3.5" /> طباعة / PDF
        </button>
      </div>
    </div>
  )
}
