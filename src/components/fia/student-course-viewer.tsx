'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import {
  ChevronDown, ChevronUp, Video, FileText, HelpCircle, FileUp,
  Clock, Play, Lock, CheckCircle2, ArrowRight, Loader2, BookOpen,
} from 'lucide-react'
import { LessonPreviewModal } from '@/components/fia/lesson-preview-modal'

interface Module {
  id: string
  title: string
  description?: string
  position: number
  lessons?: Lesson[]
}

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

const LESSON_TYPES = {
  video: { label: 'فيديو', icon: Video, color: 'bg-red-500/15 text-red-600 border-red-500/30' },
  text: { label: 'نص', icon: FileText, color: 'bg-blue-500/15 text-blue-600 border-blue-500/30' },
  exam: { label: 'اختبار', icon: HelpCircle, color: 'bg-purple-500/15 text-purple-600 border-purple-500/30' },
  pdf: { label: 'PDF', icon: FileUp, color: 'bg-green-500/15 text-green-600 border-green-500/30' },
}

export function StudentCourseViewer({
  course,
  enrollment,
  onBack,
}: {
  course: any
  enrollment?: any
  onBack: () => void
}) {
  const [modules, setModules] = useState<Module[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [previewLesson, setPreviewLesson] = useState<Lesson | null>(null)
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set())

  const loadModules = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/modules?course_id=${course.id}`)
      const data = await res.json()
      const mods = Array.isArray(data) ? data : []
      setModules(mods)
      // Auto-expand first module
      if (mods.length > 0) {
        setExpanded(new Set([mods[0].id]))
      }
    } catch {}
    setLoading(false)
  }

  useEffect(() => {
    loadModules()
    // Load completed lessons from localStorage
    const key = `fia_completed_lessons_${course.id}`
    const stored = localStorage.getItem(key)
    if (stored) {
      try {
        const arr = JSON.parse(stored)
        setCompletedLessons(new Set(arr))
      } catch {}
    }
  }, [course.id])

  const toggleModule = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const markComplete = async (lesson: Lesson) => {
    const next = new Set(completedLessons)
    if (next.has(lesson.id)) {
      next.delete(lesson.id)
    } else {
      next.add(lesson.id)
      toast.success(`أكملت درس: ${lesson.title}`)
    }
    setCompletedLessons(next)
    // Persist in localStorage
    const key = `fia_completed_lessons_${course.id}`
    localStorage.setItem(key, JSON.stringify(Array.from(next)))

    // Calculate completion from ALL lessons (not just loaded ones)
    const allL = modules.flatMap((m) => m.lessons || [])
    const completedCount = allL.filter((l) => next.has(l.id)).length
    const totalLessons = allL.length
    const isAllDone = totalLessons > 0 && completedCount === totalLessons
    const pct = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0

    // Update enrollment via API
    try {
      const enr = enrollment
      if (enr && enr.id) {
        const updateBody: any = { progress: pct }
        if (isAllDone) {
          updateBody.status = 'مكتمل'
        }
        await fetch('/api/enrollments', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: enr.id, ...updateBody }),
        })
        if (isAllDone) {
          toast.success('🎉 أكملت الدورة بنجاح! اضغط "رجوع" ثم اطلب الشهادة')
        }
      }
    } catch {}
  }

  const allLessons = modules.flatMap((m) => m.lessons || [])
  const completedCount = allLessons.filter((l) => completedLessons.has(l.id)).length
  const progress = allLessons.length > 0 ? Math.round((completedCount / allLessons.length) * 100) : 0

  if (loading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-navy mb-3" />
        <p className="text-sm text-muted-foreground">جاري تحميل محتوى الدورة...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Course header */}
      <div className="bg-fia-gradient rounded-2xl overflow-hidden text-white">
        <div className="relative h-48 bg-navy">
          {course.cover && <img src={course.cover} alt={course.title} className="w-full h-full object-cover" />}
          <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/60 to-transparent" />
          <div className="absolute bottom-4 right-4 left-4">
            <h2 className="text-2xl font-bold mb-1">{course.title}</h2>
            <div className="flex items-center gap-3 text-sm">
              <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {course.duration_hours || 0} ساعة</span>
              <span className="flex items-center gap-1"><BookOpen className="w-4 h-4" /> {modules.length} وحدة</span>
              <span className="flex items-center gap-1"><FileText className="w-4 h-4" /> {allLessons.length} درس</span>
            </div>
          </div>
        </div>
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm">تقدّمك في الدورة</span>
            <span className="font-bold text-gold">{progress}%</span>
          </div>
          <div className="bg-white/20 rounded-full h-2 overflow-hidden">
            <div className="bg-gold h-full transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="text-xs text-white/70 mt-2">{completedCount} من {allLessons.length} درس مكتمل</div>
        </div>
      </div>

      <Button variant="ghost" onClick={onBack} className="text-navy hover:bg-navy/5">
        <ArrowRight className="w-4 h-4 ml-1" /> العودة لدوراتي
      </Button>

      {/* Modules and lessons */}
      {modules.length === 0 ? (
        <Card className="p-12 text-center">
          <BookOpen className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">لا توجد وحدات في هذه الدورة بعد</p>
        </Card>
      ) : (
        modules.map((m, idx) => {
          const isExpanded = expanded.has(m.id)
          const lessons = m.lessons || []
          const moduleCompleted = lessons.every((l) => completedLessons.has(l.id))
          return (
            <Card key={m.id} className="overflow-hidden">
              <button
                onClick={() => toggleModule(m.id)}
                className="w-full flex items-center justify-between p-4 bg-muted/30 border-b border-border hover:bg-muted/50 transition-colors text-right"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                    moduleCompleted ? 'bg-green-500 text-white' : 'bg-navy text-gold'
                  }`}>
                    {moduleCompleted ? <CheckCircle2 className="w-5 h-5" /> : idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-navy">{m.title}</div>
                    <div className="text-xs text-muted-foreground">{m.description || `${lessons.length} درس`}</div>
                  </div>
                  {isExpanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
                </div>
              </button>
              {isExpanded && (
                <div className="p-3 space-y-2">
                  {lessons.length === 0 ? (
                    <div className="text-center py-4 text-sm text-muted-foreground">لا توجد دروس في هذه الوحدة</div>
                  ) : (
                    lessons.map((l, li) => {
                      const type = LESSON_TYPES[l.lesson_type] || LESSON_TYPES.text
                      const Icon = type.icon
                      const isCompleted = completedLessons.has(l.id)
                      return (
                        <div key={l.id} className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                          isCompleted ? 'bg-green-500/5 border-green-500/30' : 'bg-white border-border hover:shadow-sm'
                        }`}>
                          <button
                            onClick={() => setPreviewLesson(l)}
                            className="flex items-center gap-3 flex-1 text-right min-w-0"
                          >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                              isCompleted ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'
                            }`}>
                              {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Play className="w-4 h-4" />}
                            </div>
                            <Badge className={type.color + ' flex-shrink-0'}>
                              <Icon className="w-3 h-3 ml-1" /> {type.label}
                            </Badge>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-navy text-sm flex items-center gap-2 truncate">
                                {l.title}
                                {l.is_preview && <Badge variant="outline" className="text-xs">معاينة مجانية</Badge>}
                              </div>
                              {l.duration_minutes ? (
                                <div className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> {l.duration_minutes} دقيقة
                                </div>
                              ) : null}
                            </div>
                          </button>
                          <Button size="sm" variant="ghost" onClick={() => markComplete(l)} className="flex-shrink-0" title={isCompleted ? 'إلغاء الإكمال' : 'تحديد كمكتمل'}>
                            {isCompleted ? (
                              <CheckCircle2 className="w-5 h-5 text-green-600" />
                            ) : (
                              <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30" />
                            )}
                          </Button>
                        </div>
                      )
                    })
                  )}
                </div>
              )}
            </Card>
          )
        })
      )}

      {/* Lesson preview modal */}
      <LessonPreviewModal
        open={!!previewLesson}
        onOpenChange={(o) => { if (!o) setPreviewLesson(null) }}
        lesson={previewLesson}
        modules={modules}
        onNavigate={(l) => setPreviewLesson(l)}
      />
    </div>
  )
}
