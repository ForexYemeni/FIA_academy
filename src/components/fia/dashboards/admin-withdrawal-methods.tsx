'use client'

// 💱👑 إدارة كتالوج طرق سحب الأرباح حسب الدولة — للإدارة الملكية

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { SectionCard } from './shell'
import {
  Plus, Trash2, Loader2, Globe2, RefreshCw, Coins, Power, Landmark,
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
  'مصر', 'الأردن', 'فلسطين', 'لبنان', 'السودان', 'ليبيا', 'تونس', 'الجزائر',
  'المغرب', 'موريتانيا', 'الصومال', 'دولة أخرى', 'عالمي',
]

const CURRENCIES = ['ر.ي', '$', 'ر.س', 'د.إ', 'ر.ع', 'د.ق', 'د.ك', 'د.ب', 'د.ع', 'ج.م', 'د.أ', 'د.ل', 'د.ت', 'د.ج', 'د.م', 'أوقية', 'ش.ص', 'USDT']

const inputCls = 'h-11 rounded-xl border-gold/30 focus:border-gold focus:ring-gold/30'

export function AdminWithdrawalMethods() {
  const [methods, setMethods] = useState<WMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [filter, setFilter] = useState<string>('الكل')
  const [form, setForm] = useState({ country: 'اليمن', name: '', currency: 'ر.ي', instructions: '' })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      // الإدارة ترى الكل — حتى المعطلة (GET عام يعيد المفعلة فقط، نجلب عبر admin بالكل عبر تعطيل فلتر)
      const res = await fetch('/api/withdrawal-methods')
      const data = await res.json()
      setMethods(Array.isArray(data) ? data : [])
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const add = async () => {
    if (!form.country || !form.name.trim()) { toast.error('الدولة واسم الطريقة مطلوبان'); return }
    setBusy(true)
    try {
      const res = await fetch('/api/withdrawal-methods', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'تعذر الإضافة'); return }
      toast.success('أُضيفت الطريقة الملكية')
      setForm({ ...form, name: '', instructions: '' })
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
      toast.success(!m.enabled ? 'فُعّلت الطريقة' : 'عُطّلت الطريقة')
      load()
    } catch { toast.error('تعذر الاتصال') }
  }

  const remove = async (id: string) => {
    try {
      const res = await fetch(`/api/withdrawal-methods?id=${id}`, { method: 'DELETE' })
      if (!res.ok) { toast.error('تعذر الحذف'); return }
      toast.success('حُذفت الطريقة')
      load()
    } catch { toast.error('تعذر الاتصال') }
  }

  const shown = filter === 'الكل' ? methods : methods.filter((m) => m.country === filter)
  const byCountry = shown.reduce<Record<string, WMethod[]>>((acc, m) => {
    ;(acc[m.country] = acc[m.country] || []).push(m)
    return acc
  }, {})

  return (
    <SectionCard title="طرق سحب أرباح المدربين — كتالوج الدول والعملات" description="أضف طرق السحب المتاحة لكل دولة (المقر الرئيسي: اليمن) — يراها المدربون بحسب بلدهم ويضيفون حساباتهم عليها">
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-gold" /></div>
      ) : (
        <>
          {/* إضافة طريقة */}
          <Card className="mb-5 border-gold/25 bg-gradient-to-br from-gold/5 to-transparent p-4">
            <p className="mb-3 flex items-center gap-1.5 text-sm font-bold text-navy"><Plus className="h-4 w-4 text-gold" /> إضافة طريقة سحب جديدة</p>
            <div className="grid gap-3 sm:grid-cols-4">
              <div>
                <Label className="text-xs font-semibold">الدولة *</Label>
                <select value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className={`${inputCls} w-full text-sm`}>
                  {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-xs font-semibold">اسم الطريقة *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="وسترن يونيون / محفظة / بنك..." className={inputCls} />
              </div>
              <div>
                <Label className="text-xs font-semibold">العملة</Label>
                <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className={`${inputCls} w-full text-sm`} dir="ltr">
                  {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-xs font-semibold">تعليمات للمدرب</Label>
                <Input value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} placeholder="ماذا يكتب في حسابه؟" className={inputCls} />
              </div>
            </div>
            <Button onClick={add} disabled={busy} className="relative mt-3 overflow-hidden rounded-xl bg-gradient-to-l from-gold to-amber-500 px-6 text-sm font-extrabold text-navy shadow-lg active:scale-[0.98] disabled:opacity-60">
              {busy ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Plus className="ml-2 h-4 w-4" />} إضافة إلى الكتالوج الملكي
            </Button>
          </Card>

          {/* فلتر الدولة */}
          <div className="mb-4 flex flex-wrap items-center gap-1.5">
            <Globe2 className="h-4 w-4 text-gold" />
            {['الكل', ...Array.from(new Set([...methods.map((m) => m.country), 'اليمن']))].map((c) => (
              <button key={c} onClick={() => setFilter(c)} className={`rounded-full border px-3 py-1 text-[11px] font-bold transition-all ${filter === c ? 'border-gold bg-gold text-navy' : 'border-navy/15 bg-white text-navy/60 hover:border-gold/40'}`}>
                {c}
              </button>
            ))}
          </div>

          {/* القائمة حسب الدولة */}
          {Object.keys(byCountry).length === 0 ? (
            <Card className="border-dashed p-8 text-center">
              <Landmark className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">لا طرق في هذا الفلتر — أضف الأولى من الأعلى</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {Object.entries(byCountry).map(([country, list]) => (
                <div key={country}>
                  <p className="mb-2 flex items-center gap-2 text-xs font-extrabold text-navy">
                    <Globe2 className="h-4 w-4 text-gold" /> {country}
                    {country === 'اليمن' && <Badge className="border-gold/40 bg-gold/10 text-[9px] text-gold">المقر الرئيسي 🏛️</Badge>}
                    <Badge variant="outline" className="text-[9px] text-muted-foreground">{list.length} طريقة</Badge>
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {list.map((m) => (
                      <Card key={m.id} className={`flex items-center justify-between gap-2 p-3 ${!m.enabled ? 'opacity-55' : 'border-gold/20'}`}>
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 text-sm font-bold text-navy">
                            <Coins className="h-3.5 w-3.5 text-gold" /> {m.name}
                            <Badge variant="outline" className="text-[9px]" dir="ltr">{m.currency || '—'}</Badge>
                          </p>
                          {m.instructions && <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{m.instructions}</p>}
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <button onClick={() => toggle(m)} title={m.enabled ? 'تعطيل' : 'تفعيل'} className={`rounded-lg p-1.5 transition-all active:scale-90 ${m.enabled ? 'text-emerald-600 hover:bg-emerald-50' : 'text-gray-400 hover:bg-gray-100'}`}>
                            <Power className="h-4 w-4" />
                          </button>
                          <button onClick={() => remove(m.id)} title="حذف" className="rounded-lg p-1.5 text-red-500/70 transition-all hover:bg-red-50 hover:text-red-600 active:scale-90">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 flex justify-end">
            <Button onClick={load} variant="ghost" size="sm" className="text-muted-foreground"><RefreshCw className="ml-1 h-3.5 w-3.5" /> تحديث الكتالوج</Button>
          </div>
        </>
      )}
    </SectionCard>
  )
}
