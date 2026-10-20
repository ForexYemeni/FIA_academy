'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/lib/auth-store'
import { toast } from 'sonner'
import {
  Award, Loader2, CheckCircle2, FileText, Clock, X, Download, ExternalLink,
} from 'lucide-react'

// Show the user's certificate-request + certificate status for a course.
// Used in the student course viewer when progress = 100%.
// Lets the student request a certificate even without an exam (the
// request goes to admin for approval → auto-issues the certificate).
export function CertificateRequest({ courseId, courseTitle }: { courseId: string; courseTitle: string }) {
  const user = useAuth((s) => s.user)
  const [loading, setLoading] = useState(true)
  const [existing, setExisting] = useState<any>(null) // existing cert-request row
  const [certificate, setCertificate] = useState<any>(null) // issued certificate row
  const [requesting, setRequesting] = useState(false)

  const load = async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      // Fetch all payment rows for this user + course via REST API.
      // The certificate-request record is stored as a payment row with
      // method='certificate_request' and a JSON-encoded reference field.
      const payRes = await fetch(`/api/enrollments?user_id=${user.id}&course_id=${courseId}`)
      const payData = await payRes.json()
      // Look for any certificate-request markers stored alongside
      const allPayRes = await fetch(`/api/payments?user_id=${user.id}`)
      if (allPayRes.ok) {
        const allPay = await allPayRes.json()
        // We also need to look up certificate_request rows — but /api/payments
        // now excludes them. So we directly query /api/certificate-requests.
      }
      // Fetch certificate-requests for this user
      const reqRes = await fetch(`/api/certificate-requests?user_id=${user.id}`)
      if (reqRes.ok) {
        const reqData = await reqRes.json()
        const arr = Array.isArray(reqData) ? reqData : (reqData.requests || [])
        const mine = arr.find((r: any) => r.course_id === courseId)
        if (mine) setExisting(mine)
        else setExisting(null)
      }

      // Look up issued certificate for this student + course_title
      if (user?.name) {
        const certRes = await fetch(`/api/certificates?student_name=${encodeURIComponent(user.name)}`)
        if (certRes.ok) {
          const certs = await certRes.json()
          const mine = (Array.isArray(certs) ? certs : []).find((c: any) => c.course_title === courseTitle && c.status === 'صالحة')
          if (mine) setCertificate(mine)
          else setCertificate(null)
        }
      }
    } catch (e: any) {
      // silent
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [user?.id, courseId, courseTitle])

  const requestCertificate = async () => {
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
      toast.success('تم إرسال طلب الشهادة للإدارة للمراجعة')
      load()
    } finally { setRequesting(false) }
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

  // If a request is pending review
  if (existing && ['pending', 'trainer_approved', 'admin_approved'].includes(existing.status)) {
    const statusLabel = existing.status === 'pending' ? 'قيد المراجعة' :
      existing.status === 'trainer_approved' ? 'معتمد من المدرب — بانتظار الإدارة' :
      'معتمد من الإدارة — جاري الإصدار'
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
          <h3 className="font-bold text-navy mb-2">طلبك قيد المراجعة</h3>
          <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/30">{statusLabel}</Badge>
          {existing.created_at && (
            <p className="text-xs text-muted-foreground mt-2">تاريخ الطلب: {new Date(existing.created_at).toLocaleDateString('ar-EG')}</p>
          )}
          <p className="text-xs text-muted-foreground mt-3">سيتم إصدار شهادتك تلقائياً فور اعتماد الطلب من الإدارة</p>
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
          <Button onClick={requestCertificate} disabled={requesting} size="sm" className="bg-gradient-to-r from-navy to-navy-light hover:from-navy-light hover:to-navy text-gold rounded-xl shadow-md active:scale-[0.97]">
            {requesting ? <Loader2 className="w-4 h-4 ml-1 animate-spin" /> : <FileText className="w-4 h-4 ml-1" />}
            أعد تقديم الطلب
          </Button>
        </div>
      </Card>
    )
  }

  // No request yet — show the request CTA (magical gold gradient card)
  return (
    <Card className="p-6 bg-gradient-to-br from-gold/10 to-amber-50/50 border-2 border-gold/40 overflow-hidden relative rounded-2xl">
      <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-l from-gold via-amber-400 to-gold opacity-70" />
      {/* Gold dot pattern overlay */}
      <div className="absolute inset-0 opacity-[0.08] pointer-events-none" style={{
        backgroundImage: 'radial-gradient(circle at 50% 50%, #D4AF37 1px, transparent 1px)',
        backgroundSize: '20px 20px',
      }} />
      {/* Gold glow circle */}
      <div className="absolute -top-8 -right-8 w-32 h-32 bg-gold/15 rounded-full blur-2xl" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-gold/10 rounded-full blur-2xl" />
      <div className="relative text-center">
        <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-gold to-amber-500 flex items-center justify-center mb-3 shadow-md ring-4 ring-gold/20">
          <Award className="w-8 h-8 text-navy" />
        </div>
        <h3 className="font-bold text-lg mb-2 text-navy">🎉 أكملت الدورة بنجاح!</h3>
        <p className="text-navy/70 text-sm mb-4 max-w-md mx-auto">
          احصل على شهادة إكمال معتمدة من أكاديمية المستقبل الدولية — قابلة للتحقق منها عبر QR code.
          اضغط الزر أدناه لتقديم طلب الشهادة. ستتم مراجعته من الإدارة ثم يصدر لك رقم الشهادة.
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
