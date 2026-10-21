'use client'

// ============================================================================
// ADMIN EXAM QUESTIONS BANK — Royal v3 redesign (FIA Royal design language)
// Data logic & APIs unchanged: /api/courses, /api/exam-questions
// ============================================================================
import React, { useEffect, useState } from 'react'
import {
  HelpCircle, Plus, Edit, Trash2, CheckCircle2, X, BookOpen, Award, Hash,
  FileText, Sparkles, Loader2, Search, Layers, CircleDot, ListOrdered,
  Type, XCircle, Settings, Timer, Coins, Copy, Database, AlertTriangle, Infinity as InfinityIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ConfirmDialog } from '@/components/fia/confirm-dialog'
import {
  LuxSection, LuxStats, LuxSearch, LuxSelect, LuxEmpty, LuxBadge,
  LuxField, LuxDialog, LuxSaveBar, luxInput,
} from './luxury'

// Shared type metadata — reused by the trainer question bank (trainer-questions.tsx)
export const TYPE_META: Record<string, { label: string; icon: any; tone: string; grad: string }> = {
  mcq: { label: 'اختيار من متعدد', icon: ListOrdered, tone: 'purple', grad: 'from-purple-500 to-fuchsia-600' },
  truefalse: { label: 'صح / خطأ', icon: CircleDot, tone: 'emerald', grad: 'from-emerald-500 to-teal-600' },
  short_answer: { label: 'إجابة قصيرة', icon: Type, tone: 'amber', grad: 'from-amber-500 to-orange-600' },
}

export function AdminExamQuestionsRoyal() {
  const [courses, setCourses] = useState<any[]>([])
  const [selectedCourse, setSelectedCourse] = useState<string>('')
  const [items, setItems] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [loading, setLoading] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    fetch('/api/courses').then((r) => r.json()).then((d) => {
      const arr = Array.isArray(d) ? d : []
      setCourses(arr)
      if (arr.length > 0 && !selectedCourse) setSelectedCourse(arr[0].id)
    }).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
  const examDuration = Number(selectedCourseObj?.exam_duration_minutes) || 0
  const retakeFee = Number(selectedCourseObj?.retake_fee) || 0
  const filtered = items.filter((q) => {
    if (typeFilter && q.question_type !== typeFilter) return false
    if (!search.trim()) return true
    const s = search.toLowerCase()
    return (q.prompt || '').toLowerCase().includes(s) || (q.explanation || '').toLowerCase().includes(s)
  })

  // Stats
  const mcqCount = items.filter((q) => q.question_type === 'mcq').length
  const tfCount = items.filter((q) => q.question_type === 'truefalse').length
  const saCount = items.filter((q) => q.question_type === 'short_answer').length
  const totalPoints = items.reduce((a, q) => a + (parseInt(q.points) || 0), 0)

  return (
    <LuxSection
      title="بنك الأسئلة"
      subtitle={selectedCourseObj ? `أسئلة اختبارات دورة: ${selectedCourseObj.title}` : 'مكتبة أسئلة الاختبارات لجميع الدورات'}
      icon={HelpCircle}
      themeKey="questions"
      count={filtered.length}
      stats={
        selectedCourse ? (
          <LuxStats
            items={[
              { icon: Layers, label: 'إجمالي الأسئلة', value: items.length, grad: 'from-purple-600 to-fuchsia-700' },
              { icon: ListOrdered, label: 'اختيار متعدد', value: mcqCount, grad: 'from-indigo-500 to-purple-600' },
              { icon: Timer, label: 'مدة الاختبار', value: examDuration > 0 ? `${examDuration} د` : 'بلا حد', grad: 'from-sky-500 to-indigo-600' },
              { icon: Coins, label: 'رسوم الإعادة', value: retakeFee > 0 ? `${retakeFee.toLocaleString()}` : 'غير متاحة', grad: 'from-amber-500 to-orange-600' },
            ]}
          />
        ) : undefined
      }
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="border-gold/40 hover:bg-gold/10 hover:border-gold text-navy rounded-xl shadow-sm font-extrabold"
            disabled={!selectedCourse}
            onClick={() => setSettingsOpen(true)}
            title="مدة الاختبار ورسوم الإعادة"
          >
            <Settings className="w-4 h-4 ml-1" /> إعدادات الاختبار
          </Button>
          <Button
            className="relative bg-gradient-to-l from-gold to-amber-500 hover:from-amber-500 hover:to-gold text-navy rounded-xl shadow-lg active:scale-[0.97] transition-all font-extrabold overflow-hidden"
            disabled={!selectedCourse}
            onClick={() => { setEditing(null); setOpen(true) }}
          >
            <span className="absolute inset-0 lux-shimmer" />
            <Plus className="w-4 h-4 ml-1 relative" /> سؤال جديد
          </Button>
        </div>
      }
      toolbar={
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          <LuxSelect
            value={selectedCourse}
            onChange={setSelectedCourse}
            placeholder="— اختر دورة —"
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
      {!selectedCourse ? (
        <LuxEmpty icon={BookOpen} themeKey="questions" title="اختر دورة أولاً" hint="اختر دورة من القائمة أعلاه لعرض أسئلتها أو إضافة سؤال جديد لبنك الأسئلة" />
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
          hint={search || typeFilter ? 'جرّب تعديل البحث أو الفلاتر' : 'ابدأ ببناء بنك أسئلة هذه الدورة — اضغط "سؤال جديد" لإضافة أول سؤال'}
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
                {/* Header strip */}
                <div className="h-1.5 bg-gradient-to-l from-purple-500 via-fuchsia-400 to-purple-500 opacity-80" />
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Number + type tile */}
                    <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                      <div className={`relative w-11 h-11 rounded-xl bg-gradient-to-br ${meta.grad} flex items-center justify-center shadow-md`}>
                        <meta.icon className="w-5 h-5 text-white" />
                        <span className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-navy text-gold text-[9px] font-extrabold flex items-center justify-center border border-gold/50 tabular-nums">{i + 1}</span>
                      </div>
                    </div>
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                        <LuxBadge tone={meta.tone}>{meta.label}</LuxBadge>
                        <LuxBadge tone={difficultyTone}>{q.difficulty}</LuxBadge>
                        <LuxBadge tone="navy"><Hash className="w-2.5 h-2.5" /> {q.points} نقطة</LuxBadge>
                      </div>
                      <p className="font-extrabold text-navy text-sm leading-relaxed mb-2">{q.prompt}</p>
                      {/* Options */}
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
                      {/* Explanation */}
                      {q.explanation && (
                        <div className="text-[11px] text-muted-foreground bg-gold/[0.06] border border-gold/20 rounded-lg px-2.5 py-1.5 leading-relaxed">
                          <Sparkles className="w-3 h-3 inline text-gold ml-1" /> {q.explanation}
                        </div>
                      )}
                    </div>
                    {/* Actions */}
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

      {settingsOpen && selectedCourseObj && (
        <ExamSettingsDialog
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          course={selectedCourseObj}
          onSaved={(updated: any) => {
            // Refresh the courses list so the new stats reflect instantly
            fetch('/api/courses').then((r) => r.json()).then((d) => {
              const arr = Array.isArray(d) ? d : []
              setCourses(arr)
            }).catch(() => {})
          }}
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

// ============================================================================
// EXAM SETTINGS DIALOG — royal per-course exam configuration (admin + trainer)
// - exam_duration_minutes: countdown shown to the student during the exam
//   (empty/0 = unlimited). Anchored server-side — tamper-resistant.
// - retake_fee: the paid-retake fee. 0 = retakes NOT possible at all.
//   When > 0, students pay it (with proof) and the admin approves from the
//   payments inbox to unlock exactly ONE more attempt.
// ============================================================================
export function ExamSettingsDialog({ open, onOpenChange, course, onSaved }: any) {
  const [duration, setDuration] = useState<string>('')
  const [fee, setFee] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [needsMigration, setNeedsMigration] = useState(false)

  useEffect(() => {
    if (!open) return
    setNeedsMigration(false)
    const d = Number(course?.exam_duration_minutes)
    const f = Number(course?.retake_fee)
    setDuration(course && course.exam_duration_minutes != null && d > 0 ? String(d) : '')
    setFee(course && course.retake_fee != null && f > 0 ? String(f) : '')
  }, [open, course?.id])

  const copySql = () => {
    const sql = `ALTER TABLE courses ADD COLUMN IF NOT EXISTS exam_duration_minutes INT DEFAULT NULL;\nALTER TABLE courses ADD COLUMN IF NOT EXISTS retake_fee NUMERIC DEFAULT 0;\nNOTIFY pgrst, 'reload schema';`
    navigator.clipboard?.writeText(sql)
    toast.success('تم نسخ أمر SQL — نفّذه في Supabase SQL Editor')
  }

  const save = async () => {
    if (!course?.id) return
    setSaving(true)
    try {
      const res = await fetch('/api/courses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: course.id,
          exam_duration_minutes: duration.trim() === '' ? null : Math.max(0, parseInt(duration) || 0),
          retake_fee: fee.trim() === '' ? 0 : Math.max(0, parseFloat(fee) || 0),
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'فشل الحفظ'); return }
      // Graceful-degradation check: if the API fell back (columns missing),
      // the returned row won't carry the new fields.
      if (!('exam_duration_minutes' in (data || {}))) {
        setNeedsMigration(true)
        toast.error('تحتاج قاعدة البيانات ترقية أولاً — انسخ أمر SQL بالأعلى ونفّذه في Supabase SQL Editor ثم أعد الحفظ')
        return
      }
      toast.success('تم حفظ إعدادات الاختبار بنجاح')
      onSaved?.(data)
      onOpenChange(false)
    } finally { setSaving(false) }
  }

  const currency = course?.currency || 'ر.ي'

  return (
    <LuxDialog
      open={open}
      onOpenChange={onOpenChange}
      title="إعدادات الاختبار"
      subtitle={course?.title ? `دورة: ${course.title}` : 'تحكم وقت الاختبار ورسوم إعادة الاختبار'}
      icon={Settings}
      gradient="from-[#1b1035] via-purple-900 to-fuchsia-900"
      maxWidth="sm:max-w-lg"
      footer={
        <LuxSaveBar
          onCancel={() => onOpenChange(false)}
          onSave={save}
          saving={saving}
          saveLabel="حفظ الإعدادات"
          icon={CheckCircle2}
          gradient="from-gold to-amber-500"
          text="text-navy"
        />
      }
    >
      <div className="space-y-4">
        {/* Migration warning — graceful degradation before the SQL upgrade */}
        {needsMigration && (
          <div className="rounded-xl border-2 border-amber-500/40 bg-amber-50/70 p-3 space-y-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-800 font-bold leading-relaxed">
                قاعدة البيانات تحتاج ترقية (عمودان جديدان) — انسخ الأمر التالي ونفّذه في Supabase Dashboard → SQL Editor ثم أعد الحفظ:
              </p>
            </div>
            <button type="button" onClick={copySql}
              className="w-full flex items-center justify-between gap-2 rounded-lg bg-white/80 border border-amber-300/60 px-3 py-2 hover:bg-amber-100/60 transition-colors">
              <code className="text-[10px] font-mono text-navy text-right leading-relaxed" dir="ltr">ALTER TABLE courses ADD COLUMN IF NOT EXISTS exam_duration_minutes INT DEFAULT NULL; ...</code>
              <span className="flex items-center gap-1 text-[10px] font-extrabold text-amber-700 flex-shrink-0"><Copy className="w-3 h-3" /> نسخ SQL</span>
            </button>
          </div>
        )}

        {/* Duration */}
        <LuxField label="مدة الاختبار (بالدقائق)" icon={Timer} hint="فارغ = بلا حد زمني">
          <div className="flex items-center gap-2">
            <Input type="number" min={0} value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="بلا حد" className={`${luxInput} text-center font-bold`} dir="ltr" />
            <span className="text-xs font-bold text-muted-foreground flex-shrink-0">دقيقة</span>
            {duration !== '' && (
              <button type="button" onClick={() => setDuration('')} title="إلغاء الحد الزمني"
                className="w-9 h-11 rounded-xl border border-gold/30 bg-white hover:bg-gold/10 flex items-center justify-center flex-shrink-0">
                <InfinityIcon className="w-4 h-4 text-navy" />
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {[15, 30, 45, 60, 90, 120].map((v) => (
              <button key={v} type="button" onClick={() => setDuration(String(v))}
                className={`px-3 py-1.5 rounded-lg border text-[10px] font-extrabold transition-all ${
                  duration === String(v) ? 'border-transparent bg-gradient-to-br from-purple-600 to-fuchsia-700 text-white shadow-md' : 'border-gold/25 bg-white text-muted-foreground hover:border-gold/50'
                }`}>{v} دقيقة</button>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed flex items-start gap-1">
            <Timer className="w-3 h-3 flex-shrink-0 mt-0.5 text-purple-500" />
            يرى المتدرب عدّاداً تنازلياً فاخراً أثناء الاختبار، وعند انتهاء الوقت يُسلَّم الاختبار تلقائياً ويُصحَّح فوراً. الوقت محسوب من السيرفر فلا يمكن التلاعب به.
          </p>
        </LuxField>

        {/* Retake fee */}
        <LuxField label="رسوم إعادة الاختبار" icon={Coins} hint="0 = الإعادة غير متاحة نهائياً">
          <div className="flex items-center gap-2">
            <Input type="number" min={0} value={fee} onChange={(e) => setFee(e.target.value)} placeholder="0 — إعادة غير متاحة" className={`${luxInput} text-center font-bold`} dir="ltr" />
            <span className="text-xs font-bold text-muted-foreground flex-shrink-0">{currency}</span>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {[1000, 2000, 5000, 10000].map((v) => (
              <button key={v} type="button" onClick={() => setFee(String(v))}
                className={`px-3 py-1.5 rounded-lg border text-[10px] font-extrabold transition-all ${
                  fee === String(v) ? 'border-transparent bg-gradient-to-br from-gold to-amber-500 text-navy shadow-md' : 'border-gold/25 bg-white text-muted-foreground hover:border-gold/50'
                }`} dir="ltr">{v.toLocaleString()} {currency}</button>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed flex items-start gap-1">
            <Coins className="w-3 h-3 flex-shrink-0 mt-0.5 text-amber-500" />
            المحاولة الأولى مجانية دائماً. بعد إكمالها لا يستطيع المتدرب إعادة الاختبار أبداً، إلا إذا دفع هذه الرسوم (طرق الدفع + رفع إثبات الدفع) واعتمدت الإدارة الطلب من صندوق المدفوعات — فيُفتح له محاولة واحدة جديدة فقط.
          </p>
        </LuxField>

        {/* Current values summary */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-gold/25 bg-gradient-to-br from-gold/[0.07] to-transparent p-2.5 text-center">
            <p className="text-[9px] font-bold text-muted-foreground">المدة الحالية</p>
            <p className={`text-sm font-extrabold ${duration ? 'text-purple-700' : 'text-muted-foreground'}`}>
              {duration ? `${duration} دقيقة` : 'بلا حد زمني'}
            </p>
          </div>
          <div className="rounded-xl border border-gold/25 bg-gradient-to-br from-gold/[0.07] to-transparent p-2.5 text-center">
            <p className="text-[9px] font-bold text-muted-foreground">رسوم الإعادة الحالية</p>
            <p className={`text-sm font-extrabold ${fee ? 'text-amber-600' : 'text-muted-foreground'}`} dir="ltr">
              {fee ? `${Number(fee).toLocaleString()} ${currency}` : 'إعادة غير متاحة'}
            </p>
          </div>
        </div>
      </div>
    </LuxDialog>
  )
}

// ============================================================================
// EXAM QUESTION DIALOG — royal editor (shared: admin + trainer question banks)
// ============================================================================
export function ExamQuestionDialogRoyal({ open, onOpenChange, initial, courseId, courseTitle, onSaved }: any) {
  const [form, setForm] = useState<any>(initial || {
    course_id: courseId, question_type: 'mcq', prompt: '',
    options: ['', '', '', ''], correct_answer: 0, explanation: '', difficulty: 'متوسط', points: 1,
  })
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    if (!initial) {
      setForm({
        course_id: courseId, question_type: 'mcq', prompt: '',
        options: ['', '', '', ''], correct_answer: 0, explanation: '', difficulty: 'متوسط', points: 1,
      })
      return
    }
    // Normalize truefalse correct_answer to the string tokens used by the UI
    const normalized = { ...initial }
    if (normalized.question_type === 'truefalse') {
      normalized.correct_answer = normalized.correct_answer === true || normalized.correct_answer === 'true'
        ? 'true'
        : normalized.correct_answer === false || normalized.correct_answer === 'false' ? 'false' : 'true'
    }
    setForm(normalized)
  }, [initial, courseId])

  const save = async () => {
    if (!form.prompt) { toast.error('نص السؤال مطلوب'); return }
    setSaving(true)
    try {
      const payload = {
        course_id: form.course_id,
        question_type: form.question_type,
        prompt: form.prompt,
        options: form.question_type === 'mcq' ? form.options.filter((o: string) => o.trim()) : null,
        correct_answer: form.question_type === 'truefalse' ? form.correct_answer === 'true' : form.correct_answer,
        explanation: form.explanation || null,
        difficulty: form.difficulty,
        points: parseInt(form.points) || 1,
      }
      const res = await fetch('/api/exam-questions', {
        method: initial ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(initial ? { id: initial.id, ...payload } : payload),
      })
      if (res.ok) {
        toast.success(initial ? 'تم تحديث السؤال' : 'تمت إضافة السؤال للبنك')
        onSaved()
      } else {
        const d = await res.json(); toast.error(d.error || 'فشل')
      }
    } finally { setSaving(false) }
  }

  const isMcq = form.question_type === 'mcq'
  const isTf = form.question_type === 'truefalse'
  const isSa = form.question_type === 'short_answer'

  return (
    <LuxDialog
      open={open}
      onOpenChange={onOpenChange}
      title={initial ? 'تعديل السؤال' : 'إضافة سؤال جديد'}
      subtitle={courseTitle ? `بنك أسئلة: ${courseTitle}` : 'محرر أسئلة الاختبارات'}
      icon={HelpCircle}
      gradient="from-[#1b1035] via-purple-900 to-fuchsia-900"
      maxWidth="sm:max-w-2xl"
      footer={
        <LuxSaveBar
          onCancel={() => onOpenChange(false)}
          onSave={save}
          saving={saving}
          saveLabel={initial ? 'حفظ التعديلات' : 'إضافة السؤال'}
          icon={CheckCircle2}
          gradient="from-gold to-amber-500"
          text="text-navy"
        />
      }
    >
      {/* Question type — royal segmented cards */}
      <LuxField label="نوع السؤال" icon={Layers} required>
        <div className="grid grid-cols-3 gap-2">
          {[
            { key: 'mcq', label: 'اختيار متعدد', icon: ListOrdered, grad: 'from-purple-500 to-fuchsia-600' },
            { key: 'truefalse', label: 'صح / خطأ', icon: CircleDot, grad: 'from-emerald-500 to-teal-600' },
            { key: 'short_answer', label: 'إجابة قصيرة', icon: Type, grad: 'from-amber-500 to-orange-600' },
          ].map((t) => {
            const active = form.question_type === t.key
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setForm({ ...form, question_type: t.key, correct_answer: t.key === 'truefalse' ? 'true' : t.key === 'mcq' ? 0 : '' })}
                className={`relative rounded-xl border-2 p-3 flex flex-col items-center gap-1.5 transition-all overflow-hidden ${
                  active ? 'border-gold bg-gradient-to-b from-gold/10 to-transparent shadow-md scale-[1.02]' : 'border-border/60 bg-white hover:border-gold/40'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${t.grad} flex items-center justify-center shadow-sm`}>
                  <t.icon className="w-4 h-4 text-white" />
                </div>
                <span className={`text-[10px] font-extrabold ${active ? 'text-navy' : 'text-muted-foreground'}`}>{t.label}</span>
                {active && <CheckCircle2 className="absolute top-1.5 left-1.5 w-3.5 h-3.5 text-gold" />}
              </button>
            )
          })}
        </div>
      </LuxField>

      {/* Question text */}
      <LuxField label="نص السؤال" icon={FileText} required>
        <Textarea value={form.prompt} onChange={(e) => setForm({ ...form, prompt: e.target.value })} rows={3} className="rounded-xl border-gold/30 focus:border-gold focus:ring-2 focus:ring-gold/25 transition-all" placeholder="اكتب نص السؤال هنا..." />
      </LuxField>

      {/* MCQ options */}
      {isMcq && (
        <LuxField label="الخيارات — اضغط على الدائرة لتحديد الإجابة الصحيحة" icon={ListOrdered} required>
          <div className="space-y-2">
            {form.options.map((opt: string, idx: number) => (
              <div key={idx} className={`flex items-center gap-2 rounded-xl border p-1.5 transition-all ${
                form.correct_answer === idx ? 'border-emerald-500/50 bg-emerald-500/[0.06] shadow-sm' : 'border-gold/25 bg-white'
              }`}>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, correct_answer: idx })}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold transition-all flex-shrink-0 ${
                    form.correct_answer === idx
                      ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md scale-105 ring-2 ring-emerald-300'
                      : 'bg-muted/40 text-muted-foreground hover:bg-gold/15 hover:text-navy'
                  }`}
                  title="تحديد كإجابة صحيحة"
                >
                  {String.fromCharCode(1571 + idx)}
                </button>
                <Input value={opt} onChange={(e) => {
                  const newOpts = [...form.options]; newOpts[idx] = e.target.value; setForm({ ...form, options: newOpts })
                }} placeholder={`نص الخيار ${String.fromCharCode(1571 + idx)}`} className="border-0 shadow-none focus-visible:ring-0 font-medium" />
                {form.correct_answer === idx && <LuxBadge tone="green">الصحيحة</LuxBadge>}
                {form.options.length > 2 && (
                  <button type="button" onClick={() => setForm({ ...form, options: form.options.filter((_: any, i: number) => i !== idx) })}
                    className="w-7 h-7 rounded-lg hover:bg-rose-500/10 flex items-center justify-center flex-shrink-0 transition-colors">
                    <X className="w-4 h-4 text-rose-500" />
                  </button>
                )}
              </div>
            ))}
            {form.options.length < 6 && (
              <Button size="sm" variant="outline" className="border-gold/30 hover:bg-gold/5 rounded-xl border-dashed" onClick={() => setForm({ ...form, options: [...form.options, ''] })}>
                <Plus className="w-3.5 h-3.5 ml-1" /> إضافة خيار
              </Button>
            )}
          </div>
        </LuxField>
      )}

      {/* True/False */}
      {isTf && (
        <LuxField label="الإجابة الصحيحة" icon={CircleDot} required>
          <div className="grid grid-cols-2 gap-2.5">
            <button type="button" onClick={() => setForm({ ...form, correct_answer: 'true' })}
              className={`py-3.5 rounded-xl border-2 font-extrabold flex items-center justify-center gap-2 transition-all ${
                form.correct_answer === 'true' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 shadow-md scale-[1.02]' : 'border-gold/25 bg-white text-muted-foreground hover:border-emerald-500/40'
              }`}>
              <CheckCircle2 className="w-5 h-5" /> صح
            </button>
            <button type="button" onClick={() => setForm({ ...form, correct_answer: 'false' })}
              className={`py-3.5 rounded-xl border-2 font-extrabold flex items-center justify-center gap-2 transition-all ${
                form.correct_answer === 'false' ? 'border-rose-500 bg-rose-500/10 text-rose-700 shadow-md scale-[1.02]' : 'border-gold/25 bg-white text-muted-foreground hover:border-rose-500/40'
              }`}>
              <XCircle className="w-5 h-5" /> خطأ
            </button>
          </div>
        </LuxField>
      )}

      {/* Short answer */}
      {isSa && (
        <LuxField label="الإجابة الصحيحة (تتم المقارنة بدون حساسية لحالة الأحرف)" icon={Type} required>
          <Input value={typeof form.correct_answer === 'string' ? form.correct_answer : ''} onChange={(e) => setForm({ ...form, correct_answer: e.target.value })} className={luxInput} placeholder="اكتب الإجابة النموذجية..." />
        </LuxField>
      )}

      {/* Difficulty + points */}
      <div className="grid grid-cols-2 gap-3">
        <LuxField label="مستوى الصعوبة" icon={Award}>
          <div className="grid grid-cols-3 gap-1.5">
            {['سهل', 'متوسط', 'صعب'].map((d) => {
              const active = form.difficulty === d
              const tone = d === 'سهل' ? 'emerald' : d === 'صعب' ? 'rose' : 'amber'
              const cls = tone === 'emerald' ? 'from-emerald-500 to-teal-600' : tone === 'rose' ? 'from-rose-500 to-red-600' : 'from-amber-500 to-orange-600'
              return (
                <button key={d} type="button" onClick={() => setForm({ ...form, difficulty: d })}
                  className={`py-2.5 rounded-xl border-2 text-xs font-extrabold transition-all ${
                    active ? `border-transparent bg-gradient-to-br ${cls} text-white shadow-md scale-[1.03]` : 'border-gold/25 bg-white text-muted-foreground hover:border-gold/50'
                  }`}>
                  {d}
                </button>
              )
            })}
          </div>
        </LuxField>
        <LuxField label="النقاط" icon={Hash}>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setForm({ ...form, points: Math.max(1, (parseInt(form.points) || 1) - 1) })}
              className="w-9 h-11 rounded-xl border border-gold/30 bg-white hover:bg-gold/10 text-navy font-bold shadow-sm transition-colors">−</button>
            <Input type="number" value={form.points || ''} onChange={(e) => setForm({ ...form, points: e.target.value })} className={luxInput + ' text-center font-bold'} />
            <button type="button" onClick={() => setForm({ ...form, points: (parseInt(form.points) || 1) + 1 })}
              className="w-9 h-11 rounded-xl border border-gold/30 bg-white hover:bg-gold/10 text-navy font-bold shadow-sm transition-colors">+</button>
          </div>
        </LuxField>
      </div>

      {/* Explanation */}
      <LuxField label="شرح الإجابة (يظهر للمتدرب بعد الإجابة)" icon={BookOpen} hint="اختياري">
        <Textarea value={form.explanation} onChange={(e) => setForm({ ...form, explanation: e.target.value })} rows={2} className="rounded-xl border-gold/30 focus:border-gold focus:ring-2 focus:ring-gold/25 transition-all" placeholder="اكتب شرحاً تعليمياً موجزاً..." />
      </LuxField>
    </LuxDialog>
  )
}
