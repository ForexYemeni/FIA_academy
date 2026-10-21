'use client'

import { useRef, useState } from 'react'
import { Card } from '@/components/ui/card'
import {
  Download, Calendar, Award, Shield, FileText, Copy,
  Loader2, CheckCircle2, X, Sparkles,
} from 'lucide-react'
import { toast } from 'sonner'
import html2canvas from 'html2canvas'
import { PDFDocument } from 'pdf-lib'
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
   * Quality: we set pixelRatio=4 (so a 720x508 cert becomes 2880x2032
   * — ultra-high-res for sharp printing and zooming). We DON'T force
   * width/height — we let htmlToImage measure the actual element
   * size, so the PNG matches the on-screen cert 100%.
   *
   * The output PNG is then handed to the APK's
   * FIANativeBridge.saveImageToGallery() (which writes it to
   * Pictures/FIA via MediaStore) or downloaded directly via blob+anchor
   * in a regular browser.
   *
   * This GUARANTEES that what the user sees on screen = what gets
   * saved to gallery — same design, same proportions, same colors,
   * same sharp quality.
   */
  /**
   * ⚡ Renders the cert element to a high-quality PNG using html2canvas.
   * html2canvas uses the browser's native canvas drawing API which
   * correctly renders Arabic text (with proper ligatures, shaping,
   * RTL direction). html-to-image uses SVG+foreignObject which has
   * known issues with Arabic text rendering (substitutes wrong glyphs).
   *
   * Returns a canvas (already cleaned: white background + sRGB).
   * This canvas can be exported as PNG (for downloadAsImage) or as
   * JPEG bytes (for downloadPdf's pdf-lib embedding).
   */
  const renderCertToCleanCanvas = async (): Promise<HTMLCanvasElement> => {
    if (!certRef.current) throw new Error('لا يمكن العثور على عنصر الشهادة')
    // ⚡ Use html2canvas (statically imported) — it uses the
    // browser's native canvas API which correctly handles Arabic
    // text shaping, ligatures, and RTL direction.
    // scale=4 → 4x resolution (2880x2032 for a 720x508 cert).
    const sourceCanvas = await html2canvas(certRef.current, {
      scale: 4,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    } as any)
    // ⚡ Re-draw onto a clean canvas with explicit white background.
    // This:
    //   1. Flattens any transparency (PNG alpha channel)
    //   2. Forces a clean sRGB color profile (no LAB ICC issues)
    //   3. Avoids "unsupported color 'function' lab" errors in any
    //      downstream PDF library
    const cleanCanvas = document.createElement('canvas')
    cleanCanvas.width = sourceCanvas.width
    cleanCanvas.height = sourceCanvas.height
    const cleanCtx = cleanCanvas.getContext('2d')!
    cleanCtx.fillStyle = '#ffffff'
    cleanCtx.fillRect(0, 0, cleanCanvas.width, cleanCanvas.height)
    cleanCtx.drawImage(sourceCanvas, 0, 0)
    return cleanCanvas
  }

  /**
   * Splits a large base64 string into chunks and passes them through
   * the APK bridge in pieces (Android's @JavascriptInterface has a
   * practical limit on the size of a single String argument — large
   * strings can be truncated or fail to pass through). After all
   * chunks are received, the APK concatenates and decodes.
   *
   * Returns true if the APK confirms the save succeeded.
   */
  const saveImageToGalleryChunked = async (
    base64Data: string,
    mimeType: string,
    filename: string
  ): Promise<boolean> => {
    const bridge = (window as any).FIANativeBridge
    if (!bridge) return false
    // ⚡ If the APK has a chunked-save method, use it. This handles
    // large PNG files (>1MB base64) that would fail with the simple
    // single-string saveImageToGallery method.
    if (typeof bridge.saveImageToGalleryChunked === 'function') {
      try {
        // Split into 500KB chunks (well under any reasonable limit)
        const chunks: string[] = []
        const CHUNK_SIZE = 500_000
        for (let i = 0; i < base64Data.length; i += CHUNK_SIZE) {
          chunks.push(base64Data.substring(i, i + CHUNK_SIZE))
        }
        // Pass the chunks as a JSON array — the APK concatenates them
        // and decodes the full base64 string at once.
        const result = bridge.saveImageToGalleryChunked(
          JSON.stringify(chunks),
          mimeType,
          filename
        )
        return !!result
      } catch (e) {
        console.warn('[FIA] chunked save failed, trying single:', e)
        // Fall through to single-string method
      }
    }
    // ⚡ Fallback to single-string method (for older APKs without the
    // chunked method).
    if (typeof bridge.saveImageToGallery === 'function') {
      try {
        return !!bridge.saveImageToGallery(base64Data, mimeType, filename)
      } catch (e) {
        console.warn('[FIA] single save failed:', e)
        return false
      }
    }
    return false
  }

  const downloadAsImage = async () => {
    if (!certRef.current) {
      toast.error('لا يمكن العثور على عنصر الشهادة')
      return
    }
    setDownloading(true)
    const filename = `FIA-Certificate-${certificate.certificate_number}.png`
    try {
      const cleanCanvas = await renderCertToCleanCanvas()
      // Get full-quality PNG data URL
      const dataUrl = cleanCanvas.toDataURL('image/png', 1.0)
      const base64Data = dataUrl.substring(dataUrl.indexOf(',') + 1)
      // ⚡ If inside FIA APK WebView, save via the native bridge.
      // Use the chunked method to handle large PNG files (>1MB).
      if (isAndroidWebView()) {
        const saved = await saveImageToGalleryChunked(base64Data, 'image/png', filename)
        if (saved) {
          const bridge = (window as any).FIANativeBridge
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
          // Fall through to blob download
        }
      }
      // Regular browser path — or fallback in WebView if bridge failed
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
      console.error('[FIA] cert PNG failed:', e)
      toast.error('فشل إنشاء صورة الشهادة: ' + (e?.message || ''))
    } finally {
      setDownloading(false)
    }
  }

  /**
   * ⚡ PDF download — generates a PDF that's a 100% match of the
   * on-screen JSX certificate.
   *
   * Pipeline:
   *   1. html2canvas renders the cert to a high-res canvas (4x scale)
   *      — this correctly renders Arabic text via the browser's canvas
   *      API (no glyph substitution issues).
   *   2. Re-draw onto a clean canvas (white bg → sRGB color profile).
   *   3. Export as JPEG (always RGB, no LAB ICC profile).
   *   4. pdf-lib embeds the JPEG bytes directly into a PDF page that
   *      matches the cert's aspect ratio exactly.
   *
   * ⚡ Why pdf-lib (not jsPDF)?
   * jsPDF parses ICC color profiles and fails with "unsupported color
   * 'function' lab" when the canvas has a LAB profile. pdf-lib doesn't
   * parse color profiles — it embeds the image bytes as-is.
   *
   * ⚡ Why JPEG (not PNG) for the embedded image?
   *   1. JPEG is always RGB (no ICC profile issues)
   *   2. Smaller file size → smaller PDF → faster APK bridge transfer
   *   3. Quality 0.95 is near-lossless for visible quality
   */
  const downloadPdf = async () => {
    if (!certRef.current) {
      toast.error('لا يمكن العثور على عنصر الشهادة')
      return
    }
    setPdfDownloading(true)
    const filename = `FIA-Certificate-${certificate.certificate_number}.pdf`
    try {
      const cleanCanvas = await renderCertToCleanCanvas()
      // Export as JPEG (always RGB, no LAB issues, smaller file)
      const jpegBlob = await new Promise<Blob>((resolve, reject) => {
        cleanCanvas.toBlob(
          (blob) => {
            if (blob) resolve(blob)
            else reject(new Error('Failed to convert canvas to JPEG'))
          },
          'image/jpeg',
          0.95
        )
      })
      const jpegBytes = new Uint8Array(await jpegBlob.arrayBuffer())
      // Use pdf-lib (statically imported) to create the PDF
      const pdfDoc = await PDFDocument.create()
      const embeddedImage = await pdfDoc.embedJpg(jpegBytes)
      // Page size matches the cert's aspect ratio (no margins/borders)
      const imgWidth = embeddedImage.width
      const imgHeight = embeddedImage.height
      const imgRatio = imgWidth / imgHeight
      let pageWidth = 297 // A4 landscape width in mm
      let pageHeight = pageWidth / imgRatio
      const maxPageHeight = 210 // A4 landscape height in mm
      if (pageHeight > maxPageHeight) {
        pageHeight = maxPageHeight
        pageWidth = pageHeight * imgRatio
      }
      const page = pdfDoc.addPage([pageWidth, pageHeight])
      page.drawImage(embeddedImage, {
        x: 0,
        y: 0,
        width: pageWidth,
        height: pageHeight,
      })
      // Serialize PDF to bytes
      const pdfBytes = await pdfDoc.save()
      // Convert to base64 for the APK bridge (chunked to handle
      // large PDFs — Android's @JavascriptInterface has a practical
      // limit on String argument size)
      let pdfBase64 = ''
      try {
        const CHUNK_SIZE = 0x8000
        for (let i = 0; i < pdfBytes.length; i += CHUNK_SIZE) {
          const chunk = pdfBytes.subarray(i, i + CHUNK_SIZE)
          pdfBase64 += String.fromCharCode.apply(null, Array.from(chunk))
        }
        pdfBase64 = btoa(pdfBase64)
      } catch (e) {
        console.warn('[FIA] PDF base64 conversion failed:', e)
      }
      // ⚡ APK path — use chunked save to handle large PDFs
      if (isAndroidWebView()) {
        const bridge = (window as any).FIANativeBridge
        if (bridge && pdfBase64) {
          // Try chunked PDF save first
          if (typeof bridge.savePdfToDownloadsChunked === 'function') {
            try {
              const chunks: string[] = []
              const CHUNK_SIZE = 500_000
              for (let i = 0; i < pdfBase64.length; i += CHUNK_SIZE) {
                chunks.push(pdfBase64.substring(i, i + CHUNK_SIZE))
              }
              const saved = bridge.savePdfToDownloadsChunked(
                JSON.stringify(chunks),
                filename
              )
              if (saved) {
                try {
                  bridge.showToast('تم حفظ الشهادة PDF في مجلد التنزيلات ✓', 'long')
                } catch {}
                try {
                  bridge.vibrate('[50]')
                } catch {}
                toast.success('تم تنزيل الشهادة PDF إلى مجلد التنزيلات ✓')
                return
              }
            } catch (e) {
              console.warn('[FIA] chunked PDF save failed:', e)
            }
          }
          // Fallback to single-string method
          if (typeof bridge.savePdfToDownloads === 'function') {
            try {
              const saved = bridge.savePdfToDownloads(pdfBase64, filename)
              if (saved) {
                try {
                  bridge.showToast('تم حفظ الشهادة PDF في مجلد التنزيلات ✓', 'long')
                } catch {}
                try {
                  bridge.vibrate('[50]')
                } catch {}
                toast.success('تم تنزيل الشهادة PDF إلى مجلد التنزيلات ✓')
                return
              }
            } catch (e) {
              console.warn('[FIA] single PDF save failed:', e)
            }
          }
        }
        toast.error('فشل الحفظ المباشر — جاري المحاولة عبر المتصفح')
      }
      // Regular browser path — blob download
      const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' })
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
      toast.success('تم تنزيل الشهادة PDF ✓')
    } catch (e: any) {
      console.error('[FIA] PDF generation failed:', e)
      toast.error('فشل إنشاء ملف PDF: ' + (e?.message || ''))
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

