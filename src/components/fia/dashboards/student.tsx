'use client'

import { useEffect, useState } from 'react'
import {
  LayoutDashboard, BookOpen, FileText, Award, CreditCard,
  User, Bell, Settings, TrendingUp, Clock, CheckCircle2,
  Compass, Lock, Plus, Download, Loader2, FileUp, X, Copy, Share2,
  Mail, Eye, EyeOff, MessageSquare, Newspaper, HelpCircle, Gift, ExternalLink,
  Sparkles, Star,
} from 'lucide-react'
import { DashboardShell, StatCard, SectionCard, NavItem } from './shell'
import { useAuth } from '@/lib/auth-store'
import { useHashTab } from '@/lib/use-hash-tab'
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
import { supabasePublic } from '@/lib/supabase'
import { AvatarUploader } from '@/components/fia/avatar-uploader'
import { StudentCourseViewer } from '@/components/fia/student-course-viewer'
import { SharedForum, SharedBlog, SharedFAQ } from './shared-community'
import { AffiliateDashboard } from '@/components/fia/affiliate-dashboard'
import { CertificateRequest } from '@/components/fia/certificate-request'
import { CertificateViewer } from '@/components/fia/certificate-viewer'
import { downloadCertificateFile } from '@/lib/certificate-download'

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
  useHashTab(NAV.map((n) => n.id), setActive)
  const [viewingCourse, setViewingCourse] = useState<any | null>(null)
  const [viewingEnrollment, setViewingEnrollment] = useState<any | null>(null)
  // ⚡ When the user clicks "اشترك الآن" on a recommended course in the
  // Overview tab, we set browseInitialCourse + switch to the browse tab.
  // BrowseCourses reads this prop and auto-opens the payment dialog for
  // that specific course — no need for the user to scroll and find it.
  const [browseInitialCourse, setBrowseInitialCourse] = useState<any | null>(null)
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

  // ⚡ Helper: refresh all payments for the student. We use this both
  // from the Realtime subscription handler AND the native APK bridge.
  // Filtering by user_id server-side is more efficient than fetching all
  // and filtering client-side, but the API supports both modes.
  const loadPayments = () => {
    if (!user?.id) return
    fetch(`/api/payments?user_id=${user.id}`)
      .then((r) => r.json())
      .then((d) => setPayments(Array.isArray(d) ? d : []))
      .catch(() => {})
  }

  // ⚡ Helper functions exposed globally so the APK's native notification
  // bridge can call them via evaluateJavascript. This makes the WebView
  // update INSTANTLY when a notification arrives (instead of requiring a
  // page reload). The APK dispatches a 'fia-native-notification' custom
  // event with the notification data; we listen for it here and refresh
  // all data + show a toast.
  useEffect(() => {
    // Expose global helpers for the APK bridge
    ;(window as any).__FIA_refreshActiveView = () => {
      loadEnrollments()
      loadPayments()
      fetch('/api/certificates').then((r) => r.json()).then((d) => setCertificates(Array.isArray(d) ? d : [])).catch(() => {})
      fetch('/api/courses').then((r) => r.json()).then((d) => setCourses(Array.isArray(d) ? d : [])).catch(() => {})
    }
    ;(window as any).__FIA_showToast = (msg: string) => {
      try { toast.success(msg) } catch {}
    }

    // ⚡ Listen for native notifications from the APK bridge.
    // When the APK receives a push notification (e.g. new payment, payment
    // approved), it dispatches a 'fia-native-notification' event. We listen
    // for it here and refresh ALL relevant data INSTANTLY.
    const handleNativeNotif = (event: any) => {
      const data = event.detail || {}
      // Refresh all relevant data INSTANTLY when a native notification arrives
      loadEnrollments()
      loadPayments()
      fetch('/api/certificates').then((r) => r.json()).then((d) => setCertificates(Array.isArray(d) ? d : [])).catch(() => {})
      fetch('/api/courses').then((r) => r.json()).then((d) => setCourses(Array.isArray(d) ? d : [])).catch(() => {})
      // ⚡ Note: We DON'T show a toast here — the notifications-bell component
      // already shows a toast + browser notification when the corresponding
      // notification row arrives. Showing a toast here too would cause
      // duplicates. We only refresh data here.
    }
    window.addEventListener('fia-native-notification', handleNativeNotif as EventListener)

    return () => {
      window.removeEventListener('fia-native-notification', handleNativeNotif as EventListener)
      try {
        delete (window as any).__FIA_refreshActiveView
        delete (window as any).__FIA_showToast
      } catch {}
    }
  }, [user?.id])

  useEffect(() => {
    fetch('/api/courses').then((r) => r.json()).then((d) => setCourses(Array.isArray(d) ? d : [])).catch(() => {})
    fetch('/api/certificates').then((r) => r.json()).then((d) => setCertificates(Array.isArray(d) ? d : [])).catch(() => {})
    loadPayments()
    loadEnrollments()
  }, [user?.id])

  // Real-time: when admin updates a course (e.g. changes price_type
  // from مدفوعة to مجانية or vice versa), refresh the courses list
  // immediately so the student sees the updated price/status.
  useEffect(() => {
    let channel: any
    try {
      channel = supabasePublic
        .channel('courses-realtime')
        .on('postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'courses' },
          (payload: any) => {
            // ⚡ INSTANT UPDATE: patch the specific course in-place for sub-100ms updates
            setCourses((prev) => prev.map((c) => c.id === payload.new.id ? { ...c, ...payload.new } : c))
          }
        )
        .subscribe()
    } catch {}
    return () => { try { supabasePublic.removeChannel(channel) } catch {} }
  }, [])

  // ⚡ REAL-TIME: payments — when admin approves/rejects a payment,
  // the student sees the status change INSTANTLY (sub-100ms) without refresh.
  useEffect(() => {
    if (!user?.id) return
    let channel: any
    try {
      channel = supabasePublic
        .channel(`payments-realtime-student:${user.id}`)
        .on('postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'payments', filter: `user_id=eq.${user.id}` },
          (payload: any) => {
            // Patch the payment in-place for instant UI update
            setPayments((prev) => prev.map((p) => p.id === payload.new.id ? { ...p, ...payload.new } : p))
            // ⚡ Also refresh enrollments! The enrollment's payment_status is
            // computed from the payment status (e.g., 'مكتمل' → 'confirmed'),
            // so we need to refetch enrollments to update the UI properly.
            // Without this, the course card would stay "قيد انتظار الدفع"
            // even though the payment was approved.
            loadEnrollments()
            // ⚡ Note: We DON'T show a toast here — the notifications-bell
            // component already shows a toast when it receives the
            // corresponding notification INSERT (via notifyPaymentApproved
            // helper on the server). Showing a toast here too would
            // cause duplicate notifications.
          }
        )
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'payments', filter: `user_id=eq.${user.id}` },
          (payload: any) => {
            // New payment record created
            setPayments((prev) => [payload.new, ...prev])
            // Also refresh enrollments so the new course appears in "دوراتي"
            loadEnrollments()
          }
        )
        .subscribe()
    } catch {}
    return () => { try { supabasePublic.removeChannel(channel) } catch {} }
  }, [user?.id])

  // ⚡ REAL-TIME: enrollments — when admin approves a payment, the
  // enrollment is updated/created. Student sees the course appear instantly.
  useEffect(() => {
    if (!user?.id) return
    let channel: any
    try {
      channel = supabasePublic
        .channel(`enrollments-realtime-student:${user.id}`)
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'enrollments', filter: `user_id=eq.${user.id}` },
          (payload: any) => {
            setEnrollments((prev) => [payload.new, ...prev])
            toast.success('📚 تم تسجيلك في دورة جديدة!')
          }
        )
        .on('postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'enrollments', filter: `user_id=eq.${user.id}` },
          (payload: any) => {
            setEnrollments((prev) => prev.map((e) => e.id === payload.new.id ? { ...e, ...payload.new } : e))
          }
        )
        .subscribe()
    } catch {}
    return () => { try { supabasePublic.removeChannel(channel) } catch {} }
  }, [user?.id])

  // ⚡ REAL-TIME: certificates — when admin issues a certificate,
  // the student sees it appear INSTANTLY in "شهاداتي".
  useEffect(() => {
    let channel: any
    try {
      channel = supabasePublic
        .channel('certificates-realtime-student')
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'certificates' },
          (payload: any) => {
            // Only show certificates matching this student's name
            if (payload.new.student_name === user?.name) {
              setCertificates((prev) => [payload.new, ...prev])
              toast.success('🎓 تم إصدار شهادتك! يمكنك تحميلها الآن')
            }
          }
        )
        .on('postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'certificates' },
          (payload: any) => {
            setCertificates((prev) => prev.map((c) => c.id === payload.new.id ? { ...c, ...payload.new } : c))
          }
        )
        .subscribe()
    } catch {}
    return () => { try { supabasePublic.removeChannel(channel) } catch {} }
  }, [user?.name])

  const onEnrolled = () => {
    // ⚡ Refresh both enrollments AND payments so the new course
    // appears in "دوراتي" AND "مدفوعاتي" immediately after enrollment.
    // For free courses, the API creates a payment row with amount=0 +
    // status='مكتمل', so we need to refresh both states.
    loadEnrollments()
    loadPayments()
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
          {active === 'overview' && <Overview user={user} courses={courses} certificates={certificates} enrollments={enrollments} onViewCourse={(c) => {
            // === SAFETY CHECK: never open a paid course the student hasn't paid for ===
            const enr = enrollments.find((e:any)=>e.course_id===c.id)
            const isFree = c.price_type === 'مجانية' || c.price === 0
            if (!enr) {
              // Not enrolled at all — route to BrowseCourses with this course
              // pre-selected so the user can enroll/pay in one click.
              setBrowseInitialCourse(c)
              setActive('browse')
              return
            }
            if (enr.payment_status === 'pending') {
              toast.info('هذه الدورة مدفوعة وبانتظار تأكيد الإدارة للدفع. سيتم تفعيلها قريباً.')
              return
            }
            setViewingCourse(c); setViewingEnrollment(enr); setActive('course-view')
          }} />}
          {active === 'courses' && <MyCourses courses={courses} enrollments={enrollments} studentName={user?.name} onContinue={(course, enrollment) => { setViewingCourse(course); setViewingEnrollment(enrollment); setActive('course-view') }} />}
          {active === 'browse' && <BrowseCourses courses={courses} enrollments={enrollments} userId={user?.id} onEnrolled={onEnrolled} setPayments={setPayments} setEnrollments={setEnrollments} initialCourse={browseInitialCourse} onInitialCourseConsumed={() => setBrowseInitialCourse(null)} onViewCourse={(c, enrollmentOverride?: any) => {
            // ⚡ Use the enrollment passed from BrowseCourses if available
            // (e.g. after a successful free enrollment, the new enrollment
            // data is passed directly so we don't have to wait for the
            // enrollments state to refresh).
            const enr = enrollmentOverride || enrollments.find((e:any)=>e.course_id===c.id)
            if (!enr) {
              toast.info('لا يمكن فتح الدورة قبل إتمام التسجيل/الدفع')
              return
            }
            if (enr.payment_status === 'pending') {
              toast.info('بانتظار تأكيد الإدارة للدفع — سيتم تفعيل الدورة قريباً')
              return
            }
            setViewingCourse(c); setViewingEnrollment(enr); setActive('course-view')
          }} />}
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
  // Helper: determine if a course can be opened by the student.
  // Returns { canOpen, reason, enrollment } so the UI can decide what
  // to do when the user clicks "عرض الدورة".
  // - Free + not enrolled  -> should auto-enroll then open
  // - Paid + not enrolled  -> must open payment dialog
  // - Paid + enrolled pending -> cannot open (waiting admin approval)
  // - Enrolled (free/confirmed/completed) -> can open
  const getCourseAccess = (c: any) => {
    const enr = enrollments?.find((e: any) => e.course_id === c.id)
    const isFree = c.price_type === 'مجانية' || c.price === 0
    if (enr) {
      if (enr.payment_status === 'pending') {
        return { canOpen: false, reason: 'بانتظار تأكيد الدفع', enrollment: enr }
      }
      // free | confirmed | completed -> can open
      return { canOpen: true, reason: '', enrollment: enr }
    }
    if (isFree) {
      return { canOpen: false, reason: 'free-not-enrolled', enrollment: null }
    }
    return { canOpen: false, reason: 'paid-not-enrolled', enrollment: null }
  }

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

      <SectionCard title="الدورات الموصى بها" description="استكشف المزيد من الدورات — اضغط للتسجيل أو فتح الدورة">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.slice(0, 3).map((c: any) => {
            const access = getCourseAccess(c)
            const isFree = c.price_type === 'مجانية' || c.price === 0
            // Decide button label + action based on access state
            let btnLabel = 'عرض الدورة'
            let btnAction: () => void = () => onViewCourse?.(c)
            let btnClass = 'w-full bg-navy hover:bg-navy-light'
            if (access.enrollment?.payment_status === 'pending') {
              btnLabel = 'بانتظار تأكيد الدفع'
              btnClass = 'w-full bg-yellow-500/20 text-yellow-700 border border-yellow-500/30 cursor-not-allowed'
              btnAction = () => toast.info('سيتم تفعيل الدورة بعد تأكيد الإدارة للدفع')
            } else if (access.reason === 'free-not-enrolled') {
              btnLabel = 'سجّل الآن — مجانية'
              btnClass = 'w-full bg-green-600 hover:bg-green-700 text-white'
              // ⚡ Direct enrollment: clicking "سجّل الآن" on a free course
              // in the Overview tab triggers immediate enrollment + opens
              // the course. No more "افتح استكشاف الدورات" toast — the
              // user expects to click → enroll → open in one smooth flow.
              btnAction = () => onViewCourse?.(c)
            } else if (access.reason === 'paid-not-enrolled') {
              btnLabel = 'اشترك الآن'
              btnClass = 'w-full bg-gold hover:bg-gold-light text-navy'
              // ⚡ Direct payment: clicking "اشترك الآن" on a paid course
              // in the Overview tab navigates to BrowseCourses with this
              // specific course pre-selected, which auto-opens the
              // payment dialog. No more "افتح استكشاف الدورات" toast.
              btnAction = () => onViewCourse?.(c)
            } else if (access.canOpen) {
              btnLabel = 'عرض الدورة'
              btnClass = 'w-full bg-navy hover:bg-navy-light'
              btnAction = () => onViewCourse?.(c)
            }
            return (
              <Card key={c.id} className="p-4 card-hover">
                <div className="h-24 bg-navy rounded-lg mb-3 overflow-hidden relative">
                  {c.cover && <img src={c.cover} alt={c.title} className="w-full h-full object-cover" />}
                  <Badge className={`absolute top-2 left-2 ${isFree ? 'bg-green-500 text-white' : 'bg-gold text-navy'}`}>
                    {isFree ? 'مجانية' : `${c.price?.toLocaleString()} ${c.currency || 'ر.ي'}`}
                  </Badge>
                </div>
                <div className="font-bold text-navy text-sm mb-1 line-clamp-1">{c.title}</div>
                <div className="text-xs text-muted-foreground mb-2">{c.duration_hours} ساعة</div>
                <Button size="sm" className={btnClass} onClick={btnAction} disabled={access.enrollment?.payment_status === 'pending'}>
                  {btnLabel}
                </Button>
              </Card>
            )
          })}
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

function BrowseCourses({ courses, enrollments, userId, onEnrolled, onViewCourse, initialCourse, onInitialCourseConsumed, setPayments, setEnrollments }: any) {
  const [paymentMethods, setPaymentMethods] = useState<any[]>([])
  const [payDialog, setPayDialog] = useState<{ course: any; open: boolean } | null>(null)
  const [enrolling, setEnrolling] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/payment-methods').then((r) => r.json()).then((d) => setPaymentMethods(Array.isArray(d) ? d.filter((p:any)=>p.enabled) : [])).catch(() => {})
  }, [])

  // ⚡ Currency-aware payment method filtering:
  // - If a method's currency is "الكل" (All), it shows for every course
  // - Otherwise, only show methods matching the course's currency
  // This is computed per-course, so it stays in sync if the user opens
  // the payment dialog for different courses.
  const getMethodsForCourse = (course: any) => {
    if (!paymentMethods.length) return []
    const courseCurrency = course?.currency || 'ر.ي'
    return paymentMethods.filter((m: any) => !m.currency || m.currency === 'الكل' || m.currency === courseCurrency)
  }

  // ⚡ Auto-open the payment dialog when the user navigated here from the
  // Overview tab with a specific course in mind. This eliminates the
  // need for the user to scroll through all courses and find the one
  // they want to pay for.
  useEffect(() => {
    if (initialCourse && onInitialCourseConsumed) {
      // Find the course in our list (in case initialCourse is stale)
      const target = courses?.find((c: any) => c.id === initialCourse.id) || initialCourse
      const isFree = target.price_type === 'مجانية' || target.price === 0
      // If the user is already enrolled, open the course directly
      const existingEnr = enrollments?.find((e: any) => e.course_id === target.id)
      if (existingEnr && existingEnr.payment_status !== 'pending') {
        onViewCourse?.(target, existingEnr)
      } else if (isFree) {
        // Auto-enroll in the free course immediately
        enrollFree(target)
      } else {
        // Open the payment dialog directly for paid courses
        setPayDialog({ course: target, open: true })
      }
      // Mark the initial course as consumed so it doesn't re-trigger
      onInitialCourseConsumed()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCourse, courses, enrollments])

  const isEnrolled = (courseId: string) => enrollments?.some((e: any) => e.course_id === courseId)

  // Helper: determine if a course can be OPENED by the student.
  // CRITICAL: A paid course must NOT open just because the student
  // uploaded a payment proof. The course only opens after admin
  // confirms the payment (payment_status === 'confirmed' or 'completed').
  // - Not enrolled + free  → can enroll then open (caller handles)
  // - Not enrolled + paid  → must open payment dialog
  // - Enrolled + pending   → CANNOT open (waiting admin approval)
  // - Enrolled + free/confirmed/completed → can open
  const getAccess = (c: any) => {
    const enr = enrollments?.find((e: any) => e.course_id === c.id)
    const isFree = c.price_type === 'مجانية' || c.price === 0
    if (!enr) {
      return { state: isFree ? 'free-not-enrolled' : 'paid-not-enrolled', enrollment: null }
    }
    if (enr.payment_status === 'pending') {
      return { state: 'pending', enrollment: enr }
    }
    return { state: 'can-open', enrollment: enr }
  }

  const enrollFree = async (course: any) => {
    // Double-check client-side before calling API
    if (isEnrolled(course.id)) {
      toast.info('أنت مسجّل في هذه الدورة')
      // If already enrolled, just open the course viewer immediately
      // Pass the existing enrollment so the viewer doesn't have to look it up
      const existingEnr = enrollments?.find((e: any) => e.course_id === course.id)
      onViewCourse?.(course, existingEnr)
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
        // Refresh + open the course viewer with the returned enrollment data
        await onEnrolled?.()
        onViewCourse?.(course, data)
      } else if (res.ok) {
        toast.success(`تم التسجيل في دورة: ${course.title}`)
        // ⚡ OPTIMISTIC UPDATE: add the new free enrollment to the local
        // state so it appears in 'دوراتي' immediately.
        const syntheticEnr = {
          ...data,
          payment_status: 'free',
          status: 'مكتمل',
          progress: 0,
        }
        const syntheticPayment = {
          id: data.id || `optimistic-${Date.now()}`,
          user_id: userId,
          course_id: course.id,
          amount: 0,
          currency: course.currency || 'ر.ي',
          method: 'free',
          status: 'مكتمل',
          reference: 'FREE',
          date: new Date().toISOString(),
        }
        try {
          if (setEnrollments) {
            setEnrollments((prev: any[]) => {
              if (prev.some((e) => e.id === syntheticEnr.id)) return prev
              return [syntheticEnr, ...prev]
            })
          }
          // Note: we DON'T add the free payment to setPayments because the
          // Payments API filters out free enrollments (amount=0 + method='free').
          // Adding it would cause a phantom entry in 'مدفوعاتي' that
          // disappears on the next refetch.
        } catch {}
        await onEnrolled?.()
        // ⚡ OPEN THE COURSE IMMEDIATELY after successful free enrollment.
        // Pass the new enrollment data returned from the API so the
        // parent component doesn't have to wait for the enrollments
        // state to refresh (which would cause a "can't open" toast).
        onViewCourse?.(course, syntheticEnr)
      } else toast.error('فشل التسجيل')
    } catch {
      toast.error('خطأ')
    } finally {
      setEnrolling(null)
    }
  }

  // Clicking the entire card triggers the appropriate action:
  // - If enrolled + payment confirmed → open the course viewer immediately
  // - If enrolled + payment PENDING   → show toast (waiting admin approval)
  // - If free + not enrolled          → auto-enroll then open the course viewer
  // - If paid + not enrolled          → open the payment dialog (course opens AFTER admin approval)
  const handleCardClick = (c: any) => {
    const enr = enrollments?.find((e: any) => e.course_id === c.id)
    const isFree = c.price_type === 'مجانية' || c.price === 0
    if (enr) {
      // SAFETY: even if enrolled, don't open if payment is pending
      if (enr.payment_status === 'pending') {
        toast.info('بانتظار تأكيد الإدارة للدفع — سيتم تفعيل الدورة قريباً')
        return
      }
      // free | confirmed | completed → safe to open
      onViewCourse?.(c)
    } else if (isFree) {
      enrollFree(c)
    } else {
      setPayDialog({ course: c, open: true })
    }
  }

  const enrollPaid = async (course: any, method: any, reference: string, proofUrl?: string | null, couponCode?: string) => {
    if (isEnrolled(course.id)) { toast.info('أنت مسجّل في هذه الدورة'); return }
    setEnrolling(course.id)
    try {
      let fullReference = proofUrl ? (reference + ' | PROOF: ' + proofUrl) : reference
      // If coupon was applied, validate it server-side and get discounted price
      let finalAmount = course.price
      if (couponCode) {
        try {
          const couponRes = await fetch(`/api/coupons?code=${encodeURIComponent(couponCode.toUpperCase())}`)
          const couponData = await couponRes.json()
          if (couponData.valid && couponData.coupon) {
            const c = couponData.coupon
            finalAmount = c.discount_type === 'percentage'
              ? Math.max(0, course.price - Math.round((course.price * c.discount_value) / 100))
              : Math.max(0, course.price - c.discount_value)
            // Add coupon info to the reference
            fullReference = fullReference + ' | COUPON:' + couponCode
          }
        } catch {}
      }
      const res = await fetch('/api/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId, course_id: course.id, payment_status: 'pending',
          amount_paid: finalAmount, currency: course.currency || 'ر.ي',
          payment_method: method.name, payment_reference: fullReference,
        }),
      })
      const data = await res.json()
      if (data.already_enrolled) { toast.info('أنت مسجّل في هذه الدورة') }
      else if (res.ok) {
        toast.success('تم تسجيل طلبك! سيتم تفعيل الدورة بعد تأكيد الدفع')
        // ⚡ OPTIMISTIC UPDATE: immediately add the new payment + enrollment
        // to the local state so they appear in 'مدفوعاتي' + 'دوراتي' WITHOUT
        // waiting for the API refetch. This makes the UI feel instant.
        // The Realtime subscription will eventually deliver the official
        // row from the DB; if it differs (e.g., different id), we dedup
        // by checking if the payment already exists.
        const syntheticPayment = {
          id: data.id || `optimistic-${Date.now()}`,
          user_id: userId,
          course_id: course.id,
          amount: finalAmount,
          currency: course.currency || 'ر.ي',
          method: method.name,
          status: 'قيد الانتظار',
          reference: fullReference,
          date: new Date().toISOString(),
        }
        const syntheticEnrollment = {
          id: data.id || `optimistic-${Date.now()}`,
          user_id: userId,
          course_id: course.id,
          payment_status: 'pending',
          status: 'قيد الانتظار',
          progress: 0,
          amount_paid: finalAmount,
          payment_method: method.name,
          payment_reference: fullReference,
          enrolled_at: new Date().toISOString(),
          completed_at: null,
        }
        try {
          if (setPayments) {
            setPayments((prev: any[]) => {
              // Dedup: don't add if a payment with this id already exists
              if (prev.some((p) => p.id === syntheticPayment.id)) return prev
              return [syntheticPayment, ...prev]
            })
          }
          if (setEnrollments) {
            setEnrollments((prev: any[]) => {
              if (prev.some((e) => e.id === syntheticEnrollment.id)) return prev
              return [syntheticEnrollment, ...prev]
            })
          }
        } catch {}
        onEnrolled(); setPayDialog(null)
      } else toast.error('فشل التسجيل')
    } catch { toast.error('خطأ') }
    finally { setEnrolling(null) }
  }

  return (
    <SectionCard title="استكشاف الدورات" description="تصفّح جميع الدورات المتاحة — اضغط على الدورة لفتحها">
      {/* === Featured + Limited-time offers — shown ABOVE the grid === */}
      {(() => {
        const featuredCourses = (courses || []).filter((c: any) =>
          (c.offer_type === 'featured' || c.offer_type === 'limited_time') &&
          !isEnrolled(c.id)
        )
        if (featuredCourses.length === 0) return null
        return (
          <div className="mb-7 space-y-3">
            {/* Magical section header with golden gradient + sparkles */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-navy via-navy-light to-navy p-3.5 ring-1 ring-gold/30 shadow-lg">
              <div className="absolute inset-0 opacity-25" style={{
                backgroundImage: 'radial-gradient(circle at 12% 50%, #D4AF37 1.5px, transparent 1.5px), radial-gradient(circle at 88% 50%, #fff 1px, transparent 1px)',
                backgroundSize: '24px 24px, 18px 18px'
              }} />
              <div className="absolute -top-8 -right-8 w-32 h-32 bg-gold/20 rounded-full blur-2xl" />
              <div className="relative flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold to-amber-500 flex items-center justify-center shadow-md">
                  <Sparkles className="w-5 h-5 text-navy" />
                </div>
                <div className="flex-1">
                  <div className="font-bold text-white text-sm">عروض خاصة ومميزة</div>
                  <div className="text-gold/80 text-[10px] mt-0.5">فقط للحظات — لا تفوّت الفرصة</div>
                </div>
                <Badge className="bg-gold/20 text-gold border-gold/40 backdrop-blur-sm font-bold">{featuredCourses.length} عروض</Badge>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 fia-stagger">
              {featuredCourses.map((c: any) => {
                const isFree = c.price_type === 'مجانية' || c.price === 0
                const offerPrice = Number(c.offer_price) || 0
                const displayPrice = offerPrice > 0 ? offerPrice : (Number(c.price) || 0)
                const originalPrice = Number(c.original_price) || 0
                const hasDiscount = originalPrice > displayPrice && displayPrice > 0
                const isLimited = c.offer_type === 'limited_time'
                const unitLabel = c.offer_duration_unit === 'hours' ? 'ساعة' :
                  c.offer_duration_unit === 'days' ? 'يوم' :
                  c.offer_duration_unit === 'weeks' ? 'أسبوع' : 'شهر'

                // === Remaining time for limited-time offers ===
                const offerStart = c.updated_at || c.created_at
                let remainingMs: number | null = null
                let expired = false
                if (isLimited && offerStart && Number(c.offer_duration_value) > 0) {
                  const start = new Date(offerStart).getTime()
                  const dur = Number(c.offer_duration_value)
                  const unitMs = c.offer_duration_unit === 'hours' ? 3600000 :
                    c.offer_duration_unit === 'days' ? 86400000 :
                    c.offer_duration_unit === 'weeks' ? 604800000 : 2592000000
                  const expiry = start + dur * unitMs
                  remainingMs = expiry - Date.now()
                  if (remainingMs <= 0) expired = true
                }
                if (expired) return null
                const fmtRemaining = (ms: number) => {
                  const totalSec = Math.floor(ms / 1000)
                  const days = Math.floor(totalSec / 86400)
                  const hours = Math.floor((totalSec % 86400) / 3600)
                  const mins = Math.floor((totalSec % 3600) / 60)
                  if (days > 0) return `${days} يوم ${hours} ساعة`
                  if (hours > 0) return `${hours} ساعة ${mins} دقيقة`
                  if (mins > 0) return `${mins} دقيقة`
                  return 'تنتهي قريباً'
                }
                const discountPct = hasDiscount
                  ? Math.round((1 - displayPrice / Math.max(originalPrice, 1)) * 100)
                  : 0
                return (
                  <Card
                    key={c.id}
                    className={`fia-course-card overflow-hidden cursor-pointer ${isLimited ? 'fia-limited-ring' : 'fia-featured-ring'}`}
                    onClick={() => handleCardClick(c)}
                  >
                    {/* Magical cover with zoom + shine sweep */}
                    <div className="relative h-36 overflow-hidden bg-gradient-to-br from-navy via-navy-light to-navy">
                      {c.cover && (
                        <img
                          src={c.cover}
                          alt={c.title}
                          loading="lazy"
                          className="fia-cover-img absolute inset-0 w-full h-full object-cover"
                        />
                      )}
                      {/* Layered overlays for legibility */}
                      <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/40 to-transparent" />
                      <div className="absolute inset-0 bg-gradient-to-br from-gold/10 via-transparent to-transparent" />
                      <div className="fia-shine" />

                      {/* Offer badge top-right — animated gradient */}
                      <div className={`absolute top-2.5 right-2.5 px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 ring-1 ${isLimited ? 'bg-gradient-to-r from-red-500 via-rose-500 to-red-600 text-white ring-white/30 fia-pulse-red' : 'bg-gradient-to-r from-gold via-amber-400 to-gold text-navy ring-white/40'}`}>
                        {isLimited ? <Clock className="w-3.5 h-3.5" /> : <Star className="w-3.5 h-3.5 fill-current" />}
                        <span className="text-[11px] font-extrabold tracking-tight">{isLimited ? '⏰ لمدة محدودة' : '⭐ مميزة'}</span>
                      </div>

                      {/* Discount % — rotated chip top-left */}
                      {hasDiscount && (
                        <div className="fia-discount-pop absolute top-2.5 left-2.5 w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-rose-600 text-white flex flex-col items-center justify-center shadow-lg ring-2 ring-white/60">
                          <span className="text-[11px] font-extrabold leading-none">{discountPct}%</span>
                          <span className="text-[8px] font-bold leading-none mt-0.5">خصم</span>
                        </div>
                      )}

                      {/* Remaining time chip — limited-time offers */}
                      {isLimited && remainingMs !== null && (
                        <div className="absolute bottom-2 right-2 bg-white/95 backdrop-blur-sm text-red-600 text-[10px] font-extrabold px-2.5 py-1 rounded-lg shadow-md border border-red-500/30 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {fmtRemaining(remainingMs)}
                        </div>
                      )}

                      {/* For featured (not limited), show duration chip */}
                      {!isLimited && Number(c.offer_duration_value) > 0 && (
                        <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-sm text-navy text-[10px] font-bold px-2.5 py-1 rounded-lg shadow" dir="ltr">
                          {c.offer_duration_value} {unitLabel}
                        </div>
                      )}

                      {/* Level chip bottom-left */}
                      {c.level && (
                        <div className="absolute bottom-2 left-2 bg-navy/80 text-gold text-[10px] font-bold px-2.5 py-1 rounded-lg backdrop-blur-sm border border-gold/30">
                          {c.level}
                        </div>
                      )}
                    </div>

                    {/* Body — magical gradient header strip */}
                    <div className="relative p-4">
                      {/* Magical top strip */}
                      <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-l from-gold via-amber-400 to-gold opacity-80" />

                      {c.offer_headline && (
                        <div className={`text-xs font-bold mb-1.5 truncate flex items-center gap-1 ${isLimited ? 'text-red-600' : 'text-gold'}`}>
                          {isLimited ? '⏰' : '⭐'} {c.offer_headline}
                        </div>
                      )}
                      <h3 className="font-bold text-navy text-sm mb-2 line-clamp-1">{c.title}</h3>

                      {/* Magical price display */}
                      <div className="flex items-baseline gap-2 mb-3">
                        {isFree ? (
                          <span className="text-2xl font-extrabold bg-gradient-to-r from-emerald-500 to-teal-600 bg-clip-text text-transparent" dir="ltr">مجانية</span>
                        ) : (
                          <>
                            {hasDiscount && (
                              <span className="text-xs line-through text-red-500/80 font-bold" dir="ltr">
                                {originalPrice.toLocaleString()} {c.currency || 'ر.ي'}
                              </span>
                            )}
                            <span className="text-xl font-extrabold bg-gradient-to-r from-gold to-amber-500 bg-clip-text text-transparent" dir="ltr">
                              {displayPrice.toLocaleString()} {c.currency || 'ر.ي'}
                            </span>
                          </>
                        )}
                      </div>

                      <Button
                        size="sm"
                        className={`w-full text-xs rounded-xl shadow-md hover:shadow-lg active:scale-[0.97] transition-all ${isLimited ? 'bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white' : 'bg-gradient-to-r from-navy to-navy-light hover:from-navy-light hover:to-navy text-gold border border-gold/30'}`}
                        onClick={(e) => { e.stopPropagation(); handleCardClick(c) }}
                      >
                        {isFree ? '✨ سجّل الآن — مجانية' : '🚀 احصل على العرض الآن'}
                      </Button>
                    </div>
                  </Card>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* === Main course grid — magical creative cards === */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 fia-stagger">
        {courses.map((c: any) => {
          const enr = enrollments?.find((e: any) => e.course_id === c.id)
          const isPendingPayment = enr?.payment_status === 'pending'
          const isOpenable = enr && !isPendingPayment
          const isFree = c.price_type === 'مجانية' || c.price === 0
          const isPaidNotEnrolled = !enr && !isFree
          // === Offer price logic ===
          const originalPriceField = Number(c.original_price) || 0
          const regularPrice = Number(c.price) || 0
          const offerPrice = Number(c.offer_price) || 0
          const displayPrice = offerPrice > 0 ? offerPrice : regularPrice
          const strikePrice = Math.max(originalPriceField, regularPrice, offerPrice)
          const hasDiscount = !isFree && strikePrice > displayPrice && displayPrice > 0
          const hasOffer = !isFree && (c.offer_type === 'limited_time' || c.offer_type === 'featured')
          const offerPct = hasDiscount
            ? Math.round((1 - displayPrice / strikePrice) * 100)
            : 0
          // Magical border ring based on state
          const ringClass = hasOffer
            ? (c.offer_type === 'limited_time' ? 'fia-limited-ring' : 'fia-featured-ring')
            : isOpenable
              ? 'ring-2 ring-emerald-400/50'
              : isPendingPayment
                ? 'ring-2 ring-amber-400/60'
                : isPaidNotEnrolled
                  ? 'ring-1 ring-gold/40'
                  : 'ring-1 ring-gray-200'
          return (
            <Card
              key={c.id}
              className={`fia-course-card overflow-hidden cursor-pointer ${ringClass}`}
              onClick={() => handleCardClick(c)}
            >
              {/* === Magical cover === */}
              <div className="relative h-44 overflow-hidden bg-gradient-to-br from-navy via-navy-light to-navy">
                {c.cover && (
                  <img
                    src={c.cover}
                    alt={c.title}
                    loading="lazy"
                    className="fia-cover-img absolute inset-0 w-full h-full object-cover"
                  />
                )}
                {/* Gradient overlays for legibility */}
                <div className="absolute inset-0 bg-gradient-to-t from-navy/90 via-navy/30 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-br from-gold/10 via-transparent to-transparent" />
                <div className="fia-shine" />

                {/* Level chip top-right */}
                {c.level && (
                  <Badge className="absolute top-2.5 right-2.5 bg-navy/80 text-gold border-gold/30 backdrop-blur-sm shadow-md">{c.level}</Badge>
                )}

                {/* Prominent price display in the middle-bottom of the image */}
                {!isFree && (
                  <div className="absolute bottom-2.5 right-2.5 left-2.5 flex flex-col items-center justify-center text-center">
                    {hasDiscount ? (
                      <div className={`flex items-baseline gap-2 rounded-xl px-3 py-1.5 border shadow-lg ${
                        hasOffer
                          ? 'bg-gradient-to-r from-red-600 to-rose-800 border-red-300/30'
                          : 'bg-white/10 backdrop-blur-md border-white/20'
                      }`}>
                        <span className="text-xs line-through text-white/70 font-bold" dir="ltr">
                          {strikePrice.toLocaleString()} {c.currency || 'ر.ي'}
                        </span>
                        <span className="text-xl font-extrabold text-gold" dir="ltr">
                          {displayPrice.toLocaleString()} {c.currency || 'ر.ي'}
                        </span>
                      </div>
                    ) : (
                      <div className="bg-white/10 backdrop-blur-md rounded-xl px-3 py-1.5 border border-white/20 shadow-lg">
                        <span className="text-xl font-extrabold text-gold" dir="ltr">
                          {displayPrice.toLocaleString()} {c.currency || 'ر.ي'}
                        </span>
                      </div>
                    )}
                    {hasDiscount && (
                      <div className="fia-discount-pop mt-1.5 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full shadow-md bg-gradient-to-r from-yellow-400 to-amber-500 text-navy ring-1 ring-white/40">
                        {offerPct}% خصم{hasOffer ? ' — عرض خاص' : ''}
                      </div>
                    )}
                  </div>
                )}

                {/* === Status / offer badge top-left — magical pill === */}
                {hasOffer ? (
                  <Badge className={`absolute top-2.5 left-2.5 flex items-center gap-1 backdrop-blur-sm shadow-md ${c.offer_type === 'limited_time' ? 'bg-gradient-to-r from-red-500 to-red-700 text-white fia-pulse-red' : 'bg-gradient-to-r from-gold to-yellow-500 text-navy'}`}>
                    {c.offer_type === 'limited_time' ? <Clock className="w-3 h-3" /> : <Star className="w-3 h-3 fill-current" />}
                    {c.offer_type === 'limited_time' ? '⏰ لمدة محدودة' : '⭐ مميزة'}
                  </Badge>
                ) : isOpenable ? (
                  <Badge className="fia-status-glow absolute top-2.5 left-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white flex items-center gap-1 backdrop-blur-sm shadow-md border border-emerald-300/40">
                    <CheckCircle2 className="w-3 h-3" /> مسجّل — اضغط للفتح
                  </Badge>
                ) : isPendingPayment ? (
                  <Badge className="absolute top-2.5 left-2.5 bg-gradient-to-r from-amber-400 to-yellow-500 text-navy flex items-center gap-1 backdrop-blur-sm shadow-md border border-amber-300/50">
                    <Clock className="w-3 h-3" /> بانتظار الدفع
                  </Badge>
                ) : isFree ? (
                  <Badge className="absolute top-2.5 left-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white backdrop-blur-sm shadow-md border border-emerald-300/40 flex items-center gap-1">
                    <Gift className="w-3 h-3" /> مجانية — اضغط للفتح
                  </Badge>
                ) : (
                  <Badge className="absolute top-2.5 left-2.5 bg-gradient-to-r from-gold to-amber-500 text-navy backdrop-blur-sm shadow-md border border-gold/40 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> مدفوعة — اضغط للاشتراك
                  </Badge>
                )}
              </div>

              {/* === Magical body === */}
              <div className="relative p-4">
                {/* Top magical strip */}
                <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-l from-gold via-amber-400 to-gold opacity-70" />

                {/* Offer headline (if set) */}
                {hasOffer && c.offer_headline && (
                  <div className={`text-xs font-bold mb-1.5 truncate flex items-center gap-1 ${c.offer_type === 'limited_time' ? 'text-red-600' : 'text-gold'}`}>
                    {c.offer_type === 'limited_time' ? '⏰' : '⭐'} {c.offer_headline}
                  </div>
                )}

                {/* Title + magical gradient on hover */}
                <h3 className="font-bold text-navy text-sm mb-1.5 line-clamp-2 min-h-[2.5rem] transition-colors">{c.title}</h3>

                {/* Description */}
                <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{c.short_description}</p>

                {/* Meta row — duration + price */}
                <div className="flex items-center justify-between text-xs mb-3">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="w-3 h-3" /> {c.duration_hours || 0} ساعة
                  </span>
                  <span className="font-bold" dir="ltr">
                    {isFree ? <span className="text-emerald-600">مجانية</span> : hasDiscount ? (
                      <span className="flex items-baseline gap-1.5">
                        <span className="line-through text-red-500/70 text-[10px]" dir="ltr">
                          {strikePrice.toLocaleString()} {c.currency || 'ر.ي'}
                        </span>
                        <span className="bg-gradient-to-r from-emerald-500 to-teal-600 bg-clip-text text-transparent" dir="ltr">
                          {displayPrice.toLocaleString()} {c.currency || 'ر.ي'}
                        </span>
                      </span>
                    ) : <span className="text-gold">{displayPrice.toLocaleString()} {c.currency || 'ر.ي'}</span>}
                  </span>
                </div>

                {/* CTA hint — magical gradient pill */}
                <div className={`text-[10px] font-bold text-center py-1.5 rounded-lg transition-all ${
                  isOpenable ? 'bg-emerald-50/80 text-emerald-700 border border-emerald-200/50' :
                  isPendingPayment ? 'bg-amber-50/80 text-amber-700 border border-amber-200/50' :
                  isFree ? 'bg-emerald-50/80 text-emerald-700 border border-emerald-200/50' :
                  'bg-navy/5 text-navy border border-gold/30'
                }`}>
                  {isOpenable
                    ? '↵ اضغط لفتح الدورة'
                    : isPendingPayment
                      ? '↵ اضغط لمعرفة الحالة'
                      : isFree
                        ? '↵ اضغط للتسجيل والفتح فوراً'
                        : '↵ اضغط لإكمال الاشتراك'}
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* === Empty state — magical when no courses exist === */}
      {(!courses || courses.length === 0) && (
        <div className="text-center py-16">
          <div className="relative inline-block mb-5">
            <div className="absolute inset-0 bg-gold/20 rounded-full blur-2xl animate-pulse" />
            <div className="relative w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-navy via-navy-light to-navy flex items-center justify-center shadow-xl border border-gold/30">
              <BookOpen className="w-10 h-10 text-gold" />
            </div>
          </div>
          <h3 className="font-bold text-navy text-base mb-1.5">لا توجد دورات بعد</h3>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">سيتم إضافة دورات جديدة قريباً — ترقّب الإشعارات ✨</p>
        </div>
      )}

      {payDialog?.open && (
        <PaymentDialog
          course={payDialog.course}
          methods={getMethodsForCourse(payDialog.course)}
          open={payDialog.open}
          userId={userId}
          onOpenChange={(o) => setPayDialog({ ...payDialog, open: o })}
          onPay={(method: any, reference: string, proofUrl?: string | null, couponCode?: string) => enrollPaid(payDialog.course, method, reference, proofUrl, couponCode)}
          loading={enrolling === payDialog.course.id}
        />
      )}
    </SectionCard>
  )
}

function PaymentDialog({ course, methods, open, onOpenChange, onPay, loading, userId }: any) {
  const [selectedMethod, setSelectedMethod] = useState<any>(methods[0] || null)
  // Auto-select the first payment method when the list arrives.
  // Without this, selectedMethod stays null if methods was empty
  // when the dialog first rendered (methods loads asynchronously).
  useEffect(() => {
    if (methods?.length > 0 && !selectedMethod) {
      setSelectedMethod(methods[0])
    }
  }, [methods, selectedMethod])
  const [reference, setReference] = useState('')
  const [proofUrl, setProofUrl] = useState<string | null>(null)
  const [uploadingProof, setUploadingProof] = useState(false)
  const [couponCode, setCouponCode] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<any | null>(null)
  const [validatingCoupon, setValidatingCoupon] = useState(false)
  const [couponError, setCouponError] = useState('')
  const [autoCouponApplied, setAutoCouponApplied] = useState(false)

  // The "official" price (struck through) — only shown if it's greater
  // === PRICING LOGIC FOR PAYMENT ===
  // - `course.price` = the regular course price (shown when no offer)
  // - `course.original_price` = the "was" price (struck through)
  // - `course.offer_price` = the special promotional offer price (if
  //   the course is currently in an offer period — limited_time or
  //   featured). When set and > 0, this is what the student pays.
  // - `course.auto_coupon_code` = coupon that's auto-applied at
  //   checkout (if the student hasn't already used it on another
  //   course)
  // The student is charged `finalPrice` below, which is the offer
  // price (or regular price if no offer) minus any coupon discount.
  const regularPrice = Number(course.price) || 0
  const offerPrice = Number(course.offer_price) || 0
  const officialPrice = Number(course.original_price) || 0
  // The "base price" is what the student pays BEFORE any coupon.
  // If there's an offer_price, use it; otherwise fall back to the
  // regular course.price.
  const basePrice = offerPrice > 0 ? offerPrice : regularPrice
  // The struck-through "was" price — pick the larger of official_price
  // and regular_price so the student sees the biggest discount.
  const strikePrice = Math.max(officialPrice, regularPrice, offerPrice)
  const hasStrikethrough = strikePrice > basePrice && basePrice > 0
  // For backward compat, alias to old variable names used elsewhere.
  const originalPrice = basePrice

  const discount = appliedCoupon
    ? appliedCoupon.discount_type === 'percentage'
      ? Math.round((basePrice * (appliedCoupon.discount_value || 0)) / 100)
      : (appliedCoupon.discount_value || 0)
    : 0
  const finalPrice = Math.max(0, originalPrice - discount)

  // ============================================================
  // AUTO-APPLY THE COURSE'S COUPON — if the trainer set an
  // `auto_coupon_code` for this course, we validate + apply it
  // automatically the moment the dialog opens, so the student
  // sees the discounted price without needing to type anything.
  // We pass the user_id so the per-user usage restriction is
  // enforced (the student can't reuse the coupon on another course).
  // ============================================================
  useEffect(() => {
    if (!open || !course?.auto_coupon_code || autoCouponApplied) return
    setAutoCouponApplied(true) // mark as attempted, prevent retry loop
    setCouponCode(course.auto_coupon_code)
    // Validate the auto coupon with the user_id so per-user
    // restriction is enforced.
    ;(async () => {
      setValidatingCoupon(true)
      try {
        const url = `/api/coupons?code=${encodeURIComponent(course.auto_coupon_code.toUpperCase())}` +
          (userId ? `&user_id=${encodeURIComponent(userId)}` : '')
        const res = await fetch(url)
        const data = await res.json()
        if (data.valid && data.coupon) {
          setAppliedCoupon(data.coupon)
        } else if (data.already_used) {
          // Student already used this coupon on another course —
          // don't apply it, just clear the code silently.
          setCouponCode('')
        } else {
          // Invalid coupon — don't show an error (the user didn't
          // type it manually). Just clear the code.
          setCouponCode('')
        }
      } catch {
        setCouponCode('')
      } finally {
        setValidatingCoupon(false)
      }
    })()
  }, [open, course?.auto_coupon_code, userId])

  const validateCoupon = async () => {
    if (!couponCode.trim()) { setCouponError(''); setAppliedCoupon(null); return }
    setValidatingCoupon(true)
    setCouponError('')
    try {
      // Pass user_id so per-user restriction is enforced.
      const url = `/api/coupons?code=${encodeURIComponent(couponCode.trim().toUpperCase())}` +
        (userId ? `&user_id=${encodeURIComponent(userId)}` : '')
      const res = await fetch(url)
      const data = await res.json()
      if (data.valid && data.coupon) {
        if (data.coupon.course_id && data.coupon.course_id !== course.id) {
          setCouponError('غير صالح لهذه الدورة')
          setAppliedCoupon(null)
          return
        }
        setAppliedCoupon(data.coupon)
      } else if (data.already_used) {
        setCouponError('لقد استخدمت هذا الكوبون مسبقاً في دورة أخرى — كل متدرب يمكنه استخدام الكوبون مرة واحدة فقط')
        setAppliedCoupon(null)
      } else {
        setCouponError(data.message || 'كوبون غير صالح')
        setAppliedCoupon(null)
      }
    } catch {
      setCouponError('فشل التحقق')
      setAppliedCoupon(null)
    } finally {
      setValidatingCoupon(false)
    }
  }

  const handleProofUpload = async (file: File) => {
    // Validate on the JS side — Android WebView's accept attribute
    // isn't always honored, so a non-image file could slip through.
    if (!file.type.startsWith('image/')) {
      toast.error(`الملف المختار ليس صورة (النوع: ${file.type || 'غير معروف'}). يرجى اختيار صورة لإثبات الدفع.`)
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('حجم الصورة كبير جداً (حد أقصى 10 ميجابايت)')
      return
    }
    setUploadingProof(true)
    try {
      // 1) Read the file as a data URL so we can draw it onto a canvas.
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => resolve(e.target?.result as string)
        reader.onerror = () => reject(new Error('فشل قراءة الملف'))
        reader.readAsDataURL(file)
      })

      // 2) Load the image so we know its dimensions for resizing.
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = () => reject(new Error('فشل تحميل الصورة'))
        img.src = dataUrl
      })

      // 3) Compress the image to max 1024x1024 JPEG @ 85% quality.
      const blob = await new Promise<Blob | null>((resolve) => {
        const maxW = 1024, maxH = 1024
        let { width, height } = img
        if (width > maxW) { height = (height * maxW) / width; width = maxW }
        if (height > maxH) { width = (width * maxH) / height; height = maxH }
        const canvas = document.createElement('canvas')
        canvas.width = width; canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) { resolve(null); return }
        ctx.drawImage(img, 0, 0, width, height)
        canvas.toBlob(resolve, 'image/jpeg', 0.85)
      })

      if (!blob) {
        toast.error('فشل معالجة الصورة')
        setUploadingProof(false)
        return
      }

      // 4) Upload the compressed image to the server.
      const fd = new FormData()
      fd.append('file', new File([blob], 'proof.jpg', { type: 'image/jpeg' }))
      fd.append('folder', 'payment-proofs')

      const res = await fetch('/api/upload/image', { method: 'POST', body: fd })
      const data = await res.json().catch(() => ({}))

      if (data.url) {
        // IMPORTANT: call setProofUrl with the URL string. The button's
        // disabled condition `!proofUrl` will then evaluate to false and
        // the button will become clickable (and visually black/navy).
        setProofUrl(data.url)
        toast.success('تم رفع إثبات الدفع')
      } else {
        toast.error(data.error || 'فشل رفع الصورة')
      }
    } catch (err) {
      toast.error('خطأ في الرفع')
    } finally {
      setUploadingProof(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto p-0 gap-0 border-0">
        {/* ⚡ Magical gradient header */}
        <div className="relative bg-gradient-to-br from-navy via-navy to-navy-light p-5 pb-6 rounded-t-2xl overflow-hidden">
          <div className="absolute inset-0 opacity-15" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #C9A961 1.5px, transparent 1.5px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '25px 25px, 20px 20px' }} />
          <div className="absolute top-0 left-0 w-32 h-32 bg-[#C9A961]/20 rounded-full blur-3xl -translate-x-12 -translate-y-12" />
          <button onClick={() => onOpenChange(false)} className="absolute top-3 left-3 w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center z-50" title="إغلاق">
            <X className="w-4 h-4 text-white/80" />
          </button>
          <div className="relative flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center shadow-lg border border-white/25">
              <CreditCard className="w-7 h-7 text-white" strokeWidth={2.2} />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-white tracking-tight">الاشتراك في دورة</DialogTitle>
              <p className="text-[#C9A961] text-xs mt-0.5">{course.title}</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="bg-gradient-to-b from-gray-50/50 to-white p-5 space-y-4 rounded-b-2xl">
          {/* Price card */}
          <div className="bg-gradient-to-br from-gold/10 to-amber-50/50 border border-gold/20 p-4 rounded-2xl space-y-2">
            {appliedCoupon && discount > 0 ? (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground line-through text-red-500" dir="ltr">{strikePrice.toLocaleString()} {course.currency || 'ر.ي'}</span>
                  <Badge className="bg-green-500/15 text-green-600 border-green-500/30 text-[10px]">-{discount.toLocaleString()} {course.currency || 'ر.ي'}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-navy">المبلغ النهائي:</span>
                  <span className="text-xl font-extrabold text-gold" dir="ltr">{finalPrice.toLocaleString()} {course.currency || 'ر.ي'}</span>
                </div>
              </>
            ) : hasStrikethrough ? (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">السعر الرسمي:</span>
                  <span className="line-through text-red-500 font-bold" dir="ltr">{strikePrice.toLocaleString()} {course.currency || 'ر.ي'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-navy">{offerPrice > 0 ? 'سعر العرض:' : 'السعر بعد الخصم:'}</span>
                  <div className="flex flex-col items-end">
                    <span className="text-xl font-extrabold text-green-600" dir="ltr">{basePrice.toLocaleString()} {course.currency || 'ر.ي'}</span>
                    <span className="text-[10px] text-green-600 font-bold">وفّر {(strikePrice - basePrice).toLocaleString()} {course.currency || 'ر.ي'}</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-navy">المبلغ المطلوب:</span>
                <span className="text-xl font-extrabold text-gold" dir="ltr">{basePrice.toLocaleString()} {course.currency || 'ر.ي'}</span>
              </div>
            )}
          </div>

          {/* Coupon */}
          <div>
            <Label className="text-navy text-xs font-bold">كوبون خصم (اختياري)</Label>
            <div className="flex gap-2 mt-1.5">
              <Input value={couponCode} onChange={(e) => { setCouponCode(e.target.value); setAppliedCoupon(null); setCouponError('') }} placeholder="FIA-XXXX" dir="ltr" className="font-mono text-sm h-11 rounded-xl" />
              <Button variant="outline" onClick={validateCoupon} disabled={validatingCoupon || !couponCode.trim()} className="flex-shrink-0 text-xs rounded-xl">{validatingCoupon ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'تطبيق'}</Button>
            </div>
            {couponError && <p className="text-[10px] text-red-500 mt-1">{couponError}</p>}
            {appliedCoupon && (
              <div className="mt-2 flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-xl p-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                <span className="text-xs text-green-700 font-bold">{appliedCoupon.code}</span>
                <span className="text-xs text-muted-foreground">{appliedCoupon.discount_type === 'percentage' ? `${appliedCoupon.discount_value}%` : `${appliedCoupon.discount_value} ر.ي`} خصم</span>
                <button onClick={() => { setAppliedCoupon(null); setCouponCode('') }} className="text-red-500 text-xs mr-auto">إزالة</button>
              </div>
            )}
          </div>

          {/* ⚡ Payment methods — professional cards with category-aware display */}
          <div>
            <Label className="text-navy font-bold">اختر طريقة الدفع</Label>
            <div className="grid grid-cols-1 gap-2 mt-2">
              {methods.map((m: any) => {
                const isCrypto = m.payment_category === 'crypto'
                return (
                  <button key={m.id} onClick={() => setSelectedMethod(m)}
                    className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all text-right ${selectedMethod?.id === m.id ? (isCrypto ? 'border-amber-400 bg-amber-50/50 shadow-md' : 'border-emerald-400 bg-emerald-50/50 shadow-md') : 'border-gray-200/60 bg-white hover:border-gray-300'}`}>
                    {/* Icon */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${isCrypto ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white' : 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white'}`}>
                      {isCrypto ? (m.crypto_coin?.charAt(0) || '₿') : (m.icon || '💳')}
                    </div>
                    {/* Name + details */}
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-navy text-sm">{m.name}</div>
                      {isCrypto ? (
                        <div className="text-[10px] text-amber-600 font-mono" dir="ltr">{m.crypto_coin} • {m.crypto_network}</div>
                      ) : (
                        <>
                          {(m.account_number || m.wallet_id) && <div className="text-[10px] text-emerald-600 font-mono" dir="ltr">{m.account_number || m.wallet_id}</div>}
                          {m.account_holder && <div className="text-[10px] text-gray-400">{m.account_holder}</div>}
                        </>
                      )}
                    </div>
                    {/* Selected indicator */}
                    {selectedMethod?.id === m.id && <CheckCircle2 className={`w-5 h-5 flex-shrink-0 ${isCrypto ? 'text-amber-500' : 'text-emerald-500'}`} />}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ⚡ Selected method details — professional card with copy buttons */}
          {selectedMethod && (
            <div className={`p-4 rounded-2xl border space-y-3 ${selectedMethod.payment_category === 'crypto' ? 'bg-gradient-to-br from-amber-50/80 to-orange-50/50 border-amber-200/40' : 'bg-gradient-to-br from-emerald-50/80 to-teal-50/50 border-emerald-200/40'}`}>
              <div className={`font-bold text-sm flex items-center gap-1.5 ${selectedMethod.payment_category === 'crypto' ? 'text-amber-700' : 'text-emerald-700'}`}>
                {selectedMethod.payment_category === 'crypto' ? '₿ تفاصيل العملة الرقمية' : '💵 تفاصيل الحساب'}
              </div>

              {/* Crypto: show coin + network + wallet address / Binance Pay ID */}
              {selectedMethod.payment_category === 'crypto' && (
                <div className="space-y-2">
                  {selectedMethod.crypto_coin && (
                    <div className="flex items-center justify-between bg-white/60 rounded-xl px-3 py-2">
                      <span className="text-xs text-gray-400">العملة:</span>
                      <span className="text-xs font-bold text-amber-700">{selectedMethod.crypto_coin}</span>
                    </div>
                  )}
                  {selectedMethod.crypto_network && (
                    <div className="flex items-center justify-between bg-white/60 rounded-xl px-3 py-2">
                      <span className="text-xs text-gray-400">الشبكة:</span>
                      <span className="text-xs font-mono font-bold text-amber-700" dir="ltr">{selectedMethod.crypto_network}</span>
                    </div>
                  )}
                  {selectedMethod.wallet_address && (
                    <div className="bg-white/60 rounded-xl px-3 py-2.5 space-y-1">
                      <span className="text-xs text-gray-400">عنوان المحفظة:</span>
                      <div className="flex items-center gap-2">
                        <code className="text-xs font-mono text-navy break-all flex-1" dir="ltr" id="wallet-addr">{selectedMethod.wallet_address}</code>
                        <button type="button" onClick={() => { navigator.clipboard?.writeText(selectedMethod.wallet_address); toast.success('تم نسخ العنوان ✓') }}
                          className="flex-shrink-0 w-8 h-8 rounded-lg bg-amber-500 hover:bg-amber-600 flex items-center justify-center transition-colors">
                          <Copy className="w-3.5 h-3.5 text-white" />
                        </button>
                      </div>
                    </div>
                  )}
                  {selectedMethod.binance_pay_id && (
                    <div className="bg-white/60 rounded-xl px-3 py-2.5 space-y-1">
                      <span className="text-xs text-gray-400">Binance Pay ID:</span>
                      <div className="flex items-center gap-2">
                        <code className="text-xs font-mono font-bold text-amber-700 flex-1" dir="ltr">{selectedMethod.binance_pay_id}</code>
                        <button type="button" onClick={() => { navigator.clipboard?.writeText(selectedMethod.binance_pay_id); toast.success('تم نسخ المعرف ✓') }}
                          className="flex-shrink-0 w-8 h-8 rounded-lg bg-amber-500 hover:bg-amber-600 flex items-center justify-center transition-colors">
                          <Copy className="w-3.5 h-3.5 text-white" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Local: show account number + holder + currency with copy buttons */}
              {selectedMethod.payment_category !== 'crypto' && (
                <div className="space-y-2">
                  {/* ⚡ Fall back to wallet_id for legacy rows where account_number is null */}
                  {(() => {
                    const acctNo = selectedMethod.account_number || selectedMethod.wallet_id
                    return acctNo ? (
                      <div className="bg-white/60 rounded-xl px-3 py-2.5 space-y-1">
                        <span className="text-xs text-gray-400">رقم الحساب / المحفظة:</span>
                        <div className="flex items-center gap-2">
                          <code className="text-xs font-mono font-bold text-emerald-700 flex-1 break-all" dir="ltr">{acctNo}</code>
                          <button type="button" onClick={() => { navigator.clipboard?.writeText(acctNo); toast.success('تم نسخ رقم الحساب ✓') }}
                            className="flex-shrink-0 w-8 h-8 rounded-lg bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center transition-colors shadow-sm">
                            <Copy className="w-3.5 h-3.5 text-white" />
                          </button>
                        </div>
                      </div>
                    ) : null
                  })()}
                  {selectedMethod.account_holder && (
                    <div className="flex items-center justify-between bg-white/60 rounded-xl px-3 py-2">
                      <span className="text-xs text-gray-400">صاحب الحساب:</span>
                      <span className="text-xs font-bold text-emerald-700">{selectedMethod.account_holder}</span>
                    </div>
                  )}
                  {selectedMethod.currency && selectedMethod.currency !== 'الكل' && (
                    <div className="flex items-center justify-between bg-white/60 rounded-xl px-3 py-2">
                      <span className="text-xs text-gray-400">العملة:</span>
                      <span className="text-xs font-bold text-emerald-700">{selectedMethod.currency}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Instructions */}
              {selectedMethod.instructions && (
                <div className="bg-white/60 rounded-xl px-3 py-2.5">
                  <span className="text-xs text-gray-400 block mb-1">تعليمات:</span>
                  <p className="text-xs text-gray-600 leading-relaxed">{selectedMethod.instructions}</p>
                </div>
              )}
            </div>
          )}

          {/* ⚡ Upload proof — professional card */}
          <div>
            <Label className="text-navy font-bold text-sm">رفع صورة إثبات الدفع (إيصال)</Label>
            <input type="file" accept="image/*" className="hidden" id="proof-upload" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleProofUpload(f) }} />
            <div className="mt-2">
              {proofUrl ? (
                <div className="flex items-center gap-3 p-3 bg-green-50/50 rounded-2xl border border-green-200/40">
                  <img src={proofUrl} alt="proof" className="w-16 h-16 object-cover rounded-xl border-2 border-green-500/30" />
                  <div className="flex-1 text-xs text-green-600 flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> تم رفع الإيصال بنجاح</div>
                  <button onClick={() => setProofUrl(null)} className="text-red-500 text-xs flex items-center gap-1"><X className="w-3.5 h-3.5" /> إزالة</button>
                </div>
              ) : (
                <Button type="button" variant="outline" disabled={uploadingProof} className="w-full h-12 rounded-2xl border-2 border-dashed border-gray-300/60 hover:border-gold/40 hover:bg-gold/5 bg-white/50"
                  onClick={() => document.getElementById('proof-upload')?.click()}>
                  {uploadingProof ? <><Loader2 className="w-4 h-4 ml-1.5 animate-spin" /> جاري الرفع...</> : <><FileUp className="w-5 h-5 ml-1.5" /> اختر صورة الإيصال</>}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 bg-white border-t border-gray-100 rounded-b-2xl">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">إلغاء</Button>
          <Button className="bg-gradient-to-r from-navy to-navy-light hover:from-navy-light hover:to-navy text-white rounded-xl shadow-lg hover:shadow-xl active:scale-[0.97] transition-all px-6"
            disabled={loading || !selectedMethod || !proofUrl} onClick={() => onPay(selectedMethod, reference || 'N/A', proofUrl, appliedCoupon?.code)}>
            {loading ? 'جاري المعالجة...' : `تأكيد الاشتراك${finalPrice < originalPrice ? ` (${finalPrice.toLocaleString()} ${course.currency || 'ر.ي'})` : ''}`}
          </Button>
        </div>
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
                  <Button size="sm" variant="outline" className="flex-1 border-gold/30 text-navy hover:bg-gold/10" onClick={() => downloadCertificateFile({
                    certificateNumber: c.certificate_number,
                    format: 'png',
                    onStatus: (msg, kind) => {
                      if (kind === 'success') toast.success(msg)
                      else if (kind === 'error') toast.error(msg)
                      else toast.info(msg)
                    },
                  })}>
                    <Download className="w-3.5 h-3.5 ml-1" /> صورة
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

  // Determine the currency to display for a payment. We prefer the
  // course's currency (source of truth) over the payment's stored
  // currency — older payment rows may have defaulted to 'ر.ي' even
  // when the course is in USD.
  const getCurrency = (p: any) => {
    if (p.course_id) {
      const course = courses?.find((c: any) => c.id === p.course_id)
      if (course?.currency) return course.currency
    }
    return p.currency || 'ر.ي'
  }

  // Extract coupon code from the reference field — stored as
  // "| COUPON:CODE-HERE". Returns null if no coupon was applied.
  const getCouponCode = (p: any): string | null => {
    const ref = p?.reference
    if (!ref) return null
    const match = String(ref).match(/COUPON:\s*([A-Za-z0-9_-]+)/i)
    return match ? match[1].toUpperCase() : null
  }

  // Format currency code for nicer display (e.g. 'ر.ي' stays as is,
  // '$' gets a small "USD" tooltip-style wrapper).
  const fmtCurrency = (code: string) => code || 'ر.ي'

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
    // Strip both PROOF: and COUPON: markers so the user sees only the
    // transaction reference they typed, not the internal storage markers.
    return ref
      .replace(/\s*\|\s*PROOF:.*$/i, '')
      .replace(/\s*\|\s*COUPON:.*$/i, '')
      .trim() || null
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
            const couponCode = getCouponCode(p)
            const currency = getCurrency(p)
            const hasCoupon = !!couponCode
            return (
              <Card key={p.id} className={`p-0 overflow-hidden card-hover ${hasCoupon ? 'border-l-4 border-l-red-500 ring-1 ring-red-500/20' : 'border-border'}`}>
                {/* Amount header — has red accent when coupon applied */}
                <div className={`p-4 text-white ${hasCoupon ? 'bg-gradient-to-br from-red-700 to-red-900' : 'bg-gradient-to-br from-navy to-navy-light'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className={`text-[11px] font-semibold mb-0.5 ${hasCoupon ? 'text-red-100' : 'text-gold/80'}`}>
                        {hasCoupon ? '⚠ المبلغ بعد الخصم' : 'المبلغ'}
                      </div>
                      <div className="text-2xl font-extrabold tracking-tight" dir="ltr">
                        {fmtAmount(p)} <span className={`text-base font-bold ${hasCoupon ? 'text-red-200' : 'text-gold'}`}>{fmtCurrency(currency)}</span>
                      </div>
                    </div>
                    <Badge className={`${statusInfo.badgeClass} border whitespace-nowrap`}>{statusInfo.label}</Badge>
                  </div>
                  {hasCoupon && (
                    <div className="mt-2 inline-flex items-center gap-1.5 bg-red-500/30 border border-red-300/50 rounded-md px-2 py-0.5">
                      <span className="text-[10px] text-red-100">كوبون خصم:</span>
                      <span className="text-[11px] font-bold text-white font-mono" dir="ltr">{couponCode}</span>
                    </div>
                  )}
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
                  <div>
                    <div className="text-[11px] text-muted-foreground mb-0.5">العملة</div>
                    <div className="text-sm font-bold text-navy" dir="ltr">{fmtCurrency(currency)}</div>
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
        <DialogContent className="sm:max-w-5xl max-h-[92vh] overflow-y-auto">
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
