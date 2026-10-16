'use client'

import { useEffect, useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  Clock, AlertTriangle, Send, CheckCircle2, XCircle, Loader2, Eye,
} from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Props {
  attempt: any
  questions: any[]
  course?: any
  mode: 'exam' | 'results'
}

export default function ExamRunnerClient({ attempt, questions, course, mode }: Props) {
  const router = useRouter()
  const [answers, setAnswers] = useState<Record<string, any>>(attempt.answers || {})
  const [timeLeft, setTimeLeft] = useState<number>(() => {
    // Default 30 minutes per attempt (configurable per-course later)
    const DURATION = (questions.length || 10) * 60 * 1.5 // 1.5 min per question
    const startedAt = new Date(attempt.started_at).getTime()
    const elapsed = Math.floor((Date.now() - startedAt) / 1000)
    return Math.max(0, Math.floor(DURATION) - elapsed)
  })
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<any>(mode === 'results' ? attempt : null)
  const [tabSwitches, setTabSwitches] = useState<number>(attempt.tab_switches || 0)
  const [warnings, setWarnings] = useState<string[]>([])
  const [showFullscreen, setShowFullscreen] = useState(false)
  const recordedRef = useRef(false)

  // Anti-cheat — detect tab switches + window blur
  useEffect(() => {
    if (mode === 'results') return
    const onBlur = () => {
      setTabSwitches((prev) => {
        const next = prev + 1
        setWarnings((w) => [...w.slice(-3), `⚠️ تنبيه ${next}: تم تغيير النشاط. مراقبة سلوكك مسجلة.`])
        return next
      })
    }
    const onVisibility = () => {
      if (document.hidden) onBlur()
    }
    const onContext = (e: MouseEvent) => {
      e.preventDefault()
      setWarnings((w) => [...w.slice(-3), '⚠️ القائمة مُعطّلة خلال الاختبار'])
    }
    const onKey = (e: KeyboardEvent) => {
      // Block Ctrl+C / Ctrl+V / F12 / Ctrl+Shift+I
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

  // Countdown timer
  useEffect(() => {
    if (mode === 'results') return
    if (timeLeft <= 0) {
      // Auto-submit when time runs out
      submit(true)
      return
    }
    const interval = setInterval(() => {
      setTimeLeft((t) => Math.max(0, t - 1))
    }, 1000)
    return () => clearInterval(interval)
  }, [timeLeft, mode])

  const submit = async (autoSubmitted = false) => {
    if (submitting) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/exam-attempts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: attempt.id,
          answers,
          tab_switches: tabSwitches,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'فشل التسليم')
        return
      }
      setResult(data)
      if (autoSubmitted) {
        toast.info('انتهى الوقت — تم تسليم إجاباتك تلقائياً')
      } else {
        toast.success('تم تسليم اختبارك')
      }
      // Scroll to top for results
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setSubmitting(false)
    }
  }

  // ---------- RESULTS VIEW ----------
  if (result) {
    const passed = result.passed
    const score = result.score
    const passScore = course?.pass_score || 60
    return (
      <div className="min-h-screen bg-gradient-to-b from-navy/5 to-white py-12 px-4" dir="rtl">
        <div className="max-w-2xl mx-auto">
          <Card className={`p-8 text-center ${passed ? 'border-green-500/40' : 'border-red-500/40'}`}>
            <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-4 ${passed ? 'bg-green-500/15' : 'bg-red-500/15'}`}>
              {passed ? <CheckCircle2 className="w-14 h-14 text-green-600" /> : <XCircle className="w-14 h-14 text-red-500" />}
            </div>
            <h1 className={`text-3xl font-bold mb-2 ${passed ? 'text-green-600' : 'text-red-500'}`}>
              {passed ? '🎉 نجحت!' : 'لم تنجح هذه المرة'}
            </h1>
            <p className="text-muted-foreground mb-6">حصلت على</p>
            <div className="text-6xl font-bold text-navy mb-2">{score}%</div>
            <p className="text-sm text-muted-foreground mb-6">
              {result.correct_count || 0} من {result.total_questions || 0} إجابة صحيحة · حد النجاح {passScore}%
            </p>
            {tabSwitches > 0 && (
              <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 border-yellow-500/30 mb-6">
                <AlertTriangle className="w-3 h-3 ml-1" /> {tabSwitches} تحذيرات أمنية مسجّلة
              </Badge>
            )}
            <div className="flex flex-wrap justify-center gap-3">
              <Button onClick={() => router.push('/')} className="bg-navy hover:bg-navy-light">
                العودة للوحة التحكم
              </Button>
              <Button onClick={() => router.push(`/courses/${course?.slug || ''}`)} variant="outline">
                مراجعة الدورة
              </Button>
            </div>
          </Card>

          {/* Per-question review */}
          <Card className="p-6 mt-6">
            <h3 className="font-bold text-navy mb-4">مراجعة الإجابات</h3>
            <div className="space-y-4">
              {questions.map((q, i) => {
                const userAnswer = answers[q.id]
                let userDisplay = 'لم تُجب'
                if (q.question_type === 'mcq' && typeof userAnswer === 'number' && q.options) {
                  userDisplay = String.fromCharCode(65 + userAnswer) + ') ' + (q.options[userAnswer] || '—')
                } else if (q.question_type === 'truefalse') {
                  userDisplay = userAnswer === true ? 'صح' : userAnswer === false ? 'خطأ' : 'لم تُجب'
                } else {
                  userDisplay = String(userAnswer || 'لم تُجب')
                }
                return (
                  <div key={q.id} className="border border-border rounded-lg p-3">
                    <div className="flex items-start gap-2 mb-2">
                      <span className="w-6 h-6 rounded-full bg-navy text-gold text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                      <p className="text-sm font-bold text-navy">{q.prompt}</p>
                    </div>
                    <p className="text-xs text-muted-foreground pr-8">إجابتك: <span className="font-medium text-navy">{userDisplay}</span></p>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>
      </div>
    )
  }

  // ---------- EXAM VIEW ----------
  const totalQuestions = questions.length
  const answeredCount = Object.keys(answers).filter((k) => answers[k] !== undefined && answers[k] !== null && answers[k] !== '').length
  const allAnswered = answeredCount === totalQuestions

  // Format timer
  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60
  const timeDisplay = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  const isUrgent = timeLeft < 60

  return (
    <div className="min-h-screen bg-gradient-to-b from-navy/5 to-white py-8 px-4" dir="rtl">
      <div className="max-w-3xl mx-auto">
        {/* Header — sticky timer */}
        <div className="sticky top-0 z-10 bg-white border border-border rounded-xl shadow-md p-4 mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-navy">{course?.title || 'اختبار'}</h1>
            <p className="text-xs text-muted-foreground">{answeredCount} من {totalQuestions} مجاب عنها</p>
          </div>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-lg font-bold ${isUrgent ? 'bg-red-500/15 text-red-600 animate-pulse' : 'bg-navy text-gold'}`}>
            <Clock className="w-5 h-5" />
            <span dir="ltr">{timeDisplay}</span>
          </div>
        </div>

        {/* Anti-cheat warning banner */}
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-4 flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-yellow-700">
            هذا الاختبار تحت المراقبة. النسخ/اللصق/الـ DevTools معطّلة. تغيير النشاط عن النافذة أو الخروج من وضع ملء الشاشة سيُسجّل كتحذير أمني.
          </p>
        </div>

        {/* Live warnings */}
        {warnings.length > 0 && (
          <div className="space-y-1 mb-4">
            {warnings.map((w, i) => (
              <div key={i} className="text-xs text-red-600 bg-red-500/10 border border-red-500/20 rounded p-2">{w}</div>
            ))}
          </div>
        )}

        {/* Progress bar */}
        <div className="bg-muted rounded-full h-2 overflow-hidden mb-6">
          <div className="bg-gold h-full transition-all" style={{ width: `${(answeredCount / totalQuestions) * 100}%` }} />
        </div>

        {/* Questions */}
        <div className="space-y-6">
          {questions.map((q, i) => {
            const userAnswer = answers[q.id]
            return (
              <Card key={q.id} className="p-5">
                <div className="flex items-start gap-3 mb-4">
                  <span className="w-8 h-8 rounded-full bg-navy text-gold text-sm font-bold flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <p className="text-base font-bold text-navy leading-relaxed">{q.prompt}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-[10px]">{q.difficulty}</Badge>
                      <Badge variant="outline" className="text-[10px]">{q.points} نقطة</Badge>
                    </div>
                  </div>
                </div>

                {/* Answer area */}
                {q.question_type === 'mcq' && Array.isArray(q.options) && (
                  <div className="space-y-2">
                    {q.options.map((opt: any, idx: number) => (
                      <button
                        key={idx}
                        onClick={() => setAnswers({ ...answers, [q.id]: idx })}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-right ${
                          userAnswer === idx
                            ? 'border-gold bg-gold/10'
                            : 'border-border hover:border-gold/50 hover:bg-muted/30'
                        }`}
                      >
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                          userAnswer === idx ? 'bg-gold text-navy' : 'bg-muted text-muted-foreground'
                        }`}>
                          {String.fromCharCode(65 + idx)}
                        </div>
                        <span className="text-sm text-navy flex-1">{opt}</span>
                      </button>
                    ))}
                  </div>
                )}

                {q.question_type === 'truefalse' && (
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: true, label: 'صح ✓', color: 'green' },
                      { value: false, label: 'خطأ ✗', color: 'red' },
                    ].map((opt) => (
                      <button
                        key={String(opt.value)}
                        onClick={() => setAnswers({ ...answers, [q.id]: opt.value })}
                        className={`p-4 rounded-lg border-2 transition-all text-center font-bold ${
                          userAnswer === opt.value
                            ? opt.color === 'green' ? 'border-green-500 bg-green-500/10 text-green-700' : 'border-red-500 bg-red-500/10 text-red-700'
                            : 'border-border hover:bg-muted/30 text-navy'
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
                    className="w-full p-3 border border-border rounded-lg focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
                  />
                )}
              </Card>
            )
          })}
        </div>

        {/* Submit footer */}
        <div className="sticky bottom-0 bg-white border border-border rounded-xl shadow-md p-4 mt-6 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {allAnswered ? '✓ تم الإجابة على كل الأسئلة' : `${totalQuestions - answeredCount} سؤال متبقي`}
          </p>
          <Button onClick={() => submit(false)} disabled={submitting} className="bg-navy hover:bg-navy-light">
            {submitting ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Send className="w-4 h-4 ml-1" />}
            {submitting ? 'جاري التسليم...' : 'تسليم الاختبار'}
          </Button>
        </div>
      </div>
    </div>
  )
}
