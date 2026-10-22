'use client'

// ============================================================================
// TRAINER RESULTS CENTER — Royal v4
// ----------------------------------------------------------------------------
// Tab 1: نتائج المتدربين — every trainee exam attempt in THIS trainer's courses,
//        with the royal correction dialog (trainer can override the auto-grade).
// Tab 2: طلبات الشهادات — certificate requests for his courses, each card shows
//        the trainee's exam result; the trainer approves/rejects based on it.
// APIs: /api/exam-attempts, /api/certificate-requests, /api/students
// ============================================================================
import React, { useEffect, useMemo, useState } from 'react'
import {
  TrendingUp, Users, FileText, Award, Loader2, Search, CheckCircle2, XCircle,
  GraduationCap, Clock, Edit3, ShieldCheck, BadgeCheck, MessageSquareText,
  ClipboardCheck, Hourglass, Download,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  LuxSection, LuxStats, LuxSearch, LuxEmpty, LuxBadge, LuxField, LuxDialog,
  LuxSaveBar, LuxSelect, luxInput,
} from './luxury'

// ---------- helpers ----------
function attemptReview(a: any) {
  try { return a?.answers?.__review__ || null } catch { return null }
}
function bestAttempt(attempts: any[], userId: string, courseId: string) {
  const mine = attempts.filter((a) => a.user_id === userId && a.course_id === courseId && a.submitted_at)
  if (mine.length === 0) return null
  // Highest score wins; on tie, the most recent wins
  return mine.reduce((best, a) => (a.score > (best?.score ?? -1) ? a : best), null as any)
}
function fmtDate(d?: string | null) {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' }) } catch { return '—' }
}

// ============================================================================
export function TrainerResultsCenter({ user, courses }: { user: any; courses: any[] }) {
  const [tab, setTab] = useState<'results' | 'requests'>('results')
  const [attempts, setAttempts] = useState<any[]>([])
  const [requests, setRequests] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [courseFilter, setCourseFilter] = useState('')

  // Correction dialog state
  const [correcting, setCorrecting] = useState<any | null>(null)
  const [corrScore, setCorrScore] = useState('')
  const [corrNote, setCorrNote] = useState('')
  const [savingCorr, setSavingCorr] = useState(false)

  const load = () => {
    setLoading(true)
    Promise.all([
      fetch('/api/exam-attempts?all=1').then((r) => r.json()).catch(() => []),
      fetch('/api/certificate-requests').then((r) => r.json()).catch(() => []),
      fetch('/api/students?role=student').then((r) => r.json()).catch(() => []),
    ]).then(([a, rq, st]) => {
      setAttempts(Array.isArray(a) ? a : [])
      setRequests(Array.isArray(rq) ? rq : [])
      setStudents(Array.isArray(st) ? st : [])
    }).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const courseIds = useMemo(() => courses.map((c) => c.id), [courses])
  const courseById = useMemo(() => Object.fromEntries(courses.map((c) => [c.id, c])), [courses])
  const studentById = useMemo(() => Object.fromEntries(students.map((s) => [s.id, s])), [students])

  // My courses only
  const myAttempts = useMemo(
    () => attempts.filter((a) => courseIds.includes(a.course_id)),
    [attempts, courseIds]
  )
  const myRequests = useMemo(
    () => requests.filter((r) => courseIds.includes(r.course_id)),
    [requests, courseIds]
  )

  const filteredAttempts = useMemo(() => myAttempts.filter((a) => {
    if (courseFilter && a.course_id !== courseFilter) return false
    if (!search.trim()) return true
    const s = search.trim().toLowerCase()
    const name = studentById[a.user_id]?.name || ''
    const cname = courseById[a.course_id]?.title || ''
    return name.toLowerCase().includes(s) || cname.toLowerCase().includes(s)
  }), [myAttempts, courseFilter, search, studentById, courseById])

  // Stats
  const submitted = myAttempts.filter((a) => a.submitted_at)
  const passedCount = submitted.filter((a) => a.passed).length
  const reviewedCount = submitted.filter((a) => attemptReview(a)).length
  const avgScore = submitted.length > 0 ? Math.round(submitted.reduce((acc, a) => acc + (a.score || 0), 0) / submitted.length) : 0
  const pendingReqs = myRequests.filter((r) => r.status === 'pending').length

  // ---------- actions ----------
  const openCorrection = (a: any) => {
    setCorrecting(a)
    setCorrScore(String(a.score ?? ''))
    setCorrNote(attemptReview(a)?.note || '')
  }

  const saveCorrection = async () => {
    if (!correcting) return
    const score = parseInt(corrScore)
    if (isNaN(score) || score < 0 || score > 100) { toast.error('أدخل نتيجة صحيحة بين 0 و 100'); return }
    setSavingCorr(true)
    try {
      const res = await fetch('/api/exam-attempts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: correcting.id,
          review: {
            score,
            note: corrNote.trim(),
            reviewer_id: user?.id,
            reviewer_name: user?.name || 'المدرب',
          },
        }),
      })
      const d = await res.json()
      if (!res.ok) { toast.error(d.error || 'فشل حفظ التصحيح'); return }
      toast.success(`تم اعتماد النتيجة النهائية: ${score}% — وتم إشعار المتدرب`)
      setCorrecting(null)
      load()
    } finally { setSavingCorr(false) }
  }

  const handleRequestAction = async (reqId: string, action: string, note?: string) => {
    const res = await fetch('/api/certificate-requests', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: reqId, action, note }),
    })
    if (res.ok) {
      toast.success(action === 'reject' ? 'تم رفض الطلب' : 'تمت الموافقة — انتقل الطلب إلى الإدارة للاعتماد النهائي')
      load()
    } else {
      const d = await res.json(); toast.error(d.error || 'فشل')
    }
  }

  const reqStatusBadge = (status: string) => {
    const map: any = {
      pending: { label: 'بانتظار موافقتك', tone: 'amber' },
      trainer_approved: { label: 'وافقت — بانتظار الإدارة', tone: 'blue' },
      admin_approved: { label: 'الإدارة اعتمدت — جاري الإصدار', tone: 'purple' },
      issued: { label: 'تم إصدار الشهادة', tone: 'green' },
      rejected: { label: 'مرفوض', tone: 'red' },
    }
    return map[status] || map.pending
  }

  return (
    <LuxSection
      title="نتائج المتدربين والشهادات"
      subtitle="راجع نتائج اختبارات متدربيك، صحّح الدرجات، واعتمد طلبات الشهادات حسب النتائج"
      icon={TrendingUp}
      themeKey="questions"
      count={tab === 'results' ? filteredAttempts.length : myRequests.length}
      stats={
        <LuxStats
          items={[
            { icon: ClipboardCheck, label: 'محاولات مُسلّمة', value: submitted.length, grad: 'from-purple-600 to-fuchsia-700' },
            { icon: BadgeCheck, label: 'ناجحون', value: passedCount, grad: 'from-emerald-500 to-teal-600' },
            { icon: Edit3, label: 'نتائج صحّحتها', value: reviewedCount, grad: 'from-amber-500 to-orange-600' },
            { icon: FileText, label: 'طلبات شهادات معلّقة', value: pendingReqs, grad: 'from-rose-500 to-red-600' },
          ]}
        />
      }
      actions={
        tab === 'requests' && pendingReqs > 0 ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-l from-rose-500/20 to-amber-500/20 border border-rose-500/40 text-rose-200 text-xs font-extrabold">
            <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
            {pendingReqs} طلب ينتظر موافقتك
          </span>
        ) : undefined
      }
      toolbar={
        <div className="space-y-3">
          {/* Royal tabs */}
          <div className="flex gap-2 p-1 rounded-2xl bg-gradient-to-b from-navy/[0.04] to-transparent border border-gold/15 w-fit">
            <button
              onClick={() => setTab('results')}
              className={`relative px-5 py-2 rounded-xl text-sm font-extrabold transition-all flex items-center gap-1.5 ${
                tab === 'results'
                  ? 'bg-gradient-to-br from-navy via-navy-light to-navy text-gold shadow-md border border-gold/40'
                  : 'text-navy hover:bg-gold/5 border border-transparent'
              }`}
            >
              <TrendingUp className="w-4 h-4" /> نتائج المتدربين
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gold/20 border border-gold/30 tabular-nums">{submitted.length}</span>
            </button>
            <button
              onClick={() => setTab('requests')}
              className={`relative px-5 py-2 rounded-xl text-sm font-extrabold transition-all flex items-center gap-1.5 ${
                tab === 'requests'
                  ? 'bg-gradient-to-br from-navy via-navy-light to-navy text-gold shadow-md border border-gold/40'
                  : 'text-navy hover:bg-gold/5 border border-transparent'
              }`}
            >
              <FileText className="w-4 h-4" /> طلبات الشهادات
              {pendingReqs > 0 && (
                <span className="bg-gradient-to-r from-rose-500 to-red-600 text-white text-[10px] rounded-full px-1.5 py-0.5 shadow-sm tabular-nums">{pendingReqs}</span>
              )}
            </button>
          </div>
          {tab === 'results' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <LuxSearch value={search} onChange={setSearch} placeholder="ابحث باسم المتدرب أو الدورة..." className="sm:col-span-2" />
              <LuxSelect value={courseFilter} onChange={setCourseFilter} placeholder="كل دوراتي"
                options={courses.map((c) => ({ value: c.id, label: c.title, emoji: '📘' }))} />
            </div>
          )}
        </div>
      }
    >
      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin text-gold" />
          <span className="text-sm font-bold">جاري تحميل البيانات...</span>
        </div>
      ) : courses.length === 0 ? (
        <LuxEmpty icon={GraduationCap} themeKey="questions" title="لا توجد دورات مسجلة باسمك بعد"
          hint="أنشئ دورتك أولاً لتتمكن من متابعة نتائج متدربيك" />
      ) : tab === 'results' ? (
        /* ================= TAB 1: TRAINEE RESULTS ================= */
        filteredAttempts.length === 0 ? (
          <LuxEmpty icon={TrendingUp} themeKey="questions" title="لا توجد محاولات اختبار بعد"
            hint="عندما يجيب متدربوك على اختبار بنك أسئلة دورتك، ستظهر نتائجهم هنا تلقائياً ويمكنك تصحيحها" />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 fia-stagger">
            {filteredAttempts.map((a) => {
              const review = attemptReview(a)
              const student = studentById[a.user_id]
              const course = courseById[a.course_id]
              const isSubmitted = !!a.submitted_at
              return (
                <Card key={a.id} className="fia-card-hover p-4 border border-gold/25 hover:border-gold/45 relative overflow-hidden">
                  <div className={`absolute top-0 right-0 left-0 h-1 ${a.passed ? 'bg-gradient-to-l from-emerald-500 via-teal-400 to-emerald-500' : 'bg-gradient-to-l from-rose-500 via-red-400 to-rose-500'} ${isSubmitted ? 'opacity-80' : 'opacity-30'}`} />
                  <div className="flex items-start gap-3">
                    {/* Score tile */}
                    <div className={`relative w-14 h-14 rounded-xl flex flex-col items-center justify-center flex-shrink-0 shadow-md ${
                      !isSubmitted ? 'bg-muted/60'
                      : a.passed ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gradient-to-br from-rose-500 to-red-600'
                    }`}>
                      {isSubmitted ? (
                        <>
                          <span className="text-white font-extrabold text-lg leading-none tabular-nums">{a.score}%</span>
                          <span className="text-[9px] text-white/85 font-bold mt-0.5">{a.passed ? 'ناجح' : 'راسب'}</span>
                        </>
                      ) : (
                        <Clock className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        <span className="font-extrabold text-navy text-sm">{student?.name || 'متدرب'}</span>
                        {review && <LuxBadge tone="purple"><ShieldCheck className="w-2.5 h-2.5" /> مُصحّحة من المدرب</LuxBadge>}
                        {!isSubmitted && <LuxBadge tone="amber"><Hourglass className="w-2.5 h-2.5" /> جاري الحل</LuxBadge>}
                      </div>
                      <div className="text-xs text-muted-foreground line-clamp-1 mb-1.5">{course?.title || 'دورة'}</div>
                      <div className="flex items-center gap-2.5 flex-wrap text-[10px] text-muted-foreground">
                        {isSubmitted && (
                          <>
                            <span dir="ltr">سُلّم: {fmtDate(a.submitted_at)}</span>
                            {typeof a.duration_seconds === 'number' && a.duration_seconds > 0 && (
                              <span dir="ltr">المدة: {Math.floor(a.duration_seconds / 60)} د</span>
                            )}
                            {typeof a.tab_switches === 'number' && a.tab_switches > 0 && (
                              <span className="text-amber-600 font-bold">⚠ {a.tab_switches} تحذير أمني</span>
                            )}
                          </>
                        )}
                      </div>
                      {review?.note && (
                        <div className="text-[11px] text-purple-700 mt-1.5 bg-purple-500/5 border border-purple-500/25 rounded-lg px-2.5 py-1.5 flex items-start gap-1.5">
                          <MessageSquareText className="w-3 h-3 mt-0.5 flex-shrink-0" />
                          <span>{review.note}</span>
                        </div>
                      )}
                      {review && typeof review.original_score === 'number' && review.original_score !== a.score && (
                        <div className="text-[10px] text-muted-foreground mt-1">الدرجة الآلية الأصلية: {review.original_score}%</div>
                      )}
                    </div>
                    {/* Correct button */}
                    {isSubmitted && (
                      <Button size="sm" variant="outline"
                        className="flex-shrink-0 border-gold/40 hover:bg-gold/10 hover:border-gold rounded-lg text-[11px] font-bold h-9 px-3"
                        onClick={() => openCorrection(a)}>
                        <Edit3 className="w-3.5 h-3.5 ml-1" /> تصحيح النتيجة
                      </Button>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        )
      ) : (
        /* ================= TAB 2: CERT REQUESTS ================= */
        myRequests.length === 0 ? (
          <LuxEmpty icon={FileText} themeKey="questions" title="لا توجد طلبات شهادات لدوراتك"
            hint="عندما يطلب متدرب شهادة إكمال دورة من دوراتك، سيظهر الطلب هنا مع نتيجة اختباره لتعتمده" />
        ) : (
          <div className="space-y-3">
            {myRequests.map((r) => {
              const badge = reqStatusBadge(r.status)
              const best = bestAttempt(attempts, r.user_id, r.course_id)
              const examPassed = best?.passed === true
              return (
                <Card key={r.id} className="fia-card-hover p-4 border border-gold/25 hover:border-gold/45 relative overflow-hidden">
                  <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-l from-gold via-amber-300 to-gold opacity-70" />
                  <div className="flex items-center gap-2 mb-2.5 flex-wrap">
                    <LuxBadge tone={badge.tone}>{badge.label}</LuxBadge>
                    {/* EXAM RESULT BADGE — the core of trainer approval */}
                    {best ? (
                      <span className={`inline-flex items-center gap-1.5 text-[11px] font-extrabold rounded-lg px-2.5 py-1 border ${
                        examPassed ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-700' : 'bg-rose-500/10 border-rose-500/35 text-rose-700'
                      }`}>
                        {examPassed ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        نتيجة الاختبار: {best.score}%
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold rounded-lg px-2.5 py-1 border bg-amber-500/10 border-amber-500/35 text-amber-700">
                        <Clock className="w-3 h-3" /> لم يجتز اختبار الدورة بعد
                      </span>
                    )}
                  </div>
                  <div className="font-extrabold text-navy text-sm mb-0.5">{r.student_name}</div>
                  <div className="text-xs text-muted-foreground mb-1.5">{r.course_title || courseById[r.course_id]?.title || '—'}</div>
                  <div className="flex items-center gap-3 flex-wrap text-[11px] text-muted-foreground">
                    {r.created_at && <span dir="ltr">طلب في: {fmtDate(r.created_at)}</span>}
                    {best?.submitted_at && <span dir="ltr">آخر اختبار: {fmtDate(best.submitted_at)}</span>}
                  </div>

                  {/* Trainer note / admin note / cert number */}
                  {r.trainer_note && <div className="text-[11px] text-blue-600 mt-1.5 bg-blue-500/5 border border-blue-500/20 rounded-lg px-2.5 py-1.5">📝 ملاحظتك: {r.trainer_note}</div>}
                  {r.admin_note && <div className="text-[11px] text-purple-600 mt-1.5 bg-purple-500/5 border border-purple-500/20 rounded-lg px-2.5 py-1.5">📝 ملاحظة الإدارة: {r.admin_note}</div>}
                  {r.cert_number && <div className="text-[11px] font-mono text-emerald-600 mt-1.5" dir="ltr">رقم الشهادة: {r.cert_number}</div>}

                  {/* Actions — approve ONLY when the exam is passed */}
                  <div className="flex gap-2 mt-3 pt-2.5 border-t border-gold/15 flex-wrap items-center">
                    {r.status === 'pending' && (
                      <>
                        <Button size="sm"
                          className={`text-white text-xs rounded-lg shadow-md active:scale-[0.97] transition-all ${
                            examPassed
                              ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700'
                              : 'bg-muted text-muted-foreground shadow-none cursor-not-allowed hover:bg-muted'
                          }`}
                          disabled={!examPassed}
                          title={examPassed ? 'الموافقة على الطلب' : 'لا يمكن الموافقة قبل اجتياز المتدرب لاختبار الدورة'}
                          onClick={() => handleRequestAction(r.id, 'trainer_approve', best ? `وافق المدرب — نتيجة الاختبار ${best.score}%` : 'وافق المدرب')}>
                          <CheckCircle2 className="w-3.5 h-3.5 ml-1" /> موافقة{best ? ` (نتيجة الاختبار ${best.score}%)` : ''}
                        </Button>
                        <Button size="sm" variant="outline" className="border-rose-500/30 text-rose-500 hover:bg-rose-500/10 text-xs rounded-lg"
                          onClick={() => handleRequestAction(r.id, 'reject', examPassed ? 'مرفوض من المدرب' : 'لم يجتز اختبار الدورة بعد')}>
                          <XCircle className="w-3.5 h-3.5 ml-1" /> رفض
                        </Button>
                        {!examPassed && (
                          <span className="text-[10px] text-muted-foreground">اعتمد موافقتك على نتيجة الاختبار — يجب اجتيازه أولاً</span>
                        )}
                      </>
                    )}
                    {r.status === 'trainer_approved' && (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-600 bg-blue-500/10 border border-blue-500/25 rounded-lg px-2.5 py-1.5">
                        <Hourglass className="w-3 h-3" /> تمت موافقتك — ينتظر الآن اعتماد الإدارة وإصدار الشهادة
                      </span>
                    )}
                    {r.status === 'admin_approved' && (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-purple-600 bg-purple-500/10 border border-purple-500/25 rounded-lg px-2.5 py-1.5">
                        <ShieldCheck className="w-3 h-3" /> الإدارة اعتمدت الطلب — بانتظار الإصدار النهائي
                      </span>
                    )}
                    {r.status === 'issued' && r.cert_number && (
                      <a href={`/verify/${r.cert_number}`} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="outline" className="border-gold/30 text-navy hover:bg-gold/10 text-xs rounded-lg">
                          <Download className="w-3.5 h-3.5 ml-1" /> عرض الشهادة الصادرة
                        </Button>
                      </a>
                    )}
                    {r.status === 'rejected' && (
                      <span className="text-[11px] font-bold text-rose-600">تم رفض الطلب — يمكن للمتدرب إعادة التقديم بعد الاجتياز</span>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        )
      )}

      {/* ============ ROYAL CORRECTION DIALOG ============ */}
      {correcting && (
        <LuxDialog
          open={!!correcting}
          onOpenChange={(o: boolean) => { if (!o && !savingCorr) setCorrecting(null) }}
          title="تصحيح نتيجة المتدرب"
          subtitle={`${studentById[correcting.user_id]?.name || 'متدرب'} — ${courseById[correcting.course_id]?.title || ''}`}
          icon={Edit3}
          gradient="from-[#1b1035] via-purple-900 to-fuchsia-900"
          footer={
            <LuxSaveBar
              onCancel={() => setCorrecting(null)}
              onSave={saveCorrection}
              saving={savingCorr}
              saveLabel="اعتماد النتيجة النهائية"
              icon={ShieldCheck}
              gradient="from-gold to-amber-500"
              text="text-navy"
            />
          }
        >
          {/* Current vs new */}
          <div className="grid grid-cols-2 gap-3 mb-1">
            <div className="rounded-xl border border-border/60 bg-muted/30 p-3 text-center">
              <div className="text-[10px] font-bold text-muted-foreground mb-1">الدرجة الآلية</div>
              <div className={`text-2xl font-extrabold ${correcting.passed ? 'text-emerald-600' : 'text-rose-500'}`}>{correcting.score ?? 0}%</div>
              <Badge variant="outline" className={`mt-1 text-[9px] ${correcting.passed ? 'border-emerald-500/40 text-emerald-600' : 'border-rose-500/40 text-rose-500'}`}>
                {correcting.passed ? 'ناجح' : 'راسب'}
              </Badge>
            </div>
            <div className="rounded-xl border-2 border-gold/40 bg-gradient-to-b from-gold/[0.07] to-transparent p-3 text-center">
              <div className="text-[10px] font-bold text-navy/70 mb-1">النتيجة النهائية بعد التصحيح</div>
              <Input type="number" min={0} max={100} value={corrScore} onChange={(e) => setCorrScore(e.target.value)}
                className={`${luxInput} text-center text-2xl font-extrabold h-12`} dir="ltr" />
              <Badge variant="outline" className={`mt-1 text-[9px] ${(parseInt(corrScore) || 0) >= (courseById[correcting.course_id]?.pass_score || 60) ? 'border-emerald-500/40 text-emerald-600' : 'border-rose-500/40 text-rose-500'}`}>
                {(parseInt(corrScore) || 0) >= (courseById[correcting.course_id]?.pass_score || 60) ? 'ناجح ✓' : 'راسب ✗'}
              </Badge>
            </div>
          </div>
          <LuxField label="ملاحظة المدرب (تظهر للمتدرب)" icon={MessageSquareText} hint="اختياري">
            <Textarea value={corrNote} onChange={(e) => setCorrNote(e.target.value)} rows={3}
              className="rounded-xl border-gold/30 focus:border-gold focus:ring-2 focus:ring-gold/25 transition-all"
              placeholder="اكتب ملاحظتك حول أداء المتدرب أو سبب التعديل..." />
          </LuxField>
          <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-gold" />
            سيتم إشعار المتدرب فوراً بالنتيجة النهائية وملاحظتك، وستُحتسب هذه النتيجة في أهلية الشهادة.
          </p>
        </LuxDialog>
      )}
    </LuxSection>
  )
}
