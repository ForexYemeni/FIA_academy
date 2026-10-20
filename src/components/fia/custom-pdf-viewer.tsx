'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  FileUp, AlertCircle, Loader2, Sparkles, Lock,
  ChevronUp, ChevronDown,
} from 'lucide-react'
import { toast } from 'sonner'
import * as pdfjsLib from 'pdfjs-dist'

// ⚡ Configure the worker once at module load time.
if (typeof window !== 'undefined') {
  ;(pdfjsLib as any).GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
}

// ============== Custom PDF.js Viewer — Continuous Scroll ==============
// Renders ALL PDF pages in a single scrollable container, stacked
// vertically. This is what users expect from a real PDF viewer (Chrome,
// Adobe Reader, etc.) — NOT one-page-at-a-time arrow navigation.
//
// The student:
// - Sees ALL pages stacked vertically (like a real PDF)
// - Scrolls / swipes / drags naturally up & down to read
// - Pages render on-demand as they scroll into view (lazy rendering)
// - Each page is rendered to its own <canvas> for crisp, sharp text
// - Right-click is disabled (no "Save As...")
//
// ⚡ RENDERING STRATEGY (lazy on-demand):
// - We render the page the user is currently viewing (visible)
// - We also pre-render the page before + after it (smooth scrolling)
// - We DON'T render all pages at once (would freeze the browser on
//   large PDFs — each page render takes ~200ms)
// - We observe which page is in view via IntersectionObserver
// - We update the page indicator (X / Y) as the user scrolls
// - We auto-complete the lesson when the user reaches the LAST page
//
// ⚡ PROTECTION:
// - All pages are <canvas> elements (image data, not raw PDF)
// - No iframe, no Google, no external URLs in the DOM
// - Right-click disabled on every canvas
// - Drag disabled on every canvas (onDragStart preventDefault)
export function CustomPdfViewer({ url, filename, onComplete, firedRef }: {
  url: string
  filename: string
  onComplete?: () => void
  firedRef: React.MutableRefObject<boolean>
}) {
  const [numPages, setNumPages] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [containerWidth, setContainerWidth] = useState(0)
  const [pageHeights, setPageHeights] = useState<number[]>([])
  const [renderedPages, setRenderedPages] = useState<Set<number>>(new Set())
  const [showTopBtn, setShowTopBtn] = useState(false)
  const [showBottomBtn, setShowBottomBtn] = useState(false)

  const containerRef = useRef<HTMLDivElement | null>(null)
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([])
  const pageRefs = useRef<(HTMLDivElement | null)[]>([])
  const pdfDocRef = useRef<any>(null)
  const renderTasksRef = useRef<Map<number, any>>(new Map())
  const pagesRef = useRef<any[]>([])
  const ioRef = useRef<IntersectionObserver | null>(null)
  const lastCompletedPage = useRef(0)

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

  // ⚡ Load the PDF document.
  //
  // ⚡ WHY WE FETCH AS ARRAYBUFFER (not URL):
  // When PDF.js gets a URL, it sends multiple HTTP Range requests to
  // download chunks of the file. Our /api/pdf-proxy doesn't support
  // Range requests properly (it returns the FULL file for every
  // request). This causes PDF.js to:
  //   1. Get the full file multiple times (wasted bandwidth)
  //   2. Fail to parse the file correctly (it expects chunks, gets
  //      full data each time)
  //   3. Show WRONG page count (e.g. shows 6 pages when the PDF has 2)
  //   4. Render BLANK pages (the parsed pages are corrupted)
  //
  // SOLUTION: Fetch the PDF as a complete ArrayBuffer in one HTTP
  // request, then pass the raw bytes to PDF.js via the `data` option.
  // PDF.js will parse the entire document from memory — no Range
  // requests, no streaming, no corruption. This is the most reliable
  // way to use PDF.js when you can't guarantee Range request support.
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    ;(async () => {
      try {
        // ⚡ Determine the URL to fetch. Use the proxy for Telegram URLs
        // to avoid CORS issues.
        let fetchUrl = url
        if (url.startsWith('https://api.telegram.org/')) {
          fetchUrl = `/api/pdf-proxy?url=${encodeURIComponent(url)}`
        }
        // ⚡ Fetch the PDF as a single ArrayBuffer. This avoids all the
        // Range request issues. We use a generous timeout (60s) so
        // large PDFs on slow connections don't fail.
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 60000)
        const response = await fetch(fetchUrl, {
          signal: controller.signal,
          headers: { 'Accept': 'application/pdf,*/*' },
        })
        clearTimeout(timeout)
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }
        const arrayBuffer = await response.arrayBuffer()
        if (cancelled) return
        // ⚡ Pass the raw bytes to PDF.js via the `data` option. This
        // bypasses the URL loader entirely and uses the in-memory data.
        const loadingTask = (pdfjsLib as any).getDocument({
          data: new Uint8Array(arrayBuffer),
          // ⚡ These options are irrelevant for `data` mode but kept for safety
          disableAutoFetch: true,
          disableStream: true,
        })
        const doc = await loadingTask.promise
        if (cancelled) return
        pdfDocRef.current = doc
        setNumPages(doc.numPages)
        // Pre-fetch ALL page metadata (width/height at scale 1) so we
        // can lay out the pages with the correct heights before any
        // rendering happens. This gives a smooth scroll without jumps
        // as pages render in.
        const pages: any[] = []
        const heights: number[] = []
        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i)
          if (cancelled) return
          pages.push(page)
          pagesRef.current = pages
          const viewport = page.getViewport({ scale: 1 })
          heights.push(viewport.height / viewport.width) // aspect ratio (h/w)
        }
        setPageHeights(heights)
        setLoading(false)
      } catch (e: any) {
        console.warn('[CustomPdfViewer] Failed to load PDF:', e)
        if (cancelled) return
        const errMsg = String(e?.message || '')
        let userMsg = 'فشل في تحميل ملف PDF.'
        if (e?.name === 'AbortError') {
          userMsg = 'انتهت مهلة تحميل الملف (أكثر من 60 ثانية). حاول مرة أخرى.'
        } else if (errMsg.includes('CORS') || errMsg.includes('fetch') || errMsg.includes('network') || errMsg.includes('Failed to fetch')) {
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

  // ⚡ Measure the container width — used to compute the rendering
  // scale for each page (auto-fit to container width).
  useEffect(() => {
    if (!containerRef.current) return
    const measure = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth)
      }
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(containerRef.current)
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [])

  // ⚡ Render a single page to its canvas.
  const renderPage = useCallback(async (pageNum: number) => {
    if (!pdfDocRef.current || !containerWidth) return
    const page = pagesRef.current[pageNum - 1]
    if (!page) return
    const canvas = canvasRefs.current[pageNum - 1]
    if (!canvas) return
    // Skip if already rendered (avoid re-rendering the same page)
    if (renderedPages.has(pageNum)) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Cancel any in-flight render for this page
    const existingTask = renderTasksRef.current.get(pageNum)
    if (existingTask) {
      try { existingTask.cancel() } catch {}
    }

    // ⚡ Compute scale: fit width to container (minus 32px padding).
    const padding = 32
    const availableWidth = Math.max(200, containerWidth - padding)
    const viewportAtScale1 = page.getViewport({ scale: 1 })
    const fitScale = availableWidth / viewportAtScale1.width
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const viewport = page.getViewport({ scale: fitScale })

    // Set canvas internal size (device pixels for crisp rendering)
    canvas.width = Math.floor(viewport.width * dpr)
    canvas.height = Math.floor(viewport.height * dpr)
    // Set canvas display size (CSS pixels)
    canvas.style.width = `${viewport.width}px`
    canvas.style.height = `${viewport.height}px`
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    try {
      const renderTask = page.render({ canvasContext: ctx, viewport })
      renderTasksRef.current.set(pageNum, renderTask)
      await renderTask.promise
      renderTasksRef.current.delete(pageNum)
      setRenderedPages((prev) => new Set(prev).add(pageNum))
    } catch (e: any) {
      if (e?.name !== 'RenderingCancelledException') {
        console.warn('[CustomPdfViewer] Render failed for page', pageNum, e)
      }
    }
  }, [containerWidth, renderedPages])

  // ⚡ Render ALL pages when PDF is loaded (not lazy on-demand).
  // For typical PDFs (10-50 pages) this is fast (~200ms per page in
  // parallel). The previous IntersectionObserver-based lazy rendering
  // was buggy — it didn't trigger initial renders reliably, leaving
  // pages blank with just the loading spinner.
  //
  // We now render ALL pages in parallel when the PDF is ready and
  // the container width is known. We render in batches of 4 to avoid
  // overwhelming the browser (each render is CPU-heavy).
  useEffect(() => {
    if (!containerWidth || loading || error || !numPages) return
    if (renderedPages.size >= numPages) return // already rendered all
    let cancelled = false
    const renderAll = async () => {
      const BATCH_SIZE = 4
      for (let batch = 0; batch * BATCH_SIZE < numPages; batch++) {
        if (cancelled) return
        const start = batch * BATCH_SIZE + 1
        const end = Math.min(numPages, start + BATCH_SIZE - 1)
        // Render this batch in parallel
        const promises: Promise<void>[] = []
        for (let p = start; p <= end; p++) {
          if (!renderedPages.has(p)) {
            promises.push(renderPage(p))
          }
        }
        await Promise.allSettled(promises)
      }
    }
    renderAll()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerWidth, loading, error, numPages])

  // ⚡ IntersectionObserver: ONLY updates the page indicator as the
  // student scrolls (no re-rendering — all pages render eagerly above).
  useEffect(() => {
    if (!numPages || loading || error || !containerRef.current) return

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
            const pageNum = Number((entry.target as HTMLElement).dataset.pageNum)
            if (pageNum > 0) {
              setCurrentPage((prev) => {
                if (pageNum !== prev) {
                  // ⚡ Auto-complete when reaching the LAST page
                  if (pageNum === numPages && !firedRef.current && onComplete) {
                    setTimeout(() => {
                      if (!firedRef.current) {
                        firedRef.current = true
                        onComplete()
                      }
                    }, 1500)
                  }
                  return pageNum
                }
                return prev
              })
            }
          }
        }
      },
      {
        root: containerRef.current,
        // ⚡ Trigger when ≥50% of the page is visible
        threshold: [0.5, 0.75, 1.0],
      }
    )
    ioRef.current = io

    // Observe all page placeholder divs
    pageRefs.current.forEach((el) => {
      if (el) io.observe(el)
    })

    return () => {
      io.disconnect()
      ioRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numPages, loading, error, containerWidth])

  // ⚡ Track scroll position to show/hide "scroll to top" button
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return
    const scrollTop = containerRef.current.scrollTop
    const scrollHeight = containerRef.current.scrollHeight
    const clientHeight = containerRef.current.clientHeight
    setShowTopBtn(scrollTop > 200)
    setShowBottomBtn(scrollTop + clientHeight < scrollHeight - 200)
  }, [])

  const scrollToTop = () => {
    containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const scrollToBottom = () => {
    if (!containerRef.current) return
    containerRef.current.scrollTo({
      top: containerRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }
  const jumpToPage = (pageNum: number) => {
    const el = pageRefs.current[pageNum - 1]
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

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
        <div className="relative rounded-xl border-2 border-gold/30 shadow-md overflow-hidden bg-gradient-to-br from-navy via-navy-light to-navy" style={{ height: '450px' }}>
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

      {/* ⚡ Magical gold-bordered PDF frame with continuous scroll */}
      <div
        className="relative rounded-xl border-2 border-gold/30 shadow-md overflow-hidden bg-gradient-to-br from-navy/5 to-white"
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* Top sticky toolbar — page indicator (magical navy gradient) */}
        <div className="sticky top-0 z-20 flex items-center justify-between gap-2 px-3 py-2 bg-gradient-to-l from-navy via-navy-light to-navy text-white border-b border-gold/20">
          {/* Decorative dot pattern */}
          <div className="absolute inset-0 opacity-20 pointer-events-none" style={{
            backgroundImage: 'radial-gradient(circle at 12% 50%, #D4AF37 1px, transparent 1px)',
            backgroundSize: '24px 24px'
          }} />
          {/* Filename (truncated) */}
          <div className="relative text-xs font-bold text-gold truncate max-w-[140px]">
            {filename}
          </div>
          {/* Page indicator */}
          <div className="relative px-3 py-1 text-xs font-bold text-gold bg-white/10 rounded-lg min-w-[70px] text-center border border-white/10">
            {currentPage} / {numPages}
          </div>
          {/* Page jump buttons (compact, ≤12 pages only) */}
          {numPages > 0 && numPages <= 12 && (
            <div className="relative hidden md:flex items-center gap-1">
              {Array.from({ length: numPages }, (_, i) => (
                <button
                  key={i}
                  onClick={() => jumpToPage(i + 1)}
                  className={`h-1.5 rounded-full transition-all ${
                    i + 1 === currentPage
                      ? 'bg-gold w-4'
                      : 'bg-white/30 hover:bg-white/60 w-1.5'
                  }`}
                  title={`الصفحة ${i + 1}`}
                />
              ))}
            </div>
          )}
          <Badge className="relative bg-emerald-500/15 text-emerald-300 border-emerald-400/30 text-[10px] flex-shrink-0">
            <Lock className="w-2.5 h-2.5 ml-0.5" /> محمي
          </Badge>
        </div>

        {/* ⚡ Continuous scroll area — ALL pages stacked vertically */}
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="relative overflow-y-auto overflow-x-hidden"
          style={{
            height: '450px',
            scrollBehavior: 'smooth',
            WebkitOverflowScrolling: 'touch', // iOS smooth scrolling
            background: 'linear-gradient(180deg, rgba(10,30,55,0.06) 0%, rgba(212,175,55,0.04) 100%)'
          }}
          onContextMenu={(e) => e.preventDefault()}
        >
          <div className="py-4 px-4 space-y-3">
            {Array.from({ length: numPages }, (_, i) => {
              const pageNum = i + 1
              const aspectRatio = pageHeights[i] || 1.414 // A4 fallback
              // Placeholder height: containerWidth - 32 padding, multiplied by aspect ratio
              const placeholderWidth = Math.max(200, containerWidth - 32)
              const placeholderHeight = containerWidth > 0 ? placeholderWidth * aspectRatio : 600
              return (
                <div
                  key={pageNum}
                  data-page-num={pageNum}
                  ref={(el) => { pageRefs.current[i] = el }}
                  className="relative bg-white shadow-2xl rounded-md overflow-hidden mx-auto"
                  style={{
                    width: containerWidth > 0 ? `${containerWidth - 32}px` : '100%',
                    // ⚡ Reserve space for the canvas BEFORE it renders,
                    // so the scroll height is correct from the start
                    // (no jumps when pages render in)
                    minHeight: `${placeholderHeight}px`,
                  }}
                  onContextMenu={(e) => e.preventDefault()}
                >
                  <canvas
                    ref={(el) => { canvasRefs.current[i] = el }}
                    onContextMenu={(e) => e.preventDefault()}
                    onDragStart={(e) => e.preventDefault()}
                    className="block w-full h-auto"
                    style={{ display: 'block' }}
                  />
                  {/* Page number watermark (top-left corner) */}
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-navy/70 backdrop-blur-sm text-gold text-[10px] font-bold border border-gold/30 pointer-events-none">
                    {pageNum} / {numPages}
                  </div>
                  {/* Loading placeholder (shown until page renders) */}
                  {!renderedPages.has(pageNum) && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="text-center">
                        <Loader2 className="w-6 h-6 text-navy/40 animate-spin mx-auto mb-2" />
                        <p className="text-xs text-navy/40 font-medium">صفحة {pageNum}</p>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* ⚡ Floating scroll-to-top button (appears after scrolling down) */}
          {showTopBtn && (
            <button
              onClick={scrollToTop}
              className="sticky bottom-4 left-4 z-10 w-10 h-10 rounded-full bg-gradient-to-br from-navy to-navy-light text-gold shadow-lg border border-gold/30 flex items-center justify-center active:scale-95 transition-all hover:shadow-xl"
              title="التمرير للأعلى"
              style={{ position: 'absolute', bottom: '16px', left: '16px' }}
            >
              <ChevronUp className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Bottom progress bar — visual page indicator */}
        {numPages > 0 && (
          <div className="px-3 py-2 bg-gradient-to-l from-navy/10 to-white border-t border-gold/20">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-navy/70">صفحة {currentPage} من {numPages}</span>
              <div className="flex-1 h-1.5 bg-navy/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-l from-gold via-amber-400 to-gold transition-all duration-300 rounded-full"
                  style={{ width: `${(currentPage / Math.max(1, numPages)) * 100}%` }}
                />
              </div>
              <span className="text-[10px] font-bold text-navy/70">{Math.round((currentPage / Math.max(1, numPages)) * 100)}%</span>
            </div>
          </div>
        )}
      </div>

      {/* ⚡ Bottom hint */}
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Sparkles className="w-3 h-3 text-gold/60" />
        مرّر لأعلى أو أسفل لقراءة الملف كاملاً — مثل عارض PDF الحقيقي
      </div>
    </div>
  )
}
