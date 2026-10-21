'use client'

// ============================================================================
// ADMIN TRAINERS — Royal v3 redesign (FIA Royal design language)
// Replaces the previous AdminTrainers + TrainerDialog in admin.tsx
// All data logic & APIs unchanged: /api/trainers (GET/POST/PUT/DELETE)
// ============================================================================
import React, { useEffect, useState } from 'react'
import {
  GraduationCap, Plus, Edit, Trash2, Mail, Phone, Lock, Eye, EyeOff, User,
  Award, Briefcase, FileText, Crown, Loader2, CheckCircle2, Users, Sparkles,
  CalendarClock, BadgeCheck, Upload, X,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { PasswordConfirmDialog } from '@/components/fia/password-confirm-dialog'
import { supabasePublic } from '@/lib/supabase'
import {
  LuxSection, LuxStats, LuxSearch, LuxSelect, LuxPicker, LuxEmpty, LuxBadge,
  LuxField, LuxDialog, LuxSaveBar, LuxRow, luxInput,
} from './luxury'

const TITLES = ['استشاري', 'أخصائي', 'محاضر', 'مدرب معتمد', 'مدرس']
const SPECIALIZATIONS = [
  'الطب الباطني', 'طب الطوارئ', 'التمريض', 'الإنعاش القلبي الرئوي',
  'مكافحة العدوى', 'صحة الأم والطفل', 'الصيدلة السريرية',
  'إدارة المنشآت الصحية', 'التعليم الطبي',
]

const AdminTrainersRoyal = React.memo(function AdminTrainersRoyal() {
  const [items, setItems] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [checkingTeam, setCheckingTeam] = useState(false)
  const [search, setSearch] = useState('')
  const [titleFilter, setTitleFilter] = useState('')
  const [specFilter, setSpecFilter] = useState('')

  const load = () => fetch('/api/trainers').then((r) => r.json()).then((d) => setItems(Array.isArray(d) ? d : []))
  useEffect(() => { load() }, [])

  // ⚡ REAL-TIME: trainers — admin sees trainer changes INSTANTLY
  useEffect(() => {
    let channel: any
    try {
      channel = supabasePublic
        .channel('admin-trainers-realtime')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'trainers' },
          (payload: any) => setItems((prev) => [payload.new, ...prev]))
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'trainers' },
          (payload: any) => setItems((prev) => prev.map((t) => t.id === payload.new.id ? { ...t, ...payload.new } : t)))
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'trainers' },
          (payload: any) => setItems((prev) => prev.filter((t) => t.id !== payload.old.id)))
        .subscribe()
    } catch {}
    return () => { try { supabasePublic.removeChannel(channel) } catch {} }
  }, [])

  // Pre-flight: make sure the trainer is not a team member (founder/leader).
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

  // Filters
  const filtered = items.filter((t) => {
    if (titleFilter && t.title !== titleFilter) return false
    if (specFilter && t.specialization !== specFilter) return false
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (t.name || '').toLowerCase().includes(q)
      || (t.email || '').toLowerCase().includes(q)
      || (t.specialization || '').toLowerCase().includes(q)
      || (t.title || '').toLowerCase().includes(q)
  })

  // Stats
  const teamCount = items.filter((t) => t.password && t.password.startsWith('__TEAM_MEMBER__')).length
  const totalYears = items.reduce((acc, t) => acc + (parseInt(t.years_experience) || 0), 0)
  const specsCount = new Set(items.map((t) => t.specialization).filter(Boolean)).size

  return (
    <LuxSection
      title="المدربون"
      subtitle="نخبة الكوادر التدريبية المعتمدة في الأكاديمية"
      icon={GraduationCap}
      themeKey="trainers"
      count={filtered.length}
      stats={
        <LuxStats
          items={[
            { icon: GraduationCap, label: 'إجمالي المدربين', value: items.length, grad: 'from-navy to-navy-light' },
            { icon: Crown, label: 'أعضاء الفريق', value: teamCount, grad: 'from-amber-500 to-gold' },
            { icon: CalendarClock, label: 'مجموع سنوات الخبرة', value: `+${totalYears}`, grad: 'from-blue-500 to-indigo-600' },
            { icon: BadgeCheck, label: 'التخصصات المغطاة', value: specsCount, grad: 'from-emerald-500 to-teal-600' },
          ]}
        />
      }
      actions={
        <Button
          className="relative bg-gradient-to-l from-gold to-amber-500 hover:from-amber-500 hover:to-gold text-navy rounded-xl shadow-lg active:scale-[0.97] transition-all font-extrabold overflow-hidden group"
          onClick={() => { setEditing(null); setOpen(true) }}
        >
          <span className="absolute inset-0 lux-shimmer" />
          <Plus className="w-4 h-4 ml-1 relative" /> إضافة مدرب
        </Button>
      }
      toolbar={
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          <LuxSearch value={search} onChange={setSearch} placeholder="ابحث بالاسم أو البريد أو التخصص..." className="lg:col-span-2" />
          <LuxSelect value={titleFilter} onChange={setTitleFilter} placeholder="كل المسميات"
            options={TITLES.map((t) => ({ value: t, label: t, emoji: '🎓' }))} />
          <LuxSelect value={specFilter} onChange={setSpecFilter} placeholder="كل التخصصات"
            options={SPECIALIZATIONS.map((s) => ({ value: s, label: s, emoji: '🩺' }))} />
        </div>
      }
    >
      {filtered.length === 0 ? (
        <LuxEmpty
          icon={GraduationCap}
          themeKey="trainers"
          title={search || titleFilter || specFilter ? 'لا توجد نتائج مطابقة' : 'لا يوجد مدربون بعد'}
          hint={search || titleFilter || specFilter ? 'جرّب تعديل البحث أو الفلاتر' : 'ابدأ ببناء نخبة المدربين — اضغط "إضافة مدرب" لإضافة أول مدرب للأكاديمية'}
          action={items.length === 0 ? (
            <Button className="bg-gradient-to-l from-gold to-amber-500 hover:from-amber-500 hover:to-gold text-navy rounded-xl shadow-md font-bold" onClick={() => { setEditing(null); setOpen(true) }}>
              <Plus className="w-4 h-4 ml-1" /> إضافة أول مدرب
            </Button>
          ) : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 fia-stagger">
          {filtered.map((t) => {
            const isTeamMember = t.password && t.password.startsWith('__TEAM_MEMBER__')
            const years = parseInt(t.years_experience) || 0
            return (
              <Card key={t.id} className="fia-card-hover p-0 overflow-hidden cursor-default border border-gold/25 group relative">
                {/* Gold top ribbon */}
                <div className="h-1.5 bg-gradient-to-l from-gold via-amber-300 to-gold opacity-80" />
                {/* Royal header */}
                <div className="relative px-4 pt-3 pb-8 bg-gradient-to-br from-navy via-navy-light to-navy overflow-hidden">
                  <div className="absolute inset-0 opacity-[0.16]" style={{
                    backgroundImage: 'radial-gradient(circle at 22% 25%, #D4AF37 1px, transparent 1px)',
                    backgroundSize: '13px 13px',
                  }} />
                  <div className="absolute -top-5 -left-5 w-16 h-16 bg-gold/20 rounded-full blur-2xl" />
                  {isTeamMember && (
                    <div className="absolute top-2.5 left-2.5 z-10">
                      <LuxBadge tone="gold" className="bg-gold/25 border-gold/50">👑 فريق</LuxBadge>
                    </div>
                  )}
                  <div className="relative flex justify-center -mb-7">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gold/50 blur-md rounded-full scale-90" />
                      <div className="relative w-16 h-16 rounded-2xl overflow-hidden border-2 border-gold/70 shadow-xl bg-navy-light">
                        {t.avatar ? (
                          <img src={t.avatar} alt={t.name} className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gold font-extrabold text-2xl bg-gradient-to-br from-gold/25 to-amber-600/25">
                            {t.name?.charAt(0)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                {/* Body */}
                <div className="px-4 pb-4 pt-9 space-y-2.5 text-center">
                  <div className="font-extrabold text-navy text-sm truncate flex items-center justify-center gap-1">
                    {t.name}
                    {isTeamMember && <Crown className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
                  </div>
                  {t.title && <LuxBadge tone="gold">🎓 {t.title}</LuxBadge>}
                  {t.specialization && (
                    <div className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">{t.specialization}</div>
                  )}
                  {/* Info chips */}
                  <div className="flex items-center justify-center gap-1.5 pt-0.5">
                    {years > 0 && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-500/10 border border-blue-500/25 rounded-full px-2 py-0.5">
                        <CalendarClock className="w-3 h-3" /> {years} سنة خبرة
                      </span>
                    )}
                  </div>
                  <div className="space-y-1 pt-1.5 border-t border-gold/15 text-right">
                    {t.email && <LuxRow icon={Mail}><span dir="ltr">{t.email}</span></LuxRow>}
                    {t.phone && <LuxRow icon={Phone}><span dir="ltr">{t.phone}</span></LuxRow>}
                    {!t.email && !t.phone && <div className="text-[10px] text-muted-foreground text-center py-1">لا توجد بيانات تواصل</div>}
                  </div>
                  {/* Actions */}
                  <div className="flex gap-1.5 pt-1.5 border-t border-gold/15">
                    <Button size="sm" variant="outline" className="flex-1 h-8 text-[11px] rounded-lg border-gold/35 hover:border-gold hover:bg-gold/10 font-bold" onClick={() => { setEditing(t); setOpen(true) }}>
                      <Edit className="w-3 h-3 ml-1" /> تعديل
                    </Button>
                    <Button size="sm" variant="outline" disabled={isTeamMember || checkingTeam} className="h-8 w-9 p-0 border-rose-500/30 text-rose-500 hover:bg-rose-500/10 disabled:opacity-30 disabled:cursor-not-allowed" onClick={() => requestDelete(t)} title={isTeamMember ? 'لا يمكن حذف عضو الفريق' : 'حذف'}>
                      {checkingTeam ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                    </Button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {open && <TrainerDialogRoyal open={open} onOpenChange={setOpen} initial={editing} onSaved={load} />}

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
    </LuxSection>
  )
})

// ============================================================================
// TRAINER DIALOG — professional 2-column royal form with luxury dropdowns
// ============================================================================
function TrainerDialogRoyal({ open, onOpenChange, initial, onSaved }: any) {
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
        setForm((f: any) => ({ ...f, avatar: data.url }))
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
        toast.success(initial ? 'تم تحديث بيانات المدرب' : 'تمت إضافة المدرب بنجاح')
        onSaved(); onOpenChange(false)
      } else {
        const d = await res.json(); toast.error(d.error || 'فشل')
      }
    } catch { toast.error('خطأ') } finally { setSaving(false) }
  }

  return (
    <LuxDialog
      open={open}
      onOpenChange={onOpenChange}
      title={initial ? 'تعديل المدرب' : 'إضافة مدرب جديد'}
      subtitle={initial ? 'تحديث بيانات المدرب الاحترافية' : 'سجّل عضو هيئة تدريس جديد في الأكاديمية'}
      icon={GraduationCap}
      gradient="from-[#061024] via-navy to-[#1d2b52]"
      maxWidth="sm:max-w-2xl"
      footer={
        <LuxSaveBar
          onCancel={() => onOpenChange(false)}
          onSave={save}
          saving={saving}
          saveLabel={initial ? 'تحديث البيانات' : 'إضافة المدرب'}
          icon={CheckCircle2}
          gradient="from-gold to-amber-500"
          text="text-navy"
        />
      }
    >
      {/* ── Section 1: الهوية ─────────────────────────────────────── */}
      <FormSectionTitle icon={User} label="الهوية الشخصية" />
      <div className="flex items-center gap-4">
        <div className="relative flex-shrink-0">
          <div className="absolute inset-0 bg-gold/40 blur-md rounded-full" />
          <div className="relative w-20 h-20 rounded-2xl overflow-hidden border-2 border-gold/50 shadow-lg bg-navy-light">
            {form.avatar ? (
              <img src={form.avatar} alt="صورة المدرب" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gold font-extrabold text-3xl bg-gradient-to-br from-navy to-navy-light">
                {form.name?.charAt(0) || '؟'}
              </div>
            )}
          </div>
          <input type="file" accept="image/*" className="hidden" id="trainer-avatar-royal" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAvatarUpload(f) }} />
          <button
            onClick={() => document.getElementById('trainer-avatar-royal')?.click()}
            disabled={uploadingAvatar}
            className="absolute -bottom-1.5 -left-1.5 w-8 h-8 rounded-full bg-gradient-to-br from-gold to-amber-500 text-navy flex items-center justify-center shadow-md border-2 border-white disabled:opacity-50 hover:scale-110 transition-transform"
            title="رفع صورة"
            type="button"
          >
            {uploadingAvatar ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          </button>
        </div>
        <div className="flex-1 space-y-3">
          <LuxField label="اسم المدرب" icon={User} required>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="الاسم الكامل للمدرب" className={luxInput} />
          </LuxField>
          <LuxField label="سنوات الخبرة" icon={Briefcase}>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setForm({ ...form, years_experience: Math.max(0, (parseInt(form.years_experience) || 0) - 1) })}
                className="w-9 h-9 rounded-xl border border-gold/30 bg-white hover:bg-gold/10 text-navy font-bold shadow-sm transition-colors">−</button>
              <Input type="number" value={form.years_experience || ''} onChange={(e) => setForm({ ...form, years_experience: e.target.value === '' ? 0 : parseInt(e.target.value) || 0 })} dir="ltr" className={luxInput + ' text-center font-bold'} placeholder="0" />
              <button type="button" onClick={() => setForm({ ...form, years_experience: (parseInt(form.years_experience) || 0) + 1 })}
                className="w-9 h-9 rounded-xl border border-gold/30 bg-white hover:bg-gold/10 text-navy font-bold shadow-sm transition-colors">+</button>
            </div>
          </LuxField>
        </div>
      </div>

      {/* ── Section 2: البيانات المهنية — القوائم المنسدلة السحرية (نمط قسم الدورات) ── */}
      <FormSectionTitle icon={Award} label="البيانات المهنية" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <LuxPicker
          label="المسمى المهني"
          icon={Award}
          accent="gold"
          value={form.title || ''}
          onChange={(v) => setForm({ ...form, title: v })}
          placeholder="— اختر المسمى —"
          options={TITLES.map((t) => ({ value: t, label: t, emoji: '🎓' }))}
        />
        <LuxPicker
          label="التخصص"
          icon={Briefcase}
          accent="blue"
          value={form.specialization || ''}
          onChange={(v) => setForm({ ...form, specialization: v })}
          placeholder="— اختر التخصص —"
          options={SPECIALIZATIONS.map((s) => ({ value: s, label: s, emoji: '🩺' }))}
        />
      </div>

      {/* ── Section 3: بيانات الحساب ──────────────────────────────── */}
      <FormSectionTitle icon={Lock} label="بيانات الحساب والتواصل" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <LuxField label="البريد الإلكتروني" icon={Mail} required>
          <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} dir="ltr" className={luxInput} placeholder="example@fia.edu" />
        </LuxField>
        <LuxField label="رقم الهاتف" icon={Phone}>
          <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} dir="ltr" className={luxInput} placeholder="+967 7XX XXX XXX" />
        </LuxField>
        <LuxField label="كلمة المرور" icon={Lock} hint={initial ? 'اتركها فارغة للإبقاء' : undefined}>
          <div className="relative">
            <Input type={showPwd ? 'text' : 'password'} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} dir="ltr" className={luxInput + ' pl-10'} placeholder="••••••••" />
            <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-gold transition-colors">
              {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </LuxField>
        <div className="flex items-end">
          <div className="w-full rounded-xl border border-gold/25 bg-gradient-to-l from-gold/[0.08] to-transparent p-3 flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-gold flex-shrink-0" />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              كلمة المرور تُستخدم لدخول المدرب إلى لوحته الخاصة وإدارة دوراته ومتدربيه.
            </p>
          </div>
        </div>
      </div>

      {/* ── Section 4: النبذة ─────────────────────────────────────── */}
      <FormSectionTitle icon={FileText} label="النبذة التعريفية الكاملة" />
      <textarea
        value={form.bio || ''}
        onChange={(e) => setForm({ ...form, bio: e.target.value })}
        className="w-full min-h-[180px] p-4 border border-gold/30 rounded-xl text-sm leading-relaxed bg-white focus:outline-none focus:ring-2 focus:ring-gold/25 focus:border-gold transition-all lux-scrollbar"
        placeholder={'مثال:\n\nمدرب ومحاضر دولي وخبير في التعليم الطبي، حاصل على الدكتوراه. يمتلك خبرة تتجاوز 15 عاماً.\n\n🎓 المؤهلات\n• بكالوريوس آداب\n• دكتوراه في التخطيط الاستراتيجي\n\n🏆 الإنجازات\n• مشارك في عدة مؤتمرات دولية\n• مؤلف لـ 6 كتب في طبعات دولية'}
      />
      <div className="flex items-center justify-between text-[10px] text-muted-foreground -mt-2">
        <span className="flex items-center gap-1"><Sparkles className="w-3 h-3 text-gold" /> استخدم الأسطر الفارغة لفصل الفقرات والعناوين</span>
        <span className="font-bold tabular-nums">{(form.bio || '').length} حرف</span>
      </div>
    </LuxDialog>
  )
}

function FormSectionTitle({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <div className="flex items-center gap-2.5 -mb-1">
      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-navy to-navy-light flex items-center justify-center shadow-sm border border-gold/30">
        <Icon className="w-3.5 h-3.5 text-gold" />
      </div>
      <span className="text-xs font-extrabold text-navy">{label}</span>
      <div className="flex-1 h-px bg-gradient-to-l from-gold/30 to-transparent" />
    </div>
  )
}

export { AdminTrainersRoyal }
