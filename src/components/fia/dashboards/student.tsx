'use client'

import { useEffect, useState } from 'react'
import {
  LayoutDashboard, BookOpen, FileText, Award, CreditCard,
  User, Bell, Settings, TrendingUp, Clock, CheckCircle2,
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
import { toast } from 'sonner'

const NAV: NavItem[] = [
  { id: 'overview', label: 'نظرة عامة', icon: LayoutDashboard },
  { id: 'courses', label: 'دوراتي', icon: BookOpen },
  { id: 'exams', label: 'اختباراتي', icon: FileText },
  { id: 'results', label: 'نتائجي', icon: TrendingUp },
  { id: 'certificates', label: 'شهاداتي', icon: Award },
  { id: 'payments', label: 'مدفوعاتي', icon: CreditCard },
  { id: 'profile', label: 'ملفي الشخصي', icon: User },
  { id: 'notifications', label: 'الإشعارات', icon: Bell },
  { id: 'settings', label: 'الإعدادات', icon: Settings },
]

export function StudentDashboard() {
  const [active, setActive] = useState('overview')
  const user = useAuth((s) => s.user)
  const updateUser = useAuth((s) => s.updateUser)
  const [courses, setCourses] = useState<any[]>([])
  const [certificates, setCertificates] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [profile, setProfile] = useState({ name: user?.name || '', phone: user?.phone || '', title: user?.title || '', bio: user?.bio || '' })

  useEffect(() => {
    fetch('/api/courses').then((r) => r.json()).then((d) => setCourses(Array.isArray(d) ? d : [])).catch(() => {})
    fetch('/api/certificates').then((r) => r.json()).then((d) => setCertificates(Array.isArray(d) ? d : [])).catch(() => {})
    fetch('/api/payments').then((r) => r.json()).then((d) => setPayments(Array.isArray(d) ? d : [])).catch(() => {})
  }, [])

  return (
    <DashboardShell
      nav={NAV}
      active={active}
      onNavigate={setActive}
      roleLabel="متدرب"
      roleColor="bg-blue-500/15 text-blue-600 border-blue-500/30"
    >
      {active === 'overview' && <Overview user={user} courses={courses} certificates={certificates} />}
      {active === 'courses' && <MyCourses courses={courses} />}
      {active === 'exams' && <Exams />}
      {active === 'results' && <Results />}
      {active === 'certificates' && <Certificates certificates={certificates} />}
      {active === 'payments' && <Payments payments={payments} />}
      {active === 'profile' && <Profile profile={profile} setProfile={setProfile} user={user} updateUser={updateUser} />}
      {active === 'notifications' && <Notifications />}
      {active === 'settings' && <SettingsTab />}
    </DashboardShell>
  )
}

function Overview({ user, courses, certificates }: any) {
  return (
    <div className="space-y-6">
      <div className="bg-fia-gradient rounded-2xl p-6 lg:p-8 text-white">
        <h2 className="text-2xl font-bold mb-1">أهلاً، {user?.name} 👋</h2>
        <p className="text-white/80">إليك ملخّص نشاطك في أكاديمية المستقبل الدولية</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={BookOpen} label="الدورات المسجّلة" value={3} color="navy" />
        <StatCard icon={CheckCircle2} label="دورات مكتملة" value={1} color="green" />
        <StatCard icon={Clock} label="ساعات التعلّم" value={24} color="gold" />
        <StatCard icon={Award} label="الشهادات المكتسبة" value={certificates.length} color="blue" />
      </div>

      <SectionCard title="تقدّم الدورات" description="متابعة آخر التحديثات في دوراتك">
        <div className="space-y-4">
          {courses.slice(0, 3).map((c: any) => (
            <div key={c.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="font-medium text-navy text-sm">{c.title}</div>
                <span className="text-xs text-muted-foreground">{Math.floor(Math.random() * 80) + 10}%</span>
              </div>
              <Progress value={Math.floor(Math.random() * 80) + 10} className="h-2" />
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="الدورات الموصى بها" description="استكشف المزيد من الدورات">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.slice(3, 6).map((c: any) => (
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

function MyCourses({ courses }: any) {
  return (
    <SectionCard title="دوراتي المسجّلة" description="جميع الدورات التي اشتركت بها">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {courses.map((c: any) => (
          <Card key={c.id} className="overflow-hidden card-hover">
            <div className="h-32 bg-navy relative">
              {c.cover && <img src={c.cover} alt={c.title} className="w-full h-full object-cover" />}
              <div className="absolute top-2 right-2">
                <Badge className="bg-green-500 text-white">قيد التعلّم</Badge>
              </div>
            </div>
            <div className="p-4">
              <h3 className="font-bold text-navy text-sm mb-2 line-clamp-1">{c.title}</h3>
              <Progress value={Math.floor(Math.random() * 90) + 5} className="h-2 mb-2" />
              <div className="flex justify-between text-xs text-muted-foreground mb-3">
                <span>{Math.floor(Math.random() * 90) + 5}% مكتمل</span>
                <span>{c.duration_hours} ساعة</span>
              </div>
              <Button size="sm" className="w-full bg-gold hover:bg-gold-light text-navy">
                متابعة التعلّم
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </SectionCard>
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
  const myCerts = certificates.length > 0 ? certificates : [
    { id: '1', certificate_number: 'FIA-2025-00142', student_name: 'محمد أحمد', course_title: 'BLS & ACLS', issued_at: '2025-09-15', status: 'صالحة' }
  ]
  return (
    <SectionCard title="شهاداتي" description="الشهادات التي حصلت عليها">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {myCerts.map((c: any) => (
          <Card key={c.id} className="p-5 text-center card-hover border-2 border-gold/20">
            <div className="w-16 h-16 mx-auto rounded-full bg-gold/15 flex items-center justify-center mb-3">
              <Award className="w-8 h-8 text-gold" />
            </div>
            <div className="font-bold text-navy text-sm mb-1">{c.course_title}</div>
            <div className="text-xs text-muted-foreground mb-3" dir="ltr">{c.certificate_number}</div>
            <Badge className="bg-green-500/15 text-green-600 border-green-500/30 mb-3">{c.status}</Badge>
            <Button size="sm" variant="outline" className="w-full border-gold/30 text-navy hover:bg-gold/10">
              تحميل PDF
            </Button>
          </Card>
        ))}
      </div>
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
      // Update locally (in real app, would call /api/students PUT)
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
      <div className="space-y-5 max-w-2xl">
        <div className="flex items-center gap-4">
          <Avatar className="w-24 h-24 border-4 border-gold/20">
            <AvatarImage src={user?.avatar || ''} />
            <AvatarFallback className="bg-navy text-gold text-3xl">{user?.name?.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <Button variant="outline" size="sm">تغيير الصورة</Button>
            <p className="text-xs text-muted-foreground mt-2">JPG أو PNG. حد أقصى 2MB.</p>
          </div>
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
