'use client'

import { useEffect, useState } from 'react'
import {
  LayoutDashboard, BookOpen, FileText, Users, CreditCard,
  Award, GraduationCap, Building2, Shield, UserCog, Settings,
  BarChart3, ScrollText, Plus, Edit, Trash2, Eye, EyeOff,
  DollarSign, TrendingUp, Activity, Star, ArrowRight,
  Lock, Mail, CheckCircle2, User, XCircle, ExternalLink, Download,
  Loader2, FileUp, Clock, RefreshCw, AlertTriangle,
  Gift, Newspaper, MessageSquare, HelpCircle, Ban, X,
} from 'lucide-react'
import { DashboardShell, StatCard, SectionCard, NavItem } from './shell'
import { useAuth } from '@/lib/auth-store'
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
import {
  AdminCoupons, AdminAffiliates, AdminExamQuestions, AdminReviews,
  AdminForum, AdminBlog, AdminContact, AdminFaqs,
} from './admin-extended'
import { AdminForumBans } from './shared-community'
import { CertificateViewer } from '@/components/fia/certificate-viewer'
import { CourseDialog as ProCourseDialog } from '@/components/fia/course-dialog'

const NAV: NavItem[] = [
  { id: 'overview', label: 'الإحصائيات', icon: LayoutDashboard },
  { id: 'courses', label: 'الدورات', icon: BookOpen },
  { id: 'content', label: 'محتوى الدورات', icon: FileText },
  { id: 'exams', label: 'الاختبارات', icon: FileText },
  { id: 'exam-questions', label: 'بنك الأسئلة', icon: HelpCircle },
  { id: 'students', label: 'المتدربون', icon: Users },
  { id: 'payments', label: 'المدفوعات', icon: CreditCard },
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
  const [contentCourseId, setContentCourseId] = useState<string | null>(null)
  const user = useAuth((s) => s.user)
  const updateUser = useAuth((s) => s.updateUser)
  const logout = useAuth((s) => s.logout)

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
      {active === 'exam-questions' && <AdminExamQuestions />}
      {active === 'students' && <AdminStudents />}
      {active === 'payments' && <AdminPayments />}
      {active === 'payment-methods' && <AdminPaymentMethods />}
      {active === 'coupons' && <AdminCoupons />}
      {active === 'affiliates' && <AdminAffiliates />}
      {/* Certificate management — re-enabled */}
      {active === 'certificates' && <AdminCertificates />}
      {active === 'trainers' && <AdminTrainers />}
      {active === 'reviews' && <AdminReviews />}
      {active === 'partners' && <AdminPartners />}
      {active === 'licenses' && <AdminLicenses />}
      {active === 'founder' && <AdminFounder user={user} />}
      {active === 'blog' && <AdminBlog />}
      {active === 'forum' && <AdminForum />}
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

  useEffect(() => {
    fetch('/api/courses').then((r) => r.json()).then((d) => setCourses(Array.isArray(d) ? d : [])).catch(() => {})
  }, [])

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
                  <div className="text-xs text-muted-foreground mb-3">
                    {c.enrolled || 0} متدرب مسجّل
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
  const [stats, setStats] = useState({ courses: 0, trainers: 0, students: 0, payments: 0, totalRevenue: 0, pendingPayments: 0, completedEnrollments: 0, activeEnrollments: 0 })

  useEffect(() => {
    Promise.all([
      fetch('/api/courses').then((r) => r.json()),
      fetch('/api/trainers').then((r) => r.json()),
      fetch('/api/students?role=student').then((r) => r.json()),
      fetch('/api/payments').then((r) => r.json()),
      fetch('/api/enrollments').then((r) => r.json()),
    ]).then(([c, t, s, p, e]) => {
      const courses = Array.isArray(c) ? c : []
      const trainers = Array.isArray(t) ? t : []
      const students = Array.isArray(s) ? s : []
      const payments = Array.isArray(p) ? p : []
      const enrollments = Array.isArray(e) ? e : []

      // Calculate REAL revenue from completed payments only
      const completedPayments = payments.filter(p => p.status === 'مكتمل')
      const totalRevenue = completedPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
      const pendingPayments = payments.filter(p => p.status === 'قيد الانتظار').length
      const completedEnrollments = enrollments.filter(e => e.status === 'completed' || e.status === 'مكتمل').length
      const activeEnrollments = enrollments.filter(e => e.status === 'active').length

      setStats({
        courses: courses.length,
        trainers: trainers.length,
        students: students.length,
        payments: payments.length,
        totalRevenue,
        pendingPayments,
        completedEnrollments,
        activeEnrollments,
      })
    }).catch(() => {})
  }, [])

  return (
    <div className="space-y-6">
      <div className="bg-fia-gradient rounded-2xl p-6 lg:p-8 text-white">
        <h2 className="text-2xl font-bold mb-1">لوحة تحكم الإدارة 👑</h2>
        <p className="text-white/80">نظرة شاملة على المنصة</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={BookOpen} label="إجمالي الدورات" value={stats.courses} color="navy" />
        <StatCard icon={GraduationCap} label="المدربون" value={stats.trainers} color="gold" />
        <StatCard icon={Users} label="المتدربون" value={stats.students} color="blue" />
        <StatCard icon={CreditCard} label="المعاملات" value={stats.payments} color="green" />
      </div>

      <SectionCard title="نظرة عامة مالية" description="إحصائيات حقيقية من قاعدة البيانات">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-navy to-navy-light text-white p-5 rounded-xl">
            <DollarSign className="w-6 h-6 text-gold mb-2" />
            <div className="text-2xl font-bold">{stats.totalRevenue.toLocaleString()}</div>
            <div className="text-white/70 text-sm">ر.ي إجمالي الإيرادات (مكتمل)</div>
          </div>
          <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white p-5 rounded-xl">
            <Clock className="w-6 h-6 mb-2" />
            <div className="text-2xl font-bold">{stats.pendingPayments}</div>
            <div className="text-white/80 text-sm">مدفوعات قيد الانتظار</div>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-5 rounded-xl">
            <CheckCircle2 className="w-6 h-6 mb-2" />
            <div className="text-2xl font-bold">{stats.completedEnrollments}</div>
            <div className="text-white/80 text-sm">دورات مكتملة</div>
          </div>
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-5 rounded-xl">
            <Activity className="w-6 h-6 mb-2" />
            <div className="text-2xl font-bold">{stats.activeEnrollments}</div>
            <div className="text-white/80 text-sm">تسجيلات نشطة</div>
          </div>
        </div>
      </SectionCard>
    </div>
  )
}

// ============== COURSES ==============
function AdminCourses() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<any | null>(null)
  const [open, setOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = () => {
    setLoading(true)
    fetch('/api/courses').then((r) => r.json()).then((d) => setItems(Array.isArray(d) ? d : [])).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await fetch('/api/courses', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: deleteTarget.id }) })
      toast.success('تم الحذف')
      setDeleteTarget(null)
      load()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <SectionCard
      title="إدارة الدورات"
      description={`${items.length} دورة`}
      action={<Button className="bg-navy hover:bg-navy-light" onClick={() => { setEditing(null); setOpen(true) }}><Plus className="w-4 h-4 ml-1" /> جديد</Button>}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-right text-muted-foreground">
              <th className="py-3 px-2">العنوان</th>
              <th className="py-3 px-2">المستوى</th>
              <th className="py-3 px-2">السعر</th>
              <th className="py-3 px-2">الحالة</th>
              <th className="py-3 px-2">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id} className="border-b border-border">
                <td className="py-3 px-2 font-medium text-navy">{c.title}</td>
                <td className="py-3 px-2">{c.level}</td>
                <td className="py-3 px-2">{c.price_type === 'مجانية' ? 'مجانية' : `${c.price.toLocaleString()} ${c.currency}`}</td>
                <td className="py-3 px-2"><Badge className="bg-green-500/15 text-green-600 border-green-500/30">{c.status}</Badge></td>
                <td className="py-3 px-2">
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(c); setOpen(true) }}><Edit className="w-4 h-4 text-navy" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => setDeleteTarget(c)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                  </div>
                </td>
              </tr>
            ))}
            {!items.length && !loading && <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">لا توجد دورات</td></tr>}
          </tbody>
        </table>
      </div>
      {open && <ProCourseDialog open={open} onOpenChange={setOpen} course={editing} trainerId={undefined} onSaved={load} />}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o && !deleting) setDeleteTarget(null) }}
        title="تأكيد حذف الدورة"
        message="هل أنت متأكد من الحذف؟ لا يمكن التراجع عن هذا الإجراء."
        itemLabel="سيتم حذف الدورة التالية:"
        itemName={deleteTarget?.title}
        confirmLabel="حذف الدورة"
        cancelLabel="إلغاء"
        variant="danger"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </SectionCard>
  )
}

function AdminExams() {
  return (
    <SectionCard title="الاختبارات" description="إدارة الاختبارات">
      <div className="text-center py-12">
        <FileText className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
        <p className="text-muted-foreground mb-4">لا توجد اختبارات</p>
        <Button className="bg-navy hover:bg-navy-light"><Plus className="w-4 h-4 ml-1" /> اختبار جديد</Button>
      </div>
    </SectionCard>
  )
}

function AdminStudents() {
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
      <div className="flex gap-2 mb-4">
        <Input placeholder="بحث بالاسم أو البريد أو الهاتف..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1" />
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((s) => {
          const sEnrs = getStudentEnrollments(s.id)
          return (
            <Card key={s.id} className="overflow-hidden card-hover">
              <div className="p-4 bg-fia-gradient text-white">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-gold/30 flex-shrink-0 bg-navy-light">
                    {s.avatar ? (
                      <img src={s.avatar} alt={s.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gold font-bold text-xl">{s.name?.charAt(0)}</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm truncate">{s.name}</div>
                    <div className="text-xs text-white/70 truncate" dir="ltr">{s.email}</div>
                  </div>
                </div>
              </div>
              <div className="p-4 space-y-2">
                {s.phone && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>📞</span><span dir="ltr">{s.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>📅</span><span>تسجيل: {s.created_at ? new Date(s.created_at).toLocaleDateString('ar-EG') : '-'}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span>📚</span>
                  <span className="font-semibold text-navy">{sEnrs.length} دورة مسجّلة</span>
                </div>
                {sEnrs.slice(0, 2).map((e) => {
                  const c = courses.find(co => co.id === e.course_id)
                  return c ? (
                    <div key={e.id} className="text-xs text-muted-foreground bg-muted/30 rounded p-1.5 flex items-center justify-between">
                      <span className="truncate">{c.title}</span>
                      <Badge className={
                        e.status === 'completed' || e.status === 'مكتمل' ? 'bg-green-500/15 text-green-600 border-green-500/30 text-[10px]'
                        : e.payment_status === 'pending' ? 'bg-yellow-500/15 text-yellow-600 border-yellow-500/30 text-[10px]'
                        : 'bg-blue-500/15 text-blue-600 border-blue-500/30 text-[10px]'
                      }>
                        {e.status === 'completed' || e.status === 'مكتمل' ? 'مكتمل'  : e.payment_status === 'pending' ? 'بانتظار الدفع' : 'قيد التعلّم'}
                      </Badge>
                    </div>
                  ) : null
                })}
                {sEnrs.length > 2 && <div className="text-[10px] text-muted-foreground">+{sEnrs.length - 2} دورة أخرى</div>}
              </div>
              <div className="flex gap-1 p-3 pt-0">
                <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => setSelectedStudent(s)}>عرض التفاصيل</Button>
                <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(s)}><Trash2 className="w-3.5 h-3.5 text-red-500" /></Button>
              </div>
            </Card>
          )
        })}
      </div>

      {filtered.length === 0 && <div className="text-center py-8 text-muted-foreground">{search ? 'لا توجد نتائج' : 'لا يوجد متدربون'}</div>}

      {/* Student detail modal */}
      {selectedStudent && (
        <Dialog open={true} onOpenChange={(o) => { if (!o) setSelectedStudent(null) }}>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>تفاصيل المتدرب</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-4 p-4 bg-fia-gradient rounded-lg text-white">
                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-gold/30 bg-navy-light">
                  {selectedStudent.avatar ? <img src={selectedStudent.avatar} alt={selectedStudent.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gold font-bold text-2xl">{selectedStudent.name?.charAt(0)}</div>}
                </div>
                <div>
                  <div className="font-bold text-lg">{selectedStudent.name}</div>
                  <div className="text-xs text-white/70" dir="ltr">{selectedStudent.email}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/30 p-3 rounded-lg"><div className="text-xs text-muted-foreground">الهاتف</div><div className="text-sm font-medium" dir="ltr">{selectedStudent.phone || '-'}</div></div>
                <div className="bg-muted/30 p-3 rounded-lg"><div className="text-xs text-muted-foreground">تاريخ التسجيل</div><div className="text-sm font-medium">{selectedStudent.created_at ? new Date(selectedStudent.created_at).toLocaleDateString('ar-EG') : '-'}</div></div>
              </div>
              <div>
                <h4 className="font-bold text-navy text-sm mb-2">الدورات المسجّلة ({getStudentEnrollments(selectedStudent.id).length})</h4>
                <div className="space-y-2">
                  {getStudentEnrollments(selectedStudent.id).map((e) => {
                    const c = courses.find(co => co.id === e.course_id)
                    if (!c) return null
                    const isFree = c.price_type === 'مجانية' || c.price === 0
                    const isCompleted = e.status === 'completed' || e.status === 'مكتمل'
                    return (
                      <div key={e.id} className="flex items-center justify-between p-3 bg-white border border-border rounded-lg">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-navy text-sm truncate">{c.title}</div>
                          <div className="text-xs text-muted-foreground">{isFree ? 'مجانية' : `${c.price?.toLocaleString()} ${c.currency || 'ر.ي'}`}</div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {/* DISABLED: certificate issuance button removed — will be re-enabled when design+prompt provided */}
                          {/* {isCompleted && (
                            <Button
                              size="sm"
                              className="bg-gold hover:bg-gold-light text-navy text-xs"
                              onClick={async () => {
                                // Auto-issue certificate directly
                                const certNum = `FIA-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 99999)).padStart(5, '0')}`
                                await fetch('/api/certificates', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    student_name: selectedStudent.name,
                                    course_title: c.title,
                                    status: 'صالحة',
                                    issued_by: 'أكاديمية المستقبل الدولية',
                                  }),
                                })
                                toast.success(`تم إصدار الشهادة: ${certNum}`)
                              }}
                            >
                              <Award className="w-3.5 h-3.5 ml-1" /> إصدار شهادة
                            </Button>
                          )} */}
                          <Badge className={
                            isCompleted ? 'bg-green-500/15 text-green-600 border-green-500/30'
                            : e.payment_status === 'pending' ? 'bg-yellow-500/15 text-yellow-600 border-yellow-500/30'
                            : 'bg-blue-500/15 text-blue-600 border-blue-500/30'
                          }>
                            {isCompleted ? 'مكتمل' : e.payment_status === 'pending' ? 'بانتظار الدفع' : 'قيد التعلّم'}
                          </Badge>
                        </div>
                      </div>
                    )
                  })}
                  {getStudentEnrollments(selectedStudent.id).length === 0 && <p className="text-sm text-muted-foreground text-center py-4">لم يسجّل في أي دورة</p>}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedStudent(null)}>إغلاق</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o && !deleting) setDeleteTarget(null) }}
        title="تأكيد حذف المتدرب"
        message="سيتم حذف المتدرب نهائياً من النظام. هل أنت متأكد؟"
        itemLabel="سيتم حذف المتدرب التالي:"
        itemName={deleteTarget?.name}
        confirmLabel="حذف نهائي"
        cancelLabel="إلغاء"
        variant="danger"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </SectionCard>
  )
}

function AdminPayments() {
  const [items, setItems] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedPayment, setSelectedPayment] = useState<any | null>(null)

  const load = () => {
    fetch('/api/payments').then((r) => r.json()).then((d) => setItems(Array.isArray(d) ? d : []))
    fetch('/api/courses').then((r) => r.json()).then((d) => setCourses(Array.isArray(d) ? d : []))
  }
  useEffect(() => { load() }, [])

  const updateStatus = async (id: string, status: string) => {
    await fetch('/api/payments', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) })
    // If approving payment, also update any duplicate enrollment rows
    // for the same user+course to the same status — this fixes the
    // duplicate-row issue where the admin approved one row but the
    // student's enrollment was reading from the other (un-updated) row.
    if (status === 'مكتمل') {
      try {
        // Find the payment we just updated to get user_id + course_id
        const updated = items.find(p => p.id === id)
        if (updated?.user_id && updated?.course_id) {
          // Find ALL other payment rows for the same user+course
          const duplicates = items.filter(p => p.user_id === updated.user_id && p.course_id === updated.course_id && p.id !== id)
          for (const dup of duplicates) {
            await fetch('/api/payments', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: dup.id, status }),
            })
          }
        }
      } catch {}
    }
    toast.success(status === 'مكتمل' ? 'تم قبول الدفع' : status === 'ملغي' ? 'تم رفض الدفع' : 'تم التحديث')
    load()
    setSelectedPayment(null)
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

  return (
    <SectionCard title="المدفوعات" description={`${filtered.length} من ${items.length} معاملة`}>
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <Input placeholder="بحث برقم المعاملة أو الطريقة..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1" />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 border border-input rounded-md bg-background text-sm">
          <option value="all">كل الحالات</option>
          <option value="قيد الانتظار">قيد الانتظار</option>
          <option value="مكتمل">مكتمل</option>
          <option value="ملغي">ملغي</option>
        </select>
      </div>

      <div className="space-y-2">
        {filtered.map((p) => {
          const course = getCourse(p.course_id)
          const proofUrl = extractProofUrl(p.reference)
          const isPending = p.status === 'قيد الانتظار'
          return (
            <div key={p.id} className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 bg-white border border-border rounded-lg">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-bold text-navy text-sm">{p.amount?.toLocaleString()} {p.currency || 'ر.ي'}</span>
                  <Badge className={
                    p.status === 'مكتمل' ? 'bg-green-500/15 text-green-600 border-green-500/30'
                    : p.status === 'ملغي' ? 'bg-red-500/15 text-red-600 border-red-500/30'
                    : 'bg-yellow-500/15 text-yellow-600 border-yellow-500/30'
                  }>{p.status}</Badge>
                  {proofUrl && <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/30">📎 إثبات دفع</Badge>}
                </div>
                <div className="text-xs text-muted-foreground">
                  {course ? <span className="font-medium text-navy">{course.title}</span> : 'دورة غير محددة'}
                  {' • '}
                  <span>{p.method || '-'}</span>
                  {' • '}
                  <span dir="ltr">{p.reference?.replace(/\s*\| PROOF:.*$/i, '') || '-'}</span>
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5" dir="ltr">{p.date ? new Date(p.date).toLocaleDateString('ar-EG') : '-'}</div>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <Button size="sm" variant="ghost" onClick={() => setSelectedPayment(p)} title="عرض التفاصيل">
                  <Eye className="w-4 h-4 text-navy" />
                </Button>
                {isPending && (
                  <>
                    <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white text-xs" onClick={() => updateStatus(p.id, 'مكتمل')}>
                      <CheckCircle2 className="w-3.5 h-3.5 ml-1" /> قبول
                    </Button>
                    <Button size="sm" variant="outline" className="border-red-500/30 text-red-500 hover:bg-red-500/10 text-xs" onClick={() => updateStatus(p.id, 'ملغي')}>
                      <XCircle className="w-3.5 h-3.5 ml-1" /> رفض
                    </Button>
                  </>
                )}
              </div>
            </div>
          )
        })}
        {!filtered.length && <div className="text-center py-8 text-muted-foreground">{search ? 'لا توجد نتائج' : 'لا توجد مدفوعات'}</div>}
      </div>

      {/* Payment detail modal with proof image */}
      {selectedPayment && (
        <Dialog open={true} onOpenChange={(o) => { if (!o) setSelectedPayment(null) }}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle>تفاصيل المعاملة</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="bg-gold/10 border border-gold/30 p-4 rounded-lg flex items-center justify-between">
                <span className="text-sm font-semibold text-navy">المبلغ:</span>
                <span className="text-xl font-extrabold text-gold">{selectedPayment.amount?.toLocaleString()} {selectedPayment.currency || 'ر.ي'}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/30 p-3 rounded-lg"><div className="text-xs text-muted-foreground">طريقة الدفع</div><div className="text-sm font-medium">{selectedPayment.method || '-'}</div></div>
                <div className="bg-muted/30 p-3 rounded-lg"><div className="text-xs text-muted-foreground">التاريخ</div><div className="text-sm font-medium" dir="ltr">{selectedPayment.date ? new Date(selectedPayment.date).toLocaleDateString('ar-EG') : '-'}</div></div>
                <div className="bg-muted/30 p-3 rounded-lg"><div className="text-xs text-muted-foreground">رقم المعاملة</div><div className="text-sm font-medium font-mono" dir="ltr">{selectedPayment.reference?.replace(/\s*\| PROOF:.*$/i, '') || '-'}</div></div>
                <div className="bg-muted/30 p-3 rounded-lg"><div className="text-xs text-muted-foreground">الحالة</div>
                  <Badge className={
                    selectedPayment.status === 'مكتمل' ? 'bg-green-500/15 text-green-600 border-green-500/30'
                    : selectedPayment.status === 'ملغي' ? 'bg-red-500/15 text-red-600 border-red-500/30'
                    : 'bg-yellow-500/15 text-yellow-600 border-yellow-500/30'
                  }>{selectedPayment.status}</Badge>
                </div>
              </div>
              {(() => {
                const course = getCourse(selectedPayment.course_id)
                return course ? (
                  <div className="bg-muted/30 p-3 rounded-lg">
                    <div className="text-xs text-muted-foreground">الدورة</div>
                    <div className="text-sm font-medium text-navy">{course.title}</div>
                    <div className="text-xs text-muted-foreground">{course.price_type === 'مجانية' || course.price === 0 ? 'مجانية' : `${course.price?.toLocaleString()} ${course.currency || 'ر.ي'}`}</div>
                  </div>
                ) : null
              })()}

              {/* Proof image */}
              {(() => {
                const proofUrl = extractProofUrl(selectedPayment.reference)
                return proofUrl ? (
                  <div>
                    <div className="text-sm font-bold text-navy mb-2 flex items-center gap-2">📎 إثبات الدفع</div>
                    <div className="rounded-lg overflow-hidden border-2 border-gold/30">
                      <img src={proofUrl} alt="إثبات الدفع" className="max-w-full max-h-64 object-contain rounded-lg mx-auto" />
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground text-sm">لا يوجد إثبات دفع مرفق</div>
                )
              })()}

              {selectedPayment.status === 'قيد الانتظار' && (
                <div className="flex gap-2 pt-2">
                  <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={() => updateStatus(selectedPayment.id, 'مكتمل')}>
                    <CheckCircle2 className="w-4 h-4 ml-1" /> قبول الدفع
                  </Button>
                  <Button variant="outline" className="flex-1 border-red-500/30 text-red-500 hover:bg-red-500/10" onClick={() => updateStatus(selectedPayment.id, 'ملغي')}>
                    <XCircle className="w-4 h-4 ml-1" /> رفض الدفع
                  </Button>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedPayment(null)}>إغلاق</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </SectionCard>
  )
}

function AdminPaymentMethods() {
  const [items, setItems] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
  const [deleting, setDeleting] = useState(false)
  const load = () => fetch('/api/payment-methods').then((r) => r.json()).then((d) => setItems(Array.isArray(d) ? d : []))
  useEffect(() => { load() }, [])
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
  return (
    <SectionCard
      title="طرق الدفع"
      description={`${items.length} طريقة`}
      action={<Button className="bg-navy hover:bg-navy-light" onClick={() => { setEditing(null); setOpen(true) }}><Plus className="w-4 h-4 ml-1" /> جديدة</Button>}
    >
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((p) => (
          <Card key={p.id} className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="text-3xl">{p.icon}</div>
              <Switch checked={!!p.enabled} onCheckedChange={(v) => toggle(p.id, v)} />
            </div>
            <div className="font-bold text-navy">{p.name}</div>
            <div className="text-xs text-muted-foreground mb-2">{p.description || ''}</div>
            {p.wallet_id && <div className="text-xs font-mono text-gold" dir="ltr">{p.wallet_id}</div>}
            <div className="flex gap-2 mt-3">
              <Button size="sm" variant="outline" className="flex-1" onClick={() => { setEditing(p); setOpen(true) }}><Edit className="w-3.5 h-3.5 ml-1" /> تعديل</Button>
              <Button size="sm" variant="outline" className="border-red-500/30 text-red-500 hover:bg-red-500/10" onClick={() => setDeleteTarget(p)}><Trash2 className="w-3.5 h-3.5" /></Button>
            </div>
          </Card>
        ))}
      </div>
      {open && <SimpleDialog open={open} onOpenChange={setOpen} title={editing ? 'تعديل' : 'إضافة'} onSaved={load} initial={editing} fields={['name', 'icon', 'type', 'wallet_id', 'description', 'instructions']} apiPath="/api/payment-methods" />}

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

function AdminCertificates() {
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
      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-3 mb-4">
        <button onClick={() => setTab('issued')} className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${tab === 'issued' ? 'bg-navy text-gold' : 'text-navy hover:bg-muted'}`}>📄 الشهادات الصادرة</button>
        <button onClick={() => setTab('requests')} className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${tab === 'requests' ? 'bg-navy text-gold' : 'text-navy hover:bg-muted'}`}>📋 طلبات الشهادات {requests.filter(r => r.status === 'pending' || r.status === 'trainer_approved').length > 0 && <span className="bg-red-500 text-white text-[10px] rounded-full px-1.5 py-0.5 mr-1">{requests.filter(r => r.status === 'pending' || r.status === 'trainer_approved').length}</span>}</button>
      </div>

      {tab === 'issued' ? (
        <>
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <Input placeholder="بحث برقم الشهادة أو اسم المتدرب..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1" />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 border border-input rounded-md bg-background text-sm">
              <option value="all">كل الحالات</option>
              <option value="صالحة">صالحة</option>
              <option value="ملغاة">ملغاة</option>
              <option value="مستبدلة">مستبدلة (تم إعادة إصدارها)</option>
            </select>
          </div>
          <div className="space-y-2">
            {filtered.map((c) => (
              <div key={c.id} className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 bg-white border border-border rounded-lg">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-mono text-gold text-xs" dir="ltr">{c.certificate_number}</span>
                    <Badge className={c.status === 'صالحة' ? 'bg-green-500/15 text-green-600 border-green-500/30' : c.status === 'مستبدلة' ? 'bg-blue-500/15 text-blue-600 border-blue-500/30' : 'bg-red-500/15 text-red-600 border-red-500/30'}>{c.status}</Badge>
                  </div>
                  <div className="font-medium text-navy text-sm">{c.student_name}</div>
                  <div className="text-xs text-muted-foreground truncate">{c.course_title || '-'}</div>
                </div>
                <div className="flex gap-1 flex-shrink-0 flex-wrap">
                  <Button size="sm" variant="ghost" onClick={() => setPreviewCert(c)} title="معاينة الشهادة"><Eye className="w-4 h-4 text-navy" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => setReissueTarget(c)} disabled={!!reissuing} title="إعادة إصدار (برقم جديد)" className="text-blue-600">
                    {reissuing === c.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setEditing(c); setOpen(true) }} title="تعديل"><Edit className="w-4 h-4 text-navy" /></Button>
                  {c.status === 'صالحة' ? <Button size="sm" variant="ghost" onClick={() => setRevokeTarget(c)} title="إلغاء"><XCircle className="w-4 h-4 text-red-500" /></Button> : <Button size="sm" variant="ghost" onClick={() => setCertRestoreTarget(c)} title="استعادة"><CheckCircle2 className="w-4 h-4 text-green-600" /></Button>}
                  <Button size="sm" variant="ghost" onClick={() => setCertDeleteTarget(c)} title="حذف"><Trash2 className="w-4 h-4 text-red-500" /></Button>
                </div>
              </div>
            ))}
            {!filtered.length && <div className="text-center py-8 text-muted-foreground">{search ? 'لا توجد نتائج' : 'لا توجد شهادات صادرة'}</div>}
          </div>
        </>
      ) : (
        /* Certificate requests tab */
        <div className="space-y-2">
          {requests.map((r) => {
            const badge = requestStatusBadge(r.status)
            const completed = isCourseCompleted(r.user_id, r.course_id)
            return (
              <div key={r.id} className="p-3 bg-white border border-border rounded-lg">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <Badge className={badge.color}>{badge.label}</Badge>
                  {completed && <Badge className="bg-green-500/15 text-green-600 border-green-500/30">✅ الدورة مكتملة</Badge>}
                  {!completed && r.status === 'pending' && <Badge className="bg-red-500/15 text-red-600 border-red-500/30">⚠️ الدورة غير مكتملة</Badge>}
                </div>
                <div className="font-medium text-navy text-sm">{r.student_name}</div>
                <div className="text-xs text-muted-foreground">{r.course_title || '-'}</div>
                {r.amount > 0 && <div className="text-xs text-muted-foreground mt-1">رسوم الشهادة: {r.amount.toLocaleString()} {r.currency}</div>}
                {r.created_at && <div className="text-[10px] text-muted-foreground mt-1" dir="ltr">طلب في: {new Date(r.created_at).toLocaleDateString('ar-EG')}</div>}
                {r.trainer_note && <div className="text-xs text-blue-600 mt-1">📝 ملاحظة المدرب: {r.trainer_note}</div>}
                {r.admin_note && <div className="text-xs text-purple-600 mt-1">📝 ملاحظة المدير: {r.admin_note}</div>}
                {r.cert_number && <div className="text-xs font-mono text-green-600 mt-1" dir="ltr">رقم الشهادة: {r.cert_number}</div>}
                {r.verify_code && <div className="text-xs font-mono text-green-600" dir="ltr">رمز التحقق: {r.verify_code}</div>}

                {/* Action buttons based on status */}
                <div className="flex gap-2 mt-3 pt-2 border-t border-border">
                  {r.status === 'pending' && (
                    <>
                      <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white text-xs" disabled={!completed} onClick={() => handleRequestAction(r.id, 'trainer_approve', 'تم التأكد من إكمال الدورة')}>
                        <CheckCircle2 className="w-3.5 h-3.5 ml-1" /> موافقة المدرب
                      </Button>
                      <Button size="sm" variant="outline" className="border-red-500/30 text-red-500 hover:bg-red-500/10 text-xs" onClick={() => handleRequestAction(r.id, 'reject', 'لم تكتمل الدورة')}>
                        <XCircle className="w-3.5 h-3.5 ml-1" /> رفض
                      </Button>
                    </>
                  )}
                  {r.status === 'trainer_approved' && (
                    <Button size="sm" className="bg-navy hover:bg-navy-light text-gold text-xs" onClick={() => handleRequestAction(r.id, 'admin_approve', 'تمت الموافقة على الطلب')}>
                      <CheckCircle2 className="w-3.5 h-3.5 ml-1" /> موافقة المدير
                    </Button>
                  )}
                  {r.status === 'admin_approved' && (
                    <Button size="sm" className="bg-gold hover:bg-gold-light text-navy text-xs" onClick={() => handleRequestAction(r.id, 'issue')}>
                      <Award className="w-3.5 h-3.5 ml-1" /> إصدار الشهادة
                    </Button>
                  )}
                  {r.status === 'issued' && r.cert_number && (
                    <a href={`/api/certificate-pdf?number=${encodeURIComponent(r.cert_number)}&format=pdf`} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="outline" className="border-gold/30 text-navy hover:bg-gold/10 text-xs">
                        <Download className="w-3.5 h-3.5 ml-1" /> تحميل الشهادة
                      </Button>
                    </a>
                  )}
                </div>
              </div>
            )
          })}
          {requests.length === 0 && <div className="text-center py-8 text-muted-foreground">لا توجد طلبات شهادات</div>}
        </div>
      )}

      {open && <SimpleDialog open={open} onOpenChange={setOpen} title={editing ? 'تعديل' : 'إضافة'} onSaved={load} initial={editing} fields={['student_name', 'course_title', 'status', 'issued_by', 'external_accreditation_body']} apiPath="/api/certificates" />}

      {revokeTarget && (
        <Dialog open={true} onOpenChange={(o) => { if (!o) { setRevokeTarget(null); setRevokeReason('') } }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>إلغاء الشهادة</DialogTitle></DialogHeader>
            <div className="space-y-3 py-4">
              <div className="bg-red-50 border border-red-500/30 p-3 rounded-lg text-sm">
                <div className="font-bold text-red-700">{revokeTarget.student_name}</div>
                <div className="text-xs text-red-600 font-mono" dir="ltr">{revokeTarget.certificate_number}</div>
                <div className="text-xs text-red-600 mt-1">{revokeTarget.course_title}</div>
              </div>
              <div><Label>سبب الإلغاء *</Label><Textarea value={revokeReason} onChange={(e) => setRevokeReason(e.target.value)} rows={3} placeholder="مثال: خطأ في بيانات المتدرب..." className="mt-1" /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setRevokeTarget(null); setRevokeReason('') }}>إلغاء</Button>
              <Button onClick={revoke} className="bg-red-500 hover:bg-red-600 text-white">تأكيد الإلغاء</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {previewCert && (
        <Dialog open={true} onOpenChange={(o) => { if (!o) setPreviewCert(null) }}>
          <DialogContent className="sm:max-w-5xl max-h-[92vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-gold" /> معاينة الشهادة — {previewCert.certificate_number}
                </DialogTitle>
                <button onClick={() => setPreviewCert(null)} className="text-muted-foreground hover:text-navy">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </DialogHeader>
            <CertificateViewer certificate={previewCert} onClose={() => setPreviewCert(null)} />
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
}

function AdminTrainers() {
  const [items, setItems] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [checkingTeam, setCheckingTeam] = useState(false)
  const load = () => fetch('/api/trainers').then((r) => r.json()).then((d) => setItems(Array.isArray(d) ? d : []))
  useEffect(() => { load() }, [])

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
      action={<Button className="bg-navy hover:bg-navy-light" onClick={() => { setEditing(null); setOpen(true) }}><Plus className="w-4 h-4 ml-1" /> جديد</Button>}
    >
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((t) => {
          // Check if this trainer is a team member
          const isTeamMember = t.password && t.password.startsWith('__TEAM_MEMBER__')
          return (
            <Card key={t.id} className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <Avatar className="w-14 h-14 border-2 border-gold/30">
                  <AvatarImage src={t.avatar || ''} />
                  <AvatarFallback className="bg-navy text-gold">{t.name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-bold text-navy">{t.name}</div>
                  <div className="text-xs text-gold">{t.title}</div>
                  {isTeamMember && <Badge className="mt-1 bg-purple-500/15 text-purple-600 border-purple-500/30 text-[10px]">👑 عضو فريق</Badge>}
                </div>
              </div>
              <div className="text-xs text-muted-foreground mb-3">{t.specialization}</div>
              <div className="text-xs space-y-1 mb-3">
                <div className="text-muted-foreground" dir="ltr">📧 {t.email}</div>
                <div className="text-muted-foreground" dir="ltr">📞 {t.phone || '-'}</div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => { setEditing(t); setOpen(true) }}><Edit className="w-3.5 h-3.5 ml-1" /> تعديل</Button>
                <Button size="sm" variant="outline" disabled={isTeamMember || checkingTeam} className="border-red-500/30 text-red-500 hover:bg-red-500/10 disabled:opacity-30 disabled:cursor-not-allowed" onClick={() => requestDelete(t)} title={isTeamMember ? 'لا يمكن حذف عضو الفريق — احذفه من قسم المؤسس والفريق أولاً' : 'حذف'}><Trash2 className="w-3.5 h-3.5" /></Button>
              </div>
            </Card>
          )
        })}
      </div>
      {open && <TrainerDialog open={open} onOpenChange={setOpen} initial={editing} onSaved={load} />}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o && !deleting) setDeleteTarget(null) }}
        title="تأكيد حذف المدرب"
        message="هل أنت متأكد من حذف هذا المدرب؟"
        itemLabel="سيتم حذف المدرب التالي:"
        itemName={deleteTarget?.name}
        confirmLabel="حذف المدرب"
        cancelLabel="إلغاء"
        variant="danger"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </SectionCard>
  )
}

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
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{initial ? 'تعديل مدرب' : 'إضافة مدرب جديد'}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-4">
          {/* Avatar upload */}
          <div className="flex items-center gap-4">
            <div className="relative flex-shrink-0">
              <Avatar className="w-16 h-16 border-2 border-gold/30">
                <AvatarImage src={form.avatar || ''} />
                <AvatarFallback className="bg-navy text-gold text-xl">{form.name?.charAt(0) || '؟'}</AvatarFallback>
              </Avatar>
              <input type="file" accept="image/*" className="hidden" id="trainer-avatar" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAvatarUpload(f) }} />
              <button
                onClick={() => document.getElementById('trainer-avatar')?.click()}
                disabled={uploadingAvatar}
                className="absolute -bottom-1 -left-1 w-7 h-7 rounded-full bg-gold text-navy flex items-center justify-center text-xs disabled:opacity-50"
                title="رفع صورة"
              >
                {uploadingAvatar ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileUp className="w-3.5 h-3.5" />}
              </button>
            </div>
            <div className="flex-1">
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="اسم المدرب *" className="text-base font-medium" />
            </div>
          </div>

          {/* Quick selects */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">المسمى</Label>
              <select value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full mt-1 px-3 py-2 border border-input rounded-md bg-background text-sm">
                <option value="">— اختر —</option>
                {TITLES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs">التخصص</Label>
              <select value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} className="w-full mt-1 px-3 py-2 border border-input rounded-md bg-background text-sm">
                <option value="">— اختر —</option>
                {SPECIALIZATIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Email + Password */}
          <div><Label className="text-xs">البريد الإلكتروني *</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} dir="ltr" className="mt-1" placeholder="example@fia.edu" />
          </div>
          <div>
            <Label className="text-xs">كلمة المرور {initial && '(اتركها فارغة للإبقاء)'}</Label>
            <div className="relative mt-1">
              <Input type={showPwd ? 'text' : 'password'} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} dir="ltr" placeholder="••••••••" />
              <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Phone */}
          <div><Label className="text-xs">الهاتف</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} dir="ltr" className="mt-1" placeholder="+967 7XX XXX XXX" />
          </div>

          {/* Professional Complete Bio — نبذة تعريفية احترافية واحدة */}
          <div className="border-t border-border pt-4">
            <div className="flex items-center justify-between mb-1">
              <Label className="text-xs font-bold text-navy">النبذة التعريفية الكاملة</Label>
              <Badge variant="outline" className="text-[10px] bg-gold/10 text-gold border-gold/30">احترافي</Badge>
            </div>
            <p className="text-[10px] text-muted-foreground mb-3 leading-relaxed">
              اكتب نبذة واحدة متكاملة واحترافية عن المدرب — تظهر بالضبط كما تكتبها هنا في حساب المدرب وفي الصفحة الرئيسية عند الضغط على المدرب.
              <br />
              <span className="text-navy/70">يُنصح بتقسيم النص على شكل فقرات مفصولة بسطر فارغ، مثل: مقدمة شخصية، المؤهلات العلمية، الإنجازات والمساهمات.</span>
            </p>
            <textarea
              value={form.bio || ''}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              className="w-full min-h-[260px] p-4 border border-input rounded-lg text-sm leading-relaxed bg-background focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold/40 transition-all"
              placeholder={"مثال احترافي:\n\nمدرب ومحاضر دولي وخبير في التعليم الطبي، حاصل على شهادة الدكتوراه في الموارد البشرية والتخطيط الاستراتيجي. يمتلك خبرة تتجاوز 15 عاماً في تدريب الكوادر الصحية على المستوى المحلي والدولي.\n\n🎓 المؤهلات العلمية\n• بكالوريوس آداب وعلوم إنسانية\n• ماستر حقوق وعلوم سياسية\n• دكتوراه في الموارد البشرية والتخطيط الاستراتيجي\n\n🏆 الإنجازات\n• مشارك في عدة مؤتمرات دولية متخصصة\n• مؤلف لـ 6 كتب في طبعات دولية\n• مدرب معتمد من عدة هيئات صحية"}
            />
            <div className="flex items-center justify-between mt-2 text-[10px] text-muted-foreground">
              <span>💡 استخدم الأسطر الفارغة لفصل الفقرات</span>
              <span>{(form.bio || '').length} حرف</span>
            </div>
          </div>

          {/* Years experience */}
          <div>
            <Label className="text-xs">سنوات الخبرة</Label>
            <Input type="number" value={form.years_experience || ''} onChange={(e) => setForm({ ...form, years_experience: e.target.value === '' ? 0 : parseInt(e.target.value) || 0 })} className="mt-1" placeholder="0" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button onClick={save} disabled={saving} className="bg-navy hover:bg-navy-light">
            {saving ? <><Loader2 className="w-4 h-4 ml-1 animate-spin" /> جاري...</> : 'حفظ'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function AdminPartners() {
  const [items, setItems] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
  const [deleting, setDeleting] = useState(false)
  const load = () => fetch('/api/partners').then((r) => r.json()).then((d) => setItems(Array.isArray(d) ? d : []))
  useEffect(() => { load() }, [])
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
    <SectionCard title="الشركاء" description={`${items.length} شريك`} action={<Button className="bg-navy hover:bg-navy-light" onClick={() => { setEditing(null); setOpen(true) }}><Plus className="w-4 h-4 ml-1" /> جديد</Button>}>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((p) => (
          <Card key={p.id} className="p-5">
            <div className="flex items-start gap-3 mb-3">
              <div className="text-3xl">{p.logo}</div>
              <div className="flex-1">
                <div className="font-bold text-navy">{p.name}</div>
                <div className="text-xs text-muted-foreground">{p.description}</div>
                {p.since && <Badge variant="outline" className="mt-1 text-xs">منذ {p.since}</Badge>}
              </div>
            </div>
            <div className="mb-3">
              <Badge className={p.status === 'نشط' ? 'bg-green-500/15 text-green-600 border-green-500/30' : 'bg-red-500/15 text-red-600 border-red-500/30'}>
                {p.status === 'نشط' ? '● نشط' : '● متوقف'}
              </Badge>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1" onClick={() => { setEditing(p); setOpen(true) }}><Edit className="w-3.5 h-3.5 ml-1" /> تعديل</Button>
              <Button size="sm" variant="outline" className={p.status === 'نشط' ? 'border-red-500/30 text-red-500 hover:bg-red-500/10' : 'border-green-500/30 text-green-600 hover:bg-green-500/10'} onClick={() => toggleStatus(p)}>
                {p.status === 'نشط' ? <><XCircle className="w-3.5 h-3.5 ml-1" /> إيقاف</> : <><CheckCircle2 className="w-3.5 h-3.5 ml-1" /> تنشيط</>}
              </Button>
              <Button size="sm" variant="outline" className="border-red-500/30 text-red-500 hover:bg-red-500/10" onClick={() => setDeleteTarget(p)}><Trash2 className="w-3.5 h-3.5" /></Button>
            </div>
          </Card>
        ))}
      </div>
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
}

function AdminLicenses() {
  const [items, setItems] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
  const [deleting, setDeleting] = useState(false)
  const load = () => fetch('/api/licenses').then((r) => r.json()).then((d) => setItems(Array.isArray(d) ? d : []))
  useEffect(() => { load() }, [])
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
    <SectionCard title="التراخيص" description={`${items.length} ترخيص`} action={<Button className="bg-navy hover:bg-navy-light" onClick={() => { setEditing(null); setOpen(true) }}><Plus className="w-4 h-4 ml-1" /> جديد</Button>}>
      <div className="grid md:grid-cols-2 gap-4">
        {items.map((l) => (
          <Card key={l.id} className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="font-bold text-navy">{l.issuing_body}</div>
                <div className="text-xs text-gold">{l.type}</div>
              </div>
              <Badge className={l.status === 'ساري' ? 'bg-green-500/15 text-green-600 border-green-500/30' : 'bg-red-500/15 text-red-600 border-red-500/30'}>{l.status === 'ساري' ? '● ساري' : '● متوقف'}</Badge>
            </div>
            <div className="text-xs text-muted-foreground mb-2">رقم: <span className="font-mono text-gold" dir="ltr">{l.number}</span></div>
            <div className="flex justify-between text-xs text-muted-foreground mb-3">
              <span>إصدار: <span dir="ltr">{l.issued_at}</span></span>
              <span>انتهاء: <span dir="ltr">{l.expires_at}</span></span>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1" onClick={() => { setEditing(l); setOpen(true) }}><Edit className="w-3.5 h-3.5 ml-1" /> تعديل</Button>
              <Button size="sm" variant="outline" className={l.status === 'ساري' ? 'border-red-500/30 text-red-500 hover:bg-red-500/10' : 'border-green-500/30 text-green-600 hover:bg-green-500/10'} onClick={() => toggleStatus(l)}>
                {l.status === 'ساري' ? <><XCircle className="w-3.5 h-3.5 ml-1" /> إيقاف</> : <><CheckCircle2 className="w-3.5 h-3.5 ml-1" /> تنشيط</>}
              </Button>
              <Button size="sm" variant="outline" className="border-red-500/30 text-red-500 hover:bg-red-500/10" onClick={() => setDeleteTarget(l)}><Trash2 className="w-3.5 h-3.5" /></Button>
            </div>
          </Card>
        ))}
      </div>
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
}

function AdminFounder({ user }: any) {
  const [tab, setTab] = useState<'founder' | 'team'>('founder')

  return (
    <SectionCard title="المؤسس والفريق" description="إدارة معلومات المؤسس وأعضاء الفريق بشكل احترافي">
      <div className="space-y-5">
        <div className="flex gap-2 border-b border-border pb-3">
          <button
            onClick={() => setTab('founder')}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${tab === 'founder' ? 'bg-navy text-gold' : 'text-navy hover:bg-muted'}`}
          >
            👑 المؤسس
          </button>
          <button
            onClick={() => setTab('team')}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${tab === 'team' ? 'bg-navy text-gold' : 'text-navy hover:bg-muted'}`}
          >
            👥 الفريق القيادي
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
}

function AdminSite() {
  const [settings, setSettings] = useState<any>({})
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<'basic' | 'about' | 'policies' | 'social' | 'visibility'>('basic')
  useEffect(() => { fetch('/api/site-settings').then((r) => r.json()).then(setSettings) }, [])
  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/site-settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || 'فشل الحفظ')
      } else {
        toast.success('تم الحفظ بنجاح')
      }
    } catch { toast.error('فشل') } finally { setSaving(false) }
  }

  return (
    <SectionCard title="إعدادات الموقع" description="معلومات الأكاديمية + من نحن + السياسات + التواصل + الإظهار">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-3 mb-4 flex-wrap">
        {[
          { id: 'basic', label: 'معلومات أساسية' },
          { id: 'about', label: 'من نحن' },
          { id: 'policies', label: 'السياسات' },
          { id: 'social', label: 'التواصل' },
          { id: 'visibility', label: 'الإظهار' },
        ].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${tab === t.id ? 'bg-navy text-gold' : 'text-navy hover:bg-muted'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="space-y-4 max-w-3xl">
        {/* BASIC */}
        {tab === 'basic' && (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div><Label>اسم الأكاديمية (عربي)</Label><Input value={settings.academy_name || ''} onChange={(e) => setSettings({ ...settings, academy_name: e.target.value })} className="mt-1" /></div>
              <div><Label>اسم الأكاديمية (إنجليزي)</Label><Input value={settings.academy_name_en || ''} onChange={(e) => setSettings({ ...settings, academy_name_en: e.target.value })} dir="ltr" className="mt-1" /></div>
              <div><Label>الاختصار</Label><Input value={settings.academy_short || ''} onChange={(e) => setSettings({ ...settings, academy_short: e.target.value })} dir="ltr" className="mt-1" /></div>
              <div><Label>الهاتف</Label><Input value={settings.phone || ''} onChange={(e) => setSettings({ ...settings, phone: e.target.value })} dir="ltr" className="mt-1" /></div>
              <div><Label>البريد</Label><Input value={settings.email || ''} onChange={(e) => setSettings({ ...settings, email: e.target.value })} dir="ltr" className="mt-1" /></div>
              <div><Label>العنوان</Label><Input value={settings.address || ''} onChange={(e) => setSettings({ ...settings, address: e.target.value })} className="mt-1" /></div>
            </div>
            <div className="border-t border-border pt-4">
              <h3 className="font-bold text-navy mb-3">تكامل تيليجرام (لرفع الفيديوهات)</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div><Label>Bot Token</Label><Input value={settings.telegram_bot_token || ''} onChange={(e) => setSettings({ ...settings, telegram_bot_token: e.target.value })} dir="ltr" className="mt-1 font-mono text-xs" /></div>
                <div><Label>Channel ID</Label><Input value={settings.telegram_channel_id || ''} onChange={(e) => setSettings({ ...settings, telegram_channel_id: e.target.value })} dir="ltr" className="mt-1 font-mono text-xs" /></div>
              </div>
            </div>
          </div>
        )}

        {/* ABOUT US */}
        {tab === 'about' && (
          <div className="space-y-4">
            <div className="bg-gold/5 border border-gold/30 rounded-lg p-3 text-xs text-muted-foreground">
              💡 يظهر محتوى هذه الحقول في صفحة "من نحن" عند الضغط على الروابط السريعة.
            </div>
            <div>
              <Label>رؤيتنا</Label>
              <textarea value={settings.about_vision || ''} onChange={(e) => setSettings({ ...settings, about_vision: e.target.value })}
                className="mt-1 w-full min-h-[100px] p-3 border border-input rounded-md text-sm" placeholder="اكتب رؤية الأكاديمية..." />
            </div>
            <div>
              <Label>رسالتنا</Label>
              <textarea value={settings.about_mission || ''} onChange={(e) => setSettings({ ...settings, about_mission: e.target.value })}
                className="mt-1 w-full min-h-[100px] p-3 border border-input rounded-md text-sm" placeholder="اكتب رسالة الأكاديمية..." />
            </div>
            <div>
              <Label>قيمنا</Label>
              <textarea value={settings.about_values || ''} onChange={(e) => setSettings({ ...settings, about_values: e.target.value })}
                className="mt-1 w-full min-h-[100px] p-3 border border-input rounded-md text-sm" placeholder="اكتب قيم الأكاديمية..." />
            </div>
            <div>
              <Label>فريقنا</Label>
              <textarea value={settings.about_team || ''} onChange={(e) => setSettings({ ...settings, about_team: e.target.value })}
                className="mt-1 w-full min-h-[100px] p-3 border border-input rounded-md text-sm" placeholder="اكتب وصف فريق الأكاديمية..." />
            </div>
          </div>
        )}

        {/* POLICIES */}
        {tab === 'policies' && (
          <div className="space-y-4">
            <div className="bg-gold/5 border border-gold/30 rounded-lg p-3 text-xs text-muted-foreground">
              💡 تظهر هذه السياسات في صفحات منفصلة عند الضغط على روابط الفوتر.
            </div>
            <div>
              <Label>سياسة الخصوصية</Label>
              <textarea value={settings.policy_privacy || ''} onChange={(e) => setSettings({ ...settings, policy_privacy: e.target.value })}
                className="mt-1 w-full min-h-[150px] p-3 border border-input rounded-md text-sm" placeholder="اكتب سياسة الخصوصية..." />
            </div>
            <div>
              <Label>شروط الاستخدام</Label>
              <textarea value={settings.policy_terms || ''} onChange={(e) => setSettings({ ...settings, policy_terms: e.target.value })}
                className="mt-1 w-full min-h-[150px] p-3 border border-input rounded-md text-sm" placeholder="اكتب شروط الاستخدام..." />
            </div>
            <div>
              <Label>سياسة الاسترداد</Label>
              <textarea value={settings.policy_refund || ''} onChange={(e) => setSettings({ ...settings, policy_refund: e.target.value })}
                className="mt-1 w-full min-h-[150px] p-3 border border-input rounded-md text-sm" placeholder="اكتب سياسة الاسترداد..." />
            </div>
            <div>
              <Label>الدعم والمساعدة</Label>
              <textarea value={settings.policy_support || ''} onChange={(e) => setSettings({ ...settings, policy_support: e.target.value })}
                className="mt-1 w-full min-h-[150px] p-3 border border-input rounded-md text-sm" placeholder="اكتب معلومات الدعم..." />
            </div>
          </div>
        )}

        {/* SOCIAL */}
        {tab === 'social' && (
          <div className="space-y-4">
            <div className="bg-gold/5 border border-gold/30 rounded-lg p-3 text-xs text-muted-foreground">
              💡 كل رابط يمكن تفعيله/إيقافه بشكل مستقل. لا يظهر في الفوتر إلا عند التفعيل.
            </div>
            {/* Facebook */}
            <div className="border border-border rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <Label className="font-bold">فيسبوك</Label>
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" checked={settings.social_facebook_enabled || false} onChange={(e) => setSettings({ ...settings, social_facebook_enabled: e.target.checked })} />
                  تفعيل
                </label>
              </div>
              <Input value={settings.social_facebook || ''} onChange={(e) => setSettings({ ...settings, social_facebook: e.target.value })} dir="ltr" placeholder="https://facebook.com/..." className="text-sm" />
            </div>
            {/* Telegram */}
            <div className="border border-border rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <Label className="font-bold">تيليجرام (قناة أو يوزر)</Label>
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" checked={settings.social_telegram_enabled || false} onChange={(e) => setSettings({ ...settings, social_telegram_enabled: e.target.checked })} />
                  تفعيل
                </label>
              </div>
              <Input value={settings.social_telegram || ''} onChange={(e) => setSettings({ ...settings, social_telegram: e.target.value })} dir="ltr" placeholder="@username أو https://t.me/..." className="text-sm" />
            </div>
            {/* WhatsApp */}
            <div className="border border-border rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <Label className="font-bold">واتساب (قناة)</Label>
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" checked={settings.social_whatsapp_enabled || false} onChange={(e) => setSettings({ ...settings, social_whatsapp_enabled: e.target.checked })} />
                  تفعيل
                </label>
              </div>
              <Input value={settings.social_whatsapp || ''} onChange={(e) => setSettings({ ...settings, social_whatsapp: e.target.value })} dir="ltr" placeholder="https://wa.me/... أو رقم" className="text-sm" />
            </div>
            {/* SMS */}
            <div className="border border-border rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <Label className="font-bold">رقم للمراسلات النصية (SMS)</Label>
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" checked={settings.social_sms_enabled || false} onChange={(e) => setSettings({ ...settings, social_sms_enabled: e.target.checked })} />
                  تفعيل
                </label>
              </div>
              <Input value={settings.social_sms || ''} onChange={(e) => setSettings({ ...settings, social_sms: e.target.value })} dir="ltr" placeholder="+9677XX..." className="text-sm" />
            </div>
          </div>
        )}

        {/* VISIBILITY */}
        {tab === 'visibility' && (
          <div className="space-y-4">
            <div className="bg-gold/5 border border-gold/30 rounded-lg p-3 text-xs text-muted-foreground">
              💡 تحكم في الأقسام التي تظهر في الصفحة الرئيسية.
            </div>
            <div className="border border-border rounded-lg p-3 flex items-center justify-between">
              <div>
                <div className="font-bold text-navy text-sm">إظهار قسم الشركاء</div>
                <div className="text-xs text-muted-foreground">إذا تم الإيقاف، لن يظهر قسم الشركاء في الصفحة الرئيسية</div>
              </div>
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={settings.show_partners || false} onChange={(e) => setSettings({ ...settings, show_partners: e.target.checked })} />
                تفعيل
              </label>
            </div>
            <div className="border border-border rounded-lg p-3 flex items-center justify-between">
              <div>
                <div className="font-bold text-navy text-sm">إظهار قسم التراخيص</div>
                <div className="text-xs text-muted-foreground">إذا تم الإيقاف، لن يظهر قسم التراخيص في الصفحة الرئيسية</div>
              </div>
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={settings.show_licenses || false} onChange={(e) => setSettings({ ...settings, show_licenses: e.target.checked })} />
                تفعيل
              </label>
            </div>
          </div>
        )}

        <Button onClick={save} disabled={saving} className="bg-navy hover:bg-navy-light">{saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}</Button>
      </div>
    </SectionCard>
  )
}

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
      toast.success('تم حذف جميع البيانات بنجاح. سيتم تسجيل الخروج...')
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
        {/* Current account info */}
        <div className="bg-muted/30 p-4 rounded-lg border border-border">
          <div className="text-xs text-muted-foreground mb-1">الحساب الحالي:</div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-navy flex items-center justify-center text-gold font-bold text-xl border-2 border-gold/30">
              {user?.name?.charAt(0)}
            </div>
            <div>
              <div className="font-bold text-navy">{user?.name}</div>
              <div className="text-xs text-muted-foreground" dir="ltr">{user?.email}</div>
            </div>
          </div>
        </div>

        {/* Security verification */}
        <div>
          <Label className="text-navy font-semibold">كلمة المرور الحالية *</Label>
          <div className="relative mt-1">
            <Input
              type={showCurrent ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              dir="ltr"
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

        {/* New email */}
        <div className="border-t border-border pt-4">
          <h3 className="font-bold text-navy text-sm mb-3 flex items-center gap-2">
            <Mail className="w-4 h-4 text-gold" /> تغيير البريد الإلكتروني
          </h3>
          <div>
            <Label>البريد الجديد</Label>
            <Input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder={user?.email || 'example@fia.edu'}
              dir="ltr"
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">اتركه فارغاً إذا لم ترد تغيير البريد</p>
          </div>
        </div>

        {/* New password */}
        <div className="border-t border-border pt-4">
          <h3 className="font-bold text-navy text-sm mb-3 flex items-center gap-2">
            <Lock className="w-4 h-4 text-gold" /> تغيير كلمة المرور
          </h3>
          <div className="space-y-3">
            <div>
              <Label>كلمة المرور الجديدة</Label>
              <div className="relative mt-1">
                <Input
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  dir="ltr"
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
              <Label>تأكيد كلمة المرور</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                dir="ltr"
                className="mt-1"
              />
              {newPassword && confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-red-500 mt-1">كلمتا المرور غير متطابقتين</p>
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

        <Button onClick={save} disabled={loading || !currentPassword} className="bg-navy hover:bg-navy-light">
          {loading ? 'جاري الحفظ...' : 'حفظ التغييرات'}
        </Button>
      </div>
    </SectionCard>

    {/* ===== Danger Zone ===== */}
    <div className="mt-6 rounded-xl border-2 border-red-500/40 bg-red-500/5 overflow-hidden max-w-2xl">
      {/* Header bar */}
      <div className="flex items-center gap-3 p-4 bg-red-500/10 border-b border-red-500/30">
        <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="w-5 h-5 text-red-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-red-600 text-base">منطقة خطرة</h3>
          <p className="text-xs text-red-600/80 mt-0.5">حذف جميع البيانات نهائياً — لا يمكن التراجع</p>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        <p className="text-sm text-navy">
          سيتم حذف: جميع المدربين، المتدربين، الفريق، الدورات، المدفوعات، الشهادات
        </p>
        <p className="text-xs text-muted-foreground">
          سيتم الاحتفاظ بحساب المؤسس التنفيذي فقط — وكذلك إعدادات الموقع.
        </p>
        <Button
          variant="outline"
          onClick={() => setDzOpen(true)}
          className="border-red-500/40 text-red-600 hover:bg-red-500/10 hover:text-red-700"
        >
          <Trash2 className="w-4 h-4 ml-1" /> حذف جميع البيانات
        </Button>
      </div>
    </div>

    {/* ===== Danger Zone confirmation dialog ===== */}
    <Dialog open={dzOpen} onOpenChange={(o) => { if (!o) closeDzDialog(); else setDzOpen(true) }}>
      <DialogContent className="sm:max-w-md" showCloseButton={!dzLoading}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            تأكيد حذف جميع البيانات
          </DialogTitle>
        </DialogHeader>

        <div className="py-2 space-y-4">
          {/* Warning box */}
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 space-y-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm font-semibold text-red-700">
                سيتم حذف: جميع المدربين، المتدربين، الفريق، الدورات، المدفوعات، الشهادات
              </p>
            </div>
            <p className="text-xs text-red-600/80 pr-6">
              سيتم الاحتفاظ بحساب المؤسس التنفيذي فقط
            </p>
            <p className="text-xs text-red-600/80 pr-6 font-semibold">
              ⚠ هذه العملية لا يمكن التراجع عنها
            </p>
          </div>

          {/* Password confirmation */}
          <div>
            <Label className="text-navy font-semibold">أكّد بكلمة المرور *</Label>
            <div className="relative mt-1">
              <Input
                type={showDzPassword ? 'text' : 'password'}
                value={dzPassword}
                onChange={(e) => setDzPassword(e.target.value)}
                placeholder="••••••••"
                dir="ltr"
                disabled={dzLoading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && dzPassword && !dzLoading) {
                    handleDangerZoneConfirm()
                  }
                }}
              />
              <button
                type="button"
                onClick={() => setShowDzPassword(!showDzPassword)}
                disabled={dzLoading}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-navy disabled:opacity-50"
              >
                {showDzPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              يجب إدخال كلمة مرور حساب المؤسس للتحقق
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={closeDzDialog}
            disabled={dzLoading}
          >
            إلغاء
          </Button>
          <Button
            onClick={handleDangerZoneConfirm}
            disabled={dzLoading || !dzPassword}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {dzLoading ? (
              <><Loader2 className="w-4 h-4 ml-1 animate-spin" /> جاري الحذف...</>
            ) : (
              <><Trash2 className="w-4 h-4 ml-1" /> تأكيد الحذف</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
