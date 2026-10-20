'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Video, FileText, HelpCircle, FileUp, X, Play,
  Clock, CheckCircle2, AlertCircle, ArrowRight, ArrowLeft, Copy, Loader2,
  Sparkles, Lock,
} from 'lucide-react'
import { toast } from 'sonner'

interface Lesson {
  id: string
  module_id?: string
  title: string
  lesson_type: 'video' | 'text' | 'exam' | 'pdf'
  content?: string
  video_url?: string
  pdf_url?: string
  duration_minutes?: number
  position?: number
  is_preview?: boolean
}

interface Module {
  id: string
  title: string
  description?: string
  lessons?: Lesson[]
}

interface LessonPreviewModalProps {
  open: boolean
  onOpenChange: (o: boolean) => void
  lesson: Lesson | null
  modules?: Module[]
  // ⚡ Set of completed lesson IDs — used to disable the Next button
  // when the next lesson is locked (sequential progression enforced
  // inside the modal too).
  completedLessons?: Set<string>
  // ⚡ Auto-complete by VIEWING — fired by the inner content component
  // (VideoPlayer / TextContent / PdfViewer / ExamPreview) when the
  // student actually completes viewing the lesson.
  onLessonComplete?: (lesson: Lesson) => void
  // Optional: callback when user navigates between lessons
  onNavigate?: (lesson: Lesson) => void
}

const LESSON_TYPES = {
  video: { label: 'فيديو', icon: Video, color: 'bg-red-500/15 text-red-600 border-red-500/30' },
  text: { label: 'نص', icon: FileText, color: 'bg-blue-500/15 text-blue-600 border-blue-500/30' },
  exam: { label: 'اختبار', icon: HelpCircle, color: 'bg-purple-500/15 text-purple-600 border-purple-500/30' },
  pdf: { label: 'PDF', icon: FileUp, color: 'bg-green-500/15 text-green-600 border-green-500/30' },
}

export function LessonPreviewModal({ open, onOpenChange, lesson, modules = [], completedLessons, onLessonComplete, onNavigate }: LessonPreviewModalProps) {
  // ⚡ Track whether we've already fired onLessonComplete for THIS
  // lesson. We reset when lesson.id changes. This prevents double-firing
  // when the video onEnded event fires multiple times.
  // IMPORTANT: hooks must be called BEFORE any early return to comply
  // with React's Rules of Hooks (the parent always renders this modal,
  // even when `open` is false and `lesson` is null).
  const firedCompleteRef = useRef<string | null>(null)
  useEffect(() => {
    // Reset the fired flag whenever the lesson changes
    firedCompleteRef.current = null
  }, [lesson?.id])

  if (!lesson) return null

  const fireComplete = () => {
    if (!lesson || !onLessonComplete) return
    if (firedCompleteRef.current === lesson.id) return // already fired for this lesson
    if (completedLessons && completedLessons.has(lesson.id)) return // already completed
    firedCompleteRef.current = lesson.id
    onLessonComplete(lesson)
  }

  // Find current lesson position across all modules
  const allLessons: { lesson: Lesson; module: Module | null }[] = []
  modules.forEach((m) => {
    (m.lessons || []).forEach((l) => allLessons.push({ lesson: l, module: m }))
  })

  const currentIdx = allLessons.findIndex(({ lesson: l }) => l.id === lesson.id)
  const prev = currentIdx > 0 ? allLessons[currentIdx - 1] : null
  const next = currentIdx < allLessons.length - 1 ? allLessons[currentIdx + 1] : null

  // ⚡ Determine if the NEXT lesson is locked — it's locked if the
  // current lesson isn't completed yet (sequential progression).
  // We disable the Next button in that case so the student can't
  // jump ahead without finishing the current lesson.
  const isNextLocked = next ? !completedLessons?.has(next.lesson.id) && !completedLessons?.has(lesson.id) : false
  const isPrevAvailable = prev !== null

  const type = LESSON_TYPES[lesson.lesson_type] || LESSON_TYPES.text
  const Icon = type.icon

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-4xl max-h-[95vh] overflow-y-auto p-0 border-0 mx-auto w-[95vw] sm:w-full"
        showCloseButton={false}
      >
        <div className="overflow-hidden rounded-lg">
          {/* ⚡ Magical navy header with gold dot pattern */}
          <div className="relative overflow-hidden bg-gradient-to-br from-navy via-navy-light to-navy px-5 md:px-6 pt-5 pb-5">
            <div className="absolute inset-0 opacity-25" style={{
              backgroundImage: 'radial-gradient(circle at 12% 50%, #D4AF37 1.5px, transparent 1.5px), radial-gradient(circle at 88% 20%, white 1px, transparent 1px)',
              backgroundSize: '24px 24px, 18px 18px'
            }} />
            <div className="absolute -top-8 -right-8 w-32 h-32 bg-gold/15 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-gold/10 rounded-full blur-2xl pointer-events-none" />
            {/* Gold close button (custom) */}
            <button
              onClick={() => onOpenChange(false)}
              className="absolute top-3 left-3 w-9 h-9 rounded-lg bg-white/10 hover:bg-gold/20 flex items-center justify-center z-10 backdrop-blur-sm transition-all active:scale-95"
              aria-label="إغلاق"
            >
              <X className="w-4 h-4 text-gold" />
            </button>
            <DialogHeader className="border-0 bg-transparent p-0">
              <div className="relative flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-gold to-amber-500 flex items-center justify-center shadow-md border border-white/30 flex-shrink-0">
                  <Sparkles className="w-5 h-5 text-navy" strokeWidth={2.2} />
                </div>
                <div className="flex-1 min-w-0 pl-8">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Badge className={type.color + ' flex-shrink-0'}>
                      <Icon className="w-3 h-3 ml-1" /> {type.label}
                    </Badge>
                    {lesson.duration_minutes ? (
                      <Badge variant="outline" className="text-xs flex-shrink-0 bg-white/10 text-white border-white/20">
                        <Clock className="w-3 h-3 ml-1" /> {lesson.duration_minutes} دقيقة
                      </Badge>
                    ) : null}
                    {completedLessons?.has(lesson.id) && (
                      <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30 flex-shrink-0">
                        <CheckCircle2 className="w-3 h-3 ml-1" /> مكتمل
                      </Badge>
                    )}
                  </div>
                  <DialogTitle className="text-white text-base md:text-lg truncate font-bold leading-tight">
                    {lesson.title}
                  </DialogTitle>
                </div>
              </div>
            </DialogHeader>
          </div>

          {/* Body — magical gradient background */}
          <div className="p-4 md:p-6 bg-gradient-to-b from-navy/5 to-white">
            {/* ⚡ Auto-complete hint banner — shown only when the lesson
                isn't completed yet, so the student knows what to do. */}
            {!completedLessons?.has(lesson.id) && (
              <div className="mb-4 p-3 rounded-xl bg-gradient-to-l from-amber-50 to-white border border-amber-200/60 text-xs text-amber-800 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                {lesson.lesson_type === 'video' && 'شاهد الفيديو حتى النهاية ليُكتمل الدرس تلقائياً. (إذا تعذّر تحميل الفيديو، سيظهر زر "تخطّي الدرس" خلال 15 ثانية)'}
                {lesson.lesson_type === 'text' && 'اقرأ المحتوى حتى آخره ليُكتمل الدرس تلقائياً (المحتوى القصير يُكمل خلال 3 ثوانٍ).'}
                {lesson.lesson_type === 'pdf' && 'تصفّح الملف لمدة 15 ثانية ليُكتمل الدرس تلقائياً.'}
                {lesson.lesson_type === 'exam' && 'أجب على الأسئلة واجتاز الاختبار (60% على الأقل) ليُكتمل الدرس تلقائياً. (إذا لم يوجد أسئلة، سيُكمل الدرس تلقائياً)'}
              </div>
            )}
            {/* Render the lesson based on type — each component fires
                onComplete when the student actually finishes viewing. */}
            {lesson.lesson_type === 'video' && <VideoPlayer url={lesson.video_url} onComplete={fireComplete} />}
            {lesson.lesson_type === 'text' && <TextContent content={lesson.content} onComplete={fireComplete} />}
            {lesson.lesson_type === 'pdf' && <PdfViewer url={lesson.pdf_url} onComplete={fireComplete} />}
            {lesson.lesson_type === 'exam' && <ExamPreview content={lesson.content} title={lesson.title} onComplete={fireComplete} />}
          </div>

          {/* Navigation — magical gradient buttons */}
          {(prev || next) && (
            <div className="px-4 md:px-6 pb-4 md:pb-5 pt-2 bg-gradient-to-b from-navy/5 to-white border-t border-gold/15">
              <div className="flex items-center justify-between gap-2 pt-4">
                {isPrevAvailable ? (
                  <Button
                    onClick={() => onNavigate?.(prev!.lesson)}
                    className="flex items-center gap-2 bg-gradient-to-r from-navy to-navy-light hover:from-navy-light hover:to-navy text-gold rounded-xl shadow-md active:scale-[0.97] transition-all border border-gold/20"
                  >
                    <ArrowRight className="w-4 h-4" />
                    <div className="text-right">
                      <div className="text-[10px] text-gold/70">السابق</div>
                      <div className="text-xs font-medium text-gold truncate max-w-[150px]">{prev!.lesson.title}</div>
                    </div>
                  </Button>
                ) : <div />}

                <div className="text-xs text-navy/60 font-medium px-3 py-1.5 rounded-full bg-navy/5 border border-gold/20">
                  {currentIdx + 1} / {allLessons.length}
                </div>

                {next ? (
                  isNextLocked ? (
                    // ⚡ Next lesson is locked — show disabled button with lock icon
                    <Button
                      disabled
                      className="flex items-center gap-2 bg-gray-200 text-gray-500 rounded-xl cursor-not-allowed border border-gray-300"
                      title="أكمل الدرس الحالي أولاً"
                    >
                      <div className="text-left">
                        <div className="text-[10px] text-gray-500/70 flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" /> مقفل
                        </div>
                        <div className="text-xs font-medium truncate max-w-[150px]">{next.lesson.title}</div>
                      </div>
                      <ArrowLeft className="w-4 h-4" />
                    </Button>
                  ) : (
                    <Button
                      onClick={() => onNavigate?.(next.lesson)}
                      className="flex items-center gap-2 bg-gradient-to-r from-navy to-navy-light hover:from-navy-light hover:to-navy text-gold rounded-xl shadow-md active:scale-[0.97] transition-all border border-gold/20"
                    >
                      <div className="text-left">
                        <div className="text-[10px] text-gold/70">التالي</div>
                        <div className="text-xs font-medium text-gold truncate max-w-[150px]">{next.lesson.title}</div>
                      </div>
                      <ArrowLeft className="w-4 h-4" />
                    </Button>
                  )
                ) : <div />}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ============== Video Player (HTML5 protected) ==============
// ⚡ onComplete fires when the student actually watches the video to
// the end (or to 95% — the last 5% is sometimes cut off by Telegram's
// encoding, so we accept 95% as "watched"). The onEnded event also fires
// onComplete as a backup. We only fire once per video session.
//
// ⚡ FALLBACK for broken / non-loading videos:
// If the video fails to load (Telegram link broken, file deleted, etc.),
// the student would otherwise be stuck forever — the lesson stays
// locked because they can never reach 95%. We track:
//   - timeoutElapsed: true if the video hasn't fired 'loadeddata' within
//     15 seconds of the resolvedUrl being set
//   - hasError: true if the <video> onError event fires
// In either case, we show a "تخطّي الدرس (الفيديو غير متاح)" button that
// lets the student mark the lesson as complete so they can move on.
// This is a manual escape hatch — it does NOT auto-fire; the student
// must click it explicitly so they don't accidentally skip content.
function VideoPlayer({ url, onComplete }: { url?: string; onComplete?: () => void }) {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [videoLoaded, setVideoLoaded] = useState(false)
  const [videoFailed, setVideoFailed] = useState(false)
  const firedRef = useRef(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  // Reset the fired flag + failure states whenever the resolved URL
  // changes (i.e. new lesson opened in the modal).
  useEffect(() => {
    firedRef.current = false
    setVideoLoaded(false)
    setVideoFailed(false)
  }, [resolvedUrl])

  // ⚡ Track whether the video actually started loading. If it doesn't
  // fire 'loadeddata' within 15 seconds, treat it as broken and show
  // the "skip lesson" button. Telegram file URLs expire after a while
  // and the video can silently fail to start.
  useEffect(() => {
    if (!resolvedUrl) return
    setVideoLoaded(false)
    setVideoFailed(false)
    const timer = setTimeout(() => {
      // Only treat as failed if 'loadeddata' hasn't fired yet
      setVideoFailed((prevFailed) => {
        // Check current loaded state via the video element directly
        const v = videoRef.current
        if (v && v.readyState >= 2) {
          // HAS data — already loaded, don't mark as failed
          return false
        }
        return true
      })
    }, 15000)
    return () => clearTimeout(timer)
  }, [resolvedUrl])

  // Resolve Telegram message links (https://t.me/c/CHANNEL_ID/MSG_ID) to direct file URLs
  useEffect(() => {
    if (!url) return

    // If it's already a direct file URL (api.telegram.org/file/...), use it directly
    if (url.startsWith('https://api.telegram.org/file/')) {
      setResolvedUrl(url)
      return
    }

    // If it's a Telegram message link (https://t.me/c/CHANNEL_ID/MSG_ID)
    // We need to resolve it via the bot API
    if (url.startsWith('https://t.me/') || url.startsWith('http://t.me/')) {
      setLoading(true)
      // Extract channel_id and message_id from URL
      // Format: https://t.me/c/4391183203/64 → channel_id = -1004391183203, message_id = 64
      const match = url.match(/t\.me\/c\/(\d+)\/(\d+)/)
      if (match) {
        const channelId = `-100${match[1]}`
        const messageId = match[2]
        // Call our API to resolve the Telegram message to a direct file URL
        fetch(`/api/telegram-file?channel_id=${channelId}&message_id=${messageId}`)
          .then((r) => r.json())
          .then((data) => {
            if (data.url) {
              setResolvedUrl(data.url)
            } else {
              setError(data.error || 'فشل في جلب الفيديو من تيليجرام')
            }
          })
          .catch(() => setError('خطأ في الاتصال'))
          .finally(() => setLoading(false))
      } else {
        setError('رابط تيليجرام غير صالح')
        setLoading(false)
      }
      return
    }

    // tg:// file ID (old format) — try to resolve
    if (url.startsWith('tg://')) {
      const fileId = url.substring(5)
      setLoading(true)
      fetch(`/api/telegram-file?file_id=${encodeURIComponent(fileId)}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.url) {
            setResolvedUrl(data.url)
          } else {
            setError('فشل في جلب الفيديو من تيليجرام')
          }
        })
        .catch(() => setError('خطأ في الاتصال'))
        .finally(() => setLoading(false))
      return
    }

    // Regular URL — use directly
    setResolvedUrl(url)
  }, [url])

  if (!url) {
    // ⚡ Magical empty state — gold-glow icon in navy gradient box
    return (
      <div className="relative text-center py-12 bg-gradient-to-br from-white to-gold/5 border border-gold/30 rounded-xl overflow-hidden">
        <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-l from-gold via-amber-400 to-gold opacity-70" />
        <div className="absolute -top-8 -right-8 w-32 h-32 bg-gold/15 rounded-full blur-2xl pointer-events-none" />
        <div className="relative inline-block mb-3">
          <div className="absolute inset-0 bg-gold/20 rounded-full blur-xl animate-pulse" />
          <div className="relative w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-navy via-navy-light to-navy flex items-center justify-center shadow-md border border-gold/30">
            <AlertCircle className="w-8 h-8 text-gold" />
          </div>
        </div>
        <p className="relative text-muted-foreground">لا يوجد فيديو لهذا الدرس</p>
      </div>
    )
  }

  if (loading) {
    // ⚡ Magical dark gradient loading state with gold shimmer
    return (
      <div className="relative bg-gradient-to-br from-navy via-navy-light to-navy rounded-xl overflow-hidden border-2 border-gold/30" style={{ minHeight: '240px' }}>
        <div className="absolute inset-0 opacity-25" style={{
          backgroundImage: 'radial-gradient(circle at 12% 50%, #D4AF37 1.5px, transparent 1.5px), radial-gradient(circle at 88% 20%, white 1px, transparent 1px)',
          backgroundSize: '24px 24px, 18px 18px'
        }} />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-gold/30 rounded-full blur-2xl animate-pulse" />
            <Loader2 className="relative w-10 h-10 text-gold animate-spin" />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    // ⚡ Magical rose error state
    return (
      <div className="relative text-center py-12 bg-rose-500/5 border border-rose-500/30 rounded-xl overflow-hidden">
        <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-l from-rose-500 via-red-400 to-rose-500 opacity-70" />
        <div className="absolute -top-6 -right-6 w-24 h-24 bg-rose-500/15 rounded-full blur-2xl pointer-events-none" />
        <div className="relative inline-block mb-3">
          <div className="absolute inset-0 bg-rose-500/20 rounded-full blur-xl animate-pulse" />
          <div className="relative w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center shadow-md border border-white/30">
            <AlertCircle className="w-7 h-7 text-white" />
          </div>
        </div>
        <p className="relative text-navy font-medium mb-1">{error}</p>
        <p className="relative text-xs text-muted-foreground" dir="ltr">{url}</p>
      </div>
    )
  }

  if (!resolvedUrl) {
    // ⚡ Magical loading card
    return (
      <div className="relative text-center py-12 bg-gradient-to-br from-white to-gold/5 border border-gold/30 rounded-xl overflow-hidden">
        <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-l from-gold via-amber-400 to-gold opacity-70" />
        <div className="absolute -top-8 -right-8 w-32 h-32 bg-gold/15 rounded-full blur-2xl pointer-events-none" />
        <div className="relative inline-block mb-3">
          <div className="absolute inset-0 bg-gold/20 rounded-full blur-xl animate-pulse" />
          <div className="relative w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-navy via-navy-light to-navy flex items-center justify-center shadow-md border border-gold/30">
            <Loader2 className="w-7 h-7 text-gold animate-spin" />
          </div>
        </div>
        <p className="relative text-muted-foreground">جاري تحميل الفيديو...</p>
      </div>
    )
  }

  // ⚡ Magical video container — navy gradient frame with gold border
  return (
    <div className="relative space-y-3">
      <div className="relative p-2 bg-gradient-to-br from-navy via-navy-light to-navy rounded-xl border-2 border-gold/30 shadow-md overflow-hidden">
        <div className="absolute inset-0 opacity-15 pointer-events-none" style={{
          backgroundImage: 'radial-gradient(circle at 12% 50%, #D4AF37 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }} />
        <div className="relative bg-black rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            controls
            controlsList="nodownload noremoteplayback noplaybackrate"
            disablePictureInPicture
            className="w-full h-auto max-h-[480px]"
            onContextMenu={(e) => e.preventDefault()}
            onLoadedData={() => {
              // ⚡ Video successfully loaded — clear failure state
              setVideoLoaded(true)
              setVideoFailed(false)
            }}
            onError={(e) => {
              // ⚡ Video element fired an error — mark as failed so the
              // skip-lesson button appears. This catches broken URLs,
              // CORS issues, expired Telegram file links, etc.
              console.warn('[VideoPlayer] video element error', e)
              setVideoFailed(true)
            }}
            onEnded={() => {
              // ⚡ Backup: when the video actually reaches the end
              if (!firedRef.current && onComplete) {
                firedRef.current = true
                onComplete()
              }
            }}
            onTimeUpdate={(e) => {
              // ⚡ Primary: when the student reaches 95% of the video,
              // mark the lesson as complete. We use 95% (not 100%) to
              // account for the last few seconds being cut off by some
              // Telegram video encodings.
              if (firedRef.current || !onComplete) return
              const v = e.currentTarget
              if (!v || !v.duration) return
              const ratio = v.currentTime / v.duration
              if (ratio >= 0.95) {
                firedRef.current = true
                onComplete()
              }
            }}
          >
            <source src={resolvedUrl} type="video/mp4" />
            متصفحك لا يدعم تشغيل الفيديو
          </video>
          <style jsx>{`
            video::-webkit-media-controls-download-button { display: none; }
            video::-internal-media-controls-overlay-cast-button { display: none; }
            /* ⚡ Hide any "open in new tab" / "more controls" buttons that
               Chrome shows for cross-origin video URLs (Telegram file
               URLs). Without this, the student could right-click the
               video or click the 3-dot menu and choose "Open in new tab"
               to navigate to the raw video URL — which they could then
               download. */
            video::-webkit-media-controls-overflow-button { display: none; }
            video::-webkit-media-controls-overlay-play-button { opacity: 0; }
          `}</style>
        </div>
      </div>

      {/* ⚡ Skip-lesson escape hatch — shown ONLY when the video is
          broken or hasn't loaded within 15 seconds. The student must
          click it explicitly (no auto-skip) so they don't accidentally
          miss content. The button has a clear "broken video" label so
          the student knows it's a fallback, not a normal action. */}
      {videoFailed && !firedRef.current && (
        <div className="relative p-3 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50/50 border border-amber-300/60 overflow-hidden">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0 text-xs">
              <div className="font-bold text-amber-800 mb-0.5">الفيديو غير متاح</div>
              <div className="text-amber-700">تعذّر تحميل الفيديو. يمكنك تخطّي هذا الدرس للمتابعة.</div>
            </div>
            <Button
              size="sm"
              onClick={() => {
                if (firedRef.current || !onComplete) return
                firedRef.current = true
                onComplete()
                toast.success('تم تخطّي الدرس')
              }}
              className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl shadow-md active:scale-95 transition-all flex-shrink-0"
            >
              تخطّي الدرس
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ============== Text Content — Magical Reading Experience ==============
// ⚡ onComplete fires when the student reads the text content:
//   1. For SHORT content (fits in viewport — no scrollbar): fires after
//      a 3-second dwell (long enough to read 1-5 lines but not annoying).
//   2. For LONG content (requires scrolling): fires when student
//      scrolls to within 30px of the bottom.
//   3. Safety net: if neither fires within 12 seconds, fire anyway
//      (we don't want the student stuck — content is finite, the
//      student can't be expected to wait forever).
// Each fire is debounced — we only fire ONCE per lesson session.
function TextContent({ content, onComplete }: { content?: string; onComplete?: () => void }) {
  const [copied, setCopied] = useState(false)
  const firedRef = useRef(false)
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const shortDwellTimerRef = useRef<any>(null)
  const safetyNetTimerRef = useRef<any>(null)

  // ⚡ Fire onComplete exactly once, with all timers cleaned up.
  const fireNow = () => {
    if (firedRef.current) return
    if (!onComplete) return
    firedRef.current = true
    if (shortDwellTimerRef.current) { clearTimeout(shortDwellTimerRef.current); shortDwellTimerRef.current = null }
    if (safetyNetTimerRef.current) { clearTimeout(safetyNetTimerRef.current); safetyNetTimerRef.current = null }
    onComplete()
  }

  // Reset the fired flag + start the timers when content changes.
  useEffect(() => {
    firedRef.current = false
    if (!onComplete || !content) return

    // ⚡ Safety net: fire after 12 seconds regardless of scroll — we
    // don't want the student to wait forever if neither the
    // short-dwell nor the scroll-to-bottom fired.
    safetyNetTimerRef.current = setTimeout(() => {
      fireNow()
    }, 12000)

    // ⚡ Short content dwell: check after a 600ms delay (gives the
    // browser time to layout the content + measure scrollHeight
    // accurately). If scrollHeight <= clientHeight, the content fits
    // in the viewport (no scrollbar) — fire after a 3-second reading
    // dwell so the student has time to read it.
    const measureTimer = setTimeout(() => {
      const el = scrollContainerRef.current
      if (!el) return
      // No scrollbar — content fits entirely in view
      const hasScrollbar = el.scrollHeight > el.clientHeight + 2
      if (!hasScrollbar) {
        shortDwellTimerRef.current = setTimeout(() => {
          fireNow()
        }, 3000) // 3-second read time for short content
      }
      // If there IS a scrollbar, the onScroll handler in the JSX
      // below will fire onComplete when the student scrolls to bottom.
    }, 600)

    return () => {
      if (measureTimer) clearTimeout(measureTimer)
      if (shortDwellTimerRef.current) { clearTimeout(shortDwellTimerRef.current); shortDwellTimerRef.current = null }
      if (safetyNetTimerRef.current) { clearTimeout(safetyNetTimerRef.current); safetyNetTimerRef.current = null }
    }
  }, [content, onComplete])
  if (!content) {
    // ⚡ Magical empty state
    return (
      <div className="relative text-center py-12 bg-gradient-to-br from-white to-gold/5 border border-gold/30 rounded-xl overflow-hidden">
        <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-l from-gold via-amber-400 to-gold opacity-70" />
        <div className="absolute -top-8 -right-8 w-32 h-32 bg-gold/15 rounded-full blur-2xl pointer-events-none" />
        <div className="relative inline-block mb-3">
          <div className="absolute inset-0 bg-gold/20 rounded-full blur-xl animate-pulse" />
          <div className="relative w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-navy via-navy-light to-navy flex items-center justify-center shadow-md border border-gold/30">
            <FileText className="w-8 h-8 text-gold" />
          </div>
        </div>
        <p className="relative text-muted-foreground">لا يوجد محتوى نصي لهذا الدرس</p>
      </div>
    )
  }

  // Format content: split into paragraphs, detect numbered lists, detect headings
  const formatContent = (text: string) => {
    const paragraphs = text.split('\n\n')
    return paragraphs.map((para, pi) => {
      const trimmed = para.trim()
      if (!trimmed) return null

      // Check if it's a numbered list (starts with "1." or "1-")
      const lines = trimmed.split('\n')
      const isNumberedList = lines.length > 1 && lines.every(l => /^\d+[\.\)]\s/.test(l.trim()))
      const isBulletList = lines.length > 1 && lines.every(l => /^[-•▪]\s/.test(l.trim()))
      // Heading detection: short line ending with colon
      const isHeading = trimmed.length < 80 && (trimmed.endsWith(':') || trimmed.endsWith('：')) && !trimmed.includes('\n')

      if (isHeading) {
        return (
          <h3 key={pi} dir="rtl" className="text-navy font-bold text-base md:text-lg mt-6 mb-3 pr-3 border-r-[3px] border-gold">
            {trimmed}
          </h3>
        )
      }

      if (isNumberedList) {
        return (
          <ol key={pi} dir="rtl" className="space-y-3 my-5 list-none pr-1">
            {lines.map((line, li) => {
              const num = line.trim().match(/^(\d+)/)?.[1] || (li + 1)
              const text = line.trim().replace(/^\d+[\.\)]\s*/, '')
              return (
                <li key={li} className="flex flex-row-reverse items-start gap-3">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-navy to-navy-light text-gold text-xs font-bold flex items-center justify-center mt-0.5 shadow-sm">{num}</span>
                  <span className="text-foreground/90 leading-loose text-sm md:text-base flex-1 text-right break-words">{text}</span>
                </li>
              )
            })}
          </ol>
        )
      }

      if (isBulletList) {
        return (
          <ul key={pi} dir="rtl" className="space-y-2.5 my-5 list-none pr-1">
            {lines.map((line, li) => {
              const text = line.trim().replace(/^[-•▪]\s*/, '')
              return (
                <li key={li} className="flex flex-row-reverse items-start gap-3">
                  <span className="flex-shrink-0 w-2 h-2 rounded-full bg-gold mt-2.5 shadow-[0_0_6px_rgba(212,175,55,0.6)]"></span>
                  <span className="text-foreground/90 leading-loose text-sm md:text-base flex-1 text-right break-words">{text}</span>
                </li>
              )
            })}
          </ul>
        )
      }

      // Regular paragraph — RTL with right alignment (no justify — no stretch)
      return (
        <p key={pi} dir="rtl" className="text-foreground/90 leading-loose text-sm md:text-base mb-4 text-right break-words">
          {trimmed.split('\n').map((line, li) => (
            <span key={li} className="block">
              {line}
            </span>
          ))}
        </p>
      )
    })
  }

  return (
    <div dir="rtl" className="relative bg-gradient-to-br from-white to-gold/5 border border-gold/30 rounded-xl shadow-md overflow-hidden">
      {/* Top gold strip */}
      <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-l from-gold via-amber-400 to-gold opacity-70" />
      {/* Magical glow */}
      <div className="absolute -top-8 -right-8 w-32 h-32 bg-gold/15 rounded-full blur-2xl pointer-events-none" />

      {/* Reading header — magical navy gradient bar */}
      <div className="relative flex items-center gap-2 px-4 md:px-6 py-3 bg-gradient-to-r from-navy via-navy-light to-navy text-white">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gold to-amber-500 flex items-center justify-center shadow-md flex-shrink-0">
          <FileText className="w-4 h-4 text-navy" />
        </div>
        <span className="text-xs md:text-sm font-semibold flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-gold/70" />
          محتوى الدرس
        </span>
        <div className="flex-1"></div>
        <button
          onClick={() => {
            navigator.clipboard.writeText(content)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
          }}
          className="text-[10px] md:text-xs text-gold/80 hover:text-gold flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-gold/10 border border-gold/30 transition-all active:scale-95"
          title="نسخ المحتوى"
        >
          {copied ? <><CheckCircle2 className="w-3 h-3" /> تم النسخ</> : <><Copy className="w-3 h-3" /> نسخ</>}
        </button>
      </div>

      {/* Thin gold separator line */}
      <div className="h-0.5 bg-gradient-to-l from-gold via-amber-400 to-gold" />

      {/* Content body — clean, RTL-locked, no animations, no drop caps */}
      <div
        ref={scrollContainerRef}
        onScroll={(e) => {
          // ⚡ Fire onComplete when the student scrolls to within 30px
          // of the bottom of the text content. We use a 30px threshold
          // (instead of strict 0) to be forgiving on mobile browsers
          // where the scrollbar's exact position can be off by a few
          // pixels due to inertia.
          if (firedRef.current || !onComplete) return
          const el = e.currentTarget
          const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
          if (distanceFromBottom <= 30) {
            fireNow()
          }
        }}
        className="relative px-4 md:px-8 py-5 md:py-7 max-h-[60vh] overflow-y-auto"
      >
        <div className="max-w-3xl mx-auto" dir="rtl">
          {formatContent(content)}
        </div>
      </div>
    </div>
  )
}

// ============== PDF Viewer ==============
// ⚡ onComplete fires after the student has had the PDF open for 15
// seconds. We can't easily track scroll position inside the Google
// Docs Viewer iframe (cross-origin), so we use a dwell-time fallback.
// 15 seconds is enough for the student to glance through the file
// without making them wait too long for the next lesson to unlock.
function PdfViewer({ url, onComplete }: { url?: string; onComplete?: () => void }) {
  const firedRef = useRef(false)

  useEffect(() => {
    firedRef.current = false
    if (!onComplete || !url) return
    const timer = setTimeout(() => {
      if (!firedRef.current) {
        firedRef.current = true
        onComplete()
      }
    }, 15000)
    return () => clearTimeout(timer)
  }, [url, onComplete])
  if (!url) {
    // ⚡ Magical empty state
    return (
      <div className="relative text-center py-12 bg-gradient-to-br from-white to-gold/5 border border-gold/30 rounded-xl overflow-hidden">
        <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-l from-gold via-amber-400 to-gold opacity-70" />
        <div className="absolute -top-8 -right-8 w-32 h-32 bg-gold/15 rounded-full blur-2xl pointer-events-none" />
        <div className="relative inline-block mb-3">
          <div className="absolute inset-0 bg-gold/20 rounded-full blur-xl animate-pulse" />
          <div className="relative w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-navy via-navy-light to-navy flex items-center justify-center shadow-md border border-gold/30">
            <AlertCircle className="w-8 h-8 text-gold" />
          </div>
        </div>
        <p className="relative text-muted-foreground">لا يوجد ملف PDF لهذا الدرس</p>
      </div>
    )
  }

  // Render the PDF inline via Google Drive embed API. The standard
  // `https://docs.google.com/viewer` URL shows Google's toolbar with
  // download + open-in-new-tab buttons (the arrow the user reported).
  // We use `&rm=minimal&toolbar=0` which strips the toolbar entirely.
  //
  // ⚡ PROTECTION LAYERS (defense in depth):
  //  1. &rm=minimal — strips Google's toolbar (no download/print buttons)
  //  2. &toolbar=0 — explicit toolbar disable
  //  3. onContextMenu preventDefault — blocks right-click "Save As..."
  //  4. Transparent overlay div over the iframe — blocks all mouse
  //     interactions with Google's UI (overlay is pointer-events-auto
  //     so it absorbs clicks, but background:transparent so the PDF
  //     is still visible). Student can still scroll the PDF via wheel/touch.
  //  5. referrerpolicy="no-referrer" — prevents Google from logging our origin.
  //
  // NOTE: There's no way to fully prevent a determined user from
  // screenshotting the PDF or using browser dev tools to fetch the raw
  // file. Our goal is to make casual download inconvenient, not to
  // provide DRM. The Trainer can mark a lesson as `is_preview` to make
  // it free for everyone; otherwise the student must be enrolled.
  const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true&rm=minimal&toolbar=0`

  return (
    <div className="space-y-3">
      {/* Magical file info card */}
      <div className="relative flex items-center gap-3 p-3 bg-gradient-to-br from-white to-gold/5 border border-gold/30 rounded-xl overflow-hidden">
        <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-l from-gold via-amber-400 to-gold opacity-70" />
        <div className="absolute -top-6 -right-6 w-20 h-20 bg-gold/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-navy to-navy-light flex items-center justify-center shadow-md flex-shrink-0 border border-gold/20">
          <FileUp className="w-5 h-5 text-gold" />
        </div>
        <div className="relative min-w-0 flex-1">
          <div className="font-bold text-navy text-sm truncate">{url.split('/').pop()}</div>
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-gold/60" />
            ملف PDF — معاينة محمية داخل التطبيق
          </div>
        </div>
        {/* ⚡ "Protected" badge — makes it clear to the student that
            the file is intentionally protected (no download). */}
        <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30 text-[10px] flex-shrink-0">
          <Lock className="w-2.5 h-2.5 ml-0.5" /> محمي
        </Badge>
      </div>
      {/* ⚡ Magical gold-bordered PDF frame with PROTECTION OVERLAY.
          The wrapper is `relative` so we can absolutely-position an
          overlay div ON TOP of the iframe. The overlay is transparent
          (so the PDF is visible) and pointer-events-auto (so it
          ABSORBS all clicks — Google's download/print buttons can't
          be clicked). The student can still scroll via wheel/touch
          because those events bubble through to the iframe. */}
      <div
        className="relative w-full rounded-xl border-2 border-gold/30 shadow-md overflow-hidden"
        onContextMenu={(e) => e.preventDefault()}
        style={{ height: '600px' }}
      >
        <iframe
          src={viewerUrl}
          className="absolute inset-0 w-full h-full"
          title="PDF Preview"
          referrerPolicy="no-referrer"
          // ⚡ sandbox — restrict the iframe's capabilities. We allow
          // scripts (needed for the Google viewer to render) but block
          // popups, top navigation, form submission, etc.
          sandbox="allow-scripts allow-same-origin"
        />
        {/* ⚡ Transparent protection overlay — covers the entire
            iframe. Absorbs all mouse events (including right-click),
            preventing the student from clicking Google's download /
            print / open-in-new-tab buttons. The student can still
            scroll the PDF via mouse wheel / touch scroll because
            those events bubble through to the iframe. */}
        <div
          className="absolute inset-0"
          style={{ background: 'transparent', pointerEvents: 'auto' }}
          onContextMenu={(e) => e.preventDefault()}
          onDragStart={(e) => e.preventDefault()}
        />
      </div>
    </div>
  )
}

// ============== Exam Preview ==============
// ⚡ onComplete fires when the student submits the exam with a score
// of at least 60% (the pass threshold). Failing the exam does NOT
// complete the lesson — the student can retry until they pass.
//
// ⚡ EMPTY EXAM (no questions): Auto-complete the lesson after a 2s
// delay. The student shouldn't be stuck on a lesson with no content
// because the trainer hasn't added questions yet.

// ⚡ Helper component: fires onComplete after 2 seconds. Rendered only
// when the exam has no questions. Lives inside the ExamPreview's JSX
// tree so it can access onComplete + firedRef without prop drilling.
function EmptyExamAutoComplete({ onComplete, firedRef }: { onComplete?: () => void; firedRef: React.MutableRefObject<boolean> }) {
  useEffect(() => {
    if (!onComplete) return
    const timer = setTimeout(() => {
      if (!firedRef.current) {
        firedRef.current = true
        onComplete()
      }
    }, 2000)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return null
}

function ExamPreview({ content, title, onComplete }: { content?: string; title: string; onComplete?: () => void }) {
  const [questions, setQuestions] = useState<any[]>([])
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState(0)
  const firedRef = useRef(false)

  useEffect(() => {
    if (content) {
      try {
        const parsed = JSON.parse(content)
        if (Array.isArray(parsed)) {
          setQuestions(parsed)
        } else {
          setQuestions([])
        }
      } catch {
        setQuestions([])
      }
    } else {
      setQuestions([])
    }
    setAnswers({})
    setSubmitted(false)
    setScore(0)
    // Reset the fired flag when content changes (new exam)
    firedRef.current = false
  }, [content])

  if (questions.length === 0) {
    // ⚡ Empty exam — student-friendly message (NOT the trainer's
    // "يمكن إضافة الأسئلة بصيغة JSON عند تعديل الدرس" hint that was
    // confusing students). The student shouldn't be stuck on a lesson
    // that has no questions because the trainer hasn't added any yet.
    // We auto-complete the lesson after a short 2-second delay so the
    // student sees the "no questions yet" message before being moved on
    // to the next lesson automatically.
    return (
      <div className="relative text-center py-12 bg-gradient-to-br from-white to-purple-500/5 border border-purple-500/30 rounded-xl overflow-hidden">
        <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-l from-purple-500 via-purple-400 to-purple-500 opacity-70" />
        <div className="absolute -top-8 -right-8 w-32 h-32 bg-purple-500/15 rounded-full blur-2xl pointer-events-none" />
        <div className="relative inline-block mb-3">
          <div className="absolute inset-0 bg-purple-500/20 rounded-full blur-xl animate-pulse" />
          <div className="relative w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800 flex items-center justify-center shadow-md border border-white/30">
            <HelpCircle className="w-8 h-8 text-white" />
          </div>
        </div>
        <p className="relative text-navy font-medium mb-2">لا يوجد أسئلة في هذا الاختبار حالياً</p>
        <p className="relative text-xs text-muted-foreground">سيتم اعتبار الدرس مكتمل تلقائياً والمتابعة للدرس التالي</p>
        {/* ⚡ Auto-complete the empty exam after 2 seconds */}
        <EmptyExamAutoComplete onComplete={onComplete} firedRef={firedRef} />
      </div>
    )
  }

  const handleSubmit = () => {
    let correct = 0
    questions.forEach((q, i) => {
      if (answers[i] === q.answer) correct++
    })
    const finalScore = Math.round((correct / questions.length) * 100)
    setScore(finalScore)
    setSubmitted(true)
    if (finalScore >= 60) {
      toast.success(`🎉 اجتزت الاختبار! نتيجتك: ${finalScore}%`)
      // ⚡ Fire onComplete only on PASS (>= 60%)
      if (!firedRef.current && onComplete) {
        firedRef.current = true
        onComplete()
      }
    } else {
      toast.error(`نتيجة الاختبار: ${finalScore}% — تحتاج 60% على الأقل للنجاح. أعد المحاولة.`)
    }
  }

  return (
    <div className="space-y-4">
      {/* ⚡ Magical purple gradient header (exam theme) */}
      <div className="relative bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800 p-4 rounded-xl overflow-hidden shadow-md">
        <div className="absolute inset-0 opacity-25" style={{
          backgroundImage: 'radial-gradient(circle at 12% 50%, white 1.5px, transparent 1.5px), radial-gradient(circle at 88% 20%, white 1px, transparent 1px)',
          backgroundSize: '24px 24px, 18px 18px'
        }} />
        <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold to-amber-500 flex items-center justify-center shadow-md flex-shrink-0 border border-white/30">
              <HelpCircle className="w-5 h-5 text-navy" />
            </div>
            <div>
              <div className="font-bold text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-gold" />
                {title}
              </div>
              <div className="text-xs text-white/70">عدد الأسئلة: {questions.length}</div>
            </div>
          </div>
          {submitted && (
            <Badge className={`${score >= 60 ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-rose-500 text-white border-rose-400'} flex-shrink-0`}>
              {score}% {score >= 60 ? '(ناجح)' : '(راسب)'}
            </Badge>
          )}
        </div>
      </div>

      {/* Question cards — magical cards with top gold strip */}
      {questions.map((q, qi) => (
        <Card key={qi} className="relative p-4 bg-gradient-to-br from-white to-gold/5 border border-gold/30 rounded-xl overflow-hidden fia-card-hover">
          <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-l from-gold via-amber-400 to-gold opacity-70" />
          <div className="relative flex items-start gap-3 mb-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-md border border-gold/20">
              {qi + 1}
            </div>
            <div className="font-semibold text-navy flex-1 pt-1">
              {q.q || q.question || 'سؤال'}
            </div>
          </div>
          <div className="space-y-2 relative">
            {(q.options || []).map((opt: any, oi: number) => {
              const isSelected = answers[qi] === oi
              const isCorrect = q.answer === oi
              let bg = 'bg-white border-border hover:border-purple-400'
              if (submitted) {
                if (isCorrect) bg = 'bg-emerald-500/15 border-emerald-500/50'
                else if (isSelected) bg = 'bg-rose-500/15 border-rose-500/50'
                else bg = 'bg-white border-border opacity-70'
              } else if (isSelected) {
                bg = 'bg-purple-500/15 border-purple-500/50'
              }
              return (
                <button
                  key={oi}
                  type="button"
                  disabled={submitted}
                  onClick={() => setAnswers({ ...answers, [qi]: oi })}
                  className={`w-full text-right p-3 rounded-md border-2 transition-all ${bg}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-navy">{opt}</span>
                    {submitted && isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                    {submitted && isSelected && !isCorrect && <X className="w-4 h-4 text-rose-600" />}
                  </div>
                </button>
              )
            })}
          </div>
        </Card>
      ))}

      {/* Magical submit / retry buttons */}
      {!submitted ? (
        <Button
          onClick={handleSubmit}
          disabled={Object.keys(answers).length < questions.length}
          className="w-full bg-gradient-to-r from-navy to-navy-light hover:from-navy-light hover:to-navy text-gold rounded-xl shadow-md active:scale-[0.97] transition-all border border-gold/20"
        >
          تسليم الاختبار
        </Button>
      ) : (
        <Button
          onClick={() => { setSubmitted(false); setAnswers({}) }}
          variant="outline"
          className="w-full rounded-xl border-gold/30 text-navy hover:bg-gold/10 active:scale-[0.97] transition-all"
        >
          إعادة الاختبار
        </Button>
      )}
    </div>
  )
}
