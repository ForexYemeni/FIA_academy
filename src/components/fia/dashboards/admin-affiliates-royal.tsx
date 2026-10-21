'use client'

// ============================================================================
// ADMIN AFFILIATES (المسوّقون بالعمولة) — Royal v3 redesign
// Data logic & APIs unchanged: /api/affiliates (GET/POST/PUT/DELETE)
// ============================================================================
import React, { useEffect, useState } from 'react'
import {
  Users, Plus, Edit, Trash2, Copy, Link2, TrendingUp, Wallet, BadgeCheck,
  Loader2, Mail, Phone, KeyRound, Percent, UserCheck, UserX, Sparkles,
  Target, Send,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/fia/confirm-dialog'
import { supabasePublic } from '@/lib/supabase'
import {
  LuxSection, LuxStats, LuxSearch, LuxSelect, LuxEmpty, LuxBadge,
  LuxField, LuxDialog, LuxSaveBar, LuxRow, luxInput,
} from './luxury'

const SITE_URL = 'https://fiaacademy.vercel.app'

export function AdminAffiliatesRoyal() {
  const [items, setItems] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const load = () => fetch('/api/affiliates').then((r) => r.json()).then((d) => setItems(Array.isArray(d) ? d : []))
  useEffect(() => { load() }, [])

  // ⚡ REAL-TIME: affiliates — admin sees marketer changes INSTANTLY
  useEffect(() => {
    let channel: any
    try {
      channel = supabasePublic
        .channel('admin-affiliates-realtime')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'affiliates' },
          (payload: any) => setItems((prev: any[]) => [payload.new, ...prev]))
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'affiliates' },
          (payload: any) => setItems((prev: any[]) => prev.map((a) => a.id === payload.new.id ? { ...a, ...payload.new } : a)))
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'affiliates' },
          (payload: any) => setItems((prev: any[]) => prev.filter((a) => a.id !== payload.old.id)))
        .subscribe()
    } catch {}
    return () => { try { supabasePublic.removeChannel(channel) } catch {} }
  }, [])

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await fetch('/api/affiliates', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: deleteTarget.id }) })
      toast.success('تم حذف المسوّق')
      setDeleteTarget(null)
      load()
    } finally { setDeleting(false) }
  }

  const toggleStatus = async (a: any) => {
    const newStatus = a.status === 'نشط' ? 'متوقف' : 'نشط'
    await fetch('/api/affiliates', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: a.id, status: newStatus }) })
    toast.success(newStatus === 'نشط' ? 'تم تنشيط المسوّق' : 'تم إيقاف المسوّق')
    load()
  }

  const copyInvite = async (code: string) => {
    const url = `${SITE_URL}/?ref=${code}`
    try {
      await navigator.clipboard.writeText(url)
      toast.success('تم نسخ رابط الدعوة')
    } catch {
      const ta = document.createElement('textarea')
      ta.value = url
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      toast.success('تم نسخ رابط الدعوة')
    }
  }

  const shareWhatsApp = (a: any) => {
    const url = `${SITE_URL}/?ref=${a.unique_code}`
    const msg = encodeURIComponent(`انضم إلى أكاديمية المستقبل الدولية عبر رابطي: ${url}`)
    window.open(`https://wa.me/${(a.phone || '').replace(/[^0-9]/g, '')}?text=${msg}`, '_blank')
  }

  // Filters
  const filtered = items.filter((a) => {
    if (statusFilter && a.status !== statusFilter) return false
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (a.name || '').toLowerCase().includes(q)
      || (a.email || '').toLowerCase().includes(q)
      || (a.unique_code || '').toLowerCase().includes(q)
      || (a.phone || '').includes(q)
  })

  // Stats
  const activeCount = items.filter((a) => a.status === 'نشط').length
  const totalReferrals = items.reduce((acc, a) => acc + (a.total_referrals || 0), 0)
  const totalEarnings = items.reduce((acc, a) => acc + (a.total_earnings || 0), 0)

  return (
    <LuxSection
      title="المسوّقون بالعمولة"
      subtitle="فريق التسويق بالعمولة وروابط الإحالة الخاصة بهم"
      icon={Target}
      themeKey="affiliates"
      count={filtered.length}
      stats={
        <LuxStats
          items={[
            { icon: Users, label: 'إجمالي المسوّقين', value: items.length, grad: 'from-emerald-600 to-teal-700' },
            { icon: UserCheck, label: 'مسوّقون نشطون', value: activeCount, grad: 'from-green-500 to-emerald-600' },
            { icon: TrendingUp, label: 'إجمالي الإحالات', value: totalReferrals, grad: 'from-blue-500 to-indigo-600' },
            { icon: Wallet, label: 'إجمالي العمولات (ر.ي)', value: totalEarnings.toLocaleString(), grad: 'from-gold to-amber-600' },
          ]}
        />
      }
      actions={
        <Button
          className="relative bg-gradient-to-l from-gold to-amber-500 hover:from-amber-500 hover:to-gold text-navy rounded-xl shadow-lg active:scale-[0.97] transition-all font-extrabold overflow-hidden"
          onClick={() => { setEditing(null); setOpen(true) }}
        >
          <span className="absolute inset-0 lux-shimmer" />
          <Plus className="w-4 h-4 ml-1 relative" /> إضافة مسوّق
        </Button>
      }
      toolbar={
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <LuxSearch value={search} onChange={setSearch} placeholder="ابحث بالاسم أو البريد أو كود الإحالة..." className="sm:col-span-2" />
          <LuxSelect value={statusFilter} onChange={setStatusFilter} placeholder="كل الحالات"
            options={[
              { value: 'نشط', label: 'نشط', emoji: '✅' },
              { value: 'متوقف', label: 'متوقف', emoji: '⏸️' },
            ]} />
        </div>
      }
    >
      {filtered.length === 0 ? (
        <LuxEmpty
          icon={Users}
          themeKey="affiliates"
          title={search || statusFilter ? 'لا توجد نتائج مطابقة' : 'لا يوجد مسوّقون بعد'}
          hint={search || statusFilter ? 'جرّب تعديل البحث أو الفلاتر' : 'ابدأ ببناء فريق التسويق بالعمولة — أضف أول مسوّق وولّد له رابط إحالة خاص'}
          action={items.length === 0 ? (
            <Button className="bg-gradient-to-l from-gold to-amber-500 hover:from-amber-500 hover:to-gold text-navy rounded-xl shadow-md font-bold" onClick={() => { setEditing(null); setOpen(true) }}>
              <Plus className="w-4 h-4 ml-1" /> إضافة أول مسوّق
            </Button>
          ) : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 fia-stagger">
          {filtered.map((a) => {
            const isActive = a.status === 'نشط'
            const inviteUrl = `${SITE_URL}/?ref=${a.unique_code}`
            return (
              <Card key={a.id} className="fia-card-hover p-0 border border-gold/25 overflow-hidden">
                {/* Top ribbon */}
                <div className={`h-1.5 bg-gradient-to-l ${isActive ? 'from-emerald-500 via-teal-400 to-emerald-500' : 'from-rose-500 via-red-400 to-rose-500'} opacity-80`} />
                {/* Royal header */}
                <div className="relative p-4 pb-3 bg-gradient-to-br from-[#07130d] via-emerald-950 to-teal-950 text-white overflow-hidden">
                  <div className="absolute inset-0 opacity-[0.14]" style={{
                    backgroundImage: 'radial-gradient(circle at 22% 25%, #34d399 1px, transparent 1px)',
                    backgroundSize: '13px 13px',
                  }} />
                  <div className="absolute -top-5 -right-5 w-16 h-16 bg-emerald-400/15 rounded-full blur-2xl" />
                  <div className="relative flex items-center gap-3">
                    <div className="relative flex-shrink-0">
                      <div className="absolute inset-0 bg-emerald-400/40 blur-sm rounded-2xl scale-90" />
                      <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center border-2 border-emerald-400/40 shadow-lg">
                        <span className="text-xl font-extrabold text-white">{a.name?.charAt(0) || '؟'}</span>
                      </div>
                      <span className={`absolute -bottom-1 -left-1 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center ${isActive ? 'bg-emerald-400' : 'bg-rose-400'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-100 animate-pulse' : 'bg-rose-100'}`} />
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-extrabold text-sm truncate text-white flex items-center gap-1.5">
                        {a.name}
                        <Badge className={isActive ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40 text-[9px]' : 'bg-rose-500/20 text-rose-300 border-rose-400/40 text-[9px]'}>
                          {isActive ? 'نشط' : 'متوقف'}
                        </Badge>
                      </div>
                      {a.email && <div className="text-[10px] text-white/65 truncate" dir="ltr">{a.email}</div>}
                      {a.phone && <div className="text-[10px] text-emerald-300/90 mt-0.5" dir="ltr">{a.phone}</div>}
                    </div>
                    {/* Commission ring */}
                    <div className="relative w-12 h-12 flex-shrink-0">
                      <svg viewBox="0 0 36 36" className="w-12 h-12 -rotate-90">
                        <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="3.5" />
                        <circle cx="18" cy="18" r="15.5" fill="none" stroke="#D4AF37" strokeWidth="3.5" strokeLinecap="round"
                          strokeDasharray={`${Math.min(100, (a.commission_percent || 0) * 3)} 97`} />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center text-[10px] font-extrabold text-gold" dir="ltr">
                        {a.commission_percent || 0}%
                      </div>
                    </div>
                  </div>
                </div>

                {/* Body */}
                <div className="p-4 space-y-3">
                  {/* Referral code box */}
                  <div className="relative rounded-xl border border-gold/30 bg-gradient-to-l from-gold/[0.09] to-transparent p-3 overflow-hidden">
                    <div className="absolute top-0 right-0 h-full w-1 bg-gradient-to-b from-gold to-amber-500 opacity-60" />
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[9px] text-muted-foreground mb-0.5 flex items-center gap-1"><KeyRound className="w-2.5 h-2.5 text-gold" /> كود الإحالة</div>
                        <div className="font-mono font-extrabold text-navy text-base tracking-wider" dir="ltr">{a.unique_code}</div>
                      </div>
                      <button
                        onClick={() => copyInvite(a.unique_code)}
                        className="flex-shrink-0 bg-gradient-to-l from-navy to-navy-light hover:from-navy-light hover:to-navy text-gold px-3 py-2 rounded-xl text-[11px] font-extrabold flex items-center gap-1 shadow-md active:scale-[0.97] transition-all"
                        title="نسخ رابط الدعوة"
                      >
                        <Copy className="w-3.5 h-3.5" /> نسخ
                      </button>
                    </div>
                    <div className="mt-2 pt-2 border-t border-gold/20 flex items-center justify-between gap-2">
                      <div className="text-[9px] text-muted-foreground flex items-center gap-1 min-w-0">
                        <Link2 className="w-2.5 h-2.5 text-gold flex-shrink-0" />
                        <span className="font-mono truncate" dir="ltr">{inviteUrl}</span>
                      </div>
                      {a.phone && (
                        <button onClick={() => shareWhatsApp(a)} className="flex-shrink-0 w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 hover:bg-emerald-500/25 flex items-center justify-center transition-colors" title="مشاركة واتساب">
                          <Send className="w-3 h-3 text-emerald-600" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Stats tiles */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-center p-2.5 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-500/25 rounded-xl">
                      <div className="font-extrabold text-navy text-xl tabular-nums">{a.total_referrals || 0}</div>
                      <div className="text-[10px] text-muted-foreground">إحالة</div>
                    </div>
                    <div className="text-center p-2.5 bg-gradient-to-br from-gold/15 to-amber-500/10 border border-gold/30 rounded-xl">
                      <div className="font-extrabold text-[#8a6d1d] text-xl tabular-nums">{(a.total_earnings || 0).toLocaleString()}</div>
                      <div className="text-[10px] text-muted-foreground">ر.ي عمولات</div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1.5 pt-1 border-t border-gold/15">
                    <Button size="sm" variant="outline" className="flex-1 border-gold/35 hover:bg-gold/10 hover:border-gold rounded-lg font-bold" onClick={() => { setEditing(a); setOpen(true) }}>
                      <Edit className="w-3.5 h-3.5 ml-1" /> تعديل
                    </Button>
                    <Button size="sm" variant="outline" className={isActive
                      ? 'border-rose-500/30 text-rose-500 hover:bg-rose-500/10 rounded-lg'
                      : 'border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 rounded-lg'}
                      onClick={() => toggleStatus(a)}>
                      {isActive ? <><UserX className="w-3.5 h-3.5 ml-1" /> إيقاف</> : <><UserCheck className="w-3.5 h-3.5 ml-1" /> تنشيط</>}
                    </Button>
                    <Button size="sm" variant="outline" className="border-rose-500/30 text-rose-500 hover:bg-rose-500/10 rounded-lg w-9 p-0" onClick={() => setDeleteTarget(a)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {open && <AffiliateDialogRoyal open={open} onOpenChange={setOpen} initial={editing} onSaved={load} />}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o && !deleting) setDeleteTarget(null) }}
        title="تأكيد حذف المسوّق"
        message="هل أنت متأكد من الحذف؟"
        itemLabel="سيتم حذف المسوّق التالي:"
        itemName={deleteTarget?.name}
        confirmLabel="حذف"
        cancelLabel="إلغاء"
        variant="danger"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </LuxSection>
  )
}

// ============================================================================
// AFFILIATE DIALOG — royal form
// ============================================================================
function AffiliateDialogRoyal({ open, onOpenChange, initial, onSaved }: any) {
  const [form, setForm] = useState<any>(initial || { name: '', email: '', phone: '', unique_code: '', commission_percent: 10, status: 'نشط' })
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    setForm(initial || { name: '', email: '', phone: '', unique_code: '', commission_percent: 10, status: 'نشط' })
  }, [initial])

  const genCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code = 'FIA-'
    for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length))
    setForm((f: any) => ({ ...f, unique_code: code }))
  }

  const save = async () => {
    if (!form.name || !form.email) { toast.error('الاسم والبريد مطلوبان'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/affiliates', {
        method: initial ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(initial ? { id: initial.id, ...form } : form),
      })
      if (res.ok) {
        toast.success(initial ? 'تم تحديث بيانات المسوّق' : 'تم إنشاء المسوّق بنجاح')
        onSaved(); onOpenChange(false)
      } else {
        const d = await res.json(); toast.error(d.error || 'فشل')
      }
    } finally { setSaving(false) }
  }

  return (
    <LuxDialog
      open={open}
      onOpenChange={onOpenChange}
      title={initial ? 'تعديل المسوّق' : 'إضافة مسوّق جديد'}
      subtitle={initial ? 'تحديث بيانات المسوّق بالعمولة' : 'تسجيل عضو جديد في برنامج التسويق بالعمولة'}
      icon={Target}
      gradient="from-[#07130d] via-emerald-950 to-teal-950"
      maxWidth="sm:max-w-lg"
      footer={
        <LuxSaveBar
          onCancel={() => onOpenChange(false)}
          onSave={save}
          saving={saving}
          saveLabel={initial ? 'حفظ التعديلات' : 'إنشاء المسوّق'}
          icon={BadgeCheck}
          gradient="from-gold to-amber-500"
          text="text-navy"
        />
      }
    >
      <LuxField label="اسم المسوّق" icon={Users} required>
        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={luxInput} placeholder="الاسم الكامل" />
      </LuxField>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <LuxField label="البريد الإلكتروني" icon={Mail} required>
          <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} dir="ltr" className={luxInput} placeholder="marketer@email.com" />
        </LuxField>
        <LuxField label="رقم الهاتف (واتساب)" icon={Phone}>
          <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} dir="ltr" className={luxInput} placeholder="+967 7XX XXX XXX" />
        </LuxField>
      </div>

      {/* Referral code + generator */}
      <LuxField label="كود الإحالة" icon={KeyRound} hint="اتركه فارغاً ليُولَّد تلقائياً من الخادم">
        <div className="flex gap-2">
          <Input value={form.unique_code} onChange={(e) => setForm({ ...form, unique_code: e.target.value.toUpperCase() })} dir="ltr" className={luxInput + ' font-mono font-bold flex-1'} placeholder="FIA-XXXXXX" />
          <button type="button" onClick={genCode}
            className="flex-shrink-0 px-3 rounded-xl border border-gold/30 bg-gradient-to-b from-white to-gold/10 hover:from-gold/15 text-navy text-xs font-extrabold flex items-center gap-1 shadow-sm transition-all active:scale-[0.97]">
            <Sparkles className="w-3.5 h-3.5 text-gold" /> توليد
          </button>
        </div>
      </LuxField>

      {/* Commission — stepper */}
      <LuxField label="نسبة العمولة" icon={Percent} hint="نسبة من مبلغ كل دورة تُباع عبر رابط الإحالة">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setForm({ ...form, commission_percent: Math.max(1, (parseInt(form.commission_percent) || 10) - 1) })}
            className="w-10 h-11 rounded-xl border border-gold/30 bg-white hover:bg-gold/10 text-navy font-bold shadow-sm transition-colors">−</button>
          <div className="flex-1 relative">
            <Input type="number" value={form.commission_percent} onChange={(e) => setForm({ ...form, commission_percent: parseFloat(e.target.value) || 0 })}
              className={luxInput + ' text-center text-lg font-extrabold'} />
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gold font-extrabold text-lg pointer-events-none">%</span>
          </div>
          <button type="button" onClick={() => setForm({ ...form, commission_percent: Math.min(100, (parseInt(form.commission_percent) || 10) + 1) })}
            className="w-10 h-11 rounded-xl border border-gold/30 bg-white hover:bg-gold/10 text-navy font-bold shadow-sm transition-colors">+</button>
        </div>
        {/* Quick presets */}
        <div className="grid grid-cols-4 gap-1.5 mt-2">
          {[5, 10, 15, 20].map((p) => (
            <button key={p} type="button" onClick={() => setForm({ ...form, commission_percent: p })}
              className={`py-1.5 rounded-lg border text-[11px] font-extrabold transition-all ${
                form.commission_percent === p ? 'border-gold bg-gradient-to-b from-gold/20 to-amber-500/10 text-navy shadow-sm' : 'border-gold/20 bg-white text-muted-foreground hover:border-gold/40'
              }`}>
              {p}%
            </button>
          ))}
        </div>
      </LuxField>

      {/* Status */}
      <LuxField label="حالة الحساب" icon={UserCheck}>
        <div className="grid grid-cols-2 gap-2">
          {[{ v: 'نشط', label: 'نشط', grad: 'from-emerald-500 to-teal-600' }, { v: 'متوقف', label: 'متوقف', grad: 'from-rose-500 to-red-600' }].map((s) => {
            const active = form.status === s.v
            return (
              <button key={s.v} type="button" onClick={() => setForm({ ...form, status: s.v })}
                className={`py-2.5 rounded-xl border-2 text-xs font-extrabold transition-all ${
                  active ? `border-transparent bg-gradient-to-br ${s.grad} text-white shadow-md scale-[1.02]` : 'border-gold/25 bg-white text-muted-foreground hover:border-gold/50'
                }`}>
                {s.label}
              </button>
            )
          })}
        </div>
      </LuxField>
    </LuxDialog>
  )
}
