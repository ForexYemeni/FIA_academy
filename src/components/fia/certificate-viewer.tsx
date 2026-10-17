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

  return (
    <div className="space-y-4" dir="rtl">
      {/* Status */}
      <div className={`text-center ${isVerified ? 'text-green-600' : 'text-red-600'}`}>
        <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold ${isVerified ? 'bg-green-500/15 border border-green-500/30' : 'bg-red-500/15 border border-red-500/30'}`}>
          {isVerified ? <CheckCircle2 className="w-4 h-4" /> : <X className="w-4 h-4" />}
          {isVerified ? 'شهادة معتمدة' : 'شهادة ملغاة'}
        </div>
      </div>

      {/* === CERTIFICATE — landscape card, SAME vertical order === */}
      <div ref={certRef} className="relative">
        <div className="absolute -inset-3 bg-gradient-to-r from-gold/15 via-navy/8 to-gold/15 rounded-2xl blur-2xl opacity-50" />

        <Card className="relative overflow-hidden shadow-2xl" style={{ background: '#FBF7EC', border: '3px solid #C9A961' }}>
          {/* Gold frame */}
          <div style={{ padding: '4px', background: 'linear-gradient(135deg, #C9A961, #D4AF37, #C9A961)' }}>
            {/* Navy frame */}
            <div style={{ padding: '3px', borderRadius: '6px', background: 'linear-gradient(135deg, #0A1F44, #102a63, #0A1F44)' }}>
              {/* Cream content */}
              <div style={{ borderRadius: '4px', overflow: 'hidden', background: 'linear-gradient(135deg, #FFFEF7, #FBF7EC 50%, #FFFEF7)' }}>

                {/* === CONTENT — same order as vertical, landscape by padding === */}
                <div style={{
                  padding: '24px 56px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '360px',
                  backgroundImage: 'radial-gradient(circle at 15% 15%, rgba(201,169,97,0.04) 0%, transparent 40%), radial-gradient(circle at 85% 85%, rgba(10,31,68,0.03) 0%, transparent 40%)',
                  textAlign: 'center',
                }}>

                  {/* === TOP: Logo + Academy name === */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '8px' }}>
                      <img
                        src="/fia/logo-certificate.png"
                        alt="FIA"
                        style={{ width: '56px', height: '56px', objectFit: 'contain', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
                      />
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                          <div style={{ width: '20px', height: '1px', background: 'linear-gradient(to left, #C9A961, transparent)' }} />
                          <h1 style={{ fontSize: '18px', fontWeight: 800, color: '#0A1F44', margin: 0 }}>أكاديمية المستقبل الدولية</h1>
                          <div style={{ width: '20px', height: '1px', background: 'linear-gradient(to right, #C9A961, transparent)' }} />
                        </div>
                        <p style={{ fontSize: '8px', color: '#C9A961', fontWeight: 700, letterSpacing: '0.3em', margin: '1px 0 0 0', textTransform: 'uppercase' }}>Future International Academy</p>
                      </div>
                    </div>
                    {/* Title badge */}
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '3px 14px', borderRadius: '20px', background: 'rgba(10,31,68,0.05)', border: '1px solid rgba(201,169,97,0.3)' }}>
                      <Award style={{ width: '12px', height: '12px', color: '#C9A961' }} />
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#0A1F44' }}>شهادة إكمال معتمدة</span>
                      <Award style={{ width: '12px', height: '12px', color: '#C9A961' }} />
                    </div>
                  </div>

                  {/* === MIDDLE: Student + Course === */}
                  <div>
                    <p style={{ fontSize: '10px', color: 'rgba(10,31,68,0.6)', margin: '0 0 4px 0' }}>تشهد أكاديمية المستقبل الدولية بأن</p>
                    <h2 style={{ fontSize: '26px', fontWeight: 800, color: '#0A1F44', margin: '0 0 6px 0', textShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>{certificate.student_name}</h2>
                    {/* Decorative line */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '6px' }}>
                      <div style={{ width: '60px', height: '1px', background: 'linear-gradient(to left, rgba(201,169,97,0.5), transparent)' }} />
                      <Sparkles style={{ width: '14px', height: '14px', color: '#C9A961' }} />
                      <div style={{ width: '60px', height: '1px', background: 'linear-gradient(to right, rgba(201,169,97,0.5), transparent)' }} />
                    </div>
                    <p style={{ fontSize: '10px', color: 'rgba(10,31,68,0.6)', margin: '0 0 3px 0' }}>قد أتمّ بنجاح جميع متطلبات دورة</p>
                    <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#C9A961', margin: 0, textShadow: '0 1px 2px rgba(201,169,97,0.15)' }}>{certificate.course_title || 'دورة معتمدة'}</h3>
                    {certificate.has_external_accreditation && certificate.external_accreditation_body && (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 10px', borderRadius: '12px', background: 'rgba(10,31,68,0.05)', border: '1px solid rgba(201,169,97,0.3)', marginTop: '6px' }}>
                        <Shield style={{ width: '10px', height: '10px', color: '#C9A961' }} />
                        <span style={{ fontSize: '9px', color: '#0A1F44' }}>{certificate.external_accreditation_body}</span>
                      </div>
                    )}
                  </div>

                  {/* === BOTTOM: 3-column footer + slogan === */}
                  <div>
                    {/* Gold dot divider */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '12px' }}>
                      <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to left, rgba(201,169,97,0.3), transparent)' }} />
                      <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'rgba(201,169,97,0.4)' }} />
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'rgba(201,169,97,0.6)' }} />
                      <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'rgba(201,169,97,0.4)' }} />
                      <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to right, rgba(201,169,97,0.3), transparent)' }} />
                    </div>

                    {/* 3 columns: issuer | cert info | QR */}
                    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '16px' }}>
                      {/* Issuer */}
                      <div style={{ textAlign: 'center', flex: 1 }}>
                        <div style={{ fontSize: '8px', color: 'rgba(10,31,68,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>صادر عن</div>
                        <div style={{ fontWeight: 700, fontSize: '10px', color: '#0A1F44', marginBottom: '4px' }}>{certificate.issued_by || 'أكاديمية المستقبل الدولية'}</div>
                        <div style={{ width: '100px', height: '1px', background: 'rgba(10,31,68,0.2)', margin: '0 auto' }} />
                        <div style={{ fontSize: '7px', color: 'rgba(10,31,68,0.4)', marginTop: '2px' }}>التوقيع</div>
                      </div>

                      {/* Cert info: number + date + status in a row */}
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flex: 1, justifyContent: 'center' }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ width: '24px', height: '24px', borderRadius: '5px', background: '#0A1F44', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2px' }}>
                            <FileText style={{ width: '12px', height: '12px', color: '#C9A961' }} />
                          </div>
                          <div style={{ fontSize: '7px', color: 'rgba(10,31,68,0.5)', textTransform: 'uppercase' }}>الرقم</div>
                          <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '9px', color: '#0A1F44' }} dir="ltr">{certificate.certificate_number}</div>
                        </div>
                        <div style={{ width: '1px', height: '30px', background: 'rgba(201,169,97,0.15)' }} />
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ width: '24px', height: '24px', borderRadius: '5px', background: '#0A1F44', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2px' }}>
                            <Calendar style={{ width: '12px', height: '12px', color: '#C9A961' }} />
                          </div>
                          <div style={{ fontSize: '7px', color: 'rgba(10,31,68,0.5)', textTransform: 'uppercase' }}>التاريخ</div>
                          <div style={{ fontWeight: 700, fontSize: '9px', color: '#0A1F44' }}>
                            {issuedAt ? issuedAt.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                          </div>
                        </div>
                        <div style={{ width: '1px', height: '30px', background: 'rgba(201,169,97,0.15)' }} />
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ width: '24px', height: '24px', borderRadius: '5px', background: '#0A1F44', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2px' }}>
                            <Shield style={{ width: '12px', height: '12px', color: '#C9A961' }} />
                          </div>
                          <div style={{ fontSize: '7px', color: 'rgba(10,31,68,0.5)', textTransform: 'uppercase' }}>الحالة</div>
                          <div style={{ fontWeight: 700, fontSize: '9px', color: isVerified ? '#16a34a' : '#dc2626' }}>{certificate.status}</div>
                        </div>
                      </div>

                      {/* QR code */}
                      <div style={{ textAlign: 'center', flexShrink: 0 }}>
                        <img
                          src={`/api/qr-code?text=${encodeURIComponent('fiaacademy.vercel.app/verify/' + certificate.certificate_number)}`}
                          alt="QR"
                          style={{ width: '48px', height: '48px', border: '1px solid rgba(201,169,97,0.2)', borderRadius: '4px', padding: '2px', background: 'white' }}
                        />
                        <div style={{ fontSize: '7px', color: 'rgba(10,31,68,0.4)', marginTop: '2px' }}>تحقق</div>
                      </div>
                    </div>

                    {/* Slogan */}
                    <div style={{ textAlign: 'center', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid rgba(201,169,97,0.12)' }}>
                      <span style={{ fontSize: '9px', color: '#C9A961', fontWeight: 600, letterSpacing: '0.5px' }}>نحو مستقبل أفضل معاً</span>
                    </div>
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
