'use client'

import React, { useEffect, useState } from 'react'
import {
  LayoutDashboard, BookOpen, FileText, Users, CreditCard,
  Award, GraduationCap, Building2, Shield, UserCog, Settings,
  BarChart3, ScrollText, Plus, Edit, Trash2, Eye, EyeOff,
  DollarSign, TrendingUp, Activity, Star, ArrowRight,
  Lock, Mail, CheckCircle2, User, XCircle, ExternalLink, Download,
  Loader2, FileUp, Clock, RefreshCw, AlertTriangle,
  Gift, Newspaper, MessageSquare, HelpCircle, Ban, X,
  Eraser, Brush, Sparkles, ChevronDown, Tag, Layers, Briefcase, Crown,
  Search, Calendar, MapPin, Target, Send, Facebook, Phone, Hash, Inbox, KeyRound, Wallet, Archive, RotateCcw,
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
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from 'sonner'
import { TeamEditor } from '@/components/fia/team-editor'
import { CourseContentManager } from '@/components/fia/course-content-manager'
import { ConfirmDialog } from '@/components/fia/confirm-dialog'
import { PasswordConfirmDialog } from '@/components/fia/password-confirm-dialog'
import {
  AdminCoupons, AdminAffiliates, AdminExamQuestions, AdminReviews,
  AdminForum, AdminBlog, AdminContact, AdminFaqs,
} from './admin-extended'
import { AdminForumBans } from './shared-community'
import { AdminTrainersRoyal } from './admin-trainers-royal'
import { AdminStudentsRoyal } from './admin-students-royal'
import { AdminCertificatesRoyal } from './admin-certificates-royal'
import { AdminExamQuestionsRoyal } from './admin-questions-royal'
import { AdminAffiliatesRoyal } from './admin-affiliates-royal'
import { AdminForumRoyal } from './admin-forum-royal'
import { AdminTrainerEarningsRoyal } from './admin-trainer-earnings-royal'
import {
  LuxSection, LuxStats, LuxSearch, LuxSelect, LuxCombo, LuxEmpty,
  LuxBadge, LuxField, LuxDialog, LuxSaveBar, LuxRow, luxInput, luxTheme,
} from './luxury'
import { CertificateViewer } from '@/components/fia/certificate-viewer'
import { CourseDialog as ProCourseDialog } from '@/components/fia/course-dialog'
import { supabasePublic } from '@/lib/supabase'

const NAV: NavItem[] = [
  { id: 'overview', label: 'الإحصائيات', icon: LayoutDashboard },
  { id: 'courses', label: 'الدورات', icon: BookOpen },
  { id: 'content', label: 'محتوى الدورات', icon: FileText },
  { id: 'exams', label: 'الاختبارات', icon: FileText },
  { id: 'exam-questions', label: 'بنك الأسئلة', icon: HelpCircle },
  { id: 'students', label: 'المتدربون', icon: Users },
  { id: 'payments', label: 'المدفوعات', icon: CreditCard },
  { id: 'trainer-earnings', label: 'أرباح المدربين', icon: Wallet },
  { id: 'payment-methods', label: 'طرق الدفع', icon: DollarSign },
  { id: 'coupons', label: 'كوبونات الخصم', icon: Gift },
  { id: 'affiliates', label: 'المسوّقون', icon: Users },
  { id: 'certificates', label: 'الشهادات', icon: Award },  // Re-enabled
  { id: 'trainers', label: 'المدربون', icon: GraduationCap },
  { id: 'reviews', label: 'تقييمات المتدربين', icon: Star },
  { id: 'partners', label: 'الشركاء', icon: Building2 },
  { id: 'licenses', label: 'التراخيص', icon: Shield },
  { id: 'founder', label: 'المؤسس والفريق', icon: UserCog },
  { id: 'blog', label: 'المدونة', icon: Newspaper },
  { id: 'forum', label: 'المنتدى', icon: MessageSquare },
  { id: 'forum-bans', label: 'حظر المنتدى', icon: Ban },
  { id: 'faqs', label: 'الأسئلة الشائعة', icon: HelpCircle },
  { id: 'contact', label: 'صندوق الرسائل', icon: Mail },
  { id: 'site', label: 'إعدادات الموقع', icon: Settings },
  { id: 'account', label: 'الحساب والأمان', icon: User },
  { id: 'reports', label: 'التقارير', icon: BarChart3 },
  { id: 'logs', label: 'سجل العمليات', icon: ScrollText },
]

export function AdminDashboard() {
  const [active, setActive] = useState('overview')
  useHashTab(NAV.map((n) => n.id), setActive)
  const [contentCourseId, setContentCourseId] = useState<string | null>(null)
  const user = useAuth((s) => s.user)
  const updateUser = useAuth((s) => s.updateUser)
  const logout = useAuth((s) => s.logout)

  // ⚡ Listen for native notifications from the APK bridge.
  // When the APK receives a push notification (e.g. new payment), it
  // dispatches a 'fia-native-notification' event on window. We listen
  // for it here and show a toast — the per-section Realtime subscriptions
  // in AdminPayments/AdminStudents/etc. handle the actual data refresh.
  useEffect(() => {
    ;(window as any).__FIA_showToast = (msg: string) => {
      try { toast.success(msg) } catch {}
    }
    ;(window as any).__FIA_refreshActiveView = () => {
      // No-op: each sub-component refreshes itself via its own Realtime subscription
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

  return (
    <DashboardShell
      nav={NAV}
      active={active}
      onNavigate={(id) => { setActive(id); if (id !== 'content') setContentCourseId(null) }}
      roleLabel="مدير"
      roleColor="bg-red-500/15 text-red-600 border-red-500/30"
    >
      {active === 'overview' && <AdminOverview />}
      {active === 'courses' && <AdminCourses />}
      {active === 'content' && (
        <AdminContent
          contentCourseId={contentCourseId}
          setContentCourseId={setContentCourseId}
        />
      )}
      {active === 'exams' && <AdminExams />}
      {active === 'exam-questions' && <AdminExamQuestionsRoyal />}
      {active === 'students' && <AdminStudentsRoyal />}
      {active === 'payments' && <AdminPayments />}
      {active === 'trainer-earnings' && <AdminTrainerEarningsRoyal />}
      {active === 'payment-methods' && <AdminPaymentMethods />}
      {active === 'coupons' && <AdminCoupons />}
      {active === 'affiliates' && <AdminAffiliatesRoyal />}
      {/* Certificate management — re-enabled */}
      {active === 'certificates' && <AdminCertificatesRoyal />}
      {active === 'trainers' && <AdminTrainersRoyal />}
      {active === 'reviews' && <AdminReviews />}
      {active === 'partners' && <AdminPartners />}
      {active === 'licenses' && <AdminLicenses />}
      {active === 'founder' && <AdminFounder user={user} />}
      {active === 'blog' && <AdminBlog />}
      {active === 'forum' && <AdminForumRoyal />}
      {active === 'forum-bans' && <AdminForumBans />}
      {active === 'faqs' && <AdminFaqs />}
      {active === 'contact' && <AdminContact />}
      {active === 'site' && <AdminSite />}
      {active === 'account' && <AdminAccount user={user} updateUser={updateUser} logout={logout} />}
      {active === 'reports' && <AdminReports />}
      {active === 'logs' && <AdminLogs />}
    </DashboardShell>
  )
}

// ============== Admin Content Viewer (all courses + lessons) ==============
function AdminContent({ contentCourseId, setContentCourseId }: any) {
  const [courses, setCourses] = useState<any[]>([])
  const [enrollmentsByCourse, setEnrollmentsByCourse] = useState<Record<string, number>>({})

  // Load courses + ALL enrollments (no user filter) so we can show the
  // real enrolled-students count per course. The legacy `c.enrolled`
  // column is never updated when a student enrolls, so we have to
  // compute the count from the payments/enrollments table.
  useEffect(() => {
    Promise.all([
      fetch('/api/courses').then((r) => r.json()).catch(() => []),
      fetch('/api/enrollments').then((r) => r.json()).catch(() => []),
    ]).then(([c, e]: any) => {
      setCourses(Array.isArray(c) ? c : [])
      const list: any[] = Array.isArray(e) ? e : []
      // Count active enrollments — only those that have real access:
      //   payment_status in ['free', 'confirmed', 'completed']
      // Skip 'pending' (payment not yet approved) and any
      // cancelled/failed enrollments.
      const counts: Record<string, number> = {}
      for (const enr of list) {
        if (!enr?.course_id) continue
        const ps = enr.payment_status
        // Defensive: accept the canonical normalized values, AND
        // the raw status 'مكتمل'/'completed' as a fallback (in case
        // the toEnrollment normalization in the API missed an edge
        // case, the count should still reflect reality).
        const rawStatus = (enr.status || '').trim()
        const isApproved =
          ps === 'free' ||
          ps === 'confirmed' ||
          ps === 'completed' ||
          rawStatus === 'مكتمل' ||
          rawStatus === 'completed' ||
          rawStatus === 'paid'
        if (!isApproved) continue
        counts[enr.course_id] = (counts[enr.course_id] || 0) + 1
      }
      setEnrollmentsByCourse(counts)
    })
  }, [])

  // Helper to get actual enrolled count for a course
  const enrolledCount = (courseId: string) => enrollmentsByCourse[courseId] || 0

  if (contentCourseId) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => setContentCourseId(null)} className="text-navy hover:bg-navy/5">
          <ArrowRight className="w-4 h-4 ml-1" /> العودة لقائمة الدورات
        </Button>
        <CourseContentManager courseId={contentCourseId} />
      </div>
    )
  }

  return (
    <SectionCard
      title="محتوى الدورات"
      description="تصفّح كل الدورات والدروس"
    >
      {courses.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">لا توجد دورات بعد</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((c: any) => {
            const isFree = c.price_type === 'مجانية' || c.price === 0
            return (
              <Card key={c.id} className="overflow-hidden card-hover">
                <div className="h-32 bg-navy relative">
                  {c.cover && <img src={c.cover} alt={c.title} className="w-full h-full object-cover" />}
                  <div className="absolute top-2 right-2 flex gap-1">
                    <Badge className="bg-navy/80 text-gold border-gold/30">{c.level}</Badge>
                  </div>
                  <div className="absolute top-2 left-2">
                    <Badge className={isFree ? 'bg-green-500 text-white' : 'bg-gold text-navy'}>
                      {isFree ? 'مجانية' : 'مدفوعة'}
                    </Badge>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-navy text-sm mb-2 line-clamp-2 min-h-[2.5rem]">{c.title}</h3>
                  <div className="flex justify-between text-xs text-muted-foreground mb-3">
                    <span>{c.modules_count || 0} وحدة</span>
                    <span>{c.lessons_count || 0} درس</span>
                    <span>{c.duration_hours || 0} ساعة</span>
                  </div>
                  <div className="text-xs text-muted-foreground mb-3 flex items-center gap-1.5">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-navy/10 text-navy font-bold text-[10px]">
                      {enrolledCount(c.id)}
                    </span>
                    <span>متدرب مسجّل فعلياً</span>
                  </div>
                  <Button
                    size="sm"
                    className="w-full bg-navy hover:bg-navy-light"
                    onClick={() => setContentCourseId(c.id)}
                  >
                    <FileText className="w-3.5 h-3.5 ml-1" /> عرض المحتوى
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </SectionCard>
  )
}

function AdminOverview() {
  const [stats, setStats] = useState({
    courses: 0, trainers: 0, students: 0, payments: 0,
    pendingPayments: 0, completedEnrollments: 0, activeEnrollments: 0,
    // Revenue grouped by currency. Each entry: { currency, total, count, paid_count, pending_count, pending_total }
    revenueByCurrency: [] as any[],
  })

  // Get the course lookup map so we can resolve a payment's currency
  // from the course (source of truth) when the payment row itself
  // has the wrong/missing currency (legacy rows default to 'ر.ي').
  const [courses, setCourses] = useState<any[]>([])

  useEffect(() => {
    Promise.all([
      fetch('/api/courses?include_drafts=true').then((r) => r.json()),
      fetch('/api/trainers').then((r) => r.json()),
      fetch('/api/students?role=student').then((r) => r.json()),
      fetch('/api/payments').then((r) => r.json()),
      fetch('/api/enrollments').then((r) => r.json()),
    ]).then(([c, t, s, p, e]) => {
      const coursesArr = Array.isArray(c) ? c : []
      const trainers = Array.isArray(t) ? t : []
      const students = Array.isArray(s) ? s : []
      const payments = Array.isArray(p) ? p : []
      const enrollments = Array.isArray(e) ? e : []

      setCourses(coursesArr)

      // Build a course-id → course map for currency resolution
      const courseMap = new Map<string, any>()
      for (const c of coursesArr) courseMap.set(c.id, c)

      // Determine currency for a payment: prefer the course's currency,
      // then the payment's stored currency, then default 'ر.ي'.
      const resolveCurrency = (pay: any): string => {
        if (pay.course_id) {
          const c = courseMap.get(pay.course_id)
          if (c?.currency) return c.currency
        }
        return pay.currency || 'ر.ي'
      }

      // Group all payments by currency. For each currency, we compute:
      //   total            = sum of amounts for COMPLETED payments
      //   pending_total    = sum of amounts for PENDING payments
      //   paid_count       = number of completed payments
      //   pending_count    = number of pending payments
      const groups: Record<string, { total: number; pending_total: number; paid_count: number; pending_count: number }> = {}
      for (const pay of payments) {
        const cur = resolveCurrency(pay)
        if (!groups[cur]) groups[cur] = { total: 0, pending_total: 0, paid_count: 0, pending_count: 0 }
        if (pay.status === 'مكتمل' || pay.status === 'completed' || pay.status === 'paid') {
          groups[cur].total += Number(pay.amount) || 0
          groups[cur].paid_count += 1
        } else if (pay.status === 'قيد الانتظار' || pay.status === 'pending') {
          groups[cur].pending_total += Number(pay.amount) || 0
          groups[cur].pending_count += 1
        }
      }
      const revenueByCurrency = Object.entries(groups).map(([currency, g]) => ({
        currency, ...g,
      })).sort((a, b) => b.total - a.total)

      setStats({
        courses: coursesArr.length,
        trainers: trainers.length,
        students: students.length,
        payments: payments.length,
        pendingPayments: payments.filter(p => p.status === 'قيد الانتظار' || p.status === 'pending').length,
        completedEnrollments: enrollments.filter(e => e.status === 'completed' || e.status === 'مكتمل').length,
        activeEnrollments: enrollments.filter(e => e.status === 'active').length,
        revenueByCurrency,
      })
    }).catch(() => {})
  }, [])

  // ⚡ REAL-TIME: refresh overview stats INSTANTLY when payments/courses/enrollments change
  // Note: We re-fetch because the stats require aggregation across multiple tables.
  useEffect(() => {
    let channel: any
    let debounceTimer: any
    const debouncedRefresh = () => {
      // Debounce to avoid spamming when many changes happen quickly
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        // Trigger the same Promise.all fetch as above
        Promise.all([
          fetch('/api/courses?include_drafts=true').then((r) => r.json()),
          fetch('/api/trainers').then((r) => r.json()),
          fetch('/api/students?role=student').then((r) => r.json()),
          fetch('/api/payments').then((r) => r.json()),
          fetch('/api/enrollments').then((r) => r.json()),
        ]).then(([c, t, s, p, e]) => {
          const coursesArr = Array.isArray(c) ? c : []
          const trainers = Array.isArray(t) ? t : []
          const students = Array.isArray(s) ? s : []
          const payments = Array.isArray(p) ? p : []
          const enrollments = Array.isArray(e) ? e : []
          setCourses(coursesArr)
          const courseMap = new Map<string, any>()
          for (const cr of coursesArr) courseMap.set(cr.id, cr)
          const resolveCurrency = (pay: any): string => {
            if (pay.course_id) {
              const cr = courseMap.get(pay.course_id)
              if (cr?.currency) return cr.currency
            }
            return pay.currency || 'ر.ي'
          }
          const groups: Record<string, { total: number; pending_total: number; paid_count: number; pending_count: number }> = {}
          for (const pay of payments) {
            const cur = resolveCurrency(pay)
            if (!groups[cur]) groups[cur] = { total: 0, pending_total: 0, paid_count: 0, pending_count: 0 }
            if (pay.status === 'مكتمل' || pay.status === 'completed' || pay.status === 'paid') {
              groups[cur].total += Number(pay.amount) || 0
              groups[cur].paid_count += 1
            } else if (pay.status === 'قيد الانتظار' || pay.status === 'pending') {
              groups[cur].pending_total += Number(pay.amount) || 0
              groups[cur].pending_count += 1
            }
          }
          const revenueByCurrency = Object.entries(groups).map(([cur, g]) => ({
            currency: cur, total: g.total, pending_total: g.pending_total,
            paid_count: g.paid_count, pending_count: g.pending_count,
          })).sort((a, b) => b.total - a.total)
          setStats({
            courses: coursesArr.length,
            trainers: trainers.length,
            students: students.length,
            payments: payments.length,
            pendingPayments: payments.filter(p => p.status === 'قيد الانتظار' || p.status === 'pending').length,
            completedEnrollments: enrollments.filter(e => e.status === 'completed' || e.status === 'مكتمل').length,
            activeEnrollments: enrollments.filter(e => e.status === 'active').length,
            revenueByCurrency,
          })
        }).catch(() => {})
      }, 300)
    }
    try {
      channel = supabasePublic
        .channel('admin-overview-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, debouncedRefresh)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'enrollments' }, debouncedRefresh)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'courses' }, debouncedRefresh)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, debouncedRefresh)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'trainers' }, debouncedRefresh)
        .subscribe()
    } catch {}
    return () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      try { supabasePublic.removeChannel(channel) } catch {}
    }
  }, [])

  // Pretty currency formatter — group digits, append the currency code
  const fmt = (amount: number, currency: string) => `${amount.toLocaleString('en-US')} ${currency}`

  return (
    <div className="space-y-6">
      {/* ⚡ Magical hero header — navy gradient with gold dots + Sparkles */}
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
            <h2 className="text-2xl font-bold mb-1 tracking-tight">لوحة تحكم الإدارة</h2>
            <p className="text-gold/80 text-sm flex items-center gap-1.5">
              <span className="w-1 h-1 bg-gold rounded-full animate-pulse" />
              نظرة شاملة على المنصة — محدّثة لحظياً
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 bg-gold/15 text-gold border border-gold/40 rounded-full px-3 py-1.5 backdrop-blur-sm">
            <Crown className="w-4 h-4" />
            <span className="text-xs font-bold">الأدمن</span>
          </div>
        </div>
      </div>

      {/* ⚡ Magical StatCards — 4 cards with gradient + glow + scale on hover */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 fia-stagger">
        <StatCard icon={BookOpen}       label="إجمالي الدورات" value={stats.courses}  color="navy"  />
        <StatCard icon={GraduationCap}  label="المدربون"      value={stats.trainers} color="gold"  />
        <StatCard icon={Users}          label="المتدربون"     value={stats.students} color="blue"  />
        <StatCard icon={CreditCard}     label="المعاملات"     value={stats.payments} color="green" />
      </div>

      {/* ========= PROFESSIONAL FINANCIAL OVERVIEW ========= */}
      <SectionCard title="نظرة عامة مالية" description="الإيرادات الفعلية مجمّعة حسب العملة">
        {stats.revenueByCurrency.length === 0 ? (
          /* ⚡ Magical empty state for revenue */
          <div className="text-center py-14">
            <div className="relative inline-block mb-4">
              <div className="absolute inset-0 bg-gold/20 rounded-full blur-2xl animate-pulse" />
              <div className="relative w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-navy via-navy-light to-navy flex items-center justify-center shadow-xl border border-gold/30">
                <DollarSign className="w-10 h-10 text-gold" />
              </div>
            </div>
            <h3 className="font-bold text-navy text-base mb-1.5">لا توجد معاملات بعد</h3>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">عند تأكيد أول دفعة، ستظهر الإيرادات المجمّعة حسب العملة هنا ✨</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Currency cards — one per currency, professional layout */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 fia-stagger">
              {stats.revenueByCurrency.map((rev) => {
                const isUSD = rev.currency === '$' || rev.currency === 'USD'
                const isSAR = rev.currency === 'ر.س'
                const gradient = isUSD
                  ? 'from-emerald-600 to-emerald-800'
                  : isSAR
                    ? 'from-blue-700 to-blue-900'
                    : 'from-navy to-navy-light'
                const accent = isUSD ? 'text-emerald-300' : isSAR ? 'text-blue-300' : 'text-gold'
                return (
                  <div
                    key={rev.currency}
                    className={`fia-course-card relative bg-gradient-to-br ${gradient} text-white p-5 rounded-2xl shadow-lg overflow-hidden`}
                  >
                    {/* Decorative currency icon in background */}
                    <div className="absolute -left-4 -bottom-4 text-white/10 text-7xl font-bold select-none">
                      {rev.currency}
                    </div>
                    {/* Subtle pattern overlay */}
                    <div className="absolute inset-0 opacity-15" style={{
                      backgroundImage: 'radial-gradient(circle at 80% 20%, white 1px, transparent 1px)',
                      backgroundSize: '14px 14px'
                    }} />
                    {/* Top-right glow */}
                    <div className="absolute -top-6 -right-6 w-20 h-20 bg-white/10 rounded-full blur-xl" />

                    <div className="relative">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <DollarSign className={`w-5 h-5 ${accent}`} />
                          <span className="text-xs font-semibold text-white/70 uppercase tracking-wide">العملة</span>
                        </div>
                        <span className="text-base font-extrabold bg-white/15 px-2.5 py-0.5 rounded-md backdrop-blur-sm" dir="ltr">
                          {rev.currency}
                        </span>
                      </div>
                      {/* Total completed revenue — the headline number */}
                      <div className="mb-3">
                        <div className="text-[11px] text-white/70 mb-0.5">إجمالي الإيرادات المكتملة</div>
                        <div className="text-3xl font-extrabold tracking-tight" dir="ltr">
                          {fmt(rev.total, rev.currency)}
                        </div>
                      </div>
                      {/* Pending row */}
                      <div className="border-t border-white/15 pt-2.5 grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <div className="flex items-center gap-1 text-white/70 mb-0.5">
                            <Clock className="w-2.5 h-2.5" /> قيد الانتظار
                          </div>
                          <div className="font-bold" dir="ltr">{fmt(rev.pending_total, rev.currency)}</div>
                          <div className="text-[10px] text-white/60">{rev.pending_count} معاملة</div>
                        </div>
                        <div>
                          <div className="flex items-center gap-1 text-white/70 mb-0.5">
                            <CheckCircle2 className="w-2.5 h-2.5" /> مكتملة
                          </div>
                          <div className="font-bold" dir="ltr">{fmt(rev.total, rev.currency)}</div>
                          <div className="text-[10px] text-white/60">{rev.paid_count} معاملة</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* ⚡ Magical summary cards — gradient + icons + glow */}
            <div className="grid sm:grid-cols-3 gap-4 fia-stagger">
              <div className="fia-course-card relative bg-gradient-to-br from-amber-500 to-yellow-600 text-white p-5 rounded-xl shadow-md overflow-hidden">
                <div className="absolute inset-0 opacity-20" style={{
                  backgroundImage: 'radial-gradient(circle at 20% 20%, white 1px, transparent 1px)',
                  backgroundSize: '12px 12px'
                }} />
                <div className="absolute -top-4 -right-4 w-16 h-16 bg-white/15 rounded-full blur-xl" />
                <div className="relative">
                  <Clock className="w-6 h-6 mb-2" />
                  <div className="text-2xl font-extrabold">{stats.pendingPayments}</div>
                  <div className="text-white/85 text-sm font-medium">مدفوعات قيد الانتظار</div>
                </div>
              </div>
              <div className="fia-course-card relative bg-gradient-to-br from-emerald-500 to-teal-600 text-white p-5 rounded-xl shadow-md overflow-hidden">
                <div className="absolute inset-0 opacity-20" style={{
                  backgroundImage: 'radial-gradient(circle at 20% 20%, white 1px, transparent 1px)',
                  backgroundSize: '12px 12px'
                }} />
                <div className="absolute -top-4 -right-4 w-16 h-16 bg-white/15 rounded-full blur-xl" />
                <div className="relative">
                  <CheckCircle2 className="w-6 h-6 mb-2" />
                  <div className="text-2xl font-extrabold">{stats.completedEnrollments}</div>
                  <div className="text-white/85 text-sm font-medium">دورات مكتملة</div>
                </div>
              </div>
              <div className="fia-course-card relative bg-gradient-to-br from-blue-500 to-indigo-600 text-white p-5 rounded-xl shadow-md overflow-hidden">
                <div className="absolute inset-0 opacity-20" style={{
                  backgroundImage: 'radial-gradient(circle at 20% 20%, white 1px, transparent 1px)',
                  backgroundSize: '12px 12px'
                }} />
                <div className="absolute -top-4 -right-4 w-16 h-16 bg-white/15 rounded-full blur-xl" />
                <div className="relative">
                  <Activity className="w-6 h-6 mb-2" />
                  <div className="text-2xl font-extrabold">{stats.activeEnrollments}</div>
                  <div className="text-white/85 text-sm font-medium">تسجيلات نشطة</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  )
}

// ============== COURSES ==============
const AdminCourses = React.memo(function AdminCourses() {
  const [items, setItems] = useState<any[]>([])
  const [trainers, setTrainers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<any | null>(null)
  const [open, setOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = () => {
    setLoading(true)
    Promise.all([
      fetch('/api/courses?include_drafts=true').then((r) => r.json()),
      fetch('/api/trainers').then((r) => r.json()),
    ]).then(([c, t]) => {
      setItems(Array.isArray(c) ? c : [])
      setTrainers(Array.isArray(t) ? t : [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  // ⚡ Helper: get trainer name from trainer_id
  const getTrainerName = (trainerId: string) => {
    if (!trainerId) return null
    const trainer = trainers.find((t) => t.id === trainerId)
    return trainer ? trainer.name : null
  }

  // ⚡ REAL-TIME: courses — admin sees course changes INSTANTLY
  useEffect(() => {
    let channel: any
    try {
      channel = supabasePublic
        .channel('admin-courses-realtime')
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'courses' },
          (payload: any) => setItems((prev) => [payload.new, ...prev])
        )
        .on('postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'courses' },
          (payload: any) => setItems((prev) => prev.map((c) => c.id === payload.new.id ? { ...c, ...payload.new } : c))
        )
        .on('postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'courses' },
          (payload: any) => setItems((prev) => prev.filter((c) => c.id !== payload.old.id))
        )
        .subscribe()
    } catch {}
    return () => { try { supabasePublic.removeChannel(channel) } catch {} }
  }, [])

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    // ⚡ OPTIMISTIC UPDATE: remove from state IMMEDIATELY
    const deletedId = deleteTarget.id
    setItems((prev) => prev.filter((c) => c.id !== deletedId))
    setDeleteTarget(null)
    try {
      const res = await fetch('/api/courses', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: deletedId }) })
      if (res.ok) {
        toast.success('تم حذف الدورة بنجاح')
      } else {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error || 'فشل الحذف')
        load() // Revert: refetch to restore the course
      }
    } catch {
      toast.error('خطأ في الاتصال')
      load() // Revert on network error
    } finally {
      setDeleting(false)
    }
  }

  // Helper: determine level badge style
  const getLevelStyle = (level: string) => {
    if (!level) return { label: 'غير محدد', color: 'bg-gray-100 text-gray-600' }
    if (level === 'مبتدئ') return { label: 'مبتدئ', color: 'bg-green-100 text-green-700' }
    if (level === 'متوسط') return { label: 'متوسط', color: 'bg-blue-100 text-blue-700' }
    if (level === 'متقدم') return { label: 'متقدم', color: 'bg-purple-100 text-purple-700' }
    return { label: level, color: 'bg-gray-100 text-gray-600' }
  }

  // Helper: determine status badge style
  const getStatusStyle = (status: string) => {
    if (status === 'منشورة') return { label: 'منشورة', color: 'bg-green-100 text-green-700 border-green-200' }
    if (status === 'مسودة') return { label: 'مسودة', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' }
    return { label: status || 'غير محدد', color: 'bg-gray-100 text-gray-600 border-gray-200' }
  }

  return (
    <SectionCard
      title="إدارة الدورات"
      description={`${items.length} دورة`}
      action={<Button className="bg-navy hover:bg-navy-light" onClick={() => { setEditing(null); setOpen(true) }}><Plus className="w-4 h-4 ml-1" /> جديد</Button>}
    >
      {/* ⚡ Professional course cards — each course is a beautiful card
          with cover image (or gradient fallback), price badge, level
          badge, status badge, and hover effects. This replaces the old
          plain table with a modern, visually rich layout. */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((c) => {
          const isFree = c.price_type === 'مجانية' || c.price === 0
          const level = getLevelStyle(c.level)
          const status = getStatusStyle(c.status)
          return (
            <div key={c.id} className="group relative overflow-hidden rounded-2xl bg-white border border-gray-200/60 hover:border-navy/30 hover:shadow-lg transition-all">
              {/* Cover image with gradient overlay */}
              {c.cover ? (
                <div className="relative h-28 overflow-hidden">
                  <img src={c.cover} alt={c.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  <div className="absolute inset-0 bg-gradient-to-t from-navy/80 via-navy/20 to-transparent" />
                </div>
              ) : (
                <div className="relative h-28 bg-gradient-to-br from-navy to-navy-light overflow-hidden flex items-center justify-center">
                  <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                  <BookOpen className="w-12 h-12 text-white/20" />
                </div>
              )}
              {/* Price badge — floats on cover */}
              <div className="absolute top-2 left-2 z-10">
                {isFree ? (
                  <span className="inline-flex items-center gap-1 text-[10px] text-white bg-green-500 px-2.5 py-1 rounded-full font-bold shadow-md">مجانية</span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] text-navy bg-gradient-to-r from-gold to-amber-500 px-2.5 py-1 rounded-full font-bold shadow-md">{c.price?.toLocaleString()} {c.currency || 'ر.ي'}</span>
                )}
              </div>
              {/* Status badge — floats on cover top-right */}
              <div className="absolute top-2 right-2 z-10">
                <span className={`inline-flex items-center text-[9px] border px-2 py-0.5 rounded-full font-semibold ${status.color}`}>{status.label}</span>
              </div>
              {/* Body */}
              <div className="p-3">
                <h4 className="font-bold text-navy text-sm leading-tight line-clamp-1 mb-1">{c.title}</h4>
                {c.short_description && <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed mb-2">{c.short_description}</p>}
                {/* Trainer name — show if course has a trainer assigned */}
                {(() => {
                  const trainerName = getTrainerName(c.trainer_id)
                  return trainerName ? (
                    <div className="text-[10px] text-gold font-bold flex items-center gap-1 mb-2">
                      <GraduationCap className="w-3 h-3" /> {trainerName}
                    </div>
                  ) : (
                    <div className="text-[10px] text-muted-foreground/50 flex items-center gap-1 mb-2">
                      <GraduationCap className="w-3 h-3" /> غير مُسند لمدرب
                    </div>
                  )
                })()}
                {/* Badges row */}
                <div className="flex items-center gap-1.5 flex-wrap mb-3">
                  <span className={`inline-flex items-center text-[10px] px-2 py-0.5 rounded-full font-medium ${level.color}`}>{level.label}</span>
                  {/* Status badge — visual distinction between published and draft */}
                  {c.status === 'منشورة' ? (
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full font-semibold border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> منشورة
                    </span>
                  ) : c.status === 'مسودة' ? (
                    <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full font-semibold border border-amber-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> مسودة
                    </span>
                  ) : (
                    <span className="inline-flex items-center text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full font-medium border border-gray-200">{status.label}</span>
                  )}
                  {c.duration_hours > 0 && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full"><Clock className="w-2.5 h-2.5" /> {c.duration_hours}س</span>
                  )}
                  {c.modules_count > 0 && (
                    <span className="inline-flex items-center text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{c.modules_count} وحدات</span>
                  )}
                  {c.lessons_count > 0 && (
                    <span className="inline-flex items-center text-[10px] text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">{c.lessons_count} دروس</span>
                  )}
                  {c.enrolled > 0 && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full"><Users className="w-2.5 h-2.5" /> {c.enrolled}</span>
                  )}
                </div>
                {/* Action buttons */}
                <div className="flex items-center gap-1.5 pt-2 border-t border-gray-100">
                  <Button size="sm" variant="ghost" className="h-8 px-2.5 text-navy hover:bg-navy/5" onClick={() => { setEditing(c); setOpen(true) }}>
                    <Edit className="w-3.5 h-3.5" /> تعديل
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 px-2.5 text-red-500 hover:bg-red-500/10" onClick={() => setDeleteTarget(c)}>
                    <Trash2 className="w-3.5 h-3.5" /> حذف
                  </Button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      {/* Empty state */}
      {!items.length && !loading && (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gray-50 flex items-center justify-center mb-3">
            <BookOpen className="w-8 h-8 text-gray-300" />
          </div>
          <p className="text-sm text-muted-foreground mb-4">لا توجد دورات بعد</p>
          <Button className="bg-navy hover:bg-navy-light" onClick={() => { setEditing(null); setOpen(true) }}><Plus className="w-4 h-4 ml-1" /> إضافة أول دورة</Button>
        </div>
      )}
      {/* Loading state */}
      {loading && (
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 mx-auto text-navy animate-spin mb-3" />
          <p className="text-sm text-muted-foreground">جاري تحميل الدورات...</p>
        </div>
      )}
      {open && <ProCourseDialog open={open} onOpenChange={setOpen} course={editing} trainerId={undefined} onSaved={load} />}

      {/* Password-confirmation dialog for course deletion. The user must
          type their account password to confirm — protects against
          accidental destructive deletes. */}
      <PasswordConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o && !deleting) setDeleteTarget(null) }}
        title="تأكيد حذف الدورة"
        message="سيتم حذف جميع تفاصيل الدورة نهائياً: التقييمات، الشهادات، المدفوعات، الوحدات والدروس. لا يمكن التراجع عن هذا الإجراء."
        itemLabel="سيتم حذف الدورة التالية:"
        itemName={deleteTarget?.title}
        confirmLabel="حذف نهائي"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </SectionCard>
  )
})

function AdminExams() {
  const [exams, setExams] = useState<any[]>([])
  const [questions, setQuestions] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [tab, setTab] = useState<'exams' | 'questions'>('exams')
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const load = () => {
    setLoading(true)
    Promise.all([
      fetch('/api/exam-questions').then(r => r.json()).catch(() => []),
      fetch('/api/courses').then(r => r.json()).catch(() => []),
    ]).then(([q, c]) => {
      const qArr = Array.isArray(q) ? q : []
      setQuestions(qArr)
      setCourses(Array.isArray(c) ? c : [])
      // Group questions by lesson_id to form "exams" (each exam = all questions for one lesson)
      const examMap: Record<string, any> = {}
      for (const question of qArr) {
        const key = question.lesson_id || 'unassigned'
        if (!examMap[key]) {
          examMap[key] = {
            lesson_id: question.lesson_id,
            course_id: question.course_id,
            questions: [],
          }
        }
        examMap[key].questions.push(question)
      }
      setExams(Object.values(examMap))
      setLoading(false)
    })
  }

  useEffect(() => { load() }, [])

  const filteredExams = exams.filter((ex) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    const course = courses.find((c) => c.id === ex.course_id)
    return (course?.title || '').toLowerCase().includes(q)
  })

  const filteredQuestions = questions.filter((q) => {
    if (!search.trim()) return true
    const s = search.toLowerCase()
    return (q.question || '').toLowerCase().includes(s) ||
      (q.options && JSON.stringify(q.options).toLowerCase().includes(s))
  })

  const examStats = {
    total: exams.length,
    totalQuestions: questions.length,
    multipleChoice: questions.filter((q) => q.question_type === 'multiple_choice').length,
    trueFalse: questions.filter((q) => q.question_type === 'true_false').length,
  }

  return (
    <SectionCard
      title="بنك الأسئلة والاختبارات"
      description={`${exams.length} اختبار • ${questions.length} سؤال`}
    >
      {/* ⚡ Magical stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <div className="fia-card-hover relative p-3 rounded-xl border border-blue-300/40 bg-gradient-to-br from-blue-50 to-indigo-50 overflow-hidden">
          <div className="absolute -top-3 -right-3 w-10 h-10 bg-blue-500/15 rounded-full blur-lg" />
          <div className="relative flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground">الاختبارات</div>
              <div className="text-lg font-extrabold text-navy">{examStats.total}</div>
            </div>
          </div>
        </div>
        <div className="fia-card-hover relative p-3 rounded-xl border border-amber-300/40 bg-gradient-to-br from-amber-50 to-yellow-50 overflow-hidden">
          <div className="absolute -top-3 -right-3 w-10 h-10 bg-amber-500/15 rounded-full blur-lg" />
          <div className="relative flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center shadow-md">
              <HelpCircle className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground">إجمالي الأسئلة</div>
              <div className="text-lg font-extrabold text-navy">{examStats.totalQuestions}</div>
            </div>
          </div>
        </div>
        <div className="fia-card-hover relative p-3 rounded-xl border border-emerald-300/40 bg-gradient-to-br from-emerald-50 to-teal-50 overflow-hidden">
          <div className="absolute -top-3 -right-3 w-10 h-10 bg-emerald-500/15 rounded-full blur-lg" />
          <div className="relative flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md">
              <CheckCircle2 className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground">اختيار من متعدد</div>
              <div className="text-lg font-extrabold text-navy">{examStats.multipleChoice}</div>
            </div>
          </div>
        </div>
        <div className="fia-card-hover relative p-3 rounded-xl border border-purple-300/40 bg-gradient-to-br from-purple-50 to-fuchsia-50 overflow-hidden">
          <div className="absolute -top-3 -right-3 w-10 h-10 bg-purple-500/15 rounded-full blur-lg" />
          <div className="relative flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center shadow-md">
              <span className="text-white font-bold text-xs">T/F</span>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground">صح / خطأ</div>
              <div className="text-lg font-extrabold text-navy">{examStats.trueFalse}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ⚡ Magical tabs */}
      <div className="flex gap-2 border-b border-gold/20 pb-3 mb-4">
        <button
          onClick={() => setTab('exams')}
          className={`relative px-5 py-2.5 rounded-xl text-sm font-bold transition-all border overflow-hidden ${
            tab === 'exams'
              ? 'bg-gradient-to-br from-navy via-navy-light to-navy text-gold shadow-md border-gold/40'
              : 'bg-white text-navy border-gold/20 hover:border-gold/40 hover:bg-gold/5'
          }`}
        >
          {tab === 'exams' && (
            <div className="absolute inset-0 opacity-25 pointer-events-none" style={{
              backgroundImage: 'radial-gradient(circle at 20% 20%, #D4AF37 1px, transparent 1px)',
              backgroundSize: '12px 12px'
            }} />
          )}
          <span className="relative flex items-center gap-1.5">
            <FileText className="w-4 h-4" /> الاختبارات
          </span>
        </button>
        <button
          onClick={() => setTab('questions')}
          className={`relative px-5 py-2.5 rounded-xl text-sm font-bold transition-all border overflow-hidden ${
            tab === 'questions'
              ? 'bg-gradient-to-br from-navy via-navy-light to-navy text-gold shadow-md border-gold/40'
              : 'bg-white text-navy border-gold/20 hover:border-gold/40 hover:bg-gold/5'
          }`}
        >
          {tab === 'questions' && (
            <div className="absolute inset-0 opacity-25 pointer-events-none" style={{
              backgroundImage: 'radial-gradient(circle at 20% 20%, #D4AF37 1px, transparent 1px)',
              backgroundSize: '12px 12px'
            }} />
          )}
          <span className="relative flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4" /> بنك الأسئلة
          </span>
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Input placeholder={tab === 'exams' ? 'بحث باسم الدورة...' : 'بحث بنص السؤال أو الخيارات...'} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 rounded-xl border-gold/30 focus:border-gold focus:ring-gold/30 bg-white" />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gold/60" />
      </div>

      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 mx-auto animate-spin text-gold" />
          <p className="text-xs text-muted-foreground mt-2">جاري تحميل البيانات...</p>
        </div>
      ) : tab === 'exams' ? (
        /* ⚡ Magical Exams cards */
        filteredExams.length === 0 ? (
          <div className="text-center py-14">
            <div className="relative inline-block mb-4">
              <div className="absolute inset-0 bg-gold/20 rounded-full blur-2xl animate-pulse" />
              <div className="relative w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-navy via-navy-light to-navy flex items-center justify-center shadow-xl border border-gold/30">
                <FileText className="w-10 h-10 text-gold" />
              </div>
            </div>
            <h3 className="font-bold text-navy text-base mb-1.5">{search ? 'لا توجد نتائج' : 'لا توجد اختبارات بعد'}</h3>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              {search ? 'جرّب كلمات بحث مختلفة' : 'يتم إنشاء الاختبارات تلقائياً عند إضافة أسئلة لدروس من نوع "اختبار" في محتوى الدورات ✨'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 fia-stagger">
            {filteredExams.map((ex, i) => {
              const course = courses.find((c) => c.id === ex.course_id)
              const questionCount = ex.questions.length
              return (
                <Card key={i} className="fia-card-hover p-0 overflow-hidden border border-gold/20 hover:border-gold/40">
                  {/* Magical header */}
                  <div className="relative p-3 bg-gradient-to-br from-purple-600 via-purple-700 to-fuchsia-700 text-white overflow-hidden">
                    <div className="absolute inset-0 opacity-20" style={{
                      backgroundImage: 'radial-gradient(circle at 20% 20%, white 1px, transparent 1px)',
                      backgroundSize: '12px 12px'
                    }} />
                    <div className="absolute -top-4 -right-4 w-12 h-12 bg-white/15 rounded-full blur-xl" />
                    <div className="relative">
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-9 h-9 rounded-lg bg-white/15 backdrop-blur-sm border border-white/30 flex items-center justify-center shadow-md">
                          <FileText className="w-5 h-5 text-white" />
                        </div>
                        <Badge className="bg-white/15 text-white border border-white/30 backdrop-blur-sm text-[10px]">
                          {questionCount} سؤال
                        </Badge>
                      </div>
                      <div className="text-xs font-bold text-white line-clamp-2">{course?.title || 'دورة غير محددة'}</div>
                    </div>
                  </div>
                  {/* Body */}
                  <div className="p-3 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="text-[9px] text-muted-foreground mb-0.5">نوع</div>
                        <div className="text-[10px] font-bold text-navy">اختبار</div>
                      </div>
                      <div>
                        <div className="text-[9px] text-muted-foreground mb-0.5">الحالة</div>
                        <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30 text-[9px]">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse ml-1" />
                          نشط
                        </Badge>
                      </div>
                    </div>
                    <div className="pt-1.5 border-t border-border/40">
                      <div className="text-[9px] text-muted-foreground mb-0.5">معرف الدرس</div>
                      <div className="text-[10px] font-mono text-gold break-all" dir="ltr">{ex.lesson_id || '-'}</div>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )
      ) : (
        /* ⚡ Magical Questions list */
        filteredQuestions.length === 0 ? (
          <div className="text-center py-14">
            <div className="relative inline-block mb-4">
              <div className="absolute inset-0 bg-gold/20 rounded-full blur-2xl animate-pulse" />
              <div className="relative w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-navy via-navy-light to-navy flex items-center justify-center shadow-xl border border-gold/30">
                <HelpCircle className="w-10 h-10 text-gold" />
              </div>
            </div>
            <h3 className="font-bold text-navy text-base mb-1.5">{search ? 'لا توجد نتائج' : 'لا توجد أسئلة بعد'}</h3>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              {search ? 'جرّب كلمات بحث مختلفة' : 'يتم إضافة الأسئلة من مدير محتوى الدورة — افتح أي دورة وأضف درساً من نوع "اختبار" ✨'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredQuestions.map((q, i) => {
              const isMultiple = q.question_type === 'multiple_choice'
              const isTrueFalse = q.question_type === 'true_false'
              const course = courses.find((c) => c.id === q.course_id)
              return (
                <Card key={i} className="fia-card-hover p-3 border border-gold/20 hover:border-gold/40">
                  <div className="flex items-start gap-3">
                    {/* Type icon */}
                    <div className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center shadow-md ${
                      isMultiple
                        ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
                        : isTrueFalse
                          ? 'bg-gradient-to-br from-purple-500 to-fuchsia-600'
                          : 'bg-gradient-to-br from-amber-500 to-yellow-600'
                    }`}>
                      {isMultiple ? <CheckCircle2 className="w-5 h-5 text-white" /> : isTrueFalse ? <span className="text-white font-bold text-xs">T/F</span> : <HelpCircle className="w-5 h-5 text-white" />}
                    </div>
                    {/* Question + options */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge className={isMultiple ? 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30 text-[9px]' : isTrueFalse ? 'bg-purple-500/15 text-purple-700 border-purple-500/30 text-[9px]' : 'bg-amber-500/15 text-amber-700 border-amber-500/30 text-[9px]'}>
                          {isMultiple ? 'اختيار من متعدد' : isTrueFalse ? 'صح / خطأ' : 'سؤال'}
                        </Badge>
                        {course && <Badge className="bg-navy/5 text-navy border-navy/10 text-[9px]">{course.title}</Badge>}
                      </div>
                      <div className="font-bold text-navy text-sm mb-1 line-clamp-2">{q.question || 'سؤال بدون نص'}</div>
                      {q.options && Array.isArray(q.options) && q.options.length > 0 && (
                        <div className="space-y-0.5 mt-1">
                          {q.options.slice(0, 4).map((opt: any, idx: number) => {
                            const isCorrect = q.correct_answer === opt || q.correct_answer === idx || q.correct_answer === String(idx)
                            return (
                              <div key={idx} className={`text-xs flex items-center gap-1.5 ${isCorrect ? 'text-emerald-600 font-bold' : 'text-muted-foreground'}`}>
                                {isCorrect ? <CheckCircle2 className="w-3 h-3 flex-shrink-0" /> : <span className="w-3 h-3 flex-shrink-0 text-center text-[10px]">{(['أ','ب','ج','د','هـ','و','ز','ح','ط'])[idx]}</span>}
                                <span className="line-clamp-1">{opt}</span>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )
      )}
    </SectionCard>
  )
}

const AdminStudents = React.memo(function AdminStudents() {
  const [items, setItems] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [enrollments, setEnrollments] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetch('/api/students?role=student').then((r) => r.json()).then((d) => setItems(Array.isArray(d) ? d : []))
    fetch('/api/courses').then((r) => r.json()).then((d) => setCourses(Array.isArray(d) ? d : []))
    fetch('/api/enrollments').then((r) => r.json()).then((d) => setEnrollments(Array.isArray(d) ? d : []))
  }, [])

  // ⚡ REAL-TIME: students + enrollments — admin sees new students + enrollments INSTANTLY
  useEffect(() => {
    let channel: any
    try {
      channel = supabasePublic
        .channel('admin-students-realtime')
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'users' },
          (payload: any) => {
            if (payload.new.role === 'student') {
              setItems((prev) => [payload.new, ...prev])
              toast.info('👤 طالب جديد سجل في المنصة')
            }
          }
        )
        .on('postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'users' },
          (payload: any) => setItems((prev) => prev.map((s) => s.id === payload.new.id ? { ...s, ...payload.new } : s))
        )
        .on('postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'users' },
          (payload: any) => setItems((prev) => prev.filter((s) => s.id !== payload.old.id))
        )
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'enrollments' },
          (payload: any) => setEnrollments((prev) => [payload.new, ...prev])
        )
        .on('postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'enrollments' },
          (payload: any) => setEnrollments((prev) => prev.map((e) => e.id === payload.new.id ? { ...e, ...payload.new } : e))
        )
        .subscribe()
    } catch {}
    return () => { try { supabasePublic.removeChannel(channel) } catch {} }
  }, [])

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await fetch('/api/students', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: deleteTarget.id }) })
      toast.success('تم الحذف')
      setItems(items.filter((s) => s.id !== deleteTarget.id))
      setDeleteTarget(null)
      setSelectedStudent(null)
    } finally {
      setDeleting(false)
    }
  }

  const filtered = items.filter(s => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (s.name || '').toLowerCase().includes(q) || (s.email || '').toLowerCase().includes(q) || (s.phone || '').includes(q)
  })

  // Get student's enrollments
  const getStudentEnrollments = (studentId: string) => enrollments.filter(e => e.user_id === studentId)

  return (
    <SectionCard title="المتدربون" description={`${filtered.length} متدرب`}>
      {/* ⚡ Magical search bar with gold accent */}
      <div className="relative mb-4">
        <Input placeholder="بحث بالاسم أو البريد أو الهاتف..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 pl-10 border-gold/30 focus:border-gold focus:ring-gold/30 rounded-xl bg-white/80" />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gold/60" />
      </div>

      {filtered.length === 0 ? (
        /* ⚡ Magical empty state */
        <div className="text-center py-14">
          <div className="relative inline-block mb-4">
            <div className="absolute inset-0 bg-gold/20 rounded-full blur-2xl animate-pulse" />
            <div className="relative w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-navy via-navy-light to-navy flex items-center justify-center shadow-xl border border-gold/30">
              <Users className="w-10 h-10 text-gold" />
            </div>
          </div>
          <h3 className="font-bold text-navy text-base mb-1.5">{search ? 'لا توجد نتائج' : 'لا يوجد متدربون بعد'}</h3>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto">{search ? 'جرّب كلمات بحث مختلفة' : 'سيتم تسجيل المتدربون تلقائياً عند إنشاء حساباتهم ✨'}</p>
        </div>
      ) : (
        /* ⚡ Magical compact student cards — 2/3/4 grid */
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 fia-stagger">
          {filtered.map((s) => {
            const sEnrs = getStudentEnrollments(s.id)
            const completedCount = sEnrs.filter((e) => e.status === 'completed' || e.status === 'مكتمل').length
            const pendingCount = sEnrs.filter((e) => e.payment_status === 'pending').length
            return (
              <Card key={s.id} className="fia-course-card overflow-hidden cursor-default border border-gold/20">
                {/* ⚡ Magical header — navy gradient + gold dots */}
                <div className="relative p-3 bg-gradient-to-br from-navy via-navy-light to-navy text-white overflow-hidden">
                  <div className="absolute inset-0 opacity-20" style={{
                    backgroundImage: 'radial-gradient(circle at 20% 20%, #D4AF37 1px, transparent 1px)',
                    backgroundSize: '12px 12px'
                  }} />
                  <div className="absolute -top-4 -left-4 w-12 h-12 bg-gold/15 rounded-full blur-xl" />
                  <div className="relative flex items-center gap-2.5">
                    <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-gold/40 flex-shrink-0 bg-navy-light shadow-md">
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

                {/* ⚡ Magical body — compact info */}
                <div className="p-3 space-y-2.5">
                  {/* Stats row — mini badges */}
                  <div className="flex items-center gap-1.5">
                    <div className="flex-1 flex items-center gap-1 bg-blue-50 text-blue-700 rounded-lg px-2 py-1.5 border border-blue-200/40">
                      <BookOpen className="w-3 h-3 flex-shrink-0" />
                      <span className="text-[10px] font-bold">{sEnrs.length} دورة</span>
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
                  <div className="grid grid-cols-1 gap-1.5 text-[10px]">
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
                  {sEnrs.length > 0 && (
                    <div className="space-y-1 pt-1 border-t border-border/40">
                      {sEnrs.slice(0, 2).map((e) => {
                        const c = courses.find(co => co.id === e.course_id)
                        if (!c) return null
                        const isCompleted = e.status === 'completed' || e.status === 'مكتمل'
                        return (
                          <div key={e.id} className="text-[10px] flex items-center justify-between gap-1 bg-muted/20 rounded px-1.5 py-1">
                            <span className="truncate text-navy font-medium">{c.title}</span>
                            <span className={`flex-shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              isCompleted ? 'bg-emerald-500/15 text-emerald-700 border border-emerald-500/30'
                              : e.payment_status === 'pending' ? 'bg-amber-500/15 text-amber-700 border border-amber-500/30'
                              : 'bg-blue-500/15 text-blue-700 border border-blue-500/30'
                            }`}>
                              {isCompleted ? 'مكتمل' : e.payment_status === 'pending' ? 'بانتظار' : 'قيد التعلّم'}
                            </span>
                          </div>
                        )
                      })}
                      {sEnrs.length > 2 && <div className="text-[10px] text-muted-foreground text-center">+{sEnrs.length - 2} دورة أخرى</div>}
                    </div>
                  )}

                  {/* Actions row */}
                  <div className="flex gap-1 pt-1 border-t border-border/40">
                    <Button size="sm" variant="outline" className="flex-1 h-8 text-[10px] rounded-lg border-gold/30 hover:border-gold hover:bg-gold/5" onClick={() => setSelectedStudent(s)}>
                      <Eye className="w-3 h-3 ml-1" /> عرض
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-red-500/10" onClick={() => setDeleteTarget(s)}>
                      <Trash2 className="w-3 h-3 text-red-500" />
                    </Button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Student detail modal — magical themed */}
      {selectedStudent && (
        <Dialog open={true} onOpenChange={(o) => { if (!o) setSelectedStudent(null) }}>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto p-0 border-0">
            {/* Magical header */}
            <div className="relative p-5 bg-gradient-to-br from-navy via-navy-light to-navy text-white overflow-hidden">
              <div className="absolute inset-0 opacity-25" style={{
                backgroundImage: 'radial-gradient(circle at 12% 50%, #D4AF37 1.5px, transparent 1.5px), radial-gradient(circle at 88% 20%, white 1px, transparent 1px)',
                backgroundSize: '24px 24px, 18px 18px'
              }} />
              <div className="absolute -top-12 -left-12 w-32 h-32 bg-gold/20 rounded-full blur-2xl" />
              <button onClick={() => setSelectedStudent(null)} className="absolute top-3 left-3 w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center z-10">
                <X className="w-4 h-4 text-white/80" />
              </button>
              <div className="relative flex items-center gap-3">
                <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-gold/40 bg-navy-light shadow-md">
                  {selectedStudent.avatar ? (
                    <img src={selectedStudent.avatar} alt={selectedStudent.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gold font-bold text-2xl bg-gradient-to-br from-gold/20 to-amber-500/20">
                      {selectedStudent.name?.charAt(0)}
                    </div>
                  )}
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold text-white">{selectedStudent.name}</DialogTitle>
                  <div className="text-xs text-white/70 mt-0.5" dir="ltr">{selectedStudent.email}</div>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {/* Quick stats — 2 magical cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="fia-card-hover p-3 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200/40 rounded-xl">
                  <div className="flex items-center gap-2 text-blue-700">
                    <BookOpen className="w-4 h-4" />
                    <span className="text-[10px] font-bold">إجمالي الدورات</span>
                  </div>
                  <div className="text-2xl font-extrabold text-navy mt-1">{getStudentEnrollments(selectedStudent.id).length}</div>
                </div>
                <div className="fia-card-hover p-3 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200/40 rounded-xl">
                  <div className="flex items-center gap-2 text-emerald-700">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-[10px] font-bold">دورات مكتملة</span>
                  </div>
                  <div className="text-2xl font-extrabold text-navy mt-1">
                    {getStudentEnrollments(selectedStudent.id).filter((e) => e.status === 'completed' || e.status === 'مكتمل').length}
                  </div>
                </div>
              </div>

              {/* Contact info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-muted/30 rounded-xl border border-border">
                  <div className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1"><Mail className="w-3 h-3" /> الهاتف</div>
                  <div className="text-sm font-bold text-navy" dir="ltr">{selectedStudent.phone || '-'}</div>
                </div>
                <div className="p-3 bg-muted/30 rounded-xl border border-border">
                  <div className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> تاريخ التسجيل</div>
                  <div className="text-sm font-bold text-navy">{selectedStudent.created_at ? new Date(selectedStudent.created_at).toLocaleDateString('ar-EG') : '-'}</div>
                </div>
              </div>

              {/* Enrollments list */}
              <div>
                <h4 className="font-bold text-navy text-sm mb-2 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-gold" /> الدورات المسجّلة ({getStudentEnrollments(selectedStudent.id).length})
                </h4>
                <div className="space-y-2">
                  {getStudentEnrollments(selectedStudent.id).map((e) => {
                    const c = courses.find(co => co.id === e.course_id)
                    if (!c) return null
                    const isFree = c.price_type === 'مجانية' || c.price === 0
                    const isCompleted = e.status === 'completed' || e.status === 'مكتمل'
                    return (
                      <div key={e.id} className="flex items-center justify-between p-3 bg-white border border-border rounded-xl hover:border-gold/30 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-navy text-sm truncate">{c.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {isFree ? 'مجانية' : `${c.price?.toLocaleString()} ${c.currency || 'ر.ي'}`}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge className={
                            isCompleted ? 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30'
                            : e.payment_status === 'pending' ? 'bg-amber-500/15 text-amber-700 border-amber-500/30'
                            : 'bg-blue-500/15 text-blue-700 border-blue-500/30'
                          }>
                            {isCompleted ? 'مكتمل' : e.payment_status === 'pending' ? 'بانتظار الدفع' : 'قيد التعلّم'}
                          </Badge>
                        </div>
                      </div>
                    )
                  })}
                  {getStudentEnrollments(selectedStudent.id).length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">لم يسجّل في أي دورة بعد</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end p-4 bg-muted/20 border-t border-border">
              <Button variant="outline" onClick={() => setSelectedStudent(null)} className="rounded-xl">إغلاق</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <PasswordConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o && !deleting) setDeleteTarget(null) }}
        title="تأكيد حذف المتدرب"
        message="سيتم حذف المتدرب نهائياً من النظام. أدخل كلمة مرورك للتأكيد."
        itemLabel="سيتم حذف المتدرب التالي:"
        itemName={deleteTarget?.name}
        confirmLabel="حذف نهائي"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </SectionCard>
  )
})

const AdminPayments = React.memo(function AdminPayments() {
  const [items, setItems] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedPayment, setSelectedPayment] = useState<any | null>(null)
  // === REJECTION DIALOG STATE ===
  // When the admin clicks "رفض الدفع", we open a professional dialog
  // (instead of window.prompt) that has a MANDATORY reason field.
  // The reason is validated on BOTH frontend AND backend — the
  // /api/payments PUT handler rejects empty/whitespace-only reasons.
  const [rejectTarget, setRejectTarget] = useState<any | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejecting, setRejecting] = useState(false)
  const [rejectError, setRejectError] = useState('')

  const load = () => {
    fetch('/api/payments').then((r) => r.json()).then((d) => setItems(Array.isArray(d) ? d : []))
    fetch('/api/courses').then((r) => r.json()).then((d) => setCourses(Array.isArray(d) ? d : []))
  }
  useEffect(() => { load() }, [])

  // ⚡ REAL-TIME: payments — admin sees new payments INSTANTLY when
  // a student submits a payment proof. Also sees status updates.
  useEffect(() => {
    let channel: any
    try {
      channel = supabasePublic
        .channel('admin-payments-realtime')
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'payments' },
          (payload: any) => {
            // New payment submitted — add to top of list immediately
            setItems((prev) => [payload.new, ...prev])
            // Show toast notification
            toast.info('💰 طلب دفع جديد - بانتظار المراجعة', {
              description: `${payload.new.amount} ${payload.new.currency || 'ر.ي'}`,
            })
          }
        )
        .on('postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'payments' },
          (payload: any) => {
            // Payment status changed (e.g. by another admin)
            setItems((prev) => prev.map((p) => p.id === payload.new.id ? { ...p, ...payload.new } : p))
          }
        )
        .on('postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'payments' },
          (payload: any) => {
            setItems((prev) => prev.filter((p) => p.id !== payload.old.id))
          }
        )
        .subscribe()
    } catch {}
    return () => { try { supabasePublic.removeChannel(channel) } catch {} }
  }, [])

  // ⚡ REAL-TIME: enrollments — admin sees new enrollments instantly
  useEffect(() => {
    let channel: any
    try {
      channel = supabasePublic
        .channel('admin-enrollments-realtime')
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'enrollments' },
          () => {
            toast.success('📚 تسجيل جديد في دورة')
          }
        )
        .subscribe()
    } catch {}
    return () => { try { supabasePublic.removeChannel(channel) } catch {} }
  }, [])

  // ⚡ REAL-TIME: certificates — admin sees certificate requests + issued certs
  useEffect(() => {
    let channel: any
    try {
      channel = supabasePublic
        .channel('admin-certificates-realtime')
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'certificates' },
          () => {
            toast.success('🎓 تم إصدار شهادة جديدة')
          }
        )
        .subscribe()
    } catch {}
    return () => { try { supabasePublic.removeChannel(channel) } catch {} }
  }, [])

  const updateStatus = async (id: string, status: string, reason?: string) => {
    // ⚡ INSTANT OPTIMISTIC UPDATE: update the UI IMMEDIATELY before
    // the server responds. This makes the action feel instant.
    // If the server fails, we revert the optimistic update.
    const previousItems = items
    setItems((prev) => prev.map((p) => p.id === id ? { ...p, status, rejection_reason: reason || p.rejection_reason } : p))

    try {
      const res = await fetch('/api/payments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status, rejection_reason: reason }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        // Revert optimistic update on failure
        setItems(previousItems)
        toast.error(err.error || 'فشل تحديث حالة الدفع')
        return
      }
      toast.success(status === 'مكتمل' ? 'تم قبول الدفع — تم تفعيل الدورة للمتدرب' : status === 'ملغي' ? 'تم رفض الدفع — تم إشعار المتدرب' : 'تم التحديث')
      // Realtime subscription will sync other admins automatically
      setSelectedPayment(null)
    } catch {
      // Revert optimistic update on network error
      setItems(previousItems)
      toast.error('خطأ في الاتصال')
    }
  }

  // === REJECTION CONFIRMATION FLOW ===
  // Opens the rejection dialog with the target payment's details.
  // The admin MUST type a reason — the "تأكيد الرفض" button is
  // disabled until the reason field is non-empty.
  const openRejectDialog = (payment: any) => {
    setRejectTarget(payment)
    setRejectReason('')
    setRejectError('')
    setSelectedPayment(null) // close the detail dialog if open
  }

  // Confirms the rejection: validates the reason is non-empty,
  // then calls updateStatus with the reason. The button is
  // disabled during the request to prevent duplicate submissions.
  // After success, updates the local state IMMEDIATELY so the
  // rejected payment shows "ملغي" status — prevents the admin
  // from clicking "reject" again on the same payment.
  const confirmReject = async () => {
    if (!rejectTarget) return
    const trimmed = rejectReason.trim()
    if (!trimmed) {
      setRejectError('سبب الرفض مطلوب — يرجى كتابة سبب واضح')
      return
    }
    if (trimmed.length < 5) {
      setRejectError('السبب قصير جداً — يرجى كتابة سبب مفصل (5 أحرف على الأقل)')
      return
    }
    setRejecting(true)
    setRejectError('')
    try {
      const res = await fetch('/api/payments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: rejectTarget.id, status: 'ملغي', rejection_reason: trimmed }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error || 'فشل رفض المعاملة')
        return
      }
      // === OPTIMISTIC STATE UPDATE ===
      // Update the payment's status in local state IMMEDIATELY so:
      // 1. The reject button disappears (only shown for 'قيد الانتظار')
      // 2. The admin can't click reject again
      // 3. The status badge shows 'ملغي' instantly
      const rejectedPayment = rejectTarget
      setItems((prev) => prev.map((p) =>
        p.id === rejectedPayment.id
          ? { ...p, status: 'ملغي', reference: (p.reference || '') + ` | REJECTION: ${trimmed}` }
          : p
      ))
      toast.success('تم رفض الدفع — تم إشعار المتدرب')
      setRejectTarget(null)
      setRejectReason('')
    } catch {
      toast.error('خطأ في الاتصال')
    } finally {
      setRejecting(false)
    }
  }

  const closeRejectDialog = () => {
    if (rejecting) return // prevent closing during request
    setRejectTarget(null)
    setRejectReason('')
    setRejectError('')
  }

  const filtered = items.filter(p => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      return (p.reference || '').toLowerCase().includes(q) || (p.method || '').toLowerCase().includes(q)
    }
    return true
  })

  // Extract proof URL from reference field (format: "JB-123 | PROOF: https://...")
  const extractProofUrl = (ref: string) => {
    if (!ref) return null
    const match = ref.match(/PROOF:\s*(https?:\/\/[^\s|]+)/i)
    return match ? match[1] : null
  }

  // Get course for payment
  const getCourse = (courseId: string) => courses.find(c => c.id === courseId)

  // Determine currency to display — prefer the course's currency
  // (source of truth) over the payment's stored currency, since
  // older payment rows may have defaulted to 'ر.ي' for USD courses.
  const getCurrency = (p: any) => {
    if (p?.course_id) {
      const course = getCourse(p.course_id)
      if (course?.currency) return course.currency
    }
    return p?.currency || 'ر.ي'
  }

  // Extract coupon code from the reference field — stored as
  // "| COUPON:CODE-HERE". Returns null if no coupon was applied.
  const getCouponCode = (p: any): string | null => {
    const ref = p?.reference
    if (!ref) return null
    const match = String(ref).match(/COUPON:\s*([A-Za-z0-9_-]+)/i)
    return match ? match[1].toUpperCase() : null
  }

  // Strip PROOF: and COUPON: markers from reference for clean display.
  // Also strip the RETAKE:<course-uuid> prefix (exam retake fee rows) —
  // the retake state is shown as a dedicated badge instead.
  const cleanReference = (ref: string | null | undefined) => {
    if (!ref) return null
    return ref
      .replace(/\s*\|\s*PROOF:.*$/i, '')
      .replace(/\s*\|\s*COUPON:.*$/i, '')
      .replace(/^RETAKE:[a-zA-Z0-9-]+\s*\|?\s*/i, '')
      .replace(/\s*\|\s*__USED__:.*$/i, '')
      .trim() || null
  }

  return (
    <SectionCard title="المدفوعات" description={`${filtered.length} من ${items.length} معاملة`}>
      {/* ⚡ Magical search + filter */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gold/70 pointer-events-none" />
          <Input
            placeholder="بحث برقم المعاملة أو الطريقة..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10 rounded-xl border-gold/30 focus:border-gold focus:ring-gold/30"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gold/30 rounded-xl bg-white text-sm font-medium text-navy focus:border-gold focus:ring-gold/30 outline-none"
        >
          <option value="all">كل الحالات</option>
          <option value="قيد الانتظار">قيد الانتظار</option>
          <option value="مكتمل">مكتمل</option>
          <option value="ملغي">ملغي</option>
        </select>
      </div>

      {/* ⚡ Magical state-aware stats strip */}
      {items.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="relative p-2.5 rounded-xl border border-amber-300/50 bg-gradient-to-br from-amber-50 to-amber-50/20 overflow-hidden">
            <div className="absolute -top-2 -right-2 w-10 h-10 bg-amber-300/30 rounded-full blur-xl" />
            <div className="relative flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center flex-shrink-0">
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] text-amber-700 font-medium truncate">قيد الانتظار</div>
                <div className="text-sm font-bold text-amber-700">{items.filter((p) => p.status === 'قيد الانتظار').length}</div>
              </div>
            </div>
          </div>
          <div className="relative p-2.5 rounded-xl border border-emerald-300/50 bg-gradient-to-br from-emerald-50 to-emerald-50/20 overflow-hidden">
            <div className="absolute -top-2 -right-2 w-10 h-10 bg-emerald-300/30 rounded-full blur-xl" />
            <div className="relative flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] text-emerald-700 font-medium truncate">مكتمل</div>
                <div className="text-sm font-bold text-emerald-700">{items.filter((p) => p.status === 'مكتمل').length}</div>
              </div>
            </div>
          </div>
          <div className="relative p-2.5 rounded-xl border border-rose-300/50 bg-gradient-to-br from-rose-50 to-rose-50/20 overflow-hidden">
            <div className="absolute -top-2 -right-2 w-10 h-10 bg-rose-300/30 rounded-full blur-xl" />
            <div className="relative flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-rose-500/15 flex items-center justify-center flex-shrink-0">
                <XCircle className="w-4 h-4 text-rose-600" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] text-rose-700 font-medium truncate">ملغي</div>
                <div className="text-sm font-bold text-rose-700">{items.filter((p) => p.status === 'ملغي').length}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ⚡ Magical payment cards grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 fia-stagger">
        {filtered.map((p) => {
          const course = getCourse(p.course_id)
          const proofUrl = extractProofUrl(p.reference)
          const isPending = p.status === 'قيد الانتظار'
          const isCompleted = p.status === 'مكتمل'
          const couponCode = getCouponCode(p)
          const isRetakeFee = (p.reference || '').startsWith('RETAKE')
          const isRetakeUsed = isRetakeFee && (p.reference || '').includes('__USED__')
          const ref = cleanReference(p.reference)
          const currency = getCurrency(p)
          const hasCoupon = !!couponCode
          const stateGradient = isCompleted
            ? 'from-emerald-500 to-teal-600'
            : p.status === 'ملغي'
              ? 'from-rose-500 to-red-600'
              : 'from-amber-500 to-orange-600'
          const stateBadge = isCompleted
            ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30'
            : p.status === 'ملغي'
              ? 'bg-rose-500/15 text-rose-600 border-rose-500/30'
              : 'bg-amber-500/15 text-amber-600 border-amber-500/30'
          return (
            <div
              key={p.id}
              className={`group relative overflow-hidden rounded-2xl bg-white border ${hasCoupon ? 'border-rose-300/60 ring-1 ring-rose-500/15' : 'border-gray-200/60'} hover:shadow-lg transition-all fia-card-hover`}
            >
              {/* Top state-aware gradient strip */}
              <div className={`h-1.5 bg-gradient-to-r ${stateGradient}`} />
              {/* Retake-fee corner badge */}
              {isRetakeFee && (
                <div className={`absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                  isRetakeUsed ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600' : 'bg-purple-500/10 border-purple-500/40 text-purple-600'
                }`}>
                  🔁 رسوم إعادة اختبار{isRetakeUsed ? ' — مستخدمة ✓' : ''}
                </div>
              )}
              {/* Coupon corner ribbon */}
              {hasCoupon && (
                <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-rose-500/15 border border-rose-500/40 text-rose-600 text-[10px] font-mono font-bold" dir="ltr">
                  🎟️ {couponCode}
                </div>
              )}
              <div className="p-4">
                {/* Amount + status */}
                <div className="flex items-start justify-between mb-3 gap-2">
                  <div>
                    <div className="text-[10px] text-muted-foreground mb-0.5">المبلغ</div>
                    <div className="font-extrabold text-navy text-base" dir="ltr">
                      {p.amount?.toLocaleString()} <span className="text-xs font-bold text-gold">{currency}</span>
                    </div>
                  </div>
                  <Badge className={`text-[10px] font-bold border ${stateBadge}`}>{p.status}</Badge>
                </div>
                {/* Method + course + reference */}
                <div className="space-y-1.5 mb-3">
                  <div className="flex items-center gap-1.5 text-xs">
                    <CreditCard className="w-3.5 h-3.5 text-gold flex-shrink-0" />
                    <span className="font-medium text-navy truncate">{p.method || '-'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <BookOpen className="w-3.5 h-3.5 text-gold flex-shrink-0" />
                    <span className="text-muted-foreground truncate flex-1">
                      {course ? course.title : 'دورة غير محددة'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground" dir="ltr">
                    <Hash className="w-3 h-3 text-gold/60 flex-shrink-0" />
                    <span className="truncate">{ref || '-'}</span>
                  </div>
                </div>
                {/* Proof indicator */}
                {proofUrl && (
                  <a
                    href={proofUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mb-3 text-[10px] text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" /> إثبات دفع مرفق
                  </a>
                )}
                {/* Date + actions */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div className="text-[10px] text-muted-foreground" dir="ltr">
                    {p.date ? new Date(p.date).toLocaleDateString('ar-EG') : '-'}
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-navy hover:bg-navy/5 rounded-lg" onClick={() => setSelectedPayment(p)} title="عرض التفاصيل">
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                    {isPending && (
                      <>
                        <Button size="sm" className="h-8 px-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] rounded-lg shadow-sm" onClick={() => updateStatus(p.id, 'مكتمل')}>
                          <CheckCircle2 className="w-3.5 h-3.5 ml-0.5" /> قبول
                        </Button>
                        <Button size="sm" variant="outline" className="h-8 px-2 border-rose-500/40 text-rose-500 hover:bg-rose-500/10 text-[11px] rounded-lg" onClick={() => openRejectDialog(p)}>
                          <XCircle className="w-3.5 h-3.5 ml-0.5" /> رفض
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ⚡ Magical empty state */}
      {!filtered.length && (
        <div className="text-center py-16">
          <div className="relative inline-block mb-4">
            <div className="absolute inset-0 bg-gold/20 rounded-full blur-2xl animate-pulse" />
            <div className="relative w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-navy via-navy-light to-navy flex items-center justify-center shadow-xl border border-gold/30">
              {search ? <Search className="w-10 h-10 text-gold" /> : <Inbox className="w-10 h-10 text-gold" />}
            </div>
          </div>
          <h3 className="font-bold text-navy text-base mb-1.5">{search ? 'لا توجد نتائج مطابقة' : 'لا توجد مدفوعات بعد'}</h3>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto">
            {search ? 'جرّب تعديل البحث أو الفلتر ✨' : 'ستظهر طلبات الدفع الجديدة هنا فور إرسالها ✨'}
          </p>
        </div>
      )}

      {/* === Payment detail modal — magical === */}
      {selectedPayment && (
        <Dialog open={true} onOpenChange={(o) => { if (!o) setSelectedPayment(null) }}>
          <DialogContent className="sm:max-w-lg p-0 overflow-hidden" showCloseButton={!rejecting}>
            {/* Navy gradient header */}
            <div className="relative bg-gradient-to-br from-navy via-navy-light to-navy px-6 pt-6 pb-5 text-center overflow-hidden">
              <div className="absolute inset-0 opacity-25" style={{
                backgroundImage: 'radial-gradient(circle at 12% 50%, #D4AF37 1.5px, transparent 1.5px), radial-gradient(circle at 88% 50%, white 1px, transparent 1px)',
                backgroundSize: '24px 24px, 18px 18px'
              }} />
              <div className="absolute -top-8 -right-8 w-32 h-32 bg-gold/15 rounded-full blur-2xl" />
              <div className="relative w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-gold to-amber-500 flex items-center justify-center mb-3 shadow-md border border-white/30">
                <CreditCard className="w-7 h-7 text-navy" />
              </div>
              <h2 className="relative text-lg font-bold text-white leading-tight">تفاصيل المعاملة</h2>
            </div>

            <div className="px-6 py-5 space-y-4">
              {(() => {
                const couponCode = getCouponCode(selectedPayment)
                const currency = getCurrency(selectedPayment)
                const hasCoupon = !!couponCode
                return (
                  <div className={`relative p-4 rounded-xl flex items-center justify-between overflow-hidden ${hasCoupon ? 'bg-gradient-to-br from-rose-50 to-rose-50/30 border-2 border-rose-500' : 'bg-gradient-to-br from-gold/10 to-gold/5 border border-gold/30'}`}>
                    <div className="absolute -top-3 -right-3 w-12 h-12 bg-gold/15 rounded-full blur-xl" />
                    <span className={`relative text-sm font-semibold ${hasCoupon ? 'text-rose-700' : 'text-navy'}`}>
                      {hasCoupon ? '⚠ المبلغ بعد الخصم:' : 'المبلغ:'}
                    </span>
                    <div className="relative flex flex-col items-end gap-1">
                      <span className={`text-xl font-extrabold ${hasCoupon ? 'text-rose-600' : 'text-gold'}`} dir="ltr">
                        {selectedPayment.amount?.toLocaleString()} {currency}
                      </span>
                      {hasCoupon && (
                        <span className="text-[11px] text-rose-600 font-mono" dir="ltr">🎟️ {couponCode}</span>
                      )}
                    </div>
                  </div>
                )
              })()}
              <div className="grid grid-cols-2 gap-3">
                <div className="relative p-3 rounded-xl bg-muted/30 overflow-hidden">
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-gold/10 rounded-full blur-lg" />
                  <div className="relative text-xs text-muted-foreground mb-0.5">طريقة الدفع</div>
                  <div className="relative text-sm font-bold text-navy">{selectedPayment.method || '-'}</div>
                </div>
                <div className="relative p-3 rounded-xl bg-muted/30 overflow-hidden">
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-gold/10 rounded-full blur-lg" />
                  <div className="relative text-xs text-muted-foreground mb-0.5">التاريخ</div>
                  <div className="relative text-sm font-bold text-navy" dir="ltr">{selectedPayment.date ? new Date(selectedPayment.date).toLocaleDateString('ar-EG') : '-'}</div>
                </div>
                <div className="relative p-3 rounded-xl bg-muted/30 overflow-hidden">
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-gold/10 rounded-full blur-lg" />
                  <div className="relative text-xs text-muted-foreground mb-0.5">رقم المعاملة</div>
                  <div className="relative text-sm font-bold font-mono text-navy" dir="ltr">{cleanReference(selectedPayment.reference) || '-'}</div>
                </div>
                <div className="relative p-3 rounded-xl bg-muted/30 overflow-hidden">
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-gold/10 rounded-full blur-lg" />
                  <div className="relative text-xs text-muted-foreground mb-0.5">الحالة</div>
                  <Badge className={`relative ${selectedPayment.status === 'مكتمل' ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30' : selectedPayment.status === 'ملغي' ? 'bg-rose-500/15 text-rose-600 border-rose-500/30' : 'bg-amber-500/15 text-amber-600 border-amber-500/30'}`}>{selectedPayment.status}</Badge>
                </div>
              </div>
              {(() => {
                const course = getCourse(selectedPayment.course_id)
                return course ? (
                  <div className="relative p-3 rounded-xl bg-muted/30 overflow-hidden">
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-gold/10 rounded-full blur-lg" />
                    <div className="relative text-xs text-muted-foreground mb-0.5">الدورة</div>
                    <div className="relative text-sm font-bold text-navy">{course.title}</div>
                    <div className="relative text-xs text-muted-foreground">{course.price_type === 'مجانية' || course.price === 0 ? 'مجانية' : `${course.price?.toLocaleString()} ${course.currency || 'ر.ي'}`}</div>
                  </div>
                ) : null
              })()}

              {/* Proof image */}
              {(() => {
                const proofUrl = extractProofUrl(selectedPayment.reference)
                return proofUrl ? (
                  <div>
                    <div className="text-sm font-bold text-navy mb-2 flex items-center gap-2">
                      <ExternalLink className="w-4 h-4 text-gold" /> إثبات الدفع
                    </div>
                    <div className="rounded-xl overflow-hidden border-2 border-gold/30 shadow-md">
                      <img src={proofUrl} alt="إثبات الدفع" className="max-w-full max-h-64 object-contain mx-auto" />
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground text-sm">لا يوجد إثبات دفع مرفق</div>
                )
              })()}

              {selectedPayment.status === 'قيد الانتظار' && (
                <div className="flex gap-2 pt-2">
                  <Button className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-xl shadow-md active:scale-[0.97] transition-all" onClick={() => updateStatus(selectedPayment.id, 'مكتمل')}>
                    <CheckCircle2 className="w-4 h-4 ml-1" /> قبول الدفع
                  </Button>
                  <Button variant="outline" className="flex-1 border-rose-500/40 text-rose-500 hover:bg-rose-500/10 rounded-xl" onClick={() => openRejectDialog(selectedPayment)} disabled={rejecting}>
                    <XCircle className="w-4 h-4 ml-1" /> رفض الدفع
                  </Button>
                </div>
              )}
            </div>
            <div className="px-6 pb-6 flex justify-end">
              <Button variant="outline" onClick={() => setSelectedPayment(null)} className="rounded-xl">إغلاق</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* === REJECTION DIALOG — Professional design matching ConfirmDialog === */}
      <Dialog open={!!rejectTarget} onOpenChange={(o) => { if (!o) closeRejectDialog() }}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden" showCloseButton={!rejecting}>
          {/* === Red gradient header with magical dot pattern === */}
          <div className="relative bg-gradient-to-br from-red-500 to-red-600 px-6 pt-6 pb-5 text-center overflow-hidden">
            <div className="absolute inset-0 opacity-20" style={{
              backgroundImage: 'radial-gradient(circle at 20% 30%, #fff 1.5px, transparent 1.5px), radial-gradient(circle at 80% 70%, #fecaca 1px, transparent 1px)',
              backgroundSize: '24px 24px, 18px 18px'
            }} />
            <div className="absolute -top-8 -right-8 w-28 h-28 bg-white/15 rounded-full blur-2xl" />
            <div className="relative w-16 h-16 mx-auto rounded-full bg-white/20 flex items-center justify-center mb-3 border border-white/30">
              <AlertTriangle className="w-8 h-8 text-white" />
            </div>
            <h2 className="relative text-lg font-bold text-white leading-tight">
              تأكيد رفض المعاملة
            </h2>
          </div>

          {/* === White body === */}
          <div className="px-6 py-5 space-y-4">
            {/* Payment details summary */}
            {rejectTarget && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 space-y-1.5 text-center">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">المبلغ:</span>
                  <span className="font-bold text-navy" dir="ltr">
                    {(rejectTarget.amount || 0).toLocaleString()} {rejectTarget.currency || 'ر.ي'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">وسيلة الدفع:</span>
                  <span className="font-bold text-navy">{rejectTarget.method || 'غير محدد'}</span>
                </div>
                {rejectTarget.reference && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">المرجع:</span>
                    <span className="font-mono text-navy text-[10px]" dir="ltr">{rejectTarget.reference}</span>
                  </div>
                )}
              </div>
            )}

            {/* Instructions */}
            <p className="text-xs text-red-700 text-center leading-relaxed">
              يرجى مراجعة تفاصيل المعاملة وكتابة سبب الرفض بوضوح. سيُحفظ السبب ضمن سجل المعاملة.
            </p>

            {/* Mandatory reason field */}
            <div>
              <Label className="text-navy font-bold text-sm flex items-center gap-1 mb-1.5">
                سبب الرفض — حقل إلزامي
                <span className="text-red-500">*</span>
              </Label>
              <Textarea
                value={rejectReason}
                onChange={(e) => { setRejectReason(e.target.value); setRejectError('') }}
                placeholder="اكتب السبب بوضوح، مثل: إيصال غير واضح، مبلغ غير مطابق، أو تعذر التحقق من عملية الدفع."
                rows={4}
                className="resize-none rounded-xl"
                disabled={rejecting}
                autoFocus
                maxLength={500}
              />
              <div className="flex items-center justify-between mt-1">
                {rejectError ? (
                  <p className="text-[10px] text-red-500 font-bold">{rejectError}</p>
                ) : (
                  <p className="text-[10px] text-muted-foreground">5 أحرف على الأقل، بحد أقصى 500 حرف</p>
                )}
                <span className="text-[10px] text-muted-foreground">{rejectReason.length}/500</span>
              </div>
            </div>
          </div>

          {/* === Buttons === */}
          <div className="px-6 pb-6 pt-2 flex gap-2">
            <Button variant="outline" onClick={closeRejectDialog} disabled={rejecting} className="flex-1 h-11 text-sm font-semibold rounded-xl">
              إلغاء
            </Button>
            <Button
              className="flex-1 h-11 text-sm font-bold rounded-xl bg-red-600 hover:bg-red-700 text-white"
              onClick={confirmReject}
              disabled={rejecting || rejectReason.trim().length < 5}
            >
              {rejecting ? (
                <><Loader2 className="w-4 h-4 ml-1 animate-spin" /> جاري الرفض...</>
              ) : (
                <><AlertTriangle className="w-4 h-4 ml-1" /> تأكيد الرفض</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </SectionCard>
  )
})

function AdminPaymentMethods() {
  const [items, setItems] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
  const [deleting, setDeleting] = useState(false)
  const load = () => fetch('/api/payment-methods').then((r) => r.json()).then((d) => setItems(Array.isArray(d) ? d : []))
  useEffect(() => { load() }, [])
  // ⚡ REAL-TIME: payment methods — admin sees changes INSTANTLY
  useEffect(() => {
    let channel: any
    try {
      channel = supabasePublic
        .channel('admin-payment-methods-realtime')
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'payment_methods' },
          (payload: any) => setItems((prev) => [payload.new, ...prev])
        )
        .on('postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'payment_methods' },
          (payload: any) => setItems((prev) => prev.map((p) => p.id === payload.new.id ? { ...p, ...payload.new } : p))
        )
        .on('postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'payment_methods' },
          (payload: any) => setItems((prev) => prev.filter((p) => p.id !== payload.old.id))
        )
        .subscribe()
    } catch {}
    return () => { try { supabasePublic.removeChannel(channel) } catch {} }
  }, [])
  const toggle = async (id: string, enabled: boolean) => {
    await fetch('/api/payment-methods', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, enabled }) })
    setItems(items.map((p) => (p.id === id ? { ...p, enabled } : p)))
  }
  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await fetch('/api/payment-methods', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: deleteTarget.id }) })
      toast.success('تم الحذف')
      setDeleteTarget(null)
      load()
    } finally {
      setDeleting(false)
    }
  }

  // Helper: get category badge
  const getCategoryInfo = (p: any) => {
    if (p.payment_category === 'crypto') {
      return { label: 'عملة رقمية', color: 'from-amber-500 to-orange-600', text: 'text-amber-600', bg: 'bg-amber-50', icon: '₿' }
    }
    return { label: 'عملة محلية', color: 'from-emerald-500 to-teal-600', text: 'text-emerald-600', bg: 'bg-emerald-50', icon: '💵' }
  }

  return (
    <SectionCard
      title="طرق الدفع"
      description={`${items.length} طريقة`}
      action={<Button className="bg-navy hover:bg-navy-light" onClick={() => { setEditing(null); setOpen(true) }}><Plus className="w-4 h-4 ml-1" /> جديدة</Button>}
    >
      {/* ⚡ Professional payment method cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((p) => {
          const cat = getCategoryInfo(p)
          return (
            <div key={p.id} className="group relative overflow-hidden rounded-2xl bg-white border border-gray-200/60 hover:shadow-lg transition-all">
              {/* Top gradient bar based on category */}
              <div className={`h-1.5 bg-gradient-to-r ${cat.color}`} />
              {/* Body */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${cat.color} flex items-center justify-center shadow-sm text-lg font-bold text-white`}>
                      {p.payment_category === 'crypto' ? (p.crypto_coin?.charAt(0) || '₿') : (p.icon || '💳')}
                    </div>
                    <div>
                      <h4 className="font-bold text-navy text-sm leading-tight">{p.name}</h4>
                      <span className={`text-[10px] ${cat.text} ${cat.bg} px-2 py-0.5 rounded-full font-medium`}>{cat.label}</span>
                    </div>
                  </div>
                  <Switch checked={!!p.enabled} onCheckedChange={(v) => toggle(p.id, v)} />
                </div>

                {/* Crypto details */}
                {p.payment_category === 'crypto' && (
                  <div className="space-y-1.5 mb-3 p-2.5 bg-amber-50/50 rounded-xl border border-amber-100/60">
                    {p.crypto_coin && (
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-gray-400">العملة:</span>
                        <span className="font-bold text-amber-700">{p.crypto_coin}</span>
                      </div>
                    )}
                    {p.crypto_network && (
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-gray-400">الشبكة:</span>
                        <span className="font-mono font-bold text-amber-700" dir="ltr">{p.crypto_network}</span>
                      </div>
                    )}
                    {p.wallet_address && (
                      <div className="text-[11px]">
                        <span className="text-gray-400">العنوان: </span>
                        <span className="font-mono text-navy break-all" dir="ltr">{p.wallet_address.substring(0, 20)}...{p.wallet_address.slice(-4)}</span>
                      </div>
                    )}
                    {p.binance_pay_id && (
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-gray-400">Binance Pay ID:</span>
                        <span className="font-mono font-bold text-amber-700" dir="ltr">{p.binance_pay_id}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Local currency details */}
                {p.payment_category !== 'crypto' && (
                  <div className="space-y-1.5 mb-3 p-2.5 bg-emerald-50/50 rounded-xl border border-emerald-100/60">
                    {(p.account_number || p.wallet_id) && (
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-gray-400">رقم الحساب:</span>
                        <span className="font-mono font-bold text-emerald-700" dir="ltr">{p.account_number || p.wallet_id}</span>
                      </div>
                    )}
                    {p.account_holder && (
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-gray-400">صاحب الحساب:</span>
                        <span className="font-medium text-emerald-700">{p.account_holder}</span>
                      </div>
                    )}
                    {p.currency && (
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-gray-400">العملة:</span>
                        <span className={`font-bold ${p.currency === 'الكل' ? 'text-blue-600 bg-blue-50/80 px-2 py-0.5 rounded-md' : 'text-emerald-700'}`}>{p.currency === 'الكل' ? '🌍 كل العملات' : p.currency}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Instructions */}
                {p.instructions && <p className="text-[11px] text-gray-400 line-clamp-2 mb-3">{p.instructions}</p>}

                {/* Actions */}
                <div className="flex items-center gap-1.5 pt-2 border-t border-gray-100">
                  <Button size="sm" variant="ghost" className="h-8 px-2.5 text-navy hover:bg-navy/5" onClick={() => { setEditing(p); setOpen(true) }}>
                    <Edit className="w-3.5 h-3.5" /> تعديل
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 px-2.5 text-red-500 hover:bg-red-500/10" onClick={() => setDeleteTarget(p)}>
                    <Trash2 className="w-3.5 h-3.5" /> حذف
                  </Button>
                </div>
              </div>
            </div>
          )
        })}
        {/* Empty state */}
        {!items.length && (
          <div className="text-center py-12 col-span-full">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gray-50 flex items-center justify-center mb-3">
              <DollarSign className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-sm text-muted-foreground mb-4">لا توجد طرق دفع بعد</p>
            <Button className="bg-navy hover:bg-navy-light" onClick={() => { setEditing(null); setOpen(true) }}><Plus className="w-4 h-4 ml-1" /> إضافة طريقة دفع</Button>
          </div>
        )}
      </div>

      {/* ⚡ Professional Payment Method Dialog */}
      {open && <PaymentMethodDialog open={open} onOpenChange={setOpen} editing={editing} onSaved={load} />}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o && !deleting) setDeleteTarget(null) }}
        title="تأكيد حذف طريقة الدفع"
        message="هل أنت متأكد من الحذف؟"
        itemLabel="سيتم حذف طريقة الدفع التالية:"
        itemName={deleteTarget?.name}
        confirmLabel="حذف"
        cancelLabel="إلغاء"
        variant="danger"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </SectionCard>
  )
}

// ⚡ Professional Payment Method Dialog — supports crypto + local currencies
function PaymentMethodDialog({ open, onOpenChange, editing, onSaved }: any) {
  const [form, setForm] = useState<any>(editing || {})
  const [saving, setSaving] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null)

  useEffect(() => {
    setForm(editing || { payment_category: 'local', enabled: true, type: 'manual', currency: 'ر.ي' })
  }, [editing])

  const CRYPTO_COINS = [
    { value: 'USDT', label: 'USDT (تيثر)' },
    { value: 'USDC', label: 'USDC (USD Coin)' },
    { value: 'BTC', label: 'BTC (بيتكوين)' },
    { value: 'ETH', label: 'ETH (إيثيريوم)' },
    { value: 'BNB', label: 'BNB (بايننس)' },
  ]

  const CRYPTO_NETWORKS = [
    { value: 'TRC20', label: 'TRC20 (Tron) — رسوم منخفضة' },
    { value: 'ERC20', label: 'ERC20 (Ethereum) — رسوم مرتفعة' },
    { value: 'BSC', label: 'BSC (Binance Smart Chain)' },
    { value: 'BEP20', label: 'BEP20 (Binance)' },
    { value: 'MATIC', label: 'MATIC (Polygon)' },
    { value: 'SOL', label: 'SOL (Solana)' },
  ]

  const CATEGORIES = [
    { value: 'local', label: '💵 عملة محلية (تحويل بنكي / محفظة)', icon: '💵' },
    { value: 'crypto', label: '₿ عملة رقمية (USDT / Binance Pay)', icon: '₿' },
  ]

  const CURRENCIES = [
    { value: 'الكل', label: '🌍 كل العملات (يظهر للجميع)' },
    { value: 'ر.ي', label: 'ر.ي — ريال يمني' },
    { value: 'ر.س', label: 'ر.س — ريال سعودي' },
    { value: '$', label: '$ — دولار أمريكي' },
    { value: '€', label: '€ — يورو' },
    { value: 'د.إ', label: 'د.إ — درهم إماراتي' },
  ]

  const save = async () => {
    if (!form.name) { toast.error('أدخل اسم طريقة الدفع'); return }
    setSaving(true)
    try {
      const body = {
        ...form,
        name: form.name,
        icon: form.icon || (form.payment_category === 'crypto' ? '₿' : '💳'),
        type: form.type || 'manual',
        currency: form.currency || 'ر.ي',
        enabled: form.enabled !== false,
      }
      const url = '/api/payment-methods'
      const method = editing ? 'PUT' : 'POST'
      if (editing) body.id = editing.id
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) { toast.error('فشل الحفظ'); return }
      toast.success(editing ? 'تم التحديث' : 'تمت الإضافة')
      onOpenChange(false)
      onSaved?.()
    } catch { toast.error('خطأ') }
    finally { setSaving(false) }
  }

  // ⚡ Custom Dropdown (same magical style as course dialog)
  const CustomSelect = ({ label, value, onChange, options, icon }: any) => {
    const selectedOption = options.find((o: any) => (o.value || o) === value)
    const selectedLabel = selectedOption?.label || selectedOption || value || '— اختر —'
    const isOpen = dropdownOpen === label

    return (
      <div className="relative">
        {label && <Label className="text-xs font-bold text-navy mb-1.5 block">{label}</Label>}
        <button type="button" onClick={() => setDropdownOpen(isOpen ? null : label)}
          className="w-full h-11 px-3 text-sm border border-navy/10 bg-white/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold/30 cursor-pointer transition-all hover:border-gold/40 hover:bg-white shadow-sm flex items-center justify-between gap-2">
          <span className="font-medium text-navy truncate">{selectedLabel}</span>
          <ChevronDown className={`w-4 h-4 text-navy/40 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-[100]" onClick={() => setDropdownOpen(null)} />
            <div className="absolute z-[100] mt-1 w-full bg-white rounded-2xl shadow-2xl border border-gray-200/60 overflow-hidden max-h-64 overflow-y-auto">
              {options.map((o: any) => {
                const val = o.value || o
                const lbl = o.label || o
                const isSelected = val === value
                return (
                  <button key={val} type="button" onClick={() => { onChange(val); setDropdownOpen(null) }}
                    className={`w-full px-4 py-3 text-right text-sm font-medium flex items-center justify-between gap-2 transition-all ${isSelected ? 'bg-gradient-to-l from-navy/10 to-navy/5 text-navy border-r-4 border-r-gold' : 'text-gray-600 hover:bg-gray-50 hover:text-navy'}`}>
                    <span>{lbl}</span>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-gold flex-shrink-0" />}
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[92vh] overflow-y-auto p-0 gap-0 border-0">
        {/* ⚡ Magical gradient header — emerald/amber based on category */}
        <div className={`relative p-5 pb-6 rounded-t-2xl overflow-hidden transition-all ${form.payment_category === 'crypto' ? 'bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600' : 'bg-gradient-to-br from-emerald-600 to-teal-700'}`}>
          <div className="absolute inset-0 opacity-15" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1.5px, transparent 1.5px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '25px 25px, 20px 20px' }} />
          <div className="absolute top-0 left-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-x-12 -translate-y-12" />
          <div className="relative flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-lg border border-white/30">
              <DollarSign className="w-7 h-7 text-white" strokeWidth={2.2} />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-white tracking-tight">{editing ? 'تعديل طريقة الدفع' : 'طريقة دفع جديدة'}</DialogTitle>
              <p className="text-white/80 text-xs mt-0.5 flex items-center gap-1"><Sparkles className="w-3 h-3" /> {form.payment_category === 'crypto' ? 'عملة رقمية' : 'عملة محلية'}</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className={`bg-gradient-to-b p-5 space-y-4 rounded-b-2xl ${form.payment_category === 'crypto' ? 'from-amber-50/30 to-white' : 'from-emerald-50/30 to-white'}`}>
          {/* Category selector — two beautiful cards */}
          <div>
            <Label className="text-xs font-bold text-navy mb-2 block">نوع طريقة الدفع</Label>
            <div className="grid grid-cols-2 gap-3">
              {CATEGORIES.map((cat) => {
                const isActive = form.payment_category === cat.value
                return (
                  <button key={cat.value} type="button" onClick={() => setForm({ ...form, payment_category: cat.value })}
                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${isActive ? (cat.value === 'crypto' ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-300 shadow-md' : 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-300 shadow-md') : 'border-gray-200/60 bg-white hover:border-gray-300'}`}>
                    <span className="text-2xl">{cat.icon}</span>
                    <span className={`text-xs font-bold ${isActive ? (cat.value === 'crypto' ? 'text-amber-700' : 'text-emerald-700') : 'text-gray-500'}`}>{cat.label.split(' (')[0]}</span>
                    {isActive && <CheckCircle2 className={`w-4 h-4 ${cat.value === 'crypto' ? 'text-amber-500' : 'text-emerald-500'}`} />}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Common fields — name */}
          <div className={`p-4 rounded-2xl border space-y-3 ${form.payment_category === 'crypto' ? 'bg-amber-50/30 border-amber-100/60' : 'bg-emerald-50/30 border-emerald-100/60'}`}>
            <div>
              <Label className="text-xs font-bold text-navy mb-1.5 block">اسم المحفظة / طريقة الدفع *</Label>
              <Input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="مثال: بنك الكريمي / محفظة جوالي / USDT-TRC20"
                className={`h-11 text-sm bg-white/80 rounded-xl ${form.payment_category === 'crypto' ? 'border-amber-200/40 focus:border-amber-500 focus:ring-amber-500/30' : 'border-emerald-200/40 focus:border-emerald-500 focus:ring-emerald-500/30'}`} />
            </div>
          </div>

          {/* Crypto fields */}
          {form.payment_category === 'crypto' && (
            <div className="p-4 bg-gradient-to-br from-amber-50/80 to-orange-50/50 rounded-2xl border border-amber-200/40 space-y-3">
              {/* Coin selector */}
              <CustomSelect label="العملة الرقمية" value={form.crypto_coin || ''} onChange={(v: string) => setForm({ ...form, crypto_coin: v })}
                options={CRYPTO_COINS} />

              {/* Network selector */}
              <CustomSelect label="الشبكة (Network)" value={form.crypto_network || ''} onChange={(v: string) => setForm({ ...form, crypto_network: v })}
                options={CRYPTO_NETWORKS} />

              {/* Choice: Wallet address OR Binance Pay ID */}
              <div>
                <Label className="text-xs font-bold text-amber-700 mb-2 block">طريقة الاستلام</Label>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <button type="button" onClick={() => setForm({ ...form, binance_pay_id: '' })}
                    className={`p-2.5 rounded-xl border-2 text-xs font-bold transition-all ${!form.binance_pay_id ? 'bg-amber-50 border-amber-300 text-amber-700 shadow-sm' : 'border-gray-200/60 text-gray-500 hover:border-amber-200'}`}>
                    📬 عنوان المحفظة
                  </button>
                  <button type="button" onClick={() => setForm({ ...form, wallet_address: '' })}
                    className={`p-2.5 rounded-xl border-2 text-xs font-bold transition-all ${form.binance_pay_id ? 'bg-amber-50 border-amber-300 text-amber-700 shadow-sm' : 'border-gray-200/60 text-gray-500 hover:border-amber-200'}`}>
                    🆔 Binance Pay ID
                  </button>
                </div>
                {/* Wallet address input */}
                {!form.binance_pay_id && (
                  <div>
                    <Label className="text-xs font-bold text-amber-700 mb-1.5 block">عنوان المحفظة (Wallet Address)</Label>
                    <Input value={form.wallet_address || ''} onChange={(e) => setForm({ ...form, wallet_address: e.target.value })}
                      placeholder="TJZyQ8K3mN..." dir="ltr" className="h-11 text-sm bg-white/80 border-amber-200/40 focus:border-amber-500 focus:ring-amber-500/30 rounded-xl font-mono" />
                  </div>
                )}
                {/* Binance Pay ID input */}
                {form.binance_pay_id && (
                  <div>
                    <Label className="text-xs font-bold text-amber-700 mb-1.5 block">معرف Binance Pay ID</Label>
                    <Input value={form.binance_pay_id || ''} onChange={(e) => setForm({ ...form, binance_pay_id: e.target.value })}
                      placeholder="123456789" dir="ltr" className="h-11 text-sm bg-white/80 border-amber-200/40 focus:border-amber-500 focus:ring-amber-500/30 rounded-xl font-mono" />
                    <p className="text-[10px] text-amber-600 mt-1">💡 يمكن للمتدرب الدفع عبر Binance Pay باستخدام هذا المعرف</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Local currency fields */}
          {form.payment_category !== 'crypto' && (
            <div className="p-4 bg-gradient-to-br from-emerald-50/80 to-teal-50/50 rounded-2xl border border-emerald-200/40 space-y-3">
              <div>
                <Label className="text-xs font-bold text-emerald-700 mb-1.5 block">رقم الحساب / المحفظة</Label>
                <Input value={form.account_number || form.wallet_id || ''} onChange={(e) => setForm({ ...form, account_number: e.target.value, wallet_id: e.target.value })}
                  placeholder="01234567890" dir="ltr" className="h-11 text-sm bg-white/80 border-emerald-200/40 focus:border-emerald-500 focus:ring-emerald-500/30 rounded-xl font-mono" />
              </div>
              <div>
                <Label className="text-xs font-bold text-emerald-700 mb-1.5 block">اسم صاحب الحساب</Label>
                <Input value={form.account_holder || ''} onChange={(e) => setForm({ ...form, account_holder: e.target.value })}
                  placeholder="مثال: أكاديمية المستقبل الدولية" className="h-11 text-sm bg-white/80 border-emerald-200/40 focus:border-emerald-500 focus:ring-emerald-500/30 rounded-xl" />
              </div>
              {/* ⚡ Currency as a professional dropdown — includes "All" option */}
              <CustomSelect label="العملة" value={form.currency || 'الكل'} onChange={(v: string) => setForm({ ...form, currency: v })}
                options={CURRENCIES} />
              {form.currency === 'الكل' && (
                <p className="text-[10px] text-emerald-600 -mt-1.5 flex items-center gap-1">💡 هذه الطريقة ستظهر لجميع العملات بغض النظر عن عملة الدورة</p>
              )}
            </div>
          )}

          {/* Instructions — common */}
          <div className={`p-4 rounded-2xl border ${form.payment_category === 'crypto' ? 'bg-amber-50/30 border-amber-100/60' : 'bg-emerald-50/30 border-emerald-100/60'}`}>
            <Label className={`text-xs font-bold mb-1.5 block ${form.payment_category === 'crypto' ? 'text-amber-700' : 'text-emerald-700'}`}>تعليمات الدفع</Label>
            <Textarea value={form.instructions || ''} onChange={(e) => setForm({ ...form, instructions: e.target.value })}
              rows={3} placeholder="اكتب تعليمات الدفع للمتدرب هنا..."
              className={`text-sm bg-white/80 rounded-xl resize-none ${form.payment_category === 'crypto' ? 'border-amber-200/40 focus:border-amber-500 focus:ring-amber-500/30' : 'border-emerald-200/40 focus:border-emerald-500 focus:ring-emerald-500/30'}`} />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 bg-white border-t border-gray-100 rounded-b-2xl">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">إلغاء</Button>
          <Button onClick={save} disabled={saving}
            className={`text-white rounded-xl shadow-lg hover:shadow-xl active:scale-[0.97] transition-all px-6 ${form.payment_category === 'crypto' ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700' : 'bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800'}`}>
            {saving ? <Loader2 className="w-4 h-4 ml-1.5 animate-spin" /> : <Plus className="w-4 h-4 ml-1.5" />}
            {saving ? 'جاري الحفظ...' : editing ? 'تحديث' : 'إضافة'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

const AdminCertificates = React.memo(function AdminCertificates() {
  const [items, setItems] = useState<any[]>([])
  const [requests, setRequests] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [enrollments, setEnrollments] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [revokeTarget, setRevokeTarget] = useState<any | null>(null)
  const [revokeReason, setRevokeReason] = useState('')
  const [previewCert, setPreviewCert] = useState<any | null>(null)
  const [tab, setTab] = useState<'issued' | 'requests'>('issued')
  const [approveNote, setApproveNote] = useState('')

  // === Confirm-dialog states for the three certificate actions:
  // del (permanent delete), restore (mark valid again), reissue (regenerate with new number)
  const [certDeleteTarget, setCertDeleteTarget] = useState<any | null>(null)
  const [certDeleting, setCertDeleting] = useState(false)
  const [certRestoreTarget, setCertRestoreTarget] = useState<any | null>(null)
  const [certRestoring, setCertRestoring] = useState(false)
  const [reissueTarget, setReissueTarget] = useState<any | null>(null)
  const [reissuing, setReissuing] = useState<string | null>(null)

  const load = () => {
    fetch('/api/certificates').then((r) => r.json()).then((d) => setItems(Array.isArray(d) ? d : []))
    fetch('/api/certificate-requests').then((r) => r.json()).then((d) => setRequests(Array.isArray(d) ? d : []))
    fetch('/api/courses').then((r) => r.json()).then((d) => setCourses(Array.isArray(d) ? d : []))
    fetch('/api/enrollments').then((r) => r.json()).then((d) => setEnrollments(Array.isArray(d) ? d : []))
  }
  useEffect(() => { load() }, [])

  // ⚡ REAL-TIME: certificates — admin sees new certificates INSTANTLY
  useEffect(() => {
    let channel: any
    try {
      channel = supabasePublic
        .channel('admin-cert-list-realtime')
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'certificates' },
          (payload: any) => setItems((prev) => [payload.new, ...prev])
        )
        .on('postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'certificates' },
          (payload: any) => setItems((prev) => prev.map((c) => c.id === payload.new.id ? { ...c, ...payload.new } : c))
        )
        .on('postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'certificates' },
          (payload: any) => setItems((prev) => prev.filter((c) => c.id !== payload.old.id))
        )
        .subscribe()
    } catch {}
    return () => { try { supabasePublic.removeChannel(channel) } catch {} }
  }, [])

  const filtered = items.filter((c) => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      return (c.certificate_number || '').toLowerCase().includes(q) || (c.student_name || '').toLowerCase().includes(q) || (c.course_title || '').toLowerCase().includes(q)
    }
    return true
  })

  const del = async () => {
    if (!certDeleteTarget) return
    setCertDeleting(true)
    try {
      await fetch('/api/certificates', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: certDeleteTarget.id }) })
      toast.success('تم الحذف')
      setCertDeleteTarget(null)
      load()
    } finally {
      setCertDeleting(false)
    }
  }
  const revoke = async () => { if (!revokeTarget || !revokeReason.trim()) { toast.error('أدخل سبب الإلغاء'); return }; await fetch('/api/certificates', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: revokeTarget.id, status: 'ملغاة' }) }); toast.success('تم إلغاء الشهادة'); setRevokeTarget(null); setRevokeReason(''); load() }
  const restore = async () => {
    if (!certRestoreTarget) return
    setCertRestoring(true)
    try {
      await fetch('/api/certificates', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: certRestoreTarget.id, status: 'صالحة' }) })
      toast.success('تمت الاستعادة')
      setCertRestoreTarget(null)
      load()
    } finally {
      setCertRestoring(false)
    }
  }

  // === Reissue: regenerate the same certificate with a new number & new issued_at ===
  // Use case: certificate has wrong data / student wants fresh copy / status issue — no need to delete user
  const reissue = async () => {
    if (!reissueTarget) return
    setReissuing(reissueTarget.id)
    try {
      const res = await fetch('/api/certificates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reissue', id: reissueTarget.id }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        toast.success('تم إعادة الإصدار بنجاح!', {
          description: `الرقم الجديد: ${data.new_certificate.certificate_number}`,
        })
        setReissueTarget(null)
        load()
        // Open the new certificate PDF in a new tab automatically
        window.open(`/api/certificate-pdf?number=${encodeURIComponent(data.new_certificate.certificate_number)}&format=pdf`, '_blank')
      } else {
        toast.error(data.error || 'فشل في إعادة الإصدار')
      }
    } catch (e: any) {
      toast.error('خطأ في الشبكة')
    } finally {
      setReissuing(null)
    }
  }

  // Certificate request actions
  const handleRequestAction = async (reqId: string, action: string, note?: string) => {
    try {
      const res = await fetch('/api/certificate-requests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: reqId, action, note }),
      })
      if (res.ok) {
        toast.success(action === 'issue' ? 'تم إصدار الشهادة بنجاح!' : action === 'reject' ? 'تم رفض الطلب' : 'تم التحديث')
        load()
      } else {
        const d = await res.json(); toast.error(d.error || 'فشل')
      }
    } catch { toast.error('خطأ') }
  }

  // Check if student completed the course
  const isCourseCompleted = (userId: string, courseId: string) => {
    return enrollments.some(e => e.user_id === userId && e.course_id === courseId && (e.status === 'completed' || e.status === 'مكتمل'))
  }

  const requestStatusBadge = (status: string) => {
    const map: any = {
      pending: { label: 'بانتظار موافقة المدرب', color: 'bg-yellow-500/15 text-yellow-600 border-yellow-500/30' },
      trainer_approved: { label: 'بانتظار موافقة المدير', color: 'bg-blue-500/15 text-blue-600 border-blue-500/30' },
      admin_approved: { label: 'بانتظار دفع الرسوم', color: 'bg-purple-500/15 text-purple-600 border-purple-500/30' },
      issued: { label: 'تم الإصدار', color: 'bg-green-500/15 text-green-600 border-green-500/30' },
      rejected: { label: 'مرفوض', color: 'bg-red-500/15 text-red-600 border-red-500/30' },
    }
    return map[status] || map.pending
  }

  return (
    <SectionCard
      title="الشهادات"
      description={tab === 'issued' ? `${filtered.length} شهادة صادرة` : `${requests.length} طلب شهادة`}
    >
      {/* ⚡ Magical tabs */}
      <div className="flex gap-2 border-b border-gold/20 pb-3 mb-4">
        <button
          onClick={() => setTab('issued')}
          className={`relative px-5 py-2.5 rounded-xl text-sm font-bold transition-all border overflow-hidden ${
            tab === 'issued'
              ? 'bg-gradient-to-br from-navy via-navy-light to-navy text-gold shadow-md border-gold/40'
              : 'bg-white text-navy border-gold/20 hover:border-gold/40 hover:bg-gold/5'
          }`}
        >
          {tab === 'issued' && (
            <div className="absolute inset-0 opacity-25 pointer-events-none" style={{
              backgroundImage: 'radial-gradient(circle at 20% 20%, #D4AF37 1px, transparent 1px)',
              backgroundSize: '12px 12px'
            }} />
          )}
          <span className="relative flex items-center gap-1.5">
            <Award className="w-4 h-4" /> الشهادات الصادرة
          </span>
        </button>
        <button
          onClick={() => setTab('requests')}
          className={`relative px-5 py-2.5 rounded-xl text-sm font-bold transition-all border overflow-hidden ${
            tab === 'requests'
              ? 'bg-gradient-to-br from-navy via-navy-light to-navy text-gold shadow-md border-gold/40'
              : 'bg-white text-navy border-gold/20 hover:border-gold/40 hover:bg-gold/5'
          }`}
        >
          {tab === 'requests' && (
            <div className="absolute inset-0 opacity-25 pointer-events-none" style={{
              backgroundImage: 'radial-gradient(circle at 20% 20%, #D4AF37 1px, transparent 1px)',
              backgroundSize: '12px 12px'
            }} />
          )}
          <span className="relative flex items-center gap-1.5">
            <FileText className="w-4 h-4" /> طلبات الشهادات
            {requests.filter(r => r.status === 'pending' || r.status === 'trainer_approved').length > 0 && (
              <span className="bg-gradient-to-r from-red-500 to-rose-600 text-white text-[10px] rounded-full px-1.5 py-0.5 ml-1 shadow-sm">{requests.filter(r => r.status === 'pending' || r.status === 'trainer_approved').length}</span>
            )}
          </span>
        </button>
      </div>

      {tab === 'issued' ? (
        <>
          {/* ⚡ Magical filter bar */}
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <div className="relative flex-1">
              <Input placeholder="بحث برقم الشهادة أو اسم المتدرب..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 rounded-xl border-gold/30 focus:border-gold focus:ring-gold/30 bg-white" />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gold/60" />
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2 border border-gold/30 rounded-xl bg-white text-sm focus:border-gold focus:ring-gold/30 focus:outline-none">
              <option value="all">كل الحالات</option>
              <option value="صالحة">صالحة</option>
              <option value="ملغاة">ملغاة</option>
              <option value="مستبدلة">مستبدلة</option>
            </select>
          </div>

          {filtered.length === 0 ? (
            /* ⚡ Magical empty state */
            <div className="text-center py-14">
              <div className="relative inline-block mb-4">
                <div className="absolute inset-0 bg-gold/20 rounded-full blur-2xl animate-pulse" />
                <div className="relative w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-navy via-navy-light to-navy flex items-center justify-center shadow-xl border border-gold/30">
                  <Award className="w-10 h-10 text-gold" />
                </div>
              </div>
              <h3 className="font-bold text-navy text-base mb-1.5">{search ? 'لا توجد نتائج' : 'لا توجد شهادات صادرة'}</h3>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">{search ? 'جرّب كلمات بحث مختلفة' : 'ستظهر الشهادات هنا عند إصدارها ✨'}</p>
            </div>
          ) : (
            /* ⚡ Magical compact certificate cards — 2/3/4 grid */
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 fia-stagger">
              {filtered.map((c) => {
                const isValid = c.status === 'صالحة'
                const isCancelled = c.status === 'ملغاة'
                const isReplaced = c.status === 'مستبدلة'
                const theme = isValid
                  ? { gradient: 'from-emerald-600 to-teal-700', border: 'border-emerald-400/40', glow: 'fia-status-glow' }
                  : isCancelled
                    ? { gradient: 'from-rose-600 to-red-700', border: 'border-rose-400/40', glow: '' }
                    : { gradient: 'from-blue-600 to-indigo-700', border: 'border-blue-400/40', glow: '' }
                return (
                  <Card key={c.id} className={`fia-card-hover p-0 overflow-hidden border ${theme.border}`}>
                    {/* Magical header */}
                    <div className={`relative bg-gradient-to-br ${theme.gradient} p-3 text-white overflow-hidden`}>
                      <div className="absolute inset-0 opacity-20" style={{
                        backgroundImage: 'radial-gradient(circle at 20% 20%, white 1px, transparent 1px)',
                        backgroundSize: '12px 12px'
                      }} />
                      <div className="absolute -top-4 -right-4 w-12 h-12 bg-white/15 rounded-full blur-xl" />
                      <div className="relative">
                        <div className="flex items-center justify-between mb-2">
                          <div className="w-9 h-9 rounded-lg bg-white/15 backdrop-blur-sm border border-white/30 flex items-center justify-center shadow-md">
                            <Award className="w-5 h-5 text-white" />
                          </div>
                          <Badge className={`${theme.glow} bg-white/15 text-white border border-white/30 backdrop-blur-sm text-[10px]`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isValid ? 'bg-emerald-300 animate-pulse' : isCancelled ? 'bg-rose-300' : 'bg-blue-300'} ml-1`} />
                            {c.status}
                          </Badge>
                        </div>
                        <div className="font-mono text-[10px] font-bold text-white/90 break-all" dir="ltr">{c.certificate_number}</div>
                      </div>
                    </div>
                    {/* Body */}
                    <div className="p-3 space-y-2">
                      <div>
                        <div className="text-[9px] text-muted-foreground mb-0.5">المتدرب</div>
                        <div className="font-bold text-navy text-xs line-clamp-1">{c.student_name}</div>
                      </div>
                      <div className="pt-1.5 border-t border-border/40">
                        <div className="text-[9px] text-muted-foreground mb-0.5">الدورة</div>
                        <div className="text-[10px] text-navy line-clamp-2 leading-tight">{c.course_title || '-'}</div>
                      </div>
                      {/* Actions */}
                      <div className="flex gap-1 pt-1.5 border-t border-border/40">
                        <Button size="sm" variant="ghost" className="flex-1 h-8 text-[10px] rounded-lg hover:bg-navy/5" onClick={() => setPreviewCert(c)} title="معاينة">
                          <Eye className="w-3 h-3 ml-0.5 text-navy" />
                        </Button>
                        <Button size="sm" variant="ghost" className="flex-1 h-8 text-[10px] rounded-lg hover:bg-blue-500/10" onClick={() => setReissueTarget(c)} disabled={!!reissuing} title="إعادة إصدار">
                          {reissuing === c.id ? <Loader2 className="w-3 h-3 animate-spin text-blue-600" /> : <RefreshCw className="w-3 h-3 text-blue-600" />}
                        </Button>
                        <Button size="sm" variant="ghost" className="flex-1 h-8 text-[10px] rounded-lg hover:bg-navy/5" onClick={() => { setEditing(c); setOpen(true) }} title="تعديل">
                          <Edit className="w-3 h-3 text-navy" />
                        </Button>
                        {isValid ? (
                          <Button size="sm" variant="ghost" className="flex-1 h-8 text-[10px] rounded-lg hover:bg-red-500/10" onClick={() => setRevokeTarget(c)} title="إلغاء">
                            <XCircle className="w-3 h-3 text-red-500" />
                          </Button>
                        ) : (
                          <Button size="sm" variant="ghost" className="flex-1 h-8 text-[10px] rounded-lg hover:bg-emerald-500/10" onClick={() => setCertRestoreTarget(c)} title="استعادة">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="flex-1 h-8 text-[10px] rounded-lg hover:bg-red-500/10" onClick={() => setCertDeleteTarget(c)} title="حذف">
                          <Trash2 className="w-3 h-3 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </>
      ) : (
        /* ⚡ Magical Certificate requests tab */
        <div className="space-y-3">
          {requests.length === 0 ? (
            <div className="text-center py-14">
              <div className="relative inline-block mb-4">
                <div className="absolute inset-0 bg-gold/20 rounded-full blur-2xl animate-pulse" />
                <div className="relative w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-navy via-navy-light to-navy flex items-center justify-center shadow-xl border border-gold/30">
                  <FileText className="w-10 h-10 text-gold" />
                </div>
              </div>
              <h3 className="font-bold text-navy text-base mb-1.5">لا توجد طلبات شهادات</h3>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">ستظهر طلبات الشهادات هنا عند تقديمها ✨</p>
            </div>
          ) : (
            requests.map((r) => {
              const badge = requestStatusBadge(r.status)
              const completed = isCourseCompleted(r.user_id, r.course_id)
              return (
                <Card key={r.id} className="fia-card-hover p-3 border border-gold/20 hover:border-gold/40">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <Badge className={badge.color}>{badge.label}</Badge>
                    {completed && <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30">✅ الدورة مكتملة</Badge>}
                    {!completed && r.status === 'pending' && <Badge className="bg-red-500/15 text-red-600 border-red-500/30">⚠️ الدورة غير مكتملة</Badge>}
                  </div>
                  <div className="font-bold text-navy text-sm mb-1">{r.student_name}</div>
                  <div className="text-xs text-muted-foreground mb-1">{r.course_title || '-'}</div>
                  {r.amount > 0 && <div className="text-xs text-gold font-bold mt-1">رسوم: {r.amount.toLocaleString()} {r.currency}</div>}
                  {r.created_at && <div className="text-[10px] text-muted-foreground mt-1" dir="ltr">طلب في: {new Date(r.created_at).toLocaleDateString('ar-EG')}</div>}
                  {r.trainer_note && <div className="text-xs text-blue-600 mt-1">📝 ملاحظة المدرب: {r.trainer_note}</div>}
                  {r.admin_note && <div className="text-xs text-purple-600 mt-1">📝 ملاحظة المدير: {r.admin_note}</div>}
                  {r.cert_number && <div className="text-xs font-mono text-emerald-600 mt-1" dir="ltr">رقم الشهادة: {r.cert_number}</div>}
                  {r.verify_code && <div className="text-xs font-mono text-emerald-600" dir="ltr">رمز التحقق: {r.verify_code}</div>}

                  {/* Action buttons based on status */}
                  <div className="flex gap-2 mt-3 pt-2 border-t border-border/40">
                    {r.status === 'pending' && (
                      <>
                        <Button size="sm" className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs rounded-lg shadow-md active:scale-[0.97] transition-all" disabled={!completed} onClick={() => handleRequestAction(r.id, 'trainer_approve', 'تم التأكد من إكمال الدورة')}>
                          <CheckCircle2 className="w-3.5 h-3.5 ml-1" /> موافقة المدرب
                        </Button>
                        <Button size="sm" variant="outline" className="border-red-500/30 text-red-500 hover:bg-red-500/10 text-xs rounded-lg" onClick={() => handleRequestAction(r.id, 'reject', 'لم تكتمل الدورة')}>
                          <XCircle className="w-3.5 h-3.5 ml-1" /> رفض
                        </Button>
                      </>
                    )}
                    {r.status === 'trainer_approved' && (
                      <Button size="sm" className="bg-gradient-to-r from-navy to-navy-light hover:from-navy-light hover:to-navy text-gold text-xs rounded-lg shadow-md active:scale-[0.97] transition-all" onClick={() => handleRequestAction(r.id, 'admin_approve', 'تمت الموافقة على الطلب')}>
                        <CheckCircle2 className="w-3.5 h-3.5 ml-1" /> موافقة المدير
                      </Button>
                    )}
                    {r.status === 'admin_approved' && (
                      <Button size="sm" className="bg-gradient-to-r from-gold to-amber-500 hover:from-amber-500 hover:to-gold text-navy text-xs rounded-lg shadow-md active:scale-[0.97] transition-all" onClick={() => handleRequestAction(r.id, 'issue')}>
                        <Award className="w-3.5 h-3.5 ml-1" /> إصدار الشهادة
                      </Button>
                    )}
                    {r.status === 'issued' && r.cert_number && (
                      <a href={`/api/certificate-pdf?number=${encodeURIComponent(r.cert_number)}&format=pdf`} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="outline" className="border-gold/30 text-navy hover:bg-gold/10 text-xs rounded-lg">
                          <Download className="w-3.5 h-3.5 ml-1" /> تحميل الشهادة
                        </Button>
                      </a>
                    )}
                  </div>
                </Card>
              )
            })
          )}
        </div>
      )}

      {open && <SimpleDialog open={open} onOpenChange={setOpen} title={editing ? 'تعديل' : 'إضافة'} onSaved={load} initial={editing} fields={['student_name', 'course_title', 'status', 'issued_by', 'external_accreditation_body']} apiPath="/api/certificates" />}

      {revokeTarget && (
        <Dialog open={true} onOpenChange={(o) => { if (!o) { setRevokeTarget(null); setRevokeReason('') } }}>
          <DialogContent className="sm:max-w-md p-0 border-0">
            {/* Magical header */}
            <div className="relative bg-gradient-to-br from-red-600 to-rose-700 p-5 text-white overflow-hidden rounded-t-xl">
              <div className="absolute inset-0 opacity-25" style={{
                backgroundImage: 'radial-gradient(circle at 12% 50%, white 1.5px, transparent 1.5px), radial-gradient(circle at 88% 20%, white 1px, transparent 1px)',
                backgroundSize: '24px 24px, 18px 18px'
              }} />
              <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-white">
                  <XCircle className="w-5 h-5" /> إلغاء الشهادة
                </DialogTitle>
              </DialogHeader>
            </div>
            <div className="space-y-3 p-5">
              <div className="bg-red-50 border border-red-500/30 p-3 rounded-xl">
                <div className="font-bold text-red-700">{revokeTarget.student_name}</div>
                <div className="text-xs text-red-600 font-mono" dir="ltr">{revokeTarget.certificate_number}</div>
                <div className="text-xs text-red-600 mt-1">{revokeTarget.course_title}</div>
              </div>
              <div><Label className="text-navy font-bold">سبب الإلغاء *</Label><Textarea value={revokeReason} onChange={(e) => setRevokeReason(e.target.value)} rows={3} placeholder="مثال: خطأ في بيانات المتدرب..." className="mt-1 rounded-xl border-gold/30 focus:border-gold focus:ring-gold/30" /></div>
            </div>
            <div className="flex justify-end gap-2 p-4 bg-muted/20 border-t border-border">
              <Button variant="outline" onClick={() => { setRevokeTarget(null); setRevokeReason('') }} className="rounded-xl">إلغاء</Button>
              <Button onClick={revoke} className="bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white rounded-xl shadow-md active:scale-[0.97] transition-all">تأكيد الإلغاء</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {previewCert && (
        <Dialog open={true} onOpenChange={(o) => { if (!o) setPreviewCert(null) }}>
          <DialogContent className="sm:max-w-5xl max-h-[92vh] overflow-y-auto p-0 border-0">
            {/* Magical header */}
            <div className="relative bg-gradient-to-br from-navy via-navy-light to-navy p-5 text-white overflow-hidden rounded-t-xl">
              <div className="absolute inset-0 opacity-25" style={{
                backgroundImage: 'radial-gradient(circle at 12% 50%, #D4AF37 1.5px, transparent 1.5px), radial-gradient(circle at 88% 20%, white 1px, transparent 1px)',
                backgroundSize: '24px 24px, 18px 18px'
              }} />
              <div className="absolute -top-8 -right-8 w-32 h-32 bg-gold/15 rounded-full blur-2xl" />
              <button onClick={() => setPreviewCert(null)} className="absolute top-3 left-3 w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center z-10 backdrop-blur-sm">
                <X className="w-4 h-4 text-white" />
              </button>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-white">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold to-amber-500 flex items-center justify-center shadow-md">
                    <Award className="w-5 h-5 text-navy" />
                  </div>
                  معاينة الشهادة — <span className="font-mono text-gold" dir="ltr">{previewCert.certificate_number}</span>
                </DialogTitle>
              </DialogHeader>
            </div>
            <div className="p-5">
              <CertificateViewer certificate={previewCert} onClose={() => setPreviewCert(null)} />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Permanent-delete confirm */}
      <ConfirmDialog
        open={!!certDeleteTarget}
        onOpenChange={(o) => { if (!o && !certDeleting) setCertDeleteTarget(null) }}
        title="تأكيد الحذف النهائي"
        message="هل أنت متأكد من الحذف النهائي؟"
        itemLabel="سيتم حذف الشهادة التالية:"
        itemName={certDeleteTarget ? `${certDeleteTarget.student_name} — ${certDeleteTarget.certificate_number}` : undefined}
        confirmLabel="حذف نهائي"
        cancelLabel="إلغاء"
        variant="danger"
        onConfirm={del}
        loading={certDeleting}
      />

      {/* Restore certificate confirm */}
      <ConfirmDialog
        open={!!certRestoreTarget}
        onOpenChange={(o) => { if (!o && !certRestoring) setCertRestoreTarget(null) }}
        title="تأكيد استعادة الشهادة"
        message={'سيتم تغيير حالة الشهادة إلى "صالحة". هل أنت متأكد؟'}
        itemLabel="سيتم استعادة الشهادة التالية:"
        itemName={certRestoreTarget ? `${certRestoreTarget.student_name} — ${certRestoreTarget.certificate_number}` : undefined}
        confirmLabel="استعادة"
        cancelLabel="إلغاء"
        variant="info"
        onConfirm={restore}
        loading={certRestoring}
      />

      {/* Reissue certificate confirm (uses existing reissuing spinner state) */}
      <ConfirmDialog
        open={!!reissueTarget}
        onOpenChange={(o) => { if (!o && !reissuing) setReissueTarget(null) }}
        title="إعادة إصدار الشهادة"
        message={'سيتم:\n- تمييز الشهادة الحالية كـ "مستبدلة"\n- إصدار شهادة جديدة برقم جديد وتاريخ جديد\n- بقاء بيانات المتدرب والتسجيل كما هي'}
        itemLabel="الشهادة الحالية:"
        itemName={reissueTarget ? `${reissueTarget.student_name} | ${reissueTarget.course_title || '-'} | ${reissueTarget.certificate_number}` : undefined}
        confirmLabel="إعادة الإصدار"
        cancelLabel="إلغاء"
        variant="info"
        onConfirm={reissue}
        loading={!!reissuing}
      />
    </SectionCard>
  )
})

const AdminTrainers = React.memo(function AdminTrainers() {
  const [items, setItems] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [checkingTeam, setCheckingTeam] = useState(false)
  const load = () => fetch('/api/trainers').then((r) => r.json()).then((d) => setItems(Array.isArray(d) ? d : []))
  useEffect(() => { load() }, [])

  // ⚡ REAL-TIME: trainers — admin sees trainer changes INSTANTLY
  useEffect(() => {
    let channel: any
    try {
      channel = supabasePublic
        .channel('admin-trainers-realtime')
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'trainers' },
          (payload: any) => setItems((prev) => [payload.new, ...prev])
        )
        .on('postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'trainers' },
          (payload: any) => setItems((prev) => prev.map((t) => t.id === payload.new.id ? { ...t, ...payload.new } : t))
        )
        .on('postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'trainers' },
          (payload: any) => setItems((prev) => prev.filter((t) => t.id !== payload.old.id))
        )
        .subscribe()
    } catch {}
    return () => { try { supabasePublic.removeChannel(channel) } catch {} }
  }, [])

  // Pre-flight: make sure the trainer is not a team member (founder/leader).
  // If they are, show a toast error and skip opening the confirm dialog.
  const requestDelete = async (trainer: any) => {
    setCheckingTeam(true)
    try {
      const teamRes = await fetch('/api/team')
      const teamData = await teamRes.json()
      const teamMember = (teamData || []).find((m: any) => m.id === trainer.id)
      if (teamMember) {
        toast.error(`لا يمكن حذف هذا المدرب لأنه مسجّل كـ "${teamMember.role === 'founder' ? 'المؤسس' : 'عضو فريق'}" في قسم المؤسس والفريق. احذفه من هناك أولاً.`)
        return
      }
    } catch {}
    setCheckingTeam(false)
    setDeleteTarget(trainer)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await fetch('/api/trainers', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: deleteTarget.id }) })
      toast.success('تم الحذف')
      setDeleteTarget(null)
      load()
    } finally {
      setDeleting(false)
    }
  }
  return (
    <SectionCard
      title="المدربون"
      description={`${items.length} مدرب`}
      action={<Button className="bg-navy hover:bg-navy-light rounded-xl" onClick={() => { setEditing(null); setOpen(true) }}><Plus className="w-4 h-4 ml-1" /> جديد</Button>}
    >
      {items.length === 0 ? (
        <div className="text-center py-14">
          <div className="relative inline-block mb-4">
            <div className="absolute inset-0 bg-gold/20 rounded-full blur-2xl animate-pulse" />
            <div className="relative w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-navy via-navy-light to-navy flex items-center justify-center shadow-xl border border-gold/30">
              <GraduationCap className="w-10 h-10 text-gold" />
            </div>
          </div>
          <h3 className="font-bold text-navy text-base mb-1.5">لا يوجد مدربون بعد</h3>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto">أضف أول مدرب بالضغط على زر "جديد" ✨</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 fia-stagger">
          {items.map((t) => {
            const isTeamMember = t.password && t.password.startsWith('__TEAM_MEMBER__')
            return (
              <Card key={t.id} className="fia-course-card p-0 overflow-hidden cursor-default border border-gold/20">
                {/* Magical header */}
                <div className="relative p-3 bg-gradient-to-br from-navy via-navy-light to-navy text-white overflow-hidden">
                  <div className="absolute inset-0 opacity-20" style={{
                    backgroundImage: 'radial-gradient(circle at 20% 20%, #D4AF37 1px, transparent 1px)',
                    backgroundSize: '12px 12px'
                  }} />
                  <div className="absolute -top-4 -left-4 w-12 h-12 bg-gold/15 rounded-full blur-xl" />
                  <div className="relative flex items-center gap-2.5">
                    <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-gold/40 flex-shrink-0 bg-navy-light shadow-md">
                      {t.avatar ? (
                        <img src={t.avatar} alt={t.name} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gold font-bold text-xl bg-gradient-to-br from-gold/20 to-amber-500/20">
                          {t.name?.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-xs truncate text-white flex items-center gap-1">
                        {t.name}
                        {isTeamMember && <Crown className="w-3 h-3 text-amber-400 flex-shrink-0" />}
                      </div>
                      <div className="text-[10px] text-gold truncate">{t.title}</div>
                    </div>
                  </div>
                </div>
                {/* Magical body */}
                <div className="p-3 space-y-2">
                  {t.specialization && (
                    <div className="text-[10px] text-muted-foreground line-clamp-2 leading-tight">{t.specialization}</div>
                  )}
                  <div className="space-y-1 pt-1 border-t border-border/40">
                    {t.email && (
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <Mail className="w-2.5 h-2.5 flex-shrink-0 text-gold/60" />
                        <span dir="ltr" className="truncate text-navy font-medium">{t.email}</span>
                      </div>
                    )}
                    {t.phone && (
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <Mail className="w-2.5 h-2.5 flex-shrink-0 text-gold/60" />
                        <span dir="ltr" className="text-navy font-medium">{t.phone}</span>
                      </div>
                    )}
                  </div>
                  {isTeamMember && (
                    <div className="text-[9px] text-purple-700 bg-purple-50 border border-purple-200/40 rounded px-1.5 py-1 text-center font-bold">
                      👑 عضو فريق
                    </div>
                  )}
                  {/* Actions */}
                  <div className="flex gap-1 pt-1 border-t border-border/40">
                    <Button size="sm" variant="outline" className="flex-1 h-8 text-[10px] rounded-lg border-gold/30 hover:border-gold hover:bg-gold/5" onClick={() => { setEditing(t); setOpen(true) }}>
                      <Edit className="w-3 h-3 ml-1" /> تعديل
                    </Button>
                    <Button size="sm" variant="outline" disabled={isTeamMember || checkingTeam} className="h-8 w-8 p-0 border-red-500/30 text-red-500 hover:bg-red-500/10 disabled:opacity-30 disabled:cursor-not-allowed" onClick={() => requestDelete(t)} title={isTeamMember ? 'لا يمكن حذف عضو الفريق' : 'حذف'}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
      {open && <TrainerDialog open={open} onOpenChange={setOpen} initial={editing} onSaved={load} />}

      <PasswordConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o && !deleting) setDeleteTarget(null) }}
        title="تأكيد حذف المدرب"
        message="سيتم حذف المدرب نهائياً. أدخل كلمة مرورك للتأكيد."
        itemLabel="سيتم حذف المدرب التالي:"
        itemName={deleteTarget?.name}
        confirmLabel="حذف نهائي"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </SectionCard>
  )
})

function TrainerDialog({ open, onOpenChange, initial, onSaved }: any) {
  const [form, setForm] = useState<any>(
    initial || { name: '', title: '', specialization: '', bio: '', email: '', password: '', phone: '', avatar: '', years_experience: 0 }
  )
  const [saving, setSaving] = useState(false)
  const [showPwd, setShowPwd] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  useEffect(() => {
    setForm(initial || { name: '', title: '', specialization: '', bio: '', email: '', password: '', phone: '', avatar: '', years_experience: 0 })
  }, [initial])

  const handleAvatarUpload = async (file: File) => {
    setUploadingAvatar(true)
    try {
      const compressedFile = await new Promise<File>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => {
          const img = new Image()
          img.onload = () => {
            const maxW = 512, maxH = 512
            let { width, height } = img
            if (width > maxW) { height = (height * maxW) / width; width = maxW }
            if (height > maxH) { width = (width * maxH) / height; height = maxH }
            const canvas = document.createElement('canvas')
            canvas.width = width; canvas.height = height
            const ctx = canvas.getContext('2d')!
            ctx.drawImage(img, 0, 0, width, height)
            canvas.toBlob((blob) => {
              if (!blob) { reject(new Error('Compression failed')); return }
              resolve(new File([blob], 'avatar.jpg', { type: 'image/jpeg' }))
            }, 'image/jpeg', 0.85)
          }
          img.onerror = () => reject(new Error('Image load failed'))
          img.src = e.target?.result as string
        }
        reader.onerror = () => reject(new Error('File read failed'))
        reader.readAsDataURL(file)
      })

      const fd = new FormData()
      fd.append('file', compressedFile)
      fd.append('folder', 'trainer-avatars')
      const res = await fetch('/api/upload/image', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.url) {
        setForm({ ...form, avatar: data.url })
        toast.success('تم رفع صورة المدرب')
      } else {
        toast.error(data.error || 'فشل رفع الصورة')
      }
    } catch {
      toast.error('خطأ في رفع الصورة')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const save = async () => {
    if (!form.name || !form.email) { toast.error('الاسم والبريد مطلوبان'); return }
    if (!initial && !form.password) { toast.error('كلمة المرور مطلوبة'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/trainers', {
        method: initial ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(initial ? { id: initial.id, ...form } : form),
      })
      if (res.ok) {
        toast.success(initial ? 'تم التحديث' : 'تمت الإضافة')
        onSaved(); onOpenChange(false)
      } else {
        const d = await res.json(); toast.error(d.error || 'فشل')
      }
    } catch { toast.error('خطأ') } finally { setSaving(false) }
  }

  const TITLES = ['استشاري', 'أخصائي', 'محاضر', 'مدرب معتمد', 'مدرس']
  const SPECIALIZATIONS = ['الطب الباطني', 'طب الطوارئ', 'التمريض', 'الإنعاش القلبي الرئوي', 'مكافحة العدوى', 'صحة الأم والطفل', 'الصيدلة السريرية', 'إدارة المنشآت الصحية', 'التعليم الطبي']

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto p-0 border-0">
        {/* ⚡ Magical gradient header */}
        <div className="relative bg-gradient-to-br from-emerald-600 via-teal-700 to-emerald-700 p-5 pb-6 text-white overflow-hidden">
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: 'radial-gradient(circle at 20% 20%, white 1px, transparent 1px)',
            backgroundSize: '14px 14px'
          }} />
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <DialogHeader className="relative">
            <DialogTitle className="text-xl font-bold tracking-tight text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-lg border border-white/30 flex-shrink-0">
                <GraduationCap className="w-5 h-5 text-white" strokeWidth={2.2} />
              </div>
              <span>
                {initial ? 'تعديل المدرب' : 'إضافة مدرب جديد'}
                <span className="block text-xs font-normal text-white/80 mt-0.5 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  {initial ? 'تحديث بيانات المدرب' : 'إضافة مدرب جديد للأكاديمية'}
                </span>
              </span>
            </DialogTitle>
          </DialogHeader>
        </div>

        <div className="bg-gradient-to-b from-emerald-50/30 to-white p-5 space-y-4">
          {/* Avatar upload — simple, no nested divs that could break */}
          <div className="flex items-center gap-4">
            <div className="relative flex-shrink-0">
              <Avatar className="w-16 h-16 border-2 border-gold/40 shadow-md">
                <AvatarImage src={form.avatar || ''} />
                <AvatarFallback className="bg-gradient-to-br from-navy to-navy-light text-gold text-xl">{form.name?.charAt(0) || '؟'}</AvatarFallback>
              </Avatar>
              <input type="file" accept="image/*" className="hidden" id="trainer-avatar" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAvatarUpload(f) }} />
              <button
                onClick={() => document.getElementById('trainer-avatar')?.click()}
                disabled={uploadingAvatar}
                className="absolute -bottom-1 -left-1 w-7 h-7 rounded-full bg-gradient-to-br from-gold to-amber-500 text-navy flex items-center justify-center text-xs disabled:opacity-50 shadow-md border border-white/30"
                title="رفع صورة"
                type="button"
              >
                {uploadingAvatar ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileUp className="w-3.5 h-3.5" />}
              </button>
            </div>
            <div className="flex-1">
              <Label className="text-xs font-bold text-navy flex items-center gap-1.5 mb-1.5">
                <User className="w-3.5 h-3.5 text-gold" /> اسم المدرب *
              </Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="اسم المدرب" className="text-base font-medium rounded-xl border-gold/30 focus:border-gold focus:ring-gold/30" />
            </div>
          </div>

          {/* Quick selects */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-bold text-navy flex items-center gap-1.5 mb-1.5">
                <Award className="w-3.5 h-3.5 text-gold" /> المسمى
              </Label>
              <select value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full px-3 py-2.5 border border-gold/30 rounded-xl bg-white text-sm focus:border-gold focus:ring-gold/30 focus:outline-none">
                <option value="">— اختر —</option>
                {TITLES.map((t: string) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs font-bold text-navy flex items-center gap-1.5 mb-1.5">
                <Briefcase className="w-3.5 h-3.5 text-gold" /> التخصص
              </Label>
              <select value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} className="w-full px-3 py-2.5 border border-gold/30 rounded-xl bg-white text-sm focus:border-gold focus:ring-gold/30 focus:outline-none">
                <option value="">— اختر —</option>
                {SPECIALIZATIONS.map((s: string) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Email */}
          <div>
            <Label className="text-xs font-bold text-navy flex items-center gap-1.5 mb-1.5">
              <Mail className="w-3.5 h-3.5 text-gold" /> البريد الإلكتروني *
            </Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} dir="ltr" className="rounded-xl border-gold/30 focus:border-gold focus:ring-gold/30" placeholder="example@fia.edu" />
          </div>

          {/* Password */}
          <div>
            <Label className="text-xs font-bold text-navy flex items-center gap-1.5 mb-1.5">
              <Lock className="w-3.5 h-3.5 text-gold" /> كلمة المرور {initial ? '(اتركها فارغة للإبقاء)' : ''}
            </Label>
            <div className="relative">
              <Input type={showPwd ? 'text' : 'password'} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} dir="ltr" className="rounded-xl border-gold/30 focus:border-gold focus:ring-gold/30 pl-10" placeholder="••••••••" />
              <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-navy">
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Phone */}
          <div>
            <Label className="text-xs font-bold text-navy flex items-center gap-1.5 mb-1.5">
              <Phone className="w-3.5 h-3.5 text-gold" /> الهاتف
            </Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} dir="ltr" className="rounded-xl border-gold/30 focus:border-gold focus:ring-gold/30" placeholder="+967 7XX XXX XXX" />
          </div>

          {/* Bio — full textarea */}
          <div>
            <Label className="text-xs font-bold text-navy flex items-center gap-1.5 mb-1.5">
              <FileText className="w-3.5 h-3.5 text-gold" /> النبذة التعريفية الكاملة
            </Label>
            <textarea
              value={form.bio || ''}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              className="w-full min-h-[200px] p-3 border border-gold/30 rounded-xl text-sm leading-relaxed bg-white focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold transition-all"
              placeholder={"مثال:\n\nمدرب ومحاضر دولي وخبير في التعليم الطبي، حاصل على الدكتوراه. يمتلك خبرة تتجاوز 15 عاماً.\n\n🎓 المؤهلات\n• بكالوريوس آداب\n• دكتوراه في التخطيط الاستراتيجي\n\n🏆 الإنجازات\n• مشارك في عدة مؤتمرات دولية\n• مؤلف لـ 6 كتب في طبعات دولية"}
            />
            <div className="flex items-center justify-between mt-2 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><Sparkles className="w-3 h-3 text-gold" /> استخدم الأسطر الفارغة لفصل الفقرات</span>
              <span>{(form.bio || '').length} حرف</span>
            </div>
          </div>

          {/* Years experience */}
          <div>
            <Label className="text-xs font-bold text-navy flex items-center gap-1.5 mb-1.5">
              <Briefcase className="w-3.5 h-3.5 text-gold" /> سنوات الخبرة
            </Label>
            <Input type="number" value={form.years_experience || ''} onChange={(e) => setForm({ ...form, years_experience: e.target.value === '' ? 0 : parseInt(e.target.value) || 0 })} dir="ltr" className="rounded-xl border-gold/30 focus:border-gold focus:ring-gold/30" placeholder="0" />
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="p-4 bg-muted/20 border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">إلغاء</Button>
          <Button onClick={save} disabled={saving} className="bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl shadow-md active:scale-[0.97] transition-all px-6">
            {saving ? <><Loader2 className="w-4 h-4 ml-1.5 animate-spin" /> جاري...</> : <><CheckCircle2 className="w-4 h-4 ml-1.5" /> حفظ</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const AdminPartners = React.memo(function AdminPartners() {
  const [items, setItems] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
  const [deleting, setDeleting] = useState(false)
  const load = () => fetch('/api/partners').then((r) => r.json()).then((d) => setItems(Array.isArray(d) ? d : []))
  useEffect(() => { load() }, [])
  // ⚡ REAL-TIME: partners — admin sees partner changes INSTANTLY
  useEffect(() => {
    let channel: any
    try {
      channel = supabasePublic
        .channel('admin-partners-realtime')
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'partners' },
          (payload: any) => setItems((prev) => [payload.new, ...prev])
        )
        .on('postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'partners' },
          (payload: any) => setItems((prev) => prev.map((p) => p.id === payload.new.id ? { ...p, ...payload.new } : p))
        )
        .on('postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'partners' },
          (payload: any) => setItems((prev) => prev.filter((p) => p.id !== payload.old.id))
        )
        .subscribe()
    } catch {}
    return () => { try { supabasePublic.removeChannel(channel) } catch {} }
  }, [])
  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await fetch('/api/partners', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: deleteTarget.id }) })
      toast.success('تم الحذف')
      setDeleteTarget(null)
      load()
    } finally {
      setDeleting(false)
    }
  }
  const toggleStatus = async (p: any) => {
    const newStatus = p.status === 'نشط' ? 'متوقف' : 'نشط'
    await fetch('/api/partners', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: p.id, status: newStatus }) })
    toast.success(newStatus === 'نشط' ? 'تم تنشيط الشراكة' : 'تم إيقاف الشراكة')
    load()
  }
  return (
    <SectionCard title="الشركاء" description={`${items.length} شريك`} action={<Button className="bg-navy hover:bg-navy-light rounded-xl" onClick={() => { setEditing(null); setOpen(true) }}><Plus className="w-4 h-4 ml-1" /> جديد</Button>}>
      {items.length === 0 ? (
        <div className="text-center py-14">
          <div className="relative inline-block mb-4">
            <div className="absolute inset-0 bg-gold/20 rounded-full blur-2xl animate-pulse" />
            <div className="relative w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-navy via-navy-light to-navy flex items-center justify-center shadow-xl border border-gold/30">
              <Briefcase className="w-10 h-10 text-gold" />
            </div>
          </div>
          <h3 className="font-bold text-navy text-base mb-1.5">لا يوجد شركاء بعد</h3>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto">أضف أول شريك بالضغط على زر "جديد" ✨</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 fia-stagger">
          {items.map((p) => {
            const isActive = p.status === 'نشط'
            return (
              <Card key={p.id} className={`fia-course-card p-0 overflow-hidden cursor-default border ${isActive ? 'border-emerald-400/40' : 'border-red-400/40'}`}>
                {/* Magical header */}
                <div className={`relative p-3 text-white overflow-hidden ${isActive ? 'bg-gradient-to-br from-emerald-600 to-teal-700' : 'bg-gradient-to-br from-rose-600 to-red-700'}`}>
                  <div className="absolute inset-0 opacity-20" style={{
                    backgroundImage: 'radial-gradient(circle at 20% 20%, white 1px, transparent 1px)',
                    backgroundSize: '12px 12px'
                  }} />
                  <div className="absolute -top-4 -left-4 w-12 h-12 bg-white/15 rounded-full blur-xl" />
                  <div className="relative flex items-center gap-2.5">
                    <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur-sm border border-white/30 flex items-center justify-center shadow-md flex-shrink-0">
                      <span className="text-2xl">{p.logo || '🤝'}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-xs truncate text-white">{p.name}</div>
                      <div className="text-[10px] text-white/80 truncate">{p.since ? `منذ ${p.since}` : 'شريك'}</div>
                    </div>
                  </div>
                </div>
                {/* Magical body */}
                <div className="p-3 space-y-2">
                  {p.description && (
                    <div className="text-[10px] text-muted-foreground line-clamp-2 leading-tight">{p.description}</div>
                  )}
                  <div className="flex items-center justify-center pt-1 border-t border-border/40">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold ${
                      isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/40' : 'bg-rose-50 text-rose-700 border border-rose-200/40'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                      {p.status === 'نشط' ? 'نشط' : 'متوقف'}
                    </span>
                  </div>
                  {/* Actions */}
                  <div className="flex gap-1 pt-1 border-t border-border/40">
                    <Button size="sm" variant="outline" className="flex-1 h-8 text-[10px] rounded-lg border-gold/30 hover:border-gold hover:bg-gold/5" onClick={() => { setEditing(p); setOpen(true) }}>
                      <Edit className="w-3 h-3 ml-1" /> تعديل
                    </Button>
                    <Button size="sm" variant="outline" className={`h-8 w-8 p-0 ${isActive ? 'border-red-500/30 text-red-500 hover:bg-red-500/10' : 'border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10'}`} onClick={() => toggleStatus(p)} title={isActive ? 'إيقاف' : 'تنشيط'}>
                      {isActive ? <XCircle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 w-8 p-0 border-red-500/30 text-red-500 hover:bg-red-500/10" onClick={() => setDeleteTarget(p)} title="حذف">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
      {open && <SimpleDialog open={open} onOpenChange={setOpen} title={editing ? 'تعديل' : 'إضافة'} onSaved={load} initial={editing} fields={['name', 'logo', 'description', 'website', 'since', 'status']} apiPath="/api/partners" />}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o && !deleting) setDeleteTarget(null) }}
        title="تأكيد حذف الشريك"
        message="هل أنت متأكد من الحذف؟"
        itemLabel="سيتم حذف الشريك التالي:"
        itemName={deleteTarget?.name}
        confirmLabel="حذف"
        cancelLabel="إلغاء"
        variant="danger"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </SectionCard>
  )
})

const AdminLicenses = React.memo(function AdminLicenses() {
  const [items, setItems] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
  const [deleting, setDeleting] = useState(false)
  const load = () => fetch('/api/licenses').then((r) => r.json()).then((d) => setItems(Array.isArray(d) ? d : []))
  useEffect(() => { load() }, [])
  // ⚡ REAL-TIME: licenses — admin sees license changes INSTANTLY
  useEffect(() => {
    let channel: any
    try {
      channel = supabasePublic
        .channel('admin-licenses-realtime')
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'licenses' },
          (payload: any) => setItems((prev) => [payload.new, ...prev])
        )
        .on('postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'licenses' },
          (payload: any) => setItems((prev) => prev.map((l) => l.id === payload.new.id ? { ...l, ...payload.new } : l))
        )
        .on('postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'licenses' },
          (payload: any) => setItems((prev) => prev.filter((l) => l.id !== payload.old.id))
        )
        .subscribe()
    } catch {}
    return () => { try { supabasePublic.removeChannel(channel) } catch {} }
  }, [])
  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await fetch('/api/licenses', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: deleteTarget.id }) })
      toast.success('تم الحذف')
      setDeleteTarget(null)
      load()
    } finally {
      setDeleting(false)
    }
  }
  const toggleStatus = async (l: any) => {
    const newStatus = l.status === 'ساري' ? 'متوقف' : 'ساري'
    await fetch('/api/licenses', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: l.id, status: newStatus }) })
    toast.success(newStatus === 'ساري' ? 'تم تنشيط الترخيص' : 'تم إيقاف الترخيص')
    load()
  }
  return (
    <SectionCard title="التراخيص" description={`${items.length} ترخيص`} action={<Button className="bg-navy hover:bg-navy-light rounded-xl" onClick={() => { setEditing(null); setOpen(true) }}><Plus className="w-4 h-4 ml-1" /> جديد</Button>}>
      {items.length === 0 ? (
        <div className="text-center py-14">
          <div className="relative inline-block mb-4">
            <div className="absolute inset-0 bg-gold/20 rounded-full blur-2xl animate-pulse" />
            <div className="relative w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-navy via-navy-light to-navy flex items-center justify-center shadow-xl border border-gold/30">
              <Shield className="w-10 h-10 text-gold" />
            </div>
          </div>
          <h3 className="font-bold text-navy text-base mb-1.5">لا توجد تراخيص بعد</h3>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto">أضف أول ترخيص بالضغط على زر "جديد" ✨</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 fia-stagger">
          {items.map((l) => {
            const isActive = l.status === 'ساري'
            return (
              <Card key={l.id} className={`fia-course-card p-0 overflow-hidden cursor-default border ${isActive ? 'border-emerald-400/40' : 'border-red-400/40'}`}>
                {/* Magical header */}
                <div className={`relative p-3 text-white overflow-hidden ${isActive ? 'bg-gradient-to-br from-emerald-600 to-teal-700' : 'bg-gradient-to-br from-rose-600 to-red-700'}`}>
                  <div className="absolute inset-0 opacity-20" style={{
                    backgroundImage: 'radial-gradient(circle at 20% 20%, white 1px, transparent 1px)',
                    backgroundSize: '12px 12px'
                  }} />
                  <div className="absolute -top-4 -left-4 w-12 h-12 bg-white/15 rounded-full blur-xl" />
                  <div className="relative flex items-center gap-2.5">
                    <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur-sm border border-white/30 flex items-center justify-center shadow-md flex-shrink-0">
                      <Shield className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-xs truncate text-white">{l.issuing_body}</div>
                      <div className="text-[10px] text-white/80 truncate">{l.type}</div>
                    </div>
                  </div>
                </div>
                {/* Magical body */}
                <div className="p-3 space-y-2">
                  <div className="pt-1 border-t border-border/40">
                    <div className="text-[9px] text-muted-foreground mb-0.5">الرقم</div>
                    <div className="text-[10px] font-mono font-bold text-gold break-all" dir="ltr">{l.number}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-1 pt-1 border-t border-border/40">
                    <div>
                      <div className="text-[9px] text-muted-foreground mb-0.5">إصدار</div>
                      <div className="text-[10px] font-bold text-navy" dir="ltr">{l.issued_at || '-'}</div>
                    </div>
                    <div>
                      <div className="text-[9px] text-muted-foreground mb-0.5">انتهاء</div>
                      <div className="text-[10px] font-bold text-navy" dir="ltr">{l.expires_at || '-'}</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-center pt-1 border-t border-border/40">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold ${
                      isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/40' : 'bg-rose-50 text-rose-700 border border-rose-200/40'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                      {l.status === 'ساري' ? 'ساري' : 'متوقف'}
                    </span>
                  </div>
                  {/* Actions */}
                  <div className="flex gap-1 pt-1 border-t border-border/40">
                    <Button size="sm" variant="outline" className="flex-1 h-8 text-[10px] rounded-lg border-gold/30 hover:border-gold hover:bg-gold/5" onClick={() => { setEditing(l); setOpen(true) }}>
                      <Edit className="w-3 h-3 ml-1" /> تعديل
                    </Button>
                    <Button size="sm" variant="outline" className={`h-8 w-8 p-0 ${isActive ? 'border-red-500/30 text-red-500 hover:bg-red-500/10' : 'border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10'}`} onClick={() => toggleStatus(l)} title={isActive ? 'إيقاف' : 'تنشيط'}>
                      {isActive ? <XCircle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 w-8 p-0 border-red-500/30 text-red-500 hover:bg-red-500/10" onClick={() => setDeleteTarget(l)} title="حذف">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
      {open && <SimpleDialog open={open} onOpenChange={setOpen} title={editing ? 'تعديل' : 'إضافة'} onSaved={load} initial={editing} fields={['issuing_body', 'type', 'number', 'issued_at', 'expires_at', 'status', 'verification_url']} apiPath="/api/licenses" />}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o && !deleting) setDeleteTarget(null) }}
        title="تأكيد حذف الترخيص"
        message="هل أنت متأكد من الحذف؟"
        itemLabel="سيتم حذف الترخيص التالي:"
        itemName={deleteTarget?.issuing_body}
        confirmLabel="حذف"
        cancelLabel="إلغاء"
        variant="danger"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </SectionCard>
  )
})

const AdminFounder = React.memo(function AdminFounder({ user }: any) {
  const [tab, setTab] = useState<'founder' | 'team'>('founder')

  return (
    <SectionCard title="المؤسس والفريق" description="إدارة معلومات المؤسس وأعضاء الفريق بشكل احترافي">
      <div className="space-y-5">
        {/* ⚡ Magical tab buttons */}
        <div className="flex gap-2 border-b border-gold/20 pb-3">
          <button
            onClick={() => setTab('founder')}
            className={`relative px-5 py-2.5 rounded-xl text-sm font-bold transition-all border overflow-hidden ${
              tab === 'founder'
                ? 'bg-gradient-to-br from-navy via-navy-light to-navy text-gold shadow-md border-gold/40'
                : 'bg-white text-navy border-gold/20 hover:border-gold/40 hover:bg-gold/5'
            }`}
          >
            {tab === 'founder' && (
              <div className="absolute inset-0 opacity-25 pointer-events-none" style={{
                backgroundImage: 'radial-gradient(circle at 20% 20%, #D4AF37 1px, transparent 1px)',
                backgroundSize: '12px 12px'
              }} />
            )}
            <span className="relative flex items-center gap-1.5">
              <Crown className="w-4 h-4" /> المؤسس
            </span>
          </button>
          <button
            onClick={() => setTab('team')}
            className={`relative px-5 py-2.5 rounded-xl text-sm font-bold transition-all border overflow-hidden ${
              tab === 'team'
                ? 'bg-gradient-to-br from-navy via-navy-light to-navy text-gold shadow-md border-gold/40'
                : 'bg-white text-navy border-gold/20 hover:border-gold/40 hover:bg-gold/5'
            }`}
          >
            {tab === 'team' && (
              <div className="absolute inset-0 opacity-25 pointer-events-none" style={{
                backgroundImage: 'radial-gradient(circle at 20% 20%, #D4AF37 1px, transparent 1px)',
                backgroundSize: '12px 12px'
              }} />
            )}
            <span className="relative flex items-center gap-1.5">
              <Users className="w-4 h-4" /> الفريق القيادي
            </span>
          </button>
        </div>

        {tab === 'founder' ? (
          <TeamEditor filterRole="founder" />
        ) : (
          <TeamEditor filterRole="leader" />
        )}
      </div>
    </SectionCard>
  )
})

const AdminSite = React.memo(function AdminSite() {
  const [settings, setSettings] = useState<any>({})
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<'basic' | 'about' | 'policies' | 'social' | 'visibility'>('basic')
  const [passwordDialog, setPasswordDialog] = useState<{ password: string; pendingSettings: any } | null>(null)
  const user = useAuth((s) => s.user)
  useEffect(() => { fetch('/api/site-settings').then((r) => r.json()).then(setSettings) }, [])

  // Save with Telegram-protection: if Telegram token/channel_id changed,
  // prompt for password first; otherwise save directly.
  const save = async (overridePassword?: string) => {
    setSaving(true)
    try {
      const body = { ...settings }
      if (overridePassword) {
        body.user_id = user?.id
        body.password = overridePassword
      }
      const res = await fetch('/api/site-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        // If 403 = Telegram protection triggered → open password dialog
        if (res.status === 403 && data.error?.includes('تيليجرام')) {
          setPasswordDialog({ password: '', pendingSettings: settings })
          setSaving(false)
          return
        }
        toast.error(data.error || 'فشل الحفظ')
      } else {
        toast.success('تم الحفظ بنجاح')
        setPasswordDialog(null)
      }
    } catch { toast.error('فشل') } finally { setSaving(false) }
  }

  const confirmSaveWithPassword = async () => {
    if (!passwordDialog?.password) {
      toast.error('أدخل كلمة المرور')
      return
    }
    await save(passwordDialog.password)
  }

  return (
    <SectionCard title="إعدادات الموقع" description="معلومات الأكاديمية + من نحن + السياسات + التواصل + الإظهار">
      {/* ⚡ Magical tabs — premium style */}
      <div className="relative flex gap-2 border-b border-gold/30 pb-3 mb-5 flex-wrap overflow-hidden">
        {/* Magical background glow */}
        <div className="absolute -top-8 -right-8 w-24 h-24 bg-gold/10 rounded-full blur-2xl pointer-events-none" />
        {[
          { id: 'basic',      label: 'معلومات أساسية', icon: Building2,    gradient: 'from-blue-500 to-indigo-600' },
          { id: 'about',      label: 'من نحن',         icon: BookOpen,     gradient: 'from-purple-500 to-fuchsia-600' },
          { id: 'policies',   label: 'السياسات',       icon: Shield,       gradient: 'from-slate-600 to-gray-700' },
          { id: 'social',     label: 'التواصل',         icon: MessageSquare, gradient: 'from-cyan-500 to-blue-600' },
          { id: 'visibility', label: 'الإظهار',        icon: Eye,          gradient: 'from-emerald-500 to-teal-600' },
        ].map((t) => {
          const TabIcon = t.icon
          const isActive = tab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id as any)}
              className={`relative px-5 py-3 rounded-2xl text-sm font-bold transition-all border overflow-hidden group ${
                isActive
                  ? 'bg-gradient-to-br from-navy via-navy-light to-navy text-gold shadow-lg border-gold/50'
                  : 'bg-white text-navy border-gold/20 hover:border-gold/40 hover:bg-gold/5 hover:-translate-y-0.5'
              }`}
            >
              {isActive && (
                <>
                  {/* Magical dot pattern */}
                  <div className="absolute inset-0 opacity-25 pointer-events-none" style={{
                    backgroundImage: 'radial-gradient(circle at 20% 20%, #D4AF37 1px, transparent 1px), radial-gradient(circle at 80% 80%, white 1px, transparent 1px)',
                    backgroundSize: '12px 12px, 10px 10px'
                  }} />
                  {/* Top magical strip */}
                  <div className="absolute top-0 right-0 left-0 h-0.5 bg-gradient-to-l from-gold via-amber-300 to-gold" />
                </>
              )}
              <span className="relative flex items-center gap-2">
                {/* Icon — colored circle when inactive, gold icon when active */}
                <span className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all flex-shrink-0 ${
                  isActive
                    ? 'bg-gradient-to-br from-gold to-amber-500 text-navy shadow-md'
                    : `bg-gradient-to-br ${t.gradient} text-white group-hover:scale-110 transition-transform`
                }`}>
                  <TabIcon className="w-4 h-4" strokeWidth={2.2} />
                </span>
                <span>{t.label}</span>
              </span>
            </button>
          )
        })}
      </div>

      <div className="space-y-4 max-w-3xl">
        {/* BASIC — magical card */}
        {tab === 'basic' && (
          <div className="space-y-4">
            <div className="relative p-5 rounded-2xl border border-gold/30 bg-gradient-to-br from-white to-gold/5 overflow-hidden">
              <div className="absolute -top-6 -right-6 w-20 h-20 bg-gold/15 rounded-full blur-2xl" />
              <h3 className="relative font-bold text-navy mb-4 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-navy to-navy-light flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-gold" />
                </div>
                معلومات الأكاديمية
              </h3>
              <div className="relative grid sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-bold text-navy flex items-center gap-1.5 mb-1.5"><BookOpen className="w-3.5 h-3.5 text-gold" /> اسم الأكاديمية (عربي)</Label>
                  <Input value={settings.academy_name || ''} onChange={(e) => setSettings({ ...settings, academy_name: e.target.value })} className="rounded-xl border-gold/30 focus:border-gold focus:ring-gold/30" />
                </div>
                <div>
                  <Label className="text-xs font-bold text-navy flex items-center gap-1.5 mb-1.5"><BookOpen className="w-3.5 h-3.5 text-gold" /> اسم الأكاديمية (إنجليزي)</Label>
                  <Input value={settings.academy_name_en || ''} onChange={(e) => setSettings({ ...settings, academy_name_en: e.target.value })} dir="ltr" className="rounded-xl border-gold/30 focus:border-gold focus:ring-gold/30" />
                </div>
                <div>
                  <Label className="text-xs font-bold text-navy flex items-center gap-1.5 mb-1.5"><Tag className="w-3.5 h-3.5 text-gold" /> الاختصار</Label>
                  <Input value={settings.academy_short || ''} onChange={(e) => setSettings({ ...settings, academy_short: e.target.value })} dir="ltr" className="rounded-xl border-gold/30 focus:border-gold focus:ring-gold/30" />
                </div>
                <div>
                  <Label className="text-xs font-bold text-navy flex items-center gap-1.5 mb-1.5"><Mail className="w-3.5 h-3.5 text-gold" /> الهاتف</Label>
                  <Input value={settings.phone || ''} onChange={(e) => setSettings({ ...settings, phone: e.target.value })} dir="ltr" className="rounded-xl border-gold/30 focus:border-gold focus:ring-gold/30" />
                </div>
                <div>
                  <Label className="text-xs font-bold text-navy flex items-center gap-1.5 mb-1.5"><Mail className="w-3.5 h-3.5 text-gold" /> البريد</Label>
                  <Input value={settings.email || ''} onChange={(e) => setSettings({ ...settings, email: e.target.value })} dir="ltr" className="rounded-xl border-gold/30 focus:border-gold focus:ring-gold/30" />
                </div>
                <div>
                  <Label className="text-xs font-bold text-navy flex items-center gap-1.5 mb-1.5"><MapPin className="w-3.5 h-3.5 text-gold" /> العنوان</Label>
                  <Input value={settings.address || ''} onChange={(e) => setSettings({ ...settings, address: e.target.value })} className="rounded-xl border-gold/30 focus:border-gold focus:ring-gold/30" />
                </div>
              </div>
            </div>

            <div className="relative p-5 rounded-2xl border border-gold/30 bg-gradient-to-br from-white to-gold/5 overflow-hidden">
              <div className="absolute -top-6 -right-6 w-20 h-20 bg-gold/15 rounded-full blur-2xl" />
              <h3 className="relative font-bold text-navy mb-4 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-white" />
                </div>
                تكامل تيليجرام (لرفع الفيديوهات)
              </h3>
              <div className="relative grid sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-bold text-navy flex items-center gap-1.5 mb-1.5"><Lock className="w-3.5 h-3.5 text-gold" /> Bot Token</Label>
                  <Input value={settings.telegram_bot_token || ''} onChange={(e) => setSettings({ ...settings, telegram_bot_token: e.target.value })} dir="ltr" className="font-mono text-xs rounded-xl border-gold/30 focus:border-gold focus:ring-gold/30" />
                </div>
                <div>
                  <Label className="text-xs font-bold text-navy flex items-center gap-1.5 mb-1.5"><Mail className="w-3.5 h-3.5 text-gold" /> Channel ID</Label>
                  <Input value={settings.telegram_channel_id || ''} onChange={(e) => setSettings({ ...settings, telegram_channel_id: e.target.value })} dir="ltr" className="font-mono text-xs rounded-xl border-gold/30 focus:border-gold focus:ring-gold/30" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ABOUT US — magical card */}
        {tab === 'about' && (
          <div className="space-y-4">
            <div className="relative p-5 rounded-2xl border border-gold/30 bg-gradient-to-br from-white to-gold/5 overflow-hidden">
              <div className="absolute -top-6 -right-6 w-20 h-20 bg-gold/15 rounded-full blur-2xl" />
              <h3 className="relative font-bold text-navy mb-4 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center">
                  <BookOpen className="w-4 h-4 text-white" />
                </div>
                محتوى صفحة "من نحن"
              </h3>
              <p className="relative text-xs text-muted-foreground mb-4 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-gold" />
                يظهر محتوى هذه الحقول في صفحة "من نحن" عند الضغط على الروابط السريعة.
              </p>
              <div className="relative space-y-4">
                <div>
                  <Label className="text-xs font-bold text-navy flex items-center gap-1.5 mb-1.5"><Eye className="w-3.5 h-3.5 text-gold" /> رؤيتنا</Label>
                  <textarea value={settings.about_vision || ''} onChange={(e) => setSettings({ ...settings, about_vision: e.target.value })}
                    className="w-full min-h-[100px] p-3 border border-gold/30 rounded-xl text-sm focus:border-gold focus:ring-gold/30 focus:outline-none" placeholder="اكتب رؤية الأكاديمية..." />
                </div>
                <div>
                  <Label className="text-xs font-bold text-navy flex items-center gap-1.5 mb-1.5"><Target className="w-3.5 h-3.5 text-gold" /> رسالتنا</Label>
                  <textarea value={settings.about_mission || ''} onChange={(e) => setSettings({ ...settings, about_mission: e.target.value })}
                    className="w-full min-h-[100px] p-3 border border-gold/30 rounded-xl text-sm focus:border-gold focus:ring-gold/30 focus:outline-none" placeholder="اكتب رسالة الأكاديمية..." />
                </div>
                <div>
                  <Label className="text-xs font-bold text-navy flex items-center gap-1.5 mb-1.5"><Award className="w-3.5 h-3.5 text-gold" /> قيمنا</Label>
                  <textarea value={settings.about_values || ''} onChange={(e) => setSettings({ ...settings, about_values: e.target.value })}
                    className="w-full min-h-[100px] p-3 border border-gold/30 rounded-xl text-sm focus:border-gold focus:ring-gold/30 focus:outline-none" placeholder="اكتب قيم الأكاديمية..." />
                </div>
                <div>
                  <Label className="text-xs font-bold text-navy flex items-center gap-1.5 mb-1.5"><Users className="w-3.5 h-3.5 text-gold" /> فريقنا</Label>
                  <textarea value={settings.about_team || ''} onChange={(e) => setSettings({ ...settings, about_team: e.target.value })}
                    className="w-full min-h-[100px] p-3 border border-gold/30 rounded-xl text-sm focus:border-gold focus:ring-gold/30 focus:outline-none" placeholder="اكتب وصف فريق الأكاديمية..." />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* POLICIES — magical card */}
        {tab === 'policies' && (
          <div className="space-y-4">
            <div className="relative p-5 rounded-2xl border border-gold/30 bg-gradient-to-br from-white to-gold/5 overflow-hidden">
              <div className="absolute -top-6 -right-6 w-20 h-20 bg-gold/15 rounded-full blur-2xl" />
              <h3 className="relative font-bold text-navy mb-4 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-600 to-gray-700 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-white" />
                </div>
                السياسات والشروط
              </h3>
              <p className="relative text-xs text-muted-foreground mb-4 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-gold" />
                تظهر هذه السياسات في صفحات منفصلة عند الضغط على روابط الفوتر.
              </p>
              <div className="relative space-y-4">
                <div>
                  <Label className="text-xs font-bold text-navy flex items-center gap-1.5 mb-1.5"><Shield className="w-3.5 h-3.5 text-gold" /> سياسة الخصوصية</Label>
                  <textarea value={settings.policy_privacy || ''} onChange={(e) => setSettings({ ...settings, policy_privacy: e.target.value })}
                    className="w-full min-h-[150px] p-3 border border-gold/30 rounded-xl text-sm focus:border-gold focus:ring-gold/30 focus:outline-none" placeholder="اكتب سياسة الخصوصية..." />
                </div>
                <div>
                  <Label className="text-xs font-bold text-navy flex items-center gap-1.5 mb-1.5"><FileText className="w-3.5 h-3.5 text-gold" /> شروط الاستخدام</Label>
                  <textarea value={settings.policy_terms || ''} onChange={(e) => setSettings({ ...settings, policy_terms: e.target.value })}
                    className="w-full min-h-[150px] p-3 border border-gold/30 rounded-xl text-sm focus:border-gold focus:ring-gold/30 focus:outline-none" placeholder="اكتب شروط الاستخدام..." />
                </div>
                <div>
                  <Label className="text-xs font-bold text-navy flex items-center gap-1.5 mb-1.5"><RefreshCw className="w-3.5 h-3.5 text-gold" /> سياسة الاسترداد</Label>
                  <textarea value={settings.policy_refund || ''} onChange={(e) => setSettings({ ...settings, policy_refund: e.target.value })}
                    className="w-full min-h-[150px] p-3 border border-gold/30 rounded-xl text-sm focus:border-gold focus:ring-gold/30 focus:outline-none" placeholder="اكتب سياسة الاسترداد..." />
                </div>
                <div>
                  <Label className="text-xs font-bold text-navy flex items-center gap-1.5 mb-1.5"><HelpCircle className="w-3.5 h-3.5 text-gold" /> الدعم والمساعدة</Label>
                  <textarea value={settings.policy_support || ''} onChange={(e) => setSettings({ ...settings, policy_support: e.target.value })}
                    className="w-full min-h-[150px] p-3 border border-gold/30 rounded-xl text-sm focus:border-gold focus:ring-gold/30 focus:outline-none" placeholder="اكتب معلومات الدعم..." />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SOCIAL — magical themed cards per platform */}
        {tab === 'social' && (
          <div className="space-y-4">
            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-gold" />
              <span>كل رابط يمكن تفعيله/إيقافه بشكل مستقل. لا يظهر في الفوتر إلا عند التفعيل.</span>
            </div>

            {/* Helper function to render each social platform card */}
            {[
              {
                key: 'facebook',
                label: 'فيسبوك',
                placeholder: 'https://facebook.com/...',
                iconBg: 'from-blue-600 to-blue-800',
                cardBg: 'from-blue-50 to-indigo-50',
                border: 'border-blue-300/40',
                glow: 'bg-blue-500/15',
                icon: <Facebook className="w-4 h-4 text-white" />,
                labelText: 'text-blue-800',
              },
              {
                key: 'telegram',
                label: 'تيليجرام (قناة أو يوزر)',
                placeholder: '@username أو https://t.me/...',
                iconBg: 'from-cyan-500 to-blue-600',
                cardBg: 'from-cyan-50 to-blue-50',
                border: 'border-cyan-300/40',
                glow: 'bg-cyan-500/15',
                icon: <Send className="w-4 h-4 text-white" />,
                labelText: 'text-cyan-800',
              },
              {
                key: 'whatsapp',
                label: 'واتساب (قناة)',
                placeholder: 'https://wa.me/... أو رقم',
                iconBg: 'from-emerald-500 to-green-600',
                cardBg: 'from-emerald-50 to-green-50',
                border: 'border-emerald-300/40',
                glow: 'bg-emerald-500/15',
                icon: <Phone className="w-4 h-4 text-white" />,
                labelText: 'text-emerald-800',
              },
              {
                key: 'sms',
                label: 'رقم للمراسلات النصية (SMS)',
                placeholder: '+9677XX...',
                iconBg: 'from-amber-500 to-yellow-600',
                cardBg: 'from-amber-50 to-yellow-50',
                border: 'border-amber-300/40',
                glow: 'bg-amber-500/15',
                icon: <MessageSquare className="w-4 h-4 text-white" />,
                labelText: 'text-amber-800',
              },
            ].map((platform: any) => {
              const enabledKey = `social_${platform.key}_enabled`
              const urlKey = `social_${platform.key}`
              const isEnabled = Boolean((settings as any)[enabledKey])
              return (
                <div key={platform.key} className={`relative p-4 rounded-xl border ${platform.border} bg-gradient-to-br ${platform.cardBg} overflow-hidden`}>
                  <div className={`absolute -top-4 -right-4 w-12 h-12 ${platform.glow} rounded-full blur-xl pointer-events-none`} />
                  <div className="relative flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${platform.iconBg} flex items-center justify-center shadow-md`}>
                        {platform.icon}
                      </div>
                      <Label className={`font-bold ${platform.labelText}`}>{platform.label}</Label>
                    </div>
                    <div className="flex items-center gap-2 text-xs cursor-pointer">
                      <span className={`font-bold ${isEnabled ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                        {isEnabled ? 'مفعّل' : 'متوقف'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSettings({ ...settings, [enabledKey]: !isEnabled })}
                        className={`relative w-10 h-5 rounded-full transition-colors ${isEnabled ? 'bg-emerald-500' : 'bg-muted'}`}
                        aria-pressed={isEnabled}
                      >
                        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${isEnabled ? 'right-0.5' : 'right-5'}`} />
                      </button>
                    </div>
                  </div>
                  <Input
                    value={((settings as any)[urlKey] as string) || ''}
                    onChange={(e) => setSettings({ ...settings, [urlKey]: e.target.value })}
                    dir="ltr"
                    placeholder={platform.placeholder}
                    className="text-sm rounded-lg bg-white"
                  />
                </div>
              )
            })}
          </div>
        )}

        {/* VISIBILITY — magical toggle cards */}
        {tab === 'visibility' && (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-gold" />
              تحكم في الأقسام التي تظهر في الصفحة الرئيسية.
            </p>
            <div className="relative p-4 rounded-xl border border-gold/30 bg-gradient-to-br from-white to-gold/5 flex items-center justify-between overflow-hidden">
              <div className="absolute -top-4 -right-4 w-12 h-12 bg-gold/15 rounded-full blur-xl" />
              <div className="relative flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-md">
                  <Briefcase className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="font-bold text-navy text-sm">إظهار قسم الشركاء</div>
                  <div className="text-xs text-muted-foreground">إذا تم الإيقاف، لن يظهر قسم الشركاء في الصفحة الرئيسية</div>
                </div>
              </div>
              <label className="relative cursor-pointer flex-shrink-0">
                <input type="checkbox" checked={settings.show_partners || false} onChange={(e) => setSettings({ ...settings, show_partners: e.target.checked })} className="sr-only" />
                <div className={`w-12 h-6 rounded-full transition-colors ${settings.show_partners ? 'bg-emerald-500' : 'bg-muted'}`} />
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${settings.show_partners ? 'right-0.5' : 'right-6'}`} />
              </label>
            </div>
            <div className="relative p-4 rounded-xl border border-gold/30 bg-gradient-to-br from-white to-gold/5 flex items-center justify-between overflow-hidden">
              <div className="absolute -top-4 -right-4 w-12 h-12 bg-gold/15 rounded-full blur-xl" />
              <div className="relative flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-md">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="font-bold text-navy text-sm">إظهار قسم التراخيص</div>
                  <div className="text-xs text-muted-foreground">إذا تم الإيقاف، لن يظهر قسم التراخيص في الصفحة الرئيسية</div>
                </div>
              </div>
              <label className="relative cursor-pointer flex-shrink-0">
                <input type="checkbox" checked={settings.show_licenses || false} onChange={(e) => setSettings({ ...settings, show_licenses: e.target.checked })} className="sr-only" />
                <div className={`w-12 h-6 rounded-full transition-colors ${settings.show_licenses ? 'bg-emerald-500' : 'bg-muted'}`} />
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${settings.show_licenses ? 'right-0.5' : 'right-6'}`} />
              </label>
            </div>
          </div>
        )}

        {/* Save button — magical */}
        <div className="pt-4 border-t border-gold/20">
          <Button onClick={() => save()} disabled={saving} className="bg-gradient-to-r from-navy to-navy-light hover:from-navy-light hover:to-navy text-gold rounded-xl shadow-md active:scale-[0.97] transition-all px-6">
            {saving ? <><Loader2 className="w-4 h-4 ml-1.5 animate-spin" /> جاري الحفظ...</> : <><CheckCircle2 className="w-4 h-4 ml-1.5" /> حفظ الإعدادات</>}
          </Button>
        </div>
      </div>

      {/* ⚡ Magical password-confirm dialog (Telegram protection) */}
      {passwordDialog && (
        <Dialog open={true} onOpenChange={(o) => { if (!o) setPasswordDialog(null) }}>
          <DialogContent className="sm:max-w-md p-0 border-0">
            {/* Magical header */}
            <div className="relative bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 p-5 text-white overflow-hidden rounded-t-2xl">
              <div className="absolute inset-0 opacity-25" style={{
                backgroundImage: 'radial-gradient(circle at 12% 50%, white 1.5px, transparent 1.5px), radial-gradient(circle at 88% 20%, white 1px, transparent 1px)',
                backgroundSize: '24px 24px, 18px 18px'
              }} />
              <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
              <button onClick={() => setPasswordDialog(null)} className="absolute top-3 left-3 w-8 h-8 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center z-10 backdrop-blur-sm">
                <X className="w-4 h-4 text-white" />
              </button>
              <div className="relative flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-lg border border-white/30">
                  <Lock className="w-7 h-7 text-white" strokeWidth={2.2} />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold tracking-tight text-white">
                    تأكيد تغيير إعدادات تيليجرام
                  </DialogTitle>
                  <p className="text-white/80 text-xs mt-0.5 flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3" />
                    حماية الإعدادات الحساسة
                  </p>
                </div>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-amber-50 border border-amber-500/30 p-3 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
                <div>
                  <p className="font-bold mb-1">لماذا نطلب كلمة المرور؟</p>
                  <p className="leading-relaxed">إعدادات تيليجرام تتحكم برفع الصور والفيديوهات والإشعارات. أي خطأ فيها قد يوقف جميع عمليات الرفع في التطبيق. نطلب كلمة المرور لتأكيد التغيير.</p>
                </div>
              </div>
              <div>
                <Label className="text-xs font-bold text-navy flex items-center gap-1.5 mb-1.5">
                  <Lock className="w-3.5 h-3.5 text-gold" /> كلمة مرور حسابك
                </Label>
                <Input
                  type="password"
                  value={passwordDialog.password}
                  onChange={(e) => setPasswordDialog({ ...passwordDialog, password: e.target.value })}
                  dir="ltr"
                  className="rounded-xl border-gold/30 focus:border-gold focus:ring-gold/30"
                  placeholder="••••••••"
                  onKeyDown={(e) => { if (e.key === 'Enter') confirmSaveWithPassword() }}
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-4 bg-muted/20 border-t border-border">
              <Button variant="outline" onClick={() => setPasswordDialog(null)} className="rounded-xl">إلغاء</Button>
              <Button onClick={confirmSaveWithPassword} disabled={saving || !passwordDialog.password} className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl shadow-md active:scale-[0.97] transition-all px-6">
                {saving ? <><Loader2 className="w-4 h-4 ml-1.5 animate-spin" /> جاري...</> : <><CheckCircle2 className="w-4 h-4 ml-1.5" /> تأكيد وحفظ</>}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </SectionCard>
  )
})

// ============== Admin Account & Security (change email + password) ==============
function AdminAccount({ user, updateUser, logout }: any) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [loading, setLoading] = useState(false)

  // ====== Danger Zone state ======
  const [dzOpen, setDzOpen] = useState(false)
  const [dzPassword, setDzPassword] = useState('')
  const [showDzPassword, setShowDzPassword] = useState(false)
  const [dzLoading, setDzLoading] = useState(false)
  // Selective section wipe state
  const [dzSection, setDzSection] = useState('')
  const [dzSectionOpen, setDzSectionOpen] = useState(false)
  const [dzSectionLoading, setDzSectionLoading] = useState(false)
  // Orphan cleanup preview state
  const [orphanPreviewOpen, setOrphanPreviewOpen] = useState(false)
  const [orphanPreviewLoading, setOrphanPreviewLoading] = useState(false)
  const [orphanCleanupLoading, setOrphanCleanupLoading] = useState(false)
  const [orphanPreview, setOrphanPreview] = useState<{ table: string; label: string; count: number }[]>([])
  const [orphanTotal, setOrphanTotal] = useState(0)
  // 🛡️ أرشيف الإنقاذ الملكي — نسخ ما قبل الحذف
  const [dzSnapshots, setDzSnapshots] = useState<DzSnapshotRow[]>([])
  const [dzSnapLoading, setDzSnapLoading] = useState(false)
  const [dzSnapBusy, setDzSnapBusy] = useState('')
  const [dzRestoreOpen, setDzRestoreOpen] = useState(false)
  const [dzRestoreTarget, setDzRestoreTarget] = useState<DzSnapshotRow | null>(null)

  const fetchDzSnapshots = async () => {
    setDzSnapLoading(true)
    try {
      const res = await fetch('/api/admin/danger-zone/snapshots')
      const data = await res.json()
      if (res.ok) setDzSnapshots(data.snapshots || [])
    } catch {}
    finally { setDzSnapLoading(false) }
  }

  useEffect(() => { fetchDzSnapshots() }, [])

  const restoreDzSnapshot = async () => {
    if (!dzRestoreTarget) return
    setDzSnapBusy(dzRestoreTarget.id)
    try {
      const res = await fetch('/api/admin/danger-zone/snapshots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshot_id: dzRestoreTarget.id, user_id: user.id }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(`♻️ تمت الاستعادة الملكية — ${data.row_total || 0} سجل عاد إلى مكانه بأمان`)
        setDzRestoreOpen(false)
        setDzRestoreTarget(null)
        fetchDzSnapshots()
      } else {
        toast.error(data.error || 'فشلت الاستعادة الملكية')
      }
    } catch {
      toast.error('خطأ في الاتصال')
    } finally {
      setDzSnapBusy('')
    }
  }

// Arabic labels for each Danger Zone section (used in the
// confirmation dialog so the user sees what they're wiping in Arabic).
const DZ_SECTION_LABELS: Record<string, string> = {
  courses: 'الدورات',
  trainers: 'المدربون',
  students: 'المتدربون',
  payments: 'المدفوعات والتسجيلات',
  certificates: 'الشهادات',
  reviews: 'التقييمات',
  coupons: 'الكوبونات',
  blog: 'منشورات المدوّنة',
  forum: 'مواضيع المنتدى',
  contact: 'رسائل التواصل',
  payment_methods: 'طرق الدفع',
  team: 'أعضاء الفريق',
  notifications: 'الإشعارات',
}

// نوع نسخة الإنقاذ الملكية (أرشيف منطقة الخطر)
type DzSnapshotRow = {
  id: string
  kind: string
  section: string
  label: string
  counts: Record<string, number>
  row_total: number
  created_at: string
}

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
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'فشل التحديث')
        return
      }
      toast.success('تم تحديث بيانات الدخول بنجاح')
      // Update auth state
      updateUser({
        email: newEmail || user.email,
        password: newPassword || user.password,
      })
      // Reset form
      setCurrentPassword('')
      setNewEmail('')
      setNewPassword('')
      setConfirmPassword('')
      // Logout if email changed (so they can re-login with new credentials)
      if (newEmail) {
        setTimeout(() => {
          logout()
          toast.info('تم تحديث البريد. يرجى تسجيل الدخول بالبيانات الجديدة')
        }, 2000)
      }
    } catch (e) {
      toast.error('خطأ في الاتصال')
    } finally {
      setLoading(false)
    }
  }

  // ====== Danger Zone confirm handler ======
  const handleDangerZoneConfirm = async () => {
    if (!dzPassword) {
      toast.error('أدخل كلمة المرور للتأكيد')
      return
    }
    setDzLoading(true)
    try {
      const res = await fetch('/api/danger-zone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, password: dzPassword }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'فشل الحذف')
        return
      }
      toast.success('تم حذف جميع البيانات بنجاح — نسخة الإنقاذ الملكية محفوظة في الأرشيف 🛡️. سيتم تسجيل الخروج...')
      setDzOpen(false)
      setDzPassword('')
      // Log the admin out so they re-login to a clean academy
      setTimeout(() => {
        logout()
      }, 2500)
    } catch {
      toast.error('خطأ في الاتصال')
    } finally {
      setDzLoading(false)
    }
  }

  const closeDzDialog = () => {
    if (dzLoading) return
    setDzOpen(false)
    setDzPassword('')
    setShowDzPassword(false)
  }

  return (
    <>
    <SectionCard title="الحساب والأمان" description="تغيير البريد الإلكتروني وكلمة المرور للمؤسس">
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
                  <XCircle className="w-3 h-3" /> كلمتا المرور غير متطابقتين
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
          {loading ? <><Loader2 className="w-4 h-4 ml-1 animate-spin" /> جاري الحفظ...</> : 'حفظ التغييرات'}
        </Button>
      </div>
    </SectionCard>

    {/* ===== Danger Zone — magical ===== */}
    <div className="mt-6 rounded-2xl border-2 border-red-500/40 bg-red-500/5 overflow-hidden max-w-2xl relative">
      {/* Magical dot pattern overlay */}
      <div className="absolute inset-0 opacity-15 pointer-events-none" style={{
        backgroundImage: 'radial-gradient(circle at 20% 30%, #ef4444 1.5px, transparent 1.5px), radial-gradient(circle at 80% 70%, #f87171 1px, transparent 1px)',
        backgroundSize: '24px 24px, 18px 18px'
      }} />
      <div className="absolute -top-8 -right-8 w-32 h-32 bg-red-500/15 rounded-full blur-2xl pointer-events-none" />
      {/* Header bar */}
      <div className="relative flex items-center gap-3 p-4 bg-red-500/10 border-b border-red-500/30">
        <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="w-5 h-5 text-red-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-red-600 text-base">منطقة خطرة</h3>
          <p className="text-xs text-red-600/80 mt-0.5">حذف البيانات — محميّ بدرع الإنقاذ الملكي: نسخة تلقائية قبل كل حذف</p>
        </div>
      </div>

      {/* Body */}
      <div className="relative p-4 space-y-4">
        <p className="text-sm text-navy">
          سيتم حذف: جميع المدربين، المتدربين، الفريق، الدورات، المدفوعات، الشهادات
        </p>
        <p className="text-xs text-muted-foreground">
          سيتم الاحتفاظ بحساب المؤسس التنفيذي فقط — وكذلك إعدادات الموقع.
        </p>
        <Button
          variant="outline"
          onClick={() => setDzOpen(true)}
          className="border-red-500/40 text-red-600 hover:bg-red-500/10 hover:text-red-700 rounded-xl"
        >
          <Trash2 className="w-4 h-4 ml-1" /> حذف جميع البيانات
        </Button>

        {/* ===== Selective section wipe ===== */}
        <div className="border-t border-red-500/30 pt-4 space-y-3">
          <div className="flex items-center gap-2">
            <Eraser className="w-4 h-4 text-red-500" />
            <h4 className="font-bold text-red-600 text-sm">حذف قسم محدد</h4>
          </div>
          <p className="text-xs text-muted-foreground">
            احذف قسماً واحداً فقط بدلاً من مسح كل شيء. مفيد للتنظيف المُستهدف.
          </p>

          {/* Select dropdown */}
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              value={dzSection}
              onChange={(e) => setDzSection(e.target.value)}
              disabled={dzSectionLoading}
              className="flex-1 h-10 px-3 text-sm border border-red-500/30 rounded-xl bg-white focus:border-red-500 focus:ring-red-500/20 outline-none"
            >
              <option value="">— اختر القسم —</option>
              <option value="courses">📚 الدورات (وكافة تبعاتها)</option>
              <option value="trainers">👨‍⚕️ المدربون</option>
              <option value="students">🎓 المتدربون</option>
              <option value="payments">💳 المدفوعات + التسجيلات</option>
              <option value="certificates">📜 الشهادات</option>
              <option value="reviews">⭐ التقييمات</option>
              <option value="coupons">🎟️ الكوبونات</option>
              <option value="blog">📰 منشورات المدوّنة</option>
              <option value="forum">💬 مواضيع المنتدى</option>
              <option value="contact">📧 رسائل التواصل</option>
              <option value="payment_methods">🏦 طرق الدفع</option>
              <option value="team">👥 أعضاء الفريق</option>
              <option value="notifications">🔔 الإشعارات</option>
            </select>
            <Button
              variant="outline"
              disabled={!dzSection || dzSectionLoading}
              onClick={() => setDzSectionOpen(true)}
              className="border-red-500/40 text-red-600 hover:bg-red-500/10 rounded-xl"
            >
              {dzSectionLoading ? <Loader2 className="w-4 h-4 ml-1 animate-spin" /> : <Trash2 className="w-4 h-4 ml-1" />}
              حذف القسم
            </Button>
          </div>

          {/* Cleanup ALL orphans (button + modal preview) */}
          <div className="border-t border-red-500/30 pt-3">
            <div className="flex items-center gap-2 mb-1">
              <Brush className="w-4 h-4 text-orange-500" />
              <h4 className="font-bold text-orange-600 text-sm">تنظيف السجلات اليتيمة</h4>
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              يحذف كل السجلات التي بحوزتها course_id أو user_id لم يعد موجوداً — مدفوعات، تقييمات، مواضيع منتدى، ردود، تقدّم، إحالات عمولة، استخدامات كوبونات، نتائج اختبارات.
            </p>
            <Button
              variant="outline"
              onClick={async () => {
                setOrphanPreviewLoading(true)
                setOrphanPreviewOpen(true)
                try {
                  const res = await fetch('/api/admin/cleanup-orphans')
                  const data = await res.json()
                  if (res.ok && data.preview) {
                    setOrphanPreview(data.preview)
                    setOrphanTotal(data.total_orphans || 0)
                  } else {
                    toast.error('فشل تحميل المعاينة')
                    setOrphanPreviewOpen(false)
                  }
                } catch {
                  toast.error('خطأ في الاتصال')
                  setOrphanPreviewOpen(false)
                } finally {
                  setOrphanPreviewLoading(false)
                }
              }}
              className="border-orange-500/40 text-orange-600 hover:bg-orange-500/10 rounded-xl"
            >
              <Brush className="w-4 h-4 ml-1" /> معاينة وتنظيف اليتامى
            </Button>
          </div>

          {/* ===== 🛡️ أرشيف الإنقاذ الملكي — نسخ ما قبل الحذف ===== */}
          <div className="border-t-2 border-gold/30 pt-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gold/25 to-yellow-700/10 flex items-center justify-center flex-shrink-0">
                <Shield className="w-4 h-4 text-gold" />
              </div>
              <h4 className="font-bold text-sm bg-gradient-to-l from-yellow-600 to-gold bg-clip-text text-transparent">أرشيف الإنقاذ الملكي</h4>
              <button
                onClick={fetchDzSnapshots}
                className="ms-auto text-muted-foreground hover:text-gold transition-colors"
                title="تحديث الأرشيف"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${dzSnapLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mb-2 leading-relaxed">
              كل عملية حذف من منطقة الخطر تلتقط تلقائياً نسخة إنقاذ كاملة قبل المحو — فلا يُفقد شيء أبداً، واستعد أي نسخة بلمسة واحدة.
            </p>
            {dzSnapLoading ? (
              <div className="flex items-center justify-center p-3 text-xs text-muted-foreground">
                <Loader2 className="w-4 h-4 ml-2 animate-spin" /> جاري فحص الأرشيف الملكي...
              </div>
            ) : dzSnapshots.length === 0 ? (
              <div className="text-center p-3 rounded-xl border border-gold/20 bg-gold/5">
                <p className="text-xs text-muted-foreground">لا توجد نسخ إنقاذ بعد — يُنشأ الأرشيف تلقائياً مع أول عملية حذف.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pl-1">
                {dzSnapshots.map((s) => (
                  <div key={s.id} className="flex items-center gap-2 p-2.5 rounded-xl border border-gold/25 bg-gradient-to-l from-gold/10 to-transparent">
                    <div className="w-8 h-8 rounded-full bg-gold/15 flex items-center justify-center flex-shrink-0">
                      {s.kind === 'full' ? <AlertTriangle className="w-4 h-4 text-red-500" /> : <Archive className="w-4 h-4 text-gold" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-navy truncate">
                        {s.kind === 'full' ? 'النسخة الشاملة الكاملة' : `قسم: ${DZ_SECTION_LABELS[s.section] || s.section}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {s.row_total} سجل · {new Date(s.created_at).toLocaleString('ar', { dateStyle: 'medium', timeStyle: 'short' })}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      disabled={dzSnapBusy === s.id}
                      onClick={() => { setDzRestoreTarget(s); setDzRestoreOpen(true) }}
                      className="h-8 px-3 bg-gradient-to-l from-navy to-navy-light text-gold rounded-lg text-xs shadow-sm active:scale-95 transition-all"
                    >
                      {dzSnapBusy === s.id ? <Loader2 className="w-3.5 h-3.5 ml-1 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5 ml-1" />}
                      استعادة
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>

    {/* ===== Orphan cleanup preview confirmation dialog ===== */}
    <Dialog open={orphanPreviewOpen} onOpenChange={(o) => { if (!o && !orphanCleanupLoading && !orphanPreviewLoading) setOrphanPreviewOpen(false) }}>
      <DialogContent className="sm:max-w-md" showCloseButton={!orphanCleanupLoading && !orphanPreviewLoading}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-orange-600">
            <Brush className="w-5 h-5" />
            تنظيف السجلات اليتيمة
          </DialogTitle>
        </DialogHeader>
        <div className="py-2 space-y-3">
          {/* Loading spinner */}
          {orphanPreviewLoading ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              <div className="w-8 h-8 mx-auto mb-2 border-2 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
              جاري فحص قاعدة البيانات...
            </div>
          ) : orphanTotal === 0 ? (
            /* Empty state — no orphans found */
            <div className="p-6 text-center">
              <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-green-500/15 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-green-600" />
              </div>
              <p className="text-sm font-bold text-navy mb-1">✓ قاعدة البيانات نظيفة</p>
              <p className="text-xs text-muted-foreground">لا توجد سجلات يتيمة — كل شيء على ما يرام.</p>
            </div>
          ) : (
            /* Found orphans — show breakdown */
            <>
              <div className="flex items-start gap-3 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-orange-700">
                    تم العثور على {orphanTotal} سجل يتيم
                  </p>
                  <p className="text-xs text-orange-600/80 mt-0.5">
                    هذه السجلات تشير إلى دورات/مستخدمين محذوفين. سيتم حذفها نهائياً.
                  </p>
                </div>
              </div>
              {/* Per-table breakdown */}
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {orphanPreview.filter((p: any) => p.count > 0).map((p: any) => (
                  <div key={p.table} className="flex items-center justify-between p-2 bg-muted/30 rounded-md border border-border">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-md bg-orange-500/15 flex items-center justify-center">
                        <Trash2 className="w-3.5 h-3.5 text-orange-600" />
                      </div>
                      <span className="text-sm text-navy font-medium">{p.label}</span>
                    </div>
                    <Badge className="bg-orange-500/15 text-orange-700 border-orange-500/30 font-bold">
                      {p.count}
                    </Badge>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Action buttons */}
          {orphanTotal > 0 && !orphanCleanupLoading && (
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                onClick={() => setOrphanPreviewOpen(false)}
                className="flex-1"
              >
                إلغاء
              </Button>
              <Button
                onClick={async () => {
                  setOrphanCleanupLoading(true)
                  try {
                    const res = await fetch('/api/admin/cleanup-orphans', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ user_id: user.id }),
                    })
                    const data = await res.json()
                    if (res.ok) {
                      toast.success(`تم حذف ${data.total_deleted || 0} سجل يتيم بنجاح`)
                      setOrphanPreviewOpen(false)
                      setOrphanPreview([])
                      setOrphanTotal(0)
                    } else {
                      toast.error(data.error || 'فشل التنظيف')
                    }
                  } catch {
                    toast.error('خطأ في الاتصال')
                  } finally {
                    setOrphanCleanupLoading(false)
                  }
                }}
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
              >
                <Brush className="w-4 h-4 ml-1" /> حذف {orphanTotal} سجل يتيم
              </Button>
            </div>
          )}
          {orphanCleanupLoading && (
            <div className="flex items-center justify-center p-3 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 ml-2 animate-spin" />
              جاري التنظيف...
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>

    {/* ===== Selective section wipe confirmation ===== */}
    <PasswordConfirmDialog
      open={dzSectionOpen}
      onOpenChange={(o) => { if (!o && !dzSectionLoading) setDzSectionOpen(false) }}
      title={`حذف قسم: ${dzSection ? DZ_SECTION_LABELS[dzSection] || dzSection : ''}`}
      message={`سيتم حذف جميع سجلات القسم "${dzSection ? DZ_SECTION_LABELS[dzSection] || dzSection : ''}" نهائياً. ستُلتقط تلقائياً نسخة إنقاذ ملكية قبل الحذف يمكن استعادتها من الأرشيف. أدخل كلمة مرورك للتأكيد.`}
      itemLabel="القسم المراد حذفه:"
      itemName={dzSection ? DZ_SECTION_LABELS[dzSection] || dzSection : ''}
      confirmLabel="حذف القسم نهائياً"
      onConfirm={async () => {
        if (!dzSection) return
        setDzSectionLoading(true)
        try {
          const res = await fetch('/api/admin/danger-zone', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ section: dzSection, user_id: user.id }),
          })
          const data = await res.json()
          if (res.ok) {
            toast.success(`تم حذف ${data.deleted || 0} سجل من قسم "${data.section}"${data.snapshot_id ? ' — نسخة الإنقاذ جاهزة في الأرشيف الملكي 🛡️' : ''}`)
            setDzSectionOpen(false)
            setDzSection('')
            fetchDzSnapshots()
          } else {
            toast.error(data.error || 'فشل الحذف')
          }
        } catch {
          toast.error('خطأ في الاتصال')
        } finally {
          setDzSectionLoading(false)
        }
      }}
      loading={dzSectionLoading}
    />

    {/* ===== Royal rescue restore confirmation ===== */}
    <PasswordConfirmDialog
      open={dzRestoreOpen}
      onOpenChange={(o) => { if (!o && dzSnapBusy === '') setDzRestoreOpen(false) }}
      title="استعادة نسخة الإنقاذ الملكية"
      message={`سيتم إرجاع ${dzRestoreTarget?.row_total || 0} سجل إلى قاعدة البيانات بأمان تام من نسخة الإنقاذ المحفوظة. أدخل كلمة مرورك للتأكيد.`}
      itemLabel="النسخة المستعادة:"
      itemName={dzRestoreTarget ? (dzRestoreTarget.kind === 'full' ? 'النسخة الشاملة الكاملة' : `قسم ${DZ_SECTION_LABELS[dzRestoreTarget.section] || dzRestoreTarget.section}`) : ''}
      confirmLabel="استعادة الآن"
      onConfirm={restoreDzSnapshot}
      loading={!!dzRestoreTarget && dzSnapBusy === dzRestoreTarget.id}
    />

    {/* ===== Danger Zone confirmation dialog ===== */}
    {/* === Danger Zone — professional custom overlay (matches chat delete) === */}
    {dzOpen && (
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm"
        onClick={() => { if (!dzLoading) closeDzDialog() }}
      >
        <div
          className="bg-white rounded-2xl shadow-2xl max-w-sm w-full mx-4 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top: red gradient with icon + magical dot pattern */}
          <div className="relative bg-gradient-to-br from-red-500 to-red-600 p-6 text-center overflow-hidden">
            <div className="absolute inset-0 opacity-20" style={{
              backgroundImage: 'radial-gradient(circle at 20% 30%, #fff 1.5px, transparent 1.5px), radial-gradient(circle at 80% 70%, #fecaca 1px, transparent 1px)',
              backgroundSize: '24px 24px, 18px 18px'
            }} />
            <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/15 rounded-full blur-2xl" />
            <div className="relative w-16 h-16 mx-auto rounded-full bg-white/20 flex items-center justify-center mb-2 border border-white/30">
              <AlertTriangle className="w-8 h-8 text-white" />
            </div>
            <h3 className="relative text-white text-lg font-bold">حذف جميع البيانات</h3>
          </div>

          {/* Body */}
          <div className="p-6 text-center">
            <p className="text-sm text-gray-600 mb-1">سيتم حذف جميع البيانات نهائياً:</p>
            <p className="font-bold text-navy text-sm mb-3">الدورات، المتدربون، المدربون، المدفوعات، الشهادات، المدونة، المنتدى</p>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
              <p className="text-xs text-red-600 leading-relaxed">
                ⚠️ سيتم حذف جميع البيانات نهائياً. سيتم الاحتفاظ بحساب المؤسس فقط. هذه العملية جسيمة ولا تُستعجل.
              </p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
              <p className="text-xs text-green-700 leading-relaxed">
                🛡️ درع الإنقاذ الملكي: قبل الحذف ستُلتقط نسخة كاملة تلقائياً لكل ما سيُمسى — ويمكن استعادتها بالكامل من «أرشيف الإنقاذ الملكي» في لوحة منطقة الخطر.
              </p>
            </div>

            {/* Password field */}
            <div className="mb-4 text-right">
              <Label className="text-navy font-bold text-sm flex items-center gap-1 mb-1.5">
                <Lock className="w-3.5 h-3.5" />
                كلمة المرور — تأكيد الهوية
              </Label>
              <div className="relative">
                <Input
                  type={showDzPassword ? 'text' : 'password'}
                  value={dzPassword}
                  onChange={(e) => setDzPassword(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && dzPassword && !dzLoading) handleDangerZoneConfirm() }}
                  placeholder="••••••••"
                  dir="ltr"
                  className="h-12 pr-10 text-base"
                  disabled={dzLoading}
                  autoFocus
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowDzPassword(!showDzPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-navy transition-colors"
                  tabIndex={-1}
                >
                  {showDzPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-2">
              <button
                onClick={closeDzDialog}
                disabled={dzLoading}
                className="flex-1 h-11 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 font-bold text-sm transition-colors disabled:opacity-50"
              >
                إلغاء
              </button>
              <button
                onClick={handleDangerZoneConfirm}
                disabled={dzLoading || !dzPassword}
                className="flex-1 h-11 rounded-lg bg-red-500 hover:bg-red-600 text-white font-bold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {dzLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {dzLoading ? 'جاري الحذف...' : 'حذف نهائي'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  )
}

function AdminReports() {
  const [data, setData] = useState<any>({ courses: [], payments: [], students: [], enrollments: [], trainers: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/courses').then(r => r.json()),
      fetch('/api/payments').then(r => r.json()),
      fetch('/api/students?role=student').then(r => r.json()),
      fetch('/api/enrollments').then(r => r.json()),
      fetch('/api/trainers').then(r => r.json()),
    ]).then(([c, p, s, e, t]) => {
      // Routes return {error: ...} on failure — guard against that
      const anyError = [c, p, s, e, t].find((r: any) => r && typeof r === 'object' && !Array.isArray(r) && r.error)
      if (anyError) throw new Error((anyError as any).error)
      setData({
        courses: Array.isArray(c) ? c : [],
        payments: Array.isArray(p) ? p : [],
        students: Array.isArray(s) ? s : [],
        enrollments: Array.isArray(e) ? e : [],
        trainers: Array.isArray(t) ? t : [],
      })
      setError(null)
    }).catch((err) => {
      setError(err?.message || 'فشل تحميل البيانات')
    }).finally(() => {
      setLoading(false)
    })
  }, [])

  // --- REAL computations from fetched data (no hardcoded numbers) ---

  // Total counts (per task spec)
  const totalStudents = data.students.length
  const totalCourses = data.courses.length
  const totalTrainers = data.trainers.length // /api/trainers already strips team members

  // Total revenue: sum of all payment amounts; also break out completed vs pending
  const totalRevenue = data.payments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0)
  const completedRevenue = data.payments
    .filter((p: any) => p.status === 'مكتمل' || p.status === 'completed' || p.status === 'paid')
    .reduce((sum: number, p: any) => sum + (p.amount || 0), 0)
  const pendingRevenue = data.payments
    .filter((p: any) => p.status === 'قيد الانتظار' || p.status === 'pending')
    .reduce((sum: number, p: any) => sum + (p.amount || 0), 0)

  // Most popular courses: group enrollments by course_id, count, sort desc
  const enrollmentCountByCourse = new Map<string, number>()
  data.enrollments.forEach((e: any) => {
    if (e.course_id) {
      enrollmentCountByCourse.set(e.course_id, (enrollmentCountByCourse.get(e.course_id) || 0) + 1)
    }
  })
  const popularCourses = data.courses
    .map((c: any) => ({ ...c, enrollment_count: enrollmentCountByCourse.get(c.id) || 0 }))
    .sort((a: any, b: any) => b.enrollment_count - a.enrollment_count)
    .slice(0, 5)

  // Recent enrollments: sort by enrolled_at/date desc, show last 10
  const recentEnrollments = [...data.enrollments]
    .sort((a: any, b: any) =>
      new Date(b.enrolled_at || b.date || 0).getTime() - new Date(a.enrolled_at || a.date || 0).getTime()
    )
    .slice(0, 10)

  const reportCards = [
    { icon: Users, label: 'إجمالي المتدربين', value: totalStudents, color: 'from-navy to-navy-light', textCol: 'text-gold' },
    { icon: BookOpen, label: 'إجمالي الدورات', value: totalCourses, color: 'from-gold to-gold-light', textCol: 'text-navy' },
    { icon: UserCog, label: 'إجمالي المدربين', value: totalTrainers, color: 'from-blue-500 to-blue-600', textCol: 'text-white' },
    { icon: DollarSign, label: 'إجمالي الإيرادات', value: `${totalRevenue.toLocaleString()} ر.ي`, color: 'from-green-500 to-green-600', textCol: 'text-white' },
    { icon: CheckCircle2, label: 'إيرادات مكتملة', value: `${completedRevenue.toLocaleString()} ر.ي`, color: 'from-emerald-500 to-emerald-600', textCol: 'text-white' },
    { icon: Clock, label: 'إيرادات قيد الانتظار', value: `${pendingRevenue.toLocaleString()} ر.ي`, color: 'from-yellow-500 to-yellow-600', textCol: 'text-white' },
  ]

  if (loading) {
    return (
      <SectionCard title="التقارير" description="إحصائيات حقيقية من قاعدة البيانات">
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 className="w-8 h-8 text-navy animate-spin" />
          <div className="text-sm text-muted-foreground">جاري تحميل البيانات...</div>
        </div>
      </SectionCard>
    )
  }

  if (error) {
    return (
      <SectionCard title="التقارير" description="إحصائيات حقيقية من قاعدة البيانات">
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <XCircle className="w-8 h-8 text-red-500" />
          <div className="text-sm text-red-600">{error}</div>
        </div>
      </SectionCard>
    )
  }

  const isEmpty =
    totalStudents === 0 &&
    totalCourses === 0 &&
    totalTrainers === 0 &&
    data.payments.length === 0 &&
    data.enrollments.length === 0

  return (
    <SectionCard title="التقارير" description="إحصائيات حقيقية من قاعدة البيانات">
      {isEmpty ? (
        <div className="text-center py-12 text-muted-foreground">لا توجد بيانات</div>
      ) : (
        <>
          {/* Summary stat cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {reportCards.map((r, i) => {
              const Icon = r.icon
              return (
                <div key={i} className={`bg-gradient-to-br ${r.color} text-white p-5 rounded-xl`}>
                  <Icon className={`w-6 h-6 ${r.textCol} mb-2`} />
                  <div className="text-xl font-bold">{r.value}</div>
                  <div className="text-white/80 text-xs mt-1">{r.label}</div>
                </div>
              )
            })}
          </div>

          {/* Most popular courses by REAL enrollment count (computed from /api/enrollments) */}
          <div className="mt-6">
            <h4 className="font-bold text-navy text-sm mb-3">الدورات الأكثر تسجيلاً</h4>
            <div className="space-y-2">
              {popularCourses.map((c: any, i: number) => (
                <div key={c.id} className="flex items-center gap-3 p-3 bg-white border border-border rounded-lg">
                  <div className="w-8 h-8 rounded-lg bg-navy flex items-center justify-center text-gold font-bold text-sm flex-shrink-0">{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-navy text-sm truncate">{c.title}</div>
                    <div className="text-xs text-muted-foreground">{c.specialization || '-'}</div>
                  </div>
                  <div className="text-sm font-bold text-navy">{c.enrollment_count} متدرب</div>
                  <Badge className={c.price_type === 'مجانية' || c.price === 0 ? 'bg-green-500/15 text-green-600 border-green-500/30' : 'bg-gold/15 text-gold border-gold/30'}>
                    {c.price_type === 'مجانية' || c.price === 0 ? 'مجانية' : `${c.price?.toLocaleString()} ${c.currency || ''}`}
                  </Badge>
                </div>
              ))}
              {popularCourses.length === 0 && <div className="text-center py-8 text-muted-foreground">لا توجد بيانات</div>}
            </div>
          </div>

          {/* Recent enrollments (sorted by date desc, last 10) */}
          <div className="mt-6">
            <h4 className="font-bold text-navy text-sm mb-3">أحدث التسجيلات</h4>
            <div className="space-y-2">
              {recentEnrollments.map((e: any, i: number) => {
                const course = data.courses.find((c: any) => c.id === e.course_id)
                const student = data.students.find((s: any) => s.id === e.user_id)
                const statusLabel =
                  e.status === 'completed' || e.status === 'مكتمل' ? 'مكتمل'
                  : e.status === 'active' ? 'نشط'
                  : e.status === 'cancelled' || e.status === 'ملغي' ? 'ملغي'
                  : (e.status || '-')
                const statusClass =
                  e.status === 'completed' || e.status === 'مكتمل'
                    ? 'bg-green-500/15 text-green-600 border-green-500/30'
                    : e.status === 'active'
                      ? 'bg-blue-500/15 text-blue-600 border-blue-500/30'
                      : 'bg-muted text-muted-foreground border-border'
                return (
                  <div key={e.id || i} className="flex items-center gap-3 p-3 bg-white border border-border rounded-lg">
                    <div className="w-8 h-8 rounded-lg bg-gold/15 flex items-center justify-center text-navy flex-shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-navy text-sm truncate">{student?.name || student?.email || 'متدرب'}</div>
                      <div className="text-xs text-muted-foreground truncate">{course?.title || 'دورة غير محددة'}</div>
                    </div>
                    <Badge className={statusClass}>{statusLabel}</Badge>
                    <div className="text-xs text-muted-foreground flex-shrink-0" dir="ltr">
                      {e.enrolled_at ? new Date(e.enrolled_at).toLocaleDateString('ar-EG') : '-'}
                    </div>
                  </div>
                )
              })}
              {recentEnrollments.length === 0 && <div className="text-center py-8 text-muted-foreground">لا توجد بيانات</div>}
            </div>
          </div>
        </>
      )}
    </SectionCard>
  )
}

function AdminLogs() {
  const [logs, setLogs] = useState<any[]>([])

  useEffect(() => {
    // Generate REAL logs from actual data (payments + enrollments + courses)
    Promise.all([
      fetch('/api/payments').then(r => r.json()),
      fetch('/api/enrollments').then(r => r.json()),
      fetch('/api/courses').then(r => r.json()),
    ]).then(([p, e, c]) => {
      const payments = Array.isArray(p) ? p : []
      const enrollments = Array.isArray(e) ? e : []
      const courses = Array.isArray(c) ? c : []

      const realLogs: any[] = []

      // Payment logs
      payments.forEach(pay => {
        const course = courses.find(co => co.id === pay.course_id)
        if (pay.status === 'مكتمل') {
          realLogs.push({ action: `قبول دفع ${pay.amount?.toLocaleString()} ${pay.currency || 'ر.ي'} — ${course?.title || 'دورة'}`, time: pay.date, user: pay.user_id || 'متدرب', type: 'payment' })
        } else if (pay.status === 'ملغي') {
          realLogs.push({ action: `رفض دفع ${pay.amount?.toLocaleString()} ${pay.currency || 'ر.ي'} — ${course?.title || 'دورة'}`, time: pay.date, user: pay.user_id || 'متدرب', type: 'cancel' })
        } else if (pay.status === 'قيد الانتظار') {
          realLogs.push({ action: `طلب دفع جديد ${pay.amount?.toLocaleString()} ${pay.currency || 'ر.ي'} — ${course?.title || 'دورة'}`, time: pay.date, user: pay.user_id || 'متدرب', type: 'pending' })
        }
      })

      // Enrollment logs
      enrollments.forEach(enr => {
        const course = courses.find(co => co.id === enr.course_id)
        if (enr.status === 'completed' || enr.status === 'مكتمل') {
          realLogs.push({ action: `إكمال دورة: ${course?.title || 'دورة'}`, time: enr.completed_at || enr.enrolled_at, user: enr.user_id || 'متدرب', type: 'complete' })
        } else if (enr.status === 'active') {
          realLogs.push({ action: `تسجيل في دورة: ${course?.title || 'دورة'}`, time: enr.enrolled_at, user: enr.user_id || 'متدرب', type: 'enroll' })
        }
      })

      // Sort by date descending
      realLogs.sort((a, b) => new Date(b.time || 0).getTime() - new Date(a.time || 0).getTime())

      setLogs(realLogs.slice(0, 50))
    })
  }, [])

  const iconMap: any = {
    payment: { icon: CheckCircle2, color: 'bg-green-500', text: 'text-green-600' },
    cancel: { icon: XCircle, color: 'bg-red-500', text: 'text-red-600' },
    pending: { icon: Clock, color: 'bg-yellow-500', text: 'text-yellow-600' },
    complete: { icon: Award, color: 'bg-navy', text: 'text-navy' },
    enroll: { icon: Users, color: 'bg-blue-500', text: 'text-blue-600' },
  }

  return (
    <SectionCard title="سجل العمليات" description={`${logs.length} عملية حقيقية`}>
      <div className="space-y-2 max-h-[600px] overflow-y-auto fia-scroll">
        {logs.map((l, i) => {
          const cfg = iconMap[l.type] || iconMap.enroll
          const Icon = cfg.icon
          return (
            <div key={i} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-8 h-8 rounded-lg ${cfg.color} flex items-center justify-center flex-shrink-0`}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-navy truncate">{l.action}</div>
                  <div className="text-xs text-muted-foreground" dir="ltr">{l.user}</div>
                </div>
              </div>
              <div className="text-xs text-muted-foreground flex-shrink-0" dir="ltr">{l.time ? new Date(l.time).toLocaleString('ar-EG') : '-'}</div>
            </div>
          )
        })}
        {logs.length === 0 && <div className="text-center py-8 text-muted-foreground">لا توجد عمليات مسجّلة</div>}
      </div>
    </SectionCard>
  )
}

// Generic simple dialog
function SimpleDialog({ open, onOpenChange, title, onSaved, initial, fields, apiPath }: any) {
  const [form, setForm] = useState<any>(initial || {})
  const [saving, setSaving] = useState(false)

  useEffect(() => { setForm(initial || {}) }, [initial])

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch(apiPath, {
        method: initial ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(initial ? { id: initial.id, ...form } : form),
      })
      if (res.ok) { toast.success('تم الحفظ'); onSaved(); onOpenChange(false) }
      else { const d = await res.json(); toast.error(d.error || 'فشل') }
    } catch { toast.error('خطأ') } finally { setSaving(false) }
  }

  const fieldLabels: Record<string, string> = {
    title: 'العنوان', short_description: 'وصف مختصر', description: 'الوصف', level: 'المستوى',
    price: 'السعر', duration_hours: 'عدد الساعات', pass_score: 'درجة النجاح', name: 'الاسم',
    icon: 'الأيقونة (إيموجي)', type: 'النوع', wallet_id: 'معرف المحفظة', instructions: 'التعليمات',
    student_name: 'اسم المتدرب', course_title: 'عنوان الدورة', status: 'الحالة', issued_by: 'جهة الإصدار',
    external_accreditation_body: 'جهة الاعتماد الخارجي', logo: 'الشعار (إيموجي)', website: 'الموقع',
    since: 'منذ', issuing_body: 'جهة الإصدار', number: 'الرقم', issued_at: 'تاريخ الإصدار',
    expires_at: 'تاريخ الانتهاء', verification_url: 'رابط التحقق',
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="space-y-3 py-4">
          {fields.map((f: string) => (
            <div key={f}>
              <Label>{fieldLabels[f] || f}</Label>
              {['description', 'instructions'].includes(f) ? (
                <Textarea value={form[f] || ''} onChange={(e) => setForm({ ...form, [f]: e.target.value })} rows={2} className="mt-1" />
              ) : ['price', 'duration_hours', 'pass_score'].includes(f) ? (
                <Input type="number" value={form[f] || ''} onChange={(e) => setForm({ ...form, [f]: e.target.value === '' ? 0 : parseInt(e.target.value) || 0 })} dir="ltr" className="mt-1" placeholder="0" />
              ) : (
                <Input value={form[f] || ''} onChange={(e) => setForm({ ...form, [f]: e.target.value })} dir={f === 'number' || f === 'website' || f === 'verification_url' || f === 'wallet_id' ? 'ltr' : 'rtl'} className="mt-1" />
              )}
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button onClick={save} disabled={saving} className="bg-navy hover:bg-navy-light">{saving ? 'جاري...' : 'حفظ'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
