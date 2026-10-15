'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Video, FileText, HelpCircle, FileUp, X, Play, Download,
  Clock, CheckCircle2, AlertCircle, ArrowRight, ArrowLeft,
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
      <DialogContent className="sm:max-w-4xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Badge className={type.color + ' flex-shrink-0'}>
                <Icon className="w-3.5 h-3.5 ml-1" /> {type.label}
              </Badge>
              <DialogTitle className="text-navy text-lg truncate">{lesson.title}</DialogTitle>
            </div>
            {lesson.duration_minutes ? (
              <Badge variant="outline" className="text-xs flex-shrink-0">
                <Clock className="w-3 h-3 ml-1" /> {lesson.duration_minutes} دقيقة
              </Badge>
            ) : null}
          </div>
        </DialogHeader>

        <div className="py-4">
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
  if (!url) {
    return (
      <div className="text-center py-12 bg-muted/30 rounded-lg border border-border">
        <AlertCircle className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-muted-foreground">لا يوجد فيديو لهذا الدرس</p>
      </div>
    )
  }

  // If it's a Telegram file URL, we can't directly play it
  if (url.startsWith('tg://')) {
    return (
      <div className="text-center py-12 bg-muted/30 rounded-lg border border-border">
        <Video className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <p className="text-muted-foreground mb-2">تم رفع هذا الفيديو إلى تيليجرام</p>
        <p className="text-xs text-muted-foreground" dir="ltr">File ID: {url.substring(5)}</p>
        <p className="text-xs text-muted-foreground mt-2">سيتم ربط الفيديو عبر رابط مباشر لاحقاً</p>
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
        <source src={url} type="video/mp4" />
        متصفحك لا يدعم تشغيل الفيديو
      </video>
      <style jsx>{`
        video::-webkit-media-controls-download-button { display: none; }
        video::-internal-media-controls-overlay-cast-button { display: none; }
      `}</style>
    </div>
  )
}

// ============== Text Content ==============
function TextContent({ content }: { content?: string }) {
  if (!content) {
    return (
      <div className="text-center py-12 bg-muted/30 rounded-lg border border-border">
        <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-muted-foreground">لا يوجد محتوى نصي لهذا الدرس</p>
      </div>
    )
  }

  return (
    <Card className="p-6 prose prose-sm max-w-none prose-headings:text-navy prose-headings:font-bold prose-p:text-foreground prose-a:text-gold">
      <div className="whitespace-pre-wrap leading-relaxed text-foreground">
        {content}
      </div>
    </Card>
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

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
        <div className="flex items-center gap-2 min-w-0">
          <FileUp className="w-5 h-5 text-green-600 flex-shrink-0" />
          <div className="min-w-0">
            <div className="font-medium text-navy text-sm truncate">{url.split('/').pop()}</div>
            <div className="text-xs text-muted-foreground">ملف PDF محمي</div>
          </div>
        </div>
        <a href={url} target="_blank" rel="noopener noreferrer">
          <Button size="sm" variant="outline" className="border-navy/30 text-navy hover:bg-navy/5">
            <Download className="w-3.5 h-3.5 ml-1" /> فتح في تبويب
          </Button>
        </a>
      </div>
      <iframe
        src={url}
        className="w-full h-[500px] rounded-lg border-2 border-border"
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
