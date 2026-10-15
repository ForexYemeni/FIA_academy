'use client'

import { useEffect, useState } from 'react'
import {
  LayoutDashboard, BookOpen, FileText, Users, CreditCard,
  Award, GraduationCap, Building2, Shield, UserCog, Settings,
  BarChart3, ScrollText, Plus, Edit, Trash2, Eye, EyeOff,
  DollarSign, TrendingUp, Activity, Star, ArrowRight,
  Lock, Mail, CheckCircle2, User,
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
  const [stats, setStats] = useState({ courses: 0, trainers: 0, students: 0, payments: 0 })

  useEffect(() => {
    Promise.all([
      fetch('/api/courses').then((r) => r.json()),
      fetch('/api/trainers').then((r) => r.json()),
      fetch('/api/students').then((r) => r.json()),
      fetch('/api/payments').then((r) => r.json()),
    ]).then(([c, t, s, p]) => {
      setStats({
        courses: Array.isArray(c) ? c.length : 0,
        trainers: Array.isArray(t) ? t.length : 0,
        students: Array.isArray(s) ? s.length : 0,
        payments: Array.isArray(p) ? p.length : 0,
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

      <SectionCard title="نظرة عامة مالية" description="ملخّص الإيرادات والأداء">
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-navy to-navy-light text-white p-5 rounded-xl">
            <DollarSign className="w-6 h-6 text-gold mb-2" />
            <div className="text-2xl font-bold">2,450,000 ر.ي</div>
            <div className="text-white/70 text-sm">إجمالي الإيرادات</div>
          </div>
          <div className="bg-gradient-to-br from-gold to-gold-light text-navy p-5 rounded-xl">
            <TrendingUp className="w-6 h-6 mb-2" />
            <div className="text-2xl font-bold">+18%</div>
            <div className="text-navy/70 text-sm">نمو شهري</div>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-5 rounded-xl">
            <Activity className="w-6 h-6 mb-2" />
            <div className="text-2xl font-bold">542</div>
            <div className="text-white/80 text-sm">متدرب نشط</div>
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
  useEffect(() => {
    fetch('/api/students?role=student').then((r) => r.json()).then((d) => setItems(Array.isArray(d) ? d : []))
  }, [])
  const del = async (id: string) => {
    if (!confirm('حذف المتدرب؟')) return
    await fetch('/api/students', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    toast.success('تم الحذف')
    setItems(items.filter((s) => s.id !== id))
  }
  return (
    <SectionCard title="المتدربون" description={`${items.length} متدرب`}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-right text-muted-foreground">
              <th className="py-3 px-2">الاسم</th>
              <th className="py-3 px-2">البريد</th>
              <th className="py-3 px-2">الهاتف</th>
              <th className="py-3 px-2">التسجيل</th>
              <th className="py-3 px-2"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((s) => (
              <tr key={s.id} className="border-b border-border">
                <td className="py-3 px-2 font-medium text-navy">{s.name}</td>
                <td className="py-3 px-2" dir="ltr">{s.email}</td>
                <td className="py-3 px-2" dir="ltr">{s.phone || '-'}</td>
                <td className="py-3 px-2 text-muted-foreground" dir="ltr">{s.created_at ? new Date(s.created_at).toLocaleDateString('ar-EG') : '-'}</td>
                <td className="py-3 px-2"><Button size="icon" variant="ghost" onClick={() => del(s.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  )
}

function AdminPayments() {
  const [items, setItems] = useState<any[]>([])
  useEffect(() => { fetch('/api/payments').then((r) => r.json()).then((d) => setItems(Array.isArray(d) ? d : [])) }, [])
  const updateStatus = async (id: string, status: string) => {
    await fetch('/api/payments', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) })
    toast.success('تم التحديث')
    setItems(items.map((p) => (p.id === id ? { ...p, status } : p)))
  }
  return (
    <SectionCard title="المدفوعات" description={`${items.length} معاملة`}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-right text-muted-foreground">
              <th className="py-3 px-2">المبلغ</th>
              <th className="py-3 px-2">الطريقة</th>
              <th className="py-3 px-2">المرجع</th>
              <th className="py-3 px-2">التاريخ</th>
              <th className="py-3 px-2">الحالة</th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id} className="border-b border-border">
                <td className="py-3 px-2 font-bold text-navy">{p.amount.toLocaleString()} {p.currency || 'ر.ي'}</td>
                <td className="py-3 px-2">{p.method || '-'}</td>
                <td className="py-3 px-2 font-mono" dir="ltr">{p.reference || '-'}</td>
                <td className="py-3 px-2 text-muted-foreground" dir="ltr">{p.date ? new Date(p.date).toLocaleDateString('ar-EG') : '-'}</td>
                <td className="py-3 px-2">
                  <select
                    value={p.status}
                    onChange={(e) => updateStatus(p.id, e.target.value)}
                    className="px-2 py-1 border border-input rounded text-xs bg-background"
                  >
                    <option value="قيد الانتظار">قيد الانتظار</option>
                    <option value="مكتمل">مكتمل</option>
                    <option value="ملغي">ملغي</option>
                  </select>
                </td>
              </tr>
            ))}
            {!items.length && <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">لا توجد مدفوعات</td></tr>}
          </tbody>
        </table>
      </div>
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
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const load = () => fetch('/api/certificates').then((r) => r.json()).then((d) => setItems(Array.isArray(d) ? d : []))
  useEffect(() => { load() }, [])
  const del = async (id: string) => {
    if (!confirm('حذف؟')) return
    await fetch('/api/certificates', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    toast.success('تم الحذف'); load()
  }
  return (
    <SectionCard
      title="الشهادات"
      description={`${items.length} شهادة`}
      action={<Button className="bg-navy hover:bg-navy-light" onClick={() => { setEditing(null); setOpen(true) }}><Plus className="w-4 h-4 ml-1" /> جديد</Button>}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-right text-muted-foreground">
              <th className="py-3 px-2">رقم الشهادة</th>
              <th className="py-3 px-2">المتدرب</th>
              <th className="py-3 px-2">الدورة</th>
              <th className="py-3 px-2">الحالة</th>
              <th className="py-3 px-2"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id} className="border-b border-border">
                <td className="py-3 px-2 font-mono text-gold" dir="ltr">{c.certificate_number}</td>
                <td className="py-3 px-2 font-medium text-navy">{c.student_name}</td>
                <td className="py-3 px-2">{c.course_title || '-'}</td>
                <td className="py-3 px-2"><Badge className="bg-green-500/15 text-green-600 border-green-500/30">{c.status}</Badge></td>
                <td className="py-3 px-2">
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(c); setOpen(true) }}><Edit className="w-4 h-4 text-navy" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => del(c.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                  </div>
                </td>
              </tr>
            ))}
            {!items.length && <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">لا توجد شهادات</td></tr>}
          </tbody>
        </table>
      </div>
      {open && <SimpleDialog open={open} onOpenChange={setOpen} title={editing ? 'تعديل' : 'إضافة'} onSaved={load} initial={editing} fields={['student_name', 'course_title', 'status', 'issued_by', 'external_accreditation_body']} apiPath="/api/certificates" />}
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
        {items.map((t) => (
          <Card key={t.id} className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <Avatar className="w-14 h-14 border-2 border-gold/30">
                <AvatarImage src={t.avatar || ''} />
                <AvatarFallback className="bg-navy text-gold">{t.name?.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <div className="font-bold text-navy">{t.name}</div>
                <div className="text-xs text-gold">{t.title}</div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground mb-3">{t.specialization}</div>
            <div className="text-xs space-y-1 mb-3">
              <div className="text-muted-foreground" dir="ltr">📧 {t.email}</div>
              <div className="text-muted-foreground" dir="ltr">📞 {t.phone || '-'}</div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1" onClick={() => { setEditing(t); setOpen(true) }}><Edit className="w-3.5 h-3.5 ml-1" /> تعديل</Button>
              <Button size="sm" variant="outline" className="border-red-500/30 text-red-500 hover:bg-red-500/10" onClick={() => del(t.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
            </div>
          </Card>
        ))}
      </div>
      {open && <TrainerDialog open={open} onOpenChange={setOpen} initial={editing} onSaved={load} />}
    </SectionCard>
  )
}

function TrainerDialog({ open, onOpenChange, initial, onSaved }: any) {
  const [form, setForm] = useState<any>(
    initial || { name: '', title: '', specialization: '', bio: '', email: '', password: '', phone: '', avatar: '', courses_count: 0, years_experience: 0 }
  )
  const [saving, setSaving] = useState(false)
  const [showPwd, setShowPwd] = useState(false)

  // Reset form when initial changes
  useEffect(() => {
    setForm(initial || { name: '', title: '', specialization: '', bio: '', email: '', password: '', phone: '', avatar: '', courses_count: 0, years_experience: 0 })
  }, [initial])

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{initial ? 'تعديل مدرب' : 'إضافة مدرب'}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div><Label>الاسم *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1" /></div>
            <div><Label>التخصص</Label><Input value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} className="mt-1" /></div>
          </div>
          <div><Label>المسمى</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1" /></div>
          <div><Label>البريد *</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} dir="ltr" className="mt-1" /></div>
          <div>
            <Label>كلمة المرور {initial && '(اتركها فارغة للإبقاء عليها)'}</Label>
            <div className="relative mt-1">
              <Input type={showPwd ? 'text' : 'password'} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} dir="ltr" />
              <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><Label>الهاتف</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} dir="ltr" className="mt-1" /></div>
            <div><Label>رابط الصورة</Label><Input value={form.avatar} onChange={(e) => setForm({ ...form, avatar: e.target.value })} dir="ltr" className="mt-1" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>عدد الدورات</Label><Input type="number" value={form.courses_count || 0} onChange={(e) => setForm({ ...form, courses_count: parseInt(e.target.value) || 0 })} dir="ltr" className="mt-1" /></div>
            <div><Label>سنوات الخبرة</Label><Input type="number" value={form.years_experience || 0} onChange={(e) => setForm({ ...form, years_experience: parseInt(e.target.value) || 0 })} dir="ltr" className="mt-1" /></div>
          </div>
          <div><Label>النبذة</Label><Textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={3} className="mt-1" /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button onClick={save} disabled={saving} className="bg-navy hover:bg-navy-light">{saving ? 'جاري...' : 'حفظ'}</Button>
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
  const del = async (id: string) => {
    if (!confirm('حذف؟')) return
    await fetch('/api/partners', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    toast.success('تم الحذف'); load()
  }
  return (
    <SectionCard
      title="الشركاء"
      description={`${items.length} شريك`}
      action={<Button className="bg-navy hover:bg-navy-light" onClick={() => { setEditing(null); setOpen(true) }}><Plus className="w-4 h-4 ml-1" /> جديد</Button>}
    >
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
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1" onClick={() => { setEditing(p); setOpen(true) }}><Edit className="w-3.5 h-3.5 ml-1" /> تعديل</Button>
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
  const del = async (id: string) => {
    if (!confirm('حذف؟')) return
    await fetch('/api/licenses', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    toast.success('تم الحذف'); load()
  }
  return (
    <SectionCard
      title="التراخيص"
      description={`${items.length} ترخيص`}
      action={<Button className="bg-navy hover:bg-navy-light" onClick={() => { setEditing(null); setOpen(true) }}><Plus className="w-4 h-4 ml-1" /> جديد</Button>}
    >
      <div className="grid md:grid-cols-2 gap-4">
        {items.map((l) => (
          <Card key={l.id} className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="font-bold text-navy">{l.issuing_body}</div>
                <div className="text-xs text-gold">{l.type}</div>
              </div>
              <Badge className="bg-green-500/15 text-green-600 border-green-500/30">{l.status}</Badge>
            </div>
            <div className="text-xs text-muted-foreground mb-2">رقم: <span className="font-mono text-gold" dir="ltr">{l.number}</span></div>
            <div className="flex justify-between text-xs text-muted-foreground mb-3">
              <span>إصدار: <span dir="ltr">{l.issued_at}</span></span>
              <span>انتهاء: <span dir="ltr">{l.expires_at}</span></span>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1" onClick={() => { setEditing(l); setOpen(true) }}><Edit className="w-3.5 h-3.5 ml-1" /> تعديل</Button>
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
  return (
    <SectionCard title="التقارير" description="تقارير الأداء والإحصائيات">
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-navy flex items-center justify-center"><TrendingUp className="w-5 h-5 text-gold" /></div>
            <div><div className="font-bold text-navy">نمو الإيرادات</div><div className="text-xs text-muted-foreground">آخر 6 أشهر</div></div>
          </div>
          <div className="text-2xl font-extrabold text-navy mb-1">+18%</div>
          <div className="text-xs text-green-600">↑ 2,450,000 ر.ي</div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-gold flex items-center justify-center"><Star className="w-5 h-5 text-navy" /></div>
            <div><div className="font-bold text-navy">رضا المتدربين</div><div className="text-xs text-muted-foreground">متوسط التقييم</div></div>
          </div>
          <div className="text-2xl font-extrabold text-navy mb-1">4.8 / 5</div>
          <div className="text-xs text-muted-foreground">من 542 تقييم</div>
        </Card>
      </div>
    </SectionCard>
  )
}

function AdminLogs() {
  const logs = [
    { action: 'تسجيل دخول المدير', time: '2025-10-15 10:30', user: 'admin@fia.edu' },
    { action: 'إضافة دورة جديدة', time: '2025-10-15 09:15', user: 'admin@fia.edu' },
    { action: 'تعديل بيانات مدرب', time: '2025-10-14 14:20', user: 'admin@fia.edu' },
    { action: 'حذف طريقة دفع', time: '2025-10-14 11:00', user: 'admin@fia.edu' },
  ]
  return (
    <SectionCard title="سجل العمليات" description="آخر النشاطات في النظام">
      <div className="space-y-2">
        {logs.map((l, i) => (
          <div key={i} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-navy flex items-center justify-center"><ScrollText className="w-4 h-4 text-gold" /></div>
              <div>
                <div className="text-sm font-medium text-navy">{l.action}</div>
                <div className="text-xs text-muted-foreground" dir="ltr">{l.user}</div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground" dir="ltr">{l.time}</div>
          </div>
        ))}
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
