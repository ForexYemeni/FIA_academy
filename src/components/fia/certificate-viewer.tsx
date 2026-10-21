'use client'

/**
 * ============================================================================
 * FIA ACADEMY — CERTIFICATE VIEWER WITH DOWNLOAD BUTTONS
 * ============================================================================
 *
 * Displays a certificate and provides three actions:
 *   1. تنزيل الصورة (PNG) — uses html-to-image.toPng()
 *   2. نسخ الرقم — uses navigator.clipboard.writeText() with execCommand fallback
 *   3. تنزيل PDF — uses html-to-image + pdf-lib to embed the cert as a high-quality JPEG inside an A4 landscape PDF
 *
 * ROOT CAUSE OF PREVIOUS FAILURE
 * =================================
 * The previous implementation used `html2canvas` v1.4.1, which throws:
 *   "Attempting to parse an unsupported color function 'lab'"
 * whenever it encounters Tailwind CSS 4's default `oklch()` / `lab()`
 * colors during DOM serialization. This blocked BOTH the PNG and PDF
 * buttons because both shared the same `renderCertToCleanCanvas()` step.
 *
 * THE FIX
 * =======
 * Switched to `html-to-image` (the same lib the verify page already uses
 * successfully). html-to-image uses the SVG <foreignObject> trick which
 * lets the browser handle the actual rendering — no manual color
 * parsing, no lab/oklch parsing bug.
 *
 * The certificate element itself (see `certificate-card.tsx`) is built
 * using ONLY inline HEX color values (no Tailwind classes, no CSS
 * variables) — so even html2canvas would work on it. But the page
 * surrounding the cert (Dialog, page chrome) uses Tailwind 4 oklch
 * colors, which is what tripped up html2canvas. html-to-image handles
 * this correctly.
 *
 * APK INTEGRATION
 * ===============
 * When running inside the FIA Academy Android WebView (detected via
 * `isAndroidWebView()`), the PNG/PDF bytes are passed to the native
 * bridge (`FIANativeBridge.saveImageToGallery` /
 * `saveImageToGalleryChunked` / `savePdfToDownloadsChunked`).
 * If the bridge is unavailable (older APK), falls back to browser
 * blob download.
 * ============================================================================
 */

import { useRef, useState } from 'react'
import {
  Download,
  Calendar,
  Award,
  Shield,
  FileText,
  Copy,
  Loader2,
  CheckCircle2,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import * as htmlToImage from 'html-to-image'
import { isAndroidWebView } from '@/lib/certificate-download'
import { CertificateCard } from './certificate-card'

interface CertificateViewerProps {
  certificate: any
  onClose?: () => void
}

export function CertificateViewer({
  certificate,
  onClose,
}: CertificateViewerProps) {
  const certRef = useRef<HTMLDivElement>(null)
  const [downloading, setDownloading] = useState(false)
  const [pdfDownloading, setPdfDownloading] = useState(false)
  const [copying, setCopying] = useState(false)
  const [copied, setCopied] = useState(false)

  const issuedAt = certificate.issued_at
    ? new Date(certificate.issued_at)
    : null
  const isVerified = certificate.status === 'صالحة'

  /**
   * Wait for all <img> elements inside the cert to be fully loaded.
   * html-to-image needs images to be loaded before it can serialize
   * them into data URIs. If we don't wait, the resulting PNG will
   * have empty image placeholders.
   */
  const waitForImagesToLoad = (root: HTMLElement): Promise<void> => {
    const imgs = Array.from(root.querySelectorAll('img'))
    if (imgs.length === 0) return Promise.resolve()

    return Promise.all(
      imgs.map((img) => {
        // Already loaded + has a valid src
        if (img.complete && img.naturalWidth > 0) return Promise.resolve()
        // No src — skip
        if (!img.src) return Promise.resolve()
        return new Promise<void>((resolve) => {
          const done = () => resolve()
          img.addEventListener('load', done, { once: true })
          img.addEventListener('error', done, { once: true })
          // Hard timeout in case the image never loads — don't block
          // the download forever.
          setTimeout(done, 8000)
        })
      })
    ).then(() => undefined)
  }

  /**
   * v2.6: انتظر اكتمال تحميل خط Cairo (next/font) — كانت الخطوط غير جاهزة
   * أو غير مدمجة لحظة التصدير فيرتّم المحتوى بخط النظام الاحتياطي العريض
   * فتتداخل النصوص وتنكسر الشارة والتاريخ في الصورة المحفوظة بالمعرض.
   */
  const waitForFontsReady = async (): Promise<void> => {
    try {
      const fonts = (document as any).fonts
      if (!fonts) return
      await fonts.ready
      // حمّل الأوزان المستخدمة في الشهادة صراحةً إن لم تكن جاهزة بعد
      await Promise.all(
        ['400', '700', '800'].map((w) =>
          fonts.load(`${w} 16px 'Cairo'`).catch(() => undefined)
        )
      )
    } catch {
      // لا شيء — fonts API غير مدعوم، نكمل بلا انتظار
    }
  }

  /**
   * Convert the on-screen JSX cert element to a high-quality PNG via
   * html-to-image. Returns a base64 data URL.
   *
   * Quality settings (v2.6 — إصلاح تفكك التصميم في الصورة المصدّرة):
   *   - pixelRatio: 3 → صورة أضعف الجودة للطباعة والعرض (2400×2100 لشهادة 800px)
   *   - waitForFontsReady + fontEmbedCSS مُحسب مسبقاً → نفس خط Cairo المعروض
   *     يُدمج فعلياً في الصورة → نفس المقاسات بلا تداخل نصوص
   *   - width/height صريحة من getBoundingClientRect → لا اختلاف أبعاد مع العرض الحي
   *   - cacheBust: true → forces fresh fetch of images (no stale cache)
   *   - backgroundColor: '#FFFEFA' → fallback if cert's own bg is transparent
   */
  const renderCertToPng = async (): Promise<string> => {
    if (!certRef.current) {
      throw new Error('لا يمكن العثور على عنصر الشهادة')
    }
    await waitForImagesToLoad(certRef.current)
    await waitForFontsReady()

    const rect = certRef.current.getBoundingClientRect()

    // حُسب مسبقاً: CSS كامل لخطوط @font-face مدمجة data-URI — تفشل غالباً
    // داخل WebView لو تُركت لآلية الالتقاط الافتراضية
    let fontEmbedCSS = ''
    try {
      fontEmbedCSS = await htmlToImage.getFontEmbedCSS(certRef.current)
    } catch {
      fontEmbedCSS = ''
    }

    const options: any = {
      quality: 1.0,
      pixelRatio: 3,
      cacheBust: true,
      backgroundColor: '#FFFEFA',
      width: Math.ceil(rect.width),
      height: Math.ceil(rect.height),
      style: { margin: '0' },
      // Skip elements that explicitly opt out (e.g. buttons, page chrome)
      filter: (node: any) => {
        if (!node) return false
        if (node instanceof HTMLElement && node.dataset?.certSkip === 'true') {
          return false
        }
        return true
      },
    }
    if (fontEmbedCSS) options.fontEmbedCSS = fontEmbedCSS

    let dataUrl = await htmlToImage.toPng(certRef.current, options)

    // شبكة أمان: إن خرجت صورة مفرغة/شبه فارغة أعد المحاولة بلا خطوط مدمجة يدوياً
    if (!dataUrl || dataUrl.length < 1000) {
      const fallback: any = { ...options }
      delete fallback.fontEmbedCSS
      dataUrl = await htmlToImage.toPng(certRef.current, fallback)
    }
    if (!dataUrl || dataUrl.length < 1000) {
      throw new Error('فشل توليد صورة الشهادة — حاول مرة أخرى')
    }
    return dataUrl
  }

  /**
   * Chunk a base64 string into pieces for the APK bridge (Android's
   * @JavascriptInterface has a practical limit on single-string size).
   */
  const saveImageToGalleryChunked = async (
    base64Data: string,
    mimeType: string,
    filename: string
  ): Promise<boolean> => {
    const bridge = (window as any).FIANativeBridge
    if (!bridge) return false
    // Try chunked save first (handles large PNGs >1MB)
    if (typeof bridge.saveImageToGalleryChunked === 'function') {
      try {
        const chunks: string[] = []
        const CHUNK_SIZE = 500_000
        for (let i = 0; i < base64Data.length; i += CHUNK_SIZE) {
          chunks.push(base64Data.substring(i, i + CHUNK_SIZE))
        }
        const result = bridge.saveImageToGalleryChunked(
          JSON.stringify(chunks),
          mimeType,
          filename
        )
        return !!result
      } catch (e) {
        console.warn('[FIA] chunked save failed, trying single:', e)
      }
    }
    // Fallback to single-string method
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

  /**
   * PNG download button handler.
   * Path:
   *   1. Render cert to PNG data URL via html-to-image
   *   2. Strip "data:image/png;base64," prefix → raw base64
   *   3. If in FIA APK WebView → pass base64 to native bridge
   *   4. Else → blob + anchor download (regular browser)
   */
  const downloadAsImage = async () => {
    if (!certRef.current) {
      toast.error('لا يمكن العثور على عنصر الشهادة')
      return
    }
    if (downloading) return // prevent double-clicks
    setDownloading(true)
    const filename = `FIA-Certificate-${certificate.certificate_number}.png`
    const toastId = toast.loading('جارٍ تجهيز الصورة بأعلى جودة...')
    try {
      const dataUrl = await renderCertToPng()
      const base64Data = dataUrl.substring(dataUrl.indexOf(',') + 1)

      // APK WebView path
      if (isAndroidWebView()) {
        const saved = await saveImageToGalleryChunked(
          base64Data,
          'image/png',
          filename
        )
        if (saved) {
          const bridge = (window as any).FIANativeBridge
          try {
            bridge.showToast('تم حفظ الشهادة في المعرض ✓', 'long')
          } catch {}
          try {
            bridge.vibrate('[50]')
          } catch {}
          toast.success('تم تنزيل الشهادة إلى المعرض ✓', { id: toastId })
          return
        }
        toast.error('فشل الحفظ المباشر — جاري المحاولة عبر المتصفح', {
          id: toastId,
        })
        // fall through to blob download
      }

      // Regular browser path — or APK fallback
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
        try {
          URL.revokeObjectURL(blobUrl)
        } catch {}
        try {
          document.body.removeChild(a)
        } catch {}
      }, 2000)
      toast.success('تم تنزيل صورة الشهادة ✓', { id: toastId })
    } catch (e: any) {
      console.error('[FIA] cert PNG failed:', e)
      toast.error('فشل إنشاء صورة الشهادة: ' + (e?.message || ''), {
        id: toastId,
      })
    } finally {
      setDownloading(false)
    }
  }

  /**
   * PDF download handler (v2.6).
   *
   * Pipeline:
   *   1. Render cert to PNG via html-to-image (fonts embedded, 3x)
   *   2. Embed the PNG DIRECTLY into pdf-lib (embedPng) — لا ضغط JPEG
   *      (ضغط JPEG على نصوص يترك هالات ضبابية؛ PNG يحفظ النص حاداً تماماً)
   *   3. A4 landscape page matching the cert's aspect ratio exactly
   *   4. Save PDF bytes
   *   5. If in APK → pass base64 to FIANativeBridge.savePdfToDownloads(Chunked)
   *   6. Else → blob + anchor download
   */
  const downloadPdf = async () => {
    if (!certRef.current) {
      toast.error('لا يمكن العثور على عنصر الشهادة')
      return
    }
    if (pdfDownloading) return // prevent double-clicks
    setPdfDownloading(true)
    const filename = `FIA-Certificate-${certificate.certificate_number}.pdf`
    const toastId = toast.loading('جارٍ تجهيز ملف الشهادة...')
    try {
      const pngDataUrl = await renderCertToPng()
      const pngBytes = new Uint8Array(
        await (await fetch(pngDataUrl)).arrayBuffer()
      )

      // Build PDF with pdf-lib — embed PNG directly, size page to match aspect ratio
      const { PDFDocument } = await import('pdf-lib')
      const pdfDoc = await PDFDocument.create()
      const embeddedImage = await pdfDoc.embedPng(pngBytes)
      const imgWidth = embeddedImage.width
      const imgHeight = embeddedImage.height
      const imgRatio = imgWidth / imgHeight

      // A4 landscape: 297mm × 210mm. Match aspect ratio of cert.
      let pageWidth = 297
      let pageHeight = pageWidth / imgRatio
      const maxPageHeight = 210
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

      const pdfBytes = await pdfDoc.save()

      // Convert PDF bytes to base64 for the APK bridge
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

      // APK WebView path
      if (isAndroidWebView()) {
        const bridge = (window as any).FIANativeBridge
        if (bridge && pdfBase64) {
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
                  bridge.showToast(
                    'تم حفظ الشهادة PDF في مجلد التنزيلات ✓',
                    'long'
                  )
                } catch {}
                try {
                  bridge.vibrate('[50]')
                } catch {}
                toast.success('تم تنزيل الشهادة PDF ✓', { id: toastId })
                return
              }
            } catch (e) {
              console.warn('[FIA] chunked PDF save failed:', e)
            }
          }
          if (typeof bridge.savePdfToDownloads === 'function') {
            try {
              const saved = bridge.savePdfToDownloads(pdfBase64, filename)
              if (saved) {
                try {
                  bridge.showToast(
                    'تم حفظ الشهادة PDF في مجلد التنزيلات ✓',
                    'long'
                  )
                } catch {}
                toast.success('تم تنزيل الشهادة PDF ✓', { id: toastId })
                return
              }
            } catch (e) {
              console.warn('[FIA] single PDF save failed:', e)
            }
          }
        }
        toast.error('فشل الحفظ المباشر — جاري المحاولة عبر المتصفح', {
          id: toastId,
        })
        // fall through to blob download
      }

      // Regular browser path — blob download
      const blob = new Blob([pdfBytes as BlobPart], {
        type: 'application/pdf',
      })
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = filename
      a.rel = 'noopener noreferrer'
      a.style.display = 'none'
      document.body.appendChild(a)
      a.click()
      setTimeout(() => {
        try {
          URL.revokeObjectURL(blobUrl)
        } catch {}
        try {
          document.body.removeChild(a)
        } catch {}
      }, 2000)
      toast.success('تم تنزيل ملف الشهادة PDF ✓', { id: toastId })
    } catch (e: any) {
      console.error('[FIA] PDF generation failed:', e)
      toast.error('فشل إنشاء ملف PDF: ' + (e?.message || ''), {
        id: toastId,
      })
    } finally {
      setPdfDownloading(false)
    }
  }

  /**
   * Copy certificate number to clipboard.
   * Uses modern navigator.clipboard.writeText() with execCommand fallback
   * for older browsers / non-secure contexts.
   */
  const copyCertNumber = async () => {
    if (!certificate?.certificate_number) {
      toast.error('لا يوجد رقم شهادة لنسخه')
      return
    }
    if (copying) return // prevent double-clicks
    setCopying(true)
    try {
      // Try modern API first
      if (
        typeof navigator !== 'undefined' &&
        navigator.clipboard &&
        typeof navigator.clipboard.writeText === 'function' &&
        window.isSecureContext !== false
      ) {
        await navigator.clipboard.writeText(certificate.certificate_number)
        setCopied(true)
        toast.success('تم نسخ رقم الشهادة ✓')
        setTimeout(() => setCopied(false), 2000)
        return
      }
      // Fallback: hidden textarea + execCommand
      const ta = document.createElement('textarea')
      ta.value = certificate.certificate_number
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      ta.style.pointerEvents = 'none'
      document.body.appendChild(ta)
      ta.focus()
      ta.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(ta)
      if (ok) {
        setCopied(true)
        toast.success('تم نسخ رقم الشهادة ✓')
        setTimeout(() => setCopied(false), 2000)
      } else {
        toast.error('تعذّر نسخ رقم الشهادة — انسخه يدوياً')
      }
    } catch (e: any) {
      console.error('[FIA] clipboard error:', e)
      // Last-ditch fallback
      try {
        const ta = document.createElement('textarea')
        ta.value = certificate.certificate_number
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
        setCopied(true)
        toast.success('تم نسخ رقم الشهادة ✓')
        setTimeout(() => setCopied(false), 2000)
      } catch {
        toast.error('تعذّر نسخ رقم الشهادة')
      }
    } finally {
      setCopying(false)
    }
  }

  return (
    <div className="space-y-4" dir="rtl">
      {/* Status banner */}
      <div
        className={`text-center ${
          isVerified ? 'text-green-600' : 'text-red-600'
        }`}
      >
        <div
          className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold ${
            isVerified
              ? 'bg-green-500/15 border border-green-500/30'
              : 'bg-red-500/15 border border-red-500/30'
          }`}
        >
          {isVerified ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <X className="w-4 h-4" />
          )}
          {isVerified ? 'شهادة معتمدة' : 'شهادة ملغاة'}
        </div>
      </div>

      {/* === CERTIFICATE PREVIEW ===
          IMPORTANT: NO `overflow-x-auto` here. The previous version used
          `overflow-x-auto` which caused the cert (then 1000px wide) to
          become horizontally scrollable inside narrower containers
          (dashboard dialog ~942px). When html-to-image serialized the
          cert element, it captured only the visible scroll viewport,
          cutting off the right half of the certificate in the exported
          PNG/PDF. The cert is now responsive (width: 100%) so it fits
          any parent — no overflow, no clipping. */}
      <div
        className="relative bg-gradient-to-b from-amber-50/40 to-white py-6 rounded-2xl"
        data-cert-skip="true"
      >
        {/* The CertificateCard itself — certRef points here.
            The cert now uses width:100% + aspect-ratio:10/7, so it
            scales to fit this container perfectly. */}
        <CertificateCard certificate={certificate} ref={certRef} />
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {/* Download PNG */}
        <button
          onClick={downloadAsImage}
          disabled={downloading}
          className="inline-flex items-center gap-1.5 bg-gradient-to-r from-navy to-navy-light hover:from-navy-light hover:to-navy text-gold px-5 py-2.5 rounded-xl shadow-md active:scale-[0.97] font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {downloading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          {downloading ? 'جارٍ إنشاء الصورة...' : 'تنزيل (صورة)'}
        </button>

        {/* Copy number */}
        <button
          onClick={copyCertNumber}
          disabled={copying}
          className="inline-flex items-center gap-1.5 border border-gold/30 text-gold hover:bg-gold/10 px-5 py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-50"
        >
          {copied ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
          {copied ? 'تم النسخ' : 'نسخ الرقم'}
        </button>

        {/* Download PDF */}
        <button
          onClick={downloadPdf}
          disabled={pdfDownloading}
          className="inline-flex items-center gap-1.5 border border-navy/20 text-navy hover:bg-navy/5 px-5 py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {pdfDownloading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <FileText className="w-4 h-4" />
          )}
          {pdfDownloading ? 'جارٍ إنشاء PDF...' : 'تنزيل PDF'}
        </button>
      </div>

      {/* APK hint */}
      {isAndroidWebView() && (
        <p className="text-[10px] text-muted-foreground text-center mt-1">
          💡 تُحفظ الشهادة باسم ملفها الرسمي: الصورة في ألبوم «Fia academy» داخل المعرض،
          وملف PDF في مجلد «Fia academy» داخل التنزيلات. الجودة 3x بنفس التصميم المعروض تماماً.
        </p>
      )}
    </div>
  )
}
