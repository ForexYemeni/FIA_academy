'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  LayoutDashboard, BookOpen, Users, FileText, User, Bell, Settings,
  Plus, Edit, Trash2, Video, FileUp, Star, ArrowRight, Lock, Mail, CheckCircle2, Eye, EyeOff, Loader2,
  HelpCircle, UserPlus, X, AlertTriangle, MessageSquare, Newspaper, Gift,
  GraduationCap, Crown, Calendar, Clock, TrendingUp,
  Phone, Briefcase, Sparkles, Award, KeyRound, Save, HeartHandshake, Wallet, Search, UserCheck,
  ShieldCheck, ScrollText, Coins, Send,
} from 'lucide-react'
import { DashboardShell, StatCard, SectionCard, NavItem } from './shell'
import { useAuth } from '@/lib/auth-store'
import { useHashTab } from '@/lib/use-hash-tab'
import { RoyalGuideBanner } from '@/components/fia/royal-guide-banner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from 'sonner'
import { CourseContentManager } from '@/components/fia/course-content-manager'
import { AvatarUploader } from '@/components/fia/avatar-uploader'
import { SharedBlog, SharedFAQ } from './shared-community'
import { SharedForumRoyal } from './shared-forum-royal'
import { AffiliateDashboard } from '@/components/fia/affiliate-dashboard'
import { CourseDialog as ProCourseDialog } from '@/components/fia/course-dialog'
import { TrainerQuestionBank } from './trainer-questions'
import { TrainerResultsCenter } from './trainer-results'
import { TrainerEarnings } from './trainer-earnings'
import { TrainerFollowersMuseum } from './trainer-followers'
import { TrainerRoyalGate, TrainerStatus } from './trainer-royal-gate'
import { RenegotiationOfferCard } from './renegotiation-offer-card'
// 🛡️ v6.9.4 — المنبّث الذهبي الملكي: جرس + نافذة منبثقة عند طلب تعديل النسبة
// (مكوّن معزول 100% — لا يمس الإشعارات الثلاثية ولا sw.js ولا أي إشعار قائم)
import { RenegotiationAlertWatcher } from './renegotiation-alert-watcher'
import { TrainerWithdrawalAccounts } from './trainer-withdrawal-accounts'
import { LuxSelect } from './luxury'
import { useSpecializationCatalog } from '@/lib/use-specializations'
import { Landmark } from 'lucide-react'
import { supabasePublic } from '@/lib/supabase'

// ⚡ v6.7 — القائمة الملكية المرتّبة: الأقسام مجمّعة تحت 5 ترويسات ذهبية
const NAV: NavItem[] = [
  // الرئيسية
  { id: 'overview', label: 'نظرة عامة', icon: LayoutDashboard, group: 'الرئيسية' },
  // التدريب
  { id: 'courses', label: 'دوراتي التدريبية', icon: BookOpen, group: 'التدريب' },
  { id: 'students', label: 'متدربوّ', icon: Users, group: 'التدريب' },
  { id: 'followers', label: 'متحف المتابعين', icon: HeartHandshake, group: 'التدريب' },
  { id: 'exams', label: 'الاختبارات', icon: FileText, group: 'التدريب' },
  { id: 'question-bank', label: 'بنك الأسئلة', icon: HelpCircle, group: 'التدريب' },
  { id: 'results', label: 'نتائج المتدربين', icon: TrendingUp, group: 'التدريب' },
  // المالية
  { id: 'earnings', label: 'أرباحي', icon: Wallet, group: 'المالية' },
  { id: 'withdrawal-accounts', label: 'حسابات السحب', icon: Landmark, group: 'المالية' },
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

export function TrainerDashboard() {
  const [active, setActive] = useState('overview')
  useHashTab(NAV.map((n) => n.id), setActive)
  const [contentCourseId, setContentCourseId] = useState<string | null>(null)
  const user = useAuth((s) => s.user)
  const updateUser = useAuth((s) => s.updateUser)
  const logout = useAuth((s) => s.logout)
  const [courses, setCourses] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [enrolledStudentIds, setEnrolledStudentIds] = useState<Set<string>>(new Set())
  const [editing, setEditing] = useState<any | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // ⚡ Listen for native notifications from the APK bridge.
  useEffect(() => {
    ;(window as any).__FIA_showToast = (msg: string) => {
      try { toast.success(msg) } catch {}
    }
    ;(window as any).__FIA_refreshActiveView = () => {
      // No-op: Realtime subscriptions handle refresh
    }
    const handleNativeNotif = (event: any) => {
      const data = event.detail || {}
      if (data.title) {
        try { toast.success(`${data.title}${data.body ? ' — ' + data.body : ''}`) } catch {}
      }
    }
    window.addEventListener('fia-native-notification', handleNativeNotif as EventListener)
    return () => {
      window.removeEventListener('fia-native-notification', handleNativeNotif as EventListener)
      try {
        delete (window as any).__FIA_refreshActiveView
        delete (window as any).__FIA_showToast
      } catch {}
    }
  }, [])

  // Profile state is seeded from auth-store user; refreshTrainerProfile() below
  // keeps it in sync with the latest DB record fetched from /api/trainers.
  const [profile, setProfile] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    title: user?.title || '',
    specialization: user?.title || '',
    bio: user?.bio || '',
    avatar: user?.avatar || '',
  })
  // 🎓 الكتالوج المهني الموحد — قوائم فاخرة للمسمى الوظيفي والتخصص (تُبنى داخل TrainerProfile أيضاً)
  const { titles: catTitles, specializations: catSpecs } = useSpecializationCatalog()
  const titleOpts = catTitles.length ? catTitles : [{ value: 'مدرب', label: 'مدرب', emoji: '🎓' }, { value: 'استشاري', label: 'استشاري', emoji: '🩺' }, { value: 'أخصائي', label: 'أخصائي', emoji: '📊' }, { value: 'محاضر', label: 'محاضر', emoji: '🎤' }, { value: 'مدرس معتمد', label: 'مدرس معتمد', emoji: '✅' }, { value: 'مدرس', label: 'مدرس', emoji: '📘' }]
  const specOpts = catSpecs.length ? catSpecs : [{ value: 'إدارة الأعمال', label: 'إدارة الأعمال', emoji: '💼' }, { value: 'التسويق الرقمي', label: 'التسويق الرقمي', emoji: '📱' }, { value: 'التعليم الطبي', label: 'التعليم الطبي', emoji: '📖' }]

  // 👑 حالة المنظومة الملكية: pending → agreement_pending → approved / rejected
  const [trainerStatus, setTrainerStatus] = useState<TrainerStatus | null>(null)
  const [trainerAgreement, setTrainerAgreement] = useState<any | null>(null)
  const [trainerRejectedReason, setTrainerRejectedReason] = useState<string | null>(null)
  // 🛡️ v6.9.3 — النسبة السارية (تُقرأ مع بطاقة تعديل العقد في «نظرة عامة»)
  const [trainerProfitPct, setTrainerProfitPct] = useState<number>(0)

  const refreshTrainerProfile = useCallback(async () => {
    if (!user?.id) return
    try {
      const res = await fetch(`/api/trainers?id=${user.id}`)
      const data = await res.json()
      if (data && !data.error) {
        setProfile({
          name: data.name || '',
          phone: data.phone || '',
          title: data.title || '',
          specialization: data.specialization || data.title || '',
          bio: data.bio || '',
          avatar: data.avatar || '',
        })
        // 👑 بوابات المنظومة الملكية — الحالة والاتفاق
        if (data.status) setTrainerStatus(data.status as TrainerStatus)
        setTrainerAgreement(data.agreement || null)
        setTrainerRejectedReason(data.rejected_reason || null)
        setTrainerProfitPct(Number(data.profit_percentage ?? data.agreement?.percentage ?? 0) || 0)
        // Keep auth-store in sync too so other parts of the dashboard reflect
        // any admin-side edits.
        updateUser({
          name: data.name,
          phone: data.phone,
          title: data.title,
          bio: data.bio,
          avatar: data.avatar,
        })
      }
    } catch {
      // silent
    }
  }, [user?.id, updateUser])

  useEffect(() => {
    refreshTrainerProfile()
  }, [refreshTrainerProfile])

  const loadCourses = () => {
    fetch('/api/courses?include_drafts=true').then((r) => r.json()).then((d) => {
      const all = Array.isArray(d) ? d : []
      // Filter to ONLY this trainer's courses
      const mine = all.filter((c: any) => c.trainer_id === user?.id)
      setCourses(mine)
    }).catch(() => {})
  }
  const loadStudents = () => {
    fetch('/api/students?role=student').then((r) => r.json()).then((d) => setStudents(Array.isArray(d) ? d : [])).catch(() => {})
  }

  // Fetch enrollments and filter to ONLY students enrolled in this trainer's courses
  useEffect(() => {
    if (courses.length === 0) {
      setEnrolledStudentIds(new Set())
      return
    }
    fetch('/api/enrollments').then((r) => r.json()).then((d) => {
      const all = Array.isArray(d) ? d : []
      const courseIds = courses.map((c: any) => c.id)
      const myEnrollments = all.filter((e: any) => courseIds.includes(e.course_id))
      const ids = new Set(myEnrollments.map((e: any) => e.user_id))
      setEnrolledStudentIds(ids)
    }).catch(() => {})
  }, [courses])

  // Filtered students — only those enrolled in this trainer's courses
  const myStudents = students.filter((s: any) => enrolledStudentIds.has(s.id))

  useEffect(() => {
    loadCourses()
    loadStudents()
  }, [user?.id])

  // ⚡ REAL-TIME: trainer sees new enrollments INSTANTLY when a student
  // enrolls in their course. Also sees payment confirmations live.
  useEffect(() => {
    if (!user?.id) return
    let channel: any
    try {
      channel = supabasePublic
        .channel(`trainer-realtime:${user.id}`)
        // New enrollment in any course — refresh students list
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'enrollments' },
          (payload: any) => {
            // Only relevant if it's in one of this trainer's courses
            const courseId = payload.new.course_id
            if (courses.some((c: any) => c.id === courseId)) {
              loadStudents()
              toast.success('📚 طالب جديد سجل في دورتك!')
            }
          }
        )
        // Payment status update — affects enrollments
        .on('postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'payments' },
          () => {
            // Refresh students list (enrollment statuses may have changed)
            loadStudents()
          }
        )
        // Course update — refresh courses
        .on('postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'courses' },
          (payload: any) => {
            setCourses((prev) => prev.map((c: any) => c.id === payload.new.id ? { ...c, ...payload.new } : c))
          }
        )
        .subscribe()
    } catch {}
    return () => { try { supabasePublic.removeChannel(channel) } catch {} }
  }, [user?.id, courses.length])

  const navigateToContent = (courseId: string) => {
    setContentCourseId(courseId)
    setActive('content')
  }

  // 👑 البوابة الملكية: المدرب غير المعتمد (بانتظار الموافقة/التوقيع/مرفوض)
  // لا يرى قاعات العمل إطلاقاً — كل التبويبات التشغيلية تُستبدل ببوابة القصر
  // (والخادم يمنع فعلياً أي إنشاء/تعديل/حذف دورات — هنا مجرد مهابة ملكية)
  const POWER_TABS = ['courses', 'content', 'students', 'followers', 'exams', 'question-bank', 'results', 'earnings', 'withdrawal-accounts']
  const gated = Boolean(trainerStatus && trainerStatus !== 'approved')
  // 🛡️ v6.9.3 — عرض تعديل العقد المعلّق: بطاقة ذهبية في «نظرة عامة» + نبضة على «أرباحي»
  const renegPending = !!trainerAgreement?.renegotiation && trainerAgreement.renegotiation.trainer_response === 'pending'
  const gateElement = (
    <TrainerRoyalGate
      status={trainerStatus!}
      name={user?.name || profile.name}
      agreement={trainerAgreement}
      rejectedReason={trainerRejectedReason}
      specialization={profile.specialization}
      onRefresh={refreshTrainerProfile}
    />
  )
  // أقفال مهيبة على التبويبات المقفلة في القائمة الجانبية — المنتدى مغلق تماماً قبل الاتفاق
  const navForDisplay = (
    gated
      ? NAV.map((n) => (POWER_TABS.includes(n.id) || n.id === 'forum') ? { ...n, label: `🔒 ${n.label}` } : n)
      : NAV
  ).map((n) => (n.id === 'earnings' && renegPending ? { ...n, pulse: true } : n))

  return (
    <DashboardShell
      nav={navForDisplay}
      active={active}
      onNavigate={(id) => { setActive(id); if (id !== 'content') setContentCourseId(null) }}
      roleLabel="مدرب"
      roleColor="bg-green-500/15 text-green-600 border-green-500/30"
    >
      {active === 'overview' && (
        gated ? gateElement : (
          <div className="space-y-6">
            {/* 🛡️ v6.9.3 — بطاقة اتفاق تعديل العقد أول ما يهبط المدرب لوحته:
                الطلب المُرسل من الإدارة يظهر هنا مباشرة لموافقة أو رفض فوري */}
            <RenegotiationOfferCard
              agreement={trainerAgreement}
              currentPercentage={trainerProfitPct}
              trainerId={user?.id || ''}
              onResponded={refreshTrainerProfile}
            />
            <TrainerOverview user={user} courses={courses} students={myStudents} onOpenMuseum={() => setActive('followers')} />
          </div>
        )
      )}
      {active === 'withdrawal-accounts' && (gated ? gateElement : <TrainerWithdrawalAccounts />)}
      {active === 'courses' && (gated ? gateElement : <TrainerCourses courses={courses} onAdd={() => { setEditing(null); setIsDialogOpen(true) }} onEdit={(c) => { setEditing(c); setIsDialogOpen(true) }} onRefresh={loadCourses} onManageContent={navigateToContent} />)}
      {active === 'content' && contentCourseId && (gated ? gateElement : (
        <div className="space-y-4">
          <Button variant="ghost" onClick={() => setActive('courses')} className="text-navy hover:bg-navy/5">
            <ArrowRight className="w-4 h-4 ml-1" /> العودة للدورات
          </Button>
          <CourseContentManager courseId={contentCourseId} />
        </div>
      ))}
      {active === 'students' && (gated ? gateElement : <TrainerStudents students={myStudents} courses={courses} />)}
      {active === 'followers' && (gated ? gateElement : <TrainerFollowersMuseum user={user} />)}
      {active === 'exams' && (gated ? gateElement : <TrainerExams courses={courses} />)}
      {active === 'question-bank' && (gated ? gateElement : <TrainerQuestionBank courses={courses} />)}
      {active === 'results' && (gated ? gateElement : <TrainerResultsCenter user={user} courses={courses} />)}
      {active === 'earnings' && (gated ? gateElement : <TrainerEarnings user={user} />)}
      {active === 'forum' && (gated ? <ForumLockPanel /> : <SharedForumRoyal user={user} />)}
      {active === 'blog' && <SharedBlog readOnly={gated} />}
      {active === 'faqs' && <SharedFAQ />}
      {active === 'affiliate' && (
        <SectionCard title="برنامج العمولة" description="شارك أصدقاءك واكسب عمولة">
          <AffiliateDashboard />
        </SectionCard>
      )}
      {active === 'profile' && <TrainerProfile profile={profile} setProfile={setProfile} user={user} updateUser={updateUser} refreshProfile={refreshTrainerProfile} />}
      {active === 'notifications' && <TrainerNotifs courses={courses} />}
      {active === 'settings' && <TrainerAccountSettings user={user} updateUser={updateUser} logout={logout} />}

      {/* 🛡️ v6.9.4 — المنبّث الذهبي الملكي لعرض تعديل النسبة (معزول عن كل الإشعارات) */}
      <RenegotiationAlertWatcher trainerId={user?.id || ''} onRefresh={refreshTrainerProfile} />

      {isDialogOpen && (
        <ProCourseDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          course={editing}
          trainerId={user?.id}
          onSaved={() => {
            setIsDialogOpen(false)
            loadCourses()
          }}
        />
      )}
    </DashboardShell>
  )
}

function TrainerOverview({ user, courses, students, onOpenMuseum }: any) {
  // Compute the real average rating from courses that actually carry a
  // numeric rating. If no ratings exist yet, fall back to a clear message
  // instead of a hardcoded fake number.
  const ratedCourses = (courses || []).filter(
    (c: any) => typeof c.rating === 'number' && c.rating > 0
  )
  const avgRating =
    ratedCourses.length > 0
      ? (ratedCourses.reduce((acc, c) => acc + c.rating, 0) / ratedCourses.length).toFixed(1)
      : 'لا توجد تقييمات بعد'

  // ⚡ ROYAL v4.2 — magical FOLLOWERS hub: count + live follower list.
  const [followers, setFollowers] = useState<any[]>([])
  const [followersLoading, setFollowersLoading] = useState(true)
  useEffect(() => {
    let cancelled = false
    const load = () => {
      if (!user?.id) { setFollowersLoading(false); return }
      fetch(`/api/trainer-follows?trainer_id=${user.id}`)
        .then((r) => r.json())
        .then((d) => { if (!cancelled) setFollowers(Array.isArray(d?.followers) ? d.followers : []) })
        .catch(() => { if (!cancelled) setFollowers([]) })
        .finally(() => { if (!cancelled) setFollowersLoading(false) })
    }
    load()
    // ⚡ REAL-TIME: a new follower appears instantly (magic toast)
    let channel: any
    try {
      channel = supabasePublic
        .channel(`trainer-followers:${user?.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'trainer_follows' }, () => { load() })
        .subscribe()
    } catch {}
    return () => { cancelled = true; try { supabasePublic.removeChannel(channel) } catch {} }
  }, [user?.id])

  // Real "active exams" count: lessons with lesson_type === 'exam' across
  // the trainer's own courses (same data source as TrainerExams).
  const [examsCount, setExamsCount] = useState<number>(0)
  const [examsLoading, setExamsLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (!courses || courses.length === 0) {
        setExamsCount(0)
        return
      }
      setExamsLoading(true)
      try {
        const results = await Promise.all(
          courses.map(async (c: any) => {
            try {
              const res = await fetch(`/api/lessons?course_id=${c.id}`)
              const data = await res.json()
              const lessons = Array.isArray(data) ? data : []
              return lessons.filter((l: any) => l.lesson_type === 'exam').length
            } catch {
              return 0
            }
          })
        )
        if (cancelled) return
        setExamsCount(results.reduce((a, b) => a + b, 0))
      } catch {
        if (!cancelled) setExamsCount(0)
      } finally {
        if (!cancelled) setExamsLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [courses])

  return (
    <div className="space-y-6">
      {/* ⚡ Magical hero header */}
      <div className="relative overflow-hidden rounded-2xl p-6 lg:p-7 bg-gradient-to-l from-navy via-navy-light to-navy text-white shadow-xl ring-1 ring-gold/30">
        <div className="absolute inset-0 opacity-25" style={{
          backgroundImage: 'radial-gradient(circle at 12% 50%, #D4AF37 1.5px, transparent 1.5px), radial-gradient(circle at 88% 50%, white 1px, transparent 1px)',
          backgroundSize: '24px 24px, 18px 18px'
        }} />
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-gold/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-gold/10 rounded-full blur-2xl" />
        <div className="relative flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gold to-amber-500 flex items-center justify-center shadow-lg border border-white/30">
            <GraduationCap className="w-7 h-7 text-navy" strokeWidth={2.2} />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-1 tracking-tight">مرحباً، {user?.name}</h2>
            <p className="text-gold/80 text-sm flex items-center gap-1.5">
              <span className="w-1 h-1 bg-gold rounded-full animate-pulse" />
              نظرة عامة على نشاطك التدريبي — محدّثة لحظياً
            </p>
          </div>
        </div>
      </div>

      {/* 🎓 الدليل الملكي — دليل استخدام الأكاديمية للمتدربين والمدربين */}
      <RoyalGuideBanner
        slug="fia-user-guide"
        title="دليل استخدام أكاديمية المستقبل الدولية"
        subtitle="رحلتك الفاخرة من الألف إلى الياء — كل أسرار المنصة كمتدرب وكمدرّب، درساً درساً."
      />

      {/* ⚡ Magical StatCards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 fia-stagger">
        <StatCard icon={BookOpen} label="الدورات التدريبية" value={courses.length} color="navy" />
        <StatCard icon={Users} label="إجمالي المتدربين" value={String(students.length)} color="gold" />
        <StatCard icon={HeartHandshake} label="متابعوك المخلصون" value={followersLoading ? '—' : String(followers.length)} color="green" />
        <StatCard icon={Star} label="متوسط التقييم" value={avgRating} color="green" />
        <StatCard
          icon={FileText}
          label="الاختبارات النشطة"
          value={examsLoading ? '—' : examsCount}
          color="blue"
        />
      </div>

      {/* ⚡ ROYAL v4.4 — معاينة متحف المتابعين + دخول القسم الملكي الكامل */}
      <SectionCard
        title="متحف متابعيك المخلصين"
        description="جمهورك الخاص الذي يتلقى إشعاراً فورياً بكل دورة أو درس جديد تنشره"
        action={
          <Button size="sm" onClick={onOpenMuseum} className="relative overflow-hidden bg-gradient-to-l from-gold to-amber-500 hover:from-amber-500 hover:to-gold text-navy rounded-xl shadow-md font-extrabold h-9">
            <span className="absolute inset-0 lux-shimmer" />
            <Crown className="w-4 h-4 ml-1 relative" /> دخول المتحف الكامل
          </Button>
        }
      >
        {followersLoading ? (
          <div className="text-center py-8"><Loader2 className="w-6 h-6 mx-auto animate-spin text-gold" /></div>
        ) : followers.length === 0 ? (
          <button type="button" onClick={onOpenMuseum} className="relative w-full overflow-hidden rounded-2xl border border-gold/20 bg-gradient-to-br from-white to-gold/5 p-8 text-center hover:border-gold/45 transition-colors">
            <div className="absolute inset-0 opacity-25" style={{
              backgroundImage: 'radial-gradient(circle at 12% 50%, #D4AF37 1.5px, transparent 1.5px), radial-gradient(circle at 88% 20%, white 1px, transparent 1px)',
              backgroundSize: '24px 24px, 18px 18px',
            }} />
            <div className="relative inline-block mb-3">
              <div className="absolute inset-0 bg-gold/20 rounded-full blur-2xl animate-pulse" />
              <div className="relative w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-navy via-navy-light to-navy flex items-center justify-center shadow-xl border border-gold/30">
                <HeartHandshake className="w-8 h-8 text-gold" />
              </div>
            </div>
            <h3 className="relative font-bold text-navy text-base mb-1">المتحف بانتظار أول معروضة</h3>
            <p className="relative text-xs text-muted-foreground">عندما يتابعك متدرب ستضيء قاعة المجد باسمه فوراً — اضغط لزيارة المتحف ✨</p>
          </button>
        ) : (
          <>
            {/* شريط إحصاء مدمج + آخر 4 متابعين */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="relative overflow-hidden rounded-xl bg-gradient-to-l from-navy via-navy-light to-navy p-3 text-white border border-gold/30">
                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 15% 50%, #D4AF37 1.5px, transparent 1.5px)', backgroundSize: '16px 16px' }} />
                <div className="relative">
                  <HeartHandshake className="w-4 h-4 text-gold mb-1" />
                  <p className="text-xl font-extrabold tabular-nums" dir="ltr">{followers.length}</p>
                  <p className="text-[9px] text-gold/80 font-bold">إجمالي المتابعين</p>
                </div>
              </div>
              <div className="rounded-xl border border-gold/25 bg-gradient-to-br from-white to-gold/5 p-3">
                <UserCheck className="w-4 h-4 text-emerald-600 mb-1" />
                <p className="text-xl font-extrabold text-navy tabular-nums" dir="ltr">{followers.filter((f: any) => Date.now() - new Date(f.created_at).getTime() < 7 * 864e5).length}</p>
                <p className="text-[9px] font-bold text-muted-foreground">هذا الأسبوع</p>
              </div>
              <div className="rounded-xl border border-gold/25 bg-gradient-to-br from-white to-gold/5 p-3">
                <Crown className="w-4 h-4 text-amber-500 mb-1" />
                <p className="text-xl font-extrabold text-navy tabular-nums" dir="ltr">{followers.filter((f: any) => Date.now() - new Date(f.created_at).getTime() < 864e5).length}</p>
                <p className="text-[9px] font-bold text-muted-foreground">اليوم</p>
              </div>
              <div className="rounded-xl border border-gold/25 bg-gradient-to-br from-white to-gold/5 p-3">
                <Sparkles className="w-4 h-4 text-gold mb-1" />
                <p className="text-sm font-extrabold text-navy tabular-nums pt-1.5" dir="ltr">{followers.length > 0 ? new Date(Math.max(...followers.map((f: any) => new Date(f.created_at).getTime()))).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' }) : '—'}</p>
                <p className="text-[9px] font-bold text-muted-foreground">آخر متابعة</p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {followers.slice(0, 4).map((f: any, idx: number) => (
                <button key={f.id} type="button" onClick={onOpenMuseum} className="group relative overflow-hidden rounded-xl border border-gold/20 bg-gradient-to-br from-white to-gold/5 p-3 text-center hover:border-gold/50 hover:shadow-md transition-all">
                  <div className="absolute top-0 right-0 left-0 h-0.5 bg-gradient-to-l from-gold via-amber-300 to-gold opacity-60" />
                  {idx === 0 && (
                    <span className="absolute top-1.5 left-1.5 rounded-full bg-gradient-to-l from-gold to-amber-500 text-navy text-[7px] font-extrabold px-1.5 py-0.5 shadow">الأحدث ✦</span>
                  )}
                  <div className="relative inline-block mb-1.5 mt-1">
                    <div className="absolute inset-0 bg-gold/40 blur-md rounded-full scale-90" />
                    <Avatar className="relative w-11 h-11 rounded-xl border-2 border-gold/60 shadow-md">
                      <AvatarImage src={f.follower?.avatar || ''} />
                      <AvatarFallback className="text-sm font-extrabold bg-gradient-to-br from-navy to-navy-light text-gold rounded-xl">
                        {f.follower?.name?.charAt(0) || '؟'}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <p className="text-xs font-extrabold text-navy truncate">{f.follower?.name || 'متدرب'}</p>
                  <p className="text-[9px] text-muted-foreground mt-0.5 flex items-center justify-center gap-1">
                    <Calendar className="w-2.5 h-2.5" /> منذ {new Date(f.created_at).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })}
                  </p>
                </button>
              ))}
            </div>
          </>
        )}
      </SectionCard>

      {/* ⚡ Magical section — أحدث الدورات */}
      <SectionCard title="أحدث الدورات" description="الدورات التي تدرّسها">
        {courses.length === 0 ? (
          <div className="text-center py-14">
            <div className="relative inline-block mb-4">
              <div className="absolute inset-0 bg-gold/20 rounded-full blur-2xl animate-pulse" />
              <div className="relative w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-navy via-navy-light to-navy flex items-center justify-center shadow-xl border border-gold/30">
                <BookOpen className="w-10 h-10 text-gold" />
              </div>
            </div>
            <h3 className="font-bold text-navy text-base mb-1.5">لا توجد دورات بعد</h3>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">انتقل إلى تبويب "دوراتي التدريبية" لإضافة أول دورة ✨</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 fia-stagger">
            {courses.slice(0, 3).map((c: any) => (
              <Card key={c.id} className="fia-course-card overflow-hidden cursor-default border border-gold/20">
                <div className="relative h-32 overflow-hidden bg-gradient-to-br from-navy via-navy-light to-navy">
                  {c.cover && (
                    <img src={c.cover} alt={c.title} loading="lazy" className="fia-cover-img absolute inset-0 w-full h-full object-cover" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/40 to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-br from-gold/10 via-transparent to-transparent" />
                  <div className="fia-shine" />
                  {c.level && (
                    <Badge className="absolute top-2 right-2 bg-navy/80 text-gold border-gold/30 backdrop-blur-sm">{c.level}</Badge>
                  )}
                </div>
                <div className="relative p-3">
                  <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-l from-gold via-amber-400 to-gold opacity-70" />
                  <h3 className="font-bold text-navy text-sm mb-1 line-clamp-1">{c.title}</h3>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="w-2.5 h-2.5" /> {c.enrolled || 0} متدرب
                    </span>
                    <span className="flex items-center gap-1">
                      <Star className="w-2.5 h-2.5 text-gold fill-current" /> {c.rating || 0}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  )
}

function TrainerCourses({ courses, onAdd, onEdit, onRefresh, onManageContent }: any) {
  const [deleting, setDeleting] = useState<string | null>(null)
  // Course currently awaiting delete confirmation. Null means the dialog is closed.
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)

  const handleDelete = async () => {
    if (!deleteTarget) return
    const id = deleteTarget.id
    setDeleting(id)
    setDeleteTarget(null)
    try {
      const res = await fetch('/api/courses', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (res.ok) {
        toast.success('تم حذف الدورة')
        onRefresh() // ⚡ التحديث بعد نجاح الحذف — كان يُستدعى قبله فتبقى الدورة على الشاشة!
      } else {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error || 'فشل الحذف')
      }
    } catch {
      toast.error('خطأ في الاتصال')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <SectionCard
      title="دوراتي التدريبية"
      description="إدارة الدورات التي تدرّسها"
      action={
        <Button onClick={onAdd} className="bg-navy hover:bg-navy-light rounded-xl">
          <Plus className="w-4 h-4 ml-1" /> دورة جديدة
        </Button>
      }
    >
      {courses.length === 0 ? (
        <div className="text-center py-14">
          <div className="relative inline-block mb-4">
            <div className="absolute inset-0 bg-gold/20 rounded-full blur-2xl animate-pulse" />
            <div className="relative w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-navy via-navy-light to-navy flex items-center justify-center shadow-xl border border-gold/30">
              <BookOpen className="w-10 h-10 text-gold" />
            </div>
          </div>
          <h3 className="font-bold text-navy text-base mb-1.5">لا توجد دورات بعد</h3>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto">اضغط على زر "دورة جديدة" لإضافة أول دورة ✨</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 fia-stagger">
          {courses.map((c: any) => {
            const isFree = c.price_type === 'مجانية' || c.price === 0
            return (
              <Card key={c.id} className="fia-course-card overflow-hidden cursor-default border border-gold/20">
                <div className="relative h-32 overflow-hidden bg-gradient-to-br from-navy via-navy-light to-navy">
                  {c.cover && (
                    <img src={c.cover} alt={c.title} loading="lazy" className="fia-cover-img absolute inset-0 w-full h-full object-cover" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/40 to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-br from-gold/10 via-transparent to-transparent" />
                  <div className="fia-shine" />
                  {c.level && (
                    <Badge className="absolute top-2 right-2 bg-navy/80 text-gold border-gold/30 backdrop-blur-sm">{c.level}</Badge>
                  )}
                  {isFree ? (
                    <Badge className="absolute top-2 left-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white border border-emerald-300/40 backdrop-blur-sm">مجانية</Badge>
                  ) : (
                    <Badge className="absolute top-2 left-2 bg-gradient-to-r from-gold to-amber-500 text-navy border border-gold/40 backdrop-blur-sm">{c.price?.toLocaleString()} {c.currency || 'ر.ي'}</Badge>
                  )}
                </div>
                <div className="relative p-3">
                  <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-l from-gold via-amber-400 to-gold opacity-70" />
                  <h3 className="font-bold text-navy text-sm mb-2 line-clamp-1">{c.title}</h3>
                  <div className="flex justify-between text-[10px] text-muted-foreground mb-3">
                    <span className="flex items-center gap-1">
                      <Users className="w-2.5 h-2.5" /> {c.enrolled || 0} متدرب
                    </span>
                    <span className="flex items-center gap-1">
                      <Star className="w-2.5 h-2.5 text-gold fill-current" /> {c.rating || 0}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <Button size="sm" className="w-full bg-gradient-to-r from-gold to-amber-500 hover:from-amber-500 hover:to-gold text-navy rounded-lg shadow-md active:scale-[0.97] transition-all" onClick={() => onManageContent(c.id)}>
                      <FileText className="w-3.5 h-3.5 ml-1" /> إدارة المحتوى
                    </Button>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1 rounded-lg border-gold/30 hover:border-gold hover:bg-gold/5" onClick={() => onEdit(c)}>
                        <Edit className="w-3.5 h-3.5 ml-1" /> تعديل
                      </Button>
                      <Button size="sm" variant="outline" className="border-red-500/30 text-red-500 hover:bg-red-500/10 rounded-lg" onClick={() => setDeleteTarget(c)} disabled={deleting === c.id}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Professional delete-confirmation card */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open && !deleting) setDeleteTarget(null) }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              تأكيد الحذف
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <div className="flex items-start gap-3 p-3 bg-red-500/5 border border-red-500/20 rounded-lg">
              <Trash2 className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground mb-1">سيتم حذف الدورة التالية:</div>
                <div className="font-bold text-navy line-clamp-2 break-words">{deleteTarget?.title}</div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              هل أنت متأكد من الحذف؟ لا يمكن التراجع عن هذا الإجراء.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={!!deleting}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleDelete}
              disabled={!!deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting
                ? <><Loader2 className="w-4 h-4 ml-1 animate-spin" /> جاري الحذف...</>
                : <><Trash2 className="w-4 h-4 ml-1" /> حذف الدورة</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SectionCard>
  )
}

function CourseDialog({ open, onOpenChange, course, trainerId, onSaved }: any) {
  const [form, setForm] = useState<any>(
    course || {
      title: '',
      short_description: '',
      description: '',
      level: 'متوسط',
      price_type: 'مجانية',
      price: 0,
      currency: 'ر.ي',
      duration_hours: 0,
      pass_score: 60,
      cover: '',
      status: 'منشورة',
    }
  )
  const [saving, setSaving] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)

  // Keep the form in sync with the `course` prop whenever the dialog opens or
  // the course being edited changes. Without this, a dialog that stays mounted
  // across course switches would show stale state (and could overwrite the
  // wrong course's `cover` field).
  useEffect(() => {
    if (open) {
      setForm(
        course || {
          title: '',
          short_description: '',
          description: '',
          level: 'متوسط',
          price_type: 'مجانية',
          price: 0,
          currency: 'ر.ي',
          duration_hours: 0,
          pass_score: 60,
          cover: '',
          status: 'منشورة',
        }
      )
    }
  }, [open, course])

  const handleUploadCover = async (file: File) => {
    setUploadingCover(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('folder', 'courses')
      const res = await fetch('/api/upload/image', { method: 'POST', body: fd })
      const data = await res.json().catch(() => ({}))
      if (data.url) {
        // Store the Telegram-hosted URL on form.cover — it is later persisted
        // to the courses.cover column by the save() call below.
        setForm((prev: any) => ({ ...prev, cover: data.url }))
        toast.success('تم رفع صورة الغلاف')
      } else {
        toast.error('فشل رفع الصورة: ' + (data.error || ''))
      }
    } catch {
      toast.error('خطأ في الاتصال')
    } finally {
      setUploadingCover(false)
    }
  }

  const save = async () => {
    if (!form.title) {
      toast.error('أدخل عنوان الدورة')
      return
    }
    setSaving(true)
    try {
      const slug = form.title.toLowerCase().replace(/\s+/g, '-').slice(0, 80)
      // Build the payload. Always include `cover` (string URL or null) so the
      // courses.cover column is updated on every save — even when the trainer
      // cleared the field.
      const body: any = {
        title: form.title,
        short_description: form.short_description ?? '',
        description: form.description ?? '',
        level: form.level,
        price_type: form.price_type,
        price: Number(form.price) || 0,
        currency: form.currency || 'ر.ي',
        duration_hours: Number(form.duration_hours) || 0,
        pass_score: Number(form.pass_score) || 60,
        status: form.status || 'منشورة',
        cover: form.cover ?? null,
        slug,
        trainer_id: trainerId,
        modules_count: form.modules_count || 0,
        lessons_count: form.lessons_count || 0,
      }
      const res = await fetch('/api/courses', {
        method: course ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(course ? { id: course.id, ...body } : body),
      })
      if (res.ok) {
        toast.success(course ? 'تم تحديث الدورة' : 'تم إنشاء الدورة')
        // After a successful create/update, fire-and-forget a publish to the
        // Telegram channel associated with the bot. Non-blocking: any error
        // is swallowed via .catch(() => {}) so the trainer UI stays responsive.
        const data = await res.json().catch(() => null)
        const savedCourseId = data?.id || course?.id
        if (savedCourseId) {
          fetch('/api/telegram-publish', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              course_id: savedCourseId,
              action: course ? 'update' : 'create',
            }),
          }).catch(() => {})
        }
        onSaved()
      } else {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error || 'فشل الحفظ')
      }
    } catch {
      toast.error('خطأ')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{course ? 'تعديل الدورة' : 'دورة جديدة'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label>عنوان الدورة</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1" />
          </div>
          <div>
            <Label>وصف مختصر</Label>
            <Input value={form.short_description || ''} onChange={(e) => setForm({ ...form, short_description: e.target.value })} className="mt-1" />
          </div>
          <div>
            <Label>الوصف الكامل</Label>
            <Textarea value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>المستوى</Label>
              <LuxSelect value={form.level} onChange={(v) => setForm({ ...form, level: v })} title="مستوى الدورة" icon={BookOpen}
                options={[
                  { value: 'مبتدئ', label: 'مبتدئ', emoji: '🌱' },
                  { value: 'متوسط', label: 'متوسط', emoji: '📈' },
                  { value: 'متقدم', label: 'متقدم', emoji: '🏆' },
                ]} />
            </div>
            <div>
              <Label>السعر</Label>
              <LuxSelect value={form.price_type} onChange={(v) => setForm({ ...form, price_type: v })} title="نوع الدورة" icon={Coins}
                options={[
                  { value: 'مجانية', label: 'مجانية', emoji: '🎁' },
                  { value: 'مدفوعة', label: 'مدفوعة', emoji: '💳' },
                ]} />
            </div>
          </div>
          {form.price_type === 'مدفوعة' && (
            <div>
              <Label>المبلغ</Label>
              <Input type="number" value={form.price || ''} onChange={(e) => setForm({ ...form, price: e.target.value === '' ? 0 : parseInt(e.target.value) || 0 })} className="mt-1" dir="ltr" placeholder="0" />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>عدد الساعات</Label>
              <Input type="number" value={form.duration_hours || ''} onChange={(e) => setForm({ ...form, duration_hours: e.target.value === '' ? 0 : parseInt(e.target.value) || 0 })} className="mt-1" dir="ltr" placeholder="0" />
            </div>
            <div>
              <Label>درجة النجاح (%)</Label>
              <Input type="number" value={form.pass_score ?? 60} onChange={(e) => setForm({ ...form, pass_score: e.target.value === '' ? 60 : parseInt(e.target.value) || 60 })} className="mt-1" dir="ltr" placeholder="60" />
            </div>
          </div>
          <div>
            <Label>صورة الغلاف</Label>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              {form.cover ? (
                <div className="relative w-16 h-16 rounded-md overflow-hidden border border-border">
                  <img src={form.cover} alt="cover" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, cover: '' })}
                    className="absolute top-0 right-0 bg-red-500 text-white rounded-bl-md p-0.5"
                    title="إزالة الصورة"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="w-16 h-16 rounded-md border border-dashed border-border bg-muted/30 flex items-center justify-center text-muted-foreground/40">
                  <FileUp className="w-5 h-5" />
                </div>
              )}
              <label className="cursor-pointer">
                <Button
                  variant="outline"
                  type="button"
                  disabled={uploadingCover}
                  onClick={() => document.getElementById('cover-upload')?.click()}
                >
                  {uploadingCover ? <Loader2 className="w-4 h-4 ml-1 animate-spin" /> : <FileUp className="w-4 h-4 ml-1" />}
                  {uploadingCover ? 'جاري الرفع...' : form.cover ? 'تغيير الصورة' : 'رفع صورة'}
                </Button>
                <input
                  id="cover-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadCover(f); e.target.value = '' }}
                />
              </label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button onClick={save} disabled={saving} className="bg-navy hover:bg-navy-light">
            {saving ? 'جاري الحفظ...' : 'حفظ'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function TrainerStudents({ students, courses }: any) {
  const [enrollments, setEnrollments] = useState<any[]>([])
  const [enrollmentsLoaded, setEnrollmentsLoaded] = useState(false)
  // 👑 العرش الملكي: عرض حسب الدورة مع أشرطة التقدم الحية + النداء الجماعي
  const [view, setView] = useState<'cards' | 'courses'>('courses')
  const [courseRosters, setCourseRosters] = useState<any[]>([])
  const [rostersLoaded, setRostersLoaded] = useState(false)
  const [broadcastOpen, setBroadcastOpen] = useState(false)
  const [broadcastCourse, setBroadcastCourse] = useState<string>('all')
  const [bcTitle, setBcTitle] = useState('')
  const [bcMessage, setBcMessage] = useState('')
  const [bcLoading, setBcLoading] = useState(false)

  const loadRosters = useCallback(() => {
    fetch('/api/trainer/students').then((r) => r.json()).then((d) => {
      setCourseRosters(Array.isArray(d?.courses) ? d.courses : [])
      setRostersLoaded(true)
    }).catch(() => setRostersLoaded(true))
  }, [])

  useEffect(() => {
    fetch('/api/enrollments').then((r) => r.json()).then((d) => {
      const all = Array.isArray(d) ? d : []
      // Filter to ONLY enrollments in this trainer's courses
      const trainerCourseIds = courses.map((c: any) => c.id)
      const mine = all.filter((e: any) => trainerCourseIds.includes(e.course_id))
      setEnrollments(mine)
      setEnrollmentsLoaded(true)
    }).catch(() => setEnrollmentsLoaded(true))
    loadRosters()
  }, [courses, loadRosters])

  // Helper: get all enrollments for a student
  const studentEnrollments = (studentId: string) => enrollments.filter((e) => e.user_id === studentId)

  // Filter students to ONLY those enrolled in at least one of this trainer's courses.
  const enrolledStudentIds = new Set(enrollments.map((e: any) => e.user_id))
  const filteredStudents = students.filter((s: any) => enrolledStudentIds.has(s.id))

  const totalStudents = courseRosters.reduce((a: number, c: any) => a + c.students_count, 0)
  const totalCompleted = courseRosters.reduce((a: number, c: any) => a + c.completed_count, 0)

  const sendBroadcast = async () => {
    if (!bcTitle.trim() || !bcMessage.trim()) {
      toast.error('العنوان والرسالة مطلوبان')
      return
    }
    setBcLoading(true)
    try {
      const res = await fetch('/api/trainer/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ course_id: broadcastCourse, title: bcTitle, message: bcMessage }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'فشل البث')
        return
      }
      toast.success(`📣 وصل نداؤك إلى ${data.delivered} طالباً`)
      setBroadcastOpen(false)
      setBcTitle('')
      setBcMessage('')
    } catch {
      toast.error('خطأ في الاتصال')
    } finally {
      setBcLoading(false)
    }
  }

  return (
    <SectionCard
      title="متدربوّ"
      description={`${totalStudents || filteredStudents.length} متدرب${(totalStudents || filteredStudents.length) === 1 ? '' : 'ين'} — ${totalCompleted} أتم دوراته`}
    >
      {/* 👑 مبدّل العرض الملكي + زر النداء الجماعي */}
      {courses.length > 0 && enrollmentsLoaded && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="flex rounded-xl border border-gold/30 overflow-hidden">
            <button
              onClick={() => setView('courses')}
              className={`px-3 py-1.5 text-xs font-bold transition-all ${view === 'courses' ? 'bg-gradient-to-r from-navy to-navy-light text-gold' : 'bg-white text-navy/60 hover:text-navy'}`}
            >
              <BookOpen className="w-3.5 h-3.5 inline ml-1" /> حسب الدورة
            </button>
            <button
              onClick={() => setView('cards')}
              className={`px-3 py-1.5 text-xs font-bold transition-all ${view === 'cards' ? 'bg-gradient-to-r from-navy to-navy-light text-gold' : 'bg-white text-navy/60 hover:text-navy'}`}
            >
              <Users className="w-3.5 h-3.5 inline ml-1" /> بطاقات المتدربين
            </button>
          </div>
          <Button
            size="sm"
            onClick={() => { setBroadcastCourse('all'); setBcTitle(''); setBcMessage(''); setBroadcastOpen(true) }}
            className="bg-gradient-to-r from-gold to-amber-600 hover:from-amber-600 hover:to-gold text-navy rounded-xl font-bold shadow-md"
          >
            <Sparkles className="w-4 h-4 ml-1" /> نداء جماعي
          </Button>
        </div>
      )}

      {courses.length === 0 ? (
        /* ⚡ Magical empty state — no courses */
        <div className="text-center py-14">
          <div className="relative inline-block mb-4">
            <div className="absolute inset-0 bg-gold/20 rounded-full blur-2xl animate-pulse" />
            <div className="relative w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-navy via-navy-light to-navy flex items-center justify-center shadow-xl border border-gold/30">
              <BookOpen className="w-10 h-10 text-gold" />
            </div>
          </div>
          <h3 className="font-bold text-navy text-base mb-1.5">لا يوجد متدربون بعد</h3>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto">أنشئ دورة أولاً ليتمكن المتدربون من التسجيل فيها ✨</p>
        </div>
      ) : !enrollmentsLoaded || !rostersLoaded ? (
        /* ⚡ Magical loading state */
        <div className="text-center py-14">
          <div className="relative inline-block mb-3">
            <div className="absolute inset-0 bg-gold/20 rounded-full blur-2xl animate-pulse" />
            <Loader2 className="relative w-10 h-10 mx-auto animate-spin text-gold" />
          </div>
          <p className="text-sm text-muted-foreground">جاري تحميل المتدربين...</p>
        </div>
      ) : view === 'courses' ? (
        /* 👑 العرض الملكي حسب الدورة — سجل حي بأشرطة التقدم */
        courseRosters.length === 0 || courseRosters.every((c: any) => c.students_count === 0) ? (
          <div className="text-center py-14">
            <div className="relative inline-block mb-4">
              <div className="absolute inset-0 bg-gold/20 rounded-full blur-2xl animate-pulse" />
              <div className="relative w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-navy via-navy-light to-navy flex items-center justify-center shadow-xl border border-gold/30">
                <Users className="w-10 h-10 text-gold" />
              </div>
            </div>
            <h3 className="font-bold text-navy text-base mb-1.5">لا يوجد متدربون في دوراتك بعد</h3>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">عندما يسجّل متدربون في دوراتك سيظهرون هنا بأشرطة تقدمهم الحية ✨</p>
          </div>
        ) : (
          <div className="space-y-4">
            {courseRosters.filter((c: any) => c.students_count > 0).map((c: any) => (
              <div key={c.course_id} className="rounded-2xl border border-gold/25 overflow-hidden bg-white shadow-sm">
                {/* رأس الدورة */}
                <div className="relative flex flex-wrap items-center gap-2 p-3 bg-gradient-to-l from-navy to-navy-light text-white">
                  <div className="absolute inset-0 opacity-15" style={{ backgroundImage: 'radial-gradient(circle at 80% 30%, #D4AF37 1px, transparent 1px)', backgroundSize: '14px 14px' }} />
                  <BookOpen className="relative w-4 h-4 text-gold" />
                  <span className="relative font-bold text-sm flex-1 min-w-0 truncate">{c.course_title}</span>
                  <span className="relative text-[10px] bg-white/10 border border-white/20 rounded-full px-2 py-0.5">{c.students_count} طالب</span>
                  {c.completed_count > 0 && (
                    <span className="relative text-[10px] bg-emerald-500/20 border border-emerald-300/30 text-emerald-200 rounded-full px-2 py-0.5">{c.completed_count} أتم</span>
                  )}
                  {c.pending_count > 0 && (
                    <span className="relative text-[10px] bg-amber-500/20 border border-amber-300/30 text-amber-200 rounded-full px-2 py-0.5">{c.pending_count} بانتظار</span>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setBroadcastCourse(c.course_id); setBcTitle(''); setBcMessage(''); setBroadcastOpen(true) }}
                    className="relative h-7 text-[10px] border-gold/40 text-gold hover:bg-gold/10"
                  >
                    <Sparkles className="w-3 h-3 ml-1" /> نداء طلابها
                  </Button>
                </div>
                {/* طلاب الدورة */}
                <div className="divide-y divide-border/40">
                  {c.students.map((s: any) => (
                    <div key={s.user_id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-gold/5 transition-colors">
                      <div className="w-9 h-9 rounded-xl overflow-hidden border border-gold/30 bg-navy/5 flex-shrink-0">
                        {s.avatar ? (
                          <img src={s.avatar} alt={s.name} className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-navy font-bold bg-gradient-to-br from-gold/15 to-amber-500/15">
                            {s.name?.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-navy truncate">{s.name}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-bold flex-shrink-0 ${
                            s.progress >= 100 ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30'
                            : s.status === 'بانتظار' ? 'bg-amber-500/10 text-amber-700 border-amber-500/30'
                            : 'bg-blue-500/10 text-blue-700 border-blue-500/30'
                          }`}>
                            {s.progress >= 100 ? 'أتم الدورة' : s.status === 'بانتظار' ? 'بانتظار الموافقة' : 'قيد التعلّم'}
                          </span>
                        </div>
                        {/* شريط التقدم الحي */}
                        <div className="mt-1 h-1.5 rounded-full bg-muted/60 overflow-hidden max-w-xs">
                          <div
                            className={`h-full rounded-full transition-all ${s.progress >= 100 ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-gradient-to-r from-gold to-amber-500'}`}
                            style={{ width: `${s.progress}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-left flex-shrink-0">
                        <div className="text-xs font-extrabold text-navy" dir="ltr">{s.progress}%</div>
                        <div className="text-[9px] text-muted-foreground">{s.enrolled_at ? new Date(s.enrolled_at).toLocaleDateString('ar-EG') : ''}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )
      ) : filteredStudents.length === 0 ? (
        /* ⚡ Magical empty state — no enrollments */
        <div className="text-center py-14">
          <div className="relative inline-block mb-4">
            <div className="absolute inset-0 bg-gold/20 rounded-full blur-2xl animate-pulse" />
            <div className="relative w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-navy via-navy-light to-navy flex items-center justify-center shadow-xl border border-gold/30">
              <Users className="w-10 h-10 text-gold" />
            </div>
          </div>
          <h3 className="font-bold text-navy text-base mb-1.5">لا يوجد متدربون في دوراتك بعد</h3>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto">عندما يسجّل متدربون في دوراتك سيظهرون هنا ✨</p>
        </div>
      ) : (
        /* ⚡ Magical student cards — 2/3/4 grid with compact design */
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 fia-stagger">
          {filteredStudents.map((s: any) => {
            const studentEnrs = studentEnrollments(s.id)
            const completedCount = studentEnrs.filter((e) => e.status === 'completed' || e.status === 'مكتمل').length
            const pendingCount = studentEnrs.filter((e) => e.payment_status === 'pending').length
            return (
              <Card key={s.id} className="fia-card-hover p-0 overflow-hidden cursor-default border border-gold/20">
                {/* ⚡ Magical header — navy gradient + gold dots */}
                <div className="relative p-3 bg-gradient-to-br from-navy via-navy-light to-navy text-white overflow-hidden">
                  <div className="absolute inset-0 opacity-20" style={{
                    backgroundImage: 'radial-gradient(circle at 20% 20%, #D4AF37 1px, transparent 1px)',
                    backgroundSize: '12px 12px'
                  }} />
                  <div className="absolute -top-4 -left-4 w-12 h-12 bg-gold/15 rounded-full blur-xl" />
                  <div className="relative flex items-center gap-2.5">
                    <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-gold/40 bg-navy-light shadow-md flex-shrink-0">
                      {s.avatar ? (
                        <img src={s.avatar} alt={s.name} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gold font-bold text-xl bg-gradient-to-br from-gold/20 to-amber-500/20">
                          {s.name?.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-xs truncate text-white">{s.name}</div>
                      <div className="text-[10px] text-white/70 truncate" dir="ltr">{s.email}</div>
                    </div>
                  </div>
                </div>

                {/* ⚡ Magical body — compact stats + courses preview */}
                <div className="p-3 space-y-2.5">
                  {/* Stats row — mini badges */}
                  <div className="flex items-center gap-1.5">
                    <div className="flex-1 flex items-center gap-1 bg-blue-50 text-blue-700 rounded-lg px-2 py-1.5 border border-blue-200/40">
                      <BookOpen className="w-3 h-3 flex-shrink-0" />
                      <span className="text-[10px] font-bold">{studentEnrs.length} دورة</span>
                    </div>
                    {completedCount > 0 && (
                      <div className="flex items-center gap-1 bg-emerald-50 text-emerald-700 rounded-lg px-2 py-1.5 border border-emerald-200/40">
                        <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
                        <span className="text-[10px] font-bold">{completedCount}</span>
                      </div>
                    )}
                    {pendingCount > 0 && (
                      <div className="flex items-center gap-1 bg-amber-50 text-amber-700 rounded-lg px-2 py-1.5 border border-amber-200/40">
                        <Clock className="w-3 h-3 flex-shrink-0" />
                        <span className="text-[10px] font-bold">{pendingCount}</span>
                      </div>
                    )}
                  </div>

                  {/* Phone + date row */}
                  <div className="grid grid-cols-1 gap-1 text-[10px]">
                    {s.phone && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Mail className="w-2.5 h-2.5" />
                        <span dir="ltr" className="font-medium text-navy">{s.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Calendar className="w-2.5 h-2.5" />
                      <span className="font-medium text-navy">{s.created_at ? new Date(s.created_at).toLocaleDateString('ar-EG') : '-'}</span>
                    </div>
                  </div>

                  {/* Course preview — first 2 courses */}
                  {studentEnrs.length > 0 && (
                    <div className="space-y-1 pt-1 border-t border-border/40">
                      {studentEnrs.slice(0, 2).map((e) => {
                        const course = courses?.find((c: any) => c.id === e.course_id)
                        if (!course) return null
                        const isFree = course.price_type === 'مجانية' || course.price === 0
                        const isCompleted = e.status === 'completed' || e.status === 'مكتمل'
                        const isPending = e.payment_status === 'pending'
                        return (
                          <div key={e.id} className="text-[10px] flex items-center justify-between gap-1 bg-muted/20 rounded px-1.5 py-1">
                            <span className="truncate text-navy font-medium">{course.title}</span>
                            <span className={`flex-shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              isCompleted ? 'bg-emerald-500/15 text-emerald-700 border border-emerald-500/30'
                              : isPending ? 'bg-amber-500/15 text-amber-700 border border-amber-500/30'
                              : 'bg-blue-500/15 text-blue-700 border border-blue-500/30'
                            }`}>
                              {isCompleted ? 'مكتمل' : isPending ? 'بانتظار' : 'قيد التعلّم'}
                            </span>
                          </div>
                        )
                      })}
                      {studentEnrs.length > 2 && <div className="text-[10px] text-muted-foreground text-center">+{studentEnrs.length - 2} دورة أخرى</div>}
                    </div>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* 👑 حوار النداء الجماعي الملكي */}
      <Dialog open={broadcastOpen} onOpenChange={setBroadcastOpen}>
        <DialogContent className="sm:max-w-md p-0 border-0 overflow-hidden rounded-3xl shadow-2xl">
          <div className="relative bg-gradient-to-br from-navy via-navy-light to-navy px-5 pt-5 pb-5 text-center overflow-hidden">
            <div className="absolute inset-0 opacity-20" style={{
              backgroundImage: 'radial-gradient(circle at 20% 40%, #D4AF37 1.5px, transparent 1.5px)',
              backgroundSize: '22px 22px'
            }} />
            <div className="relative w-14 h-14 mx-auto rounded-2xl bg-white/10 border border-gold/30 flex items-center justify-center mb-2">
              <Sparkles className="w-7 h-7 text-gold" />
            </div>
            <DialogHeader className="border-0 bg-transparent p-0 text-center items-center">
              <DialogTitle className="text-white text-xl font-bold">النداء الجماعي</DialogTitle>
            </DialogHeader>
            <p className="relative text-white/70 text-xs mt-1">رسالة تصل لجرس كل طالب مستهدف فوراً مع إشعار جوال</p>
          </div>
          <div className="p-5 bg-gradient-to-b from-navy/5 to-white space-y-4">
            <div>
              <Label className="text-navy font-medium mb-1.5 block">النطاق المستهدف</Label>
              <LuxSelect value={broadcastCourse} onChange={setBroadcastCourse} title="النطاق المستهدف للرسالة" icon={Send}
                options={[
                  { value: 'all', label: `جميع طلاب دوراتي (${courseRosters.reduce((a: number, c: any) => a + c.students_count, 0)})`, emoji: '📣' },
                  ...courseRosters.filter((c: any) => c.students_count > 0).map((c: any) => ({ value: c.course_id, label: `${c.course_title} — ${c.students_count} طالب`, emoji: '📖' })),
                ]} />
            </div>
            <div>
              <Label className="text-navy font-medium mb-1.5 block">عنوان الرسالة</Label>
              <Input
                value={bcTitle}
                onChange={(e) => setBcTitle(e.target.value)}
                placeholder="مثال: درس جديد أُضيف إلى الدورة 🎬"
                className="rounded-xl border-gold/30 focus:border-gold focus:ring-gold/30"
                maxLength={120}
              />
            </div>
            <div>
              <Label className="text-navy font-medium mb-1.5 block">نص الرسالة</Label>
              <Textarea
                value={bcMessage}
                onChange={(e) => setBcMessage(e.target.value)}
                placeholder="اكتب نداءك لطلابك…"
                rows={4}
                className="rounded-xl border-gold/30 focus:border-gold focus:ring-gold/30"
                maxLength={800}
              />
              <div className="text-[10px] text-muted-foreground mt-1 text-left" dir="ltr">{bcMessage.length}/800</div>
            </div>
            <Button
              onClick={sendBroadcast}
              disabled={bcLoading}
              className="fia-lux-shine w-full bg-gradient-to-r from-navy to-navy-light hover:from-navy-light hover:to-navy text-gold rounded-xl shadow-md active:scale-[0.97] transition-all border border-gold/30 h-11"
            >
              {bcLoading ? <Loader2 className="w-4 h-4 ml-1 animate-spin" /> : <Sparkles className="w-4 h-4 ml-1" />}
              {bcLoading ? 'جاري بث النداء...' : 'أرسل النداء'}
            </Button>
            <p className="text-[10px] text-muted-foreground text-center">يصل الإشعار لطلاب التسجيلات المؤكدة والمجانية فقط — بحد 8 رسائل في الساعة حفاظاً على استقرار المنظومة</p>
          </div>
        </DialogContent>
      </Dialog>
    </SectionCard>
  )
}

function TrainerExams({ courses }: { courses: any[] }) {
  const [loading, setLoading] = useState(true)
  const [exams, setExams] = useState<any[]>([])

  useEffect(() => {
    let cancelled = false
    const loadExams = async () => {
      if (!courses || courses.length === 0) {
        setExams([])
        setLoading(false)
        return
      }
      setLoading(true)
      try {
        // Fetch lessons for each course in parallel
        const results = await Promise.all(
          courses.map(async (c) => {
            try {
              const res = await fetch(`/api/lessons?course_id=${c.id}`)
              const data = await res.json()
              const lessons = Array.isArray(data) ? data : []
              // Filter exam-type lessons only
              return lessons
                .filter((l: any) => l.lesson_type === 'exam')
                .map((l: any) => {
                  // Parse question count from content JSON
                  let questions: any[] = []
                  if (l.content) {
                    try {
                      const parsed = JSON.parse(l.content)
                      if (Array.isArray(parsed)) questions = parsed
                    } catch {}
                  }
                  return {
                    ...l,
                    course_id: c.id,
                    course_title: c.title,
                    course_pass_score: c.pass_score,
                    questions_count: questions.length,
                    questions,
                  }
                })
            } catch {
              return []
            }
          })
        )
        if (cancelled) return
        const flat = results.flat()
        setExams(flat)
      } catch {
        if (!cancelled) setExams([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadExams()
    return () => { cancelled = true }
  }, [courses])

  const totalQuestions = exams.reduce((acc, e) => acc + (e.questions_count || 0), 0)
  const totalCoursesWithExams = new Set(exams.map((e) => e.course_id)).size

  return (
    <div className="space-y-6">
      {/* ⚡ Magical StatCards row */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 fia-stagger">
        <StatCard icon={FileText}    label="الاختبارات"          value={exams.length}             color="blue"  />
        <StatCard icon={HelpCircle}  label="إجمالي الأسئلة"      value={totalQuestions}           color="navy"  />
        <StatCard icon={BookOpen}    label="دورات بها اختبارات" value={totalCoursesWithExams}    color="gold"  />
      </div>

      <SectionCard
        title="الاختبارات"
        description="الاختبارات المستندة إلى محتوى دوراتك التدريبية"
      >
        {loading ? (
          /* ⚡ Magical loading state */
          <div className="text-center py-14">
            <div className="relative inline-block mb-3">
              <div className="absolute inset-0 bg-gold/20 rounded-full blur-2xl animate-pulse" />
              <Loader2 className="relative w-10 h-10 mx-auto animate-spin text-gold" />
            </div>
            <p className="text-sm text-muted-foreground">جاري تحميل الاختبارات...</p>
          </div>
        ) : exams.length === 0 ? (
          /* ⚡ Magical empty state */
          <div className="text-center py-14">
            <div className="relative inline-block mb-4">
              <div className="absolute inset-0 bg-gold/20 rounded-full blur-2xl animate-pulse" />
              <div className="relative w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-navy via-navy-light to-navy flex items-center justify-center shadow-xl border border-gold/30">
                <FileText className="w-10 h-10 text-gold" />
              </div>
            </div>
            <h3 className="font-bold text-navy text-base mb-1.5">لا توجد اختبارات بعد</h3>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto mb-4">
              أنشئ دروساً من نوع "اختبار" في محتوى دوراتك لتظهر هنا ✨
            </p>
          </div>
        ) : (
          /* ⚡ Magical exam cards — 2/3/4 grid */
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 fia-stagger">
            {exams.map((exam) => (
              <Card key={exam.id} className="fia-card-hover p-0 overflow-hidden cursor-default border border-gold/20 hover:border-gold/40">
                {/* ⚡ Magical header — purple gradient with dot pattern */}
                <div className="relative p-3 bg-gradient-to-br from-purple-600 via-purple-700 to-fuchsia-700 text-white overflow-hidden">
                  <div className="absolute inset-0 opacity-20" style={{
                    backgroundImage: 'radial-gradient(circle at 20% 20%, white 1px, transparent 1px)',
                    backgroundSize: '12px 12px'
                  }} />
                  <div className="absolute -top-4 -right-4 w-12 h-12 bg-white/15 rounded-full blur-xl" />
                  <div className="relative">
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-9 h-9 rounded-lg bg-white/15 backdrop-blur-sm border border-white/30 flex items-center justify-center shadow-md">
                        <HelpCircle className="w-5 h-5 text-white" />
                      </div>
                      <Badge className="bg-white/15 text-white border border-white/30 backdrop-blur-sm text-[10px]">
                        {exam.questions_count} سؤال
                      </Badge>
                    </div>
                    <h3 className="font-bold text-white text-xs line-clamp-2 leading-tight">{exam.title}</h3>
                  </div>
                </div>

                {/* ⚡ Magical body — exam details */}
                <div className="p-3 space-y-2">
                  <div className="pt-1 border-t border-border/40">
                    <div className="text-[9px] text-muted-foreground mb-0.5 flex items-center gap-1">
                      <BookOpen className="w-2.5 h-2.5 text-gold/60" /> الدورة
                    </div>
                    <div className="text-[10px] text-navy font-bold line-clamp-2 leading-tight">{exam.course_title}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/40">
                    <div>
                      <div className="text-[9px] text-muted-foreground mb-0.5">درجة النجاح</div>
                      <Badge variant="outline" className="text-[9px] font-bold">{exam.course_pass_score || 60}%</Badge>
                    </div>
                    <div>
                      <div className="text-[9px] text-muted-foreground mb-0.5">المدة</div>
                      <div className="text-[10px] font-bold text-navy">
                        {exam.duration_minutes ? `${exam.duration_minutes} دقيقة` : 'غير محدد'}
                      </div>
                    </div>
                  </div>
                  {exam.is_preview && (
                    <div className="pt-1 border-t border-border/40">
                      <Badge variant="outline" className="text-[9px] w-full justify-center bg-gold/10 text-gold border-gold/30">
                        <Eye className="w-3 h-3 ml-1" /> معاينة مجانية
                      </Badge>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  )
}

function TrainerProfile({ profile, setProfile, user, updateUser, refreshProfile }: any) {
  // 🔒 v6.6 — المسمى الوظيفي والتخصص حقلا رسميان للإدارة فقط: يعرضان مقفلين
  //    (قراءة فقط) في ملف المدرب — لا قوائم اختيار هنا بعد الآن.
  const [loading, setLoading] = useState(false)

  const save = async () => {
    setLoading(true)
    try {
      // 👑 الحفظ الملكي الآمن: مسار مخصص للمدرب — يعدّل ملفه هو فقط
      //    (الهاتف/النبذة) — الاسم مغلّف ملكياً وللإدارة وحدها.
      // 🔒 v6.6: المسمى الوظيفي والتخصص مغلّقان تماماً — يُعدّلان من حساب
      //    الإدارة فقط («المدربون» → تعديل المدرب) — لا يُرسلان من هنا أصلاً.
      const res = await fetch('/api/trainers/self-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: profile.phone,
          bio: profile.bio,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'فشل التحديث')
        return
      }
      // Sync local auth-store with the saved DB record so other components
      // (overview header, etc.) reflect the new values immediately.
      updateUser({
        phone: data.profile?.phone ?? profile.phone,
        title: data.profile?.title ?? profile.title,
        bio: data.profile?.bio ?? profile.bio,
      })
      toast.success('تم تحديث الملف الشخصي بنجاح')
    } catch {
      toast.error('فشل التحديث')
    } finally {
      setLoading(false)
    }
  }

  const handleAvatarUploaded = async (url: string) => {
    // The /api/upload/avatar route already persists the URL to the DB.
    // We just need to keep auth-store + profile state in sync and re-fetch
    // the canonical record so everything (avatar included) matches the DB.
    updateUser({ avatar: url })
    setProfile((p: any) => ({ ...p, avatar: url }))
    if (refreshProfile) {
      try { await refreshProfile() } catch { /* silent */ }
    }
  }

  return (
    <SectionCard title="الملف الشخصي" description="إدارة معلوماتك — كل التعديلات تُحفظ مباشرة في قاعدة البيانات وتظهر فوراً في حساب الإدارة والصفحة الرئيسية">
      <div className="space-y-6 max-w-3xl">
        {/* ⚡ Magical avatar section with gold gradient + dot pattern */}
        <div className="relative flex flex-col items-center gap-4 p-6 rounded-2xl border border-gold/30 bg-gradient-to-br from-navy via-navy-light to-navy overflow-hidden">
          <div className="absolute inset-0 opacity-25" style={{
            backgroundImage: 'radial-gradient(circle at 12% 50%, #D4AF37 1.5px, transparent 1.5px), radial-gradient(circle at 88% 50%, white 1px, transparent 1px)',
            backgroundSize: '24px 24px, 18px 18px'
          }} />
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-gold/15 rounded-full blur-2xl" />
          <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-gold/10 rounded-full blur-2xl" />
          <div className="relative">
            <AvatarUploader
              userId={user.id}
              role="trainer"
              initialUrl={profile.avatar || user?.avatar}
              name={profile.name}
              size="xl"
              onUploaded={handleAvatarUploaded}
            />
          </div>
          <div className="relative text-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold/15 border border-gold/30 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-gold" />
              <span className="text-[11px] font-bold text-gold">صورة المدرب الرسمية</span>
            </div>
            <p className="text-xs text-white/70 max-w-xs">تظهر في حساب الإدارة والصفحة الرئيسية</p>
          </div>
        </div>

        {/* ⚡ Magical form fields card */}
        <div className="relative p-5 rounded-2xl border border-gold/30 bg-gradient-to-br from-white to-gold/5 overflow-hidden">
          <div className="absolute -top-4 -right-4 w-16 h-16 bg-gold/15 rounded-full blur-xl" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-navy to-navy-light flex items-center justify-center">
                <User className="w-4 h-4 text-gold" />
              </div>
              <h3 className="font-bold text-navy text-sm">المعلومات الأساسية</h3>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-bold text-navy flex items-center gap-1.5 mb-1.5">
                  <User className="w-3.5 h-3.5 text-gold" /> الاسم الكامل
                </Label>
                <Input
                  value={profile.name}
                  disabled
                  readOnly
                  className="rounded-xl border-gold/20 bg-gray-50/80 text-muted-foreground cursor-not-allowed select-none"
                />
                <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-gold" />
                  الاسم مقفل — يُعدّل من إدارة الأكاديمية فقط (لضمان صحة الشهادات)
                </p>
              </div>
              <div>
                <Label className="text-xs font-bold text-navy flex items-center gap-1.5 mb-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-gold" /> التخصص
                </Label>
                {/* 🔒 v6.6 — التخصص مغلّق: يراه المدرب ولا يعدّله — للإدارة وحدها الحق */}
                <div className="relative">
                  <Input
                    value={profile.specialization || '— لم يحدده الإدارة بعد —'}
                    disabled
                    readOnly
                    className="rounded-xl border-gold/25 bg-gradient-to-l from-gold/[0.06] to-gray-50/80 text-muted-foreground cursor-not-allowed select-none pl-9"
                  />
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gold/70" />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-gold" />
                  يُعدّل من إدارة الأكاديمية فقط
                </p>
              </div>
              <div>
                <Label className="text-xs font-bold text-navy flex items-center gap-1.5 mb-1.5">
                  <Mail className="w-3.5 h-3.5 text-gold" /> البريد الإلكتروني
                </Label>
                <Input
                  value={user?.email || ''}
                  disabled
                  dir="ltr"
                  className="rounded-xl border-gold/20 bg-muted/40"
                />
              </div>
              <div>
                <Label className="text-xs font-bold text-navy flex items-center gap-1.5 mb-1.5">
                  <Phone className="w-3.5 h-3.5 text-gold" /> الهاتف
                </Label>
                <Input
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  dir="ltr"
                  className="rounded-xl border-gold/30 focus:border-gold focus:ring-gold/30"
                />
              </div>
            </div>
            <div className="mt-4">
              <Label className="text-xs font-bold text-navy flex items-center gap-1.5 mb-1.5">
                <Award className="w-3.5 h-3.5 text-gold" /> المسمى الوظيفي
              </Label>
              {/* 🔒 v6.6 — المسمى الوظيفي مغلّق: رسمي ويوثّقه الأكاديمي — للإدارة وحدها */}
              <div className="relative">
                <Input
                  value={profile.title || '— لم يحدده الإدارة بعد —'}
                  disabled
                  readOnly
                  className="rounded-xl border-gold/25 bg-gradient-to-l from-gold/[0.06] to-gray-50/80 text-muted-foreground cursor-not-allowed select-none pl-9"
                />
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gold/70" />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                <Lock className="w-3 h-3 text-gold" />
                يُعدّل من إدارة الأكاديمية فقط — لضمان رسمية الشهادات والمسميات
              </p>
            </div>
          </div>
        </div>

        {/* ⚡ Magical bio card */}
        <div className="relative p-5 rounded-2xl border border-gold/30 bg-gradient-to-br from-white to-gold/5 overflow-hidden">
          <div className="absolute -top-4 -right-4 w-16 h-16 bg-gold/15 rounded-full blur-xl" />
          <div className="relative">
            <div className="flex items-center justify-between mb-1">
              <Label className="font-bold text-navy text-sm flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-gold" /> النبذة التعريفية الكاملة
              </Label>
              <Badge variant="outline" className="text-[10px] bg-gold/10 text-gold border-gold/30">احترافي</Badge>
            </div>
            <p className="text-[10px] text-muted-foreground mb-3 leading-relaxed">
              اكتب نبذة واحدة متكاملة واحترافية عن نفسك — تظهر بنفس الصيغة في حساب الإدارة وفي الصفحة الرئيسية عند الضغط على بطاقتك.
              <br />
              <span className="text-navy/70">يُنصح بتقسيم النص على شكل فقرات مفصولة بسطر فارغ: مقدمة شخصية، المؤهلات العلمية، الإنجازات والمساهمات.</span>
            </p>
            <Textarea
              value={profile.bio || ''}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
              rows={12}
              className="min-h-[260px] leading-relaxed rounded-xl border-gold/30 focus:border-gold focus:ring-gold/30"
              placeholder={"مثال احترافي:\n\nمدرب ومحاضر دولي وخبير في التعليم الطبي، حاصل على شهادة الدكتوراه في الموارد البشرية والتخطيط الاستراتيجي. يمتلك خبرة تتجاوز 15 عاماً في تدريب الكوادر الصحية على المستوى المحلي والدولي.\n\n🎓 المؤهلات العلمية\n• بكالوريوس آداب وعلوم إنسانية\n• ماستر حقوق وعلوم سياسية\n• دكتوراه في الموارد البشرية والتخطيط الاستراتيجي\n\n🏆 الإنجازات\n• مشارك في عدة مؤتمرات دولية متخصصة\n• مؤلف لـ 6 كتب في طبعات دولية\n• مدرب معتمد من عدة هيئات صحية"}
            />
            <div className="flex items-center justify-between mt-2 text-[10px] text-muted-foreground">
              <span>💡 استخدم الأسطر الفارغة لفصل الفقرات</span>
              <span>{(profile.bio || '').length} حرف</span>
            </div>
          </div>
        </div>

        <Button
          onClick={save}
          disabled={loading}
          className="w-full sm:w-auto bg-gradient-to-r from-navy to-navy-light hover:from-navy-light hover:to-navy text-gold rounded-xl shadow-md active:scale-[0.97] transition-all"
        >
          {loading ? <><Loader2 className="w-4 h-4 ml-1 animate-spin" /> جاري الحفظ...</> : <><Save className="w-4 h-4 ml-1" /> حفظ التغييرات</>}
        </Button>
      </div>
    </SectionCard>
  )
}

function TrainerAccountSettings({ user, updateUser, logout }: any) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [loading, setLoading] = useState(false)

  const save = async () => {
    if (!currentPassword) {
      toast.error('أدخل كلمة المرور الحالية للتأكيد')
      return
    }
    if (newPassword && newPassword !== confirmPassword) {
      toast.error('كلمتا المرور الجديدتان غير متطابقتين')
      return
    }
    if (newPassword && newPassword.length < 6) {
      toast.error('كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل')
      return
    }
    if (!newEmail && !newPassword) {
      toast.error('لا توجد تغييرات للحفظ')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/change-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          currentEmail: user.email,
          currentPassword,
          newEmail: newEmail || undefined,
          newPassword: newPassword || undefined,
          role: 'trainer',
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'فشل التحديث')
        return
      }
      toast.success('تم تحديث بيانات الدخول بنجاح')
      updateUser({
        email: newEmail || user.email,
        password: newPassword || user.password,
      })
      setCurrentPassword('')
      setNewEmail('')
      setNewPassword('')
      setConfirmPassword('')
      if (newEmail) {
        setTimeout(() => {
          logout()
          toast.info('تم تحديث البريد. يرجى تسجيل الدخول بالبيانات الجديدة')
        }, 2000)
      }
    } catch {
      toast.error('خطأ في الاتصال')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SectionCard title="الحساب والأمان" description="تغيير البريد الإلكتروني وكلمة المرور">
      <div className="space-y-5 max-w-2xl">
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

        {/* ⚡ Magical security verification card */}
        <div className="relative p-4 rounded-xl border border-gold/30 bg-gradient-to-br from-white to-gold/5 overflow-hidden">
          <div className="absolute -top-4 -right-4 w-12 h-12 bg-gold/15 rounded-full blur-xl" />
          <div className="relative flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-navy to-navy-light flex items-center justify-center">
              <Lock className="w-4 h-4 text-gold" />
            </div>
            <div className="font-semibold text-navy text-sm">التحقق الأمني</div>
          </div>
          <Label className="text-xs font-bold text-navy flex items-center gap-1.5 mb-1.5">
            <Lock className="w-3.5 h-3.5 text-gold" /> كلمة المرور الحالية <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <Input
              type={showCurrent ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              dir="ltr"
              className="pr-3 pl-9 rounded-xl border-gold/30 focus:border-gold focus:ring-gold/30"
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-navy"
            >
              {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">مطلوبة للتأكد من صلاحية التغيير</p>
        </div>

        {/* ⚡ Magical change email card */}
        <div className="relative p-4 rounded-xl border border-gold/30 bg-gradient-to-br from-white to-gold/5 overflow-hidden">
          <div className="absolute -top-4 -right-4 w-12 h-12 bg-gold/15 rounded-full blur-xl" />
          <div className="relative flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-navy to-navy-light flex items-center justify-center">
              <Mail className="w-4 h-4 text-gold" />
            </div>
            <div className="font-semibold text-navy text-sm">تغيير البريد الإلكتروني</div>
          </div>
          <Label className="text-xs font-bold text-navy flex items-center gap-1.5 mb-1.5">
            <Mail className="w-3.5 h-3.5 text-gold" /> البريد الجديد
          </Label>
          <Input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder={user?.email || 'example@fia.edu'}
            dir="ltr"
            className="rounded-xl border-gold/30 focus:border-gold focus:ring-gold/30"
          />
          <p className="text-xs text-muted-foreground mt-1">اتركه فارغاً إذا لم ترد تغيير البريد</p>
        </div>

        {/* ⚡ Magical change password card */}
        <div className="relative p-4 rounded-xl border border-gold/30 bg-gradient-to-br from-white to-gold/5 overflow-hidden">
          <div className="absolute -top-4 -right-4 w-12 h-12 bg-gold/15 rounded-full blur-xl" />
          <div className="relative flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-navy to-navy-light flex items-center justify-center">
              <KeyRound className="w-4 h-4 text-gold" />
            </div>
            <div className="font-semibold text-navy text-sm">تغيير كلمة المرور</div>
          </div>
          <div className="space-y-3">
            <div>
              <Label className="text-xs font-bold text-navy flex items-center gap-1.5 mb-1.5">
                <Lock className="w-3.5 h-3.5 text-gold" /> كلمة المرور الجديدة
              </Label>
              <div className="relative">
                <Input
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  dir="ltr"
                  className="pr-3 pl-9 rounded-xl border-gold/30 focus:border-gold focus:ring-gold/30"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-navy"
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label className="text-xs font-bold text-navy flex items-center gap-1.5 mb-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-gold" /> تأكيد كلمة المرور
              </Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                dir="ltr"
                className="rounded-xl border-gold/30 focus:border-gold focus:ring-gold/30"
              />
              {newPassword && confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <X className="w-3 h-3" /> كلمتا المرور غير متطابقتين
                </p>
              )}
              {newPassword && confirmPassword && newPassword === confirmPassword && (
                <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> كلمتا المرور متطابقتان
                </p>
              )}
            </div>
            <p className="text-xs text-muted-foreground">اتركها فارغاً إذا لم ترد تغيير كلمة المرور</p>
          </div>
        </div>

        <Button
          onClick={save}
          disabled={loading || !currentPassword}
          className="w-full bg-gradient-to-r from-navy to-navy-light hover:from-navy-light hover:to-navy text-gold rounded-xl shadow-md active:scale-[0.97] transition-all"
        >
          {loading ? <><Loader2 className="w-4 h-4 ml-1 animate-spin" /> جاري الحفظ...</> : <><Save className="w-4 h-4 ml-1" /> حفظ التغييرات</>}
        </Button>
      </div>
    </SectionCard>
  )
}

function TrainerNotifs({ courses }: { courses: any[] }) {
  const [loading, setLoading] = useState(true)
  const [notifs, setNotifs] = useState<any[]>([])

  useEffect(() => {
    let cancelled = false
    const loadNotifs = async () => {
      if (!courses || courses.length === 0) {
        setNotifs([])
        setLoading(false)
        return
      }
      setLoading(true)
      try {
        const courseIds = courses.map((c) => c.id)
        const courseById = new Map(courses.map((c) => [c.id, c]))

        // Fetch enrollments for all courses (we'll filter on the client)
        const [enrRes, stuRes] = await Promise.all([
          fetch('/api/enrollments'),
          fetch('/api/students?role=student'),
        ])
        const [enrollments, students] = await Promise.all([enrRes.json(), stuRes.json()])

        if (cancelled) return

        const enrList = Array.isArray(enrollments) ? enrollments : []
        const stuList = Array.isArray(students) ? students : []
        const studentById = new Map(stuList.map((s: any) => [s.id, s]))

        // Only enrollments for this trainer's courses
        const mine = enrList.filter((e: any) => courseIds.includes(e.course_id))

        // Sort by enrolled_at desc
        mine.sort((a: any, b: any) => {
          const aT = a.enrolled_at ? new Date(a.enrolled_at).getTime() : 0
          const bT = b.enrolled_at ? new Date(b.enrolled_at).getTime() : 0
          return bT - aT
        })

        // Build notification objects — newest 25
        const built = mine.slice(0, 25).map((e: any) => {
          const student = studentById.get(e.user_id)
          const course = courseById.get(e.course_id)
          const isFree = !e.amount_paid || e.amount_paid === 0
          return {
            id: e.id,
            type: 'enrollment',
            studentName: student?.name || 'متدرب',
            studentAvatar: student?.avatar,
            courseTitle: course?.title || 'دورة',
            enrolledAt: e.enrolled_at,
            isFree,
            amountPaid: e.amount_paid,
            currency: e.currency,
            paymentStatus: e.payment_status,
          }
        })

        if (!cancelled) setNotifs(built)
      } catch {
        if (!cancelled) setNotifs([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadNotifs()
    return () => { cancelled = true }
  }, [courses])

  const formatRelativeTime = (iso: string | null | undefined) => {
    if (!iso) return ''
    try {
      const date = new Date(iso)
      const diffMs = Date.now() - date.getTime()
      const diffMin = Math.floor(diffMs / 60000)
      if (diffMin < 1) return 'الآن'
      if (diffMin < 60) return `منذ ${diffMin} دقيقة`
      const diffHr = Math.floor(diffMin / 60)
      if (diffHr < 24) return `منذ ${diffHr} ساعة`
      const diffDay = Math.floor(diffHr / 24)
      if (diffDay < 30) return `منذ ${diffDay} يوم`
      return date.toLocaleDateString('ar-EG')
    } catch {
      return ''
    }
  }

  return (
    <SectionCard
      title="الإشعارات"
      description="آخر التسجيلات في دوراتك التدريبية"
    >
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
          <p className="text-xs text-muted-foreground max-w-xs mx-auto">
            ستظهر هنا إشعارات التسجيل الجديدة في دوراتك ✨
          </p>
        </div>
      ) : (
        <div className="space-y-3 fia-stagger">
          {notifs.map((n) => {
            const stateGradient = n.isFree
              ? 'from-emerald-500 to-teal-600'
              : 'from-gold to-amber-500'
            return (
              <div
                key={n.id}
                className="relative overflow-hidden rounded-2xl bg-white border border-gray-200/60 hover:shadow-lg transition-all fia-card-hover"
              >
                {/* Top state-aware gradient strip */}
                <div className={`h-1.5 bg-gradient-to-r ${stateGradient}`} />
                <div className="p-4 flex items-start gap-3">
                  <div className="relative flex-shrink-0">
                    <div className="absolute inset-0 bg-gold/15 rounded-full blur-md" />
                    <div className="relative w-10 h-10 rounded-full bg-navy flex items-center justify-center text-gold font-bold border border-gold/30 overflow-hidden">
                      {n.studentAvatar ? (
                        <img src={n.studentAvatar} alt={n.studentName} className="w-full h-full object-cover" />
                      ) : (
                        <UserPlus className="w-5 h-5" />
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-navy text-sm flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-gold flex-shrink-0" />
                      متدرب جديد في دورتك
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      <span className="font-medium text-navy">{n.studentName}</span>
                      {' '}انضم إلى{' '}
                      <span className="font-medium text-navy">{n.courseTitle}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <Badge
                        className={
                          n.isFree
                            ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-xs'
                            : 'bg-gold/15 text-gold border-gold/30 text-xs'
                        }
                      >
                        {n.isFree ? 'مجانية' : `${(n.amountPaid || 0).toLocaleString()} ${n.currency || 'ر.ي'}`}
                      </Badge>
                      {n.paymentStatus === 'pending' && (
                        <Badge variant="outline" className="border-amber-500/30 text-amber-600 text-xs">
                          <Clock className="w-3 h-3 ml-0.5" /> بانتظار الدفع
                        </Badge>
                      )}
                      {n.enrolledAt && (
                        <span className="text-xs text-muted-foreground">
                          {formatRelativeTime(n.enrolledAt)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </SectionCard>
  )
}

function TrainerSettings() {
  return (
    <SectionCard title="الإعدادات" description="إعدادات حسابك">
      <div className="space-y-6 max-w-2xl">
        {/* ⚡ Magical placeholder settings card */}
        <div className="relative p-5 rounded-2xl border border-gold/30 bg-gradient-to-br from-white to-gold/5 overflow-hidden">
          <div className="absolute -top-4 -right-4 w-16 h-16 bg-gold/15 rounded-full blur-xl" />
          <div className="relative flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-navy to-navy-light flex items-center justify-center">
              <Lock className="w-5 h-5 text-gold" />
            </div>
            <div>
              <div className="font-bold text-navy text-sm">الأمان والخصوصية</div>
              <div className="text-xs text-muted-foreground">إدارة بيانات الدخول وكلمة المرور من قسم الحساب والأمان</div>
            </div>
          </div>
          <Button variant="outline" className="rounded-xl border-gold/30 text-navy hover:bg-gold/10">
            <KeyRound className="w-4 h-4 ml-1" /> تغيير كلمة المرور
          </Button>
        </div>
      </div>
    </SectionCard>
  )
}

// ═══════════════ قسم المنتدى مغلق قبل الاعتماد ═══════════════
// المدرب غير المعتمد (بانتظار الموافقة/التوقيع/مرفوض) لا يدخل المنتدى
// — والخادم يمنع فعلياً أي موضوع أو رد أو تفاعل (بوابة trainer-gate)
function ForumLockPanel() {
  return (
    <SectionCard title="المنتدى" description="قسم تفاعلي لأعضاء الأكاديمية">
      <div className="relative overflow-hidden rounded-3xl border border-gold/30 bg-gradient-to-br from-[#0A1F44] via-[#12294f] to-[#0A1F44] p-8 text-center shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
        <div className="absolute inset-0 opacity-15" style={{ backgroundImage: 'radial-gradient(circle at 15% 30%, #D4AF37 1.5px, transparent 1.5px), radial-gradient(circle at 85% 70%, white 1px, transparent 1px)', backgroundSize: '26px 26px, 20px 20px' }} />
        <div className="absolute -top-10 -left-10 h-40 w-40 rounded-full bg-gold/15 blur-3xl" />
        <div className="relative">
          <div className="mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-full border-2 border-gold/50 bg-gradient-to-br from-gold/20 to-transparent shadow-[0_0_50px_rgba(212,175,55,0.3)]">
            <Lock className="h-11 w-11 text-[#E5C77E]" />
          </div>
          <h2 className="mb-2 text-2xl font-extrabold text-white">
            قسم المنتدى <span className="bg-gradient-to-l from-gold to-[#E5C77E] bg-clip-text text-transparent">مغلق حالياً</span>
          </h2>
          <p className="mx-auto mb-7 max-w-md text-sm leading-relaxed text-white/65">
            يُفتح المنتدى للمشاركة والتفاعل بعد اعتماد ملفك وتوقيع اتفاق نسبة الأرباح —
            تابع حالة طلبك في «نظرة عامة»، وفور التوقيع يُفتح القسم تلقائياً.
          </p>
          <div className="mx-auto grid max-w-xl gap-3 sm:grid-cols-3">
            {[
              { icon: ShieldCheck, t: 'موافقة الإدارة', d: 'فحص ملفك ومؤهلاتك' },
              { icon: ScrollText, t: 'توقيع الاتفاق', d: 'نسبة أرباحك من الدورات' },
              { icon: MessageSquare, t: 'منتدى مفتوح', d: 'مشاركة وتفاعل كاملان' },
            ].map((c) => (
              <div key={c.t} className="rounded-2xl border border-gold/25 bg-white/[0.05] p-4">
                <c.icon className="mx-auto mb-2 h-6 w-6 text-[#E5C77E]" />
                <p className="text-xs font-bold text-white">{c.t}</p>
                <p className="mt-1 text-[10px] leading-relaxed text-white/55">{c.d}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SectionCard>
  )
}
