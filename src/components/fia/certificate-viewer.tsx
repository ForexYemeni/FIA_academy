'use client'

import { useRef, useState } from 'react'
import { Card } from '@/components/ui/card'
import {
  Download, Calendar, Award, Shield, FileText, Copy,
  Loader2, CheckCircle2, X, Sparkles,
} from 'lucide-react'
import { toast } from 'sonner'
import * as htmlToImage from 'html-to-image'
import { isAndroidWebView } from '@/lib/certificate-download'

export function CertificateViewer({ certificate, onClose }: { certificate: any; onClose?: () => void }) {
  const certRef = useRef<HTMLDivElement>(null)
  const [downloading, setDownloading] = useState(false)
  const [pdfDownloading, setPdfDownloading] = useState(false)

  const issuedAt = certificate.issued_at ? new Date(certificate.issued_at) : null
  const isVerified = certificate.status === 'صالحة'

  /**
   * Convert the JSX-rendered certificate (the certRef div) into a
   * high-quality PNG image. We use html-to-image which uses the
   * standard browser SVG+foreignObject trick:
   *
   *   1. Clone the DOM node
   *   2. Inline all computed styles
   *   3. Inline all external images (logo, QR) as data: URIs
   *   4. Render the clone as SVG <foreignObject>
   *   5. Draw the SVG onto a canvas
   *   6. Export the canvas as PNG via toDataURL
   *
   * Quality: we set pixelRatio=2 (so a 720x508 cert becomes 1440x1016
   * — high-res). The output PNG is then handed to the APK's
   * FIANativeBridge.saveImageToGallery() (which writes it to
   * Pictures/FIA via MediaStore) or downloaded directly via blob+anchor
   * in a regular browser.
   *
   * This GUARANTEES that what the user sees on screen = what gets
   * saved to gallery — same design, same proportions, same colors.
   * The previous flow fetched a server-generated PNG that had a
   * DIFFERENT design than the JSX rendering — the user complained
   * "الشهادة تظهر مختلفة و سيئة".
   */
  const downloadAsImage = async () => {
    if (!certRef.current) {
      toast.error('لا يمكن العثور على عنصر الشهادة')
      return
    }
    setDownloading(true)
    const filename = `FIA-Certificate-${certificate.certificate_number}.png`
    try {
      // Convert JSX cert to PNG via html-to-image
      // pixelRatio=2 for 2x resolution (high quality)
      const dataUrl = await htmlToImage.toPng(certRef.current, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: '#ffffff',
        // Skip fonts that may not load — the JSX uses system fonts
        // and inline styles, so this should work without font embeds
        skipFonts: false,
        // Maximum width / height for the resulting image
        width: 720,
        height: 508,
        style: {
          margin: '0',
          transform: 'none',
        }
      })

      // The dataUrl is a "data:image/png;base64,..." string
      // Strip the prefix to get raw base64
      const base64Data = dataUrl.substring(dataUrl.indexOf(',') + 1)

      // If inside FIA APK WebView, use the native bridge to save
      // directly to the gallery — this is the guaranteed path.
      if (isAndroidWebView()) {
        const bridge = (window as any).FIANativeBridge
        if (bridge && typeof bridge.saveImageToGallery === 'function') {
          const saved = bridge.saveImageToGallery(base64Data, 'image/png', filename)
          if (saved) {
            // Also call showToast via the bridge for instant feedback
            try {
              bridge.showToast('تم حفظ الشهادة في المعرض ✓', 'long')
            } catch {}
            try {
              bridge.vibrate('[50]')
            } catch {}
            toast.success('تم تنزيل الشهادة إلى المعرض ✓')
            return
          } else {
            toast.error('فشل حفظ الصورة — جاري المحاولة عبر المتصفح')
            // Fall through to blob+anchor approach below
          }
        } else {
          // Old APK without the bridge — fall through to blob+anchor
          toast.info('جاري فتح الصورة — اضغط مطولاً واحفظها يدوياً')
        }
      }

      // Regular browser path — or fallback in WebView if bridge failed
      // Convert the data URL to a blob and trigger a download
      const blob = await (await fetch(dataUrl)).blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = filename
      a.rel = 'noopener noreferrer'
      a.style.display = 'none'
      document.body.appendChild(a)
      a.click()
      setTimeout(() => {
        try { URL.revokeObjectURL(blobUrl) } catch {}
        try { document.body.removeChild(a) } catch {}
      }, 2000)
      toast.success('تم تنزيل الشهادة')
    } catch (e: any) {
      console.error('[FIA] html-to-image failed:', e)
      toast.error('فشل إنشاء صورة الشهادة: ' + (e?.message || ''))
    } finally {
      setDownloading(false)
    }
  }

  /**
   * PDF download — uses the server-generated PDF from /api/certificate-pdf
   * (since html-to-image can only produce PNG, not PDF).
   */
  const downloadPdf = async () => {
    setPdfDownloading(true)
    try {
      const { downloadCertificateFile } = await import('@/lib/certificate-download')
      await downloadCertificateFile({
        certificateNumber: certificate.certificate_number,
        format: 'pdf',
        onStatus: (msg, kind) => {
          if (kind === 'success') toast.success(msg)
          else if (kind === 'error') toast.error(msg)
          else toast.info(msg)
        },
      })
    } catch (e) {
      toast.error('فشل تحميل PDF')
    } finally {
      setPdfDownloading(false)
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

      {/* === Magical outer wrapper with navy header + gold frame === */}
      <div className="relative border-2 border-gold/30 rounded-2xl overflow-hidden shadow-xl bg-white">
        {/* Top gold strip */}
        <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-l from-gold via-amber-400 to-gold opacity-70 z-20" />

        {/* === Magical navy gradient header bar === */}
        <div className="relative bg-gradient-to-br from-navy via-navy-light to-navy px-6 py-4 flex items-center gap-3 overflow-hidden">
          {/* Gold dot pattern overlay */}
          <div className="absolute inset-0 opacity-25" style={{
            backgroundImage: 'radial-gradient(circle at 12% 50%, #D4AF37 1.5px, transparent 1.5px), radial-gradient(circle at 88% 20%, white 1px, transparent 1px)',
            backgroundSize: '24px 24px, 18px 18px',
          }} />
          {/* Gold glow circle */}
          <div className="absolute -top-4 -right-4 w-24 h-24 bg-gold/15 rounded-full blur-2xl" />
          <div className="relative w-11 h-11 rounded-full bg-gold/20 border border-gold/40 flex items-center justify-center">
            <Award className="w-6 h-6 text-gold" />
          </div>
          <div className="relative">
            <h3 className="text-gold font-bold text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              شهادة إكمال معتمدة
            </h3>
            <p className="text-white/60 text-xs">وثيقة رسمية من أكاديمية المستقبل الدولية</p>
          </div>
        </div>

        {/* === Certificate area with subtle gold dot pattern backdrop === */}
        <div className="relative overflow-x-auto bg-gradient-to-b from-amber-50/40 to-white py-6">
          {/* Subtle gold dot pattern overlay (behind certificate, in gaps) */}
          <div className="absolute inset-0 opacity-[0.07] pointer-events-none" style={{
            backgroundImage: 'radial-gradient(circle at 50% 50%, #D4AF37 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }} />

      {/* Fixed landscape certificate — 768×542 (export 2x = 1536×1084) */}
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
      </div>

      {/* Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button onClick={downloadAsImage} disabled={downloading} className="inline-flex items-center gap-1.5 bg-gradient-to-r from-navy to-navy-light hover:from-navy-light hover:to-navy text-gold px-5 py-2.5 rounded-xl shadow-md active:scale-[0.97] font-bold text-sm transition-all disabled:opacity-50">
          {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          {downloading ? 'جاري إنشاء الصورة...' : 'تنزيل (صورة)'}
        </button>
        <button onClick={copyCertNumber} className="inline-flex items-center gap-1.5 border border-gold/30 text-gold hover:bg-gold/10 px-5 py-2.5 rounded-xl font-bold text-sm transition-all">
          <Copy className="w-4 h-4" /> نسخ الرقم
        </button>
        <button onClick={downloadPdf} disabled={pdfDownloading} className="inline-flex items-center gap-1.5 border border-navy/20 text-navy hover:bg-navy/5 px-5 py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-50">
          {pdfDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
          {pdfDownloading ? 'جاري...' : 'تنزيل PDF'}
        </button>
      </div>

      {/* APK-specific hint — only shown when actually running in the
          FIA Android WebView. */}
      {isAndroidWebView() && (
        <p className="text-[10px] text-muted-foreground text-center mt-1">
          💡 سيتم حفظ صورة الشهادة في مجلد "FIA" داخل المعرض. الصورة عالية الجودة (2x) بنفس التصميم المعروض.
        </p>
      )}
    </div>
  )
}

