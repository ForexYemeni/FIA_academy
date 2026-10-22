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
  CalendarClock, BadgeCheck, Upload, X, BadgePercent, Landmark, Bitcoin, Wallet, HeartHandshake,
  Trophy, Star, Globe2, ShieldCheck,
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
  // ⚡ ROYAL v4.4 — عدادات المتابعين لكل مدرب (متحف المتابعين)
  const [followCounts, setFollowCounts] = useState<Record<string, number>>({})

  const load = () => fetch('/api/trainers').then((r) => r.json()).then((d) => setItems(Array.isArray(d) ? d : []))
  useEffect(() => { load() }, [])

  // ⚡ عدد المتابعين لكل مدرب — يُحدّث لحظياً مع كل متابعة جديدة
  useEffect(() => {
    const loadFollows = () => {
      fetch('/api/trainer-follows')
        .then((r) => r.json())
        .then((d) => { if (d && !d.error) setFollowCounts(d) })
        .catch(() => {})
    }
    loadFollows()
    let channel: any
    try {
      channel = supabasePublic
        .channel('admin-trainers-followers')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'trainer_follows' }, () => loadFollows())
        .subscribe()
    } catch {}
    return () => { try { supabasePublic.removeChannel(channel) } catch {} }
  }, [])

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
      const res = await fetch('/api/trainers', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: deleteTarget.id }) })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error || 'فشلت العملية')
        return
      }
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
  const totalFollowers = items.reduce((acc, t) => acc + (followCounts[t.id] || 0), 0)

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
            { icon: HeartHandshake, label: 'متابعو المدربين', value: totalFollowers, grad: 'from-emerald-500 to-teal-600' },
            { icon: Crown, label: 'أعضاء الفريق', value: teamCount, grad: 'from-amber-500 to-gold' },
            { icon: BadgeCheck, label: 'التخصصات المغطاة', value: specsCount, grad: 'from-blue-500 to-indigo-600' },
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
                  {!isTeamMember && t.status && t.status !== 'approved' && (
                    <div className="absolute top-2.5 left-2.5 z-10">
                      <LuxBadge tone="gold" className={t.status === 'pending' ? 'bg-amber-400/20 border-amber-400/50 text-amber-800' : t.status === 'agreement_pending' ? 'bg-sky-400/20 border-sky-400/50 text-sky-800' : 'bg-rose-400/20 border-rose-400/50 text-rose-800'}>
                        {t.status === 'pending' ? '⏳ بانتظار الموافقة' : t.status === 'agreement_pending' ? '📜 بانتظار التوقيع' : '🚫 مرفوض'}
                      </LuxBadge>
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
                  <div className="flex items-center justify-center flex-wrap gap-1.5 pt-0.5">
                    {years > 0 && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-500/10 border border-blue-500/25 rounded-full px-2 py-0.5">
                        <CalendarClock className="w-3 h-3" /> {years} سنة خبرة
                      </span>
                    )}
                    {(followCounts[t.id] || 0) > 0 && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-2 py-0.5" title="متابعوه من المتدربين">
                        <HeartHandshake className="w-3 h-3" /> {followCounts[t.id]} متابع
                      </span>
                    )}
                    {(Number(t.profit_percentage) || 0) > 0 && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#8a6d1d] bg-gold/15 border border-gold/40 rounded-full px-2 py-0.5">
                        <BadgePercent className="w-3 h-3" /> {Number(t.profit_percentage)}% أرباح
                      </span>
                    )}
                    {t.payment_method_name && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-500/10 border border-emerald-500/25 rounded-full px-2 py-0.5">
                        {t.payment_method_type === 'عملات رقمية' ? <Bitcoin className="w-3 h-3" /> : <Landmark className="w-3 h-3" />} {t.payment_method_name}
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
// TRAINER DIALOG — ROYAL PROFILE-STYLE (مثل الملف الشخصي في حساب المدرب تماماً)
// بطاقة بطل كحلية بنقاط ذهبية + بطاقات حقول فاخرة + نظام الأرباح وطريقة الاستلام
// ============================================================================
function TrainerDialogRoyal({ open, onOpenChange, initial, onSaved }: any) {
  const [form, setForm] = useState<any>(
    initial || { name: '', title: '', specialization: '', bio: '', email: '', password: '', phone: '', avatar: '', years_experience: 0, profit_percentage: 0, payment_method_type: 'محلي', payment_method_name: '', payment_account: '', country: 'اليمن', status: 'approved', qualifications: [], achievements: [], experiences: [] }
  )
  const [saving, setSaving] = useState(false)
  const [showPwd, setShowPwd] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  useEffect(() => {
    setForm(initial
      ? { profit_percentage: 0, payment_method_type: 'محلي', payment_method_name: '', payment_account: '', country: 'اليمن', status: 'approved', qualifications: [], achievements: [], experiences: [], ...initial }
      : { name: '', title: '', specialization: '', bio: '', email: '', password: '', phone: '', avatar: '', years_experience: 0, profit_percentage: 0, payment_method_type: 'محلي', payment_method_name: '', payment_account: '', country: 'اليمن', status: 'approved', qualifications: [], achievements: [], experiences: [] })
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
        body: JSON.stringify({
          ...(initial ? { id: initial.id, ...form } : form),
          profit_percentage: Number(form.profit_percentage) || 0,
        }),
      })
      if (res.ok) {
        toast.success(initial ? 'تم تحديث بيانات المدرب' : 'تمت إضافة المدرب بنجاح')
        onSaved(); onOpenChange(false)
      } else {
        const d = await res.json(); toast.error(d.error || 'فشل')
      }
    } catch { toast.error('خطأ') } finally { setSaving(false) }
  }

  const pct = Number(form.profit_percentage) || 0
  const PCT_PRESETS = [10, 20, 25, 30, 40, 50]
  const PM_SUGGESTIONS = form.payment_method_type === 'عملات رقمية'
    ? ['USDT (TRC20)', 'USDT (ERC20)', 'Binance Pay', 'Bitcoin (BTC)', 'Ethereum (ETH)']
    : ['محفظة جيب', 'محفظة الكريمي', 'محفظة موبايل موني', 'حساب بنكي', 'الدفع عند المقابلة']

  return (
    <LuxDialog
      open={open}
      onOpenChange={onOpenChange}
      title={initial ? 'تعديل المدرب' : 'إضافة مدرب جديد'}
      subtitle={initial ? 'تحديث الملف الشخصي الفاخر للمدرب' : 'سجّل عضو هيئة تدريس جديد في الأكاديمية'}
      icon={GraduationCap}
      gradient="from-[#061024] via-navy to-[#1d2b52]"
      maxWidth="sm:max-w-2xl"
      footer={
        <LuxSaveBar
          onCancel={() => onOpenChange(false)}
          onSave={save}
          saving={saving}
          saveLabel={initial ? 'تحديث الملف' : 'إضافة المدرب'}
          icon={CheckCircle2}
          gradient="from-gold to-amber-500"
          text="text-navy"
        />
      }
    >
      {/* ── بطاقة البطل: الصورة الرسمية (نمط الملف الشخصي في حساب المدرب) ── */}
      <div className="relative flex flex-col items-center gap-3 p-6 rounded-2xl border border-gold/30 bg-gradient-to-br from-navy via-navy-light to-navy overflow-hidden">
        <div className="absolute inset-0 opacity-25" style={{
          backgroundImage: 'radial-gradient(circle at 12% 50%, #D4AF37 1.5px, transparent 1.5px), radial-gradient(circle at 88% 50%, white 1px, transparent 1px)',
          backgroundSize: '24px 24px, 18px 18px',
        }} />
        <div className="absolute -top-8 -right-8 w-32 h-32 bg-gold/15 rounded-full blur-2xl" />
        <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-gold/10 rounded-full blur-2xl" />
        <div className="relative">
          <div className="absolute inset-0 bg-gold/40 blur-lg rounded-full" />
          <div className="relative w-20 h-20 rounded-2xl overflow-hidden border-2 border-gold/60 shadow-xl bg-navy-light">
            {form.avatar ? (
              <img src={form.avatar} alt="صورة المدرب" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gold font-extrabold text-3xl bg-gradient-to-br from-gold/25 to-amber-600/25">
                {form.name?.charAt(0) || '؟'}
              </div>
            )}
          </div>
          <input type="file" accept="image/*" className="hidden" id="trainer-avatar-royal" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAvatarUpload(f) }} />
          <button
            onClick={() => document.getElementById('trainer-avatar-royal')?.click()}
            disabled={uploadingAvatar}
            className="absolute -bottom-1.5 -left-1.5 w-8 h-8 rounded-full bg-gradient-to-br from-gold to-amber-500 text-navy flex items-center justify-center shadow-md border-2 border-white disabled:opacity-50 hover:scale-110 transition-transform"
            title="رفع صورة المدرب الرسمية"
            type="button"
          >
            {uploadingAvatar ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          </button>
        </div>
        <div className="relative text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold/15 border border-gold/30 mb-1">
            <Sparkles className="w-3 h-3 text-gold" />
            <span className="text-[10px] font-bold text-gold">صورة المدرب الرسمية</span>
          </div>
          <p className="text-xs font-extrabold text-white">{form.name || 'اسم المدرب يظهر هنا'}</p>
          <p className="text-[9px] text-white/60">{form.title || 'المسمى المهني'}{form.specialization ? ` • ${form.specialization}` : ''}</p>
        </div>
      </div>

      {/* ── الهوية الشخصية ── */}
      <FormSectionTitle icon={User} label="الهوية الشخصية" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

      {/* ── البيانات المهنية ── */}
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
        <LuxField label="بلد الإقامة" icon={Globe2} hint="تظهر طرق سحب الأرباح المتاحة بحسب بلده">
          <select value={form.country || 'اليمن'} onChange={(e) => setForm({ ...form, country: e.target.value })} className={luxInput + ' text-sm'}>
            {['اليمن', 'السعودية', 'الإمارات', 'عُمان', 'قطر', 'الكويت', 'البحرين', 'العراق', 'مصر', 'الأردن', 'فلسطين', 'لبنان', 'السودان', 'ليبيا', 'تونس', 'الجزائر', 'المغرب', 'موريتانيا', 'الصومال', 'دولة أخرى'].map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </LuxField>
        <LuxField label="حالة الاعتماد الملكية" icon={ShieldCheck} hint="فقط للمنظومة الجديدة: معتمد يظهر في «مدربينا» — المعلّق/المرفوض لا يظهران">
          <select value={form.status || 'approved'} onChange={(e) => setForm({ ...form, status: e.target.value })} className={luxInput + ' text-sm'}>
            <option value="approved">معتمد ✅ (يظهر للعامة)</option>
            <option value="agreement_pending">بانتظار توقيع الاتفاق 📜</option>
            <option value="pending">بانتظار موافقة الإدارة ⏳</option>
            <option value="rejected">مرفوض 🚫</option>
          </select>
        </LuxField>
      </div>

      {/* ── 💰 نظام الأرباح — نسبته من كل دورة على كل متدرب ── */}
      <FormSectionTitle icon={Crown} label="نظام الأرباح — نسبته من كل دورة" />
      <div className="rounded-xl border border-gold/30 bg-gradient-to-l from-gold/[0.08] to-transparent p-4 space-y-3">
        <LuxField label="نسبة الربح من كل اشتراك (%)" icon={BadgePercent} hint="تُضاف أرباحه تلقائياً لمحفظته بعد موافقتك على دفع أي متدرب">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setForm({ ...form, profit_percentage: Math.max(0, pct - 5) })}
              className="w-9 h-9 rounded-xl border border-gold/30 bg-white hover:bg-gold/10 text-navy font-bold shadow-sm">−</button>
            <Input type="number" min={0} max={100} value={form.profit_percentage || ''} onChange={(e) => setForm({ ...form, profit_percentage: e.target.value === '' ? 0 : Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) })} dir="ltr" className={luxInput + ' text-center font-extrabold text-lg'} placeholder="0" />
            <button type="button" onClick={() => setForm({ ...form, profit_percentage: Math.min(100, pct + 5) })}
              className="w-9 h-9 rounded-xl border border-gold/30 bg-white hover:bg-gold/10 text-navy font-bold shadow-sm">+</button>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {PCT_PRESETS.map((p) => (
              <button key={p} type="button" onClick={() => setForm({ ...form, profit_percentage: p })}
                className={`text-[10px] font-extrabold rounded-full border px-2.5 py-1 transition-colors ${pct === p ? 'bg-gradient-to-l from-navy to-navy-light text-gold border-navy shadow' : 'border-gold/25 bg-white hover:bg-gold/10 text-navy'}`}>
                {p}%
              </button>
            ))}
          </div>
        </LuxField>
        {/* Live preview — يظهر للمدرب كم نسبته */}
        <div className="rounded-xl bg-gradient-to-l from-navy to-navy-light p-3.5 text-white border border-gold/40 relative overflow-hidden">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 15% 50%, #D4AF37 1.5px, transparent 1.5px)', backgroundSize: '16px 16px' }} />
          <div className="relative flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gold/20 border border-gold/40 flex items-center justify-center flex-shrink-0">
              <BadgePercent className="w-5 h-5 text-gold" />
            </div>
            <div className="text-[11px] leading-relaxed">
              {pct > 0 ? (
                <>من كل اشتراك بقيمة <b className="text-gold">100 ر.ي</b> تُضاف له <b className="text-gold text-sm" dir="ltr">{pct} ر.ي</b> تلقائياً إلى «أرباحي» بعد تأكيد الدفع</>
              ) : (
                <span className="text-gold/80">النسبة 0% — لن تُسجل أرباح للمدرب حتى تحدد نسبته</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── 🏦 طريقة استلام الأرباح ── */}
      <FormSectionTitle icon={Landmark} label="طريقة استلام الأرباح" />
      <div className="rounded-xl border border-gold/25 bg-white p-4 space-y-3">
        <div className="flex items-center gap-1 bg-gold/5 border border-gold/20 rounded-xl p-1 w-fit">
          <button type="button" onClick={() => setForm({ ...form, payment_method_type: 'محلي', payment_method_name: '' })}
            className={`px-4 py-1.5 text-xs font-extrabold rounded-lg flex items-center gap-1.5 transition-all ${form.payment_method_type !== 'عملات رقمية' ? 'bg-gradient-to-l from-navy to-navy-light text-gold shadow' : 'text-muted-foreground hover:text-navy'}`}>
            <Landmark className="w-3.5 h-3.5" /> محلي
          </button>
          <button type="button" onClick={() => setForm({ ...form, payment_method_type: 'عملات رقمية', payment_method_name: '' })}
            className={`px-4 py-1.5 text-xs font-extrabold rounded-lg flex items-center gap-1.5 transition-all ${form.payment_method_type === 'عملات رقمية' ? 'bg-gradient-to-l from-navy to-navy-light text-gold shadow' : 'text-muted-foreground hover:text-navy'}`}>
            <Bitcoin className="w-3.5 h-3.5" /> عملات رقمية
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <LuxField label="اسم الطريقة">
            <Input value={form.payment_method_name || ''} onChange={(e) => setForm({ ...form, payment_method_name: e.target.value })} className={luxInput} placeholder={form.payment_method_type === 'عملات رقمية' ? 'USDT (TRC20)' : 'محفظة جيب'} />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {PM_SUGGESTIONS.map((s) => (
                <button key={s} type="button" onClick={() => setForm({ ...form, payment_method_name: s })}
                  className="text-[9px] font-bold rounded-full border border-gold/25 bg-white hover:bg-gold/10 hover:border-gold/50 text-navy px-2 py-0.5 transition-colors">{s}</button>
              ))}
            </div>
          </LuxField>
          <LuxField label={form.payment_method_type === 'عملات رقمية' ? 'عنوان المحفظة الرقمية' : 'رقم المحفظة / الحساب'}>
            <Input value={form.payment_account || ''} onChange={(e) => setForm({ ...form, payment_account: e.target.value })} dir="ltr" className={luxInput + ' font-bold'} placeholder={form.payment_method_type === 'عملات رقمية' ? 'TXXXX...' : '7XXXXXXXX'} />
          </LuxField>
        </div>
        <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Sparkles className="w-3 h-3 text-gold" /> يستطيع المدرب تعديل طريقة الاستلام من قسم «أرباحي» في لوحته</p>
      </div>

      {/* ── بيانات الحساب والتواصل ── */}
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
              كلمة المرور تُستخدم لدخول المدرب إلى لوحته الخاصة وإدارة دوراته ومتدربيه وأرباحه.
            </p>
          </div>
        </div>
      </div>

      {/* ── النبذة ── */}
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

      {/* ── 👑 الملف الاحترافي المنظّم: مؤهلات + إنجازات + خبرات ── */}
      <FormSectionTitle icon={Award} label="الملف الاحترافي المنظّم (مؤهلات / إنجازات / خبرات)" />
      <div className="space-y-3">
        {/* المؤهلات */}
        <ListEditor
          icon={Award} title="المؤهلات العلمية" accent="emerald"
          items={form.qualifications || []}
          onChange={(items) => setForm({ ...form, qualifications: items })}
          newRow={{ title: '', institution: '', year: '' }}
          fields={[
            { key: 'title', placeholder: 'الدرجة / المؤهل' },
            { key: 'institution', placeholder: 'الجهة المانحة' },
            { key: 'year', placeholder: 'السنة', ltr: true },
          ]}
          preview={(q: any) => `${q.title || '—'}${q.institution ? ' — ' + q.institution : ''}${q.year ? ` (${q.year})` : ''}`}
        />
        {/* الإنجازات */}
        <ListEditor
          icon={Trophy} title="الإنجازات والجوائز" accent="amber"
          items={form.achievements || []}
          onChange={(items) => setForm({ ...form, achievements: items })}
          newRow={{ title: '', description: '', year: '' }}
          fields={[
            { key: 'title', placeholder: 'الإنجاز' },
            { key: 'description', placeholder: 'وصف مختصر' },
            { key: 'year', placeholder: 'السنة', ltr: true },
          ]}
          preview={(x: any) => `${x.title || '—'}${x.description ? ' — ' + x.description : ''}${x.year ? ` (${x.year})` : ''}`}
        />
        {/* الخبرات */}
        <ListEditor
          icon={Star} title="الخبرات العملية" accent="sky"
          items={form.experiences || []}
          onChange={(items) => setForm({ ...form, experiences: items })}
          newRow={{ position: '', organization: '', period: '', description: '' }}
          fields={[
            { key: 'position', placeholder: 'المنصب' },
            { key: 'organization', placeholder: 'الجهة' },
            { key: 'period', placeholder: 'الفترة' },
            { key: 'description', placeholder: 'أبرز المهام' },
          ]}
          preview={(x: any) => `${x.position || '—'}${x.organization ? ' في ' + x.organization : ''}${x.period ? ` (${x.period})` : ''}`}
        />
      </div>
    </LuxDialog>
  )
}

/* محرر قائمة فاخر — صفوف ديناميكية بمعاينة حية */
function ListEditor({ icon: Icon, title, accent, items, onChange, newRow, fields, preview }: any) {
  return (
    <div className="rounded-xl border border-gold/25 bg-white p-3.5">
      <div className="mb-2.5 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-xs font-extrabold text-navy">
          <span className={`w-6 h-6 rounded-lg bg-gradient-to-br ${accent}-100 to-transparent flex items-center justify-center border border-gold/20`}>
            <Icon className="w-3.5 h-3.5 text-gold" />
          </span>
          {title} <span className="text-[10px] font-bold text-muted-foreground">({items.length})</span>
        </p>
        <button type="button" onClick={() => onChange([...items, { ...newRow }])}
          className="flex items-center gap-1 rounded-lg border border-gold/35 bg-gold/10 px-2.5 py-1 text-[10px] font-extrabold text-navy transition-colors hover:bg-gold/20">
          <Plus className="w-3 h-3" /> إضافة
        </button>
      </div>
      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gold/25 bg-gold/[0.03] p-2.5 text-center text-[10px] text-muted-foreground">لا عناصر — أضف أول صف</p>
      ) : (
        <div className="space-y-2">
          {items.map((it: any, idx: number) => (
            <div key={idx} className="relative rounded-lg border border-gold/15 bg-gold/[0.02] p-2.5">
              <div className={`grid gap-1.5 ${fields.length === 4 ? 'grid-cols-2 sm:grid-cols-4' : fields.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                {fields.map((f: any) => (
                  <Input key={f.key} value={it[f.key] || ''} dir={f.ltr ? 'ltr' : undefined}
                    onChange={(e) => { const next = [...items]; next[idx] = { ...it, [f.key]: e.target.value }; onChange(next) }}
                    placeholder={f.placeholder}
                    className="h-9 border-gold/20 text-xs focus:border-gold focus:ring-gold/20" />
                ))}
              </div>
              <div className="mt-1.5 flex items-center justify-between">
                <p className="truncate text-[9px] text-muted-foreground">👁 {preview(it)}</p>
                <button type="button" onClick={() => onChange(items.filter((_: any, i: number) => i !== idx))}
                  className="rounded-md p-1 text-red-400 transition-colors hover:bg-red-50 hover:text-red-600">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
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
