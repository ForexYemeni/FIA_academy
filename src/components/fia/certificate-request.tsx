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
      <Card className="p-6 text-center">
        <Loader2 className="w-5 h-5 mx-auto animate-spin text-navy" />
      </Card>
    )
  }

  // If a certificate is already issued
  if (certificate) {
    return (
      <Card className="p-6 bg-gradient-to-br from-gold/10 via-white to-navy/5 border-gold/30 overflow-hidden relative">
        <div className="absolute top-4 right-4 w-32 h-32 bg-gold/10 rounded-full blur-3xl" />
        <div className="relative text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-gold/15 flex items-center justify-center mb-3">
            <CheckCircle2 className="w-8 h-8 text-gold" />
          </div>
          <h3 className="font-bold text-navy text-lg mb-2">🎉 شهادتك الصادرة</h3>
          <p className="font-mono text-sm text-gold mb-3" dir="ltr">{certificate.certificate_number}</p>
          <a
            href={`/verify/${certificate.certificate_number}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-navy hover:bg-navy-light text-white px-5 py-2.5 rounded-lg font-bold text-sm"
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
      <Card className="p-6 bg-yellow-500/5 border-yellow-500/30">
        <div className="text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-yellow-500/15 flex items-center justify-center mb-3">
            <Clock className="w-7 h-7 text-yellow-600" />
          </div>
          <h3 className="font-bold text-navy mb-2">طلبك قيد المراجعة</h3>
          <Badge className="bg-yellow-500/15 text-yellow-700 border-yellow-500/30">{statusLabel}</Badge>
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
      <Card className="p-6 bg-red-500/5 border-red-500/30">
        <div className="text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-red-500/15 flex items-center justify-center mb-3">
            <X className="w-7 h-7 text-red-500" />
          </div>
          <h3 className="font-bold text-navy mb-2">تم رفض طلبك</h3>
          {existing.admin_note && <p className="text-xs text-muted-foreground mb-3">السبب: {existing.admin_note}</p>}
          <Button onClick={requestCertificate} disabled={requesting} size="sm" className="bg-navy hover:bg-navy-light">
            {requesting ? <Loader2 className="w-4 h-4 ml-1 animate-spin" /> : <FileText className="w-4 h-4 ml-1" />}
            أعد تقديم الطلب
          </Button>
        </div>
      </Card>
    )
  }

  // No request yet — show the request CTA
  return (
    <Card className="p-6 bg-gradient-to-br from-navy to-navy-light text-white border-gold/30 overflow-hidden relative">
      <div className="absolute top-0 right-0 w-40 h-40 bg-gold/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-gold/5 rounded-full blur-2xl" />
      <div className="relative text-center">
        <div className="w-16 h-16 mx-auto rounded-full bg-gold/20 flex items-center justify-center mb-3">
          <Award className="w-8 h-8 text-gold" />
        </div>
        <h3 className="font-bold text-lg mb-2">🎉 أكملت الدورة بنجاح!</h3>
        <p className="text-white/70 text-sm mb-4 max-w-md mx-auto">
          احصل على شهادة إكمال معتمدة من أكاديمية المستقبل الدولية — قابلة للتحقق منها عبر QR code.
          اضغط الزر أدناه لتقديم طلب الشهادة. ستتم مراجعته من الإدارة ثم يصدر لك رقم الشهادة.
        </p>
        <Button
          onClick={requestCertificate}
          disabled={requesting}
          className="bg-gold hover:bg-gold-light text-navy font-bold"
        >
          {requesting ? <Loader2 className="w-4 h-4 ml-1 animate-spin" /> : <FileText className="w-4 h-4 ml-1" />}
          {requesting ? 'جاري إرسال الطلب...' : '📜 اطلب شهادتك الآن'}
        </Button>
      </div>
    </Card>
  )
}
