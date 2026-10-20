'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  FileUp, AlertCircle, Loader2, Sparkles, Lock,
  ChevronRight, ChevronLeft, ZoomIn, ZoomOut,
} from 'lucide-react'
import { toast } from 'sonner'
import * as pdfjsLib from 'pdfjs-dist'

// ⚡ Configure the worker once at module load time.
if (typeof window !== 'undefined') {
  ;(pdfjsLib as any).GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
}

// ============== Custom PDF.js Viewer (no Google, no iframe) ==============
// Renders PDF pages to <canvas> using pdfjs-dist. The student can:
// - Navigate pages (Prev/Next buttons + page counter + thumbnail dots)
// - Zoom in / out (custom scale buttons + auto-fit option)
// - See the page as a high-resolution image (cannot download the .pdf)
// - Right-click is disabled (no "Save As...")
//
// ⚡ RENDERING QUALITY:
// - Uses devicePixelRatio (capped at 2x) for crisp rendering on retina
// - Auto-fits the canvas to the container width (no horizontal scroll)
// - Re-renders on window resize to keep the auto-fit correct
//
// ⚡ NAVIGATION BETWEEN LESSONS:
// - The "Next lesson" button is shown at the bottom (after the toolbar)
// - It's only locked (disabled) if the CURRENT lesson isn't completed
// - The student can navigate to the previous lesson freely
export function CustomPdfViewer({ url, filename, onComplete, firedRef }: {
  url: string
  filename: string
  onComplete?: () => void
  firedRef: React.MutableRefObject<boolean>
}) {
  const [numPages, setNumPages] = useState(0)
  const [pageNum, setPageNum] = useState(1)
  const [scale, setScale] = useState(1.0)
  const [autoFit, setAutoFit] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rendering, setRendering] = useState(false)
  const [containerWidth, setContainerWidth] = useState(0)
  const [effectiveScale, setEffectiveScale] = useState(1.0)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const pdfDocRef = useRef<any>(null)
  const renderTaskRef = useRef<any>(null)
  const pageRef = useRef<any>(null)

  // ⚡ Auto-complete after 15s dwell (safety net).
  useEffect(() => {
    if (!onComplete) return
    const timer = setTimeout(() => {
      if (!firedRef.current) {
        firedRef.current = true
        onComplete()
      }
    }, 15000)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ⚡ Measure the container width — used for auto-fit calculation.
  // Re-measures on window resize so the PDF re-fits when the modal
  // resizes (e.g. orientation change on mobile).
  useEffect(() => {
    if (!containerRef.current) return
    const measure = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth)
      }
    }
    measure()
    // Also use ResizeObserver for accurate container-size tracking
    const ro = new ResizeObserver(measure)
    ro.observe(containerRef.current)
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [])

  // ⚡ Load the PDF document.
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    ;(async () => {
      try {
        let fetchUrl = url
        if (url.startsWith('https://api.telegram.org/')) {
          fetchUrl = `/api/pdf-proxy?url=${encodeURIComponent(url)}`
        }
        const loadingTask = (pdfjsLib as any).getDocument({
          url: fetchUrl,
          disableAutoFetch: false,
          disableStream: false,
        })
        const doc = await loadingTask.promise
        if (cancelled) return
        pdfDocRef.current = doc
        setNumPages(doc.numPages)
        setLoading(false)
      } catch (e: any) {
        console.warn('[CustomPdfViewer] Failed to load PDF:', e)
        if (cancelled) return
        const errMsg = String(e?.message || '')
        let userMsg = 'فشل في تحميل ملف PDF.'
        if (errMsg.includes('CORS') || errMsg.includes('fetch') || errMsg.includes('network')) {
          userMsg = 'فشل في تحميل ملف PDF بسبب مشكلة في الشبكة. تأكد من اتصالك بالإنترنت.'
        } else if (errMsg.includes('Invalid PDF') || errMsg.includes('password')) {
          userMsg = 'الملف ليس PDF صالح أو محمي بكلمة مرور.'
        } else if (errMsg.includes('proxy')) {
          userMsg = 'فشل في تحميل ملف PDF. قد يكون الرابط منتهي الصلاحية.'
        }
        setError(userMsg)
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
      try { pdfDocRef.current?.destroy?.() } catch {}
      pdfDocRef.current = null
    }
  }, [url])

  // ⚡ Compute effective scale based on auto-fit + manual zoom.
  // Whenever pageNum, containerWidth, scale, or autoFit changes,
  // we re-fetch the page (cached) and recompute the scale.
  useEffect(() => {
    if (!pdfDocRef.current || loading || error) return
    let cancelled = false
    ;(async () => {
      try {
        const doc = pdfDocRef.current
        const page = await doc.getPage(pageNum)
        if (cancelled) return
        pageRef.current = page
        if (autoFit && containerWidth > 0) {
          // ⚡ Auto-fit: scale so the PDF's natural width fits the
          // container width exactly (minus 32px padding).
          const viewportAtScale1 = page.getViewport({ scale: 1 })
          const padding = 32
          const availableWidth = Math.max(200, containerWidth - padding)
          const fitScale = availableWidth / viewportAtScale1.width
          // Apply the user's zoom multiplier on top of auto-fit baseline
          const eff = fitScale * scale
          setEffectiveScale(eff)
        } else {
          // Manual mode: use scale directly
          setEffectiveScale(scale)
        }
      } catch (e: any) {
        if (e?.name !== 'RenderingCancelledException') {
          console.warn('[CustomPdfViewer] Auto-fit failed:', e)
        }
      }
    })()
    return () => { cancelled = true }
  }, [autoFit, containerWidth, pageNum, loading, error, scale])

  // ⚡ Render the current page to the canvas with the effective scale.
  useEffect(() => {
    if (!pdfDocRef.current || !canvasRef.current || loading || error || !pageRef.current || !effectiveScale) return
    let cancelled = false
    setRendering(true)
    ;(async () => {
      try {
        const page = pageRef.current
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        // ⚡ Cap DPR at 2 for performance — anything higher is overkill
        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        const viewport = page.getViewport({ scale: effectiveScale })
        // ⚡ Set canvas internal size (in device pixels) for crisp rendering
        canvas.width = Math.floor(viewport.width * dpr)
        canvas.height = Math.floor(viewport.height * dpr)
        // ⚡ Set canvas display size (in CSS pixels)
        canvas.style.width = `${viewport.width}px`
        canvas.style.height = `${viewport.height}px`
        // ⚡ Reset transform and apply DPR scaling
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        // ⚡ Cancel any in-flight render task to avoid race conditions
        if (renderTaskRef.current) {
          try { renderTaskRef.current.cancel() } catch {}
        }
        const renderTask = page.render({ canvasContext: ctx, viewport })
        renderTaskRef.current = renderTask
        await renderTask.promise
        if (cancelled) return
        setRendering(false)
      } catch (e: any) {
        if (e?.name !== 'RenderingCancelledException') {
          console.warn('[CustomPdfViewer] Render failed:', e)
        }
        setRendering(false)
      }
    })()
    return () => {
      cancelled = true
      if (renderTaskRef.current) {
        try { renderTaskRef.current.cancel() } catch {}
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageNum, effectiveScale, loading, error])

  // ⚡ Auto-complete the lesson when the student reaches the LAST page.
  useEffect(() => {
    if (!onComplete || !numPages || pageNum < numPages) return
    if (firedRef.current) return
    const timer = setTimeout(() => {
      if (!firedRef.current) {
        firedRef.current = true
        onComplete()
      }
    }, 1000)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageNum, numPages])

  // ⚡ Keyboard navigation (Left/Right arrows + Home/End)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (loading || error) return
      if (e.key === 'ArrowLeft') {
        setPageNum((p) => Math.min(numPages, p + 1))
      } else if (e.key === 'ArrowRight') {
        setPageNum((p) => Math.max(1, p - 1))
      } else if (e.key === 'Home') {
        setPageNum(1)
      } else if (e.key === 'End') {
        setPageNum(numPages)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [numPages, loading, error])

  const gotoPrev = () => setPageNum((p) => Math.max(1, p - 1))
  const gotoNext = () => setPageNum((p) => Math.min(numPages, p + 1))

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="relative flex items-center gap-3 p-3 bg-gradient-to-br from-white to-gold/5 border border-gold/30 rounded-xl overflow-hidden">
          <div className="absolute top-0 right=0 left-0 h-1 bg-gradient-to-l from-gold via-amber-400 to-gold opacity-70" />
          <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-navy to-navy-light flex items-center justify-center shadow-md flex-shrink-0 border border-gold/20">
            <FileUp className="w-5 h-5 text-gold" />
          </div>
          <div className="relative min-w-0 flex-1">
            <div className="font-bold text-navy text-sm truncate">{filename}</div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              جاري تحميل الملف...
            </div>
          </div>
          <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30 text-[10px] flex-shrink-0">
            <Lock className="w-2.5 h-2.5 ml-0.5" /> محمي
          </Badge>
        </div>
        <div className="relative rounded-xl border-2 border-gold/30 shadow-md overflow-hidden bg-gradient-to-br from-navy via-navy-light to-navy" style={{ height: '500px' }}>
          <div className="absolute inset-0 opacity-25" style={{
            backgroundImage: 'radial-gradient(circle at 12% 50%, #D4AF37 1.5px, transparent 1.5px), radial-gradient(circle at 88% 20%, white 1px, transparent 1px)',
            backgroundSize: '24px 24px, 18px 18px'
          }} />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative text-center">
              <div className="absolute inset-0 bg-gold/30 rounded-full blur-3xl animate-pulse -z-10" />
              <Loader2 className="relative w-12 h-12 text-gold animate-spin mx-auto mb-3" />
              <p className="relative text-white/80 text-sm">جاري تحميل ملف PDF...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-3">
        <div className="relative flex items-center gap-3 p-3 bg-rose-500/5 border border-rose-500/30 rounded-xl overflow-hidden">
          <div className="absolute top-0 right=0 left-0 h-1 bg-gradient-to-l from-rose-500 via-red-400 to-rose-500 opacity-70" />
          <div className="relative w-10 h-10 rounded-xl bg-rose-500 flex items-center justify-center shadow-md flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-white" />
          </div>
          <div className="relative min-w-0 flex-1">
            <div className="font-bold text-navy text-sm truncate">{filename}</div>
            <div className="text-xs text-rose-700">{error}</div>
          </div>
        </div>
        {onComplete && !firedRef.current && (
          <Button
            onClick={() => { firedRef.current = true; onComplete(); toast.success('تم تخطّي الدرس') }}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl shadow-md"
          >
            تخطّي الدرس (الملف غير متاح)
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* ⚡ Magical file info card with Protected badge */}
      <div className="relative flex items-center gap-3 p-3 bg-gradient-to-br from-white to-gold/5 border border-gold/30 rounded-xl overflow-hidden">
        <div className="absolute top-0 right=0 left-0 h-1 bg-gradient-to-l from-gold via-amber-400 to-gold opacity-70" />
        <div className="absolute -top-6 -right-6 w-20 h-20 bg-gold/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-navy to-navy-light flex items-center justify-center shadow-md flex-shrink-0 border border-gold/20">
          <FileUp className="w-5 h-5 text-gold" />
        </div>
        <div className="relative min-w-0 flex-1">
          <div className="font-bold text-navy text-sm truncate">{filename}</div>
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-gold/60" />
            ملف PDF — معاينة محمية داخل التطبيق
          </div>
        </div>
        <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30 text-[10px] flex-shrink-0">
          <Lock className="w-2.5 h-2.5 ml-0.5" /> محمي
        </Badge>
      </div>

      {/* ⚡ Magical gold-bordered PDF frame with our own controls */}
      <div
        className="relative rounded-xl border-2 border-gold/30 shadow-md overflow-hidden bg-gradient-to-br from-navy/5 to-white"
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* Toolbar — page navigation + zoom (magical navy gradient) */}
        <div className="relative flex items-center justify-between gap-2 px-3 py-2.5 bg-gradient-to-l from-navy via-navy-light to-navy text-white border-b border-gold/20">
          {/* Decorative dot pattern */}
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: 'radial-gradient(circle at 12% 50%, #D4AF37 1px, transparent 1px)',
            backgroundSize: '24px 24px'
          }} />

          {/* Page navigation group */}
          <div className="relative flex items-center gap-1">
            <button
              onClick={gotoPrev}
              disabled={pageNum <= 1}
              className="w-9 h-9 rounded-lg bg-white/10 hover:bg-gold/20 active:bg-gold/30 flex items-center justify-center transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed border border-white/10"
              title="الصفحة السابقة (Arrow Right)"
            >
              <ChevronRight className="w-4 h-4 text-gold" />
            </button>
            <div className="px-3 py-1.5 text-xs font-bold text-gold bg-white/10 rounded-lg min-w-[70px] text-center border border-white/10">
              {pageNum} / {numPages || '?'}
            </div>
            <button
              onClick={gotoNext}
              disabled={pageNum >= numPages}
              className="w-9 h-9 rounded-lg bg-white/10 hover:bg-gold/20 active:bg-gold/30 flex items-center justify-center transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed border border-white/10"
              title="الصفحة التالية (Arrow Left)"
            >
              <ChevronLeft className="w-4 h-4 text-gold" />
            </button>
          </div>

          {/* Page dots indicator (visible if pages <= 12, desktop only) */}
          {numPages > 0 && numPages <= 12 && (
            <div className="relative hidden md:flex items-center gap-1">
              {Array.from({ length: numPages }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setPageNum(i + 1)}
                  className={`h-1.5 rounded-full transition-all ${
                    i + 1 === pageNum
                      ? 'bg-gold w-4'
                      : 'bg-white/30 hover:bg-white/60 w-1.5'
                  }`}
                  title={`الصفحة ${i + 1}`}
                />
              ))}
            </div>
          )}

          {/* Zoom controls group */}
          <div className="relative flex items-center gap-1">
            <button
              onClick={() => { setAutoFit(false); setScale((s) => Math.max(0.4, s - 0.2)) }}
              className="w-9 h-9 rounded-lg bg-white/10 hover:bg-gold/20 active:bg-gold/30 flex items-center justify-center transition-all active:scale-95 border border-white/10"
              title="تصغير"
            >
              <ZoomOut className="w-4 h-4 text-gold" />
            </button>
            <button
              onClick={() => { setAutoFit(true); setScale(1.0) }}
              className="px-2.5 py-1.5 text-xs font-medium text-gold bg-white/10 rounded-lg min-w-[60px] text-center border border-white/10 hover:bg-gold/20 transition-all active:scale-95"
              title={autoFit ? 'ملاءمة تلقائية (اضغط للتكبير اليدوي)' : 'العودة للملاءمة التلقائية'}
            >
              {autoFit ? 'ملاءمة' : `${Math.round(scale * 100)}%`}
            </button>
            <button
              onClick={() => { setAutoFit(false); setScale((s) => Math.min(3, s + 0.2)) }}
              className="w-9 h-9 rounded-lg bg-white/10 hover:bg-gold/20 active:bg-gold/30 flex items-center justify-center transition-all active:scale-95 border border-white/10"
              title="تكبير"
            >
              <ZoomIn className="w-4 h-4 text-gold" />
            </button>
          </div>
        </div>

        {/* Canvas render area — scrollable, right-click disabled */}
        <div
          ref={containerRef}
          className="relative overflow-auto flex items-center justify-center p-4"
          style={{
            height: '500px',
            background: 'linear-gradient(135deg, rgba(10,30,55,0.04) 0%, rgba(212,175,55,0.04) 100%)'
          }}
          onContextMenu={(e) => e.preventDefault()}
        >
          <canvas
            ref={canvasRef}
            onContextMenu={(e) => e.preventDefault()}
            onDragStart={(e) => e.preventDefault()}
            className="shadow-2xl rounded-md bg-white"
            style={{ maxWidth: '100%', height: 'auto', display: 'block' }}
          />
          {/* Rendering overlay spinner (appears briefly when re-rendering) */}
          {rendering && !loading && (
            <div className="absolute top-3 left-3 z-10 px-3 py-1.5 rounded-lg bg-navy/80 backdrop-blur-sm text-gold text-xs flex items-center gap-2 border border-gold/30 shadow-md">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>جاري العرض...</span>
            </div>
          )}
        </div>

        {/* Bottom progress bar — visual page indicator */}
        {numPages > 0 && (
          <div className="px-3 py-2 bg-gradient-to-l from-navy/10 to-white border-t border-gold/20">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-navy/70">صفحة {pageNum} من {numPages}</span>
              <div className="flex-1 h-1.5 bg-navy/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-l from-gold via-amber-400 to-gold transition-all duration-300 rounded-full"
                  style={{ width: `${(pageNum / Math.max(1, numPages)) * 100}%` }}
                />
              </div>
              <span className="text-[10px] font-bold text-navy/70">{Math.round((pageNum / Math.max(1, numPages)) * 100)}%</span>
            </div>
          </div>
        )}
      </div>

      {/* ⚡ Bottom hint + keyboard shortcuts */}
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Sparkles className="w-3 h-3 text-gold/60" />
        استخدم أزرار التنقل أو الأسهم ← → في الكيبورد للتنقل بين الصفحات
      </div>
    </div>
  )
}
