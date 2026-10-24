'use client'

/**
 * ============================================================================
 * FIA ACADEMY — CERTIFICATE VIEWER WITH DOWNLOAD BUTTONS
 * ============================================================================
 *
 * Displays a certificate and provides three actions:
 *   1. تنزيل الصورة (PNG) — v2.7: من خادم الموقع (@napi-rs/canvas + خط Cairo مدمج)
 *      مع html-to-image كمسار احتياطي فقط
 *   2. نسخ الرقم — uses navigator.clipboard.writeText() with execCommand fallback
 *   3. تنزيل PDF — v2.7: من خادم الموقع (pdfkit + Cairo) مع التوليد المحلي كاحتياط
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

import { useEffect, useRef, useState } from 'react'
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
  Share2,
  Crown,
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
  // 👑 v10.3 — ستارة منح الشهادة: تنكشف كحلية وتكشف الشهادة الذهبية عند كل فتح
  const [revealed, setRevealed] = useState(false)
  useEffect(() => {
    setRevealed(false)
    const t = setTimeout(() => setRevealed(true), 750)
    return () => clearTimeout(t)
  }, [])

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
   * v2.7 — جلب الشهادة من خادم الموقع (المسار الأساسي للحفظ).
   *
   * لماذا؟ محرك html-to-image يعتمد على SVG <foreignObject> داخل WebView
   * أندرويد، وعلى أغلب الأجهزة يفشل في دمج الخطوط أو يرسم العربية
   * متداخلة/مزاحة حتى لو ظهرت سليمة على الشاشة — وهذا هو سبب «الشهادة
   * غير المرتبة» في المعرض. خادم الموقع يرسم نفس الشهادة الفاخرة عبر
   * @napi-rs/canvas بخط Cairo الحقيقي المسجّل من ملفات TTF → نتيجة
   * حرفية متطابقة كل مرة وبجودة أصلية ثابتة على كل الأجهزة.
   *
   * يعيد base64 خام أو null لو فشل (عندها نرجع للمسار المحلي الاحتياطي).
   */
  const fetchServerCertBase64 = async (
    format: 'png' | 'pdf'
  ): Promise<string | null> => {
    try {
      const number = certificate?.certificate_number
      if (!number || typeof window === 'undefined') return null
      const url = `${window.location.origin}/api/certificate-pdf?number=${encodeURIComponent(number)}&format=${format}`
      const res = await fetch(url, { credentials: 'omit' })
      if (!res.ok) return null
      const blob = await res.blob()
      if (format === 'png' && !blob.type.startsWith('image/')) return null
      if (
        format === 'pdf' &&
        !(
          blob.type === 'application/pdf' ||
          blob.type === 'application/octet-stream' ||
          blob.type === ''
        )
      )
        return null
      if (blob.size < 5000) return null
      const reader = new FileReader()
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string
          const idx = result.indexOf(',')
          resolve(idx >= 0 ? result.substring(idx + 1) : result)
        }
        reader.onerror = () => reject(new Error('FileReader failed'))
        reader.readAsDataURL(blob)
      })
      return base64
    } catch {
      return null
    }
  }

  /**
   * تنزيل base64 كملف في المتصفحات العادية (blob + anchor بالاسم الرسمي).
   */
  const downloadBase64AsFile = async (
    base64: string,
    mime: string,
    filename: string
  ) => {
    const blob = await (await fetch(`data:${mime};base64,${base64}`)).blob()
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
   * PNG download button handler (v2.7).
   *
   * PATH 1 (الأساسي — يلغي مشكلة «الشهادة غير مرتبة» نهائياً):
   *   يجلب الشهادة مرسومة من خادم الموقع (/api/certificate-pdf) بخط
   *   Cairo الحقيقي — نصوص عربية سليمة 100% بلا تداخل ولا انكسار.
   *   - داخل التطبيق: base64 → FIANativeBridge (Chunked) → ألبوم المعرض فوراً
   *   - في المتصفح: تنزيل blob مباشر بالاسم الرسمي
   *
   * PATH 2 (احتياطي فقط لو فشل الخادم): html-to-image من العنصر المعروض.
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
      // === PATH 1 — ملف الشهادة الرسمي من الخادم ===
      const serverBase64 = await fetchServerCertBase64('png')
      if (serverBase64) {
        if (isAndroidWebView()) {
          const saved = await saveImageToGalleryChunked(
            serverBase64,
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
          toast.error('فشل الحفظ المباشر — جاري التنزيل عبر نظام التطبيق', {
            id: toastId,
          })
          // DownloadListener في التطبيق يلتقط روابط attachment → مجلد Fia academy
          try {
            const attachmentUrl = `${window.location.origin}/api/certificate-pdf?number=${encodeURIComponent(certificate.certificate_number)}&format=png&download=1`
            window.open(attachmentUrl, '_blank')
          } catch {}
          return
        }
        await downloadBase64AsFile(serverBase64, 'image/png', filename)
        toast.success('تم تنزيل صورة الشهادة ✓', { id: toastId })
        return
      }

      // === PATH 2 — احتياطي: التقاط العنصر المعروض محلياً ===
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
      await downloadBase64AsFile(base64Data, 'image/png', filename)
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
   * PDF download handler (v2.7).
   *
   * Pipeline:
   *   PATH 1 (الأساسي): ملف PDF الرسمي من خادم الموقع — pdfkit يرسم
   *   الشهادة متجهياً بخطوط Cairo الحقيقية → نص حاد 100% بلا أي معالجة صور.
   *   PATH 2 (احتياطي لو فشل الخادم): التقاط العنصر محلياً (html-to-image
   *   3x + embedPng بلا JPEG) كما في v2.6.
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
      // === PATH 1 — PDF الرسمي من الخادم (نص متجهي بخط Cairo) ===
      const serverBase64 = await fetchServerCertBase64('pdf')
      if (serverBase64) {
        if (isAndroidWebView()) {
          const bridge = (window as any).FIANativeBridge
          if (bridge) {
            if (typeof bridge.savePdfToDownloadsChunked === 'function') {
              try {
                const chunks: string[] = []
                const CHUNK_SIZE = 500_000
                for (let i = 0; i < serverBase64.length; i += CHUNK_SIZE) {
                  chunks.push(serverBase64.substring(i, i + CHUNK_SIZE))
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
                const saved = bridge.savePdfToDownloads(serverBase64, filename)
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
          toast.error('فشل الحفظ المباشر — جاري التنزيل عبر نظام التطبيق', {
            id: toastId,
          })
          try {
            const attachmentUrl = `${window.location.origin}/api/certificate-pdf?number=${encodeURIComponent(certificate.certificate_number)}&format=pdf&download=1`
            window.open(attachmentUrl, '_blank')
          } catch {}
          return
        }
        await downloadBase64AsFile(serverBase64, 'application/pdf', filename)
        toast.success('تم تنزيل ملف الشهادة PDF ✓', { id: toastId })
        return
      }

      // === PATH 2 — احتياطي: توليد PDF محلياً من العنصر المعروض ===
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
      {/* 👑 v10.3 — ستارة المنح الملكية: ستارتان كحليتان تنكشفان عن الشهادة */}
      <div className="relative" dir="rtl">
        {/* الستارتان — فوق الشهادة فقط قبل الانكشاف */}
        {!revealed && (
          <div className="absolute inset-0 z-30 overflow-hidden rounded-2xl pointer-events-none" aria-hidden="true">
            <div className="fia-cert-curtain fia-cert-curtain-r absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-navy via-navy-light to-navy border-l-2 border-gold/50">
              <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, #D4AF37 1.4px, transparent 1.4px)', backgroundSize: '20px 20px' }} />
            </div>
            <div className="fia-cert-curtain fia-cert-curtain-l absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-navy via-navy-light to-navy border-r-2 border-gold/50">
              <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 70% 50%, #D4AF37 1.4px, transparent 1.4px)', backgroundSize: '20px 20px' }} />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="fia-cert-seal w-16 h-16 rounded-full bg-gradient-to-br from-gold to-amber-500 flex items-center justify-center shadow-[0_0_35px_rgba(212,175,55,0.6)] border-4 border-white/40">
                <Crown className="w-7 h-7 text-navy" strokeWidth={2.2} />
              </div>
            </div>
          </div>
        )}
        <div className={`fia-cert-reveal relative bg-gradient-to-b from-amber-50/40 to-white py-6 rounded-2xl transition-all duration-700 ${revealed ? 'opacity-100 scale-100' : 'opacity-0 scale-[0.96]'}`} data-cert-skip="true">
          {/* The CertificateCard itself — certRef points here.
              The cert now uses width:100% + aspect-ratio:10/7, so it
              scales to fit this container perfectly. */}
          <CertificateCard certificate={certificate} ref={certRef} />
        </div>
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

        {/* 👑 v10.3 — زر المشاركة الملكية: مشاركة أصلية أو نسخ نص فاخر */}
        <button
          onClick={async () => {
            const verifyUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/verify/${certificate.certificate_number}`
            const text = `🎓 شهادة معتمدة من أكاديمية المستقبل الدولية (FIA)\n📜 ${certificate.course_title || 'دورة تدريبية'}\n🆔 رقم الشهادة: ${certificate.certificate_number}\n✅ تحقق من صحتها رسمياً:\n${verifyUrl}`
            try {
              if (typeof navigator !== 'undefined' && (navigator as any).share) {
                await (navigator as any).share({ title: 'شهادتي من أكاديمية المستقبل الدولية', text })
                return
              }
              await navigator.clipboard.writeText(text)
              toast.success('تم نسخ نص المشاركة — ألصقه في واتساب أو تيليجرام 👑')
            } catch {
              try {
                await navigator.clipboard.writeText(text)
                toast.success('تم نسخ نص المشاركة 👑')
              } catch { toast.error('تعذّرت المشاركة — انسخ رقم الشهادة يدوياً') }
            }
          }}
          className="inline-flex items-center gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-5 py-2.5 rounded-xl shadow-md active:scale-[0.97] font-bold text-sm transition-all"
        >
          <Share2 className="w-4 h-4" />
          مشاركة الشهادة
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
          💡 تُحفظ الشهادة بجودة الخادم الأصلية (خط Cairo مدمج): الصورة في ألبوم «Fia academy»
          داخل المعرض، وملف PDF في مجلد «Fia academy» داخل التنزيلات — بنفس التصميم الفاخر تماماً.
        </p>
      )}

      {/* 👑 v10.3 — أنماط ختم المنح الملكي */}
      <style jsx global>{`
        .fia-cert-seal { animation: certSeal 1.1s cubic-bezier(.2,1.2,.4,1) both; }
        @keyframes certSeal {
          0% { transform: scale(0); opacity: 0; }
          55% { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); opacity: 0; }
        }
      `}</style>
    </div>
  )
}
