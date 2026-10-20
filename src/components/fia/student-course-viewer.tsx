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
  Sparkles, Star, Award, Gift,
} from 'lucide-react'
import { LessonPreviewModal } from '@/components/fia/lesson-preview-modal'
import { CourseReviews } from '@/components/fia/course-reviews'
import { CertificateRequest } from '@/components/fia/certificate-request'
import { useAuth } from '@/lib/auth-store'

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

const LESSON_TYPES: Record<string, { label: string; icon: any; color: string; gradient: string }> = {
  video: { label: 'فيديو', icon: Video, color: 'bg-red-500/15 text-red-600 border-red-500/30', gradient: 'from-red-500 to-rose-600' },
  text: { label: 'نص', icon: FileText, color: 'bg-blue-500/15 text-blue-600 border-blue-500/30', gradient: 'from-blue-500 to-indigo-600' },
  exam: { label: 'اختبار', icon: HelpCircle, color: 'bg-purple-500/15 text-purple-600 border-purple-500/30', gradient: 'from-purple-500 to-fuchsia-600' },
  pdf: { label: 'PDF', icon: FileUp, color: 'bg-green-500/15 text-green-600 border-green-500/30', gradient: 'from-emerald-500 to-teal-600' },
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
  // ⚡ Local enrollment state — kept in sync with the prop, but also
  // updated by our internal poller when the admin approves the payment
  // while the student is sitting in the locked state. Without this,
  // the student would have to navigate back + reopen the course to see
  // the unlocked content.
  const [currentEnrollment, setCurrentEnrollment] = useState<any>(enrollment)

  // Keep local state in sync if the parent passes a fresh enrollment
  useEffect(() => {
    setCurrentEnrollment(enrollment)
  }, [enrollment])

  const loadModules = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/modules?course_id=${course.id}`)
      const data = await res.json()
      const mods = Array.isArray(data) ? data : []
      setModules(mods)
      // Auto-expand first UNLOCKED module (sequential progression)
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
        // ⚡ Cleanup: only keep lesson IDs that actually exist in this
        // course's modules. This prevents stale localStorage from a
        // previous course version from making the course look
        // "completed" when the lessons no longer exist.
        // We filter after modules load — for now, store the raw set and
        // clean it up in a separate effect once modules are available.
        setCompletedLessons(new Set(arr))
      } catch {}
    }
  }, [course.id])

  // ⚡ Cleanup stale completed-lesson IDs once modules load. If the
  // trainer restructured the course (deleted/renamed lessons), the old
  // localStorage entries are removed so the course doesn't falsely
  // show as completed.
  useEffect(() => {
    if (modules.length === 0) return
    const allLessonIds = new Set(modules.flatMap((m) => (m.lessons || []).map((l) => l.id)))
    setCompletedLessons((prev) => {
      const cleaned = new Set<string>()
      prev.forEach((id) => {
        if (allLessonIds.has(id)) cleaned.add(id)
      })
      if (cleaned.size !== prev.size) {
        const key = `fia_completed_lessons_${course.id}`
        localStorage.setItem(key, JSON.stringify(Array.from(cleaned)))
      }
      return cleaned
    })
  }, [modules, course.id])

  // ⚡ POLLING: while the enrollment is pending admin approval, poll
  // /api/enrollments every 4s so the course unlocks INSTANTLY when the
  // admin clicks "approve" — no manual refresh needed. Stops polling
  // once the payment_status is no longer 'pending'.
  useEffect(() => {
    const payStatus = currentEnrollment?.payment_status
    if (payStatus !== 'pending') return
    const userId = currentEnrollment?.user_id
    if (!userId) return
    let active = true
    const interval = setInterval(async () => {
      if (!active) return
      try {
        const res = await fetch(`/api/enrollments?user_id=${userId}&course_id=${course.id}`)
        const data = await res.json()
        const found = Array.isArray(data) && data.length > 0 ? data[0] : null
        if (found && found.payment_status !== 'pending') {
          setCurrentEnrollment(found)
          if (found.payment_status === 'confirmed' || found.payment_status === 'completed' || found.payment_status === 'free') {
            toast.success('✅ تم تأكيد دفعك! الدورة متاحة الآن')
          }
        }
      } catch {}
    }, 4000)
    return () => { active = false; clearInterval(interval) }
  }, [currentEnrollment?.payment_status, currentEnrollment?.user_id, course.id])

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
    // ⚡ Auto-complete by VIEWING — this function is now called only
    // from the LessonPreviewModal's onLessonComplete callback. The
    // student no longer has a manual "mark complete" circle button.
    // We only ADD completion (never toggle off) — viewing the lesson
    // once is enough; we don't let the student un-complete.
    if (next.has(lesson.id)) {
      // Already complete — nothing to do (no toggle-off)
      return
    }
    next.add(lesson.id)
    setCompletedLessons(next)
    toast.success(`✅ أكملت درس: ${lesson.title}`)
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
      const enr = currentEnrollment
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
      <div className="text-center py-14">
        <div className="relative inline-block mb-3">
          <div className="absolute inset-0 bg-gold/20 rounded-full blur-2xl animate-pulse" />
          <Loader2 className="relative w-10 h-10 animate-spin mx-auto text-gold" />
        </div>
        <p className="text-sm text-muted-foreground">جاري تحميل محتوى الدورة...</p>
      </div>
    )
  }

  // ============================================================
  // ACCESS CONTROL
  // ============================================================
  const isFree = course?.price_type === 'مجانية' || course?.price === 0
  const payStatus = currentEnrollment?.payment_status
  const hasAccess = currentEnrollment && payStatus && payStatus !== 'pending'

  if (!hasAccess) {
    return (
      <div className="space-y-4">
        {/* ⚡ Magical locked state */}
        <div className="relative overflow-hidden rounded-2xl p-8 text-white text-center bg-gradient-to-br from-navy via-navy-light to-navy shadow-xl">
          <div className="absolute inset-0 opacity-25" style={{
            backgroundImage: 'radial-gradient(circle at 12% 50%, #D4AF37 1.5px, transparent 1.5px), radial-gradient(circle at 88% 20%, white 1px, transparent 1px)',
            backgroundSize: '24px 24px, 18px 18px'
          }} />
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-gold/15 rounded-full blur-3xl" />
          <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-gold/10 rounded-full blur-2xl" />
          <div className="relative">
            <div className="relative inline-block mb-4">
              <div className="absolute inset-0 bg-gold/20 rounded-full blur-2xl animate-pulse" />
              <div className="relative w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-gold to-amber-500 flex items-center justify-center shadow-lg border border-white/30">
                <Lock className="w-10 h-10 text-navy" />
              </div>
            </div>
            <h2 className="text-2xl font-bold mb-2">هذه الدورة محمية</h2>
            <p className="text-white/80 mb-6 max-w-md mx-auto">
              {currentEnrollment && payStatus === 'pending'
                ? 'تم استلام إثبات الدفع، بانتظار موافقة الإدارة. سيتم تفعيل الدورة فور تأكيد الدفع.'
                : isFree
                  ? 'اضغط على زر "سجّل الآن" للتسجيل المجاني ثم فتح الدورة.'
                  : 'يجب إكمال عملية الدفع أولاً لفتح هذه الدورة.'}
            </p>
            <Button variant="outline" onClick={onBack} className="bg-white/10 text-white border-white/30 hover:bg-white/20 rounded-xl">
              <ArrowRight className="w-4 h-4 ml-1" /> العودة
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* ⚡ Magical course header — hero with cover, dots, and progress */}
      <div className="relative overflow-hidden rounded-2xl shadow-xl border border-gold/30">
        {/* Cover image with overlay */}
        <div className="relative h-44 bg-gradient-to-br from-navy via-navy-light to-navy overflow-hidden">
          {course.cover && (
            <img src={course.cover} alt={course.title} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
          )}
          {/* Multi-layer gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/50 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-br from-gold/10 via-transparent to-transparent" />
          {/* Gold dot pattern */}
          <div className="absolute inset-0 opacity-25" style={{
            backgroundImage: 'radial-gradient(circle at 12% 50%, #D4AF37 1.5px, transparent 1.5px), radial-gradient(circle at 88% 20%, white 1px, transparent 1px)',
            backgroundSize: '24px 24px, 18px 18px'
          }} />
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-gold/15 rounded-full blur-3xl" />

          {/* Content overlay */}
          <div className="absolute bottom-4 right-4 left-4">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {course.level && (
                <Badge className="bg-navy/80 text-gold border-gold/30 backdrop-blur-sm">
                  <Sparkles className="w-3 h-3 ml-1" /> {course.level}
                </Badge>
              )}
              {isFree ? (
                <Badge className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white border border-emerald-300/40">
                  <Gift className="w-3 h-3 ml-1" /> مجانية
                </Badge>
              ) : (
                <Badge className="bg-gradient-to-r from-gold to-amber-500 text-navy border border-gold/40">
                  <Star className="w-3 h-3 ml-1 fill-current" /> {course.price?.toLocaleString()} {course.currency || 'ر.ي'}
                </Badge>
              )}
            </div>
            <h2 className="text-2xl font-bold mb-2 text-white drop-shadow-lg">{course.title}</h2>
            <div className="flex items-center gap-3 text-xs text-white/90 flex-wrap">
              <span className="flex items-center gap-1 bg-navy/40 backdrop-blur-sm rounded-lg px-2.5 py-1">
                <Clock className="w-3.5 h-3.5 text-gold" /> {course.duration_hours || 0} ساعة
              </span>
              <span className="flex items-center gap-1 bg-navy/40 backdrop-blur-sm rounded-lg px-2.5 py-1">
                <BookOpen className="w-3.5 h-3.5 text-gold" /> {modules.length} وحدة
              </span>
              <span className="flex items-center gap-1 bg-navy/40 backdrop-blur-sm rounded-lg px-2.5 py-1">
                <FileText className="w-3.5 h-3.5 text-gold" /> {allLessons.length} درس
              </span>
            </div>
          </div>
        </div>

        {/* Progress bar section — magical */}
        <div className="relative p-4 bg-gradient-to-br from-white to-gold/5 overflow-hidden">
          <div className="absolute -top-4 -left-4 w-12 h-12 bg-gold/15 rounded-full blur-xl" />
          <div className="relative flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-navy flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-gold" /> تقدّمك في الدورة
            </span>
            <span className={`text-sm font-extrabold px-2.5 py-0.5 rounded-full ${
              progress === 100 ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white' :
              progress > 50 ? 'bg-gradient-to-r from-gold to-amber-500 text-navy' :
              'bg-navy/10 text-navy'
            }`}>
              {progress}%
            </span>
          </div>
          <Progress value={progress} className="h-2.5" />
          <div className="text-xs text-muted-foreground mt-2 flex items-center justify-between">
            <span>{completedCount} من {allLessons.length} درس مكتمل</span>
            {progress === 100 && allLessons.length > 0 && (
              <span className="text-emerald-600 font-bold flex items-center gap-1">
                <Award className="w-3.5 h-3.5" /> أكملت الدورة!
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Back button — magical */}
      <Button variant="ghost" onClick={onBack} className="text-navy hover:bg-navy/5 rounded-xl">
        <ArrowRight className="w-4 h-4 ml-1" /> العودة لدوراتي
      </Button>

      {/* ⚡ Modules and lessons — magical accordion with SEQUENTIAL progression */}
      {modules.length === 0 ? (
        /* Magical empty state */
        <div className="text-center py-14">
          <div className="relative inline-block mb-4">
            <div className="absolute inset-0 bg-gold/20 rounded-full blur-2xl animate-pulse" />
            <div className="relative w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-navy via-navy-light to-navy flex items-center justify-center shadow-xl border border-gold/30">
              <BookOpen className="w-10 h-10 text-gold" />
            </div>
          </div>
          <h3 className="font-bold text-navy text-base mb-1.5">لا توجد وحدات في هذه الدورة بعد</h3>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto">سيقوم المدرب بإضافة الوحدات والدروس قريباً ✨</p>
        </div>
      ) : (
        <div className="space-y-3 fia-stagger">
          {modules.map((m, idx) => {
            const isExpanded = expanded.has(m.id)
            const lessons = m.lessons || []
            const moduleCompleted = lessons.length > 0 && lessons.every((l) => completedLessons.has(l.id))
            const moduleProgress = lessons.length > 0 ? Math.round((lessons.filter((l) => completedLessons.has(l.id)).length / lessons.length) * 100) : 0

            // ⚡ SEQUENTIAL MODULE PROGRESSION
            // A module is "passable" if it's empty (zero lessons — trainer
            // hasn't added any yet, don't block progression) OR all its
            // lessons are completed.
            // The first module is ALWAYS unlocked. Subsequent modules
            // are locked until the previous module (by position) is
            // "passable". This enforces strict order: the student CANNOT
            // open module 2 before completing module 1.
            const isModulePassable = (prevMod: Module) => {
              const prevLessons = prevMod.lessons || []
              if (prevLessons.length === 0) return true // empty module doesn't block
              return prevLessons.every((l) => completedLessons.has(l.id))
            }
            const moduleLocked = idx > 0 && !isModulePassable(modules[idx - 1])

            return (
              <Card key={m.id} className={`overflow-hidden border transition-colors ${
                moduleLocked
                  ? 'border-gray-200 opacity-90'
                  : 'border-gold/20 hover:border-gold/40'
              }`}>
                <button
                  onClick={() => !moduleLocked && toggleModule(m.id)}
                  disabled={moduleLocked}
                  className={`w-full flex items-center justify-between p-4 border-b transition-all text-right ${
                    moduleLocked
                      ? 'bg-gradient-to-l from-gray-50 to-white border-gray-100 cursor-not-allowed'
                      : 'bg-gradient-to-l from-muted/30 to-white border-gold/10 hover:from-gold/5 hover:to-white'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Module number badge — magical gradient */}
                    <div className={`relative w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 shadow-md ${
                      moduleLocked
                        ? 'bg-gray-200 text-gray-500'
                        : moduleCompleted
                          ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white'
                          : 'bg-gradient-to-br from-navy via-navy-light to-navy text-gold border border-gold/30'
                    }`}>
                      {moduleLocked ? <Lock className="w-4 h-4" /> : moduleCompleted ? <CheckCircle2 className="w-5 h-5" /> : idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-navy flex items-center gap-2">
                        {m.title}
                        {moduleCompleted && (
                          <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30 text-[9px]">مكتملة ✓</Badge>
                        )}
                        {moduleLocked && (
                          <Badge className="bg-gray-200 text-gray-600 border-gray-300 text-[9px] flex items-center gap-0.5">
                            <Lock className="w-2.5 h-2.5" /> مقفلة
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                        {m.description ? (
                          <span className="truncate">{m.description}</span>
                        ) : (
                          <span>{lessons.length} درس</span>
                        )}
                        {lessons.length > 0 && !moduleCompleted && !moduleLocked && (
                          <span className="text-gold font-bold">• {moduleProgress}%</span>
                        )}
                        {moduleLocked && (
                          <span className="text-gray-500 font-medium">أكمل الوحدة السابقة لفتحها</span>
                        )}
                      </div>
                    </div>
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
                      moduleLocked
                        ? 'bg-gray-100 text-gray-400'
                        : isExpanded ? 'bg-gold text-navy rotate-180' : 'bg-navy/5 text-gold'
                    }`}>
                      {moduleLocked ? <Lock className="w-3.5 h-3.5" /> : isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </button>
                {isExpanded && !moduleLocked && (
                  <div className="p-3 space-y-2 bg-gradient-to-b from-white to-muted/10">
                    {lessons.length === 0 ? (
                      <div className="text-center py-4 text-sm text-muted-foreground">لا توجد دروس في هذه الوحدة بعد</div>
                    ) : (
                      lessons.map((l, li) => {
                        const type = LESSON_TYPES[l.lesson_type] || LESSON_TYPES.text
                        const Icon = type.icon
                        const isCompleted = completedLessons.has(l.id)
                        // ⚡ Sequential access WITHIN the module:
                        // A lesson is locked if the previous lesson in
                        // the SAME module is not yet completed. The FIRST
                        // lesson in the module is always unlocked (since
                        // the module itself is unlocked by the outer
                        // moduleLocked check).
                        // We no longer bypass preview lessons — the user
                        // explicitly asked for strict order enforcement.
                        const isLocked = li > 0 && !isCompleted && !completedLessons.has(lessons[li - 1].id)
                        return (
                          <div
                            key={l.id}
                            className={`fia-card-hover flex items-center gap-3 p-3 rounded-xl border transition-all ${
                              isCompleted
                                ? 'bg-gradient-to-br from-emerald-50/80 to-teal-50/50 border-emerald-500/30'
                                : isLocked
                                  ? 'bg-gray-50 border-gray-200 opacity-60'
                                  : 'bg-white border-border hover:border-gold/30 hover:shadow-sm'
                            }`}
                          >
                            <button
                              onClick={() => !isLocked && setPreviewLesson(l)}
                              disabled={isLocked}
                              className={`flex items-center gap-3 flex-1 text-right min-w-0 ${isLocked ? 'cursor-not-allowed' : ''}`}
                            >
                              {/* Lesson status circle — magical */}
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${
                                isCompleted
                                  ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white'
                                  : isLocked
                                    ? 'bg-gray-300 text-gray-500'
                                    : `bg-gradient-to-br ${type.gradient} text-white`
                              }`}>
                                {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : isLocked ? <Lock className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                              </div>
                              <Badge className={type.color + ' flex-shrink-0'}>
                                <Icon className="w-3 h-3 ml-1" /> {type.label}
                              </Badge>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-navy text-sm flex items-center gap-2 truncate">
                                  {l.title}
                                  {l.is_preview && (
                                    <Badge variant="outline" className="text-[9px] bg-gold/10 text-gold border-gold/30 flex-shrink-0">
                                      <Sparkles className="w-2.5 h-2.5 ml-0.5" /> معاينة
                                    </Badge>
                                  )}
                                  {isLocked && (
                                    <span className="text-[9px] text-muted-foreground flex-shrink-0">🔒 أكمل الدرس السابق</span>
                                  )}
                                  {isCompleted && (
                                    <span className="text-[9px] text-emerald-600 font-bold flex-shrink-0">تمت المشاهدة ✓</span>
                                  )}
                                </div>
                                {l.duration_minutes ? (
                                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> {l.duration_minutes} دقيقة
                                  </div>
                                ) : null}
                              </div>
                            </button>
                            {/* ⚡ NO manual mark-complete button — completion
                                happens automatically when the student
                                actually views the lesson (video watched to
                                end / text scrolled to bottom / pdf dwell /
                                exam passed). The LessonPreviewModal fires
                                onLessonComplete(lesson) which calls our
                                markComplete(lesson) handler. */}
                          </div>
                        )
                      })
                    )}
                  </div>
                )}
                {moduleLocked && (
                  <div className="p-3 bg-gradient-to-b from-gray-50 to-white">
                    <div className="flex items-center gap-2 text-xs text-gray-500 justify-center py-2">
                      <Lock className="w-3.5 h-3.5" />
                      أكمل كل دروس الوحدة السابقة لفتح هذه الوحدة
                    </div>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* ⚡ Course reviews — magical container */}
      <Card className="p-6 border-2 border-gold/30 shadow-sm relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{
          backgroundImage: 'radial-gradient(circle at 20% 20%, #D4AF37 1px, transparent 1px)',
          backgroundSize: '14px 14px'
        }} />
        <div className="relative">
          <CourseReviews courseId={course.id} allowAdd={true} />
        </div>
      </Card>

      {/* ⚡ Certificate request — visible when course is fully completed (magical) */}
      {progress === 100 && allLessons.length > 0 && (
        <div className="relative p-5 rounded-2xl bg-gradient-to-br from-gold/10 to-amber-50/50 border-2 border-gold/40 overflow-hidden">
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: 'radial-gradient(circle at 12% 50%, #D4AF37 1.5px, transparent 1.5px), radial-gradient(circle at 88% 20%, white 1px, transparent 1px)',
            backgroundSize: '24px 24px, 18px 18px'
          }} />
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-gold/20 rounded-full blur-2xl" />
          <div className="relative">
            <CertificateRequest courseId={course.id} courseTitle={course.title} />
          </div>
        </div>
      )}

      {/* Lesson preview modal — passes onLessonComplete so viewing the
          lesson auto-completes it (video end / text scroll-bottom / pdf
          dwell / exam pass). Passes completedLessons so the modal's
          Next button can be disabled when the next lesson is locked
          (sequential progression enforced inside the modal too). */}
      <LessonPreviewModal
        open={!!previewLesson}
        onOpenChange={(o) => { if (!o) setPreviewLesson(null) }}
        lesson={previewLesson}
        modules={modules}
        completedLessons={completedLessons}
        onLessonComplete={(l: Lesson) => { markComplete(l) }}
        onNavigate={(l) => setPreviewLesson(l)}
      />
    </div>
  )
}
