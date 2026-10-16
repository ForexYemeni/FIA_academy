'use client'

import { useEffect, useState } from 'react'
import {
  LayoutDashboard, BookOpen, Users, FileText, User, Bell, Settings,
  Plus, Edit, Trash2, Video, FileUp, Star, ArrowRight, Lock, Mail, CheckCircle2, Eye, EyeOff, Loader2,
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
import { CourseContentManager } from '@/components/fia/course-content-manager'
import { AvatarUploader } from '@/components/fia/avatar-uploader'

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
  const [contentCourseId, setContentCourseId] = useState<string | null>(null)
  const user = useAuth((s) => s.user)
  const updateUser = useAuth((s) => s.updateUser)
  const logout = useAuth((s) => s.logout)
  const [courses, setCourses] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [editing, setEditing] = useState<any | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [profile, setProfile] = useState({ name: user?.name || '', phone: user?.phone || '', title: user?.title || '', bio: user?.bio || '', specialization: user?.title || '' })

  const loadCourses = () => {
    fetch('/api/courses').then((r) => r.json()).then((d) => {
      const all = Array.isArray(d) ? d : []
      // Filter to ONLY this trainer's courses
      const mine = all.filter((c: any) => c.trainer_id === user?.id)
      setCourses(mine)
    }).catch(() => {})
  }
  const loadStudents = () => {
    fetch('/api/students?role=student').then((r) => r.json()).then((d) => setStudents(Array.isArray(d) ? d : [])).catch(() => {})
  }

  useEffect(() => {
    loadCourses()
    loadStudents()
  }, [user?.id])

  const navigateToContent = (courseId: string) => {
    setContentCourseId(courseId)
    setActive('content')
  }

  return (
    <DashboardShell
      nav={NAV}
      active={active}
      onNavigate={(id) => { setActive(id); if (id !== 'content') setContentCourseId(null) }}
      roleLabel="مدرب"
      roleColor="bg-purple-500/15 text-purple-600 border-purple-500/30"
    >
      {active === 'overview' && <TrainerOverview user={user} courses={courses} students={students} />}
      {active === 'courses' && <TrainerCourses courses={courses} onAdd={() => { setEditing(null); setIsDialogOpen(true) }} onEdit={(c) => { setEditing(c); setIsDialogOpen(true) }} onRefresh={loadCourses} onManageContent={navigateToContent} />}
      {active === 'content' && contentCourseId && (
        <div className="space-y-4">
          <Button variant="ghost" onClick={() => setActive('courses')} className="text-navy hover:bg-navy/5">
            <ArrowRight className="w-4 h-4 ml-1" /> العودة للدورات
          </Button>
          <CourseContentManager courseId={contentCourseId} />
        </div>
      )}
      {active === 'students' && <TrainerStudents students={students} courses={courses} />}
      {active === 'exams' && <TrainerExams />}
      {active === 'profile' && <TrainerProfile profile={profile} setProfile={setProfile} user={user} updateUser={updateUser} />}
      {active === 'notifications' && <TrainerNotifs />}
      {active === 'settings' && <TrainerAccountSettings user={user} updateUser={updateUser} logout={logout} />}

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

function TrainerCourses({ courses, onAdd, onEdit, onRefresh, onManageContent }: any) {
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
              <div className="space-y-2">
                <Button size="sm" className="w-full bg-gold hover:bg-gold-light text-navy" onClick={() => onManageContent(c.id)}>
                  <FileText className="w-3.5 h-3.5 ml-1" /> إدارة المحتوى
                </Button>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => onEdit(c)}>
                    <Edit className="w-3.5 h-3.5 ml-1" /> تعديل
                  </Button>
                  <Button size="sm" variant="outline" className="border-red-500/30 text-red-500 hover:bg-red-500/10" onClick={() => handleDelete(c.id)} disabled={deleting === c.id}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
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

function TrainerStudents({ students, courses }: any) {
  const [enrollments, setEnrollments] = useState<any[]>([])

  useEffect(() => {
    fetch('/api/enrollments').then((r) => r.json()).then((d) => {
      const all = Array.isArray(d) ? d : []
      // Filter to ONLY enrollments in this trainer's courses
      const trainerCourseIds = courses.map((c: any) => c.id)
      const mine = all.filter((e: any) => trainerCourseIds.includes(e.course_id))
      setEnrollments(mine)
    }).catch(() => {})
  }, [courses])

  // Helper: get all enrollments for a student
  const studentEnrollments = (studentId: string) => enrollments.filter((e) => e.user_id === studentId)

  return (
    <SectionCard title="متدربوّ" description={`${students.length} متدرب${students.length === 1 ? '' : 'ين'}`}>
      {courses.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">لا يوجد متدربون — أنشئ دورة أولاً</p>
        </div>
      ) : students.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">لا يوجد متدربون بعد</p>
        </div>
      ) : (
        <div className="space-y-4">
          {students.map((s: any) => {
            const studentEnrs = studentEnrollments(s.id)
            return (
              <Card key={s.id} className="overflow-hidden">
                <div className="p-4 bg-muted/30 border-b border-border">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-gold/30 bg-navy flex items-center justify-center text-gold font-bold text-lg flex-shrink-0">
                      {s.avatar ? (
                        <img src={s.avatar} alt={s.name} className="w-full h-full object-cover" />
                      ) : (
                        s.name?.charAt(0)
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-navy">{s.name}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-3 flex-wrap">
                        <span dir="ltr">{s.email}</span>
                        {s.phone && <span dir="ltr">{s.phone}</span>}
                        <span>تسجيل: {s.created_at ? new Date(s.created_at).toLocaleDateString('ar-EG') : '-'}</span>
                      </div>
                    </div>
                    <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/30">
                      {studentEnrs.length} دورة
                    </Badge>
                  </div>
                </div>
                <div className="p-4">
                  {studentEnrs.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">لم يسجّل في أي دورة بعد</p>
                  ) : (
                    <div className="space-y-2">
                      {studentEnrs.map((e) => {
                        const course = courses?.find((c: any) => c.id === e.course_id)
                        if (!course) return null
                        const isFree = course.price_type === 'مجانية' || course.price === 0
                        return (
                          <div key={e.id} className="flex items-center justify-between p-3 bg-white border border-border rounded-lg">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-lg bg-navy flex items-center justify-center flex-shrink-0">
                                <BookOpen className="w-5 h-5 text-gold" />
                              </div>
                              <div className="min-w-0">
                                <div className="font-medium text-navy text-sm truncate">{course.title}</div>
                                <div className="text-xs text-muted-foreground">
                                  {course.lessons_count || 0} درس
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <Badge className={isFree ? 'bg-green-500/15 text-green-600 border-green-500/30' : 'bg-gold/15 text-gold border-gold/30'}>
                                {isFree ? 'مجانية' : 'مدفوعة'}
                              </Badge>
                              <Badge variant="outline" className={
                                e.status === 'completed' ? 'border-green-500/30 text-green-600'
                                : e.payment_status === 'pending' ? 'border-yellow-500/30 text-yellow-600'
                                : 'border-blue-500/30 text-blue-600'
                              }>
                                {e.status === 'completed' ? 'مكتملة' : e.payment_status === 'pending' ? 'بانتظار الدفع' : 'قيد التعلّم'}
                              </Badge>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}
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

function TrainerProfile({ profile, setProfile, user, updateUser }: any) {
  const [loading, setLoading] = useState(false)

  const save = async () => {
    setLoading(true)
    try {
      // Update locally — in real app this would also call /api/trainers PUT
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
    <SectionCard title="الملف الشخصي" description="إدارة معلوماتك">
      <div className="space-y-6 max-w-2xl">
        <div className="flex flex-col items-center gap-4 p-4 bg-muted/30 rounded-lg border border-border">
          <AvatarUploader
            userId={user.id}
            role="trainer"
            initialUrl={user?.avatar}
            name={user?.name}
            size="xl"
            onUploaded={(url) => updateUser({ avatar: url })}
          />
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
            <Label>البريد الإلكتروني</Label>
            <Input value={user?.email || ''} disabled dir="ltr" className="mt-1" />
          </div>
          <div>
            <Label>الهاتف</Label>
            <Input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} dir="ltr" className="mt-1" />
          </div>
        </div>
        <div>
          <Label>المسمى الوظيفي</Label>
          <Input value={profile.title} onChange={(e) => setProfile({ ...profile, title: e.target.value })} className="mt-1" />
        </div>
        <div>
          <Label>النبذة التعريفية</Label>
          <Textarea value={profile.bio} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} rows={4} className="mt-1" />
        </div>
        <Button onClick={save} disabled={loading} className="bg-navy hover:bg-navy-light">
          {loading ? 'جاري الحفظ...' : 'حفظ التغييرات'}
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
          {loading ? <><Loader2 className="w-4 h-4 ml-1 animate-spin" /> جاري الحفظ...</> : 'حفظ التغييرات'}
        </Button>
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
