'use client'

import { useEffect, useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  Clock, AlertTriangle, Send, CheckCircle2, XCircle, Loader2, Eye,
  Sparkles, Award, BookOpen, HelpCircle, RefreshCw, TimerReset, Infinity as InfinityIcon,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { ExamRetakeDialog } from '@/components/fia/exam-retake-dialog'

interface Props {
  attempt: any
  questions: any[]
  course?: any
  studentName?: string
  mode: 'exam' | 'results'
  serverNow?: number
}

export default function ExamRunnerClient({ attempt, questions, course, studentName, mode, serverNow }: Props) {
  const router = useRouter()
  const [answers, setAnswers] = useState<Record<string, any>>(attempt.answers || {})

  // ⚡ SERVER-DRIVEN COUNTDOWN — the admin/trainer sets exam_duration_minutes
  // on the course (question bank → إعدادات الاختبار). 0/null = unlimited.
  // The deadline is anchored to the SERVER-side started_at + a server-vs-client
  // clock-skew correction, so the countdown is tamper-resistant and accurate.
  const EXAM_MINUTES = Number(course?.exam_duration_minutes) || 0
  const skewRef = useRef<number>(serverNow ? serverNow - Date.now() : 0)
  const [timeLeft, setTimeLeft] = useState<number>(() => {
    if (!EXAM_MINUTES || EXAM_MINUTES <= 0) return -1 // -1 = unlimited time
    const deadline = new Date(attempt.started_at).getTime() + EXAM_MINUTES * 60 * 1000
    return Math.max(0, Math.floor((deadline - (Date.now() + skewRef.current)) / 1000))
  })
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<any>(mode === 'results' ? attempt : null)
  const [tabSwitches, setTabSwitches] = useState<number>(attempt.tab_switches || 0)
  const [warnings, setWarnings] = useState<string[]>([])
  const recordedRef = useRef(false)
  // Certificate-request chain state (student → trainer → admin → issue)
  const [certReq, setCertReq] = useState<any>(null)
  const [requesting, setRequesting] = useState(false)
  const [retakeOpen, setRetakeOpen] = useState(false)

  // One-time time warnings (5 min / 1 min)
  const warned5Ref = useRef(false)
  const warned1Ref = useRef(false)
  useEffect(() => {
    if (mode !== 'exam' || timeLeft === -1) return
    if (timeLeft <= 300 && !warned5Ref.current) {
      warned5Ref.current = true
      toast.warning('⏱ بقي 5 دقائق على انتهاء وقت الاختبار')
    }
    if (timeLeft <= 60 && !warned1Ref.current) {
      warned1Ref.current = true
      toast.error('⚠️ دقيقة واحدة متبقية — سيتم التسليم تلقائياً عند انتهاء الوقت')
    }
  }, [timeLeft, mode])

  useEffect(() => {
    if (mode === 'results') return
    const onBlur = () => {
      setTabSwitches((prev) => {
        const next = prev + 1
        setWarnings((w) => [...w.slice(-3), `⚠️ تنبيه ${next}: تم تغيير النشاط. مراقبة سلوكك مسجلة.`])
        return next
      })
    }
    const onVisibility = () => { if (document.hidden) onBlur() }
    const onContext = (e: MouseEvent) => { e.preventDefault(); setWarnings((w) => [...w.slice(-3), '⚠️ القائمة مُعطّلة خلال الاختبار']) }
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey && (e.key === 'c' || e.key === 'v' || e.key === 'u' || e.key === 's')) ||
          e.key === 'F12' || (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C'))) {
        e.preventDefault()
        setWarnings((w) => [...w.slice(-3), '⚠️ اختصارات النسخ/الطباعة والـ DevTools معطّلة'])
      }
    }
    window.addEventListener('blur', onBlur)
    document.addEventListener('visibilitychange', onVisibility)
    document.addEventListener('contextmenu', onContext)
    document.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('blur', onBlur)
      document.removeEventListener('visibilitychange', onVisibility)
      document.removeEventListener('contextmenu', onContext)
      document.removeEventListener('keydown', onKey)
    }
  }, [mode])

  useEffect(() => {
    if (mode === 'results') return
    if (timeLeft === -1) return // unlimited — no countdown
    if (timeLeft <= 0) { submit(true); return }
    const interval = setInterval(() => setTimeLeft((t) => Math.max(0, t - 1)), 1000)
    return () => clearInterval(interval)
  }, [timeLeft, mode])

  // ⚡ Load the certificate-request chain status for this user + course
  // (top-level hook — must NOT live inside the conditional results block)
  useEffect(() => {
    if (!result || !attempt.user_id || !attempt.course_id) return
    fetch(`/api/certificate-requests?user_id=${attempt.user_id}`)
      .then((r) => r.json())
      .then((d) => {
        const arr = Array.isArray(d) ? d : []
        setCertReq(arr.find((r: any) => r.course_id === attempt.course_id) || null)
      })
      .catch(() => {})
  }, [result, attempt.user_id, attempt.course_id])

  // ⚡ ROYAL v4.2 — retake budget awareness on the results page: fetch ALL
  // submitted attempts of this student for this course so we can detect the
  // exhausted (permanent-failure) state.
  const [allAttempts, setAllAttempts] = useState<any[]>([])
  useEffect(() => {
    if (!result || !attempt.user_id || !attempt.course_id) return
    fetch(`/api/exam-attempts?user_id=${attempt.user_id}&course_id=${attempt.course_id}`)
      .then((r) => r.json())
      .then((d) => setAllAttempts(Array.isArray(d) ? d : []))
      .catch(() => setAllAttempts([]))
  }, [result, attempt.user_id, attempt.course_id])

  const submit = async (autoSubmitted = false) => {
    if (submitting) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/exam-attempts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: attempt.id, answers, tab_switches: tabSwitches }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'فشل التسليم'); return }
      setResult(data)
      if (autoSubmitted) toast.info('انتهى الوقت — تم تسليم إجاباتك تلقائياً')
      else toast.success('تم تسليم اختبارك')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally { setSubmitting(false) }
  }

  // ---------- RESULTS VIEW — magical ----------
  if (result) {
    const passed = result.passed
    const score = result.score
    const passScore = course?.pass_score || result.pass_score || 60
    const review = (() => { try { return result?.answers?.__review__ || null } catch { return null } })()

    // Request the certificate through the trusted chain (NOT direct issue):
    // student request → trainer approval → admin approval → issued
    const requestCertificate = async () => {
      setRequesting(true)
      try {
        const res = await fetch('/api/certificate-requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: attempt.user_id,
            course_id: attempt.course_id,
            student_name: studentName || '',
            course_title: course?.title || '',
          }),
        })
        const data = await res.json()
        if (!res.ok) { toast.error(data.error || 'فشل إرسال الطلب'); return }
        toast.success('تم إرسال طلب الشهادة — ينتظر موافقة المدرب ثم الإدارة')
        setCertReq(data)
      } finally { setRequesting(false) }
    }

    // Failed → the ONLY way back is the paid retake flow (fee dialog →
    // admin approval → one new attempt). No free retakes, ever.
    const RETAKE_FEE = Number(course?.retake_fee) || 0
    const RETAKE_CURRENCY = course?.currency || 'ر.ي'

    // Certificate request chain label
    const chainStep = certReq ? ['pending', 'trainer_approved', 'admin_approved', 'issued'].indexOf(certReq.status) : -1

    return (
      <div className="min-h-screen bg-gradient-to-b from-navy/5 to-white py-12 px-4" dir="rtl">
        <div className="max-w-2xl mx-auto">
          {/* ⚡ Magical result card — state-aware gradient */}
          <Card className={`relative p-8 text-center overflow-hidden border-2 ${passed ? 'border-emerald-500/40' : 'border-red-500/40'} shadow-xl`}>
            {/* Magical background pattern */}
            <div className="absolute inset-0 opacity-15 pointer-events-none" style={{
              backgroundImage: `radial-gradient(circle at 12% 50%, ${passed ? '#10b981' : '#ef4444'} 1.5px, transparent 1.5px), radial-gradient(circle at 88% 20%, white 1px, transparent 1px)`,
              backgroundSize: '24px 24px, 18px 18px'
            }} />
            <div className={`absolute -top-12 -right-12 w-40 h-40 ${passed ? 'bg-emerald-500/15' : 'bg-red-500/15'} rounded-full blur-3xl`} />

            <div className="relative">
              <div className={`relative inline-block mb-4`}>
                <div className={`absolute inset-0 ${passed ? 'bg-emerald-500/20' : 'bg-red-500/20'} rounded-full blur-2xl animate-pulse`} />
                <div className={`relative w-24 h-24 mx-auto rounded-2xl ${passed ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gradient-to-br from-rose-500 to-red-600'} flex items-center justify-center shadow-xl border border-white/30`}>
                  {passed ? <CheckCircle2 className="w-14 h-14 text-white" /> : <XCircle className="w-14 h-14 text-white" />}
                </div>
              </div>
              {/* GRAND COURSE-COMPLETION STATE */}
              <h1 className={`text-3xl font-extrabold mb-1 ${passed ? 'text-emerald-600' : 'text-rose-500'}`}>
                {passed ? '🎉 أكملت الدورة ناجحاً!' : 'لم تجتز اختبار الدورة بعد'}
              </h1>
              <p className={`text-sm font-bold mb-3 ${passed ? 'text-emerald-600/80' : 'text-rose-500/80'}`}>
                {passed ? 'أنت الآن مؤهل لطلب شهادة إكمال الدورة' : 'أعد المحاولة حتى تحقق درجة النجاح لتصبح مؤهلاً للشهادة'}
              </p>
              <p className="text-muted-foreground mb-1">حصلت على</p>
              <div className={`text-6xl font-extrabold mb-2 ${passed ? 'bg-gradient-to-r from-emerald-500 to-teal-600 bg-clip-text text-transparent' : 'bg-gradient-to-r from-rose-500 to-red-600 bg-clip-text text-transparent'}`}>{score}%</div>
              <p className="text-sm text-muted-foreground mb-4">
                {result.correct_count || 0} من {result.total_questions || 0} إجابة صحيحة · حد النجاح {passScore}%
              </p>
              {review && (
                <div className="mx-auto max-w-sm mb-4 text-xs font-bold text-purple-700 bg-purple-500/10 border border-purple-500/25 rounded-xl px-3 py-2">
                  📝 النتيجة النهائية بعد مراجعة المدرب{review.by_name ? ` (${review.by_name})` : ''}
                  {review.note ? ` — ${review.note}` : ''}
                </div>
              )}
              {tabSwitches > 0 && (
                <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/30 mb-4">
                  <AlertTriangle className="w-3 h-3 ml-1" /> {tabSwitches} تحذيرات أمنية مسجّلة
                </Badge>
              )}

              {/* ============ CERTIFICATE CHAIN CARD ============ */}
              {passed && (
                <div className="relative mt-6 p-5 bg-gradient-to-br from-gold/10 to-amber-50/50 border-2 border-gold/40 rounded-xl overflow-hidden">
                  <div className="absolute inset-0 opacity-20" style={{
                    backgroundImage: 'radial-gradient(circle at 12% 50%, #D4AF37 1.5px, transparent 1.5px), radial-gradient(circle at 88% 20%, white 1px, transparent 1px)',
                    backgroundSize: '24px 24px, 18px 18px'
                  }} />
                  <div className="absolute -top-8 -right-8 w-32 h-32 bg-gold/20 rounded-full blur-2xl" />
                  <div className="relative">
                    {certReq?.status === 'issued' && certReq.cert_number ? (
                      <div>
                        <p className="text-sm font-bold text-navy mb-2 flex items-center gap-1.5"><Award className="w-4 h-4 text-gold" /> شهادتك الصادرة</p>
                        <p className="font-mono text-lg text-gold mb-3" dir="ltr">{certReq.cert_number}</p>
                        <a href={`/verify/${certReq.cert_number}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-gradient-to-r from-navy to-navy-light hover:from-navy-light hover:to-navy text-gold px-5 py-2.5 rounded-xl font-bold text-sm shadow-md active:scale-[0.97] transition-all">
                          <CheckCircle2 className="w-4 h-4" /> عرض الشهادة
                        </a>
                      </div>
                    ) : certReq && ['pending', 'trainer_approved', 'admin_approved'].includes(certReq.status) ? (
                      <div>
                        <p className="text-sm font-bold text-navy mb-3 flex items-center justify-center gap-1.5"><Sparkles className="w-4 h-4 text-gold" /> طلب شهادتك في سلسلة الموافقات</p>
                        <div className="flex items-center justify-center gap-1 mb-3 text-[10px] font-extrabold">
                          {[
                            { k: 'pending', label: 'المدرب' },
                            { k: 'trainer_approved', label: 'الإدارة' },
                            { k: 'admin_approved', label: 'الإصدار' },
                          ].map((s, i) => {
                            const done = chainStep > i
                            const current = chainStep === i
                            return (
                              <span key={s.k} className="flex items-center gap-1">
                                {i > 0 && <span className="w-3 h-px bg-gold/40" />}
                                <span className={`rounded-full px-2.5 py-1 border ${
                                  done ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700'
                                  : current ? 'bg-gold/20 border-gold/60 text-navy animate-pulse'
                                  : 'bg-white/50 border-border text-muted-foreground'
                                }`}>{s.label}</span>
                              </span>
                            )
                          })}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {certReq.status === 'pending' ? 'انتظر موافقة المدرب على طلبك' : certReq.status === 'trainer_approved' ? 'وافق المدرب — ينتظر الآن اعتماد الإدارة' : 'اعتمدت الإدارة — سيصدر رقم شهادتك خلال لحظات'}
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm font-bold text-navy mb-1 flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-gold" /> 🎉 أنت مؤهل لطلب الشهادة!</p>
                        <p className="text-xs text-muted-foreground mb-3">يمر طلبك بسلسلة موافقات موثوقة: المدرب ← الإدارة ← الإصدار برقم قابل للتحقق</p>
                        <button
                          onClick={requestCertificate}
                          disabled={requesting || !studentName}
                          className="inline-flex items-center gap-2 bg-gradient-to-r from-gold to-amber-500 hover:from-amber-500 hover:to-gold text-navy px-6 py-2.5 rounded-xl font-bold text-sm shadow-md active:scale-[0.97] transition-all disabled:opacity-50"
                        >
                          {requesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Award className="w-4 h-4" />}
                          {requesting ? 'جاري إرسال الطلب...' : '📜 اطلب شهادتك الآن'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Failed → PAID retake card + ROYAL v4.2 budget policy */}
              {!passed && (() => {
                const submitted = allAttempts.filter((a: any) => a.submitted_at)
                const everPassed = submitted.some((a: any) => a.passed === true)
                const maxRetakesRaw = Number(course?.max_retakes)
                const maxRetakes = Number.isFinite(maxRetakesRaw) ? Math.max(0, maxRetakesRaw) : 2
                const budget = 1 + maxRetakes
                const exhausted = !everPassed && submitted.length >= budget
                return exhausted ? (
                  <div className="relative mt-6 p-5 bg-gradient-to-br from-slate-900 via-slate-800 to-black border-2 border-rose-500/40 rounded-xl overflow-hidden">
                    <div className="absolute -top-6 -left-6 w-24 h-24 bg-rose-500/20 rounded-full blur-2xl" />
                    <div className="relative text-center">
                      <p className="text-sm font-extrabold text-rose-400 mb-1">⛔ لم تتوفّق في هذه الدورة أبداً</p>
                      <p className="text-xs text-slate-300 mb-2 leading-relaxed">
                        استهلكت جميع محاولاتك المسموحة في هذه الدورة ({submitted.length}/{budget}) دون تحقيق درجة النجاح — القرار نهائي ولا يمكن إعادة الاختبار مرة أخرى، ولن تصدر شهادة لهذه الدورة.
                      </p>
                      <span className="inline-block text-[10px] font-bold text-slate-400 border border-slate-600 rounded-lg px-3 py-1">انتهت المحاولات — {submitted.length}/{budget}</span>
                    </div>
                  </div>
                ) : (
                  <div className="relative mt-6 p-5 bg-gradient-to-br from-purple-500/10 to-fuchsia-50/50 border-2 border-purple-500/30 rounded-xl overflow-hidden">
                    <div className="absolute -top-6 -left-6 w-20 h-20 bg-purple-500/15 rounded-full blur-2xl" />
                    <div className="relative text-center">
                      <p className="text-sm font-bold text-navy mb-1">🔁 إعادة الاختبار</p>
                      <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                        المحاولة الأولى كانت مجانية — لبدء محاولة جديدة يلزم سداد رسوم الإعادة
                        {RETAKE_FEE > 0 && <span className="font-extrabold text-purple-700"> ({RETAKE_FEE.toLocaleString()} {RETAKE_CURRENCY})</span>}
                        {' '}مع موافقة الإدارة
                        <span className="block mt-1 text-[10px]">متبقٍ لك <span className="font-extrabold text-purple-700" dir="ltr">{Math.max(0, budget - submitted.length)}</span> من أصل {maxRetakes} إعادات مسموحة</span>
                      </p>
                      <button
                        onClick={() => setRetakeOpen(true)}
                        className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-fuchsia-700 hover:from-purple-700 hover:to-fuchsia-800 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-md active:scale-[0.97] transition-all"
                      >
                        <RefreshCw className="w-4 h-4" />
                        {RETAKE_FEE > 0
                          ? `إعادة الاختبار — رسوم ${RETAKE_FEE.toLocaleString()} ${RETAKE_CURRENCY}`
                          : 'إعادة الاختبار — سداد الرسوم'}
                      </button>
                    </div>
                  </div>
                )
              })()}

              <div className="flex flex-wrap justify-center gap-3 mt-6">
                <Button onClick={() => router.push('/#exams')} className="bg-gradient-to-r from-navy to-navy-light hover:from-navy-light hover:to-navy text-gold rounded-xl shadow-md active:scale-[0.97] transition-all">
                  اختباراتي
                </Button>
                <Button onClick={() => router.push('/#results')} variant="outline" className="rounded-xl border-gold/30 hover:border-gold hover:bg-gold/5">
                  نتائجي
                </Button>
                <Button onClick={() => router.push(`/courses/${course?.slug || ''}`)} variant="outline" className="rounded-xl border-gold/30 hover:border-gold hover:bg-gold/5">
                  مراجعة الدورة
                </Button>
              </div>
            </div>
          </Card>

          {/* ⚡ Per-question review — magical cards */}
          <Card className="p-6 mt-6 border-2 border-gold/20 relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{
              backgroundImage: 'radial-gradient(circle at 20% 20%, #D4AF37 1px, transparent 1px)',
              backgroundSize: '14px 14px'
            }} />
            <h3 className="relative font-bold text-navy mb-4 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-gold" /> مراجعة الإجابات
            </h3>
            <div className="relative space-y-3">
              {questions.map((q, i) => {
                const userAnswer = answers[q.id]
                let userDisplay = 'لم تُجب'
                if (q.question_type === 'mcq' && typeof userAnswer === 'number' && q.options) {
                  userDisplay = (['أ','ب','ج','د','هـ','و'])[userAnswer] + ') ' + (q.options[userAnswer] || '—')
                } else if (q.question_type === 'truefalse') {
                  userDisplay = userAnswer === true ? 'صح' : userAnswer === false ? 'خطأ' : 'لم تُجب'
                } else {
                  userDisplay = String(userAnswer || 'لم تُجب')
                }
                return (
                  <div key={q.id} className="border border-gold/20 rounded-xl p-3 bg-gradient-to-br from-white to-gold/5">
                    <div className="flex items-start gap-2 mb-2">
                      <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-navy to-navy-light text-gold text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                      <p className="text-sm font-bold text-navy">{q.prompt}</p>
                    </div>
                    <p className="text-xs text-muted-foreground pr-8">إجابتك: <span className="font-medium text-navy">{userDisplay}</span></p>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>

        {/* ⚡ Paid retake dialog — fee + payment methods + proof upload */}
        <ExamRetakeDialog
          open={retakeOpen}
          onOpenChange={setRetakeOpen}
          course={course}
          userId={attempt.user_id}
          onRequested={() => {
            setTimeout(() => { router.push('/#exams') }, 1800)
          }}
        />
      </div>
    )
  }

  // ---------- EXAM VIEW — magical ----------
  const totalQuestions = questions.length
  const answeredCount = Object.keys(answers).filter((k) => answers[k] !== undefined && answers[k] !== null && answers[k] !== '').length
  const allAnswered = answeredCount === totalQuestions

  // ⏱ Luxury countdown display — HH:MM:SS when hours exist, urgency tiers
  const unlimited = timeLeft === -1
  const h = Math.floor(Math.max(0, timeLeft) / 3600)
  const m = Math.floor((Math.max(0, timeLeft) % 3600) / 60)
  const s = Math.max(0, timeLeft) % 60
  const timeDisplay = unlimited ? '∞' : h > 0
    ? `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  const isCritical = !unlimited && timeLeft <= 120
  const isWarn = !unlimited && !isCritical && timeLeft <= 600
  const timeProgress = unlimited ? 100 : EXAM_MINUTES > 0 ? Math.max(0, Math.min(100, (timeLeft / (EXAM_MINUTES * 60)) * 100)) : 0

  return (
    <div className="min-h-screen bg-gradient-to-b from-navy/5 to-white py-8 px-4" dir="rtl">
      <div className="max-w-3xl mx-auto">
        {/* ⚡ Sticky header — magical gradient timer (server-driven countdown) */}
        <div className={`sticky top-0 z-10 relative overflow-hidden bg-white border-2 rounded-2xl shadow-xl p-4 mb-4 ${isCritical ? 'border-red-500/50' : isWarn ? 'border-amber-500/50' : 'border-gold/30'}`}>
          <div className="absolute inset-0 opacity-10 pointer-events-none" style={{
            backgroundImage: 'radial-gradient(circle at 20% 20%, #D4AF37 1px, transparent 1px)',
            backgroundSize: '14px 14px'
          }} />
          <div className="relative flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-navy flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-gold flex-shrink-0" />
                <span className="truncate">{course?.title || 'اختبار'}</span>
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">{answeredCount} من {totalQuestions} مجاب عنها</p>
            </div>
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              {unlimited ? (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-br from-navy via-navy-light to-navy text-gold shadow-md">
                  <InfinityIcon className="w-5 h-5" />
                  <span className="font-bold text-sm">بلا حد زمني</span>
                </div>
              ) : (
                <div className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl font-mono text-lg font-bold shadow-md transition-colors ${
                  isCritical ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white animate-pulse'
                  : isWarn ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white'
                  : 'bg-gradient-to-br from-navy via-navy-light to-navy text-gold'
                }`}>
                  <Clock className="w-5 h-5" />
                  <span dir="ltr">{timeDisplay}</span>
                </div>
              )}
              {!unlimited && (
                <span className={`text-[9px] font-extrabold ${isCritical ? 'text-red-500' : isWarn ? 'text-amber-600' : 'text-muted-foreground'}`}>
                  الوقت المتبقي {isCritical ? '— أسرع!' : ''}
                </span>
              )}
            </div>
          </div>
          {/* Time progress bar — drains as the exam clock runs */}
          {!unlimited && (
            <div className="relative mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-1000 ${
                isCritical ? 'bg-gradient-to-l from-red-500 to-rose-600'
                : isWarn ? 'bg-gradient-to-l from-amber-500 to-orange-600'
                : 'bg-gradient-to-l from-gold via-amber-400 to-gold'
              }`} style={{ width: `${timeProgress}%` }} />
            </div>
          )}
        </div>

        {/* ⚡ Anti-cheat warning banner — magical amber card */}
        <div className="relative bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-500/30 rounded-xl p-3 mb-4 flex items-start gap-2 overflow-hidden">
          <div className="absolute -top-4 -right-4 w-12 h-12 bg-amber-500/15 rounded-full blur-xl" />
          <AlertTriangle className="relative w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="relative text-xs text-amber-700">
            هذا الاختبار تحت المراقبة. النسخ/اللصق/الـ DevTools معطّلة. تغيير النشاط عن النافذة سيُسجّل كتحذير أمني.
          </p>
        </div>

        {/* Live warnings — magical red cards */}
        {warnings.length > 0 && (
          <div className="space-y-1 mb-4">
            {warnings.map((w, i) => (
              <div key={i} className="text-xs text-rose-700 bg-rose-50 border border-rose-500/30 rounded-lg p-2">{w}</div>
            ))}
          </div>
        )}

        {/* ⚡ Progress bar — magical gold gradient */}
        <div className="bg-muted rounded-full h-2.5 overflow-hidden mb-6 shadow-inner">
          <div className="bg-gradient-to-r from-gold via-amber-400 to-gold h-full transition-all shadow-md" style={{ width: `${(answeredCount / totalQuestions) * 100}%` }} />
        </div>

        {/* Questions — magical cards */}
        <div className="space-y-5">
          {questions.map((q, i) => {
            const userAnswer = answers[q.id]
            return (
              <Card key={q.id} className="p-5 border-2 border-gold/20 hover:border-gold/40 transition-colors relative overflow-hidden">
                <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-l from-gold via-amber-400 to-gold opacity-60" />
                <div className="flex items-start gap-3 mb-4">
                  <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-navy to-navy-light text-gold text-sm font-bold flex items-center justify-center flex-shrink-0 shadow-md">
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <p className="text-base font-bold text-navy leading-relaxed">{q.prompt}</p>
                    <div className="flex items-center gap-2 mt-2">
                      {q.difficulty && <Badge variant="outline" className="text-[10px] bg-gold/5 border-gold/30 text-navy">{q.difficulty}</Badge>}
                      {q.points && <Badge variant="outline" className="text-[10px] bg-purple-50 border-purple-500/30 text-purple-700">{q.points} نقطة</Badge>}
                    </div>
                  </div>
                </div>

                {q.question_type === 'mcq' && Array.isArray(q.options) && (
                  <div className="space-y-2">
                    {q.options.map((opt: any, idx: number) => (
                      <button
                        key={idx}
                        onClick={() => setAnswers({ ...answers, [q.id]: idx })}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-right ${
                          userAnswer === idx
                            ? 'border-gold bg-gradient-to-l from-gold/15 to-gold/5 shadow-md'
                            : 'border-gold/20 hover:border-gold/50 hover:bg-gold/5'
                        }`}
                      >
                        <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold transition-all ${
                          userAnswer === idx ? 'bg-gradient-to-br from-gold to-amber-500 text-navy shadow-md' : 'bg-navy/5 text-gold'
                        }`}>
                          {(['أ','ب','ج','د','هـ','و'])[idx]}
                        </div>
                        <span className="text-sm text-navy flex-1 font-medium">{opt}</span>
                      </button>
                    ))}
                  </div>
                )}

                {q.question_type === 'truefalse' && (
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: true, label: 'صح ✓', gradient: 'from-emerald-500 to-teal-600', selectedGradient: 'border-emerald-500 bg-gradient-to-br from-emerald-50 to-teal-50 text-emerald-700' },
                      { value: false, label: 'خطأ ✗', gradient: 'from-rose-500 to-red-600', selectedGradient: 'border-rose-500 bg-gradient-to-br from-rose-50 to-red-50 text-rose-700' },
                    ].map((opt) => (
                      <button
                        key={String(opt.value)}
                        onClick={() => setAnswers({ ...answers, [q.id]: opt.value })}
                        className={`p-4 rounded-xl border-2 transition-all text-center font-bold ${
                          userAnswer === opt.value ? opt.selectedGradient + ' shadow-md' : 'border-gold/20 hover:border-gold/40 text-navy hover:bg-gold/5'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}

                {q.question_type === 'short_answer' && (
                  <input
                    type="text"
                    value={typeof userAnswer === 'string' ? userAnswer : ''}
                    onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                    placeholder="اكتب إجابتك هنا..."
                    className="w-full p-3 border-2 border-gold/30 rounded-xl focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/30 transition-all"
                  />
                )}
              </Card>
            )
          })}
        </div>

        {/* ⚡ Submit footer — magical gradient button */}
        <div className="sticky bottom-0 bg-white border-2 border-gold/30 rounded-2xl shadow-xl p-4 mt-6 flex items-center justify-between overflow-hidden relative">
          <div className="absolute inset-0 opacity-10 pointer-events-none" style={{
            backgroundImage: 'radial-gradient(circle at 20% 20%, #D4AF37 1px, transparent 1px)',
            backgroundSize: '14px 14px'
          }} />
          <p className="relative text-sm font-bold text-navy">
            {allAnswered ? '✓ تم الإجابة على كل الأسئلة' : `${totalQuestions - answeredCount} سؤال متبقي`}
          </p>
          <Button onClick={() => submit(false)} disabled={submitting} className="relative bg-gradient-to-r from-navy to-navy-light hover:from-navy-light hover:to-navy text-gold rounded-xl shadow-md active:scale-[0.97] transition-all px-6">
            {submitting ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Send className="w-4 h-4 ml-1" />}
            {submitting ? 'جاري التسليم...' : 'تسليم الاختبار'}
          </Button>
        </div>
      </div>
    </div>
  )
}
