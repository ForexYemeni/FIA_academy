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
  // Optional: callback when user navigates between lessons
  onNavigate?: (lesson: Lesson) => void
}

const LESSON_TYPES = {
  video: { label: 'فيديو', icon: Video, color: 'bg-red-500/15 text-red-600 border-red-500/30' },
  text: { label: 'نص', icon: FileText, color: 'bg-blue-500/15 text-blue-600 border-blue-500/30' },
  exam: { label: 'اختبار', icon: HelpCircle, color: 'bg-purple-500/15 text-purple-600 border-purple-500/30' },
  pdf: { label: 'PDF', icon: FileUp, color: 'bg-green-500/15 text-green-600 border-green-500/30' },
}

export function LessonPreviewModal({ open, onOpenChange, lesson, modules = [], onNavigate }: LessonPreviewModalProps) {
  if (!lesson) return null

  // Find current lesson position across all modules
  const allLessons: { lesson: Lesson; module: Module | null }[] = []
  modules.forEach((m) => {
    (m.lessons || []).forEach((l) => allLessons.push({ lesson: l, module: m }))
  })

  const currentIdx = allLessons.findIndex(({ lesson: l }) => l.id === lesson.id)
  const prev = currentIdx > 0 ? allLessons[currentIdx - 1] : null
  const next = currentIdx < allLessons.length - 1 ? allLessons[currentIdx + 1] : null

  const type = LESSON_TYPES[lesson.lesson_type] || LESSON_TYPES.text
  const Icon = type.icon

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[95vh] overflow-y-auto p-4 md:p-6 mx-auto w-[95vw] sm:w-full">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <Badge className={type.color + ' flex-shrink-0'}>
                <Icon className="w-3.5 h-3.5 ml-1" /> {type.label}
              </Badge>
              <DialogTitle className="text-navy text-base md:text-lg truncate">{lesson.title}</DialogTitle>
            </div>
            {lesson.duration_minutes ? (
              <Badge variant="outline" className="text-xs flex-shrink-0">
                <Clock className="w-3 h-3 ml-1" /> {lesson.duration_minutes} دقيقة
              </Badge>
            ) : null}
          </div>
        </DialogHeader>

        <div className="py-2 md:py-4">
          {/* Render the lesson based on type */}
          {lesson.lesson_type === 'video' && <VideoPlayer url={lesson.video_url} />}
          {lesson.lesson_type === 'text' && <TextContent content={lesson.content} />}
          {lesson.lesson_type === 'pdf' && <PdfViewer url={lesson.pdf_url} />}
          {lesson.lesson_type === 'exam' && <ExamPreview content={lesson.content} title={lesson.title} />}
        </div>

        {/* Navigation */}
        {(prev || next) && (
          <div className="flex items-center justify-between gap-2 border-t border-border pt-4 mt-2">
            {prev ? (
              <Button variant="outline" onClick={() => onNavigate?.(prev.lesson)} className="flex items-center gap-2">
                <ArrowRight className="w-4 h-4" />
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">السابق</div>
                  <div className="text-xs font-medium text-navy truncate max-w-[150px]">{prev.lesson.title}</div>
                </div>
              </Button>
            ) : <div />}

            <div className="text-xs text-muted-foreground">
              {currentIdx + 1} / {allLessons.length}
            </div>

            {next ? (
              <Button variant="outline" onClick={() => onNavigate?.(next.lesson)} className="flex items-center gap-2">
                <div className="text-left">
                  <div className="text-xs text-muted-foreground">التالي</div>
                  <div className="text-xs font-medium text-navy truncate max-w-[150px]">{next.lesson.title}</div>
                </div>
                <ArrowLeft className="w-4 h-4" />
              </Button>
            ) : <div />}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ============== Video Player (HTML5 protected) ==============
function VideoPlayer({ url }: { url?: string }) {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    return (
      <div className="text-center py-12 bg-muted/30 rounded-lg border border-border">
        <AlertCircle className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-muted-foreground">لا يوجد فيديو لهذا الدرس</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="text-center py-12 bg-muted/30 rounded-lg border border-border">
        <Loader2 className="w-8 h-8 text-navy mx-auto mb-3 animate-spin" />
        <p className="text-muted-foreground">جاري جلب الفيديو من تيليجرام...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12 bg-muted/30 rounded-lg border border-border">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <p className="text-muted-foreground">{error}</p>
        <p className="text-xs text-muted-foreground mt-2" dir="ltr">{url}</p>
      </div>
    )
  }

  if (!resolvedUrl) {
    return (
      <div className="text-center py-12 bg-muted/30 rounded-lg border border-border">
        <Loader2 className="w-8 h-8 text-navy mx-auto mb-3 animate-spin" />
        <p className="text-muted-foreground">جاري تحميل الفيديو...</p>
      </div>
    )
  }

  return (
    <div className="bg-black rounded-lg overflow-hidden relative">
      <video
        controls
        controlsList="nodownload noremoteplayback noplaybackrate"
        disablePictureInPicture
        className="w-full h-auto max-h-[480px]"
        onContextMenu={(e) => e.preventDefault()}
      >
        <source src={resolvedUrl} type="video/mp4" />
        متصفحك لا يدعم تشغيل الفيديو
      </video>
      <style jsx>{`
        video::-webkit-media-controls-download-button { display: none; }
        video::-internal-media-controls-overlay-cast-button { display: none; }
      `}</style>
    </div>
  )
}

// ============== Text Content — Clean Professional Reading Experience ==============
function TextContent({ content }: { content?: string }) {
  const [copied, setCopied] = useState(false)
  if (!content) {
    return (
      <div className="text-center py-12 bg-muted/30 rounded-xl border border-border">
        <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-muted-foreground">لا يوجد محتوى نصي لهذا الدرس</p>
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
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-navy text-gold text-xs font-bold flex items-center justify-center mt-0.5">{num}</span>
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
                  <span className="flex-shrink-0 w-2 h-2 rounded-full bg-gold mt-2.5"></span>
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
    <div dir="rtl" className="bg-white rounded-xl border border-border shadow-md overflow-hidden">
      {/* Reading header — clean navy bar */}
      <div className="flex items-center gap-2 px-4 md:px-6 py-3 bg-navy text-white">
        <FileText className="w-4 h-4 text-gold flex-shrink-0" />
        <span className="text-xs md:text-sm font-semibold">محتوى الدرس</span>
        <div className="flex-1"></div>
        <button
          onClick={() => {
            navigator.clipboard.writeText(content)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
          }}
          className="text-[10px] md:text-xs text-gold/80 hover:text-gold flex items-center gap-1 px-2 py-1 rounded-md hover:bg-white/5"
          title="نسخ المحتوى"
        >
          {copied ? <><CheckCircle2 className="w-3 h-3" /> تم النسخ</> : <><Copy className="w-3 h-3" /> نسخ</>}
        </button>
      </div>

      {/* Thin gold separator line */}
      <div className="h-0.5 bg-gold/60" />

      {/* Content body — clean, RTL-locked, no animations, no drop caps */}
      <div className="px-4 md:px-8 py-5 md:py-7 max-h-[60vh] overflow-y-auto">
        <div className="max-w-3xl mx-auto" dir="rtl">
          {formatContent(content)}
        </div>
      </div>
    </div>
  )
}

// ============== PDF Viewer ==============
function PdfViewer({ url }: { url?: string }) {
  if (!url) {
    return (
      <div className="text-center py-12 bg-muted/30 rounded-lg border border-border">
        <AlertCircle className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-muted-foreground">لا يوجد ملف PDF لهذا الدرس</p>
      </div>
    )
  }

  // Render the PDF inline via Google Docs Viewer. Browsing a raw Telegram file
  // URL directly (in an <iframe> or <object>) makes the browser download the
  // file instead of displaying it. Google Docs Viewer fetches and renders the
  // PDF server-side, so the user always sees the document inside the modal —
  // no auto-download is triggered.
  const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg border border-border">
        <FileUp className="w-5 h-5 text-green-600 flex-shrink-0" />
        <div className="min-w-0">
          <div className="font-medium text-navy text-sm truncate">{url.split('/').pop()}</div>
          <div className="text-xs text-muted-foreground">ملف PDF — معاينة داخل التطبيق</div>
        </div>
      </div>
      <iframe
        src={viewerUrl}
        className="w-full h-[600px] rounded-lg border-2 border-border"
        title="PDF Preview"
      />
    </div>
  )
}

// ============== Exam Preview ==============
function ExamPreview({ content, title }: { content?: string; title: string }) {
  const [questions, setQuestions] = useState<any[]>([])
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState(0)

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
  }, [content])

  if (questions.length === 0) {
    return (
      <div className="text-center py-12 bg-muted/30 rounded-lg border border-border">
        <HelpCircle className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-muted-foreground mb-2">لا يوجد أسئلة في هذا الاختبار</p>
        <p className="text-xs text-muted-foreground">يمكن إضافة الأسئلة بصيغة JSON عند تعديل الدرس</p>
      </div>
    )
  }

  const handleSubmit = () => {
    let correct = 0
    questions.forEach((q, i) => {
      if (answers[i] === q.answer) correct++
    })
    setScore(Math.round((correct / questions.length) * 100))
    setSubmitted(true)
    toast.success(`نتيجة الاختبار: ${Math.round((correct / questions.length) * 100)}%`)
  }

  return (
    <div className="space-y-4">
      <div className="bg-purple-500/10 border border-purple-500/30 p-4 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-bold text-navy">{title}</div>
            <div className="text-xs text-muted-foreground">عدد الأسئلة: {questions.length}</div>
          </div>
          {submitted && (
            <Badge className={score >= 60 ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}>
              {score}% {score >= 60 ? '(ناجح)' : '(راسب)'}
            </Badge>
          )}
        </div>
      </div>

      {questions.map((q, qi) => (
        <Card key={qi} className="p-4">
          <div className="font-semibold text-navy mb-3">
            {qi + 1}. {q.q || q.question || 'سؤال'}
          </div>
          <div className="space-y-2">
            {(q.options || []).map((opt: any, oi: number) => {
              const isSelected = answers[qi] === oi
              const isCorrect = q.answer === oi
              let bg = 'bg-white border-border hover:border-purple-400'
              if (submitted) {
                if (isCorrect) bg = 'bg-green-500/15 border-green-500/50'
                else if (isSelected) bg = 'bg-red-500/15 border-red-500/50'
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
                    {submitted && isCorrect && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                    {submitted && isSelected && !isCorrect && <X className="w-4 h-4 text-red-600" />}
                  </div>
                </button>
              )
            })}
          </div>
        </Card>
      ))}

      {!submitted ? (
        <Button onClick={handleSubmit} disabled={Object.keys(answers).length < questions.length} className="w-full bg-navy hover:bg-navy-light">
          تسليم الاختبار
        </Button>
      ) : (
        <Button onClick={() => { setSubmitted(false); setAnswers({}) }} variant="outline" className="w-full">
          إعادة الاختبار
        </Button>
      )}
    </div>
  )
}
