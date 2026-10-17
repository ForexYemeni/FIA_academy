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

  // Colors matching the sample
  const NAVY = '#0A1F44'
  const GOLD = '#C9A961'
  const GOLD_LIGHT = '#D4AF37'
  const CREAM = '#FBF7EC'

  return (
    <div className="space-y-4" dir="rtl">
      {/* Status */}
      <div className={`text-center ${isVerified ? 'text-green-600' : 'text-red-600'}`}>
        <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold ${isVerified ? 'bg-green-500/15 border border-green-500/30' : 'bg-red-500/15 border border-red-500/30'}`}>
          {isVerified ? <CheckCircle2 className="w-4 h-4" /> : <X className="w-4 h-4" />}
          {isVerified ? 'شهادة معتمدة' : 'شهادة ملغاة'}
        </div>
      </div>

      {/* === CERTIFICATE — matches the uploaded sample exactly === */}
      <div ref={certRef} className="relative">
        <div className="absolute -inset-3 bg-gradient-to-r from-gold/15 via-navy/8 to-gold/15 rounded-2xl blur-2xl opacity-50" />

        <Card className="relative overflow-hidden shadow-2xl" style={{ background: CREAM, border: `3px solid ${GOLD}` }}>
          {/* === Gold outer frame === */}
          <div style={{ padding: '4px', background: `linear-gradient(135deg, ${GOLD}, ${GOLD_LIGHT}, ${GOLD})` }}>
            {/* === Navy inner frame === */}
            <div style={{ padding: '3px', borderRadius: '6px', background: `linear-gradient(135deg, ${NAVY}, #102a63, ${NAVY})` }}>
              {/* === Cream content === */}
              <div style={{ borderRadius: '4px', overflow: 'hidden', background: `linear-gradient(135deg, #FFFEF7, ${CREAM} 50%, #FFFEF7)` }}>

                <div style={{
                  padding: '28px 40px',
                  backgroundImage: 'radial-gradient(circle at 10% 10%, rgba(201,169,97,0.04) 0%, transparent 40%), radial-gradient(circle at 90% 90%, rgba(10,31,68,0.03) 0%, transparent 40%)',
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: '400px',
                  position: 'relative',
                }}>

                  {/* ====== TOP ROW: Academy name (left) + Logo (right) ====== */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
                    {/* Academy name — top LEFT */}
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                        <div style={{ width: '20px', height: '1px', background: `linear-gradient(to right, ${GOLD}, transparent)` }} />
                        <h1 style={{ fontSize: '18px', fontWeight: 800, color: NAVY, margin: 0, lineHeight: 1.2 }}>أكاديمية المستقبل الدولية</h1>
                      </div>
                      <p style={{ fontSize: '8px', color: GOLD, fontWeight: 700, letterSpacing: '0.3em', margin: 0, textTransform: 'uppercase' }}>Future International Academy</p>
                      {/* Title badge */}
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '2px 12px', borderRadius: '20px', background: `rgba(10,31,68,0.05)`, border: `1px solid ${GOLD}40`, marginTop: '6px' }}>
                        <Award style={{ width: '11px', height: '11px', color: GOLD }} />
                        <span style={{ fontSize: '10px', fontWeight: 700, color: NAVY }}>شهادة إكمال معتمدة</span>
                      </div>
                    </div>

                    {/* Logo — top RIGHT */}
                    <img
                      src="/fia/logo-certificate.png"
                      alt="FIA"
                      style={{ width: '64px', height: '64px', objectFit: 'contain', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))', flexShrink: 0 }}
                    />
                  </div>

                  {/* Gold separator */}
                  <div style={{ height: '1px', background: `linear-gradient(to left, transparent, ${GOLD}, transparent)`, marginBottom: '16px' }} />

                  {/* ====== CENTER: Student name + Course ====== */}
                  <div style={{ textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '8px 0' }}>
                    <p style={{ fontSize: '11px', color: `rgba(10,31,68,0.6)`, margin: '0 0 6px 0' }}>تشهد أكاديمية المستقبل الدولية بأن</p>

                    {/* Student name — large */}
                    <h2 style={{ fontSize: '28px', fontWeight: 800, color: NAVY, margin: '0 0 8px 0', textShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                      {certificate.student_name}
                    </h2>

                    {/* Decorative line */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
                      <div style={{ width: '50px', height: '1px', background: `linear-gradient(to left, ${GOLD}80, transparent)` }} />
                      <Sparkles style={{ width: '14px', height: '14px', color: GOLD }} />
                      <div style={{ width: '50px', height: '1px', background: `linear-gradient(to right, ${GOLD}80, transparent)` }} />
                    </div>

                    <p style={{ fontSize: '11px', color: `rgba(10,31,68,0.6)`, margin: '0 0 4px 0' }}>قد أتمّ بنجاح جميع متطلبات دورة</p>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, color: GOLD, margin: 0, textShadow: `0 1px 2px ${GOLD}30` }}>
                      {certificate.course_title || 'دورة معتمدة'}
                    </h3>

                    {certificate.has_external_accreditation && certificate.external_accreditation_body && (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 10px', borderRadius: '12px', background: `rgba(10,31,68,0.05)`, border: `1px solid ${GOLD}40`, marginTop: '8px' }}>
                        <Shield style={{ width: '10px', height: '10px', color: GOLD }} />
                        <span style={{ fontSize: '9px', color: NAVY }}>معتمدة من: {certificate.external_accreditation_body}</span>
                      </div>
                    )}
                  </div>

                  {/* Gold dot divider */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '12px' }}>
                    <div style={{ flex: 1, height: '1px', background: `linear-gradient(to left, ${GOLD}40, transparent)` }} />
                    <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: `${GOLD}66` }} />
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: `${GOLD}99` }} />
                    <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: `${GOLD}66` }} />
                    <div style={{ flex: 1, height: '1px', background: `linear-gradient(to right, ${GOLD}40, transparent)` }} />
                  </div>

                  {/* ====== BOTTOM ROW: QR (left) + Cert info (center) + Signature (right) ====== */}
                  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '16px' }}>

                    {/* QR code — bottom LEFT */}
                    <div style={{ textAlign: 'center', flexShrink: 0 }}>
                      <img
                        src={`/api/qr-code?text=${encodeURIComponent('fiaacademy.vercel.app/verify/' + certificate.certificate_number)}`}
                        alt="QR"
                        style={{ width: '56px', height: '56px', border: `1px solid ${GOLD}33`, borderRadius: '4px', padding: '2px', background: 'white' }}
                      />
                      <div style={{ fontSize: '8px', color: `rgba(10,31,68,0.4)`, marginTop: '2px' }}>امسح للتحقق</div>
                    </div>

                    {/* Cert info — bottom CENTER */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, justifyContent: 'center' }}>
                      {/* Number */}
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ width: '22px', height: '22px', borderRadius: '5px', background: NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2px' }}>
                          <FileText style={{ width: '11px', height: '11px', color: GOLD }} />
                        </div>
                        <div style={{ fontSize: '7px', color: `rgba(10,31,68,0.5)`, textTransform: 'uppercase' }}>الرقم</div>
                        <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '9px', color: NAVY }} dir="ltr">{certificate.certificate_number}</div>
                      </div>
                      <div style={{ width: '1px', height: '32px', background: `${GOLD}26` }} />
                      {/* Date */}
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ width: '22px', height: '22px', borderRadius: '5px', background: NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2px' }}>
                          <Calendar style={{ width: '11px', height: '11px', color: GOLD }} />
                        </div>
                        <div style={{ fontSize: '7px', color: `rgba(10,31,68,0.5)`, textTransform: 'uppercase' }}>التاريخ</div>
                        <div style={{ fontWeight: 700, fontSize: '9px', color: NAVY }}>
                          {issuedAt ? issuedAt.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                        </div>
                      </div>
                      <div style={{ width: '1px', height: '32px', background: `${GOLD}26` }} />
                      {/* Status */}
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ width: '22px', height: '22px', borderRadius: '5px', background: NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2px' }}>
                          <Shield style={{ width: '11px', height: '11px', color: GOLD }} />
                        </div>
                        <div style={{ fontSize: '7px', color: `rgba(10,31,68,0.5)`, textTransform: 'uppercase' }}>الحالة</div>
                        <div style={{ fontWeight: 700, fontSize: '9px', color: isVerified ? '#16a34a' : '#dc2626' }}>{certificate.status}</div>
                      </div>
                    </div>

                    {/* Signature — bottom RIGHT */}
                    <div style={{ textAlign: 'center', flexShrink: 0, minWidth: '100px' }}>
                      <div style={{ fontSize: '8px', color: `rgba(10,31,68,0.5)`, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>صادر عن</div>
                      <div style={{ fontWeight: 700, fontSize: '10px', color: NAVY, marginBottom: '4px' }}>{certificate.issued_by || 'أكاديمية المستقبل الدولية'}</div>
                      <div style={{ width: '100px', height: '1px', background: `${NAVY}33`, margin: '0 auto' }} />
                      <div style={{ fontSize: '7px', color: `rgba(10,31,68,0.4)`, marginTop: '2px' }}>التوقيع</div>
                    </div>
                  </div>

                  {/* Slogan — very bottom */}
                  <div style={{ textAlign: 'center', marginTop: '10px', paddingTop: '8px', borderTop: `1px solid ${GOLD}20` }}>
                    <span style={{ fontSize: '9px', color: GOLD, fontWeight: 600, letterSpacing: '0.5px' }}>نحو مستقبل أفضل معاً</span>
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
