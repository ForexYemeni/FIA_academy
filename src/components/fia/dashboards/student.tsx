'use client'

import { useEffect, useState } from 'react'
import {
  LayoutDashboard, BookOpen, FileText, Award, CreditCard,
  User, Bell, Settings, TrendingUp, Clock, CheckCircle2,
  Compass, Lock, Plus, Download, Loader2, FileUp, X, Copy, Share2,
} from 'lucide-react'
import { DashboardShell, StatCard, SectionCard, NavItem } from './shell'
import { useAuth } from '@/lib/auth-store'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { AvatarUploader } from '@/components/fia/avatar-uploader'
import { StudentCourseViewer } from '@/components/fia/student-course-viewer'

const NAV: NavItem[] = [
  { id: 'overview', label: 'نظرة عامة', icon: LayoutDashboard },
  { id: 'courses', label: 'دوراتي', icon: BookOpen },
  { id: 'browse', label: 'استكشاف الدورات', icon: Compass },
  { id: 'exams', label: 'اختباراتي', icon: FileText },
  { id: 'results', label: 'نتائجي', icon: TrendingUp },
  // { id: 'certificates', label: 'شهاداتي', icon: Award },  // DISABLED: certificate feature temporarily removed
  { id: 'payments', label: 'مدفوعاتي', icon: CreditCard },
  { id: 'profile', label: 'ملفي الشخصي', icon: User },
  { id: 'notifications', label: 'الإشعارات', icon: Bell },
  { id: 'settings', label: 'الإعدادات', icon: Settings },
]

export function StudentDashboard() {
  const [active, setActive] = useState('overview')
  const [viewingCourse, setViewingCourse] = useState<any | null>(null)
  const [viewingEnrollment, setViewingEnrollment] = useState<any | null>(null)
  const user = useAuth((s) => s.user)
  const updateUser = useAuth((s) => s.updateUser)
  const [courses, setCourses] = useState<any[]>([])
  const [certificates, setCertificates] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [enrollments, setEnrollments] = useState<any[]>([])
  const [profile, setProfile] = useState({ name: user?.name || '', phone: user?.phone || '', title: user?.title || '', bio: user?.bio || '' })

  const loadEnrollments = () => {
    if (!user?.id) return
    fetch(`/api/enrollments?user_id=${user.id}`).then((r) => r.json()).then((d) => setEnrollments(Array.isArray(d) ? d : [])).catch(() => {})
  }

  useEffect(() => {
    fetch('/api/courses').then((r) => r.json()).then((d) => setCourses(Array.isArray(d) ? d : [])).catch(() => {})
    fetch('/api/certificates').then((r) => r.json()).then((d) => setCertificates(Array.isArray(d) ? d : [])).catch(() => {})
    fetch('/api/payments').then((r) => r.json()).then((d) => setPayments(Array.isArray(d) ? d : [])).catch(() => {})
    loadEnrollments()
  }, [user?.id])

  const onEnrolled = () => {
    loadEnrollments()
  }

  return (
    <DashboardShell
      nav={NAV}
      active={active}
      onNavigate={(id) => { setActive(id); if (id !== 'course-view') setViewingCourse(null) }}
      roleLabel="متدرب"
      roleColor="bg-blue-500/15 text-blue-600 border-blue-500/30"
    >
      {active === 'course-view' && viewingCourse ? (
        <StudentCourseViewer
          course={viewingCourse}
          enrollment={viewingEnrollment}
          onBack={() => { setViewingCourse(null); setActive('courses'); loadEnrollments() }}
        />
      ) : null}
      {active !== 'course-view' && (
        <>
          {active === 'overview' && <Overview user={user} courses={courses} certificates={certificates} enrollments={enrollments} />}
          {active === 'courses' && <MyCourses courses={courses} enrollments={enrollments} studentName={user?.name} onContinue={(course, enrollment) => { setViewingCourse(course); setViewingEnrollment(enrollment); setActive('course-view') }} />}
          {active === 'browse' && <BrowseCourses courses={courses} enrollments={enrollments} userId={user?.id} onEnrolled={onEnrolled} />}
          {active === 'exams' && <Exams />}
          {active === 'results' && <Results />}
          {/* DISABLED: certificate feature temporarily removed — will be re-enabled when design+prompt provided */}
          {/* {active === 'certificates' && <Certificates certificates={certificates} />} */}
          {active === 'payments' && <Payments payments={payments} />}
          {active === 'profile' && <Profile profile={profile} setProfile={setProfile} user={user} updateUser={updateUser} />}
          {active === 'notifications' && <Notifications />}
          {active === 'settings' && <SettingsTab />}
        </>
      )}
    </DashboardShell>
  )
}

function Overview({ user, courses, certificates, enrollments }: any) {
  return (
    <div className="space-y-6">
      <div className="bg-fia-gradient rounded-2xl p-6 lg:p-8 text-white">
        <h2 className="text-2xl font-bold mb-1">أهلاً، {user?.name} 👋</h2>
        <p className="text-white/80">إليك ملخّص نشاطك في أكاديمية المستقبل الدولية</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={BookOpen} label="الدورات المسجّلة" value={enrollments?.length || 0} color="navy" />
        <StatCard icon={CheckCircle2} label="دورات مكتملة" value={enrollments?.filter((e:any)=>e.status==='completed').length || 0} color="green" />
        <StatCard icon={Clock} label="ساعات التعلّم" value={24} color="gold" />
        <StatCard icon={Award} label="الشهادات المكتسبة" value={certificates.length} color="blue" />
      </div>

      <SectionCard title="تقدّم الدورات" description="متابعة آخر التحديثات في دوراتك">
        <div className="space-y-4">
          {enrollments && enrollments.length > 0 ? (
            enrollments.slice(0, 3).map((e: any) => {
              const c = courses.find((x:any) => x.id === e.course_id)
              if (!c) return null
              return (
                <div key={e.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-navy text-sm">{c.title}</div>
                    <span className="text-xs text-muted-foreground">{e.progress || 0}%</span>
                  </div>
                  <Progress value={e.progress || 0} className="h-2" />
                </div>
              )
            })
          ) : (
            <div className="text-center py-6 text-muted-foreground text-sm">لا توجد دورات مسجّلة بعد — تصفّح الدورات المتاحة</div>
          )}
        </div>
      </SectionCard>

      <SectionCard title="الدورات الموصى بها" description="استكشف المزيد من الدورات">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.slice(0, 3).map((c: any) => (
            <Card key={c.id} className="p-4 card-hover">
              <div className="h-24 bg-navy rounded-lg mb-3 overflow-hidden">
                {c.cover && <img src={c.cover} alt={c.title} className="w-full h-full object-cover" />}
              </div>
              <div className="font-bold text-navy text-sm mb-1 line-clamp-1">{c.title}</div>
              <div className="text-xs text-muted-foreground mb-2">{c.duration_hours} ساعة</div>
              <Button size="sm" className="w-full bg-navy hover:bg-navy-light">عرض الدورة</Button>
            </Card>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}

function MyCourses({ courses, enrollments, onContinue, studentName }: any) {
  const [requesting, setRequesting] = useState<string | null>(null)

  const requestCertificate = async (course: any) => {
    setRequesting(course.id)
    try {
      const res = await fetch('/api/certificate-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: course.enrollment.user_id,
          course_id: course.id,
          student_name: studentName || course.enrollment.user_id || 'متدرب',
          course_title: course.title,
          fee: 0,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('تم إرسال طلب الشهادة! سيتم مراجعته من قبل المدرب والإدارة')
      } else {
        toast.error(data.error || 'فشل الطلب')
      }
    } catch {
      toast.error('خطأ في الاتصال')
    } finally {
      setRequesting(null)
    }
  }

  const enrolled = (enrollments || [])
    .map((e: any) => {
      const course = courses.find((c: any) => c.id === e.course_id)
      return course ? { ...course, enrollment: e } : null
    })
    .filter(Boolean)

  return (
    <SectionCard title="دوراتي المسجّلة" description={`${enrolled.length} دورة`}>
      {enrolled.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">لم تسجّل في أي دورة بعد</p>
          <p className="text-xs text-muted-foreground mb-4">تصفّح الدورات المتاحة في قسم "استكشاف الدورات"</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {enrolled.map((c: any) => (
            <Card key={c.id} className="overflow-hidden card-hover">
              <div className="h-32 bg-navy relative">
                {c.cover && <img src={c.cover} alt={c.title} className="w-full h-full object-cover" />}
                <div className="absolute top-2 right-2">
                  <Badge className={
                    (c.enrollment.status === 'completed' || c.enrollment.status === 'مكتمل') ? 'bg-green-500 text-white'
                    : c.enrollment.payment_status === 'pending' ? 'bg-yellow-500 text-white'
                    : 'bg-blue-500 text-white'
                  }>
                    {(c.enrollment.status === 'completed' || c.enrollment.status === 'مكتمل') ? 'مكتملة' : c.enrollment.payment_status === 'pending' ? 'بانتظار الدفع' : 'قيد التعلّم'}
                  </Badge>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-bold text-navy text-sm mb-2 line-clamp-1">{c.title}</h3>
                <Progress value={c.enrollment.progress || 0} className="h-2 mb-2" />
                <div className="flex justify-between text-xs text-muted-foreground mb-3">
                  <span>{c.enrollment.progress || 0}% مكتمل</span>
                  <span>{c.duration_hours} ساعة</span>
                </div>
                {c.enrollment.payment_status === 'pending' ? (
                  <Button size="sm" variant="outline" disabled className="w-full border-yellow-500/30 text-yellow-600">
                    بانتظار تأكيد الدفع
                  </Button>
                ) : (c.enrollment.status === 'completed' || c.enrollment.status === 'مكتمل') ? (
                  <div className="space-y-2">
                    <Button size="sm" variant="outline" className="w-full border-green-500/30 text-green-600 hover:bg-green-500/5">
                      <CheckCircle2 className="w-3.5 h-3.5 ml-1" /> دورة مكتملة
                    </Button>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-navy/30 text-navy hover:bg-navy/5"
                        onClick={() => onContinue(c, c.enrollment)}
                      >
                        <BookOpen className="w-3.5 h-3.5 ml-1" /> مراجعة
                      </Button>
                      {/* DISABLED: certificate request button removed — will be re-enabled when design+prompt provided */}
                      {/* <Button
                        size="sm"
                        className="bg-gold hover:bg-gold-light text-navy"
                        disabled={requesting === c.id}
                        onClick={() => requestCertificate(c)}
                      >
                        {requesting === c.id ? (
                          <><Loader2 className="w-3.5 h-3.5 ml-1 animate-spin" /> جاري...</>
                        ) : (
                          <><Award className="w-3.5 h-3.5 ml-1" /> طلب شهادة</>
                        )}
                      </Button> */}
                    </div>
                  </div>
                ) : (
                  <Button size="sm" className="w-full bg-gold hover:bg-gold-light text-navy" onClick={() => onContinue(c, c.enrollment)}>
                    متابعة التعلّم
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </SectionCard>
  )
}

function BrowseCourses({ courses, enrollments, userId, onEnrolled }: any) {
  const [paymentMethods, setPaymentMethods] = useState<any[]>([])
  const [payDialog, setPayDialog] = useState<{ course: any; open: boolean } | null>(null)
  const [enrolling, setEnrolling] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/payment-methods').then((r) => r.json()).then((d) => setPaymentMethods(Array.isArray(d) ? d.filter((p:any)=>p.enabled) : [])).catch(() => {})
  }, [])

  const isEnrolled = (courseId: string) => enrollments?.some((e: any) => e.course_id === courseId)

  const enrollFree = async (course: any) => {
    // Double-check client-side before calling API
    if (isEnrolled(course.id)) {
      toast.info('أنت مسجّل في هذه الدورة')
      return
    }
    setEnrolling(course.id)
    try {
      const res = await fetch('/api/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, course_id: course.id, payment_status: 'free' }),
      })
      const data = await res.json()
      if (data.already_enrolled) {
        toast.info('أنت مسجّل في هذه الدورة')
      } else if (res.ok) {
        toast.success(`تم التسجيل في دورة: ${course.title}`)
        onEnrolled()
      } else toast.error('فشل التسجيل')
    } catch {
      toast.error('خطأ')
    } finally {
      setEnrolling(null)
    }
  }

  const enrollPaid = async (course: any, method: any, reference: string, proofUrl?: string | null) => {
    // Double-check client-side before calling API
    if (isEnrolled(course.id)) {
      toast.info('أنت مسجّل في هذه الدورة')
      return
    }
    setEnrolling(course.id)
    try {
      // Combine reference with proof URL
      const fullReference = proofUrl ? `${reference} | PROOF: ${proofUrl}` : reference

      // 1. Create enrollment with pending payment
      const res = await fetch('/api/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          course_id: course.id,
          payment_status: 'pending',
          amount_paid: course.price,
          payment_method: method.name,
          payment_reference: fullReference,
        }),
      })
      const data = await res.json()
      if (data.already_enrolled) {
        toast.info('أنت مسجّل في هذه الدورة')
      } else if (res.ok) {
        // 2. Create payment record with proof URL
        await fetch('/api/payments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: course.price,
            currency: course.currency || 'ر.ي',
            method: method.name,
            status: 'قيد الانتظار',
            reference: fullReference,
            user_id: userId,
            course_id: course.id,
          }),
        })
        toast.success('تم تسجيل طلبك! سيتم تفعيل الدورة بعد تأكيد الدفع')
        onEnrolled()
        setPayDialog(null)
      } else toast.error('فشل التسجيل')
    } catch {
      toast.error('خطأ')
    } finally {
      setEnrolling(null)
    }
  }

  return (
    <SectionCard title="استكشاف الدورات" description="تصفّح جميع الدورات المتاحة">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {courses.map((c: any) => {
          const enrolled = isEnrolled(c.id)
          const isFree = c.price_type === 'مجانية' || c.price === 0
          return (
            <Card key={c.id} className="overflow-hidden card-hover">
              <div className="h-32 bg-navy relative">
                {c.cover && <img src={c.cover} alt={c.title} className="w-full h-full object-cover" />}
                <Badge className="absolute top-2 right-2 bg-navy/80 text-gold border-gold/30">{c.level}</Badge>
                {isFree ? (
                  <Badge className="absolute top-2 left-2 bg-green-500 text-white">مجانية</Badge>
                ) : (
                  <Badge className="absolute top-2 left-2 bg-gold text-navy">مدفوعة</Badge>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-bold text-navy text-sm mb-1 line-clamp-2 min-h-[2.5rem]">{c.title}</h3>
                <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{c.short_description}</p>
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {c.duration_hours || 0} ساعة
                  </span>
                  <span className="font-bold text-navy">
                    {isFree ? <span className="text-green-600">مجانية</span> : `${c.price.toLocaleString()} ${c.currency || 'ر.ي'}`}
                  </span>
                </div>
                {enrolled ? (
                  <Button size="sm" variant="outline" className="w-full border-green-500/30 text-green-600 bg-green-500/5">
                    <CheckCircle2 className="w-4 h-4 ml-1" /> مسجّل
                  </Button>
                ) : isFree ? (
                  <Button
                    size="sm"
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={() => enrollFree(c)}
                    disabled={enrolling === c.id}
                  >
                    {enrolling === c.id ? 'جاري التسجيل...' : 'سجّل الآن'}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="w-full bg-gold hover:bg-gold-light text-navy"
                    onClick={() => setPayDialog({ course: c, open: true })}
                  >
                    <Lock className="w-3.5 h-3.5 ml-1" /> اشترك الآن
                  </Button>
                )}
              </div>
            </Card>
          )
        })}
      </div>

      {payDialog?.open && (
        <PaymentDialog
          course={payDialog.course}
          methods={paymentMethods}
          open={payDialog.open}
          onOpenChange={(o) => setPayDialog({ ...payDialog, open: o })}
          onPay={(method: any, reference: string, proofUrl?: string | null) => enrollPaid(payDialog.course, method, reference, proofUrl)}
          loading={enrolling === payDialog.course.id}
        />
      )}
    </SectionCard>
  )
}

function PaymentDialog({ course, methods, open, onOpenChange, onPay, loading }: any) {
  const [selectedMethod, setSelectedMethod] = useState<any>(methods[0] || null)
  const [reference, setReference] = useState('')
  const [proofUrl, setProofUrl] = useState<string | null>(null)
  const [uploadingProof, setUploadingProof] = useState(false)

  const handleProofUpload = async (file: File) => {
    setUploadingProof(true)
    try {
      // Compress image on client side
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const maxW = 1024, maxH = 1024
          let { width, height } = img
          if (width > maxW) { height = (height * maxW) / width; width = maxW }
          if (height > maxH) { width = (width * maxH) / height; height = maxH }
          const canvas = document.createElement('canvas')
          canvas.width = width; canvas.height = height
          const ctx = canvas.getContext('2d')!
          ctx.drawImage(img, 0, 0, width, height)
          canvas.toBlob(async (blob) => {
            if (!blob) { setUploadingProof(false); return }
            const fd = new FormData()
            fd.append('file', new File([blob], 'proof.jpg', { type: 'image/jpeg' }))
            fd.append('folder', 'payment-proofs')
            const res = await fetch('/api/upload/image', { method: 'POST', body: fd })
            const data = await res.json()
            if (data.url) {
              setProofUrl(data.url)
              toast.success('تم رفع إثبات الدفع')
            } else {
              toast.error('فشل رفع الصورة')
            }
            setUploadingProof(false)
          }, 'image/jpeg', 0.85)
        }
        img.src = e.target?.result as string
      }
      reader.readAsDataURL(file)
    } catch {
      toast.error('خطأ في الرفع')
      setUploadingProof(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <button
          onClick={() => onOpenChange(false)}
          className="absolute top-3 left-3 w-8 h-8 rounded-full bg-muted hover:bg-muted-foreground/20 flex items-center justify-center z-50"
          title="إغلاق"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
        <DialogHeader>
          <DialogTitle>الاشتراك في دورة: {course.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="bg-gold/10 border border-gold/30 p-4 rounded-lg flex items-center justify-between">
            <span className="text-sm font-semibold text-navy">المبلغ المطلوب:</span>
            <span className="text-xl font-extrabold text-gold">
              {course.price?.toLocaleString()} {course.currency || 'ر.ي'}
            </span>
          </div>

          <div>
            <Label className="text-navy">اختر طريقة الدفع</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {methods.map((m: any) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedMethod(m)}
                  className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                    selectedMethod?.id === m.id ? 'border-gold bg-gold/5' : 'border-border hover:border-muted'
                  }`}
                >
                  <span className="text-2xl">{m.icon}</span>
                  <div className="text-right">
                    <div className="font-bold text-navy text-sm">{m.name}</div>
                    {m.wallet_id && <div className="text-xs text-muted-foreground font-mono" dir="ltr">{m.wallet_id}</div>}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {selectedMethod && (
            <div className="bg-muted/30 p-3 rounded-lg border border-border text-sm">
              <div className="font-semibold text-navy mb-1">{selectedMethod.name} — تعليمات الدفع:</div>
              <p className="text-muted-foreground text-xs">{selectedMethod.instructions || 'حول المبلغ إلى المحفظة الموضّحة، ثم ارفع صورة الإيصال.'}</p>
            </div>
          )}

          <div>
            <Label htmlFor="ref">رقم المعاملة / المرجع</Label>
            <Input
              id="ref"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="مثال: JB-123456789"
              dir="ltr"
              className="mt-1"
            />
          </div>

          {/* Payment proof upload */}
          <div>
            <Label className="text-navy">رفع صورة إثبات الدفع (إيصال)</Label>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              id="proof-upload"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleProofUpload(f) }}
            />
            <div className="mt-1 flex items-center gap-3">
              {proofUrl ? (
                <div className="flex items-center gap-2 flex-1">
                  <img src={proofUrl} alt="proof" className="w-16 h-16 object-cover rounded-md border-2 border-green-500/30" />
                  <div className="flex-1 text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> تم رفع الإيصال
                  </div>
                  <button onClick={() => setProofUrl(null)} className="text-red-500 text-xs">إزالة</button>
                </div>
              ) : (
                <Button type="button" variant="outline" disabled={uploadingProof} className="flex-1" onClick={() => document.getElementById('proof-upload')?.click()}>
                  {uploadingProof ? (
                    <><Loader2 className="w-4 h-4 ml-1 animate-spin" /> جاري الرفع...</>
                  ) : (
                    <><FileUp className="w-4 h-4 ml-1" /> اختر صورة الإيصال</>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button
            className="bg-navy hover:bg-navy-light"
            disabled={loading || !selectedMethod || !reference.trim() || !proofUrl}
            onClick={() => onPay(selectedMethod, reference, proofUrl)}
          >
            {loading ? 'جاري المعالجة...' : 'تأكيد الاشتراك'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Exams() {
  const exams = [
    { name: 'اختبار BLS الأساسي', course: 'BLS & ACLS', score: 85, status: 'ناجح', date: '2025-09-12' },
    { name: 'مكافحة العدوى - الوحدة 1', course: 'Infection Control', score: 0, status: 'لم يُجرَب', date: null },
    { name: 'أساسيات التمريض', course: 'Nursing Fundamentals', score: 0, status: 'متاح', date: null },
  ]
  return (
    <SectionCard title="اختباراتي" description="جميع الاختبارات المتاحة لك">
      <div className="space-y-3">
        {exams.map((e, i) => (
          <div key={i} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border">
            <div>
              <div className="font-semibold text-navy text-sm">{e.name}</div>
              <div className="text-xs text-muted-foreground mt-1">{e.course}</div>
            </div>
            <div className="flex items-center gap-3">
              {e.score > 0 ? (
                <>
                  <div className="text-right">
                    <div className="font-bold text-navy">{e.score}%</div>
                    <div className="text-xs text-green-600">{e.status}</div>
                  </div>
                  <Badge className="bg-green-500/15 text-green-600 border-green-500/30">{e.status}</Badge>
                </>
              ) : (
                <Button size="sm" className="bg-navy hover:bg-navy-light">ابدأ الاختبار</Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  )
}

function Results() {
  const results = [
    { exam: 'BLS الأساسي', score: 85, total: 100, status: 'ناجح', date: '2025-09-12' },
    { exam: 'مكافحة العدوى', score: 92, total: 100, status: 'ناجح', date: '2025-09-20' },
    { exam: 'ACLS المتقدم', score: 55, total: 100, status: 'راسب', date: '2025-09-25' },
  ]
  return (
    <SectionCard title="نتائجي" description="سجل نتائج الاختبارات">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-right text-muted-foreground">
              <th className="py-3 px-2">الاختبار</th>
              <th className="py-3 px-2">النتيجة</th>
              <th className="py-3 px-2">النسبة</th>
              <th className="py-3 px-2">الحالة</th>
              <th className="py-3 px-2">التاريخ</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r, i) => (
              <tr key={i} className="border-b border-border">
                <td className="py-3 px-2 font-medium text-navy">{r.exam}</td>
                <td className="py-3 px-2">{r.score}/{r.total}</td>
                <td className="py-3 px-2">
                  <div className="flex items-center gap-2">
                    <Progress value={r.score} className="w-16 h-2" />
                    <span>{r.score}%</span>
                  </div>
                </td>
                <td className="py-3 px-2">
                  <Badge className={r.status === 'ناجح' ? 'bg-green-500/15 text-green-600 border-green-500/30' : 'bg-red-500/15 text-red-600 border-red-500/30'}>
                    {r.status}
                  </Badge>
                </td>
                <td className="py-3 px-2 text-muted-foreground" dir="ltr">{r.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  )
}

function Certificates({ certificates }: any) {
  const myCerts = certificates.length > 0 ? certificates : []
  const [downloading, setDownloading] = useState<string | null>(null)
  const [copiedCert, setCopiedCert] = useState<string | null>(null)

  const handleDownload = (cert: any) => {
    setDownloading(cert.id)
    // Open PDF in new tab (browser will download or preview)
    window.open(`/api/certificate-pdf?number=${encodeURIComponent(cert.certificate_number)}&format=pdf`, '_blank')
    setTimeout(() => setDownloading(null), 2000)
  }

  const handleCopyCode = (cert: any, e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(cert.certificate_number)
    setCopiedCert(cert.id)
    toast.success('تم نسخ كود الشهادة', { description: cert.certificate_number })
    setTimeout(() => setCopiedCert(null), 2000)
  }

  const handleShare = (cert: any, e: React.MouseEvent) => {
    e.stopPropagation()
    const url = `https://fiaacademy.vercel.app/?verify=${encodeURIComponent(cert.certificate_number)}#verify`
    if (navigator.share) {
      navigator.share({
        title: 'شهادة معتمدة - أكاديمية المستقبل الدولية',
        text: `شهادة ${cert.student_name || ''} - ${cert.course_title || ''}`,
        url,
      }).catch(() => {})
    } else {
      navigator.clipboard.writeText(url)
      toast.success('تم نسخ رابط الشهادة')
    }
  }

  return (
    <SectionCard title="شهاداتي" description="الشهادات التي حصلت عليها">
      {myCerts.length === 0 ? (
        <div className="text-center py-12">
          <Award className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground mb-2">لا توجد شهادات بعد</p>
          <p className="text-xs text-muted-foreground">أنهِ دورة بنجاح للحصول على شهادة معتمدة</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {myCerts.map((c: any) => (
            <Card key={c.id} className="overflow-hidden card-hover border-2 border-gold/20">
              <div className="aspect-[4/3] bg-muted/30 relative overflow-hidden cursor-pointer" onClick={() => handleDownload(c)}>
                <img
                  src={`/api/certificate-pdf?number=${encodeURIComponent(c.certificate_number)}&format=png`}
                  alt={c.course_title || 'certificate'}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-10 h-10 rounded-full bg-gold/15 flex items-center justify-center">
                    <Award className="w-5 h-5 text-gold" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-navy text-sm line-clamp-1">{c.course_title || 'دورة'}</div>
                  </div>
                </div>
                {/* Certificate code card — copyable & prominent */}
                <div className="bg-gradient-to-br from-navy to-navy-light rounded-lg p-3 mb-3 border border-gold/30">
                  <div className="text-[10px] text-gold/80 font-semibold mb-1">كود الشهادة (قابل للنسخ)</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 text-white font-mono text-sm md:text-base font-bold tracking-wide truncate" dir="ltr">{c.certificate_number}</div>
                    <button
                      onClick={(e) => handleCopyCode(c, e)}
                      className="flex-shrink-0 w-7 h-7 rounded-md bg-gold hover:bg-gold-light text-navy flex items-center justify-center transition-colors"
                      title="نسخ الكود"
                    >
                      {copiedCert === c.id ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <button
                    onClick={(e) => handleShare(c, e)}
                    className="mt-2 w-full text-[10px] text-gold/70 hover:text-gold flex items-center justify-center gap-1 py-1 rounded transition-colors"
                  >
                    <Share2 className="w-3 h-3" /> مشاركة الشهادة
                  </button>
                </div>
                <Badge className="bg-green-500/15 text-green-600 border-green-500/30 mb-3">{c.status}</Badge>
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 bg-navy hover:bg-navy-light" onClick={() => handleDownload(c)} disabled={downloading === c.id}>
                    <Download className="w-3.5 h-3.5 ml-1" /> PDF
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 border-gold/30 text-navy hover:bg-gold/10" onClick={() => window.open(`/api/certificate-pdf?number=${encodeURIComponent(c.certificate_number)}&format=png`, '_blank')}>
                    صورة
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </SectionCard>
  )
}

function Payments({ payments }: any) {
  const myPayments = payments.length > 0 ? payments : [
    { id: '1', amount: 35000, currency: 'ر.ي', method: 'جيب', status: 'مكتمل', reference: 'JB-7842', date: '2025-09-10' }
  ]
  return (
    <SectionCard title="مدفوعاتي" description="سجل المعاملات المالية">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-right text-muted-foreground">
              <th className="py-3 px-2">المبلغ</th>
              <th className="py-3 px-2">الطريقة</th>
              <th className="py-3 px-2">المرجع</th>
              <th className="py-3 px-2">الحالة</th>
              <th className="py-3 px-2">التاريخ</th>
            </tr>
          </thead>
          <tbody>
            {myPayments.map((p: any, i: number) => (
              <tr key={i} className="border-b border-border">
                <td className="py-3 px-2 font-bold text-navy">{p.amount.toLocaleString()} {p.currency || 'ر.ي'}</td>
                <td className="py-3 px-2">{p.method || '-'}</td>
                <td className="py-3 px-2 font-mono" dir="ltr">{p.reference || '-'}</td>
                <td className="py-3 px-2">
                  <Badge className="bg-green-500/15 text-green-600 border-green-500/30">{p.status}</Badge>
                </td>
                <td className="py-3 px-2 text-muted-foreground" dir="ltr">{p.date ? new Date(p.date).toLocaleDateString('ar-EG') : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  )
}

function Profile({ profile, setProfile, user, updateUser }: any) {
  const [loading, setLoading] = useState(false)

  const save = async () => {
    setLoading(true)
    try {
      // Update locally — in real app, would call /api/students PUT
      updateUser({
        name: profile.name,
        phone: profile.phone,
        title: profile.title,
        bio: profile.bio,
      })
      toast.success('تم تحديث الملف الشخصي')
    } catch {
      toast.error('فشل التحديث')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SectionCard title="الملف الشخصي" description="إدارة معلوماتك الشخصية">
      <div className="space-y-6 max-w-2xl">
        <div className="flex flex-col items-center gap-4 p-4 bg-muted/30 rounded-lg border border-border">
          <AvatarUploader
            userId={user.id}
            role="student"
            initialUrl={user?.avatar}
            name={user?.name}
            size="xl"
            onUploaded={(url) => updateUser({ avatar: url })}
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-navy">الاسم الكامل</Label>
            <Input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} className="mt-1" />
          </div>
          <div>
            <Label className="text-navy">البريد الإلكتروني</Label>
            <Input value={user?.email || ''} disabled dir="ltr" className="mt-1" />
          </div>
          <div>
            <Label className="text-navy">رقم الهاتف</Label>
            <Input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} dir="ltr" className="mt-1" />
          </div>
          <div>
            <Label className="text-navy">التخصص</Label>
            <Input value={profile.title} onChange={(e) => setProfile({ ...profile, title: e.target.value })} className="mt-1" />
          </div>
        </div>
        <div>
          <Label className="text-navy">نبذة تعريفية</Label>
          <Textarea value={profile.bio} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} rows={4} className="mt-1" />
        </div>
        <Button onClick={save} disabled={loading} className="bg-navy hover:bg-navy-light">
          {loading ? 'جاري الحفظ...' : 'حفظ التغييرات'}
        </Button>
      </div>
    </SectionCard>
  )
}

function Notifications() {
  const notifs = [
    { title: 'تم إصدار شهادتك', desc: 'شهادة دورة BLS جاهزة للتحميل', time: 'قبل ساعة', read: false },
    { title: 'تذكير: اختبار قادم', desc: 'اختبار مكافحة العدوى يوم السبت', time: 'قبل 5 ساعات', read: false },
    { title: 'دورة جديدة متاحة', desc: 'دورة طب الطوارئ المتقدم', time: 'أمس', read: true },
  ]
  return (
    <SectionCard title="الإشعارات" description="آخر التحديثات والتنبيهات">
      <div className="space-y-3">
        {notifs.map((n, i) => (
          <div key={i} className={`p-4 rounded-lg border ${n.read ? 'bg-muted/20 border-border' : 'bg-gold/5 border-gold/20'}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold text-navy text-sm">{n.title}</div>
                <div className="text-xs text-muted-foreground mt-1">{n.desc}</div>
              </div>
              <div className="flex flex-col items-end gap-1">
                {!n.read && <span className="w-2 h-2 bg-gold rounded-full" />}
                <span className="text-xs text-muted-foreground">{n.time}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  )
}

function SettingsTab() {
  return (
    <SectionCard title="الإعدادات" description="تخصيص حسابك">
      <div className="space-y-6 max-w-2xl">
        <div>
          <h3 className="font-semibold text-navy mb-3">الإشعارات</h3>
          <div className="space-y-3">
            <SettingToggle label="إشعارات البريد الإلكتروني" desc="تنبيهات حول الدورات والاختبارات" defaultChecked />
            <SettingToggle label="إشعارات الهاتف" desc="رسائل SMS للتحديثات المهمة" defaultChecked />
            <SettingToggle label="نشرة أسبوعية" desc="ملخّص أسبوعي بنشاطك" />
          </div>
        </div>
        <div>
          <h3 className="font-semibold text-navy mb-3">الأمان</h3>
          <Button variant="outline">تغيير كلمة المرور</Button>
        </div>
      </div>
    </SectionCard>
  )
}

function SettingToggle({ label, desc, defaultChecked }: { label: string; desc: string; defaultChecked?: boolean }) {
  const [on, setOn] = useState(!!defaultChecked)
  return (
    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
      <div>
        <div className="font-medium text-navy text-sm">{label}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
      <button onClick={() => setOn(!on)} className={`relative w-11 h-6 rounded-full transition-colors ${on ? 'bg-gold' : 'bg-muted'}`}>
        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all ${on ? 'right-0.5' : 'right-5'}`} />
      </button>
    </div>
  )
}
