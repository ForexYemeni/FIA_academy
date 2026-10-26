'use client'

// ============================================================================
// ADMIN STUDENTS — Royal v3 redesign (FIA Royal design language)
// Data logic & APIs unchanged: /api/students, /api/courses, /api/enrollments
// ============================================================================
import React, { useEffect, useState } from 'react'
import {
  Users, BookOpen, CheckCircle2, Clock, Mail, Phone, Calendar, Eye, Trash2,
  Search, X, GraduationCap, TrendingUp, Wallet, Award, UserPlus, Download,
  PencilLine, Save, Loader2, Lock, Ban, ShieldAlert,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogTitle,
} from '@/components/ui/dialog'
import { PasswordConfirmDialog } from '@/components/fia/password-confirm-dialog'
import { supabasePublic } from '@/lib/supabase'
import {
  LuxSection, LuxStats, LuxSearch, LuxSelect, LuxEmpty, LuxBadge, LuxRow,
} from './luxury'

// bio قد يحمل بيانات مهيكلة بعد علامة — نعرض النص فقط ونحفظ البنية (نفس منطق المتدرب)
const FIA_BIO_EXTRA_MARKER = '===FIA_EXTRA==='
const splitBio = (raw?: string | null) => {
  if (!raw) return ''
  const i = raw.indexOf(FIA_BIO_EXTRA_MARKER)
  return (i === -1 ? raw : raw.slice(0, i)).trim()
}
const joinBio = (display: string, original?: string | null) => {
  if (!original) return display
  const i = original.indexOf(FIA_BIO_EXTRA_MARKER)
  if (i === -1) return display
  return `${display.trimEnd()}\n\n${original.slice(i)}`
}

const AdminStudentsRoyal = React.memo(function AdminStudentsRoyal() {
  const [items, setItems] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [enrollments, setEnrollments] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [courseFilter, setCourseFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
  const [deleting, setDeleting] = useState(false)
  // 🔒 v6.5 (طلب صاحب المنصة): المسمى الوظيفي والتخصص حقلا المدرّب حصراً —
  // حُذفا نهائياً من واجهة المتدرب ومن هذا الحوار؛ تعديل المتدرب = هاتف + نبذة فقط
  const [editing, setEditing] = useState<any | null>(null)
  const [editForm, setEditForm] = useState({ phone: '', bio: '' })
  const [savingEdit, setSavingEdit] = useState(false)
  // 👑 التسجيل اليدوي الملكي + تصدير Excel
  const [enrollOpen, setEnrollOpen] = useState(false)
  const [enrollUserId, setEnrollUserId] = useState('')
  const [enrollCourseId, setEnrollCourseId] = useState('')
  const [enrollLoading, setEnrollLoading] = useState(false)
  // 👑 v10.16 — مرسوم الحظر الملكي: حظر/رفع حظر حساب متدرب بقرار الإدارة
  const [banTarget, setBanTarget] = useState<any | null>(null)
  const [banReason, setBanReason] = useState('')
  const [banning, setBanning] = useState(false)

  useEffect(() => {
    fetch('/api/students?role=student').then((r) => r.json()).then((d) => setItems(Array.isArray(d) ? d : []))
    fetch('/api/courses?include_drafts=true').then((r) => r.json()).then((d) => setCourses(Array.isArray(d) ? d : []))
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
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'enrollments' },
          (payload: any) => setEnrollments((prev) => [payload.new, ...prev]))
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'enrollments' },
          (payload: any) => setEnrollments((prev) => prev.map((e) => e.id === payload.new.id ? { ...e, ...payload.new } : e)))
        .subscribe()
    } catch {}
    return () => { try { supabasePublic.removeChannel(channel) } catch {} }
  }, [])

  // 👑 v10.16 — مرسوم الحظر الملكي: تنفيذ الحظر/رفع الحظر عبر /api/admin/ban
  // (الـ API يحمي حسابات الإدارة وأعضاء الفريق — لا يمكن حظرهم أبداً)
  const doBan = async (target: any, banned: boolean, reason: string) => {
    setBanning(true)
    try {
      const res = await fetch('/api/admin/ban', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: target.id, banned, reason }) })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        toast.error(data?.error || 'فشل تنفيذ الحظر')
        return
      }
      setItems((prev) => prev.map((x) => x.id === target.id ? { ...x, banned, banned_reason: banned ? (reason || 'مخالفة سياسات الأكاديمية') : null, banned_at: banned ? new Date().toISOString() : null } : x))
      setSelectedStudent((prev: any) => (prev && prev.id === target.id) ? { ...prev, banned, banned_reason: banned ? (reason || 'مخالفة سياسات الأكاديمية') : null } : prev)
      toast.success(banned ? `🚫 تم حظر حساب "${target.name}" — ستظهر له بطاقة الحظر الملكية فوراً حتى لو كان التطبيق مفتوحاً` : `✅ رُفع الحظر عن "${target.name}" — عاد الحساب للعمل بشكل طبيعي فوراً`)
      setBanTarget(null)
      setBanReason('')
    } catch {
      toast.error('خطأ في الاتصال')
    } finally {
      setBanning(false)
    }
  }

  // نقطة الدخول: محظور = رفع الحظر مباشرة، غير محظور = فتح حوار مرسوم الحظر
  const requestBan = (s: any) => {
    if (s.banned) { doBan(s, false, '') } else { setBanReason(''); setBanTarget(s) }
  }

  const confirmBan = async () => {
    if (!banTarget) return
    await doBan(banTarget, true, banReason.trim() || 'مخالفة سياسات الأكاديمية')
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch('/api/students', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: deleteTarget.id }) })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error || 'فشلت العملية')
        return
      }
      toast.success('تم الحذف')
      setItems(items.filter((s) => s.id !== deleteTarget.id))
      setDeleteTarget(null)
      setSelectedStudent(null)
    } finally {
      setDeleting(false)
    }
  }

  const getStudentEnrollments = (studentId: string) => enrollments.filter((e) => e.user_id === studentId)

  // 🔒 v6.5: فتح حوار تعديل بيانات المتدرب (الهاتف/النبذة فقط)
  const openEdit = (s: any) => {
    setEditForm({
      phone: s.phone || '',
      bio: splitBio(s.bio),
    })
    setEditing(s)
  }

  const handleSaveEdit = async () => {
    if (!editing) return
    setSavingEdit(true)
    try {
      const res = await fetch('/api/students', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editing.id, phone: editForm.phone, bio: joinBio(editForm.bio, editing.bio) }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'فشل حفظ التعديلات')
        return
      }
      setItems((prev) => prev.map((s) => s.id === editing.id ? { ...s, phone: editForm.phone, bio: joinBio(editForm.bio, editing.bio) } : s))
      setSelectedStudent((prev: any) => (prev && prev.id === editing.id) ? { ...prev, phone: editForm.phone, bio: joinBio(editForm.bio, editing.bio) } : prev)
      toast.success(`تم تحديث بيانات "${editing.name}" بنجاح`) 
      setEditing(null)
    } catch {
      toast.error('خطأ في الاتصال')
    } finally {
      setSavingEdit(false)
    }
  }

  // 👑 التسجيل اليدوي الملكي — الإدارة تسجّل متدرباً في دورة فوراً
  const handleManualEnroll = async () => {
    if (!enrollUserId || !enrollCourseId) {
      toast.error('اختر المتدرب والدورة أولاً')
      return
    }
    setEnrollLoading(true)
    try {
      const res = await fetch('/api/admin/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: enrollUserId, course_id: enrollCourseId }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'فشل التسجيل')
        return
      }
      toast.success(`👑 سجّلت "${data.student_name}" في "${data.course_title}" بنجاح`)
      setEnrollOpen(false)
      setEnrollUserId('')
      setEnrollCourseId('')
      // تحديث فوري للتسجيلات
      fetch('/api/enrollments').then((r) => r.json()).then((d) => setEnrollments(Array.isArray(d) ? d : []))
    } catch {
      toast.error('خطأ في الاتصال')
    } finally {
      setEnrollLoading(false)
    }
  }

  // 👑 تصدير Excel الملكي (CSV بترميز عربي سليم يفتح مباشرة في Excel)
  const exportExcel = () => {
    try {
      const rows: string[][] = [
        ['الاسم', 'البريد', 'الهاتف', 'الحالة', 'عدد الدورات', 'مكتملة', 'معلّقة', 'الدورات المسجّل فيها', 'تاريخ الانضمام'],
      ]
      for (const s of filtered) {
        const sEnrs = getStudentEnrollments(s.id)
        const completed = sEnrs.filter((e) => e.status === 'completed' || e.status === 'مكتمل').length
        const pending = sEnrs.filter((e) => e.payment_status === 'pending').length
        const courseTitles = sEnrs
          .map((e) => courses.find((c) => c.id === e.course_id)?.title || '')
          .filter(Boolean)
          .join(' | ')
        const st = STATUS_META[studentStatus(s.id)]?.label || ''
        rows.push([
          s.name || '', s.email || '', s.phone || '', st,
          String(sEnrs.length), String(completed), String(pending),
          courseTitles,
          s.created_at ? new Date(s.created_at).toLocaleDateString('ar-EG') : '',
        ])
      }
      const csv = '\uFEFF' + rows
        .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\r\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `FIA-المتدربون-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`📊 صُدّر ${filtered.length} متدرباً إلى ملف Excel`)      
    } catch {
      toast.error('فشل التصدير')
    }
  }

  // Status derivation per student
  const studentStatus = (studentId: string) => {
    const sEnrs = getStudentEnrollments(studentId)
    if (sEnrs.length === 0) return 'new'
    const allCompleted = sEnrs.every((e) => e.status === 'completed' || e.status === 'مكتمل')
    if (allCompleted) return 'completed'
    if (sEnrs.some((e) => e.payment_status === 'pending')) return 'pending'
    return 'learning'
  }

  // Filters
  const filtered = items.filter((s) => {
    if (statusFilter) {
      const st = studentStatus(s.id)
      if (statusFilter === 'completed' && st !== 'completed') return false
      if (statusFilter === 'learning' && !(st === 'learning' || st === 'completed')) return false
      if (statusFilter === 'pending' && st !== 'pending') return false
      if (statusFilter === 'new' && st !== 'new') return false
    }
    if (courseFilter && !getStudentEnrollments(s.id).some((e) => e.course_id === courseFilter)) return false
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (s.name || '').toLowerCase().includes(q) || (s.email || '').toLowerCase().includes(q) || (s.phone || '').includes(q)
  })

  // Stats
  const totalEnrollments = enrollments.length
  const completedCount = enrollments.filter((e) => e.status === 'completed' || e.status === 'مكتمل').length
  const pendingCount = enrollments.filter((e) => e.payment_status === 'pending').length

  const STATUS_META: Record<string, { label: string; tone: string }> = {
    new: { label: 'جديد', tone: 'gray' },
    learning: { label: 'قيد التعلّم', tone: 'blue' },
    completed: { label: 'مكتمل', tone: 'green' },
    pending: { label: 'بانتظار الدفع', tone: 'amber' },
  }

  return (
    <LuxSection
      title="المتدربون"
      subtitle="مجتمع المتعلمين المسجلين في الأكاديمية"
      icon={Users}
      themeKey="students"
      count={filtered.length}
      stats={
        <LuxStats
          items={[
            { icon: Users, label: 'إجمالي المتدربين', value: items.length, grad: 'from-navy to-navy-light' },
            { icon: BookOpen, label: 'إجمالي التسجيلات', value: totalEnrollments, grad: 'from-blue-500 to-indigo-600' },
            { icon: Award, label: 'دورات مكتملة', value: completedCount, grad: 'from-emerald-500 to-teal-600' },
            { icon: Wallet, label: 'بانتظار الدفع', value: pendingCount, grad: 'from-amber-500 to-orange-600' },
          ]}
        />
      }
      toolbar={
        <div className="space-y-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            <LuxSearch value={search} onChange={setSearch} placeholder="ابحث بالاسم أو البريد أو الهاتف..." className="lg:col-span-2" />
            <LuxSelect value={statusFilter} onChange={setStatusFilter} placeholder="كل الحالات"
              options={[
                { value: 'learning', label: 'قيد التعلّم', emoji: '📖' },
                { value: 'completed', label: 'مكتمل', emoji: '✅' },
                { value: 'pending', label: 'بانتظار الدفع', emoji: '⏳' },
                { value: 'new', label: 'بدون دورات', emoji: '✨' },
              ]} />
            <LuxSelect value={courseFilter} onChange={setCourseFilter} placeholder="كل الدورات"
              options={courses.map((c) => ({ value: c.id, label: c.title, emoji: '📘' }))} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => { setEnrollUserId(''); setEnrollCourseId(''); setEnrollOpen(true) }}
              className="bg-gradient-to-r from-gold to-amber-600 hover:from-amber-600 hover:to-gold text-navy rounded-xl font-bold shadow-md h-8 text-[11px]">
              <UserPlus className="w-3.5 h-3.5 ml-1" /> تسجيل يدوي في دورة
            </Button>
            <Button size="sm" variant="outline" onClick={exportExcel}
              className="rounded-xl border-gold/40 hover:bg-gold/10 text-navy h-8 text-[11px] font-bold">
              <Download className="w-3.5 h-3.5 ml-1" /> تصدير Excel ({filtered.length})
            </Button>
          </div>
        </div>
      }
    >
      {filtered.length === 0 ? (
        <LuxEmpty
          icon={Users}
          themeKey="students"
          title={search || statusFilter || courseFilter ? 'لا توجد نتائج مطابقة' : 'لا يوجد متدربون بعد'}
          hint={search || statusFilter || courseFilter ? 'جرّب تعديل البحث أو الفلاتر' : 'سيتم تسجيل المتدربون تلقائياً عند إنشاء حساباتهم'}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 fia-stagger">
          {filtered.map((s) => {
            const sEnrs = getStudentEnrollments(s.id)
            const completedCountS = sEnrs.filter((e) => e.status === 'completed' || e.status === 'مكتمل').length
            const pendingCountS = sEnrs.filter((e) => e.payment_status === 'pending').length
            const status = studentStatus(s.id)
            const meta = STATUS_META[status]
            const progress = sEnrs.length > 0 ? Math.round((completedCountS / sEnrs.length) * 100) : 0
            return (
              <Card key={s.id} className="fia-card-hover p-0 overflow-hidden cursor-default border border-gold/25">
                {/* Royal header */}
                <div className="relative p-4 bg-gradient-to-br from-[#04102b] via-navy to-navy-light text-white overflow-hidden">
                  <div className="absolute inset-0 opacity-[0.15]" style={{
                    backgroundImage: 'radial-gradient(circle at 20% 25%, #D4AF37 1px, transparent 1px)',
                    backgroundSize: '13px 13px',
                  }} />
                  <div className="absolute -top-5 -right-5 w-16 h-16 bg-blue-400/15 rounded-full blur-2xl" />
                  <div className="absolute top-2.5 left-2.5 z-10">
                    <span className={`inline-flex items-center gap-1 text-[9px] font-bold rounded-full px-2 py-0.5 border backdrop-blur-sm ${
                      status === 'completed' ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40'
                      : status === 'pending' ? 'bg-amber-500/20 text-amber-200 border-amber-400/40'
                      : status === 'learning' ? 'bg-blue-500/20 text-blue-200 border-blue-400/40'
                      : 'bg-white/10 text-white/70 border-white/25'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${status === 'completed' ? 'bg-emerald-300' : status === 'pending' ? 'bg-amber-300 animate-pulse' : status === 'learning' ? 'bg-blue-300 animate-pulse' : 'bg-white/50'}`} />
                      {meta.label}
                    </span>
                  </div>
                  {/* 👑 v10.16 — شارة الحظر الملكية: الإدارة ترى المحظورين من النظرة الأولى */}
                  {s.banned && (
                    <div className="absolute top-2.5 right-2.5 z-10">
                      <span className="inline-flex items-center gap-1 text-[9px] font-black rounded-full px-2 py-0.5 border border-red-400/60 bg-red-500/25 text-red-100 backdrop-blur-sm shadow-[0_0_12px_rgba(239,68,68,0.45)]">
                        <Ban className="w-2.5 h-2.5" /> محظور
                      </span>
                    </div>
                  )}
                  <div className="relative flex items-center gap-3">
                    <div className="relative flex-shrink-0">
                      <div className="absolute inset-0 bg-gold/40 blur-sm rounded-2xl scale-90" />
                      <div className="relative w-14 h-14 rounded-2xl overflow-hidden border-2 border-gold/60 shadow-lg bg-navy-light">
                        {s.avatar ? (
                          <img src={s.avatar} alt={s.name} className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gold font-extrabold text-2xl bg-gradient-to-br from-gold/25 to-amber-600/25">
                            {s.name?.charAt(0)}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-extrabold text-sm truncate text-white">{s.name}</div>
                      <div className="text-[10px] text-white/65 truncate" dir="ltr">{s.email}</div>
                      {s.phone && <div className="text-[10px] text-gold-light mt-0.5 font-medium" dir="ltr">{s.phone}</div>}
                    </div>
                  </div>
                </div>
                {/* Body */}
                <div className="p-3.5 space-y-2.5">
                  {/* Stats chips */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="inline-flex items-center gap-1 bg-blue-500/10 text-blue-700 rounded-lg px-2 py-1 border border-blue-500/25 text-[10px] font-bold">
                      <BookOpen className="w-3 h-3" /> {sEnrs.length} دورة
                    </span>
                    {completedCountS > 0 && (
                      <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-700 rounded-lg px-2 py-1 border border-emerald-500/25 text-[10px] font-bold">
                        <CheckCircle2 className="w-3 h-3" /> {completedCountS} مكتملة
                      </span>
                    )}
                    {pendingCountS > 0 && (
                      <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-700 rounded-lg px-2 py-1 border border-amber-500/25 text-[10px] font-bold">
                        <Clock className="w-3 h-3" /> {pendingCountS} معلّقة
                      </span>
                    )}
                  </div>
                  {/* Progress bar */}
                  {sEnrs.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between text-[9px] text-muted-foreground mb-1">
                        <span className="font-bold">التقدم</span>
                        <span className="font-extrabold text-navy tabular-nums">{progress}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-l from-gold via-amber-400 to-gold transition-all" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  )}
                  {/* Course preview */}
                  {sEnrs.length > 0 && (
                    <div className="space-y-1 pt-1 border-t border-gold/15">
                      {sEnrs.slice(0, 2).map((e) => {
                        const c = courses.find((co) => co.id === e.course_id)
                        if (!c) return null
                        const isCompleted = e.status === 'completed' || e.status === 'مكتمل'
                        return (
                          <div key={e.id} className="text-[10px] flex items-center justify-between gap-1 bg-muted/30 rounded-lg px-2 py-1">
                            <span className="truncate text-navy font-medium">{c.title}</span>
                            <span className={`flex-shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              isCompleted ? 'bg-emerald-500/15 text-emerald-700 border border-emerald-500/30'
                              : e.payment_status === 'pending' ? 'bg-amber-500/15 text-amber-700 border border-amber-500/30'
                              : 'bg-blue-500/15 text-blue-700 border border-blue-500/30'
                            }`}>
                              {isCompleted ? 'مكتمل' : e.payment_status === 'pending' ? 'بانتظار' : 'يتعلّم'}
                            </span>
                          </div>
                        )
                      })}
                      {sEnrs.length > 2 && <div className="text-[10px] text-muted-foreground text-center">+{sEnrs.length - 2} دورة أخرى</div>}
                    </div>
                  )}
                  {/* Join date */}
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <Calendar className="w-2.5 h-2.5 text-gold/70" />
                    <span>انضم في {s.created_at ? new Date(s.created_at).toLocaleDateString('ar-EG') : '-'}</span>
                  </div>
                  {/* Actions — 👑 v10.16 أُضيف زر مرسوم الحظر الملكي */}
                  <div className="flex gap-1.5 pt-1 border-t border-gold/15">
                    <Button size="sm" variant="outline" className="flex-1 h-8 text-[11px] rounded-lg border-gold/35 hover:border-gold hover:bg-gold/10 font-bold" onClick={() => setSelectedStudent(s)}>
                      <Eye className="w-3 h-3 ml-1" /> الملف الكامل
                    </Button>
                    <Button size="sm" variant="ghost" className={`h-8 w-9 p-0 ${s.banned ? 'hover:bg-emerald-500/10' : 'hover:bg-rose-500/10'}`} title={s.banned ? 'رفع الحظر — إعادة تفعيل الحساب فوراً' : 'حظر الحساب — مرسوم الحظر الملكي'} onClick={() => requestBan(s)}>
                      {s.banned
                        ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        : <Ban className="w-3.5 h-3.5 text-rose-500" />}
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 w-9 p-0 hover:bg-gold/10" title="تعديل البيانات (الهاتف/النبذة)" onClick={() => openEdit(s)}>
                      <PencilLine className="w-3.5 h-3.5 text-gold" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 w-9 p-0 hover:bg-rose-500/10" onClick={() => setDeleteTarget(s)}>
                      <Trash2 className="w-3 h-3 text-rose-500" />
                    </Button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Student detail — royal modal */}
      {selectedStudent && (
        <Dialog open={true} onOpenChange={(o) => { if (!o) setSelectedStudent(null) }}>
          <DialogContent className="sm:max-w-lg max-h-[92vh] overflow-y-auto lux-scrollbar p-0 border-0">
            {/* Royal header */}
            <div className="relative p-5 bg-gradient-to-br from-[#04102b] via-navy to-navy-light text-white overflow-hidden">
              <div className="absolute inset-0 opacity-[0.18]" style={{
                backgroundImage: 'radial-gradient(circle at 15% 30%, #D4AF37 1.5px, transparent 1.5px), radial-gradient(circle at 85% 20%, white 1px, transparent 1px)',
                backgroundSize: '22px 22px, 17px 17px',
              }} />
              <div className="absolute -top-10 -left-10 w-32 h-32 bg-gold/20 rounded-full blur-3xl" />
              <div className="absolute inset-0 lux-shimmer pointer-events-none" />
              <button onClick={() => setSelectedStudent(null)} className="absolute top-3 left-3 w-8 h-8 rounded-lg bg-white/10 hover:bg-white/25 flex items-center justify-center z-10 transition-colors">
                <X className="w-4 h-4 text-white/90" />
              </button>
              <div className="relative flex items-center gap-3.5">
                <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-gold/60 bg-navy-light shadow-xl flex-shrink-0">
                  {selectedStudent.avatar ? (
                    <img src={selectedStudent.avatar} alt={selectedStudent.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gold font-extrabold text-2xl bg-gradient-to-br from-gold/25 to-amber-600/25">
                      {selectedStudent.name?.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <DialogTitle className="text-lg font-extrabold text-white">{selectedStudent.name}</DialogTitle>
                  <div className="text-xs text-white/70 mt-0.5" dir="ltr">{selectedStudent.email}</div>
                  {selectedStudent.phone && <div className="text-xs text-gold-light mt-0.5" dir="ltr">{selectedStudent.phone}</div>}
                </div>
              </div>
            </div>

            <div className="p-5 space-y-4 bg-gradient-to-b from-gold/[0.04] to-white">
              {/* 👑 v10.16 — لافتة الحظر داخل الملف الكامل */}
              {selectedStudent.banned && (
                <div className="rounded-xl border border-red-400/40 bg-red-500/[0.08] p-3 flex items-start gap-2.5">
                  <ShieldAlert className="w-4.5 h-4.5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[12.5px] font-black text-red-700">هذا الحساب محظور حالياً — التطبيق محجوب عنه ببطاقة الحظر الملكية</div>
                    {selectedStudent.banned_reason && <div className="text-[11px] text-red-600/90 mt-0.5">السبب: {selectedStudent.banned_reason}</div>}
                    {selectedStudent.banned_at && <div className="text-[10px] text-muted-foreground mt-0.5">بتاريخ: {new Date(selectedStudent.banned_at).toLocaleString('ar-EG')}</div>}
                  </div>
                </div>
              )}
              {/* Quick stats */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="fia-card-hover p-3 bg-gradient-to-br from-navy to-navy-light border border-gold/25 rounded-xl text-center">
                  <div className="text-2xl font-extrabold text-gold tabular-nums">{getStudentEnrollments(selectedStudent.id).length}</div>
                  <div className="text-[10px] text-white/70 mt-0.5">إجمالي الدورات</div>
                </div>
                <div className="fia-card-hover p-3 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 rounded-xl text-center">
                  <div className="text-2xl font-extrabold text-emerald-600 tabular-nums">
                    {getStudentEnrollments(selectedStudent.id).filter((e) => e.status === 'completed' || e.status === 'مكتمل').length}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">مكتملة</div>
                </div>
                <div className="fia-card-hover p-3 bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-xl text-center">
                  <div className="text-2xl font-extrabold text-amber-600 tabular-nums">
                    {getStudentEnrollments(selectedStudent.id).filter((e) => e.payment_status === 'pending').length}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">معلّقة</div>
                </div>
              </div>

              {/* Contact info */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 bg-white rounded-xl border border-gold/25">
                  <div className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1"><Phone className="w-3 h-3 text-gold" /> الهاتف</div>
                  <div className="text-sm font-bold text-navy" dir="ltr">{selectedStudent.phone || '-'}</div>
                </div>
                <div className="p-3 bg-white rounded-xl border border-gold/25">
                  <div className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1"><Calendar className="w-3 h-3 text-gold" /> تاريخ التسجيل</div>
                  <div className="text-sm font-bold text-navy">{selectedStudent.created_at ? new Date(selectedStudent.created_at).toLocaleDateString('ar-EG') : '-'}</div>
                </div>
              </div>

              {/* Enrollments */}
              <div>
                <h4 className="font-extrabold text-navy text-sm mb-2.5 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-gold to-amber-500 flex items-center justify-center">
                    <BookOpen className="w-3.5 h-3.5 text-navy" />
                  </div>
                  الدورات المسجّلة ({getStudentEnrollments(selectedStudent.id).length})
                </h4>
                <div className="space-y-2">
                  {getStudentEnrollments(selectedStudent.id).map((e) => {
                    const c = courses.find((co) => co.id === e.course_id)
                    if (!c) return null
                    const isFree = c.price_type === 'مجانية' || c.price === 0
                    const isCompleted = e.status === 'completed' || e.status === 'مكتمل'
                    return (
                      <div key={e.id} className="flex items-center justify-between gap-2 p-3 bg-white border border-gold/20 rounded-xl hover:border-gold/45 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-navy text-sm truncate">{c.title}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {isFree ? 'مجانية' : `${c.price?.toLocaleString()} ${c.currency || 'ر.ي'}`}
                          </div>
                        </div>
                        <Badge className={`flex-shrink-0 ${
                          isCompleted ? 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30'
                          : e.payment_status === 'pending' ? 'bg-amber-500/15 text-amber-700 border-amber-500/30'
                          : 'bg-blue-500/15 text-blue-700 border-blue-500/30'
                        }`}>
                          {isCompleted ? 'مكتمل' : e.payment_status === 'pending' ? 'بانتظار الدفع' : 'قيد التعلّم'}
                        </Badge>
                      </div>
                    )
                  })}
                  {getStudentEnrollments(selectedStudent.id).length === 0 && (
                    <div className="text-center py-6 text-sm text-muted-foreground border border-dashed border-gold/25 rounded-xl bg-white/50">
                      لم يسجّل في أي دورة بعد
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 p-4 bg-muted/20 border-t border-gold/15">
              <Button onClick={() => openEdit(selectedStudent)} className="bg-gradient-to-r from-navy to-navy-light hover:from-navy-light hover:to-navy text-gold rounded-xl shadow-md border border-gold/30">
                <PencilLine className="w-4 h-4 ml-1" /> تعديل البيانات
              </Button>
              <Button variant="outline" onClick={() => setSelectedStudent(null)} className="rounded-xl border-gold/30 hover:bg-gold/5">إغلاق</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* 👑 حوار التسجيل اليدوي الملكي */}
      <Dialog open={enrollOpen} onOpenChange={setEnrollOpen}>
        <DialogContent className="sm:max-w-md p-0 border-0 overflow-hidden rounded-3xl shadow-2xl">
          <div className="relative bg-gradient-to-br from-navy via-navy-light to-navy px-5 pt-5 pb-5 text-center overflow-hidden">
            <div className="absolute inset-0 opacity-20" style={{
              backgroundImage: 'radial-gradient(circle at 25% 40%, #D4AF37 1.5px, transparent 1.5px)',
              backgroundSize: '20px 20px',
            }} />
            <div className="relative w-14 h-14 mx-auto rounded-2xl bg-white/10 border border-gold/30 flex items-center justify-center mb-2">
              <UserPlus className="w-7 h-7 text-gold" />
            </div>
            <DialogTitle className="text-white text-xl font-bold">التسجيل اليدوي</DialogTitle>
            <p className="relative text-white/70 text-xs mt-1">سجّل متدرباً في دورة فوراً — مثلاً بعد تحويل بنكي خارج المنصة أو هدية مباشرة</p>
          </div>
          <div className="p-5 bg-gradient-to-b from-navy/5 to-white space-y-4">
            <div>
              <Label className="text-navy font-medium mb-1.5 block">المتدرب</Label>
              <LuxSelect value={enrollUserId} onChange={setEnrollUserId} title="اختر المتدرب" icon={UserPlus}
                options={[{ value: '', label: '— اختر المتدرب —', emoji: '🎓' }, ...items.map((s: any) => ({ value: s.id, label: `${s.name}${s.phone ? ` — ${s.phone}` : ''}`, emoji: '🧑‍🎓' }))]} />
            </div>
            <div>
              <Label className="text-navy font-medium mb-1.5 block">الدورة</Label>
              <LuxSelect value={enrollCourseId} onChange={setEnrollCourseId} title="اختر الدورة" icon={BookOpen}
                options={[{ value: '', label: '— اختر الدورة —', emoji: '📚' }, ...courses.map((c: any) => ({ value: c.id, label: c.title, emoji: '📖' }))]} />
            </div>
            <Button
              onClick={handleManualEnroll}
              disabled={enrollLoading}
              className="fia-lux-shine w-full bg-gradient-to-r from-navy to-navy-light hover:from-navy-light hover:to-navy text-gold rounded-xl shadow-md active:scale-[0.97] transition-all border border-gold/30 h-11"
            >
              <UserPlus className="w-4 h-4 ml-1" />
              {enrollLoading ? 'جاري التسجيل...' : 'سجّل الآن'}
            </Button>
            <p className="text-[10px] text-muted-foreground text-center">يصل المتدرب إشعار افتتاحي فخم فور التسجيل — ولا يتكرر التسجيل في نفس الدورة</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* 🔒 v6.5 حوار تعديل بيانات المتدرب — هاتف + نبذة فقط (المسمى والتخصص حقلا المدرّب حصراً) */}
      <Dialog open={!!editing} onOpenChange={(o) => { if (!o && !savingEdit) setEditing(null) }}>
        <DialogContent className="sm:max-w-md p-0 border-0 overflow-hidden rounded-3xl shadow-2xl">
          <div className="relative bg-gradient-to-br from-navy via-navy-light to-navy px-5 pt-5 pb-5 text-center overflow-hidden">
            <div className="absolute inset-0 opacity-20" style={{
              backgroundImage: 'radial-gradient(circle at 25% 40%, #D4AF37 1.5px, transparent 1.5px)',
              backgroundSize: '20px 20px',
            }} />
            <div className="relative w-14 h-14 mx-auto rounded-2xl bg-white/10 border border-gold/30 flex items-center justify-center mb-2">
              <PencilLine className="w-7 h-7 text-gold" />
            </div>
            <DialogTitle className="text-white text-xl font-bold">تعديل بيانات المتدرب</DialogTitle>
            <p className="relative text-white/70 text-xs mt-1 truncate px-4">{editing?.name} — تعديل الهاتف والنبذة التعريفية</p>
          </div>
          <div className="p-5 bg-gradient-to-b from-navy/5 to-white space-y-4 max-h-[58vh] overflow-y-auto lux-scrollbar">
            <div>
              <Label className="text-navy font-medium mb-1.5 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-gold" /> رقم الهاتف</Label>
              <Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} dir="ltr" className="rounded-xl border-gold/30 focus:border-gold focus:ring-gold/30" placeholder="أدخل رقم الهاتف" />
            </div>
            <div>
              <Label className="text-navy font-medium mb-1.5 flex items-center gap-1.5"><GraduationCap className="w-3.5 h-3.5 text-gold" /> نبذة تعريفية</Label>
              <Textarea value={editForm.bio} onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })} rows={3} className="rounded-xl border-gold/30 focus:border-gold focus:ring-gold/30" placeholder="نبذة قصيرة عن المتدرب..." />
            </div>
            <div className="rounded-xl border border-gold/30 bg-gold/[0.06] p-3 text-[11px] text-navy/80 flex items-start gap-2">
              <Lock className="w-3.5 h-3.5 text-gold mt-0.5 flex-shrink-0" />
              <span>المسمى الوظيفي والتخصص حقلا المدرّب حصراً — لا يظهران للمتدرب إطلاقاً، وبيانات المدرّبين تُدار من قسم المدربين.</span>
            </div>
          </div>
          <div className="flex gap-2 p-4 bg-muted/20 border-t border-gold/15">
            <Button variant="outline" onClick={() => setEditing(null)} disabled={savingEdit} className="rounded-xl border-gold/30 flex-1">إلغاء</Button>
            <Button onClick={handleSaveEdit} disabled={savingEdit} className="fia-lux-shine flex-1 bg-gradient-to-r from-navy to-navy-light hover:from-navy-light hover:to-navy text-gold rounded-xl shadow-md border border-gold/30">
              {savingEdit ? <><Loader2 className="w-4 h-4 ml-1 animate-spin" /> جاري الحفظ...</> : <><Save className="w-4 h-4 ml-1" /> حفظ التعديلات</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 👑 v10.16 — حوار مرسوم الحظر الملكي: حظر حساب متدرب بقرار الإدارة */}
      <Dialog open={!!banTarget} onOpenChange={(o) => { if (!o && !banning) setBanTarget(null) }}>
        <DialogContent className="sm:max-w-md p-0 border-0 overflow-hidden rounded-3xl shadow-2xl">
          <div className="relative bg-gradient-to-br from-navy via-navy-light to-navy px-5 pt-5 pb-5 text-center overflow-hidden">
            <div className="absolute inset-0 opacity-20" style={{
              backgroundImage: 'radial-gradient(circle at 25% 40%, #D4AF37 1.5px, transparent 1.5px)',
              backgroundSize: '20px 20px',
            }} />
            <div className="relative w-14 h-14 mx-auto rounded-2xl bg-red-500/15 border border-red-400/40 flex items-center justify-center mb-2">
              <Ban className="w-7 h-7 text-red-400" />
            </div>
            <DialogTitle className="text-white text-xl font-bold">حظر الحساب: {banTarget?.name}</DialogTitle>
            <p className="relative text-white/70 text-xs mt-1" dir="ltr">{banTarget?.email}</p>
          </div>
          <div className="p-5 bg-gradient-to-b from-navy/5 to-white space-y-4">
            <div>
              <Label className="text-xs font-bold text-navy mb-1.5 block">سبب الحظر (يظهر للمتدرب على بطاقة الحظر)</Label>
              <Textarea value={banReason} onChange={(e) => setBanReason(e.target.value)} placeholder="مثال: مخالفة سياسات الأكاديمية — تكرار إساءة الاستخدام" rows={3} className="min-h-[80px] rounded-xl border-gold/30 focus:border-gold focus:ring-gold/30" />
            </div>
            <div className="rounded-xl border border-gold/30 bg-gold/[0.06] p-3 text-[11px] text-navy/80 flex items-start gap-2">
              <ShieldAlert className="w-3.5 h-3.5 text-gold mt-0.5 flex-shrink-0" />
              <span>سيظهر للمتدرب فوراً بطاقة حظر ملكية تحجب التطبيق كاملاً — حتى لو كان مفتوحاً الآن — وسيبقى بإمكانه مراسلة الإدارة عبر الدردشة الفورية أو قنوات التواصل. حسابات الإدارة وأعضاء الفريق محمية ولا تُحظر أبداً.</span>
            </div>
          </div>
          <div className="flex gap-2 p-4 bg-muted/20 border-t border-gold/15">
            <Button variant="outline" onClick={() => setBanTarget(null)} disabled={banning} className="rounded-xl border-gold/30 flex-1">إلغاء</Button>
            <Button onClick={confirmBan} disabled={banning} className="fia-lux-shine flex-1 bg-gradient-to-r from-red-600 to-rose-600 hover:from-rose-600 hover:to-red-600 text-white rounded-xl shadow-md">
              {banning ? <><Loader2 className="w-4 h-4 ml-1 animate-spin" /> جاري تنفيذ الحظر…</> : <><Ban className="w-4 h-4 ml-1" /> 🚫 تأكيد الحظر</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
    </LuxSection>
  )
})

export { AdminStudentsRoyal }
