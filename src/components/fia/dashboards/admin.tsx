'use client'

import { useEffect, useState } from 'react'
import {
  LayoutDashboard, BookOpen, FileText, Users, CreditCard,
  Award, GraduationCap, Building2, Shield, UserCog, Settings,
  BarChart3, ScrollText, Plus, Edit, Trash2, Eye, EyeOff,
  DollarSign, TrendingUp, Activity, Star, ArrowRight,
  Lock, Mail, CheckCircle2, User, XCircle, ExternalLink, Download,
  Loader2, FileUp, Clock,
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

const NAV: NavItem[] = [
  { id: 'overview', label: 'الإحصائيات', icon: LayoutDashboard },
  { id: 'courses', label: 'الدورات', icon: BookOpen },
  { id: 'content', label: 'محتوى الدورات', icon: FileText },
  { id: 'exams', label: 'الاختبارات', icon: FileText },
  { id: 'students', label: 'المتدربون', icon: Users },
  { id: 'payments', label: 'المدفوعات', icon: CreditCard },
  { id: 'payment-methods', label: 'طرق الدفع', icon: DollarSign },
  { id: 'certificates', label: 'الشهادات', icon: Award },
  { id: 'trainers', label: 'المدربون', icon: GraduationCap },
  { id: 'partners', label: 'الشركاء', icon: Building2 },
  { id: 'licenses', label: 'التراخيص', icon: Shield },
  { id: 'founder', label: 'المؤسس والفريق', icon: UserCog },
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
      {active === 'students' && <AdminStudents />}
      {active === 'payments' && <AdminPayments />}
      {active === 'payment-methods' && <AdminPaymentMethods />}
      {active === 'certificates' && <AdminCertificates />}
      {active === 'trainers' && <AdminTrainers />}
      {active === 'partners' && <AdminPartners />}
      {active === 'licenses' && <AdminLicenses />}
      {active === 'founder' && <AdminFounder user={user} />}
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
      const completedEnrollments = enrollments.filter(e => e.status === 'completed').length
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

  const load = () => {
    setLoading(true)
    fetch('/api/courses').then((r) => r.json()).then((d) => setItems(Array.isArray(d) ? d : [])).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const del = async (id: string) => {
    if (!confirm('حذف الدورة؟')) return
    await fetch('/api/courses', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    toast.success('تم الحذف')
    load()
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
                    <Button size="icon" variant="ghost" onClick={() => del(c.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                  </div>
                </td>
              </tr>
            ))}
            {!items.length && !loading && <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">لا توجد دورات</td></tr>}
          </tbody>
        </table>
      </div>
      {open && <SimpleDialog open={open} onOpenChange={setOpen} title={editing ? 'تعديل' : 'إضافة'} onSaved={load} initial={editing} fields={['title', 'short_description', 'description', 'level', 'price', 'duration_hours', 'pass_score']} apiPath="/api/courses" />}
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

  useEffect(() => {
    fetch('/api/students?role=student').then((r) => r.json()).then((d) => setItems(Array.isArray(d) ? d : []))
    fetch('/api/courses').then((r) => r.json()).then((d) => setCourses(Array.isArray(d) ? d : []))
    fetch('/api/enrollments').then((r) => r.json()).then((d) => setEnrollments(Array.isArray(d) ? d : []))
  }, [])

  const del = async (id: string) => {
    if (!confirm('حذف المتدرب نهائياً؟')) return
    await fetch('/api/students', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    toast.success('تم الحذف')
    setItems(items.filter((s) => s.id !== id))
    setSelectedStudent(null)
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
                        e.status === 'completed' ? 'bg-green-500/15 text-green-600 border-green-500/30 text-[10px]'
                        : e.payment_status === 'pending' ? 'bg-yellow-500/15 text-yellow-600 border-yellow-500/30 text-[10px]'
                        : 'bg-blue-500/15 text-blue-600 border-blue-500/30 text-[10px]'
                      }>
                        {e.status === 'completed' ? 'مكتمل' : e.payment_status === 'pending' ? 'بانتظار الدفع' : 'قيد التعلّم'}
                      </Badge>
                    </div>
                  ) : null
                })}
                {sEnrs.length > 2 && <div className="text-[10px] text-muted-foreground">+{sEnrs.length - 2} دورة أخرى</div>}
              </div>
              <div className="flex gap-1 p-3 pt-0">
                <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => setSelectedStudent(s)}>عرض التفاصيل</Button>
                <Button size="sm" variant="ghost" onClick={() => del(s.id)}><Trash2 className="w-3.5 h-3.5 text-red-500" /></Button>
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
                    const isCompleted = e.status === 'completed'
                    return (
                      <div key={e.id} className="flex items-center justify-between p-3 bg-white border border-border rounded-lg">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-navy text-sm truncate">{c.title}</div>
                          <div className="text-xs text-muted-foreground">{isFree ? 'مجانية' : `${c.price?.toLocaleString()} ${c.currency || 'ر.ي'}`}</div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {isCompleted && (
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
                          )}
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
  const load = () => fetch('/api/payment-methods').then((r) => r.json()).then((d) => setItems(Array.isArray(d) ? d : []))
  useEffect(() => { load() }, [])
  const toggle = async (id: string, enabled: boolean) => {
    await fetch('/api/payment-methods', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, enabled }) })
    setItems(items.map((p) => (p.id === id ? { ...p, enabled } : p)))
  }
  const del = async (id: string) => {
    if (!confirm('حذف؟')) return
    await fetch('/api/payment-methods', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    toast.success('تم الحذف'); load()
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
              <Button size="sm" variant="outline" className="border-red-500/30 text-red-500 hover:bg-red-500/10" onClick={() => del(p.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
            </div>
          </Card>
        ))}
      </div>
      {open && <SimpleDialog open={open} onOpenChange={setOpen} title={editing ? 'تعديل' : 'إضافة'} onSaved={load} initial={editing} fields={['name', 'icon', 'type', 'wallet_id', 'description', 'instructions']} apiPath="/api/payment-methods" />}
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

  const del = async (id: string) => { if (!confirm('حذف نهائي؟')) return; await fetch('/api/certificates', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }); toast.success('تم الحذف'); load() }
  const revoke = async () => { if (!revokeTarget || !revokeReason.trim()) { toast.error('أدخل سبب الإلغاء'); return }; await fetch('/api/certificates', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: revokeTarget.id, status: 'ملغاة' }) }); toast.success('تم إلغاء الشهادة'); setRevokeTarget(null); setRevokeReason(''); load() }
  const restore = async (cert: any) => { if (!confirm('استعادة؟')) return; await fetch('/api/certificates', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: cert.id, status: 'صالحة' }) }); toast.success('تمت الاستعادة'); load() }

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
    return enrollments.some(e => e.user_id === userId && e.course_id === courseId && e.status === 'completed')
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
            </select>
          </div>
          <div className="space-y-2">
            {filtered.map((c) => (
              <div key={c.id} className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 bg-white border border-border rounded-lg">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-mono text-gold text-xs" dir="ltr">{c.certificate_number}</span>
                    <Badge className={c.status === 'صالحة' ? 'bg-green-500/15 text-green-600 border-green-500/30' : 'bg-red-500/15 text-red-600 border-red-500/30'}>{c.status}</Badge>
                  </div>
                  <div className="font-medium text-navy text-sm">{c.student_name}</div>
                  <div className="text-xs text-muted-foreground truncate">{c.course_title || '-'}</div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Button size="sm" variant="ghost" onClick={() => setPreviewCert(c)} title="معاينة"><Eye className="w-4 h-4 text-navy" /></Button>
                  <a href={`/api/certificate-pdf?number=${encodeURIComponent(c.certificate_number)}&format=pdf`} target="_blank" rel="noopener noreferrer"><Button size="sm" variant="ghost" title="PDF"><Download className="w-4 h-4 text-gold" /></Button></a>
                  <Button size="sm" variant="ghost" onClick={() => { setEditing(c); setOpen(true) }} title="تعديل"><Edit className="w-4 h-4 text-navy" /></Button>
                  {c.status === 'صالحة' ? <Button size="sm" variant="ghost" onClick={() => setRevokeTarget(c)} title="إلغاء"><XCircle className="w-4 h-4 text-red-500" /></Button> : <Button size="sm" variant="ghost" onClick={() => restore(c)} title="استعادة"><CheckCircle2 className="w-4 h-4 text-green-600" /></Button>}
                  <Button size="sm" variant="ghost" onClick={() => del(c.id)} title="حذف"><Trash2 className="w-4 h-4 text-red-500" /></Button>
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
          <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>معاينة — {previewCert.certificate_number}</DialogTitle></DialogHeader>
            <div className="py-2">
              <a href={`/?verify=${encodeURIComponent(previewCert.certificate_number)}#verify`} target="_blank" rel="noopener noreferrer" className="inline-block mb-3">
                <Button variant="outline" size="sm" className="border-gold/30 text-navy hover:bg-gold/10"><ExternalLink className="w-3.5 h-3.5 ml-1" /> فتح صفحة التحقق</Button>
              </a>
              <iframe src={`/api/certificate-pdf?number=${encodeURIComponent(previewCert.certificate_number)}&format=pdf`} className="w-full h-[500px] border-2 border-gold/30 rounded-lg" title="Certificate Preview" />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </SectionCard>
  )
}

function AdminTrainers() {
  const [items, setItems] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const load = () => fetch('/api/trainers').then((r) => r.json()).then((d) => setItems(Array.isArray(d) ? d : []))
  useEffect(() => { load() }, [])
  const del = async (id: string) => {
    // Check if this trainer is also a team member (founder/leader)
    try {
      const teamRes = await fetch('/api/team')
      const teamData = await teamRes.json()
      const teamMember = (teamData || []).find((m: any) => m.id === id)
      if (teamMember) {
        toast.error(`لا يمكن حذف هذا المدرب لأنه مسجّل كـ "${teamMember.role === 'founder' ? 'المؤسس' : 'عضو فريق'}" في قسم المؤسس والفريق. احذفه من هناك أولاً.`)
        return
      }
    } catch {}
    if (!confirm('حذف المدرب؟')) return
    await fetch('/api/trainers', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    toast.success('تم الحذف'); load()
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
                <Button size="sm" variant="outline" disabled={isTeamMember} className="border-red-500/30 text-red-500 hover:bg-red-500/10 disabled:opacity-30 disabled:cursor-not-allowed" onClick={() => del(t.id)} title={isTeamMember ? 'لا يمكن حذف عضو الفريق — احذفه من قسم المؤسس والفريق أولاً' : 'حذف'}><Trash2 className="w-3.5 h-3.5" /></Button>
              </div>
            </Card>
          )
        })}
      </div>
      {open && <TrainerDialog open={open} onOpenChange={setOpen} initial={editing} onSaved={load} />}
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
  const load = () => fetch('/api/partners').then((r) => r.json()).then((d) => setItems(Array.isArray(d) ? d : []))
  useEffect(() => { load() }, [])
  const del = async (id: string) => { if (!confirm('حذف؟')) return; await fetch('/api/partners', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }); toast.success('تم الحذف'); load() }
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
              <Button size="sm" variant="outline" className="border-red-500/30 text-red-500 hover:bg-red-500/10" onClick={() => del(p.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
            </div>
          </Card>
        ))}
      </div>
      {open && <SimpleDialog open={open} onOpenChange={setOpen} title={editing ? 'تعديل' : 'إضافة'} onSaved={load} initial={editing} fields={['name', 'logo', 'description', 'website', 'since', 'status']} apiPath="/api/partners" />}
    </SectionCard>
  )
}

function AdminLicenses() {
  const [items, setItems] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const load = () => fetch('/api/licenses').then((r) => r.json()).then((d) => setItems(Array.isArray(d) ? d : []))
  useEffect(() => { load() }, [])
  const del = async (id: string) => { if (!confirm('حذف؟')) return; await fetch('/api/licenses', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }); toast.success('تم الحذف'); load() }
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
              <Button size="sm" variant="outline" className="border-red-500/30 text-red-500 hover:bg-red-500/10" onClick={() => del(l.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
            </div>
          </Card>
        ))}
      </div>
      {open && <SimpleDialog open={open} onOpenChange={setOpen} title={editing ? 'تعديل' : 'إضافة'} onSaved={load} initial={editing} fields={['issuing_body', 'type', 'number', 'issued_at', 'expires_at', 'status', 'verification_url']} apiPath="/api/licenses" />}
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
  useEffect(() => { fetch('/api/site-settings').then((r) => r.json()).then(setSettings) }, [])
  const save = async () => {
    setSaving(true)
    try {
      await fetch('/api/site-settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) })
      toast.success('تم الحفظ')
    } catch { toast.error('فشل') } finally { setSaving(false) }
  }
  return (
    <SectionCard title="إعدادات الموقع" description="معلومات الأكاديمية والاتصال">
      <div className="space-y-4 max-w-2xl">
        <div className="grid sm:grid-cols-2 gap-4">
          <div><Label>اسم الأكاديمية</Label><Input value={settings.academy_name || ''} onChange={(e) => setSettings({ ...settings, academy_name: e.target.value })} className="mt-1" /></div>
          <div><Label>الهاتف</Label><Input value={settings.phone || ''} onChange={(e) => setSettings({ ...settings, phone: e.target.value })} dir="ltr" className="mt-1" /></div>
          <div><Label>البريد</Label><Input value={settings.email || ''} onChange={(e) => setSettings({ ...settings, email: e.target.value })} dir="ltr" className="mt-1" /></div>
          <div><Label>العنوان</Label><Input value={settings.address || ''} onChange={(e) => setSettings({ ...settings, address: e.target.value })} className="mt-1" /></div>
        </div>
        <div className="border-t border-border pt-4">
          <h3 className="font-bold text-navy mb-3">تكامل تيليجرام</h3>
          <div className="space-y-4">
            <div><Label>Bot Token</Label><Input value={settings.telegram_bot_token || ''} onChange={(e) => setSettings({ ...settings, telegram_bot_token: e.target.value })} dir="ltr" className="mt-1 font-mono text-xs" /></div>
            <div><Label>Channel ID</Label><Input value={settings.telegram_channel_id || ''} onChange={(e) => setSettings({ ...settings, telegram_channel_id: e.target.value })} dir="ltr" className="mt-1 font-mono text-xs" /></div>
          </div>
        </div>
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

  return (
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
  )
}

function AdminReports() {
  const [data, setData] = useState<any>({ courses: [], payments: [], students: [], enrollments: [], trainers: [] })

  useEffect(() => {
    Promise.all([
      fetch('/api/courses').then(r => r.json()),
      fetch('/api/payments').then(r => r.json()),
      fetch('/api/students?role=student').then(r => r.json()),
      fetch('/api/enrollments').then(r => r.json()),
      fetch('/api/trainers').then(r => r.json()),
    ]).then(([c, p, s, e, t]) => {
      setData({
        courses: Array.isArray(c) ? c : [],
        payments: Array.isArray(p) ? p : [],
        students: Array.isArray(s) ? s : [],
        enrollments: Array.isArray(e) ? e : [],
        trainers: Array.isArray(t) ? t : [],
      })
    })
  }, [])

  const completedRevenue = data.payments.filter(p => p.status === 'مكتمل').reduce((sum, p) => sum + (p.amount || 0), 0)
  const pendingRevenue = data.payments.filter(p => p.status === 'قيد الانتظار').reduce((sum, p) => sum + (p.amount || 0), 0)
  const freeCourses = data.courses.filter(c => c.price_type === 'مجانية' || c.price === 0).length
  const paidCourses = data.courses.filter(c => c.price_type !== 'مجانية' && c.price > 0).length
  const completedEnrs = data.enrollments.filter(e => e.status === 'completed').length
  const totalLessons = data.courses.reduce((sum, c) => sum + (c.lessons_count || 0), 0)
  const avgRating = data.courses.length > 0
    ? (data.courses.reduce((sum, c) => sum + (c.rating || 0), 0) / data.courses.length).toFixed(1)
    : '0.0'
  const totalEnrolled = data.courses.reduce((sum, c) => sum + (c.enrolled || 0), 0)

  const reportCards = [
    { icon: DollarSign, label: 'إجمالي الإيرادات المكتملة', value: `${completedRevenue.toLocaleString()} ر.ي`, color: 'from-navy to-navy-light', textCol: 'text-gold' },
    { icon: Clock, label: 'إيرادات قيد الانتظار', value: `${pendingRevenue.toLocaleString()} ر.ي`, color: 'from-yellow-500 to-yellow-600', textCol: 'text-white' },
    { icon: BookOpen, label: 'الدورات المدفوعة', value: paidCourses, color: 'from-gold to-gold-light', textCol: 'text-navy' },
    { icon: BookOpen, label: 'الدورات المجانية', value: freeCourses, color: 'from-green-500 to-green-600', textCol: 'text-white' },
    { icon: FileText, label: 'إجمالي الدروس', value: totalLessons, color: 'from-blue-500 to-blue-600', textCol: 'text-white' },
    { icon: CheckCircle2, label: 'تسجيلات مكتملة', value: completedEnrs, color: 'from-purple-500 to-purple-600', textCol: 'text-white' },
    { icon: Users, label: 'إجمالي التسجيلات', value: totalEnrolled, color: 'from-cyan-500 to-cyan-600', textCol: 'text-white' },
    { icon: Star, label: 'متوسط التقييم', value: `${avgRating} / 5`, color: 'from-amber-500 to-orange-500', textCol: 'text-white' },
  ]

  return (
    <SectionCard title="التقارير" description="إحصائيات حقيقية من قاعدة البيانات">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

      {/* Top courses by enrollment */}
      <div className="mt-6">
        <h4 className="font-bold text-navy text-sm mb-3">الدورات الأكثر تسجيلاً</h4>
        <div className="space-y-2">
          {[...data.courses].sort((a, b) => (b.enrolled || 0) - (a.enrolled || 0)).slice(0, 5).map((c, i) => (
            <div key={c.id} className="flex items-center gap-3 p-3 bg-white border border-border rounded-lg">
              <div className="w-8 h-8 rounded-lg bg-navy flex items-center justify-center text-gold font-bold text-sm flex-shrink-0">{i + 1}</div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-navy text-sm truncate">{c.title}</div>
                <div className="text-xs text-muted-foreground">{c.specialization || '-'}</div>
              </div>
              <div className="text-sm font-bold text-navy">{c.enrolled || 0} متدرب</div>
              <Badge className={c.price_type === 'مجانية' || c.price === 0 ? 'bg-green-500/15 text-green-600 border-green-500/30' : 'bg-gold/15 text-gold border-gold/30'}>
                {c.price_type === 'مجانية' || c.price === 0 ? 'مجانية' : `${c.price?.toLocaleString()} ${c.currency || ''}`}
              </Badge>
            </div>
          ))}
          {data.courses.length === 0 && <div className="text-center py-8 text-muted-foreground">لا توجد دورات</div>}
        </div>
      </div>
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
        if (enr.status === 'completed') {
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
                <Input type="number" value={form[f] || ''} onChange={(e) => setForm({ ...form, [f]: parseInt(e.target.value) || 0 })} dir="ltr" className="mt-1" />
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
