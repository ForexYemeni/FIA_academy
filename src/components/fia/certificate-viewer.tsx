'use client'

import { useRef, useState } from 'react'
import { Card } from '@/components/ui/card'
import {
  Download, Calendar, Award, Shield, FileText, Copy,
  Loader2, CheckCircle2, X, Sparkles,
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

      {/* === CERTIFICATE — landscape (horizontal) like a real printed certificate === */}
      <div ref={certRef} className="relative">
        {/* Outer glow */}
        <div className="absolute -inset-3 bg-gradient-to-r from-gold/20 via-navy/10 to-gold/20 rounded-2xl blur-2xl opacity-60" />

        <Card className="relative overflow-hidden border-2 border-gold/50 shadow-2xl" style={{ background: 'linear-gradient(135deg, #FFFEF7 0%, #FBF7EC 30%, #FFFEF7 70%, #FBF7EC 100%)' }}>
          {/* === Outer gold frame === */}
          <div className="p-3" style={{ background: 'linear-gradient(135deg, #C9A961 0%, #D4AF37 50%, #C9A961 100%)' }}>
            {/* === Inner navy frame === */}
            <div className="p-1.5 rounded-lg" style={{ background: 'linear-gradient(135deg, #0A1F44 0%, #102a63 50%, #0A1F44 100%)' }}>
              {/* === Inner cream content area === */}
              <div className="rounded-lg overflow-hidden" style={{ background: 'linear-gradient(135deg, #FFFEF7 0%, #FBF7EC 50%, #FFFEF7 100%)' }}>

                {/* === Subtle pattern background === */}
                <div className="relative px-8 py-10 md:px-12 md:py-12" style={{
                  backgroundImage: `
                    radial-gradient(circle at 15% 15%, rgba(201,169,97,0.05) 0%, transparent 40%),
                    radial-gradient(circle at 85% 85%, rgba(10,31,68,0.04) 0%, transparent 40%),
                    repeating-linear-gradient(45deg, transparent, transparent 30px, rgba(201,169,97,0.015) 30px, rgba(201,169,97,0.015) 31px)
                  `
                }}>

                  {/* === Top: Logo + Academy name === */}
                  <div className="text-center mb-8">
                    <div className="inline-block mb-3">
                      <img
                        src="/fia/logo-certificate.png"
                        alt="FIA"
                        className="w-20 h-20 md:w-28 md:h-28 object-contain mx-auto drop-shadow-lg"
                        style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.15))' }}
                      />
                    </div>
                    <div className="flex items-center justify-center gap-3 mb-1">
                      <div className="w-16 h-0.5" style={{ background: 'linear-gradient(to left, #C9A961, transparent)' }} />
                      <h1 className="text-2xl md:text-4xl font-bold text-navy" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>أكاديمية المستقبل الدولية</h1>
                      <div className="w-16 h-0.5" style={{ background: 'linear-gradient(to right, #C9A961, transparent)' }} />
                    </div>
                    <p className="text-[10px] md:text-xs text-gold font-bold tracking-[0.4em] uppercase">Future International Academy</p>
                  </div>

                  {/* === Certificate title === */}
                  <div className="text-center mb-6">
                    <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full" style={{ background: 'rgba(10,31,68,0.05)', border: '1.5px solid rgba(201,169,97,0.3)' }}>
                      <Award className="w-5 h-5 text-gold" />
                      <span className="text-base md:text-xl font-bold text-navy">شهادة إكمال معتمدة</span>
                      <Award className="w-5 h-5 text-gold" />
                    </div>
                  </div>

                  {/* === Body: Student + Course === */}
                  <div className="text-center py-4">
                    <p className="text-sm md:text-lg text-navy/60 mb-4">تشهد أكاديمية المستقبل الدولية بأن</p>

                    {/* Student name — large, prominent */}
                    <h2 className="text-3xl md:text-5xl font-bold text-navy mb-5 leading-tight"
                        style={{ textShadow: '0 2px 4px rgba(0,0,0,0.08)' }}>
                      {certificate.student_name}
                    </h2>

                    {/* Decorative gold line */}
                    <div className="flex items-center justify-center gap-3 mb-5">
                      <div className="w-24 h-0.5" style={{ background: 'linear-gradient(to left, rgba(201,169,97,0.6), transparent)' }} />
                      <Sparkles className="w-5 h-5 text-gold" />
                      <div className="w-24 h-0.5" style={{ background: 'linear-gradient(to right, rgba(201,169,97,0.6), transparent)' }} />
                    </div>

                    <p className="text-sm md:text-lg text-navy/60 mb-2">قد أتمّ بنجاح جميع متطلبات دورة</p>
                    <h3 className="text-xl md:text-3xl font-bold text-gold mb-4" style={{ textShadow: '0 1px 3px rgba(201,169,97,0.2)' }}>
                      {certificate.course_title || 'دورة معتمدة'}
                    </h3>

                    {certificate.has_external_accreditation && certificate.external_accreditation_body && (
                      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full" style={{ background: 'rgba(10,31,68,0.05)', border: '1px solid rgba(201,169,97,0.3)' }}>
                        <Shield className="w-4 h-4 text-gold" />
                        <span className="text-xs md:text-sm font-medium text-navy">معتمدة من: {certificate.external_accreditation_body}</span>
                      </div>
                    )}
                  </div>

                  {/* === Divider === */}
                  <div className="flex items-center justify-center gap-3 my-6">
                    <div className="flex-1 h-0.5" style={{ background: 'linear-gradient(to left, rgba(201,169,97,0.4), transparent)' }} />
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-gold/40" />
                      <div className="w-3 h-3 rounded-full bg-gold/60" />
                      <div className="w-2 h-2 rounded-full bg-gold/40" />
                    </div>
                    <div className="flex-1 h-0.5" style={{ background: 'linear-gradient(to right, rgba(201,169,97,0.4), transparent)' }} />
                  </div>

                  {/* === Footer: 3 columns + QR === */}
                  <div className="flex items-end justify-between gap-4 mt-8">
                    {/* Left: Issuer */}
                    <div className="text-center flex-1">
                      <div className="text-[9px] text-navy/50 uppercase tracking-widest mb-1">صادر عن</div>
                      <div className="font-bold text-navy text-xs md:text-sm mb-2">{certificate.issued_by || 'أكاديمية المستقبل الدولية'}</div>
                      <div className="mx-auto w-32 h-10 border-b border-navy/30" />
                      <div className="text-[9px] text-navy/40 mt-1">التوقيع</div>
                    </div>

                    {/* Center: cert info */}
                    <div className="text-center flex-1">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-navy/5 mb-1.5">
                            <FileText className="w-4 h-4 text-navy" />
                          </div>
                          <div className="text-[9px] text-navy/50 uppercase tracking-wider">رقم الشهادة</div>
                          <div className="font-mono font-bold text-navy text-[10px] md:text-xs" dir="ltr">{certificate.certificate_number}</div>
                        </div>
                        <div>
                          <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-navy/5 mb-1.5">
                            <Calendar className="w-4 h-4 text-navy" />
                          </div>
                          <div className="text-[9px] text-navy/50 uppercase tracking-wider">تاريخ الإصدار</div>
                          <div className="font-bold text-navy text-[10px] md:text-xs">
                            {issuedAt ? issuedAt.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right: QR code */}
                    <div className="text-center flex-shrink-0">
                      <img
                        src={`/api/qr-code?text=${encodeURIComponent('fiaacademy.vercel.app/verify/' + certificate.certificate_number)}`}
                        alt="QR"
                        className="w-16 h-16 md:w-20 md:h-20 mx-auto border border-gold/20 rounded-lg p-1 bg-white"
                      />
                      <div className="text-[8px] text-navy/40 mt-1">امسح للتحقق</div>
                    </div>
                  </div>

                  {/* === Bottom slogan === */}
                  <div className="text-center mt-8 pt-4" style={{ borderTop: '1px solid rgba(201,169,97,0.15)' }}>
                    <p className="text-[10px] md:text-xs text-gold font-semibold tracking-wider">نحو مستقبل أفضل معاً</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          onClick={downloadAsImage}
          disabled={downloading}
          className="inline-flex items-center gap-1.5 bg-navy hover:bg-navy-light text-white px-5 py-2.5 rounded-lg font-bold text-sm transition-all disabled:opacity-50"
        >
          {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          {downloading ? 'جاري التنزيل...' : 'تنزيل الشهادة (صورة)'}
        </button>
        <button
          onClick={copyCertNumber}
          className="inline-flex items-center gap-1.5 border border-gold/30 text-gold hover:bg-gold/10 px-5 py-2.5 rounded-lg font-bold text-sm transition-all"
        >
          <Copy className="w-4 h-4" /> نسخ رقم الشهادة
        </button>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 border border-navy/20 text-navy hover:bg-navy/5 px-5 py-2.5 rounded-lg font-bold text-sm transition-all"
        >
          <FileText className="w-4 h-4" /> طباعة / PDF
        </button>
      </div>
    </div>
  )
}
