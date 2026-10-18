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
      // Try html-to-image first
      const htmlToImage = await import('html-to-image')
      const dataUrl = await htmlToImage.toPng(certRef.current, {
        quality: 0.95,
        pixelRatio: 2,
        backgroundColor: '#FBF7EC',
        cacheBust: true,
      })
      // Create a proper download link and trigger it
      const link = document.createElement('a')
      link.download = `FIA-Certificate-${certificate.certificate_number}.png`
      link.href = dataUrl
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast.success('تم تنزيل الشهادة كصورة ✓')
    } catch (e) {
      // Fallback: open the certificate PDF endpoint in a new tab
      // The user can then right-click → Save Image As
      const pdfUrl = `/api/certificate-pdf?number=${encodeURIComponent(certificate.certificate_number)}&format=png`
      window.open(pdfUrl, '_blank')
      toast.info('تم فتح الشهادة في تبويب جديد — اضغط مطولاً على الصورة وحفظها')
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

  // Reduced ~6% for tighter professional proportions
  // 720×508 → export at 2x = 1440×1016 (still landscape, ratio 1.417)
  const NAVY = '#0A1F44'
  const NAVY_DEEP = '#060F2E'
  const GOLD = '#D4AF37'
  const GOLD_BRIGHT = '#E5C158'
  const GOLD_L = '#F0D070'
  const CREAM = '#FCF9F0'

  return (
    <div className="space-y-4">
      {/* Status */}
      <div className={`text-center ${isVerified ? 'text-green-600' : 'text-red-600'}`}>
        <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold ${isVerified ? 'bg-green-500/15 border border-green-500/30' : 'bg-red-500/15 border border-red-500/30'}`}>
          {isVerified ? <CheckCircle2 className="w-4 h-4" /> : <X className="w-4 h-4" />}
          {isVerified ? 'شهادة معتمدة' : 'شهادة ملغاة'}
        </div>
      </div>

      {/* Fixed landscape certificate — 768×542 (export 2x = 1536×1084) */}
      <div className="overflow-x-auto">
        <div ref={certRef} style={{ width: 720, height: 508, margin: '0 auto', position: 'relative' }}>
          {/* Gold frame — thicker + brighter */}
          <div style={{ width: '100%', height: '100%', padding: '5px', background: `linear-gradient(135deg, ${GOLD}, ${GOLD_BRIGHT}, ${GOLD_L}, ${GOLD})`, borderRadius: '8px', boxShadow: `0 4px 20px ${GOLD}40` }}>
            {/* Navy frame — deeper */}
            <div style={{ width: '100%', height: '100%', padding: '3px', borderRadius: '6px', background: `linear-gradient(135deg, ${NAVY_DEEP}, ${NAVY}, #102a63, ${NAVY})` }}>
              {/* Cream content */}
              <div style={{ width: '100%', height: '100%', borderRadius: '4px', overflow: 'hidden', background: `linear-gradient(135deg, #FFFEFA, ${CREAM} 50%, #FFFEFA)`, position: 'relative' }}>

                <div style={{
                  width: '100%', height: '100%', padding: '18px 34px',
                  display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                  textAlign: 'center',
                  backgroundImage: 'radial-gradient(circle at 10% 10%, rgba(212,175,55,0.06) 0%, transparent 40%), radial-gradient(circle at 90% 90%, rgba(10,31,68,0.05) 0%, transparent 40%)',
                }}>

                  {/* ===== TOP: Logo CENTERED + Academy name CENTERED ===== */}
                  <div>
                    <img src="/fia/logo-certificate.png" alt="FIA" style={{ width: '50px', height: '50px', objectFit: 'contain', margin: '0 auto 3px', filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.15))' }} />
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '1px' }}>
                      <div style={{ width: '22px', height: '2px', background: `linear-gradient(to right, ${GOLD}, transparent)`, borderRadius: '1px' }} />
                      <span style={{ fontSize: '17px', fontWeight: 900, color: NAVY, lineHeight: 1.2, textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>أكاديمية المستقبل الدولية</span>
                      <div style={{ width: '22px', height: '2px', background: `linear-gradient(to left, ${GOLD}, transparent)`, borderRadius: '1px' }} />
                    </div>
                    <p style={{ fontSize: '8px', color: GOLD, fontWeight: 800, letterSpacing: '0.3em', margin: 0, textTransform: 'uppercase' }}>Future International Academy</p>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 14px', borderRadius: '16px', background: `rgba(10,31,68,0.06)`, border: `1.5px solid ${GOLD}60`, marginTop: '6px' }}>
                      <Award style={{ width: '12px', height: '12px', color: GOLD }} />
                      <span style={{ fontSize: '10px', fontWeight: 800, color: NAVY }}>شهادة إكمال معتمدة</span>
                      <Award style={{ width: '12px', height: '12px', color: GOLD }} />
                    </div>
                  </div>

                  {/* Gold separator — thicker */}
                  <div style={{ height: '1.5px', background: `linear-gradient(to right, transparent, ${GOLD}, transparent)`, borderRadius: '1px' }} />

                  {/* ===== CENTER: Student + Course ===== */}
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', flex: 1 }}>
                    <p style={{ fontSize: '11px', color: 'rgba(10,31,68,0.65)', margin: '0 0 4px 0', fontWeight: 600 }}>تشهد أكاديمية المستقبل الدولية بأن</p>
                    <h2 style={{ fontSize: '24px', fontWeight: 900, color: NAVY, margin: '0 0 6px 0', textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>{certificate.student_name}</h2>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '6px' }}>
                      <div style={{ width: '48px', height: '1.5px', background: `linear-gradient(to right, ${GOLD}, transparent)`, borderRadius: '1px' }} />
                      <Sparkles style={{ width: '13px', height: '13px', color: GOLD }} />
                      <div style={{ width: '48px', height: '1.5px', background: `linear-gradient(to left, ${GOLD}, transparent)`, borderRadius: '1px' }} />
                    </div>
                    <p style={{ fontSize: '10px', color: 'rgba(10,31,68,0.65)', margin: '0 0 3px 0', fontWeight: 600 }}>قد أتمّ بنجاح جميع متطلبات دورة</p>
                    <h3 style={{ fontSize: '15px', fontWeight: 800, color: GOLD, margin: 0, textShadow: `0 1px 3px ${GOLD}50` }}>{certificate.course_title || 'دورة معتمدة'}</h3>
                    {certificate.has_external_accreditation && certificate.external_accreditation_body && (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '2px 8px', borderRadius: '10px', background: `rgba(10,31,68,0.05)`, border: `1px solid ${GOLD}40`, marginTop: '5px' }}>
                        <Shield style={{ width: '9px', height: '9px', color: GOLD }} />
                        <span style={{ fontSize: '8px', color: NAVY }}>{certificate.external_accreditation_body}</span>
                      </div>
                    )}
                  </div>

                  {/* Dot divider */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ flex: 1, height: '1.5px', background: `linear-gradient(to right, ${GOLD}60, transparent)`, borderRadius: '1px' }} />
                    <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: `${GOLD}88` }} />
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: GOLD }} />
                    <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: `${GOLD}88` }} />
                    <div style={{ flex: 1, height: '1.5px', background: `linear-gradient(to left, ${GOLD}60, transparent)`, borderRadius: '1px' }} />
                  </div>

                  {/* ===== BOTTOM: QR (left) + info (center) + signature (right) ===== */}
                  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '12px' }}>
                    {/* QR — visually on the left in LTR, which is correct */}
                    <div style={{ textAlign: 'center', flexShrink: 0 }}>
                      <img src={`/api/qr-code?text=${encodeURIComponent('fiaacademy.vercel.app/verify/' + certificate.certificate_number)}`} alt="QR" style={{ width: '46px', height: '46px', border: `1px solid ${GOLD}33`, borderRadius: '4px', padding: '2px', background: 'white' }} />
                      <div style={{ fontSize: '7px', color: 'rgba(10,31,68,0.4)', marginTop: '2px' }}>امسح للتحقق</div>
                    </div>
                    {/* Info */}
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: 1, justifyContent: 'center' }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ width: '20px', height: '20px', borderRadius: '4px', background: NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2px', boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }}>
                          <FileText style={{ width: '10px', height: '10px', color: GOLD }} />
                        </div>
                        <div style={{ fontSize: '6px', color: 'rgba(10,31,68,0.6)', textTransform: 'uppercase', fontWeight: 700 }}>الرقم</div>
                        <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '8px', color: NAVY }} dir="ltr">{certificate.certificate_number}</div>
                      </div>
                      <div style={{ width: '1px', height: '28px', background: `${GOLD}40` }} />
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ width: '20px', height: '20px', borderRadius: '4px', background: NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2px', boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }}>
                          <Calendar style={{ width: '10px', height: '10px', color: GOLD }} />
                        </div>
                        <div style={{ fontSize: '6px', color: 'rgba(10,31,68,0.6)', textTransform: 'uppercase', fontWeight: 700 }}>التاريخ</div>
                        <div style={{ fontWeight: 800, fontSize: '8px', color: NAVY }}>{issuedAt ? issuedAt.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}</div>
                      </div>
                      <div style={{ width: '1px', height: '28px', background: `${GOLD}40` }} />
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ width: '20px', height: '20px', borderRadius: '4px', background: NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2px', boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }}>
                          <Shield style={{ width: '10px', height: '10px', color: GOLD }} />
                        </div>
                        <div style={{ fontSize: '6px', color: 'rgba(10,31,68,0.6)', textTransform: 'uppercase', fontWeight: 700 }}>الحالة</div>
                        <div style={{ fontWeight: 800, fontSize: '8px', color: isVerified ? '#16a34a' : '#dc2626' }}>{certificate.status}</div>
                      </div>
                    </div>
                    {/* Signature */}
                    <div style={{ textAlign: 'center', flexShrink: 0, minWidth: '80px' }}>
                      <div style={{ fontSize: '7px', color: 'rgba(10,31,68,0.6)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px', fontWeight: 700 }}>صادر عن</div>
                      <div style={{ fontWeight: 800, fontSize: '8px', color: NAVY, marginBottom: '3px' }}>{certificate.issued_by || 'أكاديمية المستقبل الدولية'}</div>
                      <div style={{ width: '80px', height: '1.5px', background: `${NAVY}44`, margin: '0 auto', borderRadius: '1px' }} />
                      <div style={{ fontSize: '6px', color: 'rgba(10,31,68,0.5)', marginTop: '2px', fontWeight: 600 }}>التوقيع</div>
                    </div>
                  </div>

                  {/* Slogan */}
                  <div style={{ textAlign: 'center', paddingTop: '6px', borderTop: `1px solid ${GOLD}20` }}>
                    <span style={{ fontSize: '9px', color: GOLD, fontWeight: 800, letterSpacing: '0.5px' }}>نحو مستقبل أفضل معاً</span>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button onClick={downloadAsImage} disabled={downloading} className="inline-flex items-center gap-1.5 bg-navy hover:bg-navy-light text-white px-5 py-2.5 rounded-lg font-bold text-sm transition-all disabled:opacity-50">
          {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          {downloading ? 'جاري...' : 'تنزيل (صورة)'}
        </button>
        <button onClick={copyCertNumber} className="inline-flex items-center gap-1.5 border border-gold/30 text-gold hover:bg-gold/10 px-5 py-2.5 rounded-lg font-bold text-sm transition-all">
          <Copy className="w-4 h-4" /> نسخ الرقم
        </button>
        <button onClick={() => window.open(`/api/certificate-pdf?number=${encodeURIComponent(certificate.certificate_number)}&format=png`, '_blank')} className="inline-flex items-center gap-1.5 border border-navy/20 text-navy hover:bg-navy/5 px-5 py-2.5 rounded-lg font-bold text-sm transition-all">
          <FileText className="w-4 h-4" /> عرض / طباعة
        </button>
      </div>
    </div>
  )
}
