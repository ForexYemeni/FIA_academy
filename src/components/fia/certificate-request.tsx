'use client'

// ============================================================================
// CERTIFICATE REQUEST — Royal v4 with EXAM GATE
// ----------------------------------------------------------------------------
// If the course has a question bank (exam), the student MUST pass it before
// requesting the certificate. If not passed yet, a luxurious block card
// appears and sends him straight to «اختباراتي» (/#exams).
// If the course has no question bank, the request flows as before.
// Chain: student request → trainer approve → admin approve → issue.
// ============================================================================
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/lib/auth-store'
import { toast } from 'sonner'
import {
  Award, Loader2, CheckCircle2, FileText, Clock, X, ExternalLink,
  ShieldCheck, Lock, HelpCircle,
} from 'lucide-react'

// Show the user's certificate-request + certificate status for a course.
// Used in the student course viewer when progress = 100%.
export function CertificateRequest({ courseId, courseTitle }: { courseId: string; courseTitle: string }) {
  const user = useAuth((s) => s.user)
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [existing, setExisting] = useState<any>(null) // existing cert-request row
  const [certificate, setCertificate] = useState<any>(null) // issued certificate row
  const [requesting, setRequesting] = useState(false)

  // Exam gate state
  const [hasBank, setHasBank] = useState(false) // does the course have an active question bank?
  const [questionsCount, setQuestionsCount] = useState(0)
  const [bestAttempt, setBestAttempt] = useState<any>(null) // best submitted attempt
  const [openAttempt, setOpenAttempt] = useState<any>(null) // unsubmitted attempt

  const examPassed = bestAttempt?.passed === true

  const load = async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      // 1) Question bank of this course (gate source of truth)
      try {
        const qRes = await fetch(`/api/exam-questions?course_id=${courseId}`)
        const qs = await qRes.json()
        const count = Array.isArray(qs) ? qs.length : 0
        setQuestionsCount(count)
        setHasBank(count > 0)
      } catch { setHasBank(false); setQuestionsCount(0) }

      // 2) This student's attempts for the course
      try {
        const attRes = await fetch(`/api/exam-attempts?user_id=${user.id}&course_id=${courseId}`)
        const atts = await attRes.json()
        const arr = Array.isArray(atts) ? atts : []
        const submitted = arr.filter((a: any) => a.submitted_at)
        setOpenAttempt(arr.find((a: any) => !a.submitted_at) || null)
        setBestAttempt(submitted.length > 0
          ? submitted.reduce((best: any, a: any) => ((a.score || 0) > (best?.score ?? -1) ? a : best), null)
          : null)
      } catch { setBestAttempt(null); setOpenAttempt(null) }

      // 3) Certificate-request rows
      const reqRes = await fetch(`/api/certificate-requests?user_id=${user.id}`)
      if (reqRes.ok) {
        const reqData = await reqRes.json()
        const arr = Array.isArray(reqData) ? reqData : (reqData.requests || [])
        const mine = arr.find((r: any) => r.course_id === courseId)
        setExisting(mine || null)
      }

      // 4) Issued certificate for this student + course_title
      if (user?.name) {
        const certRes = await fetch(`/api/certificates?student_name=${encodeURIComponent(user.name)}`)
        if (certRes.ok) {
          const certs = await certRes.json()
          const mine = (Array.isArray(certs) ? certs : []).find((c: any) => c.course_title === courseTitle && c.status === 'صالحة')
          setCertificate(mine || null)
        }
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [user?.id, courseId, courseTitle])

  const requestCertificate = async () => {
    // FINAL client-side gate — never allow requesting before passing the exam
    if (hasBank && !examPassed) {
      toast.error('يجب اجتياز اختبار الدورة أولاً قبل طلب الشهادة')
      return
    }
    if (!user) return
    setRequesting(true)
    try {
      const res = await fetch('/api/certificate-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          course_id: courseId,
          student_name: user.name,
          course_title: courseTitle,
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'فشل إرسال الطلب'); return }
      toast.success('تم إرسال طلب الشهادة — ينتظر موافقة المدرب ثم الإدارة')
      load()
    } finally { setRequesting(false) }
  }

  const goToExams = () => {
    // Exit the course viewer and jump straight to «اختباراتي» in the dashboard.
    // Setting the hash directly always fires `hashchange` (picked up by
    // useHashTab) — router.push alone can be a no-op when already on '/'.
    if (typeof window !== 'undefined' && window.location.pathname === '/') {
      window.location.hash = '#exams'
    } else {
      router.push('/#exams')
    }
  }

  if (loading) {
    return (
      <Card className="p-6 text-center relative overflow-hidden border-2 border-gold/30 rounded-2xl">
        <div className="absolute inset-0 opacity-[0.07] pointer-events-none" style={{
          backgroundImage: 'radial-gradient(circle at 50% 50%, #D4AF37 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }} />
        <Loader2 className="w-6 h-6 mx-auto animate-spin text-gold relative" />
      </Card>
    )
  }

  // If a certificate is already issued
  if (certificate) {
    return (
      <Card className="p-6 bg-gradient-to-br from-gold/10 via-white to-navy/5 border-2 border-gold/40 overflow-hidden relative rounded-2xl">
        <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-l from-gold via-amber-400 to-gold opacity-70" />
        <div className="absolute inset-0 opacity-[0.07] pointer-events-none" style={{
          backgroundImage: 'radial-gradient(circle at 50% 50%, #D4AF37 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }} />
        <div className="absolute top-4 right-4 w-32 h-32 bg-gold/15 rounded-full blur-3xl" />
        <div className="relative text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-gold to-amber-500 flex items-center justify-center mb-3 shadow-md ring-4 ring-gold/20">
            <CheckCircle2 className="w-8 h-8 text-navy" />
          </div>
          <h3 className="font-bold text-navy text-lg mb-2">🎉 شهادتك الصادرة</h3>
          <p className="font-mono text-sm text-gold mb-3" dir="ltr">{certificate.certificate_number}</p>
          <a
            href={`/verify/${certificate.certificate_number}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-navy to-navy-light hover:from-navy-light hover:to-navy text-gold px-5 py-2.5 rounded-xl font-bold text-sm shadow-md active:scale-[0.97] transition-all"
          >
            <Award className="w-4 h-4" /> عرض / تحميل الشهادة
          </a>
        </div>
      </Card>
    )
  }

  // ========================================================================
  // 🔒 EXAM GATE — the course has a question bank and the student hasn't
  // passed it yet → luxurious block card + redirect to «اختباراتي»
  // ========================================================================
  if (hasBank && !examPassed && !(existing && ['pending', 'trainer_approved', 'admin_approved', 'issued'].includes(existing.status))) {
    return (
      <Card className="p-6 bg-gradient-to-br from-navy/[0.04] to-white border-2 border-amber-500/40 rounded-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-l from-amber-400 via-amber-500 to-amber-400 opacity-70" />
        <div className="absolute inset-0 opacity-[0.06] pointer-events-none" style={{
          backgroundImage: 'radial-gradient(circle at 50% 50%, #D4AF37 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }} />
        <div className="absolute top-4 left-4 w-28 h-28 bg-amber-400/20 rounded-full blur-3xl" />
        <div className="relative text-center">
          <div className="relative w-16 h-16 mx-auto mb-3">
            <div className="absolute inset-0 bg-amber-500/20 rounded-full blur-xl animate-pulse" />
            <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-md ring-4 ring-amber-400/20">
              <Lock className="w-7 h-7 text-white" />
            </div>
          </div>
          <h3 className="font-bold text-navy text-lg mb-1.5">اختبار الدورة مطلوب قبل الشهادة</h3>
          <p className="text-navy/70 text-sm mb-3 max-w-md mx-auto leading-relaxed">
            هذه الدورة تحتوي على اختبار بنك أسئلة من <b className="text-navy">{questionsCount} سؤال</b>.
            يجب اجتياز الاختبار أولاً لتصبح مؤهلاً لطلب شهادة الإكمال — التصحيح تلقائي فور التسليم.
          </p>

          {/* Exam status strip */}
          <div className="flex items-center justify-center gap-2 flex-wrap mb-4">
            <Badge variant="outline" className="bg-white/60 border-amber-500/40 text-navy text-[11px] font-bold">
              <HelpCircle className="w-3 h-3 ml-1" /> {questionsCount} سؤال بانتظارك
            </Badge>
            {bestAttempt ? (
              <Badge variant="outline" className="bg-rose-500/10 border-rose-500/40 text-rose-600 text-[11px] font-bold">
                <X className="w-3 h-3 ml-1" /> أفضل نتيجة: {bestAttempt.score}% — لم تحقق درجة النجاح
              </Badge>
            ) : openAttempt ? (
              <Badge variant="outline" className="bg-blue-500/10 border-blue-500/40 text-blue-600 text-[11px] font-bold">
                <Clock className="w-3 h-3 ml-1" /> لديك محاولة مفتوحة قيد الحل
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-white/60 border-border text-navy/70 text-[11px] font-bold">
                <FileText className="w-3 h-3 ml-1" /> لم تبدأ الاختبار بعد
              </Badge>
            )}
          </div>

          <Button onClick={goToExams}
            className="bg-gradient-to-r from-purple-600 to-fuchsia-700 hover:from-purple-700 hover:to-fuchsia-800 text-white font-bold rounded-xl shadow-md active:scale-[0.97] px-6">
            <FileText className="w-4 h-4 ml-1" /> الانتقال إلى اختباراتي الآن
          </Button>
          <p className="text-[11px] text-muted-foreground mt-3 flex items-center justify-center gap-1">
            <ShieldCheck className="w-3 h-3 text-gold" />
            بعد النجاح يُسمح لك بطلب الشهادة ← موافقة المدرب ← موافقة الإدارة ← الإصدار
          </p>
        </div>
      </Card>
    )
  }

  // If a request is pending review
  if (existing && ['pending', 'trainer_approved', 'admin_approved'].includes(existing.status)) {
    const statusLabel = existing.status === 'pending' ? 'بانتظار موافقة المدرب' :
      existing.status === 'trainer_approved' ? 'وافق المدرب — بانتظار موافقة الإدارة' :
      'اعتمدت الإدارة — جاري الإصدار'
    return (
      <Card className="p-6 bg-gradient-to-br from-amber-50 to-amber-100/50 border-2 border-amber-500/40 rounded-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-l from-amber-400 via-amber-500 to-amber-400 opacity-70" />
        <div className="absolute inset-0 opacity-[0.06] pointer-events-none" style={{
          backgroundImage: 'radial-gradient(circle at 50% 50%, #D4AF37 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }} />
        <div className="absolute top-4 right-4 w-28 h-28 bg-amber-400/20 rounded-full blur-3xl" />
        <div className="relative text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center mb-3 shadow-md ring-4 ring-amber-400/20">
            <Clock className="w-7 h-7 text-white" />
          </div>
          <h3 className="font-bold text-navy mb-2">طلبك في سلسلة الموافقات</h3>
          <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/30">{statusLabel}</Badge>
          {/* Approval chain visual */}
          <div className="flex items-center justify-center gap-1.5 mt-4 text-[10px] font-bold">
            {[
              { key: 'pending', label: 'المدرب' },
              { key: 'trainer_approved', label: 'الإدارة' },
              { key: 'admin_approved', label: 'الإصدار' },
            ].map((step, i) => {
              const order = ['pending', 'trainer_approved', 'admin_approved']
              const done = order.indexOf(existing.status) > i
              const current = order.indexOf(existing.status) === i
              return (
                <span key={step.key} className="flex items-center gap-1.5">
                  {i > 0 && <span className="w-4 h-px bg-border" />}
                  <span className={`rounded-full px-2.5 py-1 border ${
                    done ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-700'
                    : current ? 'bg-gold/15 border-gold/50 text-navy animate-pulse'
                    : 'bg-muted/40 border-border text-muted-foreground'
                  }`}>{step.label}</span>
                </span>
              )
            })}
          </div>
          {existing.created_at && (
            <p className="text-xs text-muted-foreground mt-3">تاريخ الطلب: {new Date(existing.created_at).toLocaleDateString('ar-EG')}</p>
          )}
          <p className="text-xs text-muted-foreground mt-2">سيتم إصدار شهادتك تلقائياً فور اكتمال سلسلة الموافقات</p>
        </div>
      </Card>
    )
  }

  // If a request was rejected
  if (existing && existing.status === 'rejected') {
    return (
      <Card className="p-6 bg-gradient-to-br from-rose-50 to-rose-100/50 border-2 border-rose-500/40 rounded-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-l from-rose-400 via-rose-500 to-rose-400 opacity-70" />
        <div className="absolute inset-0 opacity-[0.06] pointer-events-none" style={{
          backgroundImage: 'radial-gradient(circle at 50% 50%, #D4AF37 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }} />
        <div className="absolute top-4 right-4 w-28 h-28 bg-rose-400/20 rounded-full blur-3xl" />
        <div className="relative text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center mb-3 shadow-md ring-4 ring-rose-400/20">
            <X className="w-7 h-7 text-white" />
          </div>
          <h3 className="font-bold text-navy mb-2">تم رفض طلبك</h3>
          {existing.admin_note && <p className="text-xs text-muted-foreground mb-3">السبب: {existing.admin_note}</p>}
          {/* If the exam gate is the reason, guide to exams instead of re-requesting */}
          {hasBank && !examPassed ? (
            <Button onClick={goToExams} size="sm" className="bg-gradient-to-r from-purple-600 to-fuchsia-700 hover:from-purple-700 hover:to-fuchsia-800 text-white rounded-xl shadow-md active:scale-[0.97]">
              <FileText className="w-4 h-4 ml-1" /> أكمل اختبار الدورة أولاً
            </Button>
          ) : (
            <Button onClick={requestCertificate} disabled={requesting} size="sm" className="bg-gradient-to-r from-navy to-navy-light hover:from-navy-light hover:to-navy text-gold rounded-xl shadow-md active:scale-[0.97]">
              {requesting ? <Loader2 className="w-4 h-4 ml-1 animate-spin" /> : <FileText className="w-4 h-4 ml-1" />}
              أعد تقديم الطلب
            </Button>
          )}
        </div>
      </Card>
    )
  }

  // No request yet — exam passed (or course has no bank) → the request CTA
  return (
    <Card className="p-6 bg-gradient-to-br from-gold/10 to-amber-50/50 border-2 border-gold/40 overflow-hidden relative rounded-2xl">
      <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-l from-gold via-amber-400 to-gold opacity-70" />
      <div className="absolute inset-0 opacity-[0.08] pointer-events-none" style={{
        backgroundImage: 'radial-gradient(circle at 50% 50%, #D4AF37 1px, transparent 1px)',
        backgroundSize: '20px 20px',
      }} />
      <div className="absolute -top-8 -right-8 w-32 h-32 bg-gold/15 rounded-full blur-2xl" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-gold/10 rounded-full blur-2xl" />
      <div className="relative text-center">
        <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-gold to-amber-500 flex items-center justify-center mb-3 shadow-md ring-4 ring-gold/20">
          <Award className="w-8 h-8 text-navy" />
        </div>
        <h3 className="font-bold text-lg mb-2 text-navy">🎉 أكملت الدورة واختبارها بنجاح!</h3>
        {hasBank && bestAttempt && (
          <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30 mb-3">
            <CheckCircle2 className="w-3 h-3 ml-1" /> نتيجة اختبارك: {bestAttempt.score}% — ناجح
          </Badge>
        )}
        <p className="text-navy/70 text-sm mb-4 max-w-md mx-auto">
          أنت الآن مؤهل لطلب شهادة الإكمال المعتمدة من أكاديمية المستقبل الدولية — قابلة للتحقق عبر QR code.
          يمر الطلب بسلسلة الموافقات: المدرب ← الإدارة ← الإصدار.
        </p>
        <Button
          onClick={requestCertificate}
          disabled={requesting}
          className="bg-gradient-to-r from-gold to-amber-500 hover:from-amber-500 hover:to-gold text-navy font-bold rounded-xl shadow-md active:scale-[0.97]"
        >
          {requesting ? <Loader2 className="w-4 h-4 ml-1 animate-spin" /> : <FileText className="w-4 h-4 ml-1" />}
          {requesting ? 'جاري إرسال الطلب...' : '📜 اطلب شهادتك الآن'}
        </Button>
      </div>
    </Card>
  )
}
