'use client'

import { useRef, useState } from 'react'
import { Card } from '@/components/ui/card'
import {
  Download, Calendar, Award, Shield, FileText, Copy,
  Loader2, CheckCircle2, X, Sparkles, ExternalLink,
} from 'lucide-react'
import { toast } from 'sonner'
import { downloadCertificateFile, isAndroidWebView } from '@/lib/certificate-download'

export function CertificateViewer({ certificate, onClose }: { certificate: any; onClose?: () => void }) {
  const certRef = useRef<HTMLDivElement>(null)
  const [downloading, setDownloading] = useState(false)
  const [pdfDownloading, setPdfDownloading] = useState(false)
  // Image loading state — we show a spinner until the server PNG is
  // fully loaded into the <img> tag. This is critical because the
  // PNG generation on the server is expensive (canvas drawing of
  // fonts + ornaments + QR), and a slow-loading image looks broken.
  const [imgLoading, setImgLoading] = useState(true)

  const issuedAt = certificate.issued_at ? new Date(certificate.issued_at) : null
  const isVerified = certificate.status === 'صالحة'

  // The PNG URL is the SAME image the user will download — we render
  // it directly as an <img>. This ensures:
  // 1. What the user sees in the dashboard = exactly what they
  //    download (no more "different design" complaints).
  // 2. Long-press on the <img> works correctly in the WebView
  //    because it's a real <img> element in the dashboard's WebView
  //    (which has the system long-press → save context menu enabled
  //    by default), NOT a separate WebView window.
  // 3. The image has a transparent background only at the rounded
  //    corners — we wrap it in a card with a solid background to
  //    avoid any visual artifacts.
  const pngUrl = `/api/certificate-pdf?number=${encodeURIComponent(certificate.certificate_number)}&format=png&t=${Date.now()}`
  const inWebView = isAndroidWebView()

  const downloadAsImage = async () => {
    if (!certRef.current) return
    setDownloading(true)
    try {
      // Use the shared download helper — works in browsers AND in the
      // FIA APK (Android WebView). The helper tries blob+anchor first,
      // falls back to window.open with attachment disposition, and
      // finally falls back to inline view + manual save. It also calls
      // the APK's native showToast bridge for in-app confirmation.
      await downloadCertificateFile({
        certificateNumber: certificate.certificate_number,
        format: 'png',
        onStatus: (msg, kind) => {
          if (kind === 'success') toast.success(msg)
          else if (kind === 'error') toast.error(msg)
          else toast.info(msg)
        },
      })
    } catch (e) {
      toast.error('فشل تحميل الشهادة')
    } finally {
      setDownloading(false)
    }
  }

  const downloadPdf = async () => {
    setPdfDownloading(true)
    try {
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

  // Open the PNG in a new view — used as the last-resort fallback
  // when the user wants a direct view (instead of triggering a
  // download via the blob approach). Useful in WebView where
  // long-press → save is the only path.
  const openInNewView = () => {
    window.open(pngUrl, '_blank')
  }

  return (
    <div className="space-y-4">
      {/* Status */}
      <div className={`text-center ${isVerified ? 'text-green-600' : 'text-red-600'}`}>
        <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold ${isVerified ? 'bg-green-500/15 border border-green-500/30' : 'bg-red-500/15 border border-red-500/30'}`}>
          {isVerified ? <CheckCircle2 className="w-4 h-4" /> : <X className="w-4 h-4" />}
          {isVerified ? 'شهادة معتمدة' : 'شهادة ملغاة'}
        </div>
      </div>

      {/* Server-rendered certificate PNG — EXACTLY what will be
          downloaded. Wrapped in a navy background so the
          transparent rounded corners look intentional. */}
      <div className="overflow-x-auto bg-navy/5 rounded-lg p-3" ref={certRef}>
        <div className="relative mx-auto" style={{ maxWidth: 900 }}>
          {/* Loading spinner overlay — shown until the <img> fires
              its onLoad event. The PNG generation on the server
              involves canvas drawing of Arabic text + ornaments + QR,
              which can take 1-2 seconds on a cold Vercel function. */}
          {imgLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-navy/90 rounded-lg z-10" style={{ aspectRatio: '842 / 595' }}>
              <Loader2 className="w-10 h-10 text-gold animate-spin mb-3" />
              <span className="text-white/80 text-sm font-bold">جاري توليد الشهادة...</span>
              <span className="text-white/40 text-xs mt-1">قد يستغرق هذا ثوانٍ</span>
            </div>
          )}
          {/* The actual server-rendered PNG. We use object-contain
              to preserve the 842×595 aspect ratio at any width.
              The 'select-none' CSS hint prevents accidental text
              selection on the wrapper, and 'pointer-events-auto'
              on the <img> ensures long-press works in WebView. */}
          <img
            src={pngUrl}
            alt={`شهادة ${certificate.student_name} - ${certificate.course_title || ''}`}
            className="block w-full h-auto rounded-lg shadow-2xl select-none"
            style={{ aspectRatio: '842 / 595', objectFit: 'contain' }}
            draggable={true}
            onLoad={() => setImgLoading(false)}
            onError={() => {
              setImgLoading(false)
              toast.error('فشل تحميل صورة الشهادة — تحقق من اتصالك بالإنترنت')
            }}
          />
        </div>
      </div>

      {/* APK-specific hint — shown only when actually running in
          the FIA Android WebView. We give the user clear instructions
          on the long-press → save path since automatic download
          isn't possible without an APK upgrade. */}
      {inWebView && (
        <div className="bg-gold/10 border border-gold/30 rounded-lg p-3 text-center">
          <p className="text-xs font-bold text-navy mb-1">💡 كيفية حفظ الشهادة في المعرض:</p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            اضغط <span className="font-bold text-navy">مطولاً</span> على الصورة أعلاه، ثم اختر{' '}
            <span className="font-bold text-navy">"حفظ الصورة"</span> أو{' '}
            <span className="font-bold text-navy">"Download image"</span> من القائمة المنبثقة. ستظهر الشهادة في معرض الصور (Gallery) ضمن مجلد "Download" أو "Pictures".
          </p>
          <p className="text-[10px] text-muted-foreground mt-2">
            أو استخدم زر "تنزيل (صورة)" أدناه لمحاولة الحفظ التلقائي.
          </p>
        </div>
      )}

      {/* Quick info row */}
      <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <FileText className="w-3.5 h-3.5" />
          <span className="font-mono font-bold text-navy" dir="ltr">{certificate.certificate_number}</span>
        </span>
        {issuedAt && (
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {issuedAt.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Shield className="w-3.5 h-3.5" />
          {certificate.issued_by || 'أكاديمية المستقبل الدولية'}
        </span>
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
        <button onClick={downloadPdf} disabled={pdfDownloading} className="inline-flex items-center gap-1.5 border border-navy/20 text-navy hover:bg-navy/5 px-5 py-2.5 rounded-lg font-bold text-sm transition-all disabled:opacity-50">
          {pdfDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
          {pdfDownloading ? 'جاري...' : 'تنزيل PDF'}
        </button>
        {inWebView && (
          <button onClick={openInNewView} className="inline-flex items-center gap-1.5 border border-muted-foreground/30 text-muted-foreground hover:bg-muted/40 px-5 py-2.5 rounded-lg font-bold text-sm transition-all">
            <ExternalLink className="w-4 h-4" /> فتح في نافذة
          </button>
        )}
      </div>
    </div>
  )
}
