'use client'

import { useEffect, useState } from 'react'
import {
  LayoutDashboard, BookOpen, FileText, Award, CreditCard,
  User, Bell, Settings, TrendingUp, Clock, CheckCircle2,
  Compass, Lock, Plus, Download, Loader2, FileUp, X, Copy, Share2,
  Mail, Eye, EyeOff, MessageSquare, Newspaper, HelpCircle, Gift, ExternalLink,
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
import { SharedForum, SharedBlog, SharedFAQ } from './shared-community'
import { AffiliateDashboard } from '@/components/fia/affiliate-dashboard'
import { CertificateRequest } from '@/components/fia/certificate-request'
import { CertificateViewer } from '@/components/fia/certificate-viewer'

const NAV: NavItem[] = [
  { id: 'overview', label: 'نظرة عامة', icon: LayoutDashboard },
  { id: 'courses', label: 'دوراتي', icon: BookOpen },
  { id: 'browse', label: 'استكشاف الدورات', icon: Compass },
  { id: 'exams', label: 'اختباراتي', icon: FileText },
  { id: 'results', label: 'نتائجي', icon: TrendingUp },
  { id: 'certificates', label: 'شهاداتي', icon: Award },
  { id: 'payments', label: 'مدفوعاتي', icon: CreditCard },
  { id: 'forum', label: 'المنتدى', icon: MessageSquare },
  { id: 'blog', label: 'المدونة', icon: Newspaper },
  { id: 'faqs', label: 'الأسئلة الشائعة', icon: HelpCircle },
  { id: 'affiliate', label: 'برنامج العمولة', icon: Gift },
  { id: 'profile', label: 'ملفي الشخصي', icon: User },
  { id: 'notifications', label: 'الإشعارات', icon: Bell },
  { id: 'settings', label: 'الإعدادات', icon: Settings },
]

// Bio may embed structured JSON after a marker (e.g. "===FIA_EXTRA===").
// Show only the human-readable text in the UI, but preserve the extra data on save.
const FIA_BIO_EXTRA_MARKER = '===FIA_EXTRA==='
const splitBio = (raw: string) => {
  const i = raw.indexOf(FIA_BIO_EXTRA_MARKER)
  return i === -1 ? raw : raw.slice(0, i).trimEnd()
}
const joinBio = (display: string, original?: string) => {
  if (!original) return display
  const i = original.indexOf(FIA_BIO_EXTRA_MARKER)
  if (i === -1) return display
  return `${display.trimEnd()}\n\n${original.slice(i)}`
}

// Returns a normalized status info object for an enrollment's payment_status.
// payment_status can be one of: 'pending' | 'confirmed' | 'completed' | 'free'.
// - 'pending'    -> student paid, waiting for admin approval (yellow)
// - 'confirmed'  -> admin approved the payment, course in progress (green)
// - 'completed'  -> payment confirmed AND course finished (green)
// - 'free'       -> free enrollment (blue)
export function getPaymentStatusInfo(paymentStatus: string | undefined | null): {
  label: string
  badgeClass: string
} {
  switch (paymentStatus) {
    case 'completed':
      return { label: 'مكتمل', badgeClass: 'bg-green-500 text-white' }
    case 'confirmed':
      return { label: 'تم تأكيد الدفع', badgeClass: 'bg-green-500 text-white' }
    case 'free':
      return { label: 'مجانية', badgeClass: 'bg-blue-500 text-white' }
    case 'pending':
    default:
      return { label: 'بانتظار تأكيد الدفع', badgeClass: 'bg-yellow-500 text-white' }
  }
}

// Returns a status info object for a raw payment record's `status` field
// (used in the Payments section). Raw status can be: 'مكتمل' | 'completed' |
// 'قيد الانتظار' | 'pending' | 'بانتظار' | 'ملغي' | 'failed' | 'فشل' | etc.
export function getPaymentRecordStatusInfo(status: string | undefined | null): {
  label: string
  badgeClass: string
} {
  const s = (status || '').trim()
  const norm = s.toLowerCase()
  if (s === 'مكتمل' || norm === 'completed' || norm === 'paid' || norm === 'confirmed') {
    return { label: s || 'مكتمل', badgeClass: 'bg-green-500/15 text-green-600 border-green-500/30' }
  }
  if (s === 'ملغي' || norm === 'failed' || s === 'فشل' || norm === 'cancelled' || norm === 'canceled') {
    return { label: s || 'فشل', badgeClass: 'bg-red-500/15 text-red-600 border-red-500/30' }
  }
  if (s === 'قيد الانتظار' || s === 'بانتظار' || norm === 'pending' || s === '') {
    return { label: s || 'بانتظار', badgeClass: 'bg-yellow-500/15 text-yellow-600 border-yellow-500/30' }
  }
  // Unknown status — show as neutral
  return { label: s, badgeClass: 'bg-muted text-muted-foreground border-border' }
}

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
  const [profile, setProfile] = useState({ name: user?.name || '', phone: user?.phone || '', title: user?.title || '', bio: splitBio(user?.bio || '') })

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
          {active === 'overview' && <Overview user={user} courses={courses} certificates={certificates} enrollments={enrollments} onViewCourse={(c) => { setViewingCourse(c); setViewingEnrollment(enrollments.find((e:any)=>e.course_id===c.id) || null); setActive('course-view') }} />}
          {active === 'courses' && <MyCourses courses={courses} enrollments={enrollments} studentName={user?.name} onContinue={(course, enrollment) => { setViewingCourse(course); setViewingEnrollment(enrollment); setActive('course-view') }} />}
          {active === 'browse' && <BrowseCourses courses={courses} enrollments={enrollments} userId={user?.id} onEnrolled={onEnrolled} />}
          {active === 'exams' && <Exams userId={user?.id} courses={courses} />}
          {active === 'results' && <Results />}
          {active === 'certificates' && <StudentCertificates user={user} />}
          {active === 'payments' && <Payments payments={payments} userId={user?.id} courses={courses} />}
          {active === 'forum' && <SharedForum user={user} />}
          {active === 'blog' && <SharedBlog />}
          {active === 'faqs' && <SharedFAQ />}
          {active === 'affiliate' && (
            <SectionCard title="برنامج العمولة" description="شارك أصدقاءك واكسب عمولة">
              <AffiliateDashboard />
            </SectionCard>
          )}
          {active === 'profile' && <Profile profile={profile} setProfile={setProfile} user={user} updateUser={updateUser} />}
          {active === 'notifications' && <Notifications userId={user?.id} enrollments={enrollments} courses={courses} />}
          {active === 'settings' && <SettingsTab user={user} updateUser={updateUser} />}
        </>
      )}
    </DashboardShell>
  )
}

function Overview({ user, courses, certificates, enrollments, onViewCourse }: any) {
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
              <Button size="sm" className="w-full bg-navy hover:bg-navy-light" onClick={() => onViewCourse?.(c)}>عرض الدورة</Button>
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
                  <Badge className={getPaymentStatusInfo(c.enrollment.payment_status).badgeClass}>
                    {getPaymentStatusInfo(c.enrollment.payment_status).label}
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
                ) : c.enrollment.payment_status === 'completed' ? (
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

function Exams({ userId, courses }: any) {
  const [exams, setExams] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (!userId) {
        setLoading(false)
        return
      }
      try {
        // 1. Fetch the student's enrollments (only their own).
        const enrRes = await fetch(`/api/enrollments?user_id=${userId}`)
        const enrollments = await enrRes.json()
        const validEnrollments: any[] = Array.isArray(enrollments) ? enrollments : []

        // 2. For each enrolled course, fetch its lessons and filter exam-type lessons.
        //    Only show exams for courses the student actually has access to
        //    (i.e., payment_status is NOT 'pending').
        const accessible = validEnrollments.filter(
          (e: any) => e.payment_status !== 'pending'
        )

        const results = await Promise.all(
          accessible.map(async (e: any) => {
            try {
              const lessonsRes = await fetch(`/api/lessons?course_id=${e.course_id}`)
              const lessons = await lessonsRes.json()
              const allLessons: any[] = Array.isArray(lessons) ? lessons : []
              const examLessons = allLessons.filter(
                (l: any) => l.lesson_type === 'exam'
              )
              const courseTitle =
                courses?.find((c: any) => c.id === e.course_id)?.title || null
              return examLessons.map((l: any) => ({
                id: l.id,
                name: l.title || 'اختبار بدون اسم',
                course_id: e.course_id,
                course_title: courseTitle,
                enrollment_id: e.id,
                duration_minutes: l.duration_minutes || 0,
              }))
            } catch {
              return []
            }
          })
        )

        if (cancelled) return
        setExams(results.flat())
      } catch {
        if (!cancelled) setExams([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [userId, courses])

  return (
    <SectionCard title="اختباراتي" description="جميع الاختبارات المتاحة لك في دوراتك المسجّلة">
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <Loader2 className="w-8 h-8 text-navy animate-spin" />
          <p className="text-sm text-muted-foreground">جاري تحميل الاختبارات...</p>
        </div>
      ) : exams.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-muted/40 flex items-center justify-center">
            <FileText className="w-10 h-10 text-muted-foreground/50" />
          </div>
          <p className="text-base font-semibold text-navy mb-1">لا توجد اختبارات متاحة لك حالياً</p>
          <p className="text-xs text-muted-foreground">
            سجّل في دورة تحتوي على اختبارات لتظهر هنا، أو تأكّد من تأكيد دفعاتك من قبل الإدارة.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {exams.map((exam: any, i: number) => (
            <div
              key={exam.id || i}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-muted/30 rounded-lg border border-border"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-9 h-9 rounded-lg bg-navy/10 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-navy" />
                  </div>
                  <div className="font-semibold text-navy text-sm">{exam.name}</div>
                </div>
                <div className="text-xs text-muted-foreground mr-11 flex flex-wrap items-center gap-x-2">
                  {exam.course_title && <span>{exam.course_title}</span>}
                  {exam.duration_minutes ? <span>• {exam.duration_minutes} دقيقة</span> : null}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button size="sm" className="bg-navy hover:bg-navy-light">
                  ابدأ الاختبار
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  )
}

function Results() {
  // NOTE: Exam results are not currently stored in a dedicated table — the
  // platform doesn't persist a per-student score for each exam yet. Once that
  // backend exists, this component should fetch and render the real results.
  // For now we show a professional empty state so students aren't shown fake
  // placeholder data.
  return (
    <SectionCard title="نتائجي" description="سجل نتائج الاختبارات التي أتممتها">
      <div className="text-center py-16">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-muted/40 flex items-center justify-center">
          <TrendingUp className="w-10 h-10 text-muted-foreground/50" />
        </div>
        <p className="text-base font-semibold text-navy mb-1">
          لا توجد نتائج بعد — لم تقم بأي اختبار بعد
        </p>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          عند إكمالك لأحد الاختبارات في دوراتك المسجّلة، ستظهر نتيجتك وتفاصيلها هنا مع
          النسبة المئوية وحالة النجاح أو الرسوب.
        </p>
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

function Payments({ payments, userId, courses }: any) {
  const [viewingReceipt, setViewingReceipt] = useState<string | null>(null)
  // Filter by the current user's id so we never display someone else's payments.
  const myPayments = (payments || []).filter((p: any) => p.user_id === userId)
  // Sort by date DESC (most recent first) for display
  const sortedPayments = [...myPayments].sort((a: any, b: any) => {
    const da = a.date ? new Date(a.date).getTime() : 0
    const db = b.date ? new Date(b.date).getTime() : 0
    return db - da
  })

  const getCourseTitle = (courseId: string | null | undefined) => {
    if (!courseId) return null
    return courses?.find((c: any) => c.id === courseId)?.title || null
  }

  const fmtAmount = (p: any) => {
    const amt = typeof p.amount === 'number' ? p.amount : Number(p.amount) || 0
    return amt.toLocaleString('en-US')
  }

  const fmtDate = (d: string | null | undefined) => {
    if (!d) return null
    try {
      return new Date(d).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })
    } catch { return null }
  }

  const cleanReference = (ref: string | null | undefined) => {
    if (!ref) return null
    return ref.replace(/\s*\|\s*PROOF:.*$/i, '').trim() || null
  }

  const getProofUrl = (p: any): string | null => {
    const ref = p?.reference
    if (!ref) return null
    const match = String(ref).match(/PROOF:\s*(\S+)/i)
    return match ? match[1] : null
  }

  return (
    <>
    <SectionCard title="مدفوعاتي" description={`${sortedPayments.length} معاملة`}>
      {sortedPayments.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-muted/40 flex items-center justify-center">
            <CreditCard className="w-10 h-10 text-muted-foreground/50" />
          </div>
          <p className="text-base font-semibold text-navy mb-1">لا توجد مدفوعات بعد</p>
          <p className="text-xs text-muted-foreground">عند تسجيلك في دورة مدفوعة ورفع إيصال الدفع، ستظهر تفاصيل المعاملة هنا.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedPayments.map((p: any) => {
            const statusInfo = getPaymentRecordStatusInfo(p.status)
            const courseTitle = getCourseTitle(p.course_id)
            const ref = cleanReference(p.reference)
            const dateStr = fmtDate(p.date)
            const proofUrl = getProofUrl(p)
            return (
              <Card key={p.id} className="p-0 overflow-hidden border-border card-hover">
                {/* Amount header */}
                <div className="bg-gradient-to-br from-navy to-navy-light p-4 text-white">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[11px] text-gold/80 font-semibold mb-0.5">المبلغ</div>
                      <div className="text-2xl font-extrabold tracking-tight" dir="ltr">
                        {fmtAmount(p)} <span className="text-base font-bold text-gold">{p.currency || 'ر.ي'}</span>
                      </div>
                    </div>
                    <Badge className={`${statusInfo.badgeClass} border whitespace-nowrap`}>{statusInfo.label}</Badge>
                  </div>
                </div>

                {/* Receipt thumbnail — opens in-app viewer */}
                {proofUrl && (
                  <button
                    type="button"
                    onClick={() => setViewingReceipt(proofUrl)}
                    className="relative block w-full h-36 bg-muted/40 group cursor-pointer"
                    title="اضغط لعرض الإيصال"
                  >
                    <img src={proofUrl} alt="إيصال الدفع" className="w-full h-full object-cover" loading="lazy" />
                    <div className="absolute inset-0 bg-navy/0 group-hover:bg-navy/50 transition-colors flex items-center justify-center">
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 text-navy text-xs font-bold px-4 py-2 rounded-full flex items-center gap-1.5">
                        <FileUp className="w-4 h-4" /> عرض الإيصال
                      </span>
                    </div>
                  </button>
                )}

                {/* Details body */}
                <div className="p-4 space-y-3">
                  {courseTitle && (
                    <div>
                      <div className="text-[11px] text-muted-foreground mb-0.5">الدورة</div>
                      <div className="text-sm font-semibold text-navy line-clamp-2">{courseTitle}</div>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-[11px] text-muted-foreground mb-0.5">طريقة الدفع</div>
                      <div className="text-sm font-medium text-navy">{p.method || '-'}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-muted-foreground mb-0.5">التاريخ</div>
                      <div className="text-sm font-medium text-navy" dir="ltr">{dateStr || '-'}</div>
                    </div>
                  </div>
                  {ref && (
                    <div>
                      <div className="text-[11px] text-muted-foreground mb-0.5">رقم المرجع</div>
                      <div className="text-sm font-mono text-navy break-all" dir="ltr">{ref}</div>
                    </div>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </SectionCard>

    {/* In-app receipt viewer — professional lightbox */}
    <Dialog open={!!viewingReceipt} onOpenChange={(o) => { if (!o) setViewingReceipt(null) }}>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden">
        <DialogHeader className="p-4 border-b border-border">
          <DialogTitle className="text-navy text-lg flex items-center gap-2">
            <FileUp className="w-5 h-5 text-green-600" /> إيصال الدفع
          </DialogTitle>
        </DialogHeader>
        <div className="p-4 bg-muted/10">
          {viewingReceipt && (
            <div className="relative w-full flex items-center justify-center">
              <img
                src={viewingReceipt}
                alt="إيصال الدفع"
                className="max-w-full max-h-[60vh] rounded-lg border border-border shadow-lg object-contain"
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
    </>
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
        bio: joinBio(profile.bio, user?.bio),
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

function Notifications({ userId, enrollments, courses }: any) {
  const [notifs, setNotifs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const items: any[] = []

        // 1. Enrollment-based notifications (from the enrollments prop).
        //    Each enrollment already encodes a payment_status that we map to a
        //    human-readable notification.
        const enrList: any[] = Array.isArray(enrollments) ? enrollments : []
        const courseMap = new Map<string, any>(
          (Array.isArray(courses) ? courses : []).map((c: any) => [c.id, c])
        )

        const fmtTime = (iso?: string | null) => {
          if (!iso) return null
          try {
            return new Date(iso).toLocaleDateString('ar-EG', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })
          } catch {
            return null
          }
        }

        for (const e of enrList) {
          const c = courseMap.get(e.course_id)
          const title = c?.title || 'دورة'
          const ts = fmtTime(e.enrolled_at || (e as any).date)
          const status = e.payment_status
          if (status === 'pending') {
            items.push({
              id: `enr-pending-${e.id}`,
              icon: Clock,
              iconBg: 'bg-yellow-500/15 text-yellow-600',
              title: 'بانتظار تأكيد الدفع',
              desc: `طلبك للتسجيل في دورة "${title}" قيد المراجعة من قبل الإدارة`,
              time: ts,
            })
          } else if (status === 'confirmed') {
            items.push({
              id: `enr-confirmed-${e.id}`,
              icon: CheckCircle2,
              iconBg: 'bg-green-500/15 text-green-600',
              title: 'تم تأكيد التسجيل',
              desc: `تم تأكيد تسجيلك في دورة "${title}". يمكنك الآن متابعة الدروس`,
              time: ts,
            })
          } else if (status === 'completed') {
            items.push({
              id: `enr-completed-${e.id}`,
              icon: Award,
              iconBg: 'bg-gold/15 text-gold',
              title: 'أكملت الدورة',
              desc: `تهانينا! لقد أكملت دورة "${title}" بنجاح`,
              time: ts,
            })
          } else if (status === 'free') {
            items.push({
              id: `enr-free-${e.id}`,
              icon: BookOpen,
              iconBg: 'bg-blue-500/15 text-blue-600',
              title: 'تسجيل مجاني',
              desc: `تم تسجيلك مجاناً في دورة "${title}". ابدأ التعلّم الآن`,
              time: ts,
            })
          }
        }

        // 2. "New lesson added" notifications: compare each enrolled course's
        //    lessons_count against a baseline we keep in localStorage. On the
        //    first visit there's no baseline, so we just initialize it without
        //    showing any "new lesson" notification.
        const baselineKey = `fia_lesson_baseline_${userId || 'guest'}`
        let baseline: Record<string, number> = {}
        try {
          const stored = localStorage.getItem(baselineKey)
          if (stored) baseline = JSON.parse(stored) || {}
        } catch {}

        const newBaseline: Record<string, number> = { ...baseline }
        // Only check lessons_count for courses the student has access to
        // (payment_status !== 'pending').
        const accessible = enrList.filter((e: any) => e.payment_status !== 'pending')
        for (const e of accessible) {
          const c = courseMap.get(e.course_id)
          if (!c) continue
          const current = Number(c.lessons_count || 0)
          const prev = baseline[e.course_id] ?? null
          newBaseline[e.course_id] = current
          if (prev !== null && current > prev) {
            items.push({
              id: `new-lesson-${e.course_id}-${current}`,
              icon: FileText,
              iconBg: 'bg-purple-500/15 text-purple-600',
              title: 'درس جديد',
              desc: `تمت إضافة ${current - prev} درس جديد في دورة "${c.title}"`,
              time: 'مؤخراً',
            })
          }
        }

        // Persist the new baseline so future visits can detect new lessons.
        try {
          localStorage.setItem(baselineKey, JSON.stringify(newBaseline))
        } catch {}

        if (!cancelled) setNotifs(items)
      } catch {
        if (!cancelled) setNotifs([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [userId, enrollments, courses])

  return (
    <SectionCard title="الإشعارات" description="آخر التحديثات والتنبيهات">
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <Loader2 className="w-8 h-8 text-navy animate-spin" />
          <p className="text-sm text-muted-foreground">جاري تحميل الإشعارات...</p>
        </div>
      ) : notifs.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-muted/40 flex items-center justify-center">
            <Bell className="w-10 h-10 text-muted-foreground/50" />
          </div>
          <p className="text-base font-semibold text-navy mb-1">لا توجد إشعارات</p>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            ستظهر هنا تنبيهات عند تأكيد تسجيلك في الدورات أو عند إضافة دروس جديدة.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifs.map((n) => {
            const Icon = n.icon
            return (
              <div
                key={n.id}
                className="p-4 rounded-lg border border-border bg-gold/5 flex items-start gap-3"
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${n.iconBg}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-navy text-sm">{n.title}</div>
                  <div className="text-xs text-muted-foreground mt-1">{n.desc}</div>
                </div>
                {n.time && (
                  <div className="text-xs text-muted-foreground flex-shrink-0 whitespace-nowrap" dir="rtl">
                    {n.time}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </SectionCard>
  )
}

function SettingsTab({ user, updateUser }: any) {
  // Email change state — uses /api/auth/change-credentials
  const [newEmail, setNewEmail] = useState('')
  const [emailPwd, setEmailPwd] = useState('')
  const [showEmailPwd, setShowEmailPwd] = useState(false)
  const [emailLoading, setEmailLoading] = useState(false)

  // Password change state — uses /api/auth/change-credentials
  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [showCurrentPwd, setShowCurrentPwd] = useState(false)
  const [showNewPwd, setShowNewPwd] = useState(false)
  const [pwdLoading, setPwdLoading] = useState(false)

  // Phone change state — uses /api/students PUT
  const [phone, setPhone] = useState(user?.phone || '')
  const [phoneLoading, setPhoneLoading] = useState(false)

  // Email notification preference — persisted to localStorage (real toggle,
  // not fake) so the choice survives across sessions. Default is OFF ("متوقف").
  const [emailNotif, setEmailNotif] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(`fia_settings_${user?.id || 'guest'}`)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (typeof parsed.emailNotif === 'boolean') setEmailNotif(parsed.emailNotif)
      }
    } catch {}
  }, [user?.id])

  const saveEmailNotif = (val: boolean) => {
    setEmailNotif(val)
    try {
      const key = `fia_settings_${user?.id || 'guest'}`
      const stored = localStorage.getItem(key)
      const obj = stored ? JSON.parse(stored) : {}
      obj.emailNotif = val
      localStorage.setItem(key, JSON.stringify(obj))
    } catch {}
    toast.success(val ? 'تم تفعيل إشعارات البريد' : 'تم إيقاف إشعارات البريد')
  }

  // ====== Handlers ======
  const saveEmail = async () => {
    if (!newEmail) {
      toast.error('أدخل البريد الجديد')
      return
    }
    if (!emailPwd) {
      toast.error('أدخل كلمة المرور الحالية للتأكيد')
      return
    }
    if (newEmail === user?.email) {
      toast.error('البريد الجديد مطابق للبريد الحالي')
      return
    }
    setEmailLoading(true)
    try {
      const res = await fetch('/api/auth/change-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          currentEmail: user.email,
          currentPassword: emailPwd,
          newEmail,
          role: 'student',
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'فشل تحديث البريد')
        return
      }
      toast.success('تم تحديث البريد. يرجى تسجيل الدخول بالبريد الجديد')
      // Update local state so the user sees the new email immediately
      updateUser({ email: newEmail })
      setNewEmail('')
      setEmailPwd('')
    } catch {
      toast.error('خطأ في الاتصال')
    } finally {
      setEmailLoading(false)
    }
  }

  const savePassword = async () => {
    if (!currentPwd) {
      toast.error('أدخل كلمة المرور الحالية')
      return
    }
    if (!newPwd) {
      toast.error('أدخل كلمة المرور الجديدة')
      return
    }
    if (newPwd.length < 6) {
      toast.error('كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل')
      return
    }
    if (newPwd !== confirmPwd) {
      toast.error('كلمتا المرور غير متطابقتين')
      return
    }
    setPwdLoading(true)
    try {
      const res = await fetch('/api/auth/change-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          currentEmail: user.email,
          currentPassword: currentPwd,
          newPassword: newPwd,
          role: 'student',
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'فشل تغيير كلمة المرور')
        return
      }
      toast.success('تم تغيير كلمة المرور بنجاح')
      setCurrentPwd('')
      setNewPwd('')
      setConfirmPwd('')
    } catch {
      toast.error('خطأ في الاتصال')
    } finally {
      setPwdLoading(false)
    }
  }

  const savePhone = async () => {
    if (!phone) {
      toast.error('أدخل رقم الهاتف')
      return
    }
    setPhoneLoading(true)
    try {
      const res = await fetch('/api/students', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, phone }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'فشل تحديث رقم الهاتف')
        return
      }
      updateUser({ phone })
      toast.success('تم تحديث رقم الهاتف')
    } catch {
      toast.error('خطأ في الاتصال')
    } finally {
      setPhoneLoading(false)
    }
  }

  return (
    <SectionCard title="الإعدادات" description="إدارة حسابك وتفضيلاتك">
      <div className="space-y-6 max-w-2xl">
        {/* Account header */}
        <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg border border-border">
          <div className="w-12 h-12 rounded-full bg-navy flex items-center justify-center text-gold font-bold text-xl border-2 border-gold/30">
            {user?.name?.charAt(0)}
          </div>
          <div className="min-w-0">
            <div className="font-bold text-navy">{user?.name}</div>
            <div className="text-xs text-muted-foreground" dir="ltr">{user?.email}</div>
          </div>
        </div>

        {/* ===== Account section ===== */}
        <div>
          <h3 className="font-bold text-navy text-sm mb-3 flex items-center gap-2">
            <User className="w-4 h-4 text-gold" /> الحساب
          </h3>

          <div className="space-y-4">
            {/* Change email */}
            <div className="p-4 rounded-lg border border-border bg-white">
              <div className="flex items-center gap-2 mb-3">
                <Mail className="w-4 h-4 text-navy" />
                <div className="font-semibold text-navy text-sm">تغيير البريد الإلكتروني</div>
              </div>
              <div className="space-y-2">
                <Input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder={user?.email || 'example@fia.edu'}
                  dir="ltr"
                />
                <div className="relative">
                  <Input
                    type={showEmailPwd ? 'text' : 'password'}
                    value={emailPwd}
                    onChange={(e) => setEmailPwd(e.target.value)}
                    placeholder="كلمة المرور الحالية للتأكيد"
                    dir="ltr"
                    className="pr-3 pl-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEmailPwd(!showEmailPwd)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-navy"
                  >
                    {showEmailPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <Button
                  onClick={saveEmail}
                  disabled={emailLoading || !newEmail || !emailPwd}
                  className="w-full bg-navy hover:bg-navy-light"
                >
                  {emailLoading ? <><Loader2 className="w-4 h-4 ml-1 animate-spin" /> جاري...</> : 'حفظ البريد'}
                </Button>
              </div>
            </div>

            {/* Change password */}
            <div className="p-4 rounded-lg border border-border bg-white">
              <div className="flex items-center gap-2 mb-3">
                <Lock className="w-4 h-4 text-navy" />
                <div className="font-semibold text-navy text-sm">تغيير كلمة المرور</div>
              </div>
              <div className="space-y-2">
                <div className="relative">
                  <Input
                    type={showCurrentPwd ? 'text' : 'password'}
                    value={currentPwd}
                    onChange={(e) => setCurrentPwd(e.target.value)}
                    placeholder="كلمة المرور الحالية"
                    dir="ltr"
                    className="pr-3 pl-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPwd(!showCurrentPwd)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-navy"
                  >
                    {showCurrentPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="relative">
                  <Input
                    type={showNewPwd ? 'text' : 'password'}
                    value={newPwd}
                    onChange={(e) => setNewPwd(e.target.value)}
                    placeholder="كلمة المرور الجديدة"
                    dir="ltr"
                    className="pr-3 pl-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPwd(!showNewPwd)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-navy"
                  >
                    {showNewPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <Input
                  type="password"
                  value={confirmPwd}
                  onChange={(e) => setConfirmPwd(e.target.value)}
                  placeholder="تأكيد كلمة المرور الجديدة"
                  dir="ltr"
                />
                {newPwd && confirmPwd && newPwd !== confirmPwd && (
                  <p className="text-xs text-red-500">كلمتا المرور غير متطابقتين</p>
                )}
                {newPwd && confirmPwd && newPwd === confirmPwd && (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> كلمتا المرور متطابقتان
                  </p>
                )}
                <Button
                  onClick={savePassword}
                  disabled={pwdLoading || !currentPwd || !newPwd || !confirmPwd || newPwd !== confirmPwd}
                  className="w-full bg-navy hover:bg-navy-light"
                >
                  {pwdLoading ? <><Loader2 className="w-4 h-4 ml-1 animate-spin" /> جاري...</> : 'حفظ كلمة المرور'}
                </Button>
              </div>
            </div>

            {/* Change phone number */}
            <div className="p-4 rounded-lg border border-border bg-white">
              <div className="flex items-center gap-2 mb-3">
                <User className="w-4 h-4 text-navy" />
                <div className="font-semibold text-navy text-sm">تغيير رقم الهاتف</div>
              </div>
              <div className="space-y-2">
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="رقم الهاتف الجديد"
                  dir="ltr"
                />
                <Button
                  onClick={savePhone}
                  disabled={phoneLoading || !phone || phone === user?.phone}
                  className="w-full bg-navy hover:bg-navy-light"
                >
                  {phoneLoading ? <><Loader2 className="w-4 h-4 ml-1 animate-spin" /> جاري...</> : 'حفظ الهاتف'}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* ===== Notification preferences ===== */}
        <div>
          <h3 className="font-bold text-navy text-sm mb-3 flex items-center gap-2">
            <Bell className="w-4 h-4 text-gold" /> تفضيلات الإشعارات
          </h3>
          <div className="p-4 rounded-lg border border-border bg-white flex items-center justify-between">
            <div>
              <div className="font-medium text-navy text-sm">إشعارات البريد الإلكتروني</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                تنبيهات حول تأكيد التسجيل والمدفوعات والدروس الجديدة
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-semibold ${emailNotif ? 'text-green-600' : 'text-muted-foreground'}`}>
                {emailNotif ? 'مفعّل' : 'متوقف'}
              </span>
              <button
                onClick={() => saveEmailNotif(!emailNotif)}
                className={`relative w-11 h-6 rounded-full transition-colors ${emailNotif ? 'bg-green-500' : 'bg-muted'}`}
                title={emailNotif ? 'إيقاف' : 'تفعيل'}
              >
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${emailNotif ? 'right-0.5' : 'right-5'}`} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </SectionCard>
  )
}

// ============================================================================
// StudentCertificates — shows certificates issued to this student by the admin
// (or by themselves after passing exams / requesting them after course completion).
// ============================================================================
function StudentCertificates({ user }: any) {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [viewing, setViewing] = useState<any | null>(null)

  useEffect(() => {
    if (!user?.name) { setLoading(false); return }
    fetch(`/api/certificates?student_name=${encodeURIComponent(user.name)}`)
      .then((r) => r.json())
      .then((d) => {
        const arr = Array.isArray(d) ? d.filter((c: any) => c.status === 'صالحة') : []
        setItems(arr)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user?.name])

  if (loading) {
    return (
      <SectionCard title="شهاداتي" description="الشهادات الصادرة لك">
        <div className="text-center py-12">
          <Loader2 className="w-6 h-6 mx-auto animate-spin text-navy" />
        </div>
      </SectionCard>
    )
  }

  if (items.length === 0) {
    return (
      <SectionCard title="شهاداتي" description="الشهادات الصادرة لك">
        <div className="text-center py-16">
          <div className="w-20 h-20 mx-auto rounded-full bg-gold/10 flex items-center justify-center mb-4">
            <Award className="w-10 h-10 text-gold/50" />
          </div>
          <h3 className="font-bold text-navy mb-2">لا توجد شهادات صادرة بعد</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            تكمل دورتك بنسبة 100% ثم اطلب شهادتك من داخل الدورة. ستظهر هنا فور إصدارها من الإدارة.
          </p>
        </div>
      </SectionCard>
    )
  }

  return (
    <>
      <SectionCard title="شهاداتي" description={`${items.length} شهادة صادرة`}>
        <div className="grid sm:grid-cols-2 gap-5">
          {items.map((cert) => (
            <Card key={cert.id} className="overflow-hidden hover:shadow-xl transition-all group cursor-pointer" >
              <div className="h-2 bg-gradient-to-r from-gold via-gold-light to-gold" />
              <div className="bg-gradient-to-br from-navy to-navy-light p-5 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gold/10 rounded-full blur-2xl" />
                <div className="relative flex items-start justify-between">
                  <div>
                    <div className="text-[10px] text-gold uppercase tracking-widest mb-1">Future International Academy</div>
                    <div className="text-xs text-white/70">شهادة إكمال معتمدة</div>
                  </div>
                  <Award className="w-6 h-6 text-gold" />
                </div>
              </div>
              <div className="p-5">
                <p className="text-[10px] text-muted-foreground mb-1">الدورة</p>
                <h4 className="font-bold text-navy text-sm mb-3 line-clamp-2">{cert.course_title}</h4>
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <div className="text-[10px] text-muted-foreground">رقم الشهادة</div>
                    <div className="font-mono font-bold text-navy" dir="ltr">{cert.certificate_number}</div>
                  </div>
                  <div className="text-left">
                    <div className="text-[10px] text-muted-foreground">تاريخ الإصدار</div>
                    <div className="font-bold text-navy">
                      {cert.issued_at ? new Date(cert.issued_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                    </div>
                  </div>
                </div>
                {cert.has_external_accreditation && cert.external_accreditation_body && (
                  <div className="mt-3 pt-3 border-t border-border flex items-center gap-1.5 text-[10px] text-gold">
                    <Award className="w-3 h-3" />
                    معتمدة من: {cert.external_accreditation_body}
                  </div>
                )}
              </div>
              <div className="px-5 pb-5 flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 bg-navy hover:bg-navy-light"
                  onClick={() => setViewing(cert)}
                >
                  <ExternalLink className="w-3.5 h-3.5 ml-1.5" /> عرض الشهادة
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-gold/30 text-gold hover:bg-gold/10"
                  onClick={() => setViewing(cert)}
                >
                  <Download className="w-3.5 h-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </SectionCard>

      {/* Certificate viewer dialog — opens in-app, no new tab */}
      <Dialog open={!!viewing} onOpenChange={(o) => { if (!o) setViewing(null) }}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <Award className="w-5 h-5 text-gold" /> عرض الشهادة
              </DialogTitle>
              <button onClick={() => setViewing(null)} className="text-muted-foreground hover:text-navy">
                <X className="w-5 h-5" />
              </button>
            </div>
          </DialogHeader>
          {viewing && <CertificateViewer certificate={viewing} onClose={() => setViewing(null)} />}
        </DialogContent>
      </Dialog>
    </>
  )
}
