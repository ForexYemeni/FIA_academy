'use client'

// 💱 طرق سحب الأرباح — كتالوج الدول والعملات (للإدارة)
// v3 فاخر: تعديل كامل لكل طريقة + قوائم منسدلة بحثية (LuxCombo)
// + إحصاءات حية + بحث + فلترة حالة/دولة + تأكيد حذف آمن

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { LuxDialog, LuxField, LuxSection, LuxStats, LuxSearch, LuxEmpty, luxInput, LuxCombo } from './luxury'
import { ConfirmDialog } from '@/components/fia/confirm-dialog'
import { cn } from '@/lib/utils'
import {
  Plus, Trash2, Loader2, Globe2, RefreshCw, Coins, Power, Landmark,
  Wallet, CheckCircle2, XCircle, Pencil, Search,
} from 'lucide-react'

interface WMethod {
  id: string
  country: string
  name: string
  currency: string | null
  instructions: string | null
  enabled: boolean
  sort: number
}

const COUNTRIES = [
  'اليمن', 'السعودية', 'الإمارات', 'عُمان', 'قطر', 'الكويت', 'البحرين', 'العراق',
  'مصر', 'الأردن', 'فلسطين', 'لبنان', 'سوريا', 'السودان', 'ليبيا', 'تونس',
  'الجزائر', 'المغرب', 'موريتانيا', 'الصومال', 'جزر القمر', 'دولة أخرى', 'عالمي',
]

const CURRENCIES = [
  'ر.ي', '$', 'ر.س', 'د.إ', 'ر.ع', 'د.ق', 'د.ك', 'د.ب', 'د.ع', 'ج.م', 'د.أ', '₪',
  'د.ل', 'ل.ل', 'ل.س', 'ج.س', 'د.ت', 'د.ج', 'د.م', 'أوقية', 'فرنك قمري', 'ش.ص', '€', 'USDT',
]

type StatusFilter = 'all' | 'on' | 'off'

/* نموذج الإضافة/التعديل المشترك */
type MethodForm = { country: string; name: string; currency: string; instructions: string; enabled: boolean }
const EMPTY_FORM: MethodForm = { country: 'اليمن', name: '', currency: 'ر.ي', instructions: '', enabled: true }

export function AdminWithdrawalMethods() {
  const [methods, setMethods] = useState<WMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [query, setQuery] = useState('')
  const [statusF, setStatusF] = useState<StatusFilter>('all')
  const [countryF, setCountryF] = useState<string>('الكل')
  const [deleteFor, setDeleteFor] = useState<WMethod | null>(null)
  const [editFor, setEditFor] = useState<WMethod | null>(null)
  const [addForm, setAddForm] = useState<MethodForm>(EMPTY_FORM)
  const [editForm, setEditForm] = useState<MethodForm>(EMPTY_FORM)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      // الإدارة ترى الكل — حتى المعطلة (الجسر يضيف توكن الإدارة تلقائياً)
      const res = await fetch('/api/withdrawal-methods')
      const data = await res.json()
      setMethods(Array.isArray(data) ? data : [])
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  /* خيارات القوائم المنسدلة الفاخرة */
  const countryOptions = useMemo(() => COUNTRIES.map((c) => ({
    value: c, label: c, emoji: c === 'عالمي' ? '🌍' : c === 'اليمن' ? '🏛️' : '📍',
    hint: c === 'اليمن' ? 'المقر الرئيسي' : c === 'عالمي' ? 'تظهر لكل الدول' : undefined,
  })), [])
  const currencyOptions = useMemo(() => CURRENCIES.map((c) => ({ value: c, label: c })), [])

  const openEdit = (m: WMethod) => {
    setEditForm({
      country: m.country, name: m.name,
      currency: m.currency || 'ر.ي',
      instructions: m.instructions || '',
      enabled: !!m.enabled,
    })
    setEditFor(m)
  }

  const add = async () => {
    if (!addForm.country || !addForm.name.trim()) { toast.error('الدولة واسم الطريقة مطلوبان'); return }
    setBusy(true)
    try {
      const res = await fetch('/api/withdrawal-methods', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'تعذر الإضافة'); return }
      toast.success('أُضيفت الطريقة إلى الكتالوج — يراها المدربون في بلدهم فوراً')
      setAddForm({ ...addForm, name: '', instructions: '' })
      load()
    } catch { toast.error('تعذر الاتصال') }
    setBusy(false)
  }

  const saveEdit = async () => {
    if (!editFor) return
    if (!editForm.country || !editForm.name.trim()) { toast.error('الدولة واسم الطريقة مطلوبان'); return }
    setBusy(true)
    try {
      const res = await fetch('/api/withdrawal-methods', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editFor.id, ...editForm }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'تعذر حفظ التعديل'); return }
      toast.success('حُفظت التعديلات — تظهر للمدربين فوراً')
      setEditFor(null)
      load()
    } catch { toast.error('تعذر الاتصال') }
    setBusy(false)
  }

  const toggle = async (m: WMethod) => {
    try {
      const res = await fetch('/api/withdrawal-methods', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: m.id, enabled: !m.enabled }),
      })
      if (!res.ok) { toast.error('تعذر التحديث'); return }
      toast.success(!m.enabled ? 'فُعّلت الطريقة — ظهرت للمدربين' : 'عُطّلت الطريقة — اختفت عن المدربين')
      load()
    } catch { toast.error('تعذر الاتصال') }
  }

  const remove = async (id: string) => {
    try {
      const res = await fetch(`/api/withdrawal-methods?id=${id}`, { method: 'DELETE' })
      if (!res.ok) { toast.error('تعذر الحذف'); return }
      toast.success('حُذفت الطريقة من الكتالوج')
      load()
    } catch { toast.error('تعذر الاتصال') }
    setDeleteFor(null)
  }

  /* 🔍 ترشيح: بحث + حالة + دولة */
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return methods.filter((m) => {
      if (statusF === 'on' && !m.enabled) return false
      if (statusF === 'off' && m.enabled) return false
      if (countryF !== 'الكل' && m.country !== countryF) return false
      if (q && ![m.name, m.country, m.currency, m.instructions].some((v) => v && String(v).toLowerCase().includes(q))) return false
      return true
    })
  }, [methods, query, statusF, countryF])

  const byCountry = useMemo(() => filtered.reduce<Record<string, WMethod[]>>((acc, m) => {
    ;(acc[m.country] = acc[m.country] || []).push(m)
    return acc
  }, {}), [filtered])

  const countriesTouched = new Set(methods.map((m) => m.country)).size
  const enabledCount = methods.filter((m) => m.enabled).length
  const disabledCount = methods.length - enabledCount

  return (
    <LuxSection
      title="طرق السحب — الدول والعملات"
      subtitle="أضف وعدّل طرق السحب المتاحة لكل دولة (المقر الرئيسي: اليمن) — يراها المدربون بحسب بلدهم ويضيفون حساباتهم عليها"
      icon={Landmark}
      themeKey="gold"
      count={methods.length}
      actions={
        <Button onClick={load} variant="ghost" size="sm" className="border border-white/20 bg-white/5 text-white/85 hover:bg-white/15 hover:text-white">
          <RefreshCw className={cn('ml-1 h-3.5 w-3.5', loading && 'animate-spin')} /> تحديث الكتالوج
        </Button>
      }
      stats={
        <LuxStats items={[
          { icon: Wallet, label: 'إجمالي الطرق', value: methods.length, grad: 'from-gold to-amber-600' },
          { icon: Globe2, label: 'دول مغطاة', value: countriesTouched, grad: 'from-sky-400 to-blue-600' },
          { icon: CheckCircle2, label: 'مفعّلة للمدربين', value: enabledCount, grad: 'from-emerald-400 to-teal-600' },
          { icon: XCircle, label: 'معطّلة حالياً', value: disabledCount, grad: 'from-slate-500 to-slate-700' },
        ]} />
      }
      toolbar={
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <LuxSearch value={query} onChange={setQuery} placeholder="ابحث باسم الطريقة أو العملة أو التعليمات..." className="min-w-[220px] flex-1" />
            <div className="flex items-center gap-1">
              {([['all', 'الكل'], ['on', 'مفعّلة'], ['off', 'معطّلة']] as [StatusFilter, string][]).map(([k, label]) => (
                <button key={k} onClick={() => setStatusF(k)}
                  className={cn('rounded-full border px-3 py-1 text-[11px] font-bold transition-all active:scale-95',
                    statusF === k
                      ? 'border-gold bg-gradient-to-l from-gold to-amber-500 text-navy shadow-[0_2px_12px_rgba(212,175,55,0.4)]'
                      : 'border-navy/15 bg-white text-navy/60 hover:border-gold/40')}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          {/* فلتر الدولة */}
          <div className="flex flex-wrap items-center gap-1.5">
            <Globe2 className="h-4 w-4 text-gold" />
            {['الكل', ...Array.from(new Set([...methods.map((m) => m.country), 'اليمن']))].map((c) => (
              <button key={c} onClick={() => setCountryF(c)} className={cn(
                'rounded-full border px-3 py-1 text-[11px] font-bold transition-all active:scale-95',
                countryF === c
                  ? 'border-navy bg-navy text-gold shadow-md'
                  : 'border-navy/15 bg-white text-navy/60 hover:border-gold/40')}>
                {c}
              </button>
            ))}
          </div>
        </div>
      }
    >
      {loading ? (
        <div className="flex flex-col items-center gap-3 py-14">
          <Loader2 className="h-10 w-10 animate-spin text-gold" />
          <p className="text-xs font-bold text-muted-foreground">جارٍ تحميل طرق السحب...</p>
        </div>
      ) : (
        <>
          {/* ═══ إضافة طريقة جديدة ═══ */}
          <Card className="relative mb-6 overflow-hidden border-gold/30 bg-gradient-to-br from-gold/[0.08] via-white to-transparent p-5 shadow-[0_8px_30px_-10px_rgba(212,175,55,0.3)]">
            <div className="absolute inset-0 opacity-[0.1]" style={{ backgroundImage: 'radial-gradient(circle at 90% 20%, #D4AF37 1.2px, transparent 1.2px)', backgroundSize: '16px 16px' }} />
            <p className="relative mb-4 flex items-center gap-2 text-sm font-extrabold text-navy">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-gold to-amber-500 text-white shadow"><Plus className="h-4 w-4" /></span>
              إضافة طريقة سحب جديدة
            </p>
            <div className="relative grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <Label className="mb-1 flex items-center gap-1 text-[11px] font-bold text-navy/70"><Globe2 className="h-3 w-3 text-gold" /> الدولة *</Label>
                <LuxCombo value={addForm.country} onChange={(v) => setAddForm({ ...addForm, country: v })} options={countryOptions} searchPlaceholder="ابحث عن الدولة..." />
              </div>
              <div>
                <Label className="mb-1 flex items-center gap-1 text-[11px] font-bold text-navy/70"><Landmark className="h-3 w-3 text-gold" /> اسم الطريقة *</Label>
                <Input value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} placeholder="وسترن يونيون / محفظة / بنك..." className={luxInput} />
              </div>
              <div>
                <Label className="mb-1 flex items-center gap-1 text-[11px] font-bold text-navy/70"><Coins className="h-3 w-3 text-gold" /> العملة</Label>
                <LuxCombo value={addForm.currency} onChange={(v) => setAddForm({ ...addForm, currency: v })} options={currencyOptions} searchPlaceholder="ابحث عن العملة..." />
              </div>
              <div>
                <Label className="mb-1 flex items-center gap-1 text-[11px] font-bold text-navy/70"><CheckCircle2 className="h-3 w-3 text-gold" /> تعليمات للمدرب</Label>
                <Input value={addForm.instructions} onChange={(e) => setAddForm({ ...addForm, instructions: e.target.value })} placeholder="ماذا يكتب في حسابه؟" className={luxInput} />
              </div>
            </div>
            <Button onClick={add} disabled={busy} className="relative mt-4 overflow-hidden rounded-xl bg-gradient-to-l from-gold to-amber-500 px-7 text-sm font-extrabold text-navy shadow-[0_6px_20px_rgba(212,175,55,0.4)] active:scale-[0.98] disabled:opacity-60">
              <span className="absolute inset-0 lux-shimmer" />
              {busy ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Plus className="ml-2 h-4 w-4" />} إضافة إلى الكتالوج
            </Button>
          </Card>

          {/* ═══ القائمة حسب الدولة ═══ */}
          {Object.keys(byCountry).length === 0 ? (
            <LuxEmpty
              icon={Landmark}
              title={methods.length === 0 ? 'لا توجد طرق سحب بعد' : 'لا نتائج مطابقة لبحثك'}
              hint={methods.length === 0 ? 'أضف طرق السحب لكل دولة — يراها المدربون في لوحتهم ويضيفون حساباتهم عليها ليتدفق أرباحهم' : 'جرّب تعديل البحث أو الفلاتر لعرض المزيد'}
            />
          ) : (
            <div className="space-y-5">
              {Object.entries(byCountry).map(([country, list]) => (
                <div key={country} className="overflow-hidden rounded-2xl border border-gold/20 bg-gradient-to-b from-white to-gold/[0.02]">
                  {/* رأس الدولة */}
                  <div className="flex items-center justify-between gap-2 border-b border-gold/15 bg-gradient-to-l from-gold/[0.1] to-transparent px-4 py-2.5">
                    <p className="flex items-center gap-2 text-xs font-extrabold text-navy">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-gold to-amber-500 text-white shadow-sm"><Globe2 className="h-3.5 w-3.5" /></span>
                      {country}
                      {country === 'اليمن' && <Badge className="border-gold/40 bg-gold/15 text-[9px] text-gold">المقر الرئيسي 🏛️</Badge>}
                    </p>
                    <Badge variant="outline" className="text-[9px] text-muted-foreground">{list.length} طريقة • {list.filter((m) => m.enabled).length} مفعّلة</Badge>
                  </div>
                  <div className="grid gap-2.5 p-3 sm:grid-cols-2">
                    {list.map((m) => (
                      <Card key={m.id} className={cn('group flex items-center justify-between gap-2 p-3 transition-all duration-300',
                        m.enabled ? 'border-gold/25 hover:border-gold/50 hover:shadow-[0_8px_24px_-8px_rgba(212,175,55,0.35)]' : 'border-dashed border-slate-300 opacity-60')}>
                        <div className="min-w-0 flex-1">
                          <p className="flex flex-wrap items-center gap-1.5 text-sm font-bold text-navy">
                            <span className={cn('flex h-6 w-6 items-center justify-center rounded-lg text-white', m.enabled ? 'bg-gradient-to-br from-gold to-amber-500' : 'bg-slate-300')}>
                              <Coins className="h-3.5 w-3.5" />
                            </span>
                            {m.name}
                            <span className="rounded-full border border-gold/40 bg-gold/10 px-2 py-0.5 text-[10px] font-black text-gold" dir="ltr">{m.currency || '—'}</span>
                            {!m.enabled && <Badge variant="outline" className="border-slate-300 text-[9px] text-slate-400">معطّلة</Badge>}
                          </p>
                          {m.instructions && <p className="mt-1 line-clamp-2 pl-8 text-[10px] leading-relaxed text-muted-foreground">{m.instructions}</p>}
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <button onClick={() => openEdit(m)} title="تعديل الطريقة"
                            className="rounded-lg bg-sky-50 p-2 text-sky-600 transition-all hover:bg-sky-100 active:scale-90">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button onClick={() => toggle(m)} title={m.enabled ? 'تعطيل — تخفي عن المدربين' : 'تفعيل — تظهر للمدربين'}
                            className={cn('rounded-lg p-2 transition-all active:scale-90',
                              m.enabled ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-slate-50 text-gray-400 hover:bg-slate-100')}>
                            <Power className="h-4 w-4" />
                          </button>
                          <button onClick={() => setDeleteFor(m)} title="حذف نهائي"
                            className="rounded-lg bg-red-50 p-2 text-red-500/80 transition-all hover:bg-red-100 hover:text-red-600 active:scale-90">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
              <p className="flex items-center justify-center gap-1.5 pt-1 text-[10px] text-muted-foreground">
                <Search className="h-3 w-3" /> يظهر للمدرب {filtered.length} من {methods.length} طريقة بعد الترشيح
              </p>
            </div>
          )}
        </>
      )}

      {/* ═══ حوار تعديل الطريقة ═══ */}
      <LuxDialog
        open={!!editFor} onOpenChange={(o) => !o && setEditFor(null)}
        title={`تعديل طريقة السحب — ${editFor?.name || ''}`}
        subtitle={`${editFor?.country || ''} • حدّث البيانات وحفظها لتصل للمدربين فوراً`}
        icon={Pencil}
        footer={
          <div className="flex w-full gap-2">
            <Button variant="outline" onClick={() => setEditFor(null)} className="flex-1 rounded-xl border-navy/20 font-bold text-navy hover:bg-navy/5">تراجع</Button>
            <Button onClick={saveEdit} disabled={busy}
              className="relative flex-[2] overflow-hidden rounded-xl bg-gradient-to-l from-gold to-amber-500 font-extrabold text-navy shadow-lg active:scale-[0.98] disabled:opacity-60">
              <span className="absolute inset-0 lux-shimmer" />
              {busy ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="ml-2 h-4 w-4" />} حفظ التعديلات
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <LuxField label="الدولة" icon={Globe2} required>
              <LuxCombo value={editForm.country} onChange={(v) => setEditForm({ ...editForm, country: v })} options={countryOptions} searchPlaceholder="ابحث عن الدولة..." />
            </LuxField>
            <LuxField label="اسم الطريقة" icon={Landmark} required>
              <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} placeholder="وسترن يونيون / محفظة / بنك..." className={luxInput} />
            </LuxField>
            <LuxField label="العملة" icon={Coins}>
              <LuxCombo value={editForm.currency} onChange={(v) => setEditForm({ ...editForm, currency: v })} options={currencyOptions} searchPlaceholder="ابحث عن العملة..." />
            </LuxField>
            <LuxField label="حالة الطريقة" icon={Power} hint="المعطّلة تختفي عن المدربين دون حذف">
              <div className="flex h-11 items-center gap-3 rounded-xl border border-gold/30 bg-white px-4">
                <Switch checked={editForm.enabled} onCheckedChange={(v) => setEditForm({ ...editForm, enabled: v })} />
                <span className={cn('text-xs font-bold', editForm.enabled ? 'text-emerald-600' : 'text-slate-400')}>
                  {editForm.enabled ? 'مفعّلة — ظاهرة للمدربين' : 'معطّلة — مخفية'}
                </span>
              </div>
            </LuxField>
          </div>
          <LuxField label="تعليمات للمدرب" icon={CheckCircle2} hint="ماذا يكتب المدرب في حسابه عند إضافته هذه الطريقة؟">
            <Textarea value={editForm.instructions} onChange={(e) => setEditForm({ ...editForm, instructions: e.target.value })} rows={3} placeholder="مثال: رقم المحفظة يجب أن يكون باسم صاحب الحساب نفسه" className={luxInput} />
          </LuxField>
          <p className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-[11px] leading-relaxed text-sky-800">
            <CheckCircle2 className="ml-1 inline h-3.5 w-3.5" /> التعديل يشمل كل شيء: الدولة، الاسم، العملة، التعليمات والحالة — حسابات المدربين المرتبطة بالطريقة تبقى سليمة.
          </p>
        </div>
      </LuxDialog>

      {/* تأكيد الحذف */}
      <ConfirmDialog
        open={!!deleteFor}
        onOpenChange={(o) => !o && setDeleteFor(null)}
        title="حذف طريقة سحب؟"
        message={`سيتم حذف «${deleteFor?.name || ''}» (${deleteFor?.country || ''}) نهائياً من الكتالوج — المدربون الذين أضافوا حسابات عليها لن يتأثروا بحساباتهم، لكنها لن تظهر للمدربين الجدد.`}
        itemName={deleteFor?.name}
        confirmLabel="حذف نهائياً"
        onConfirm={() => remove(deleteFor!.id)}
      />
    </LuxSection>
  )
}
