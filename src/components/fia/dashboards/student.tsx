'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  LayoutDashboard, BookOpen, FileText, Award, CreditCard,
  User, Bell, Settings, TrendingUp, Clock, CheckCircle2,
  Compass, Lock, Plus, Download, Loader2, FileUp, X, Copy, Share2,
  Mail, Eye, EyeOff, MessageSquare, Newspaper, HelpCircle, Gift, ExternalLink,
  Sparkles, Star, PlayCircle, Phone, Briefcase, XCircle, ShieldCheck,
  RefreshCw, Hourglass, Timer, Ban, GraduationCap, HeartHandshake,
  Users2, Search, BadgeCheck, Crown,
} from 'lucide-react'
import { DashboardShell, StatCard, SectionCard, NavItem } from './shell'
// 🔒 v6.5: المسمى الوظيفي والتخصص حقلا المدرّب حصراً — حُذفا نهائياً من واجهة
// المتدرب كلياً (لا عرض ولا تعديل) بطلب صاحب المنصة
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
import { SharedBlog, SharedFAQ } from './shared-community'
import { SharedForumRoyal } from './shared-forum-royal'
import { AffiliateDashboard } from '@/components/fia/affiliate-dashboard'
import { CertificateRequest } from '@/components/fia/certificate-request'
import { ExamRetakeDialog } from '@/components/fia/exam-retake-dialog'
// ⚡ v7.0 تحميل كسول ملكي: عارض الشهادات (وزن ثقيل) لا يُحمل إلا عند الطلب الفعلي
const CertificateViewer = dynamic(
  () => import('@/components/fia/certificate-viewer').then((m) => m.CertificateViewer),
  { ssr: false }
)
import dynamic from 'next/dynamic'
import { downloadCertificateFile } from '@/lib/certificate-download'
import { RoyalGridSkeleton, RoyalListSkeleton } from '@/components/fia/royal-skeleton'
import { royalFetch, royalInvalidate } from '@/lib/royal-cache'
// 👑 v10.3 — الهوية الملكية: الرتب + الأوسمة + بطاقة العضوية + إطار الصورة الذهبي (عرض فقط)
import { LuxRankBadge, LuxAchievements, LuxMembershipCard } from '@/components/fia/lux-identity'
// 👑 v10.3 — السحب للتحديث بحلقة ذهبية (لوحة المتدرب فقط)
import { LuxPullToRefresh } from '@/components/fia/lux-experience'

// ⚡ v6.7 — القائمة الملكية المرتّبة: الأقسام مجمّعة تحت 6 ترويسات ذهبية
const NAV: NavItem[] = [
  // الرئيسية
  { id: 'overview', label: 'نظرة عامة', icon: LayoutDashboard, group: 'الرئيسية' },
  // التعلّم
  { id: 'courses', label: 'دوراتي', icon: BookOpen, group: 'التعلّم' },
  { id: 'browse', label: 'استكشاف الدورات', icon: Compass, group: 'التعلّم' },
  { id: 'trainers', label: 'المدربون', icon: GraduationCap, group: 'التعلّم' },
  // التقدّم
  { id: 'exams', label: 'اختباراتي', icon: FileText, group: 'التقدّم' },
  { id: 'results', label: 'نتائجي', icon: TrendingUp, group: 'التقدّم' },
  { id: 'certificates', label: 'شهاداتي', icon: Award, group: 'التقدّم' },
  // المالية
  { id: 'payments', label: 'مدفوعاتي', icon: CreditCard, group: 'المالية' },
  { id: 'affiliate', label: 'برنامج العمولة', icon: Gift, group: 'المالية' },
  // المجتمع
  { id: 'forum', label: 'المنتدى', icon: MessageSquare, group: 'المجتمع' },
  { id: 'blog', label: 'المدونة', icon: Newspaper, group: 'المجتمع' },
  { id: 'faqs', label: 'الأسئلة الشائعة', icon: HelpCircle, group: 'المجتمع' },
  // حسابي
  { id: 'profile', label: 'ملفي الشخصي', icon: User, group: 'حسابي' },
  { id: 'notifications', label: 'الإشعارات', icon: Bell, group: 'حسابي' },
  { id: 'settings', label: 'الإعدادات', icon: Settings, group: 'حسابي' },
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
  // 👑 v10.6.1 — حفظ القسم النشط في الجلسة: أي تحديث (سحب للتحديث/إعادة تحميل)
  // يعيدك لنفس الصفحة التي كنت فيها — لا عودة إلى النظرة العامة أبداً
  const [active, setActiveState] = useState<string>(() => {
    try {
      const v = sessionStorage.getItem('fia-tab-student')
      return v && NAV.some((n) => n.id === v) ? v : 'overview'
    } catch { return 'overview' }
  })
  const setActive = (id: string) => {
    setActiveState(id)
    try { sessionStorage.setItem('fia-tab-student', String(id)) } catch {}
  }
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
  const [profile, setProfile] = useState({ name: user?.name || '', phone: user?.phone || '', bio: splitBio(user?.bio || '') })

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
      royalInvalidate('/api/courses') // ⚡ v7.0 إبطال الخزنة قبل التحديث اليدوي
      fetch(`/api/certificates?student_name=${encodeURIComponent(user?.name || '__none__')}`).then((r) => r.json()).then((d) => setCertificates(Array.isArray(d) ? d : [])).catch(() => {})
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
      royalInvalidate('/api/courses') // ⚡ v7.0 إبطال الخزنة — بيانات الإشعار أهم من الكاش
      fetch(`/api/certificates?student_name=${encodeURIComponent(user?.name || '__none__')}`).then((r) => r.json()).then((d) => setCertificates(Array.isArray(d) ? d : [])).catch(() => {})
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
    // ⚡ v7.0 التحميل الأول من الخزنة الملكية — وكل إشعار لحظي يبطلها فوراً
    royalFetch<any[]>('/api/courses', { ttl: 45_000 }).then((d) => setCourses(Array.isArray(d) ? d : [])).catch(() => {})
    fetch(`/api/certificates?student_name=${encodeURIComponent(user?.name || '__none__')}`).then((r) => r.json()).then((d) => setCertificates(Array.isArray(d) ? d : [])).catch(() => {})
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
        // ⚡ قناة مستقلة عن قناة التوستات — كان الاشتراكان على نفس الاسم
        //   فيتنافسان ويظهر إشعار مزدوج عند وصول أي دفعة
        .channel(`payments-state-student:${user.id}`)
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
  // student sees the course open INSTANTLY (no manual refresh needed).
  //
  // IMPORTANT: enrollments are stored in the `payments` table (not an
  // `enrollments` table). The previous subscription on `enrollments`
  // never fired because that table doesn't exist. We now subscribe
  // to `payments` filtered by user_id, and on any INSERT/UPDATE we
  // reload the enrollments from /api/enrollments (which dedupes +
  // normalizes the raw payment rows into proper enrollment objects).
  useEffect(() => {
    if (!user?.id) return
    let channel: any
    let debounce: any
    const triggerReload = () => {
      // Debounce — multiple payment rows can update in quick succession
      // when admin approves (the API also updates duplicate rows).
      // We only need one reload.
      if (debounce) clearTimeout(debounce)
      debounce = setTimeout(() => {
        loadEnrollments()
      }, 400)
    }
    try {
      channel = supabasePublic
        .channel(`payments-realtime-student:${user.id}`)
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'payments', filter: `user_id=eq.${user.id}` },
          () => {
            toast.success('📚 تم تسجيلك في دورة جديدة!')
            triggerReload()
          }
        )
        .on('postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'payments', filter: `user_id=eq.${user.id}` },
          (payload: any) => {
            // ⚡ When the admin flips status to 'مكتمل' (approved), the
            // course opens immediately for the student. Show a toast and
            // reload enrollments to pick up the new payment_status.
            const newStatus = payload?.new?.status
            if (newStatus === 'مكتمل' || newStatus === 'completed' || newStatus === 'paid') {
              toast.success('✅ تم تأكيد دفعك! الدورة متاحة الآن')
            } else if (newStatus === 'ملغي' || newStatus === 'cancelled' || newStatus === 'failed') {
              toast.error('❌ تم رفض الدفع. يرجى التواصل مع الإدارة')
            }
            triggerReload()
          }
        )
        .subscribe()
    } catch {}
    return () => {
      if (debounce) clearTimeout(debounce)
      try { supabasePublic.removeChannel(channel) } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  // ⚡ POLLING FALLBACK: Realtime subscriptions use the anon key + RLS,
  // but `payments` has RLS enabled with no anon SELECT policy. That
  // means the Realtime subscription may silently fail to fire. To
  // guarantee the student sees the approval INSTANTLY (≤5s) even if
  // Realtime doesn't fire, we poll /api/enrollments every 5 seconds
  // WHILE the student has at least one pending enrollment. Once all
  // enrollments are non-pending, polling stops to save bandwidth.
  useEffect(() => {
    if (!user?.id) return
    const hasPending = enrollments.some((e: any) => e.payment_status === 'pending')
    if (!hasPending) return
    const interval = setInterval(() => {
      loadEnrollments()
    }, 5000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, enrollments])

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
            const isFree = c.price_type === 'مجانية' || !Number(c.price)
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
          {active === 'trainers' && <Trainers userId={user?.id} onViewCourse={(c: any) => {
            // Same safety logic as the overview: enrollment/paid checks
            const enr = enrollments.find((e:any)=>e.course_id===c.id)
            if (!enr) {
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
          {active === 'exams' && <Exams userId={user?.id} courses={courses} />}
          {active === 'results' && <Results courses={courses} />}
          {active === 'certificates' && <StudentCertificates user={user} />}
          {active === 'payments' && <Payments payments={payments} userId={user?.id} courses={courses} />}
          {active === 'forum' && <SharedForumRoyal user={user} />}
          {active === 'blog' && <SharedBlog />}
          {active === 'faqs' && <SharedFAQ />}
          {active === 'affiliate' && (
            <SectionCard title="برنامج العمولة" description="شارك أصدقاءك واكسب عمولة">
              <AffiliateDashboard />
            </SectionCard>
          )}
          {active === 'profile' && <Profile profile={profile} setProfile={setProfile} user={user} updateUser={updateUser} enrollments={enrollments} certificates={certificates} />}
          {active === 'notifications' && <Notifications userId={user?.id} enrollments={enrollments} courses={courses} />}
          {active === 'settings' && <SettingsTab user={user} updateUser={updateUser} />}
        </>
      )}
    </DashboardShell>
  )
}

const Overview = React.memo(function Overview({ user, courses, certificates, enrollments, onViewCourse }: any) {
  // Helper: determine if a course can be opened by the student.
  // Returns { canOpen, reason, enrollment } so the UI can decide what
  // to do when the user clicks "عرض الدورة".
  // - Free + not enrolled  -> should auto-enroll then open
  // - Paid + not enrolled  -> must open payment dialog
  // - Paid + enrolled pending -> cannot open (waiting admin approval)
  // - Enrolled (free/confirmed/completed) -> can open
  const getCourseAccess = (c: any) => {
    const enr = enrollments?.find((e: any) => e.course_id === c.id)
    const isFree = c.price_type === 'مجانية' || !Number(c.price)
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

  // 👑 v10.3 — إحصاءات الرتبة الملكية (من بيانات حقيقية موجودة)
  const rankStats = {
    enrolledCount: enrollments?.length || 0,
    completedCount: enrollments?.filter((e:any)=>e.status==='completed'||e.status==='مكتمل').length || 0,
    certificatesCount: certificates?.length || 0,
    avgProgress: enrollments?.length ? Math.round(enrollments.reduce((s:number, e:any)=>s+(e.progress||0), 0)/enrollments.length) : 0,
  }

  // 👑 v10.3 — بطاقة «أكمل من حيث توقفت»: أحدث دورة نشطة غير مكتملة
  const activeEnrs = (enrollments || []).filter((e:any) =>
    e.payment_status !== 'pending' && (e.progress || 0) < 100 && e.status !== 'completed' && e.status !== 'مكتمل')
  const contEnr = activeEnrs.find((e:any)=>(e.progress||0) > 0) || activeEnrs[0] || null
  const contCourse = contEnr ? courses.find((c:any)=>c.id===contEnr.course_id) : null

  // 👑 v10.3 — «درس اليوم»: اقتراح ثابت طوال اليوم (من غير المسجّل بها أولاً)
  const daySeed = Math.floor(Date.now() / 86400000)
  const unenrolled = (courses || []).filter((c:any)=>!enrollments?.some((e:any)=>e.course_id===c.id))
  const pickPool = unenrolled.length ? unenrolled : (courses || [])
  const dailyPick = pickPool.length ? pickPool[daySeed % pickPool.length] : null

  return (
    <LuxPullToRefresh onRefresh={() => {
      try {
        ;(window as any).__FIA_refreshActiveView?.()
        toast.success('تم تحديث بياناتك ✓ — نفّذت للأسفل مرة أخرى متى شئت')
      } catch {}
    }}>
    <div className="space-y-6">
      {/* ⚡ Magical hero header — تحية ملكية حسب الوقت + رتبة المتدرب (v10.3) */}
      <div className="relative overflow-hidden rounded-2xl p-6 lg:p-7 bg-gradient-to-l from-navy via-navy-light to-navy text-white shadow-xl ring-1 ring-gold/30">
        <div className="absolute inset-0 opacity-25" style={{
          backgroundImage: 'radial-gradient(circle at 12% 50%, #D4AF37 1.5px, transparent 1.5px), radial-gradient(circle at 88% 50%, white 1px, transparent 1px)',
          backgroundSize: '24px 24px, 18px 18px'
        }} />
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-gold/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-gold/10 rounded-full blur-2xl" />
        <div className="relative flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gold to-amber-500 flex items-center justify-center shadow-lg border border-white/30">
            <Sparkles className="w-7 h-7 text-navy" strokeWidth={2.2} />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-1 tracking-tight">
              {(() => { const h = new Date().getHours(); return h < 12 ? 'صباح المعرفة' : h < 17 ? 'نهار موفق' : h < 21 ? 'مساء الإنجاز' : 'طابت ليلتك' })()}، {user?.name}
            </h2>
            <p className="text-gold/80 text-sm flex items-center gap-1.5 flex-wrap">
              <span className="w-1 h-1 bg-gold rounded-full animate-pulse" />
              إليك ملخّص نشاطك في أكاديمية المستقبل الدولية
              <span className="text-gold/50 text-[11px] font-bold">• {new Date().toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
            </p>
          </div>
          {/* شارة الرتبة الملكية المصغرة */}
          <div className="hidden sm:block flex-shrink-0">
            <LuxRankBadge compact stats={rankStats} />
          </div>
        </div>
      </div>

      {/* 👑 v10.3 — شارة الرتبة الكاملة مع الطريق للرتبة التالية */}
      <LuxRankBadge stats={rankStats} />

      {/* ⚡ Magical StatCards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 fia-stagger">
        <StatCard icon={BookOpen} label="الدورات المسجّلة" value={enrollments?.length || 0} color="navy" />
        <StatCard icon={CheckCircle2} label="دورات مكتملة" value={enrollments?.filter((e:any)=>e.status==='completed'||e.status==='مكتمل').length || 0} color="green" />
        <StatCard icon={TrendingUp} label="معدل التقدم" value={`${enrollments?.length ? Math.round(enrollments.reduce((s:number, e:any)=>s+(e.progress||0), 0)/enrollments.length) : 0}%`} color="gold" />
        <StatCard icon={Award} label="الشهادات المكتسبة" value={certificates.length} color="blue" />
      </div>

      {/* 👑 v10.3 — بطاقة «أكمل من حيث توقفت» بحلقة تقدم ذهبية */}
      {contCourse && (
        <div className="relative rounded-2xl border border-gold/40 bg-gradient-to-l from-navy via-navy-light to-navy p-4 md:p-5 shadow-xl overflow-hidden">
          <div className="absolute inset-0 opacity-20 pointer-events-none" style={{
            backgroundImage: 'radial-gradient(circle at 12% 50%, #D4AF37 1.4px, transparent 1.4px)',
            backgroundSize: '22px 22px',
          }} />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-gold/15 rounded-full blur-3xl" />
          <div className="relative flex items-center gap-4">
            {/* حلقة التقدم الذهبية */}
            <div className="relative w-[72px] h-[72px] flex-shrink-0">
              <svg viewBox="0 0 72 72" className="w-full h-full -rotate-90">
                <circle cx="36" cy="36" r="30" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="6" />
                <circle
                  cx="36" cy="36" r="30" fill="none" stroke="#D4AF37" strokeWidth="6" strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 30}
                  strokeDashoffset={2 * Math.PI * 30 * (1 - Math.min(100, Math.max(0, contEnr?.progress || 0)) / 100)}
                  style={{ filter: 'drop-shadow(0 0 6px rgba(212,175,55,0.65))', transition: 'stroke-dashoffset .9s ease' }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-gold font-black text-sm tabular-nums">{Math.round(contEnr?.progress || 0)}%</span>
              </div>
            </div>
            <div className="flex-1 min-w-0 text-white">
              <div className="text-[10px] font-black text-gold uppercase tracking-widest mb-0.5">أكمل من حيث توقفت</div>
              <div className="font-black text-base md:text-lg truncate">{contCourse.title}</div>
              <div className="text-[11px] text-white/60 mt-0.5">درسك القادم ينتظرك — خطوة واحدة تفصلك عن التقدم</div>
            </div>
            <Button
              onClick={() => onViewCourse?.(contCourse)}
              className="flex-shrink-0 bg-gradient-to-r from-gold to-amber-500 hover:from-amber-500 hover:to-gold text-navy font-black rounded-xl shadow-lg active:scale-[0.97] transition-all"
            >
              أكمل الآن
            </Button>
          </div>
        </div>
      )}

      {/* 👑 v10.3 — «درس اليوم»: اقتراح ملكي ثابت طوال اليوم */}
      {dailyPick && (
        <button
          onClick={() => onViewCourse?.(dailyPick)}
          className="group relative w-full text-right rounded-2xl border border-gold/35 bg-gradient-to-br from-gold/[0.10] via-white to-gold/[0.05] p-3.5 shadow-md hover:shadow-lg hover:border-gold/60 transition-all active:scale-[0.99] overflow-hidden"
        >
          <div className="absolute top-0 right-0 left-0 h-0.5 bg-gradient-to-l from-gold via-amber-400 to-gold opacity-70" />
          <div className="flex items-center gap-3">
            <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-navy to-navy-light flex items-center justify-center flex-shrink-0 shadow-md border border-gold/30">
              <Crown className="w-5 h-5 text-gold" strokeWidth={2.2} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-black text-gold uppercase tracking-widest">درس اليوم — اختيار الأكاديمية لك</div>
              <div className="font-black text-navy text-sm truncate">{dailyPick.title}</div>
            </div>
            <span className="text-[11px] font-black text-navy bg-gold/15 border border-gold/35 rounded-full px-3 py-1.5 group-hover:bg-gold/30 transition-colors flex-shrink-0">
              اكتشفها ←
            </span>
          </div>
        </button>
      )}

      {/* ⚡ Magical progress section */}
      <SectionCard title="تقدّم الدورات" description="متابعة آخر التحديثات في دوراتك">
        <div className="space-y-4">
          {enrollments && enrollments.length > 0 ? (
            enrollments.slice(0, 3).map((e: any) => {
              const c = courses.find((x:any) => x.id === e.course_id)
              if (!c) return null
              const pct = e.progress || 0
              const isCompleted = e.status === 'completed' || e.status === 'مكتمل'
              const isPending = e.payment_status === 'pending'
              return (
                <div key={e.id} className="fia-card-hover p-3 rounded-xl border border-gold/20 hover:border-gold/40 transition-colors bg-white">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center ${isCompleted ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white' : isPending ? 'bg-gradient-to-br from-amber-400 to-yellow-500 text-navy' : 'bg-gradient-to-br from-navy to-navy-light text-gold'}`}>
                        {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : isPending ? <Clock className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
                      </div>
                      <div className="font-bold text-navy text-sm truncate">{c.title}</div>
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full flex-shrink-0 ${isCompleted ? 'bg-emerald-500/15 text-emerald-700' : isPending ? 'bg-amber-500/15 text-amber-700' : 'bg-navy/5 text-navy'}`}>{pct}%</span>
                  </div>
                  <Progress value={pct} className="h-2" />
                </div>
              )
            })
          ) : (
            /* ⚡ Magical empty state */
            <div className="text-center py-10">
              <div className="relative inline-block mb-3">
                <div className="absolute inset-0 bg-gold/20 rounded-full blur-2xl animate-pulse" />
                <div className="relative w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-navy via-navy-light to-navy flex items-center justify-center shadow-xl border border-gold/30">
                  <BookOpen className="w-8 h-8 text-gold" />
                </div>
              </div>
              <p className="text-sm font-bold text-navy mb-1">لا توجد دورات مسجّلة بعد</p>
              <p className="text-xs text-muted-foreground">تصفّح الدورات المتاحة في تبويب "استكشاف الدورات" ✨</p>
            </div>
          )}
        </div>
      </SectionCard>

      {/* ⚡ Magical recommended courses */}
      <SectionCard title="الدورات الموصى بها" description="استكشف المزيد من الدورات — اضغط للتسجيل أو فتح الدورة">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 fia-stagger">
          {courses.slice(0, 3).map((c: any) => {
            const access = getCourseAccess(c)
            const isFree = c.price_type === 'مجانية' || !Number(c.price)
            // Decide button label + action based on access state
            let btnLabel = 'عرض الدورة'
            let btnAction: () => void = () => onViewCourse?.(c)
            let btnClass = 'w-full bg-gradient-to-r from-navy to-navy-light hover:from-navy-light hover:to-navy text-gold rounded-xl shadow-md active:scale-[0.97] transition-all'
            if (access.enrollment?.payment_status === 'pending') {
              btnLabel = 'بانتظار تأكيد الدفع'
              btnClass = 'w-full bg-amber-500/20 text-amber-700 border border-amber-500/30 cursor-not-allowed rounded-xl'
              btnAction = () => toast.info('سيتم تفعيل الدورة بعد تأكيد الإدارة للدفع')
            } else if (access.reason === 'free-not-enrolled') {
              btnLabel = '✨ سجّل الآن — مجانية'
              btnClass = 'w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl shadow-md active:scale-[0.97] transition-all'
              btnAction = () => onViewCourse?.(c)
            } else if (access.reason === 'paid-not-enrolled') {
              btnLabel = '🚀 اشترك الآن'
              btnClass = 'w-full bg-gradient-to-r from-gold to-amber-500 hover:from-amber-500 hover:to-gold text-navy rounded-xl shadow-md active:scale-[0.97] transition-all'
              btnAction = () => onViewCourse?.(c)
            } else if (access.canOpen) {
              btnLabel = '↵ عرض الدورة'
              btnClass = 'w-full bg-gradient-to-r from-navy to-navy-light hover:from-navy-light hover:to-navy text-gold rounded-xl shadow-md active:scale-[0.97] transition-all'
              btnAction = () => onViewCourse?.(c)
            }
            return (
              <Card key={c.id} className="fia-course-card p-0 overflow-hidden cursor-default border border-gold/20">
                <div className="relative h-24 overflow-hidden bg-gradient-to-br from-navy via-navy-light to-navy">
                  {c.cover && (
                    <img src={c.cover} alt={c.title} loading="lazy" className="fia-cover-img absolute inset-0 w-full h-full object-cover" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/30 to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-br from-gold/10 via-transparent to-transparent" />
                  <div className="fia-shine" />
                  <Badge className={`absolute top-2 left-2 backdrop-blur-sm shadow-md ${isFree ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white border border-emerald-300/40' : 'bg-gradient-to-r from-gold to-amber-500 text-navy border border-gold/40'}`}>
                    {isFree ? 'مجانية' : `${c.price?.toLocaleString()} ${c.currency || 'ر.ي'}`}
                  </Badge>
                  {c.level && (
                    <Badge className="absolute top-2 right-2 bg-navy/80 text-gold border-gold/30 backdrop-blur-sm">{c.level}</Badge>
                  )}
                </div>
                <div className="relative p-3">
                  <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-l from-gold via-amber-400 to-gold opacity-70" />
                  <div className="font-bold text-navy text-sm mb-1 line-clamp-1">{c.title}</div>
                  <div className="text-[10px] text-muted-foreground mb-3 flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-gold/60" /> {c.duration_hours} ساعة
                  </div>
                  <Button size="sm" className={btnClass} onClick={btnAction} disabled={access.enrollment?.payment_status === 'pending'}>
                    {btnLabel}
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      </SectionCard>
    </div>
    </LuxPullToRefresh>
  )
})

const MyCourses = React.memo(function MyCourses({ courses, enrollments, onContinue, studentName }: any) {
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
        /* ⚡ Magical empty state */
        <div className="text-center py-14">
          <div className="relative inline-block mb-4">
            <div className="absolute inset-0 bg-gold/20 rounded-full blur-2xl animate-pulse" />
            <div className="relative w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-navy via-navy-light to-navy flex items-center justify-center shadow-xl border border-gold/30">
              <BookOpen className="w-10 h-10 text-gold" />
            </div>
          </div>
          <h3 className="font-bold text-navy text-base mb-1.5">لم تسجّل في أي دورة بعد</h3>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto">تصفّح الدورات المتاحة في قسم "استكشاف الدورات" ✨</p>
        </div>
      ) : (
        /* ⚡ Magical compact course cards — 2/3/4 grid */
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 fia-stagger">
          {enrolled.map((c: any) => {
            const isCompleted = c.enrollment.payment_status === 'completed' || c.enrollment.status === 'completed' || c.enrollment.status === 'مكتمل'
            const isPending = c.enrollment.payment_status === 'pending'
            const isFree = c.price_type === 'مجانية' || !Number(c.price)
            const pct = c.enrollment.progress || 0
            return (
              <Card key={c.id} className="fia-course-card p-0 overflow-hidden cursor-default border border-gold/20">
                {/* Magical header — cover + status badge */}
                <div className="relative h-28 overflow-hidden bg-gradient-to-br from-navy via-navy-light to-navy">
                  {c.cover && (
                    <img src={c.cover} alt={c.title} loading="lazy" className="fia-cover-img absolute inset-0 w-full h-full object-cover" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/40 to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-br from-gold/10 via-transparent to-transparent" />
                  <div className="fia-shine" />
                  {/* Status pill — state-aware */}
                  {isCompleted ? (
                    <Badge className="fia-status-glow absolute top-2 right-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white border border-emerald-300/40 backdrop-blur-sm shadow-md">
                      <CheckCircle2 className="w-3 h-3 ml-0.5" /> مكتملة
                    </Badge>
                  ) : isPending ? (
                    <Badge className="absolute top-2 right-2 bg-gradient-to-r from-amber-400 to-yellow-500 text-navy border border-amber-300/50 backdrop-blur-sm shadow-md">
                      <Clock className="w-3 h-3 ml-0.5" /> بانتظار
                    </Badge>
                  ) : isFree ? (
                    <Badge className="absolute top-2 right-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white border border-emerald-300/40 backdrop-blur-sm shadow-md">
                      <Gift className="w-3 h-3 ml-0.5" /> مجانية
                    </Badge>
                  ) : (
                    <Badge className="absolute top-2 right-2 bg-gradient-to-r from-gold to-amber-500 text-navy border border-gold/40 backdrop-blur-sm shadow-md">
                      نشطة
                    </Badge>
                  )}
                  {c.level && (
                    <Badge className="absolute bottom-2 right-2 bg-navy/80 text-gold border-gold/30 backdrop-blur-sm text-[10px]">{c.level}</Badge>
                  )}
                </div>
                {/* Magical body */}
                <div className="relative p-3">
                  <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-l from-gold via-amber-400 to-gold opacity-70" />
                  <h3 className="font-bold text-navy text-xs mb-2 line-clamp-1">{c.title}</h3>
                  {/* Progress with magical gradient */}
                  <div className="space-y-1 mb-2">
                    <div className="flex justify-between text-[9px] text-muted-foreground">
                      <span>التقدّم</span>
                      <span className="font-bold text-navy">{pct}%</span>
                    </div>
                    <Progress value={pct} className="h-1.5" />
                  </div>
                  {/* Meta row */}
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-2 pb-2 border-b border-border/40">
                    <span className="flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5 text-gold/60" /> {c.duration_hours || 0} ساعة
                    </span>
                    {isCompleted && <span className="text-emerald-600 font-bold flex items-center gap-0.5"><Award className="w-2.5 h-2.5" /> مكتملة</span>}
                  </div>
                  {/* Actions */}
                  {c.enrollment.payment_status === 'pending' ? (
                    <Button size="sm" variant="outline" disabled className="w-full h-8 text-[10px] rounded-lg border-amber-500/30 text-amber-700 bg-amber-500/5">
                      <Clock className="w-3 h-3 ml-1" /> بانتظار تأكيد الدفع
                    </Button>
                  ) : c.enrollment.payment_status === 'completed' || isCompleted ? (
                    <div className="space-y-1.5">
                      <Button size="sm" variant="outline" className="w-full h-8 text-[10px] rounded-lg border-emerald-500/30 text-emerald-700 hover:bg-emerald-500/5">
                        <CheckCircle2 className="w-3 h-3 ml-1" /> دورة مكتملة
                      </Button>
                      <Button size="sm" variant="outline" className="w-full h-8 text-[10px] rounded-lg border-gold/30 text-navy hover:bg-gold/5" onClick={() => onContinue(c, c.enrollment)}>
                        <BookOpen className="w-3 h-3 ml-1" /> مراجعة
                      </Button>
                    </div>
                  ) : (
                    <Button size="sm" className="w-full h-8 text-[10px] rounded-lg bg-gradient-to-r from-gold to-amber-500 hover:from-amber-500 hover:to-gold text-navy shadow-md active:scale-[0.97] transition-all" onClick={() => onContinue(c, c.enrollment)}>
                      <PlayCircle className="w-3 h-3 ml-1" /> متابعة التعلّم
                    </Button>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </SectionCard>
  )
})

const BrowseCourses = React.memo(function BrowseCourses({ courses, enrollments, userId, onEnrolled, onViewCourse, initialCourse, onInitialCourseConsumed, setPayments, setEnrollments }: any) {
  const [paymentMethods, setPaymentMethods] = useState<any[]>([])
  const [payDialog, setPayDialog] = useState<{ course: any; open: boolean } | null>(null)
  const [enrolling, setEnrolling] = useState<string | null>(null)
  // ⚡ Royal countdown heartbeat — the limited-time offer timer ticks every 30s
  const [offerNow, setOfferNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setOfferNow(Date.now()), 30000)
    return () => clearInterval(t)
  }, [])

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
    const isFree = c.price_type === 'مجانية' || !Number(c.price)
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
    const isFree = c.price_type === 'مجانية' || !Number(c.price)
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
                const isFree = c.price_type === 'مجانية' || !Number(c.price)
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
                  remainingMs = expiry - offerNow
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
          const isFree = c.price_type === 'مجانية' || !Number(c.price)
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
})

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
              {(!methods || methods.length === 0) && (
                <div className="p-5 rounded-2xl border-2 border-dashed border-gold/30 bg-gradient-to-br from-gold/5 to-amber-50/30 text-center space-y-2">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-br from-gold/20 to-amber-100/50 flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-gold" />
                  </div>
                  <p className="text-sm font-bold text-navy">لا توجد طرق دفع مفعّلة حالياً</p>
                  <p className="text-xs text-muted-foreground">تُضاف طرق الدفع قريباً — تواصل مع إدارة الأكاديمية لإتمام الاشتراك</p>
                </div>
              )}
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

          {/* ⚡ Royal transfer reference — helps admin verify faster */}
          <div>
            <Label className="text-navy font-bold text-sm">رقم الحوالة / المرجع (إن وجد)</Label>
            <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="مثال: 881234567" dir="ltr" className="mt-1.5 h-11 rounded-xl font-mono text-sm border-gold/25 focus:border-gold focus:ring-gold/25" />
            <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-gold" />
              كتابة رقم الحوالة تُسرّع تأكيد دفعتك من الإدارة
            </p>
          </div>

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

// ============================================================================
// TRAINERS — ROYAL v4.2: magical trainers section with a follow system.
// Students browse every trainer (avatar, title, specialization, bio, stats),
// see his courses, FOLLOW him and receive instant notifications whenever he
// publishes a new course or lesson. Filter tabs: all / followed.
// ============================================================================
function Trainers({ userId, onViewCourse }: any) {
  const [trainers, setTrainers] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [follows, setFollows] = useState<any[]>([])
  const [followerCounts, setFollowerCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'all' | 'following'>('all')
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  const load = async () => {
    try {
      const [trRes, coRes, countsRes] = await Promise.all([
        fetch('/api/trainers').then((r) => r.json()).catch(() => []),
        fetch('/api/courses').then((r) => r.json()).catch(() => []),
        fetch('/api/trainer-follows').then((r) => r.json()).catch(() => ({})),
      ])
      setTrainers(Array.isArray(trRes) ? trRes : [])
      setCourses(Array.isArray(coRes) ? coRes : [])
      if (countsRes && !Array.isArray(countsRes)) setFollowerCounts(countsRes)
      if (userId) {
        const f = await fetch(`/api/trainer-follows?user_id=${userId}`).then((r) => r.json()).catch(() => [])
        setFollows(Array.isArray(f) ? f : [])
      }
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [userId])

  // ⚡ REAL-TIME: follower counts update live (magic)
  useEffect(() => {
    let channel: any
    try {
      channel = supabasePublic
        .channel('trainer-follows-royal')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'trainer_follows' }, () => { load() })
        .subscribe()
    } catch {}
    return () => { try { supabasePublic.removeChannel(channel) } catch {} }
  }, [])

  const followingIds = new Set(follows.map((f: any) => f.trainer_id))
  const isFollowing = (id: string) => followingIds.has(id)

  const toggleFollow = async (t: any) => {
    if (!userId || busy) return
    setBusy(t.id)
    try {
      const wasFollowing = isFollowing(t.id)
      if (wasFollowing) {
        setFollows((prev) => prev.filter((f: any) => f.trainer_id !== t.id))
        setFollowerCounts((c) => ({ ...c, [t.id]: Math.max(0, (c[t.id] || 1) - 1) }))
        await fetch('/api/trainer-follows', {
          method: 'DELETE', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ follower_id: userId, trainer_id: t.id }),
        })
        toast.success(`ألغيت متابعة ${t.name}`)
      } else {
        setFollows((prev) => [...prev, { trainer_id: t.id, trainer: t }])
        setFollowerCounts((c) => ({ ...c, [t.id]: (c[t.id] || 0) + 1 }))
        const res = await fetch('/api/trainer-follows', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ follower_id: userId, trainer_id: t.id }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) { toast.error(data.error || 'تعذر المتابعة'); setFollows((prev) => prev.filter((f: any) => f.trainer_id !== t.id)) }
        else toast.success(`👑 أصبحت تتابع ${t.name} — ستصلك إشعارات دوراته ودروسه الجديدة`)
      }
    } finally { setBusy(null) }
  }

  const filtered = trainers
    .filter((t) => (tab === 'following' ? followingIds.has(t.id) : true))
    .filter((t) => !query.trim() || (t.name || '').includes(query.trim()) || (t.specialization || '').includes(query.trim()) || (t.title || '').includes(query.trim()))

  const coursesOf = (t: any) => courses.filter((c: any) => c.trainer_id === t.id)
  const totalFollowers = Object.values(followerCounts).reduce((a, b) => a + (b || 0), 0)

  return (
    <SectionCard title="المدربون" description="تابع نخبة المدربين الخبراء — وستصلك إشعارات فورية بكل دورة أو درس جديد ينشرونه">
      {loading ? (
        <RoyalGridSkeleton count={3} />
      ) : (
        <>
          {/* ⚡ Magical hero — follow stats */}
          <div className="relative overflow-hidden rounded-2xl p-5 mb-5 bg-gradient-to-l from-navy via-navy-light to-navy text-white shadow-xl ring-1 ring-gold/30">
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 15% 50%, #D4AF37 1.5px, transparent 1.5px), radial-gradient(circle at 85% 50%, white 1px, transparent 1px)', backgroundSize: '22px 22px, 16px 16px' }} />
            <div className="absolute -top-10 -left-10 w-36 h-36 bg-gold/15 rounded-full blur-3xl" />
            <div className="relative flex items-center gap-4 flex-wrap">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gold to-amber-500 flex items-center justify-center shadow-lg border border-white/30">
                <GraduationCap className="w-6 h-6 text-navy" strokeWidth={2.2} />
              </div>
              <div className="flex-1 min-w-[200px]">
                <h3 className="text-lg font-extrabold mb-0.5">نخبة مدربي الأكاديمية</h3>
                <p className="text-gold/80 text-xs">تابع مدربك المفضل وتابع إبداعاته لحظة بلحظة ✨</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 px-3.5 py-2 text-center">
                  <div className="text-lg font-extrabold text-gold tabular-nums" dir="ltr">{trainers.length}</div>
                  <div className="text-[9px] text-white/70 font-bold">مدرب خبير</div>
                </div>
                <div className="rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 px-3.5 py-2 text-center">
                  <div className="text-lg font-extrabold text-gold tabular-nums" dir="ltr">{follows.length}</div>
                  <div className="text-[9px] text-white/70 font-bold">أتابعهم</div>
                </div>
                <div className="rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 px-3.5 py-2 text-center">
                  <div className="text-lg font-extrabold text-gold tabular-nums" dir="ltr">{totalFollowers}</div>
                  <div className="text-[9px] text-white/70 font-bold">متابعة في الأكاديمية</div>
                </div>
              </div>
            </div>
          </div>

          {/* Filter tabs + search */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <div className="flex rounded-xl border border-gold/25 overflow-hidden bg-white">
              <button onClick={() => setTab('all')} className={`px-4 py-2 text-[11px] font-extrabold transition-all ${tab === 'all' ? 'bg-gradient-to-br from-navy to-navy-light text-gold' : 'text-muted-foreground hover:bg-gold/5'}`}>
                جميع المدربين
              </button>
              <button onClick={() => setTab('following')} className={`px-4 py-2 text-[11px] font-extrabold transition-all flex items-center gap-1 ${tab === 'following' ? 'bg-gradient-to-br from-gold to-amber-500 text-navy' : 'text-muted-foreground hover:bg-gold/5'}`}>
                <HeartHandshake className="w-3.5 h-3.5" /> من أتابعهم ({follows.length})
              </button>
            </div>
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث بالاسم أو التخصص..." className="pr-9 h-9 rounded-xl border-gold/25 text-xs" />
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>{tab === 'following' ? 'لم تتابع أي مدرب بعد — تصفح القائمة واضغط «متابعة» ✨' : 'لا يوجد مدربون مطابقون لبحثك'}</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4 fia-stagger">
              {filtered.map((t) => {
                const tcourses = coursesOf(t)
                const following = isFollowing(t.id)
                const fCount = followerCounts[t.id] || 0
                const isOpen = expanded === t.id
                return (
                  <Card key={t.id} className="fia-card-hover overflow-hidden p-0 border border-gold/25 hover:border-gold/50 relative">
                    {/* Cover strip */}
                    <div className="h-14 bg-gradient-to-l from-navy via-navy-light to-navy relative">
                      <div className="absolute inset-0 opacity-25" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #D4AF37 1px, transparent 1px)', backgroundSize: '14px 14px' }} />
                      {following && (
                        <span className="absolute top-2 left-2 text-[9px] font-extrabold text-navy bg-gradient-to-r from-gold to-amber-500 rounded-full px-2 py-0.5 shadow-md flex items-center gap-1">
                          <BadgeCheck className="w-3 h-3" /> تتابعه
                        </span>
                      )}
                    </div>
                    <div className="p-4 pt-0 relative">
                      {/* Avatar overlapping the cover */}
                      <div className="-mt-8 mb-2 flex items-end justify-between">
                        <div className="relative">
                          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gold to-amber-500 p-[3px] shadow-lg">
                            <div className="w-full h-full rounded-2xl bg-navy flex items-center justify-center overflow-hidden">
                              {t.avatar ? (
                                <img src={t.avatar} alt={t.name} className="w-full h-full object-cover rounded-2xl" />
                              ) : (
                                <span className="text-gold font-extrabold text-xl">{(t.name || '؟').charAt(0)}</span>
                              )}
                            </div>
                          </div>
                          <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-gradient-to-br from-gold to-amber-500 border-2 border-white flex items-center justify-center shadow-sm">
                            <Crown className="w-3 h-3 text-navy" />
                          </span>
                        </div>
                        {/* Follow button — royal magnetic */}
                        <button onClick={() => toggleFollow(t)} disabled={busy === t.id || !userId}
                          className={`h-9 px-4 rounded-xl text-[11px] font-extrabold shadow-md active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-60 ${
                            following
                              ? 'bg-white border-2 border-gold/50 text-navy hover:bg-gold/10'
                              : 'bg-gradient-to-r from-gold to-amber-500 text-navy hover:from-amber-500 hover:to-gold hover:shadow-lg'
                          }`}>
                          {busy === t.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : following ? <CheckCircle2 className="w-3.5 h-3.5" /> : <HeartHandshake className="w-3.5 h-3.5" />}
                          {following ? 'إلغاء المتابعة' : 'متابعة'}
                        </button>
                      </div>

                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="font-extrabold text-navy text-sm truncate">{t.name}</h4>
                          <p className="text-[10px] text-gold font-bold truncate">{t.title || 'مدرب معتمد'}</p>
                        </div>
                      </div>
                      {t.specialization && (
                        <span className="inline-block mt-1.5 text-[9px] font-bold text-emerald-700 bg-emerald-500/10 border border-emerald-500/25 rounded-full px-2.5 py-0.5">{t.specialization}</span>
                      )}
                      {t.bio && <p className="text-[10px] text-muted-foreground leading-relaxed mt-2 line-clamp-2">{String(t.bio).replace(/\n+/g, ' · ')}</p>}

                      {/* Stats row */}
                      <div className="grid grid-cols-3 gap-2 mt-3">
                        <div className="rounded-lg bg-gold/[0.07] border border-gold/20 py-1.5 text-center">
                          <div className="text-sm font-extrabold text-navy tabular-nums" dir="ltr">{tcourses.length}</div>
                          <div className="text-[8px] text-muted-foreground font-bold">دورات</div>
                        </div>
                        <div className="rounded-lg bg-gold/[0.07] border border-gold/20 py-1.5 text-center">
                          <div className="text-sm font-extrabold text-navy tabular-nums" dir="ltr">{fCount}</div>
                          <div className="text-[8px] text-muted-foreground font-bold">متابع</div>
                        </div>
                        <div className="rounded-lg bg-gold/[0.07] border border-gold/20 py-1.5 text-center">
                          <div className="text-sm font-extrabold text-navy tabular-nums" dir="ltr">{t.years_experience || 0}</div>
                          <div className="text-[8px] text-muted-foreground font-bold">سنة خبرة</div>
                        </div>
                      </div>

                      {/* Courses preview / expandable list */}
                      {tcourses.length > 0 && (
                        <button onClick={() => setExpanded(isOpen ? null : t.id)}
                          className="w-full mt-3 flex items-center justify-between rounded-xl border border-gold/25 bg-gradient-to-l from-gold/[0.06] to-transparent px-3 py-2 hover:bg-gold/10 transition-all">
                          <span className="text-[10px] font-extrabold text-navy flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5 text-gold" /> دورات المدرب ({tcourses.length})
                          </span>
                          <span className={`text-[10px] text-gold transition-transform ${isOpen ? 'rotate-180' : ''}`}>▾</span>
                        </button>
                      )}
                      {isOpen && (
                        <div className="mt-2 space-y-1.5">
                          {tcourses.map((c: any) => (
                            <button key={c.id} onClick={() => onViewCourse?.(c)}
                              className="w-full text-right rounded-lg border border-border/60 bg-white hover:border-gold/40 hover:bg-gold/[0.04] px-3 py-2 flex items-center justify-between gap-2 transition-all">
                              <div className="min-w-0">
                                <div className="text-[11px] font-bold text-navy truncate">{c.title}</div>
                                <div className="text-[9px] text-muted-foreground">{c.category || '—'} · {c.level || ''}</div>
                              </div>
                              <span className={`text-[9px] font-extrabold rounded-full px-2 py-0.5 flex-shrink-0 ${c.price_type === 'مجانية' || Number(c.price) === 0 ? 'bg-emerald-500/12 text-emerald-700' : 'bg-gold/15 text-amber-700'}`}>
                                {c.price_type === 'مجانية' || Number(c.price) === 0 ? 'مجانية' : `${Number(c.price).toLocaleString()} ${c.currency || 'ر.ي'}`}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </>
      )}
    </SectionCard>
  )
}

function Exams({ userId, courses }: any) {
  // ============================================================================
  // اختباراتي — v4 royal: مرتبطة مباشرة ببنك الأسئلة
  // لكل دورة مسجّل فيها المتدرب (والمؤكد دفعها) تظهر بطاقة اختبار واحدة تجمع
  // أسئلة بنك الأسئلة الخاصة بالدورة. لا تظهر أي دورة غير مسجّل فيها.
  // ============================================================================
  const router = useRouter()
  const [exams, setExams] = useState<any[]>([])
  const [attempts, setAttempts] = useState<any[]>([])
  const [retakes, setRetakes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState<string | null>(null)
  const [retakeDialogCourse, setRetakeDialogCourse] = useState<any>(null)

  const load = async () => {
    if (!userId) { setLoading(false); return }
    try {
      // 1) The student's own enrollments — ONLY courses he is actually enrolled in
      const enrRes = await fetch(`/api/enrollments?user_id=${userId}`)
      const enrollments = await enrRes.json()
      const validEnrollments: any[] = Array.isArray(enrollments) ? enrollments : []
      const accessible = validEnrollments.filter((e: any) => e.payment_status !== 'pending')

      // 2) All attempts of this student (for status + best score)
      const attRes = await fetch(`/api/exam-attempts?user_id=${userId}`)
      const attData = await attRes.json()
      setAttempts(Array.isArray(attData) ? attData : [])

      // 2.5) Paid-retake requests (status: pending review / approved)
      fetch(`/api/exam-retake?user_id=${userId}`).then((r) => r.json()).then((d) => {
        setRetakes(Array.isArray(d) ? d : [])
      }).catch(() => setRetakes([]))

      // 3) For each enrolled course → the course's active question bank size
      const results = await Promise.all(
        accessible.map(async (e: any) => {
          try {
            const qRes = await fetch(`/api/exam-questions?course_id=${e.course_id}`)
            const questions = await qRes.json()
            const qs = Array.isArray(questions) ? questions : []
            if (qs.length === 0) return null // course has no exam bank yet
            const courseTitle = courses?.find((c: any) => c.id === e.course_id)?.title || null
            const coursePass = courses?.find((c: any) => c.id === e.course_id)?.pass_score || 60
            return {
              course_id: e.course_id,
              course_title: courseTitle,
              pass_score: coursePass,
              enrollment_id: e.id,
              questions_count: qs.length,
              total_points: qs.reduce((a: number, q: any) => a + (parseInt(q.points) || 0), 0),
            }
          } catch { return null }
        })
      )
      setExams(results.filter(Boolean))
    } catch { setExams([]) } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [userId, courses])

  // ⚡ REAL-TIME: when an attempt is graded (server PUT), the student's cards
  // update instantly without any refresh.
  useEffect(() => {
    if (!userId) return
    let channel: any
    try {
      channel = supabasePublic
        .channel(`exam-attempts-student:${userId}`)
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'exam_attempts', filter: `user_id=eq.${userId}` },
          () => { load() }
        )
        .subscribe()
    } catch {}
    return () => { try { supabasePublic.removeChannel(channel) } catch {} }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, courses])

  // Best submitted attempt per course
  const bestFor = (courseId: string) => {
    const mine = attempts.filter((a: any) => a.course_id === courseId && a.submitted_at)
    if (mine.length === 0) return null
    return mine.reduce((best: any, a: any) => ((a.score || 0) > (best?.score ?? -1) ? a : best), null)
  }
  // An open (unsubmitted) attempt — lets the student resume
  const openFor = (courseId: string) =>
    attempts.find((a: any) => a.course_id === courseId && !a.submitted_at)

  // Paid-retake status helpers (server enforces authoritatively — this is UX only)
  const pendingRetakeFor = (courseId: string) =>
    retakes.find((r: any) => r.course_id === courseId && r.status === 'قيد الانتظار')
  const approvedRetakeFor = (courseId: string) =>
    retakes.find((r: any) => r.course_id === courseId && r.status === 'مكتمل' && !(r.reference || '').includes('__USED__'))

  const startExam = async (courseId: string) => {
    if (!userId) return
    setStarting(courseId)
    try {
      // Resume an open attempt if it exists — otherwise the server creates one
      const open = openFor(courseId)
      let attemptId = open?.id
      if (!attemptId) {
        const res = await fetch('/api/exam-attempts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId, course_id: courseId }),
        })
        const data = await res.json()
        if (!res.ok) { toast.error(data.error || 'تعذر بدء الاختبار'); return }
        attemptId = data.id
      }
      router.push(`/exam/${attemptId}`)
    } finally { setStarting(null) }
  }

  return (
    <SectionCard title="اختباراتي" description="اختبارات بنك الأسئلة لدوراتك المسجّلة فقط — أكمل اختبار الدورة لتصبح مؤهلاً للشهادة">
      {loading ? (
        <div className="text-center py-14">
          <div className="relative inline-block mb-3">
            <div className="absolute inset-0 bg-gold/20 rounded-full blur-2xl animate-pulse" />
            <Loader2 className="relative w-10 h-10 mx-auto animate-spin text-gold" />
          </div>
          <p className="text-sm text-muted-foreground">جاري تحميل الاختبارات...</p>
        </div>
      ) : exams.length === 0 ? (
        <div className="text-center py-14">
          <div className="relative inline-block mb-4">
            <div className="absolute inset-0 bg-gold/20 rounded-full blur-2xl animate-pulse" />
            <div className="relative w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-navy via-navy-light to-navy flex items-center justify-center shadow-xl border border-gold/30">
              <FileText className="w-10 h-10 text-gold" />
            </div>
          </div>
          <h3 className="font-bold text-navy text-base mb-1.5">لا توجد اختبارات متاحة لك حالياً</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            تظهر هنا اختبارات الدورات التي تسجّل فيها فقط، متى أضاف المدرب أو الإدارة بنك أسئلة الدورة ✨
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 fia-stagger">
          {exams.map((exam: any) => {
            const best = bestFor(exam.course_id)
            const open = openFor(exam.course_id)
            const passed = best?.passed === true
            const courseObj = courses?.find((c: any) => c.id === exam.course_id)
            const retakeFee = Number(courseObj?.retake_fee) || 0
            const examDuration = Number(courseObj?.exam_duration_minutes) || 0
            const pendingRetake = pendingRetakeFor(exam.course_id)
            const approvedRetake = approvedRetakeFor(exam.course_id)
            // ROYAL v4.2 — retake budget: 1 initial attempt + max_retakes.
            // When the budget is exhausted without EVER passing → permanent
            // failure ("لم تتوفّق في هذه الدورة أبداً").
            const mySubmitted = attempts.filter((a: any) => a.course_id === exam.course_id && a.submitted_at)
            const everPassed = mySubmitted.some((a: any) => a.passed === true)
            const maxRetakesRaw = Number(courseObj?.max_retakes)
            const maxRetakes = Number.isFinite(maxRetakesRaw) ? Math.max(0, maxRetakesRaw) : 2
            const attemptBudget = 1 + maxRetakes
            const exhausted = !everPassed && mySubmitted.length >= attemptBudget
            const statusTone = passed ? 'from-emerald-500 to-teal-600' : exhausted ? 'from-slate-800 via-slate-900 to-black' : best ? 'from-rose-500 to-red-600' : 'from-purple-600 via-purple-700 to-fuchsia-700'
            const statusLabel = passed ? 'ناجح ✓' : exhausted ? 'فشل نهائي' : best ? `راسب — ${best.score}%` : open ? 'محاولة مفتوحة' : 'لم تبدأ بعد'
            return (
              <Card key={exam.course_id} className="fia-card-hover p-0 overflow-hidden border border-gold/20 hover:border-gold/40">
                {/* Header — state-aware gradient */}
                <div className={`relative p-3 bg-gradient-to-br ${statusTone} text-white overflow-hidden`}>
                  <div className="absolute inset-0 opacity-20" style={{
                    backgroundImage: 'radial-gradient(circle at 20% 20%, white 1px, transparent 1px)',
                    backgroundSize: '12px 12px'
                  }} />
                  <div className="absolute -top-4 -right-4 w-12 h-12 bg-white/15 rounded-full blur-xl" />
                  <div className="relative">
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-9 h-9 rounded-lg bg-white/15 backdrop-blur-sm border border-white/30 flex items-center justify-center shadow-md">
                        {passed ? <CheckCircle2 className="w-5 h-5 text-white" /> : <FileText className="w-5 h-5 text-white" />}
                      </div>
                      <div className="flex items-center gap-1">
                        {examDuration > 0 && (
                          <Badge className="bg-white/15 text-white border border-white/30 backdrop-blur-sm text-[10px]">
                            <Timer className="w-2.5 h-2.5 ml-0.5" /> {examDuration} د
                          </Badge>
                        )}
                        <Badge className="bg-white/15 text-white border border-white/30 backdrop-blur-sm text-[10px]">
                          <HelpCircle className="w-2.5 h-2.5 ml-0.5" /> {exam.questions_count} سؤال
                        </Badge>
                      </div>
                    </div>
                    <h3 className="font-bold text-white text-xs line-clamp-2 leading-tight">{exam.course_title || 'اختبار الدورة'}</h3>
                  </div>
                </div>

                {/* Body */}
                <div className="p-3 space-y-2">
                  {/* Best result */}
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="text-[9px] text-muted-foreground">حالتك</div>
                    <span className={`text-[10px] font-extrabold rounded-md px-2 py-0.5 ${
                      passed ? 'bg-emerald-500/15 text-emerald-700' : best ? 'bg-rose-500/15 text-rose-600' : 'bg-muted text-muted-foreground'
                    }`}>{statusLabel}</span>
                  </div>
                  {best && (
                    <div className="flex items-center justify-between pt-1 border-t border-border/40">
                      <div className="text-[9px] text-muted-foreground">أفضل نتيجة</div>
                      <div className={`text-sm font-extrabold ${passed ? 'text-emerald-600' : 'text-rose-500'}`}>{best.score}%</div>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-1 border-t border-border/40">
                    <div className="text-[9px] text-muted-foreground">حد النجاح</div>
                    <div className="text-[10px] font-bold text-navy">{exam.pass_score}%</div>
                  </div>

                  {/* ROYAL v4.2 — attempts progress chip */}
                  {mySubmitted.length > 0 && (
                    <div className="flex items-center justify-between pt-1 border-t border-border/40">
                      <div className="text-[9px] text-muted-foreground">المحاولات</div>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: attemptBudget }).map((_, i) => (
                          <span key={i} className={`w-2 h-2 rounded-full ${i < mySubmitted.length ? 'bg-rose-500' : 'bg-emerald-500/60'}`} title={i < mySubmitted.length ? 'مستهلكة' : 'متاحة'} />
                        ))}
                        <span className="text-[9px] font-extrabold text-muted-foreground mr-1" dir="ltr">{mySubmitted.length}/{attemptBudget}</span>
                      </div>
                    </div>
                  )}

                  {/* Action — ROYAL v4.2: paid retakes + budget cap */}
                  {exhausted ? (
                    <div className="w-full h-9 rounded-lg bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-rose-500/40 flex flex-col items-center justify-center px-2">
                      <span className="text-[10px] font-extrabold text-rose-400 flex items-center gap-1"><Ban className="w-3 h-3" /> لم تتوفّق في هذه الدورة أبداً</span>
                      <span className="text-[8px] text-slate-400">انتهت جميع المحاولات — القرار نهائي</span>
                    </div>
                  ) : passed ? (
                    <Button size="sm" className="w-full h-8 text-[10px] rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-md active:scale-[0.97] transition-all"
                      onClick={() => router.push('/#certificates')}>
                      <Award className="w-3 h-3 ml-1" /> اطلب شهادتك الآن
                    </Button>
                  ) : open ? (
                    <Button size="sm" disabled={starting === exam.course_id}
                      className="w-full h-8 text-[10px] rounded-lg bg-gradient-to-r from-purple-600 to-fuchsia-700 hover:from-purple-700 hover:to-fuchsia-800 text-white shadow-md active:scale-[0.97] transition-all"
                      onClick={() => startExam(exam.course_id)}>
                      {starting === exam.course_id ? <Loader2 className="w-3 h-3 ml-1 animate-spin" /> : <Sparkles className="w-3 h-3 ml-1" />}
                      أكمل محاولتك
                    </Button>
                  ) : best ? (
                    approvedRetake ? (
                      <Button size="sm" disabled={starting === exam.course_id}
                        className="w-full h-8 text-[10px] rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-md active:scale-[0.97] transition-all"
                        onClick={() => startExam(exam.course_id)}>
                        {starting === exam.course_id ? <Loader2 className="w-3 h-3 ml-1 animate-spin" /> : <Sparkles className="w-3 h-3 ml-1" />}
                        ابدأ محاولتك الجديدة ✓
                      </Button>
                    ) : pendingRetake ? (
                      <Button size="sm" disabled className="w-full h-8 text-[10px] rounded-lg bg-amber-500/15 text-amber-700 border border-amber-500/30 cursor-not-allowed">
                        <Hourglass className="w-3 h-3 ml-1 animate-pulse" /> طلب الإعادة قيد المراجعة
                      </Button>
                    ) : (
                      /* ALWAYS opens the royal retake dialog — even when the fee
                         isn't configured yet (the admin sets it at review time) */
                      <Button size="sm"
                        className="w-full h-8 text-[10px] rounded-lg bg-gradient-to-r from-purple-600 to-fuchsia-700 hover:from-purple-700 hover:to-fuchsia-800 text-white shadow-md active:scale-[0.97] transition-all"
                        onClick={() => setRetakeDialogCourse(courseObj)}>
                        <RefreshCw className="w-3 h-3 ml-1" />
                        {retakeFee > 0
                          ? `إعادة الاختبار — رسوم ${retakeFee.toLocaleString()} ${courseObj?.currency || 'ر.ي'}`
                          : 'إعادة الاختبار — سداد الرسوم'}
                      </Button>
                    )
                  ) : (
                    <Button size="sm" disabled={starting === exam.course_id}
                      className="w-full h-8 text-[10px] rounded-lg bg-gradient-to-r from-purple-600 to-fuchsia-700 hover:from-purple-700 hover:to-fuchsia-800 text-white shadow-md active:scale-[0.97] transition-all"
                      onClick={() => startExam(exam.course_id)}>
                      {starting === exam.course_id ? <Loader2 className="w-3 h-3 ml-1 animate-spin" /> : <Sparkles className="w-3 h-3 ml-1" />}
                      ابدأ الاختبار
                    </Button>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* ⚡ Paid retake dialog — fee + payment methods + proof upload */}
      <ExamRetakeDialog
        open={!!retakeDialogCourse}
        onOpenChange={(o: boolean) => { if (!o) setRetakeDialogCourse(null) }}
        course={retakeDialogCourse}
        userId={userId}
        onRequested={() => {
          setRetakeDialogCourse(null)
          load()
        }}
      />
    </SectionCard>
  )
}

function Results({ courses }: any) {
  // ============================================================================
  // نتائجي — v4 royal: نتائج حقيقية من exam_attempts + تصحيحات المدرب
  // ============================================================================
  const router = useRouter()
  const user = useAuth((s: any) => s.user)
  const [attempts, setAttempts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    if (!user?.id) { setLoading(false); return }
    fetch(`/api/exam-attempts?user_id=${user.id}&submitted=1`)
      .then((r) => r.json())
      .then((d) => setAttempts(Array.isArray(d) ? d : []))
      .catch(() => setAttempts([]))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [user?.id])

  // ⚡ REAL-TIME: instant result updates (auto-grade or trainer correction)
  useEffect(() => {
    if (!user?.id) return
    let channel: any
    try {
      channel = supabasePublic
        .channel(`exam-results-student:${user.id}`)
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'exam_attempts', filter: `user_id=eq.${user.id}` },
          () => { load() }
        )
        .subscribe()
    } catch {}
    return () => { try { supabasePublic.removeChannel(channel) } catch {} }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const reviewOf = (a: any) => { try { return a?.answers?.__review__ || null } catch { return null } }
  const courseTitle = (id: string) => courses?.find((c: any) => c.id === id)?.title || 'دورة'
  const coursePass = (id: string) => courses?.find((c: any) => c.id === id)?.pass_score || 60
  // ROYAL v4.2 — permanent-failure detection per course (budget exhausted, never passed)
  const exhaustedFor = (courseId: string) => {
    const mine = attempts.filter((x: any) => x.course_id === courseId)
    const courseObj = courses?.find((c: any) => c.id === courseId)
    const m = Number(courseObj?.max_retakes)
    const budget = 1 + (Number.isFinite(m) ? Math.max(0, m) : 2)
    return mine.length >= budget && !mine.some((x: any) => x.passed === true)
  }

  // Best attempt per course (dedupe attempts of the same course)
  const bestByCourse: any[] = []
  for (const a of attempts) {
    const existing = bestByCourse.find((b) => b.course_id === a.course_id)
    if (!existing || (a.score || 0) > (existing.score || 0)) {
      const idx = bestByCourse.findIndex((b) => b.course_id === a.course_id)
      if (idx >= 0) bestByCourse[idx] = a; else bestByCourse.push(a)
    }
  }
  const passedCount = bestByCourse.filter((a) => a.passed).length
  const avg = bestByCourse.length > 0 ? Math.round(bestByCourse.reduce((acc, a) => acc + (a.score || 0), 0) / bestByCourse.length) : 0

  return (
    <SectionCard title="نتائجي" description="نتائج اختبارات بنك الأسئلة لدوراتك — مع تصحيحات المدرب النهائية">
      {loading ? (
        <div className="text-center py-14">
          <div className="relative inline-block mb-3">
            <div className="absolute inset-0 bg-gold/20 rounded-full blur-2xl animate-pulse" />
            <Loader2 className="relative w-10 h-10 mx-auto animate-spin text-gold" />
          </div>
          <p className="text-sm text-muted-foreground">جاري تحميل النتائج...</p>
        </div>
      ) : bestByCourse.length === 0 ? (
        <div className="text-center py-14">
          <div className="relative inline-block mb-4">
            <div className="absolute inset-0 bg-gold/20 rounded-full blur-2xl animate-pulse" />
            <div className="relative w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-navy via-navy-light to-navy flex items-center justify-center shadow-xl border border-gold/30">
              <TrendingUp className="w-10 h-10 text-gold" />
            </div>
          </div>
          <h3 className="font-bold text-navy text-base mb-1.5">لا توجد نتائج بعد</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            أكمل اختبار إحدى دوراتك من قسم «اختباراتي» وستظهر نتيجتك هنا فوراً بعد التصحيح التلقائي ✨
          </p>
          <Button size="sm" className="mt-4 bg-gradient-to-r from-purple-600 to-fuchsia-700 hover:from-purple-700 hover:to-fuchsia-800 text-white rounded-xl shadow-md"
            onClick={() => router.push('/#exams')}>
            <FileText className="w-3.5 h-3.5 ml-1" /> الذهاب إلى اختباراتي
          </Button>
        </div>
      ) : (
        <>
          {/* Summary strip */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="rounded-xl border border-gold/25 bg-gradient-to-b from-gold/[0.08] to-transparent p-3 text-center">
              <div className="text-[10px] font-bold text-muted-foreground">دورات مجتازة</div>
              <div className="text-2xl font-extrabold text-emerald-600 tabular-nums">{passedCount}<span className="text-sm text-muted-foreground">/{bestByCourse.length}</span></div>
            </div>
            <div className="rounded-xl border border-gold/25 bg-gradient-to-b from-gold/[0.08] to-transparent p-3 text-center">
              <div className="text-[10px] font-bold text-muted-foreground">معدل النتائج</div>
              <div className="text-2xl font-extrabold text-navy tabular-nums">{avg}%</div>
            </div>
            <div className="rounded-xl border border-gold/25 bg-gradient-to-b from-gold/[0.08] to-transparent p-3 text-center">
              <div className="text-[10px] font-bold text-muted-foreground">مؤهل للشهادة</div>
              <div className={`text-2xl font-extrabold tabular-nums ${passedCount === bestByCourse.length ? 'text-gold' : 'text-muted-foreground'}`}>{passedCount === bestByCourse.length ? 'نعم ✓' : 'لا'}</div>
            </div>
          </div>

          {/* Result cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 fia-stagger">
            {bestByCourse.map((a) => {
              const review = reviewOf(a)
              return (
                <Card key={a.id} className="fia-card-hover p-4 border border-gold/25 relative overflow-hidden">
                  <div className={`absolute top-0 right-0 left-0 h-1 ${a.passed ? 'bg-gradient-to-l from-emerald-500 via-teal-400 to-emerald-500' : 'bg-gradient-to-l from-rose-500 via-red-400 to-rose-500'} opacity-80`} />
                  <div className="flex items-start gap-3">
                    <div className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center flex-shrink-0 shadow-md ${
                      a.passed ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gradient-to-br from-rose-500 to-red-600'
                    }`}>
                      <span className="text-white font-extrabold text-lg leading-none tabular-nums">{a.score}%</span>
                      <span className="text-[9px] text-white/85 font-bold mt-0.5">{a.passed ? 'ناجح' : 'راسب'}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-extrabold text-navy text-sm line-clamp-1 mb-0.5">{courseTitle(a.course_id)}</div>
                      <div className="flex items-center gap-2 flex-wrap text-[10px] text-muted-foreground">
                        {a.submitted_at && <span dir="ltr">{new Date(a.submitted_at).toLocaleDateString('ar-EG')}</span>}
                        <span>حد النجاح {coursePass(a.course_id)}%</span>
                        {typeof a.duration_seconds === 'number' && a.duration_seconds > 0 && <span dir="ltr">⏱ {Math.floor(a.duration_seconds / 60)} د</span>}
                      </div>
                      {review && (
                        <div className="mt-1.5 text-[10px] font-bold text-purple-700 bg-purple-500/10 border border-purple-500/25 rounded-lg px-2 py-1 inline-flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" /> النتيجة النهائية بعد مراجعة المدرب
                          {review.note && <span className="font-medium"> — {review.note}</span>}
                        </div>
                      )}
                      {!a.passed && exhaustedFor(a.course_id) && (
                        <div className="mt-1.5 text-[10px] font-extrabold text-rose-400 bg-gradient-to-l from-slate-900 to-slate-800 border border-rose-500/40 rounded-lg px-2 py-1.5 inline-flex items-center gap-1">
                          <Ban className="w-3 h-3" /> لم تتوفّق في هذه الدورة أبداً — انتهت جميع المحاولات
                        </div>
                      )}
                    </div>
                    <Button size="sm" variant="outline" className="flex-shrink-0 border-gold/30 hover:bg-gold/10 rounded-lg text-[10px]"
                      onClick={() => router.push(a.passed ? '/#certificates' : '/#exams')}>
                      {a.passed ? 'اطلب الشهادة' : exhaustedFor(a.course_id) ? 'انتهت المحاولات' : 'أعد الاختبار'}
                    </Button>
                  </div>
                </Card>
              )
            })}
          </div>
        </>
      )}
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
    const url = `${(typeof window !== 'undefined' ? window.location.origin : 'https://fiaacademy.vercel.app')}/verify/${cert.certificate_number}`
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

const Payments = React.memo(function Payments({ payments, userId, courses }: any) {
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
    // Strip PROOF:, COUPON: and REJECTION: markers so the user sees only the
    // transaction reference they typed, not the internal storage markers.
    return ref
      .replace(/\s*\|\s*PROOF:.*$/i, '')
      .replace(/\s*\|\s*COUPON:.*$/i, '')
      .replace(/\s*\|\s*REJECTION:.*$/i, '')
      .replace(/REJECTION:.*$/i, '')
      .trim() || null
  }

  // 👑 سبب الرفض الملكي — يُخزن في المرجع كـ "| REJECTION: السبب" ويعرض
  //    هنا للطالب بلوحة حمراء واضحة حتى يعرف لماذا رُفض دفعه وماذا يفعل.
  const getRejectionReason = (p: any): string | null => {
    const ref = p?.reference
    if (!ref) return null
    const match = String(ref).match(/REJECTION:\s*([^|]+)/i)
    return match ? match[1].trim() : null
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
        /* === Magical empty state — gold-glow icon + navy box === */
        <div className="text-center py-14">
          <div className="relative inline-block mb-4">
            <div className="absolute inset-0 bg-gold/20 rounded-full blur-2xl animate-pulse" />
            <div className="relative w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-navy via-navy-light to-navy flex items-center justify-center shadow-xl border border-gold/30">
              <CreditCard className="w-10 h-10 text-gold" />
            </div>
          </div>
          <h3 className="font-bold text-navy text-base mb-1.5">لا توجد مدفوعات بعد</h3>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto">عند تسجيلك في دورة مدفوعة ورفع إيصال الدفع، ستظهر تفاصيل المعاملة هنا ✨</p>
        </div>
      ) : (
        /* === Magical compact payment cards — grid of mini cards === */
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 fia-stagger">
          {sortedPayments.map((p: any) => {
            const statusInfo = getPaymentRecordStatusInfo(p.status)
            const courseTitle = getCourseTitle(p.course_id)
            const ref = cleanReference(p.reference)
            const dateStr = fmtDate(p.date)
            const proofUrl = getProofUrl(p)
            const couponCode = getCouponCode(p)
            const rejectionReason = getRejectionReason(p)
            const currency = getCurrency(p)
            const hasCoupon = !!couponCode
            // Status-based magical theme
            const isCompleted = ['مكتمل', 'تم تأكيد الدفع', 'confirmed', 'completed'].includes(p.status)
            const isPending = ['بانتظار', 'بانتظار تأكيد الدفع', 'pending', 'قيد الانتظار'].includes(p.status)
            const isFree = p.status === 'مجانية' || (Number(p.amount) === 0 && (!p.method || p.method === 'free'))
            // Theme color per state
            const theme = isCompleted
              ? { headerFrom: 'from-emerald-600', headerTo: 'to-teal-700', border: 'border-emerald-400/40', glow: 'shadow-emerald-500/20', accentText: 'text-emerald-700', chip: 'bg-emerald-50/80 text-emerald-700 border-emerald-200/50' }
              : isPending
                ? { headerFrom: 'from-amber-500', headerTo: 'to-yellow-600', border: 'border-amber-400/40', glow: 'shadow-amber-500/20', accentText: 'text-amber-700', chip: 'bg-amber-50/80 text-amber-700 border-amber-200/50' }
                : isFree
                  ? { headerFrom: 'from-blue-600', headerTo: 'to-indigo-700', border: 'border-blue-400/40', glow: 'shadow-blue-500/20', accentText: 'text-blue-700', chip: 'bg-blue-50/80 text-blue-700 border-blue-200/50' }
                  : { headerFrom: 'from-navy', headerTo: 'to-navy-light', border: 'border-gold/30', glow: 'shadow-navy/20', accentText: 'text-gold', chip: 'bg-navy/5 text-navy border-gold/30' }

            return (
              <Card
                key={p.id}
                className={`fia-course-card p-0 overflow-hidden cursor-default border ${theme.border} ${hasCoupon ? 'ring-1 ring-red-500/30' : ''}`}
              >
                {/* === Magical mini header — gradient + amount + status pill === */}
                <div className={`relative p-3 text-white bg-gradient-to-br ${theme.headerFrom} ${theme.headerTo} ${hasCoupon ? 'from-red-700! to-rose-900!' : ''}`}>
                  {/* Subtle pattern overlay */}
                  <div className="absolute inset-0 opacity-15" style={{
                    backgroundImage: 'radial-gradient(circle at 80% 20%, white 1px, transparent 1px)',
                    backgroundSize: '14px 14px'
                  }} />
                  <div className="absolute -top-4 -left-4 w-16 h-16 bg-white/10 rounded-full blur-xl" />

                  {/* Top row — status pill + coupon chip */}
                  <div className="relative flex items-start justify-between gap-1.5 mb-2">
                    <Badge className={`${statusInfo.badgeClass} border whitespace-nowrap text-[10px] px-2 py-0.5`}>{statusInfo.label}</Badge>
                    {hasCoupon && (
                      <span className="inline-flex items-center gap-1 bg-red-500/40 border border-red-300/40 rounded-md px-1.5 py-0.5 text-[9px] font-bold text-white">
                        <Gift className="w-2.5 h-2.5" /> {couponCode}
                      </span>
                    )}
                  </div>

                  {/* Amount — large with currency suffix */}
                  <div className="relative flex items-baseline gap-1.5">
                    <span className="text-2xl font-extrabold tracking-tight" dir="ltr">{fmtAmount(p)}</span>
                    <span className={`text-xs font-bold ${hasCoupon ? 'text-red-200' : 'text-white/80'}`}>{fmtCurrency(currency)}</span>
                  </div>
                  {hasCoupon && (
                    <div className="relative text-[9px] text-red-100 mt-0.5">⚠ بعد تطبيق الكوبون</div>
                  )}
                </div>

                {/* === Mini body — compact info === */}
                <div className="p-3 space-y-2">
                  {/* Course title with magical icon */}
                  {courseTitle && (
                    <div className="flex items-start gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 mt-0.5 text-gold flex-shrink-0" />
                      <div className="text-xs font-bold text-navy line-clamp-2 leading-tight">{courseTitle}</div>
                    </div>
                  )}

                  {/* Receipt thumbnail — compact 16x9 */}
                  {proofUrl && (
                    <button
                      type="button"
                      onClick={() => setViewingReceipt(proofUrl)}
                      className="relative block w-full h-16 rounded-lg overflow-hidden bg-muted/40 group cursor-pointer border border-border"
                      title="اضغط لعرض الإيصال"
                    >
                      <img src={proofUrl} alt="إيصال الدفع" className="w-full h-full object-cover" loading="lazy" />
                      <div className="absolute inset-0 bg-navy/0 group-hover:bg-navy/60 transition-colors flex items-center justify-center">
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 text-navy text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                          <FileUp className="w-3 h-3" /> عرض
                        </span>
                      </div>
                    </button>
                  )}

                  {/* Compact meta — payment method + date in one row */}
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/40">
                    <div className="pt-1.5">
                      <div className="text-[9px] text-muted-foreground mb-0.5">طريقة الدفع</div>
                      <div className="text-[11px] font-bold text-navy line-clamp-1">{p.method || '-'}</div>
                    </div>
                    <div className="pt-1.5">
                      <div className="text-[9px] text-muted-foreground mb-0.5">التاريخ</div>
                      <div className="text-[11px] font-medium text-navy line-clamp-1" dir="ltr">{dateStr || '-'}</div>
                    </div>
                  </div>

                  {/* Reference chip — only if exists */}
                  {ref && (
                    <div className="pt-1 border-t border-border/40">
                      <div className="text-[9px] text-muted-foreground mb-0.5">رقم المرجع</div>
                      <div className="text-[10px] font-mono text-navy break-all leading-tight" dir="ltr">{ref}</div>
                    </div>
                  )}

                  {/* 👑 لوحة سبب الرفض الملكية — وضوح كامل للطالب */}
                  {rejectionReason && (
                    <div className="pt-1">
                      <div className="rounded-lg border border-red-300/60 bg-red-50 p-2.5">
                        <div className="flex items-start gap-1.5">
                          <XCircle className="w-3.5 h-3.5 text-red-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <div className="text-[10px] font-bold text-red-700 mb-0.5">سبب رفض الدفع</div>
                            <div className="text-[10px] text-red-600 leading-relaxed">{rejectionReason}</div>
                            <div className="text-[9px] text-red-500/80 mt-1">يمكنك إعادة الاشتراك برفع إثبات دفع صحيح بعد معالجة السبب.</div>
                          </div>
                        </div>
                      </div>
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
})

const Profile = React.memo(function Profile({ profile, setProfile, user, updateUser, enrollments = [], certificates = [] }: any) {
  // 🔒 v6.5 (طلب صاحب المنصة): المسمى الوظيفي والتخصص حقلا المدرّب حصراً —
  // حُذفا نهائياً من واجهة المتدرب (لا عرض ولا تعديل). القفل الخادمي في
  // PUT /api/profile باقٍ: أي محاولة تمرير الحقلين من متدرب تُتجاهل.
  const [loading, setLoading] = useState(false)

  const save = async () => {
    setLoading(true)
    try {
      // 👑 الحفظ الملكي الحقيقي: كتابة الملف الشخصي إلى قاعدة البيانات
      //    عبر /api/profile (هوية حية + حقول بيضاء فقط) — لم يعد نجاحاً
      //    زائفاً في المتصفح؛ الملف يبقى محفوظاً عبر كل الأجهزة.
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: profile.phone,
          bio: joinBio(profile.bio, user?.bio),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'فشل حفظ الملف الشخصي')
        return
      }
      updateUser({
        name: profile.name,
        phone: profile.phone,
        bio: joinBio(profile.bio, user?.bio),
      })
      toast.success('تم حفظ ملفك الشخصي بنجاح')
    } catch {
      toast.error('خطأ في الاتصال — لم يتم الحفظ')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SectionCard title="الملف الشخصي" description="إدارة معلوماتك الشخصية">
      <div className="space-y-6 max-w-2xl">
        {/* ⚡ Magical avatar section */}
        <div className="relative flex flex-col items-center gap-4 p-5 rounded-2xl border border-gold/30 bg-gradient-to-br from-navy/5 via-white to-gold/5 overflow-hidden">
          <div className="absolute inset-0 opacity-15 pointer-events-none" style={{
            backgroundImage: 'radial-gradient(circle at 50% 0%, #D4AF37 1px, transparent 1px)',
            backgroundSize: '14px 14px'
          }} />
          <div className="absolute -top-8 -left-8 w-24 h-24 bg-gold/15 rounded-full blur-2xl" />
          <div className="absolute -bottom-8 -right-8 w-20 h-20 bg-navy/15 rounded-full blur-2xl" />
          <div className="relative">
            {/* 👑 v10.3 — إطار بورتريه ذهبي مزدوج يلمع عند التفاعل (بلا قصّ لزر التغيير) */}
            <div className="fia-portrait relative rounded-3xl p-[3px] bg-gradient-to-br from-gold via-amber-200 to-gold shadow-xl">
              <div className="rounded-[21px] border border-gold/50 bg-gradient-to-br from-navy/[0.05] via-white to-gold/[0.08] px-6 py-5">
                <AvatarUploader
                  userId={user.id}
                  role="student"
                  initialUrl={user?.avatar}
                  name={user?.name}
                  size="xl"
                  onUploaded={(url) => updateUser({ avatar: url })}
                />
              </div>
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-gradient-to-br from-gold to-amber-500 flex items-center justify-center shadow-md border-2 border-white/60 z-20">
                <Crown className="w-4 h-4 text-navy" strokeWidth={2.4} />
              </span>
            </div>
          </div>
        </div>

        {/* 👑 v10.3 — بطاقة العضوية الرقمية القابلة للمشاركة */}
        <LuxMembershipCard user={user} />

        {/* 👑 v10.3 — أوسمة الإنجاز بشرح عند اللمس */}
        <SectionCard title="أوسمة الإنجاز" description="ميدالياتك — كل وسام قصة إنجاز">
          <LuxAchievements enrollments={enrollments} certificates={certificates} />
        </SectionCard>

        {/* ⚡ Magical form fields */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-navy flex items-center gap-1.5 mb-1.5">
              <User className="w-3.5 h-3.5 text-gold" /> الاسم الكامل
            </Label>
            <Input value={profile.name} disabled readOnly className="rounded-xl border-gold/30 bg-muted/40 cursor-not-allowed font-bold" />
            <p className="mt-1 text-[10px] text-muted-foreground flex items-center gap-1">
              🔒 الاسم مغلّق نهائياً — يُحدد مرة واحدة عند التسجيل ولا يمكن تعديله (يظهر على شهاداتك الرسمية)
            </p>
          </div>
          <div>
            <Label className="text-navy flex items-center gap-1.5 mb-1.5">
              <Mail className="w-3.5 h-3.5 text-gold" /> البريد الإلكتروني
            </Label>
            <Input value={user?.email || ''} disabled dir="ltr" className="rounded-xl bg-muted/30" />
          </div>
          <div>
            <Label className="text-navy flex items-center gap-1.5 mb-1.5">
              <Phone className="w-3.5 h-3.5 text-gold" /> رقم الهاتف
            </Label>
            <Input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} dir="ltr" className="rounded-xl border-gold/30 focus:border-gold focus:ring-gold/30" />
          </div>
        </div>
        <div>
          <Label className="text-navy flex items-center gap-1.5 mb-1.5">
            <FileText className="w-3.5 h-3.5 text-gold" /> نبذة تعريفية
          </Label>
          <Textarea value={profile.bio} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} rows={4} className="rounded-xl border-gold/30 focus:border-gold focus:ring-gold/30" />
        </div>
        <Button onClick={save} disabled={loading} className="bg-gradient-to-r from-navy to-navy-light hover:from-navy-light hover:to-navy text-gold rounded-xl shadow-md active:scale-[0.97] transition-all px-6">
          {loading ? <><Loader2 className="w-4 h-4 ml-1.5 animate-spin" /> جاري الحفظ...</> : <><CheckCircle2 className="w-4 h-4 ml-1.5" /> حفظ التغييرات</>}
        </Button>
      </div>
    </SectionCard>
  )
})

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
          <div className="relative inline-block mb-4">
            <div className="absolute inset-0 bg-gold/20 rounded-full blur-2xl animate-pulse" />
            <div className="relative w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-navy via-navy-light to-navy flex items-center justify-center shadow-xl border border-gold/30">
              <Bell className="w-10 h-10 text-gold" />
            </div>
          </div>
          <h3 className="font-bold text-navy text-base mb-1.5">لا توجد إشعارات</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            ستظهر هنا تنبيهات عند تأكيد تسجيلك في الدورات أو عند إضافة دروس جديدة ✨
          </p>
        </div>
      ) : (
        <div className="space-y-3 fia-stagger">
          {notifs.map((n) => {
            const Icon = n.icon
            // Determine state-aware gradient based on icon color
            const isSuccess = n.iconBg?.includes('green')
            const isGold = n.iconBg?.includes('gold')
            const isBlue = n.iconBg?.includes('blue')
            const isPurple = n.iconBg?.includes('purple')
            const stateGradient = isGold
              ? 'from-gold to-amber-500'
              : isSuccess
                ? 'from-emerald-500 to-teal-600'
                : isPurple
                  ? 'from-purple-500 to-indigo-600'
                  : isBlue
                    ? 'from-blue-500 to-indigo-600'
                    : 'from-amber-500 to-orange-600'
            return (
              <div
                key={n.id}
                className="relative overflow-hidden rounded-2xl bg-white border border-gray-200/60 hover:shadow-lg transition-all fia-card-hover"
              >
                {/* Top state-aware gradient strip */}
                <div className={`h-1.5 bg-gradient-to-r ${stateGradient}`} />
                <div className="p-4 flex items-start gap-3">
                  <div className="relative flex-shrink-0">
                    <div className="absolute inset-0 bg-gold/15 rounded-xl blur-md" />
                    <div className={`relative w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${n.iconBg} border border-gold/20`}>
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-navy text-sm flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-gold flex-shrink-0" />
                      {n.title}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">{n.desc}</div>
                  </div>
                  {n.time && (
                    <div className="text-xs text-muted-foreground flex-shrink-0 whitespace-nowrap" dir="rtl">
                      {n.time}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </SectionCard>
  )
}

const SettingsTab = React.memo(function SettingsTab({ user, updateUser }: any) {
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

  // Phone change state — uses /api/profile PUT (self-service)
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
      // 🛡️ v6.4: عبر /api/profile الذاتي — كان يستدعي /api/students الإداري
      // فأرجع 403 لكل متدرب منذ درع v5.0 وتعذّر تغيير الهاتف نهائياً
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
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
        {/* ⚡ Magical account header */}
        <div className="relative flex items-center gap-3 p-4 rounded-2xl border border-gold/30 bg-gradient-to-br from-navy via-navy-light to-navy text-white overflow-hidden">
          <div className="absolute inset-0 opacity-25" style={{
            backgroundImage: 'radial-gradient(circle at 12% 50%, #D4AF37 1.5px, transparent 1.5px), radial-gradient(circle at 88% 50%, white 1px, transparent 1px)',
            backgroundSize: '24px 24px, 18px 18px'
          }} />
          <div className="absolute -top-6 -right-6 w-16 h-16 bg-gold/15 rounded-full blur-2xl" />
          <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-gold to-amber-500 flex items-center justify-center text-navy font-bold text-xl border border-white/30 shadow-md">
            {user?.name?.charAt(0)}
          </div>
          <div className="relative min-w-0">
            <div className="font-bold text-white">{user?.name}</div>
            <div className="text-xs text-gold/80" dir="ltr">{user?.email}</div>
          </div>
        </div>

        {/* ===== Account section ===== */}
        <div>
          <h3 className="font-bold text-navy text-sm mb-3 flex items-center gap-2">
            <User className="w-4 h-4 text-gold" /> الحساب
          </h3>

          <div className="space-y-4">
            {/* ⚡ Change email — magical card */}
            <div className="relative p-4 rounded-xl border border-gold/30 bg-gradient-to-br from-white to-gold/5 overflow-hidden">
              <div className="absolute -top-4 -right-4 w-12 h-12 bg-gold/15 rounded-full blur-xl" />
              <div className="relative flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-navy to-navy-light flex items-center justify-center">
                  <Mail className="w-4 h-4 text-gold" />
                </div>
                <div className="font-semibold text-navy text-sm">تغيير البريد الإلكتروني</div>
              </div>
              <div className="space-y-2">
                <Input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder={user?.email || 'example@fia.edu'}
                  dir="ltr"
                  className="rounded-xl border-gold/30 focus:border-gold focus:ring-gold/30"
                />
                <div className="relative">
                  <Input
                    type={showEmailPwd ? 'text' : 'password'}
                    value={emailPwd}
                    onChange={(e) => setEmailPwd(e.target.value)}
                    placeholder="كلمة المرور الحالية للتأكيد"
                    dir="ltr"
                    className="pr-3 pl-9 rounded-xl border-gold/30 focus:border-gold focus:ring-gold/30"
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
                  className="w-full bg-gradient-to-r from-navy to-navy-light hover:from-navy-light hover:to-navy text-gold rounded-xl shadow-md active:scale-[0.97] transition-all"
                >
                  {emailLoading ? <><Loader2 className="w-4 h-4 ml-1 animate-spin" /> جاري...</> : 'حفظ البريد'}
                </Button>
              </div>
            </div>

            {/* ⚡ Change password — magical card */}
            <div className="relative p-4 rounded-xl border border-gold/30 bg-gradient-to-br from-white to-gold/5 overflow-hidden">
              <div className="absolute -top-4 -right-4 w-12 h-12 bg-gold/15 rounded-full blur-xl" />
              <div className="relative flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-navy to-navy-light flex items-center justify-center">
                  <Lock className="w-4 h-4 text-gold" />
                </div>
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
                    className="pr-3 pl-9 rounded-xl border-gold/30 focus:border-gold focus:ring-gold/30"
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
                    className="pr-3 pl-9 rounded-xl border-gold/30 focus:border-gold focus:ring-gold/30"
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
                  className="rounded-xl border-gold/30 focus:border-gold focus:ring-gold/30"
                />
                {newPwd && confirmPwd && newPwd !== confirmPwd && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <XCircle className="w-3 h-3" /> كلمتا المرور غير متطابقتين
                  </p>
                )}
                {newPwd && confirmPwd && newPwd === confirmPwd && (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> كلمتا المرور متطابقتان
                  </p>
                )}
                <Button
                  onClick={savePassword}
                  disabled={pwdLoading || !currentPwd || !newPwd || !confirmPwd || newPwd !== confirmPwd}
                  className="w-full bg-gradient-to-r from-navy to-navy-light hover:from-navy-light hover:to-navy text-gold rounded-xl shadow-md active:scale-[0.97] transition-all"
                >
                  {pwdLoading ? <><Loader2 className="w-4 h-4 ml-1 animate-spin" /> جاري...</> : 'حفظ كلمة المرور'}
                </Button>
              </div>
            </div>

            {/* ⚡ Change phone — magical card */}
            <div className="relative p-4 rounded-xl border border-gold/30 bg-gradient-to-br from-white to-gold/5 overflow-hidden">
              <div className="absolute -top-4 -right-4 w-12 h-12 bg-gold/15 rounded-full blur-xl" />
              <div className="relative flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-navy to-navy-light flex items-center justify-center">
                  <Phone className="w-4 h-4 text-gold" />
                </div>
                <div className="font-semibold text-navy text-sm">تغيير رقم الهاتف</div>
              </div>
              <div className="space-y-2">
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="رقم الهاتف الجديد"
                  dir="ltr"
                  className="rounded-xl border-gold/30 focus:border-gold focus:ring-gold/30"
                />
                <Button
                  onClick={savePhone}
                  disabled={phoneLoading || !phone || phone === user?.phone}
                  className="w-full bg-gradient-to-r from-navy to-navy-light hover:from-navy-light hover:to-navy text-gold rounded-xl shadow-md active:scale-[0.97] transition-all"
                >
                  {phoneLoading ? <><Loader2 className="w-4 h-4 ml-1 animate-spin" /> جاري...</> : 'حفظ الهاتف'}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* ⚡ Notification preferences — magical card */}
        <div>
          <h3 className="font-bold text-navy text-sm mb-3 flex items-center gap-2">
            <Bell className="w-4 h-4 text-gold" /> تفضيلات الإشعارات
          </h3>
          <div className="relative p-4 rounded-xl border border-gold/30 bg-gradient-to-br from-white to-gold/5 flex items-center justify-between overflow-hidden">
            <div className="absolute -top-4 -right-4 w-12 h-12 bg-gold/15 rounded-full blur-xl" />
            <div className="relative">
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
})

// ============================================================================
// StudentCertificates — shows certificates issued to this student by the admin
// (or by themselves after passing exams / requesting them after course completion).
// ============================================================================
const StudentCertificates = React.memo(function StudentCertificates({ user }: any) {
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
        <div className="py-2">
          <RoyalListSkeleton rows={3} />
        </div>
      </SectionCard>
    )
  }

  if (items.length === 0) {
    return (
      <SectionCard title="شهاداتي" description="الشهادات الصادرة لك">
        {/* ⚡ Magical empty state */}
        <div className="text-center py-14">
          <div className="relative inline-block mb-4">
            <div className="absolute inset-0 bg-gold/20 rounded-full blur-2xl animate-pulse" />
            <div className="relative w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-navy via-navy-light to-navy flex items-center justify-center shadow-xl border border-gold/30">
              <Award className="w-10 h-10 text-gold" />
            </div>
          </div>
          <h3 className="font-bold text-navy text-base mb-1.5">لا توجد شهادات صادرة بعد</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
            تكمل دورتك بنسبة 100% ثم اطلب شهادتك من داخل الدورة. ستظهر هنا فور إصدارها من الإدارة ✨
          </p>
        </div>
      </SectionCard>
    )
  }

  return (
    <>
      <SectionCard title="شهاداتي" description={`${items.length} شهادة صادرة`}>
        {/* ⚡ Magical compact certificate cards — 2/3 grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 fia-stagger">
          {items.map((cert) => (
            <Card key={cert.id} className="fia-course-card p-0 overflow-hidden cursor-pointer border border-gold/30 group">
              {/* Top gold strip */}
              <div className="h-2 bg-gradient-to-r from-gold via-amber-300 to-gold" />
              {/* Magical header — navy with gold dot pattern */}
              <div className="relative bg-gradient-to-br from-navy via-navy-light to-navy p-4 text-white overflow-hidden">
                <div className="absolute inset-0 opacity-25" style={{
                  backgroundImage: 'radial-gradient(circle at 12% 50%, #D4AF37 1.5px, transparent 1.5px), radial-gradient(circle at 88% 20%, white 1px, transparent 1px)',
                  backgroundSize: '20px 20px, 16px 16px'
                }} />
                <div className="absolute -top-6 -right-6 w-16 h-16 bg-gold/15 rounded-full blur-2xl" />
                <div className="relative flex items-start justify-between mb-1">
                  <div>
                    <div className="text-[9px] text-gold uppercase tracking-widest mb-0.5">FIA</div>
                    <div className="text-[10px] text-white/70">شهادة إكمال</div>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gold to-amber-500 flex items-center justify-center shadow-md border border-white/20">
                    <Award className="w-5 h-5 text-navy" />
                  </div>
                </div>
                {/* Status pill — with fia-status-glow */}
                <div className="fia-status-glow relative inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 rounded-full px-2 py-0.5 text-[9px] font-bold mt-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  صالحة
                </div>
              </div>
              {/* Body — compact info */}
              <div className="p-3 space-y-2">
                <div>
                  <div className="text-[9px] text-muted-foreground mb-0.5">الدورة</div>
                  <h4 className="font-bold text-navy text-xs line-clamp-2 leading-tight">{cert.course_title}</h4>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/40">
                  <div>
                    <div className="text-[9px] text-muted-foreground mb-0.5">رقم الشهادة</div>
                    <div className="text-[10px] font-mono font-bold text-gold break-all" dir="ltr">{cert.certificate_number}</div>
                  </div>
                  <div>
                    <div className="text-[9px] text-muted-foreground mb-0.5">الإصدار</div>
                    <div className="text-[10px] font-bold text-navy" dir="ltr">
                      {cert.issued_at ? new Date(cert.issued_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                    </div>
                  </div>
                </div>
                {cert.has_external_accreditation && cert.external_accreditation_body && (
                  <div className="pt-2 border-t border-border/40 flex items-center gap-1.5 text-[10px] text-gold">
                    <Award className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">معتمدة: {cert.external_accreditation_body}</span>
                  </div>
                )}
                {/* Actions */}
                <div className="flex gap-1 pt-2 border-t border-border/40">
                  <Button
                    size="sm"
                    className="flex-1 h-8 text-[10px] rounded-lg bg-gradient-to-r from-navy to-navy-light hover:from-navy-light hover:to-navy text-gold shadow-md active:scale-[0.97] transition-all"
                    onClick={() => setViewing(cert)}
                  >
                    <ExternalLink className="w-3 h-3 ml-1" /> عرض
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 p-0 border-gold/30 text-gold hover:bg-gold/10 rounded-lg"
                    onClick={() => setViewing(cert)}
                  >
                    <Download className="w-3 h-3" />
                  </Button>
                </div>
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
})
