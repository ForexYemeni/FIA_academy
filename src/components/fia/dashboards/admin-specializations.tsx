'use client'

// 🎓 التخصصات — الكتالوج المهني الموحد (للإدارة)
// إدارة المسميات الوظيفية (مدرب/استشاري/أخصائي/محاضر...) والتخصصات العالمية
// التي يضيفها كل المستخدمين إلى ملفاتهم — إضافة/تعديل/تفعيل/ترتيب/حذف

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { LuxDialog, LuxField, LuxSection, LuxStats, LuxSearch, LuxEmpty, LuxPicker, luxInput } from './luxury'
import { ConfirmDialog } from '@/components/fia/confirm-dialog'
import { refreshSpecializationCatalog } from '@/lib/use-specializations'
import { cn } from '@/lib/utils'
import {
  Plus, Trash2, Loader2, GraduationCap, RefreshCw, Briefcase, Sparkles,
  CheckCircle2, XCircle, Pencil, Search, BookOpen,
} from 'lucide-react'

interface SpecItem {
  id: string
  name: string
  type: 'title' | 'specialization'
  icon?: string | null
  enabled: boolean
  sort: number
}

type TypeFilter = 'all' | 'title' | 'specialization'
type StatusFilter = 'all' | 'on' | 'off'

type SpecForm = { type: 'title' | 'specialization'; name: string; icon: string; sort: string; enabled: boolean }
const EMPTY_FORM: SpecForm = { type: 'title', name: '', icon: '', sort: '0', enabled: true }

export function AdminSpecializations() {
  const [items, setItems] = useState<SpecItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [query, setQuery] = useState('')
  const [typeF, setTypeF] = useState<TypeFilter>('all')
  const [statusF, setStatusF] = useState<StatusFilter>('all')
  const [deleteFor, setDeleteFor] = useState<SpecItem | null>(null)
  const [editFor, setEditFor] = useState<SpecItem | null>(null)
  const [addForm, setAddForm] = useState<SpecForm>(EMPTY_FORM)
  const [editForm, setEditForm] = useState<SpecForm>(EMPTY_FORM)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/specializations')
      const data = await res.json()
      setItems(Array.isArray(data) ? data : [])
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const typeOptions = [
    { value: 'title', label: 'مسمى وظيفي', emoji: '👔', hint: 'يظهر في بيانات المدرب المهنية — مدرب، استشاري، أخصائي...' },
    { value: 'specialization', label: 'تخصص عالمي', emoji: '🌍', hint: 'يظهر لكل المستخدمين لإضافته إلى ملفهم الشخصي' },
  ]

  const add = async () => {
    if (!addForm.name.trim()) { toast.error('اسم العنصر مطلوب'); return }
    setBusy(true)
    try {
      const res = await fetch('/api/specializations', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...addForm, sort: Number(addForm.sort) || 0 }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'تعذر الإضافة'); return }
      toast.success(addForm.type === 'title' ? 'أُضيف المسمى الوظيفي — يظهر في قوائم المدربين فوراً' : 'أُضيف التخصص — يظهر لكل المستخدمين فوراً')
      setAddForm({ ...addForm, name: '', icon: '' })
      refreshSpecializationCatalog()
      load()
    } catch { toast.error('تعذر الاتصال') }
    setBusy(false)
  }

  const openEdit = (s: SpecItem) => {
    setEditForm({ type: s.type, name: s.name, icon: s.icon || '', sort: String(s.sort ?? 0), enabled: !!s.enabled })
    setEditFor(s)
  }

  const saveEdit = async () => {
    if (!editFor) return
    if (!editForm.name.trim()) { toast.error('اسم العنصر مطلوب'); return }
    setBusy(true)
    try {
      const res = await fetch('/api/specializations', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editFor.id, ...editForm, sort: Number(editForm.sort) || 0 }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'تعذر حفظ التعديل'); return }
      toast.success('حُفظت التعديلات — ظهرت للمستخدمين فوراً')
      setEditFor(null)
      refreshSpecializationCatalog()
      load()
    } catch { toast.error('تعذر الاتصال') }
    setBusy(false)
  }

  const toggle = async (s: SpecItem) => {
    try {
      const res = await fetch('/api/specializations', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: s.id, enabled: !s.enabled }),
      })
      if (!res.ok) { toast.error('تعذر التحديث'); return }
      toast.success(!s.enabled ? 'فُعّل — ظهر في القوائم' : 'عُطّل — اختفى من القوائم دون حذف')
      refreshSpecializationCatalog()
      load()
    } catch { toast.error('تعذر الاتصال') }
  }

  const remove = async (id: string) => {
    try {
      const res = await fetch(`/api/specializations?id=${id}`, { method: 'DELETE' })
      if (!res.ok) { toast.error('تعذر الحذف'); return }
      toast.success('حُذف من الكتالوج')
      refreshSpecializationCatalog()
      load()
    } catch { toast.error('تعذر الاتصال') }
    setDeleteFor(null)
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return items.filter((s) => {
      if (typeF !== 'all' && s.type !== typeF) return false
      if (statusF === 'on' && !s.enabled) return false
      if (statusF === 'off' && s.enabled) return false
      if (q && !s.name.toLowerCase().includes(q)) return false
      return true
    })
  }, [items, query, typeF, statusF])

  const titles = filtered.filter((s) => s.type === 'title')
  const specs = filtered.filter((s) => s.type === 'specialization')
  const enabledCount = items.filter((s) => s.enabled).length

  const renderGroup = (list: SpecItem[], kind: 'title' | 'specialization') => {
    if (list.length === 0) return null
    const isTitle = kind === 'title'
    return (
      <div className="overflow-hidden rounded-2xl border border-gold/20 bg-gradient-to-b from-white to-gold/[0.02]">
        <div className="flex items-center justify-between gap-2 border-b border-gold/15 bg-gradient-to-l from-gold/[0.1] to-transparent px-4 py-2.5">
          <p className="flex items-center gap-2 text-xs font-extrabold text-navy">
            <span className={cn('flex h-6 w-6 items-center justify-center rounded-lg text-white shadow-sm bg-gradient-to-br', isTitle ? 'from-gold to-amber-500' : 'from-navy to-navy-light')}>
              {isTitle ? <Briefcase className="h-3.5 w-3.5" /> : <BookOpen className="h-3.5 w-3.5" />}
            </span>
            {isTitle ? 'المسميات الوظيفية — بيانات المدرب المهنية' : 'التخصصات العالمية — ملفات المستخدمين'}
          </p>
          <Badge variant="outline" className="text-[9px] text-muted-foreground">{list.length} عنصر • {list.filter((s) => s.enabled).length} مفعّل</Badge>
        </div>
        <div className="grid gap-2.5 p-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((s) => (
            <Card key={s.id} className={cn('group flex items-center justify-between gap-2 p-3 transition-all duration-300',
              s.enabled ? 'border-gold/25 hover:border-gold/50 hover:shadow-[0_8px_24px_-8px_rgba(212,175,55,0.35)]' : 'border-dashed border-slate-300 opacity-60')}>
              <div className="flex min-w-0 items-center gap-2.5">
                <div className={cn('flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-base shadow-sm', s.enabled ? 'border border-gold/30 bg-gradient-to-br from-gold/15 to-amber-500/10' : 'bg-slate-100')}>
                  {s.icon || (s.type === 'title' ? '🎓' : '📚')}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-navy">{s.name}</p>
                  <p className="text-[10px] text-muted-foreground">ترتيب: {s.sort ?? 0}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button onClick={() => openEdit(s)} title="تعديل" className="rounded-lg bg-sky-50 p-2 text-sky-600 transition-all hover:bg-sky-100 active:scale-90">
                  <Pencil className="h-4 w-4" />
                </button>
                <button onClick={() => toggle(s)} title={s.enabled ? 'تعطيل' : 'تفعيل'}
                  className={cn('rounded-lg p-2 transition-all active:scale-90', s.enabled ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-slate-50 text-gray-400 hover:bg-slate-100')}>
                  {s.enabled ? <Power2 /> : <XCircle className="h-4 w-4" />}
                </button>
                <button onClick={() => setDeleteFor(s)} title="حذف نهائي" className="rounded-lg bg-red-50 p-2 text-red-500/80 transition-all hover:bg-red-100 hover:text-red-600 active:scale-90">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <LuxSection
      title="التخصصات — الكتالوج المهني الموحد"
      subtitle="أضف المسميات الوظيفية للتدريب والتخصصات العالمية — تظهر في قوائم فاخرة لكل المستخدمين لإضافتها إلى ملفاتهم"
      icon={GraduationCap}
      themeKey="gold"
      count={items.length}
      actions={
        <Button onClick={load} variant="ghost" size="sm" className="border border-white/20 bg-white/5 text-white/85 hover:bg-white/15 hover:text-white">
          <RefreshCw className={cn('ml-1 h-3.5 w-3.5', loading && 'animate-spin')} /> تحديث الكتالوج
        </Button>
      }
      stats={
        <LuxStats items={[
          { icon: GraduationCap, label: 'إجمالي العناصر', value: items.length, grad: 'from-gold to-amber-600' },
          { icon: Briefcase, label: 'مسميات وظيفية', value: items.filter((s) => s.type === 'title').length, grad: 'from-sky-400 to-blue-600' },
          { icon: BookOpen, label: 'تخصصات عالمية', value: items.filter((s) => s.type === 'specialization').length, grad: 'from-violet-400 to-purple-600' },
          { icon: CheckCircle2, label: 'مفعّلة', value: enabledCount, grad: 'from-emerald-400 to-teal-600' },
        ]} />
      }
      toolbar={
        <div className="flex flex-wrap items-center gap-2">
          <LuxSearch value={query} onChange={setQuery} placeholder="ابحث بالاسم..." className="min-w-[220px] flex-1" />
          <div className="flex items-center gap-1">
            {([['all', 'الأنواع'], ['title', 'المسميات'], ['specialization', 'التخصصات']] as [TypeFilter, string][]).map(([k, label]) => (
              <button key={k} onClick={() => setTypeF(k)}
                className={cn('rounded-full border px-3 py-1 text-[11px] font-bold transition-all active:scale-95',
                  typeF === k
                    ? 'border-gold bg-gradient-to-l from-gold to-amber-500 text-navy shadow-[0_2px_12px_rgba(212,175,55,0.4)]'
                    : 'border-navy/15 bg-white text-navy/60 hover:border-gold/40')}>
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            {([['all', 'الكل'], ['on', 'مفعّل'], ['off', 'معطّل']] as [StatusFilter, string][]).map(([k, label]) => (
              <button key={k} onClick={() => setStatusF(k)}
                className={cn('rounded-full border px-3 py-1 text-[11px] font-bold transition-all active:scale-95',
                  statusF === k
                    ? 'border-navy bg-navy text-gold shadow-md'
                    : 'border-navy/15 bg-white text-navy/60 hover:border-gold/40')}>
                {label}
              </button>
            ))}
          </div>
        </div>
      }
    >
      {loading ? (
        <div className="flex flex-col items-center gap-3 py-14">
          <Loader2 className="h-10 w-10 animate-spin text-gold" />
          <p className="text-xs font-bold text-muted-foreground">جارٍ تحميل الكتالوج...</p>
        </div>
      ) : (
        <>
          {/* ═══ إضافة عنصر جديد ═══ */}
          <Card className="relative mb-6 overflow-hidden border-gold/30 bg-gradient-to-br from-gold/[0.08] via-white to-transparent p-5 shadow-[0_8px_30px_-10px_rgba(212,175,55,0.3)]">
            <div className="absolute inset-0 opacity-[0.1]" style={{ backgroundImage: 'radial-gradient(circle at 90% 20%, #D4AF37 1.2px, transparent 1.2px)', backgroundSize: '16px 16px' }} />
            <p className="relative mb-4 flex items-center gap-2 text-sm font-extrabold text-navy">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-gold to-amber-500 text-white shadow"><Plus className="h-4 w-4" /></span>
              إضافة إلى الكتالوج المهني
            </p>
            <div className="relative grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <Label className="mb-1 flex items-center gap-1 text-[11px] font-bold text-navy/70"><Sparkles className="h-3 w-3 text-gold" /> النوع *</Label>
                <LuxPicker label="نوع العنصر" icon={Sparkles} value={addForm.type} onChange={(v) => setAddForm({ ...addForm, type: v as 'title' | 'specialization' })} options={typeOptions} />
              </div>
              <div>
                <Label className="mb-1 flex items-center gap-1 text-[11px] font-bold text-navy/70"><GraduationCap className="h-3 w-3 text-gold" /> الاسم *</Label>
                <Input value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} placeholder={addForm.type === 'title' ? 'مدرب معتمد / استشاري / محاضر...' : 'الطب الباطني / التسويق الرقمي...'} className={luxInput} />
              </div>
              <div>
                <Label className="mb-1 flex items-center gap-1 text-[11px] font-bold text-navy/70"><Sparkles className="h-3 w-3 text-gold" /> أيقونة (إيموجي)</Label>
                <Input value={addForm.icon} onChange={(e) => setAddForm({ ...addForm, icon: e.target.value })} placeholder="🎓 🩺 💼 📊" className={luxInput} />
              </div>
              <div>
                <Label className="mb-1 flex items-center gap-1 text-[11px] font-bold text-navy/70"><Search className="h-3 w-3 text-gold" /> الترتيب</Label>
                <Input value={addForm.sort} onChange={(e) => setAddForm({ ...addForm, sort: e.target.value })} placeholder="0" type="number" className={luxInput} dir="ltr" />
              </div>
            </div>
            <Button onClick={add} disabled={busy} className="relative mt-4 overflow-hidden rounded-xl bg-gradient-to-l from-gold to-amber-500 px-7 text-sm font-extrabold text-navy shadow-[0_6px_20px_rgba(212,175,55,0.4)] active:scale-[0.98] disabled:opacity-60">
              <span className="absolute inset-0 lux-shimmer" />
              {busy ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Plus className="ml-2 h-4 w-4" />} إضافة إلى الكتالوج
            </Button>
          </Card>

          {/* ═══ المجموعتان ═══ */}
          {filtered.length === 0 ? (
            <LuxEmpty
              icon={GraduationCap}
              title={items.length === 0 ? 'الكتالوج فارغ' : 'لا نتائج مطابقة لبحثك'}
              hint={items.length === 0 ? 'أضف المسميات الوظيفية والتخصصات — تظهر لكل المستخدمين في قوائم فاخرة لإضافتها إلى ملفاتهم' : 'جرّب تعديل البحث أو الفلاتر'}
            />
          ) : (
            <div className="space-y-5">
              {renderGroup(titles, 'title')}
              {renderGroup(specs, 'specialization')}
              <p className="flex items-center justify-center gap-1.5 pt-1 text-[10px] text-muted-foreground">
                <Search className="h-3 w-3" /> يظهر للمستخدمين {filtered.filter((s) => s.enabled).length} من {items.length} عنصراً بعد الترشيح
              </p>
            </div>
          )}
        </>
      )}

      {/* ═══ حوار التعديل ═══ */}
      <LuxDialog
        open={!!editFor} onOpenChange={(o) => !o && setEditFor(null)}
        title={`تعديل — ${editFor?.name || ''}`}
        subtitle={editFor?.type === 'title' ? 'مسمى وظيفي في بيانات المدرب المهنية' : 'تخصص عالمي يظهر في ملفات المستخدمين'}
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
            <LuxField label="النوع" icon={Sparkles} required>
              <LuxPicker label="نوع العنصر" icon={Sparkles} value={editForm.type} onChange={(v) => setEditForm({ ...editForm, type: v as 'title' | 'specialization' })} options={typeOptions} />
            </LuxField>
            <LuxField label="الاسم" icon={GraduationCap} required>
              <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className={luxInput} />
            </LuxField>
            <LuxField label="أيقونة (إيموجي)" icon={Sparkles}>
              <Input value={editForm.icon} onChange={(e) => setEditForm({ ...editForm, icon: e.target.value })} placeholder="🎓" className={luxInput} />
            </LuxField>
            <LuxField label="الترتيب" icon={Search}>
              <Input value={editForm.sort} onChange={(e) => setEditForm({ ...editForm, sort: e.target.value })} type="number" className={luxInput} dir="ltr" />
            </LuxField>
            <LuxField label="الحالة" icon={CheckCircle2} hint="المعطّل يختفي من القوائم دون حذف">
              <div className="flex h-11 items-center gap-3 rounded-xl border border-gold/30 bg-white px-4">
                <Switch checked={editForm.enabled} onCheckedChange={(v) => setEditForm({ ...editForm, enabled: v })} />
                <span className={cn('text-xs font-bold', editForm.enabled ? 'text-emerald-600' : 'text-slate-400')}>
                  {editForm.enabled ? 'مفعّل — ظاهر في القوائم' : 'معطّل — مخفي'}
                </span>
              </div>
            </LuxField>
          </div>
          <p className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-[11px] leading-relaxed text-sky-800">
            <CheckCircle2 className="ml-1 inline h-3.5 w-3.5" /> التعديل يسري فوراً على كل القوائم المنسدلة في التطبيق: تسجيل المدربين، الملفات الشخصية، وفلاتر الإدارة.
          </p>
        </div>
      </LuxDialog>

      {/* تأكيد الحذف */}
      <ConfirmDialog
        open={!!deleteFor}
        onOpenChange={(o) => !o && setDeleteFor(null)}
        title="حذف من الكتالوج؟"
        message={`سيتم حذف «${deleteFor?.name || ''}» نهائياً — لن يظهر بعد الآن في القوائم. الملفات الشخصية التي اخترته سابقاً تبقى سليمة.`}
        itemName={deleteFor?.name}
        confirmLabel="حذف نهائياً"
        onConfirm={() => remove(deleteFor!.id)}
      />
    </LuxSection>
  )
}

function Power2() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18.36 6.64a9 9 0 1 1-12.73 0" /><line x1="12" y1="2" x2="12" y2="12" />
    </svg>
  )
}
