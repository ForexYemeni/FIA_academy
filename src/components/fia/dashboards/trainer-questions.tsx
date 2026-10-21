'use client'

// ============================================================================
// TRAINER QUESTION BANK — Royal v4 (FIA Royal design language)
// The trainer manages the question bank of HIS OWN courses only.
// Reuses the exact same royal editor + design language as the admin bank.
// APIs: /api/exam-questions (shared)
// ============================================================================
import React, { useEffect, useState } from 'react'
import {
  HelpCircle, Plus, Edit, Trash2, CheckCircle2, BookOpen, Hash,
  Sparkles, Loader2, Search, Layers, CircleDot, ListOrdered,
  GraduationCap,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/fia/confirm-dialog'
import {
  LuxSection, LuxStats, LuxSearch, LuxSelect, LuxEmpty, LuxBadge,
} from './luxury'
import { ExamQuestionDialogRoyal, TYPE_META } from './admin-questions-royal'

export function TrainerQuestionBank({ courses }: { courses: any[] }) {
  const [selectedCourse, setSelectedCourse] = useState<string>('')
  const [items, setItems] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [loading, setLoading] = useState(false)

  // Auto-select the trainer's first course
  useEffect(() => {
    if (courses.length > 0 && !selectedCourse) setSelectedCourse(courses[0].id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courses])

  const loadQuestions = (courseId: string) => {
    if (!courseId) { setItems([]); return }
    setLoading(true)
    fetch(`/api/exam-questions?course_id=${courseId}`)
      .then((r) => r.json())
      .then((d) => setItems(Array.isArray(d) ? d : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadQuestions(selectedCourse) }, [selectedCourse])

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await fetch('/api/exam-questions', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: deleteTarget.id }) })
      toast.success('تم حذف السؤال')
      setDeleteTarget(null)
      if (selectedCourse) loadQuestions(selectedCourse)
    } finally { setDeleting(false) }
  }

  const selectedCourseObj = courses.find((c) => c.id === selectedCourse)
  const filtered = items.filter((q) => {
    if (typeFilter && q.question_type !== typeFilter) return false
    if (!search.trim()) return true
    const s = search.toLowerCase()
    return (q.prompt || '').toLowerCase().includes(s) || (q.explanation || '').toLowerCase().includes(s)
  })

  // Stats
  const mcqCount = items.filter((q) => q.question_type === 'mcq').length
  const tfCount = items.filter((q) => q.question_type === 'truefalse').length
  const totalPoints = items.reduce((a, q) => a + (parseInt(q.points) || 0), 0)

  return (
    <LuxSection
      title="بنك أسئلة دوراتي"
      subtitle={selectedCourseObj ? `أسئلة اختبارات دورة: ${selectedCourseObj.title}` : 'أضف وأدر أسئلة اختبارات دوراتك التدريبية'}
      icon={HelpCircle}
      themeKey="questions"
      count={filtered.length}
      stats={
        selectedCourse ? (
          <LuxStats
            items={[
              { icon: Layers, label: 'إجمالي الأسئلة', value: items.length, grad: 'from-purple-600 to-fuchsia-700' },
              { icon: ListOrdered, label: 'اختيار متعدد', value: mcqCount, grad: 'from-indigo-500 to-purple-600' },
              { icon: CircleDot, label: 'صح / خطأ', value: tfCount, grad: 'from-emerald-500 to-teal-600' },
              { icon: Hash, label: 'مجموع النقاط', value: totalPoints, grad: 'from-amber-500 to-orange-600' },
            ]}
          />
        ) : undefined
      }
      actions={
        <Button
          className="relative bg-gradient-to-l from-gold to-amber-500 hover:from-amber-500 hover:to-gold text-navy rounded-xl shadow-lg active:scale-[0.97] transition-all font-extrabold overflow-hidden"
          disabled={!selectedCourse}
          onClick={() => { setEditing(null); setOpen(true) }}
        >
          <span className="absolute inset-0 lux-shimmer" />
          <Plus className="w-4 h-4 ml-1 relative" /> سؤال جديد
        </Button>
      }
      toolbar={
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          <LuxSelect
            value={selectedCourse}
            onChange={setSelectedCourse}
            placeholder="— اختر دورة من دوراتك —"
            options={courses.map((c) => ({ value: c.id, label: c.title, emoji: '📘' }))}
          />
          <LuxSearch value={search} onChange={setSearch} placeholder="ابحث في نص السؤال..." className="lg:col-span-2" />
          <LuxSelect value={typeFilter} onChange={setTypeFilter} placeholder="كل الأنواع"
            options={[
              { value: 'mcq', label: 'اختيار من متعدد', emoji: '📋' },
              { value: 'truefalse', label: 'صح / خطأ', emoji: '⚖️' },
              { value: 'short_answer', label: 'إجابة قصيرة', emoji: '✍️' },
            ]} />
        </div>
      }
    >
      {courses.length === 0 ? (
        <LuxEmpty icon={GraduationCap} themeKey="questions" title="لا توجد دورات مسجلة باسمك بعد"
          hint="أنشئ دورتك الأولى من قسم «دوراتي التدريبية» ثم ارجع هنا لبناء بنك أسئلتها" />
      ) : !selectedCourse ? (
        <LuxEmpty icon={BookOpen} themeKey="questions" title="اختر دورة أولاً" hint="اختر دورة من القائمة أعلاه لعرض أسئلتها أو إضافة سؤال جديد" />
      ) : loading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin text-gold" />
          <span className="text-sm font-bold">جاري تحميل الأسئلة...</span>
        </div>
      ) : filtered.length === 0 ? (
        <LuxEmpty
          icon={HelpCircle}
          themeKey="questions"
          title={search || typeFilter ? 'لا توجد نتائج مطابقة' : 'لا توجد أسئلة بعد'}
          hint={search || typeFilter ? 'جرّب تعديل البحث أو الفلاتر' : 'ابدأ ببناء بنك أسئلة هذه الدورة — أسئلتك هي اختبار المتدربين وشرط الحصول على الشهادة'}
          action={items.length === 0 ? (
            <Button className="bg-gradient-to-l from-gold to-amber-500 hover:from-amber-500 hover:to-gold text-navy rounded-xl shadow-md font-bold" onClick={() => { setEditing(null); setOpen(true) }}>
              <Plus className="w-4 h-4 ml-1" /> إضافة أول سؤال
            </Button>
          ) : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 fia-stagger">
          {filtered.map((q, i) => {
            const meta = TYPE_META[q.question_type] || TYPE_META.mcq
            const difficultyTone = q.difficulty === 'سهل' ? 'green' : q.difficulty === 'صعب' ? 'red' : 'amber'
            const opts = Array.isArray(q.options) ? q.options : []
            const correctIdx = typeof q.correct_answer === 'number' ? q.correct_answer : opts.findIndex((o: any) => o === q.correct_answer)
            return (
              <Card key={q.id} className="fia-card-hover p-0 border border-gold/25 overflow-hidden">
                <div className="h-1.5 bg-gradient-to-l from-purple-500 via-fuchsia-400 to-purple-500 opacity-80" />
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                      <div className={`relative w-11 h-11 rounded-xl bg-gradient-to-br ${meta.grad} flex items-center justify-center shadow-md`}>
                        <meta.icon className="w-5 h-5 text-white" />
                        <span className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-navy text-gold text-[9px] font-extrabold flex items-center justify-center border border-gold/50 tabular-nums">{i + 1}</span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                        <LuxBadge tone={meta.tone}>{meta.label}</LuxBadge>
                        <LuxBadge tone={difficultyTone}>{q.difficulty}</LuxBadge>
                        <LuxBadge tone="navy"><Hash className="w-2.5 h-2.5" /> {q.points} نقطة</LuxBadge>
                      </div>
                      <p className="font-extrabold text-navy text-sm leading-relaxed mb-2">{q.prompt}</p>
                      {opts.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mb-2">
                          {opts.map((o: any, idx: number) => {
                            const isCorrect = correctIdx === idx || q.correct_answer === o
                            return (
                              <div key={idx} className={`flex items-center gap-1.5 text-[11px] rounded-lg px-2 py-1.5 border ${
                                isCorrect ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-700 font-bold' : 'bg-muted/25 border-border/50 text-muted-foreground'
                              }`}>
                                <span className={`w-4 h-4 rounded flex items-center justify-center text-[9px] font-extrabold flex-shrink-0 ${
                                  isCorrect ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground'
                                }`}>{String.fromCharCode(1571 + idx)}</span>
                                <span className="line-clamp-1">{o}</span>
                                {isCorrect && <CheckCircle2 className="w-3 h-3 ml-auto flex-shrink-0" />}
                              </div>
                            )
                          })}
                        </div>
                      )}
                      {q.question_type === 'truefalse' && (
                        <div className="flex gap-1.5 mb-2">
                          <span className={`text-[11px] rounded-lg px-2.5 py-1 border font-bold ${q.correct_answer === true ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-700' : 'bg-muted/25 border-border/50 text-muted-foreground'}`}>✓ صح</span>
                          <span className={`text-[11px] rounded-lg px-2.5 py-1 border font-bold ${q.correct_answer === false ? 'bg-rose-500/10 border-rose-500/35 text-rose-700' : 'bg-muted/25 border-border/50 text-muted-foreground'}`}>✗ خطأ</span>
                        </div>
                      )}
                      {q.question_type === 'short_answer' && typeof q.correct_answer === 'string' && (
                        <div className="text-[11px] rounded-lg px-2.5 py-1.5 border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 font-bold mb-2 inline-flex items-center gap-1.5">
                          <CheckCircle2 className="w-3 h-3" /> الإجابة: {q.correct_answer}
                        </div>
                      )}
                      {q.explanation && (
                        <div className="text-[11px] text-muted-foreground bg-gold/[0.06] border border-gold/20 rounded-lg px-2.5 py-1.5 leading-relaxed">
                          <Sparkles className="w-3 h-3 inline text-gold ml-1" /> {q.explanation}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5 flex-shrink-0">
                      <Button size="sm" variant="outline" className="w-9 h-9 p-0 border-gold/30 hover:bg-gold/10 hover:border-gold rounded-lg" onClick={() => { setEditing(q); setOpen(true) }} title="تعديل">
                        <Edit className="w-3.5 h-3.5 text-navy" />
                      </Button>
                      <Button size="sm" variant="outline" className="w-9 h-9 p-0 border-rose-500/30 text-rose-500 hover:bg-rose-500/10 rounded-lg" onClick={() => setDeleteTarget(q)} title="حذف">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {open && (
        <ExamQuestionDialogRoyal
          open={open}
          onOpenChange={setOpen}
          initial={editing}
          courseId={selectedCourse}
          courseTitle={selectedCourseObj?.title}
          onSaved={() => { setOpen(false); if (selectedCourse) loadQuestions(selectedCourse) }}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o && !deleting) setDeleteTarget(null) }}
        title="تأكيد حذف السؤال"
        message="هل أنت متأكد من الحذف؟"
        itemLabel="سيتم حذف السؤال التالي:"
        itemName={deleteTarget?.prompt}
        confirmLabel="حذف"
        cancelLabel="إلغاء"
        variant="danger"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </LuxSection>
  )
}
