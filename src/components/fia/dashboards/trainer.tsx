'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  LayoutDashboard, BookOpen, Users, FileText, User, Bell, Settings,
  Plus, Edit, Trash2, Video, FileUp, Star, ArrowRight, Lock, Mail, CheckCircle2, Eye, EyeOff, Loader2,
  HelpCircle, UserPlus, X, AlertTriangle, MessageSquare, Newspaper, Gift,
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from 'sonner'
import { CourseContentManager } from '@/components/fia/course-content-manager'
import { AvatarUploader } from '@/components/fia/avatar-uploader'
import { SharedForum, SharedBlog, SharedFAQ } from './shared-community'
import { AffiliateDashboard } from '@/components/fia/affiliate-dashboard'
import { CourseDialog as ProCourseDialog } from '@/components/fia/course-dialog'
import { supabasePublic } from '@/lib/supabase'

const NAV: NavItem[] = [
  { id: 'overview', label: 'نظرة عامة', icon: LayoutDashboard },
  { id: 'courses', label: 'دوراتي التدريبية', icon: BookOpen },
  { id: 'students', label: 'متدربوّ', icon: Users },
  { id: 'exams', label: 'الاختبارات', icon: FileText },
  { id: 'forum', label: 'المنتدى', icon: MessageSquare },
  { id: 'blog', label: 'المدونة', icon: Newspaper },
  { id: 'faqs', label: 'الأسئلة الشائعة', icon: HelpCircle },
  { id: 'affiliate', label: 'برنامج العمولة', icon: Gift },
  { id: 'profile', label: 'ملفي الشخصي', icon: User },
  { id: 'notifications', label: 'الإشعارات', icon: Bell },
  { id: 'settings', label: 'الإعدادات', icon: Settings },
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

  return (
    <DashboardShell
      nav={NAV}
      active={active}
      onNavigate={(id) => { setActive(id); if (id !== 'content') setContentCourseId(null) }}
      roleLabel="مدرب"
      roleColor="bg-green-500/15 text-green-600 border-green-500/30"
    >
      {active === 'overview' && <TrainerOverview user={user} courses={courses} students={myStudents} />}
      {active === 'courses' && <TrainerCourses courses={courses} onAdd={() => { setEditing(null); setIsDialogOpen(true) }} onEdit={(c) => { setEditing(c); setIsDialogOpen(true) }} onRefresh={loadCourses} onManageContent={navigateToContent} />}
      {active === 'content' && contentCourseId && (
        <div className="space-y-4">
          <Button variant="ghost" onClick={() => setActive('courses')} className="text-navy hover:bg-navy/5">
            <ArrowRight className="w-4 h-4 ml-1" /> العودة للدورات
          </Button>
          <CourseContentManager courseId={contentCourseId} />
        </div>
      )}
      {active === 'students' && <TrainerStudents students={myStudents} courses={courses} />}
      {active === 'exams' && <TrainerExams courses={courses} />}
      {active === 'forum' && <SharedForum user={user} />}
      {active === 'blog' && <SharedBlog />}
      {active === 'faqs' && <SharedFAQ />}
      {active === 'affiliate' && (
        <SectionCard title="برنامج العمولة" description="شارك أصدقاءك واكسب عمولة">
          <AffiliateDashboard />
        </SectionCard>
      )}
      {active === 'profile' && <TrainerProfile profile={profile} setProfile={setProfile} user={user} updateUser={updateUser} refreshProfile={refreshTrainerProfile} />}
      {active === 'notifications' && <TrainerNotifs courses={courses} />}
      {active === 'settings' && <TrainerAccountSettings user={user} updateUser={updateUser} logout={logout} />}

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

function TrainerOverview({ user, courses, students }: any) {
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
      <div className="bg-fia-gradient rounded-2xl p-6 lg:p-8 text-white">
        <h2 className="text-2xl font-bold mb-1">مرحباً، {user?.name} 👋</h2>
        <p className="text-white/80">نظرة عامة على نشاطك التدريبي</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={BookOpen} label="الدورات التدريبية" value={courses.length} color="navy" />
        <StatCard icon={Users} label="إجمالي المتدربين" value={String(students.length)} color="gold" />
        <StatCard icon={Star} label="متوسط التقييم" value={avgRating} color="green" />
        <StatCard
          icon={FileText}
          label="الاختبارات النشطة"
          value={examsLoading ? '—' : examsCount}
          color="blue"
        />
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
  // Course currently awaiting delete confirmation. Null means the dialog is closed.
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)

  const handleDelete = async () => {
    if (!deleteTarget) return
    const id = deleteTarget.id
    setDeleting(id)
    try {
      const res = await fetch('/api/courses', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (res.ok) {
        toast.success('تم حذف الدورة')
        setDeleteTarget(null)
        onRefresh()
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
                  <Button size="sm" variant="outline" className="border-red-500/30 text-red-500 hover:bg-red-500/10" onClick={() => setDeleteTarget(c)} disabled={deleting === c.id}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

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

  useEffect(() => {
    fetch('/api/enrollments').then((r) => r.json()).then((d) => {
      const all = Array.isArray(d) ? d : []
      // Filter to ONLY enrollments in this trainer's courses
      const trainerCourseIds = courses.map((c: any) => c.id)
      const mine = all.filter((e: any) => trainerCourseIds.includes(e.course_id))
      setEnrollments(mine)
      setEnrollmentsLoaded(true)
    }).catch(() => setEnrollmentsLoaded(true))
  }, [courses])

  // Helper: get all enrollments for a student
  const studentEnrollments = (studentId: string) => enrollments.filter((e) => e.user_id === studentId)

  // Filter students to ONLY those enrolled in at least one of this trainer's courses.
  // The `enrollments` state is already scoped to the trainer's course IDs, so its
  // user_id values are exactly the students we want to show.
  const enrolledStudentIds = new Set(enrollments.map((e: any) => e.user_id))
  const filteredStudents = students.filter((s: any) => enrolledStudentIds.has(s.id))

  return (
    <SectionCard title="متدربوّ" description={`${filteredStudents.length} متدرب${filteredStudents.length === 1 ? '' : 'ين'}`}>
      {courses.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">لا يوجد متدربون — أنشئ دورة أولاً</p>
        </div>
      ) : !enrollmentsLoaded ? (
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3 animate-spin" />
          <p className="text-muted-foreground">جاري تحميل المتدربين...</p>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">لا يوجد متدربون في دوراتك بعد</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredStudents.map((s: any) => {
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
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard icon={FileText} label="الاختبارات" value={exams.length} color="blue" />
        <StatCard icon={HelpCircle} label="إجمالي الأسئلة" value={totalQuestions} color="navy" />
        <StatCard icon={BookOpen} label="دورات بها اختبارات" value={totalCoursesWithExams} color="gold" />
      </div>

      <SectionCard
        title="الاختبارات"
        description="الاختبارات المستندة إلى محتوى دوراتك التدريبية"
      >
        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 text-navy mx-auto mb-3 animate-spin" />
            <p className="text-muted-foreground text-sm">جاري تحميل الاختبارات...</p>
          </div>
        ) : exams.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground mb-2">لا توجد اختبارات بعد</p>
            <p className="text-xs text-muted-foreground">
              أنشئ دروساً من نوع "اختبار" في محتوى دوراتك لتظهر هنا
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {exams.map((exam) => (
              <Card key={exam.id} className="overflow-hidden card-hover">
                <div className="p-4 border-b border-border bg-purple-500/5">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <Badge className="bg-purple-500/15 text-purple-600 border-purple-500/30 flex-shrink-0">
                      <HelpCircle className="w-3 h-3 ml-1" /> اختبار
                    </Badge>
                    <Badge variant="outline" className="text-xs flex-shrink-0">
                      {exam.questions_count} سؤال
                    </Badge>
                  </div>
                  <h3 className="font-bold text-navy text-sm mb-1 line-clamp-2">{exam.title}</h3>
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <BookOpen className="w-3 h-3" />
                    <span className="truncate">{exam.course_title}</span>
                  </div>
                </div>
                <div className="p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">درجة النجاح</span>
                    <Badge variant="outline" className="text-xs">
                      {exam.course_pass_score || 60}%
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">المدة</span>
                    <span className="text-navy font-medium">
                      {exam.duration_minutes ? `${exam.duration_minutes} دقيقة` : 'غير محدد'}
                    </span>
                  </div>
                  {exam.is_preview && (
                    <Badge variant="outline" className="text-xs w-full justify-center mt-2">
                      <Eye className="w-3 h-3 ml-1" /> معاينة مجانية
                    </Badge>
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
  const [loading, setLoading] = useState(false)

  const save = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/trainers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: user.id,
          name: profile.name,
          phone: profile.phone,
          title: profile.title,
          specialization: profile.specialization,
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
        name: data.name,
        phone: data.phone,
        title: data.title,
        bio: data.bio,
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
        <div className="flex flex-col items-center gap-4 p-6 bg-gradient-to-br from-navy/5 to-gold/5 rounded-xl border border-gold/20">
          <AvatarUploader
            userId={user.id}
            role="trainer"
            initialUrl={profile.avatar || user?.avatar}
            name={profile.name}
            size="xl"
            onUploaded={handleAvatarUploaded}
          />
          <div className="text-center">
            <p className="text-xs text-muted-foreground">صورة المدرب الرسمية — تظهر في حساب الإدارة والصفحة الرئيسية</p>
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

        {/* Unified professional bio — same field as admin's TrainerDialog */}
        <div className="border-t border-border pt-4">
          <div className="flex items-center justify-between mb-1">
            <Label className="font-bold text-navy">النبذة التعريفية الكاملة</Label>
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
            className="mt-1 min-h-[260px] leading-relaxed focus:ring-gold/40 focus:border-gold/40"
            placeholder={"مثال احترافي:\n\nمدرب ومحاضر دولي وخبير في التعليم الطبي، حاصل على شهادة الدكتوراه في الموارد البشرية والتخطيط الاستراتيجي. يمتلك خبرة تتجاوز 15 عاماً في تدريب الكوادر الصحية على المستوى المحلي والدولي.\n\n🎓 المؤهلات العلمية\n• بكالوريوس آداب وعلوم إنسانية\n• ماستر حقوق وعلوم سياسية\n• دكتوراه في الموارد البشرية والتخطيط الاستراتيجي\n\n🏆 الإنجازات\n• مشارك في عدة مؤتمرات دولية متخصصة\n• مؤلف لـ 6 كتب في طبعات دولية\n• مدرب معتمد من عدة هيئات صحية"}
          />
          <div className="flex items-center justify-between mt-2 text-[10px] text-muted-foreground">
            <span>💡 استخدم الأسطر الفارغة لفصل الفقرات</span>
            <span>{(profile.bio || '').length} حرف</span>
          </div>
        </div>

        <Button onClick={save} disabled={loading} className="bg-navy hover:bg-navy-light">
          {loading ? <><Loader2 className="w-4 h-4 ml-1 animate-spin" /> جاري الحفظ...</> : 'حفظ التغييرات'}
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
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 text-navy mx-auto mb-3 animate-spin" />
          <p className="text-muted-foreground text-sm">جاري تحميل الإشعارات...</p>
        </div>
      ) : notifs.length === 0 ? (
        <div className="text-center py-12">
          <Bell className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">لا توجد إشعارات</p>
          <p className="text-xs text-muted-foreground mt-1">
            ستظهر هنا إشعارات التسجيل الجديدة في دوراتك
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifs.map((n) => (
            <div
              key={n.id}
              className="p-4 bg-gold/5 border border-gold/20 rounded-lg flex items-start gap-3"
            >
              <div className="w-10 h-10 rounded-full bg-navy flex items-center justify-center text-gold font-bold flex-shrink-0 border border-gold/30 overflow-hidden">
                {n.studentAvatar ? (
                  <img src={n.studentAvatar} alt={n.studentName} className="w-full h-full object-cover" />
                ) : (
                  <UserPlus className="w-5 h-5" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-navy text-sm">
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
                        ? 'bg-green-500/15 text-green-600 border-green-500/30 text-xs'
                        : 'bg-gold/15 text-gold border-gold/30 text-xs'
                    }
                  >
                    {n.isFree ? 'مجانية' : `${(n.amountPaid || 0).toLocaleString()} ${n.currency || 'ر.ي'}`}
                  </Badge>
                  {n.paymentStatus === 'pending' && (
                    <Badge variant="outline" className="border-yellow-500/30 text-yellow-600 text-xs">
                      بانتظار الدفع
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
          ))}
        </div>
      )}
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
