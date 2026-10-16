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
      toast.info('تعذّر التنزيل المباشر — استخدم طباعة')
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
      {/* Status */}
      <div className={`text-center ${isVerified ? 'text-green-600' : 'text-red-600'}`}>
        <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold ${isVerified ? 'bg-green-500/15 border border-green-500/30' : 'bg-red-500/15 border border-red-500/30'}`}>
          {isVerified ? <CheckCircle2 className="w-4 h-4" /> : <X className="w-4 h-4" />}
          {isVerified ? 'شهادة معتمدة' : 'شهادة ملغاة'}
        </div>
      </div>

      {/* === CERTIFICATE CARD — TRUE LANDSCAPE === */}
      <div ref={certRef} className="relative">
        <div className="absolute -inset-3 bg-gradient-to-r from-gold/15 via-navy/8 to-gold/15 rounded-2xl blur-2xl opacity-60" />

        <Card className="relative overflow-hidden shadow-2xl" style={{ background: '#FBF7EC', border: '3px solid #C9A961' }}>
          {/* Outer gold frame */}
          <div style={{ padding: '4px', background: 'linear-gradient(135deg, #C9A961, #D4AF37, #C9A961)' }}>
            {/* Inner navy frame */}
            <div style={{ padding: '3px', borderRadius: '6px', background: 'linear-gradient(135deg, #0A1F44, #102a63, #0A1F44)' }}>
              {/* Content area */}
              <div style={{ borderRadius: '4px', overflow: 'hidden', background: 'linear-gradient(135deg, #FFFEF7, #FBF7EC 50%, #FFFEF7)' }}>

                {/* === CERTIFICATE CONTENT === */}
                <div style={{
                  padding: '24px 32px',
                  backgroundImage: 'radial-gradient(circle at 15% 15%, rgba(201,169,97,0.04) 0%, transparent 40%), radial-gradient(circle at 85% 85%, rgba(10,31,68,0.03) 0%, transparent 40%)'
                }}>

                  {/* ===== TOP: Logo + Name (compact, full width) ===== */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '16px' }}>
                    <img
                      src="/fia/logo-certificate.png"
                      alt="FIA"
                      style={{ width: '64px', height: '64px', objectFit: 'contain', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
                    />
                    <div style={{ textAlign: 'right' }}>
                      <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#0A1F44', margin: 0, lineHeight: 1.2 }}>أكاديمية المستقبل الدولية</h1>
                      <p style={{ fontSize: '9px', color: '#C9A961', fontWeight: 700, letterSpacing: '0.3em', margin: '2px 0 0 0', textTransform: 'uppercase' }}>Future International Academy</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '20px', background: 'rgba(10,31,68,0.05)', border: '1px solid rgba(201,169,97,0.3)', marginRight: '8px' }}>
                      <Award style={{ width: '14px', height: '14px', color: '#C9A961' }} />
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#0A1F44' }}>شهادة إكمال</span>
                    </div>
                  </div>

                  {/* Gold separator line */}
                  <div style={{ height: '1px', background: 'linear-gradient(to left, transparent, #C9A961, transparent)', marginBottom: '16px' }} />

                  {/* ===== BODY: 2 columns (landscape!) ===== */}
                  <div style={{ display: 'flex', gap: '24px', alignItems: 'stretch', minHeight: '180px' }}>

                    {/* === LEFT (60%): Student + Course === */}
                    <div style={{ flex: '3', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '8px 0' }}>
                      <p style={{ fontSize: '11px', color: 'rgba(10,31,68,0.6)', margin: '0 0 6px 0' }}>تشهد الأكاديمية بأن</p>
                      <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0A1F44', margin: '0 0 8px 0', textShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>{certificate.student_name}</h2>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
                        <div style={{ width: '40px', height: '1px', background: 'linear-gradient(to left, rgba(201,169,97,0.5), transparent)' }} />
                        <Sparkles style={{ width: '12px', height: '12px', color: '#C9A961' }} />
                        <div style={{ width: '40px', height: '1px', background: 'linear-gradient(to right, rgba(201,169,97,0.5), transparent)' }} />
                      </div>
                      <p style={{ fontSize: '11px', color: 'rgba(10,31,68,0.6)', margin: '0 0 4px 0' }}>قد أتمّ بنجاح دورة</p>
                      <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#C9A961', margin: 0 }}>{certificate.course_title || 'دورة معتمدة'}</h3>
                      {certificate.has_external_accreditation && certificate.external_accreditation_body && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '12px', background: 'rgba(10,31,68,0.05)', border: '1px solid rgba(201,169,97,0.3)', marginTop: '8px' }}>
                          <Shield style={{ width: '10px', height: '10px', color: '#C9A961' }} />
                          <span style={{ fontSize: '9px', color: '#0A1F44' }}>{certificate.external_accreditation_body}</span>
                        </div>
                      )}
                    </div>

                    {/* Vertical separator */}
                    <div style={{ width: '1px', background: 'linear-gradient(to bottom, transparent, rgba(201,169,97,0.3), transparent)' }} />

                    {/* === RIGHT (40%): Cert info + QR === */}
                    <div style={{ flex: '2', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '10px', padding: '8px 0' }}>
                      {/* Cert number */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#0A1F44', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <FileText style={{ width: '14px', height: '14px', color: '#C9A961' }} />
                        </div>
                        <div>
                          <div style={{ fontSize: '8px', color: 'rgba(10,31,68,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>رقم الشهادة</div>
                          <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '11px', color: '#0A1F44' }} dir="ltr">{certificate.certificate_number}</div>
                        </div>
                      </div>
                      {/* Date */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#0A1F44', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Calendar style={{ width: '14px', height: '14px', color: '#C9A961' }} />
                        </div>
                        <div>
                          <div style={{ fontSize: '8px', color: 'rgba(10,31,68,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>تاريخ الإصدار</div>
                          <div style={{ fontWeight: 700, fontSize: '11px', color: '#0A1F44' }}>
                            {issuedAt ? issuedAt.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
                          </div>
                        </div>
                      </div>
                      {/* Status */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#0A1F44', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Shield style={{ width: '14px', height: '14px', color: '#C9A961' }} />
                        </div>
                        <div>
                          <div style={{ fontSize: '8px', color: 'rgba(10,31,68,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>الحالة</div>
                          <div style={{ fontWeight: 700, fontSize: '11px', color: isVerified ? '#16a34a' : '#dc2626' }}>{certificate.status}</div>
                        </div>
                      </div>
                      {/* QR code */}
                      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4px' }}>
                        <img
                          src={`/api/qr-code?text=${encodeURIComponent('fiaacademy.vercel.app/verify/' + certificate.certificate_number)}`}
                          alt="QR"
                          style={{ width: '60px', height: '60px', border: '1px solid rgba(201,169,97,0.2)', borderRadius: '4px', padding: '2px', background: 'white' }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Gold separator line */}
                  <div style={{ height: '1px', background: 'linear-gradient(to left, transparent, #C9A961, transparent)', margin: '16px 0' }} />

                  {/* ===== BOTTOM: Issuer + Slogan ===== */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '8px', color: 'rgba(10,31,68,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>صادر عن</div>
                      <div style={{ fontWeight: 700, fontSize: '11px', color: '#0A1F44' }}>{certificate.issued_by || 'أكاديمية المستقبل الدولية'}</div>
                      <div style={{ width: '120px', height: '1px', background: 'rgba(10,31,68,0.2)', margin: '4px 0' }} />
                      <div style={{ fontSize: '8px', color: 'rgba(10,31,68,0.4)' }}>التوقيع</div>
                    </div>
                    <div style={{ fontSize: '10px', color: '#C9A961', fontWeight: 600, letterSpacing: '1px' }}>نحو مستقبل أفضل معاً</div>
                    <div style={{ width: '120px' }} />
                  </div>

                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          onClick={downloadAsImage}
          disabled={downloading}
          className="inline-flex items-center gap-1.5 bg-navy hover:bg-navy-light text-white px-5 py-2.5 rounded-lg font-bold text-sm transition-all disabled:opacity-50"
        >
          {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          {downloading ? 'جاري...' : 'تنزيل (صورة)'}
        </button>
        <button
          onClick={copyCertNumber}
          className="inline-flex items-center gap-1.5 border border-gold/30 text-gold hover:bg-gold/10 px-5 py-2.5 rounded-lg font-bold text-sm transition-all"
        >
          <Copy className="w-4 h-4" /> نسخ الرقم
        </button>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 border border-navy/20 text-navy hover:bg-navy/5 px-5 py-2.5 rounded-lg font-bold text-sm transition-all"
        >
          <FileText className="w-4 h-4" /> طباعة
        </button>
      </div>
    </div>
  )
}
