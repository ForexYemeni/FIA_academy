'use client'

import { useEffect, useState } from 'react'
import {
  LayoutDashboard, BookOpen, Users, FileText, User, Bell, Settings,
  Plus, Edit, Trash2, Video, FileUp, Star,
} from 'lucide-react'
import { DashboardShell, StatCard, SectionCard, NavItem } from './shell'
import { useAuth } from '@/lib/auth-store'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from 'sonner'

const NAV: NavItem[] = [
  { id: 'overview', label: 'نظرة عامة', icon: LayoutDashboard },
  { id: 'courses', label: 'دوراتي التدريبية', icon: BookOpen },
  { id: 'students', label: 'متدربوّ', icon: Users },
  { id: 'exams', label: 'الاختبارات', icon: FileText },
  { id: 'profile', label: 'ملفي الشخصي', icon: User },
  { id: 'notifications', label: 'الإشعارات', icon: Bell },
  { id: 'settings', label: 'الإعدادات', icon: Settings },
]

export function TrainerDashboard() {
  const [active, setActive] = useState('overview')
  const user = useAuth((s) => s.user)
  const [courses, setCourses] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [editing, setEditing] = useState<any | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [profile, setProfile] = useState({ name: user?.name || '', phone: user?.phone || '', title: user?.title || '', bio: user?.bio || '', specialization: '' })

  const loadCourses = () => {
    fetch('/api/courses').then((r) => r.json()).then((d) => setCourses(Array.isArray(d) ? d : [])).catch(() => {})
  }
  const loadStudents = () => {
    fetch('/api/students?role=student').then((r) => r.json()).then((d) => setStudents(Array.isArray(d) ? d : [])).catch(() => {})
  }

  useEffect(() => {
    loadCourses()
    loadStudents()
  }, [])

  return (
    <DashboardShell
      nav={NAV}
      active={active}
      onNavigate={setActive}
      roleLabel="مدرب"
      roleColor="bg-purple-500/15 text-purple-600 border-purple-500/30"
    >
      {active === 'overview' && <TrainerOverview user={user} courses={courses} students={students} />}
      {active === 'courses' && <TrainerCourses courses={courses} onAdd={() => { setEditing(null); setIsDialogOpen(true) }} onEdit={(c) => { setEditing(c); setIsDialogOpen(true) }} onRefresh={loadCourses} />}
      {active === 'students' && <TrainerStudents students={students} />}
      {active === 'exams' && <TrainerExams />}
      {active === 'profile' && <TrainerProfile profile={profile} setProfile={setProfile} user={user} />}
      {active === 'notifications' && <TrainerNotifs />}
      {active === 'settings' && <TrainerSettings />}

      {isDialogOpen && (
        <CourseDialog
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

function TrainerOverview({ user, courses, students }: any) {
  return (
    <div className="space-y-6">
      <div className="bg-fia-gradient rounded-2xl p-6 lg:p-8 text-white">
        <h2 className="text-2xl font-bold mb-1">مرحباً، {user?.name} 👋</h2>
        <p className="text-white/80">نظرة عامة على نشاطك التدريبي</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={BookOpen} label="الدورات التدريبية" value={courses.length} color="navy" />
        <StatCard icon={Users} label="إجمالي المتدربين" value={students.length || 542} color="gold" />
        <StatCard icon={Star} label="متوسط التقييم" value="4.8" color="green" />
        <StatCard icon={FileText} label="الاختبارات النشطة" value={3} color="blue" />
      </div>

      <SectionCard title="أحدث الدورات" description="الدورات التي تدرّسها">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.slice(0, 3).map((c: any) => (
            <Card key={c.id} className="overflow-hidden card-hover">
              <div className="h-32 bg-navy">
                {c.cover && <img src={c.cover} alt={c.title} className="w-full h-full object-cover" />}
              </div>
              <div className="p-4">
                <h3 className="font-bold text-navy text-sm mb-1 line-clamp-1">{c.title}</h3>
                <div className="text-xs text-muted-foreground">{c.enrolled || 0} متدرب • {c.rating || 0} ⭐</div>
              </div>
            </Card>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}

function TrainerCourses({ courses, onAdd, onEdit, onRefresh }: any) {
  const [deleting, setDeleting] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الدورة؟')) return
    setDeleting(id)
    try {
      const res = await fetch('/api/courses', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (res.ok) {
        toast.success('تم حذف الدورة')
        onRefresh()
      } else {
        toast.error('فشل الحذف')
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
        <Button onClick={onAdd} className="bg-navy hover:bg-navy-light">
          <Plus className="w-4 h-4 ml-1" /> دورة جديدة
        </Button>
      }
    >
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {courses.map((c: any) => (
          <Card key={c.id} className="overflow-hidden card-hover">
            <div className="h-32 bg-navy relative">
              {c.cover && <img src={c.cover} alt={c.title} className="w-full h-full object-cover" />}
              <Badge className="absolute top-2 right-2 bg-navy/80 text-gold border-gold/30">{c.level}</Badge>
            </div>
            <div className="p-4">
              <h3 className="font-bold text-navy text-sm mb-2 line-clamp-1">{c.title}</h3>
              <div className="flex justify-between text-xs text-muted-foreground mb-3">
                <span>{c.enrolled || 0} متدرب</span>
                <span>{c.price_type === 'مجانية' ? 'مجانية' : `${c.price.toLocaleString()} ${c.currency || 'ر.ي'}`}</span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => onEdit(c)}>
                  <Edit className="w-3.5 h-3.5 ml-1" /> تعديل
                </Button>
                <Button size="sm" variant="outline" className="border-red-500/30 text-red-500 hover:bg-red-500/10" onClick={() => handleDelete(c.id)} disabled={deleting === c.id}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
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

  const handleUploadCover = async (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('folder', 'courses')
    const res = await fetch('/api/upload/image', { method: 'POST', body: fd })
    const data = await res.json()
    if (data.url) {
      setForm({ ...form, cover: data.url })
      toast.success('تم رفع الصورة')
    } else {
      toast.error('فشل رفع الصورة')
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
      const body = {
        ...form,
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
        onSaved()
      } else {
        toast.error('فشل الحفظ')
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
              <select
                value={form.level}
                onChange={(e) => setForm({ ...form, level: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-input rounded-md bg-background"
              >
                <option value="مبتدئ">مبتدئ</option>
                <option value="متوسط">متوسط</option>
                <option value="متقدم">متقدم</option>
              </select>
            </div>
            <div>
              <Label>السعر</Label>
              <select
                value={form.price_type}
                onChange={(e) => setForm({ ...form, price_type: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-input rounded-md bg-background"
              >
                <option value="مجانية">مجانية</option>
                <option value="مدفوعة">مدفوعة</option>
              </select>
            </div>
          </div>
          {form.price_type === 'مدفوعة' && (
            <div>
              <Label>المبلغ</Label>
              <Input type="number" value={form.price || 0} onChange={(e) => setForm({ ...form, price: parseInt(e.target.value) || 0 })} className="mt-1" dir="ltr" />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>عدد الساعات</Label>
              <Input type="number" value={form.duration_hours || 0} onChange={(e) => setForm({ ...form, duration_hours: parseInt(e.target.value) || 0 })} className="mt-1" dir="ltr" />
            </div>
            <div>
              <Label>درجة النجاح (%)</Label>
              <Input type="number" value={form.pass_score || 60} onChange={(e) => setForm({ ...form, pass_score: parseInt(e.target.value) || 60 })} className="mt-1" dir="ltr" />
            </div>
          </div>
          <div>
            <Label>صورة الغلاف</Label>
            <div className="flex items-center gap-3 mt-1">
              {form.cover && <img src={form.cover} alt="cover" className="w-16 h-16 object-cover rounded-md" />}
              <label className="cursor-pointer">
                <Button variant="outline" type="button" onClick={() => document.getElementById('cover-upload')?.click()}>
                  <FileUp className="w-4 h-4 ml-1" /> رفع صورة
                </Button>
                <input
                  id="cover-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadCover(f) }}
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

function TrainerStudents({ students }: any) {
  return (
    <SectionCard title="متدربوّ" description="قائمة بالمتدربين في دوراتك">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-right text-muted-foreground">
              <th className="py-3 px-2">المتدرب</th>
              <th className="py-3 px-2">البريد</th>
              <th className="py-3 px-2">الهاتف</th>
              <th className="py-3 px-2">تاريخ التسجيل</th>
            </tr>
          </thead>
          <tbody>
            {students.length > 0 ? students.map((s: any) => (
              <tr key={s.id} className="border-b border-border">
                <td className="py-3 px-2">
                  <div className="flex items-center gap-2">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={s.avatar || ''} />
                      <AvatarFallback className="bg-navy text-gold text-xs">{s.name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-navy">{s.name}</span>
                  </div>
                </td>
                <td className="py-3 px-2" dir="ltr">{s.email}</td>
                <td className="py-3 px-2" dir="ltr">{s.phone || '-'}</td>
                <td className="py-3 px-2 text-muted-foreground" dir="ltr">{s.created_at ? new Date(s.created_at).toLocaleDateString('ar-EG') : '-'}</td>
              </tr>
            )) : (
              <tr><td colSpan={4} className="text-center py-8 text-muted-foreground">لا يوجد متدربون بعد</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </SectionCard>
  )
}

function TrainerExams() {
  return (
    <SectionCard title="الاختبارات" description="إدارة اختبارات دوراتك">
      <div className="text-center py-12">
        <FileText className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
        <p className="text-muted-foreground mb-4">لم تنشئ أي اختبار بعد</p>
        <Button className="bg-navy hover:bg-navy-light">
          <Plus className="w-4 h-4 ml-1" /> اختبار جديد
        </Button>
      </div>
    </SectionCard>
  )
}

function TrainerProfile({ profile, setProfile, user }: any) {
  return (
    <SectionCard title="الملف الشخصي" description="إدارة معلوماتك">
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
            <Label>الاسم الكامل</Label>
            <Input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} className="mt-1" />
          </div>
          <div>
            <Label>التخصص</Label>
            <Input value={profile.specialization} onChange={(e) => setProfile({ ...profile, specialization: e.target.value })} className="mt-1" />
          </div>
          <div>
            <Label>البريد</Label>
            <Input value={user?.email || ''} disabled dir="ltr" className="mt-1" />
          </div>
          <div>
            <Label>الهاتف</Label>
            <Input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} dir="ltr" className="mt-1" />
          </div>
        </div>
        <div>
          <Label>النبذة التعريفية</Label>
          <Textarea value={profile.bio} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} rows={4} className="mt-1" />
        </div>
        <Button className="bg-navy hover:bg-navy-light">حفظ التغييرات</Button>
      </div>
    </SectionCard>
  )
}

function TrainerNotifs() {
  return (
    <SectionCard title="الإشعارات" description="إشعاراتك">
      <div className="space-y-3">
        <div className="p-4 bg-gold/5 border border-gold/20 rounded-lg">
          <div className="font-semibold text-navy text-sm">متدرب جديد في دورتك</div>
          <div className="text-xs text-muted-foreground mt-1">انضم أحمد محمد إلى دورة BLS & ACLS</div>
        </div>
        <div className="p-4 bg-muted/30 border border-border rounded-lg">
          <div className="font-semibold text-navy text-sm">تم تسليم نتائج الاختبار</div>
          <div className="text-xs text-muted-foreground mt-1">12 متدرب اجتازوا اختبار الوحدة الأولى</div>
        </div>
      </div>
    </SectionCard>
  )
}

function TrainerSettings() {
  return (
    <SectionCard title="الإعدادات" description="إعدادات حسابك">
      <div className="space-y-6 max-w-2xl">
        <Button variant="outline">تغيير كلمة المرور</Button>
      </div>
    </SectionCard>
  )
}
