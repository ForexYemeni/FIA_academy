'use client'

// 💳 حسابات سحب الأرباح — المدرب يضيف حساباته حسب بلده وطرقه المتاحة
// قوائم منسدلة بحثية فاخرة (LuxCombo) مطابقة لتجربة لوحة الإدارة

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth-store'
import { SectionCard } from './shell'
import { LuxCombo } from './luxury'
import {
  Landmark, Plus, Trash2, Loader2, Globe2, Wallet, Copy, Star, Coins, Info,
} from 'lucide-react'

const COUNTRIES = [
  'اليمن', 'السعودية', 'الإمارات', 'عُمان', 'قطر', 'الكويت', 'البحرين', 'العراق',
  'مصر', 'الأردن', 'فلسطين', 'لبنان', 'السودان', 'ليبيا', 'تونس', 'الجزائر',
  'المغرب', 'موريتانيا', 'الصومال', 'دولة أخرى',
]

interface WAccount {
  id: string
  country: string
  method_name: string
  currency: string | null
  account_name: string
  account_number: string | null
  extra_info: string | null
  is_default: boolean
}

interface WMethod {
  id: string
  country: string
  name: string
  currency: string | null
  instructions: string | null
}

const inputCls = 'h-11 rounded-xl border-gold/30 focus:border-gold focus:ring-gold/30'

export function TrainerWithdrawalAccounts() {
  const user = useAuth((s) => s.user)
  const [accounts, setAccounts] = useState<WAccount[]>([])
  const [methods, setMethods] = useState<WMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ country: 'اليمن', method_name: '', account_name: '', account_number: '', extra_info: '', is_default: false })

  const load = useCallback(async () => {
    try {
      const [a, m] = await Promise.all([
        fetch('/api/trainer/withdrawal-accounts').then((r) => r.json()),
        fetch('/api/withdrawal-methods').then((r) => r.json()),
      ])
      setAccounts(Array.isArray(a) ? a : [])
      setMethods(Array.isArray(m) ? m : [])
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const countryMethods = methods.filter((m) => m.country === form.country)
  const selectedMethod = countryMethods.find((m) => m.name === form.method_name)
  const knownCurrencies = Array.from(new Set([...methods.map((m) => m.currency).filter(Boolean), 'ر.ي', '$', 'ر.س', 'د.إ', 'ج.م', 'د.أ', 'د.ع', 'د.ك', 'ر.ع', 'د.ق', 'د.ب', 'USDT'])) as string[]

  // 🎛️ القوائم المنسدلة الفاخرة — مطابقة لتجربة حساب الإدارة
  const countryOptions = useMemo(() => COUNTRIES.map((c) => ({
    value: c, label: c,
    emoji: c === 'دولة أخرى' ? '🌍' : c === 'اليمن' ? '🏛️' : '📍',
    hint: c === 'اليمن' ? 'المقر الرئيسي' : undefined,
  })), [])
  const methodOptions = useMemo(() => countryMethods.map((m) => ({
    value: m.name, label: m.name,
    meta: m.currency || undefined,
    hint: m.instructions ? (m.instructions.length > 46 ? m.instructions.slice(0, 46) + '…' : m.instructions) : undefined,
  })), [methods, form.country])

  const addAccount = async () => {
    if (!form.country || !form.method_name || !form.account_name.trim()) {
      toast.error('اختر الدولة والطريقة واكتب اسم صاحب الحساب')
      return
    }
    setBusy(true)
    try {
      const res = await fetch('/api/trainer/withdrawal-accounts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, account_name: form.account_name.trim(), currency: selectedMethod?.currency || null }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'تعذر الإضافة'); return }
      toast.success('أُضيف حساب السحب')
      setForm({ country: form.country, method_name: '', account_name: '', account_number: '', extra_info: '', is_default: false })
      setAdding(false)
      load()
    } catch { toast.error('تعذر الاتصال') }
    setBusy(false)
  }

  const removeAccount = async (id: string) => {
    try {
      const res = await fetch(`/api/trainer/withdrawal-accounts?id=${id}`, { method: 'DELETE' })
      if (!res.ok) { toast.error('تعذر الحذف'); return }
      toast.success('حُذف الحساب')
      load()
    } catch { toast.error('تعذر الاتصال') }
  }

  return (
    <SectionCard title="حسابات سحب الأرباح" description="أضف حساباتك لتصل أرباحك بأمان — الطرق المتاحة تعرض بحسب بلدك والمقر الرئيسي باليمن">
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-gold" /></div>
      ) : (
        <>
          {/* العملات المدعومة */}
          <Card className="mb-4 border-gold/20 bg-gradient-to-l from-gold/10 to-transparent p-4">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-navy"><Coins className="h-4 w-4 text-gold" /> العملات النقدية المدعومة في المنظومة</p>
            <div className="flex flex-wrap gap-1.5" dir="ltr">
              {knownCurrencies.map((c) => (
                <span key={c} className="rounded-full border border-gold/30 bg-white px-2.5 py-1 text-[10px] font-bold text-navy">{c}</span>
              ))}
            </div>
            <p className="mt-2 text-[10px] text-muted-foreground">أرباحك تُحتسب بعملة كل دورة — وتسحب بأي طريقة متاحة في بلدك</p>
          </Card>

          {/* الحسابات المضافة */}
          {accounts.length === 0 ? (
            <Card className="mb-4 border-dashed p-8 text-center">
              <Landmark className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm font-bold text-navy">لا توجد حسابات سحب بعد</p>
              <p className="mt-1 text-xs text-muted-foreground">أضف أول حساب — وسترن يونيون، محفظة، حوالة بنكية أو عملات رقمية</p>
            </Card>
          ) : (
            <div className="mb-4 grid gap-3 sm:grid-cols-2">
              {accounts.map((a) => (
                <Card key={a.id} className="relative overflow-hidden border-gold/20 p-4">
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-transparent via-gold/60 to-transparent" />
                  <div className="mb-2 flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-navy to-navy-light text-gold"><Wallet className="h-4.5 w-4.5" /></div>
                      <div>
                        <p className="flex items-center gap-1 text-sm font-extrabold text-navy">
                          {a.method_name}
                          {a.is_default && <Star className="h-3.5 w-3.5 fill-gold text-gold" />}
                        </p>
                        <p className="flex items-center gap-1 text-[10px] text-muted-foreground"><Globe2 className="h-3 w-3" /> {a.country}{a.currency ? ` • ${a.currency}` : ''}</p>
                      </div>
                    </div>
                    <button onClick={() => removeAccount(a.id)} className="rounded-lg p-1.5 text-red-500/70 transition-all hover:bg-red-50 hover:text-red-600 active:scale-90" title="حذف الحساب">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="space-y-1 text-xs">
                    <p className="flex justify-between gap-2"><span className="text-muted-foreground">اسم صاحب الحساب:</span><span className="font-bold text-navy">{a.account_name}</span></p>
                    {a.account_number && (
                      <p className="flex items-center justify-between gap-2">
                        <span className="text-muted-foreground">الرقم / العنوان:</span>
                        <button
                          onClick={() => { navigator.clipboard?.writeText(a.account_number || '').catch(() => {}); toast.success('نُسخ رقم الحساب') }}
                          className="flex items-center gap-1 font-mono font-bold text-navy hover:text-gold" dir="ltr"
                        >
                          {a.account_number} <Copy className="h-3 w-3" />
                        </button>
                      </p>
                    )}
                    {a.extra_info && <p className="rounded-lg bg-muted/60 p-2 text-[10px] leading-relaxed text-muted-foreground">{a.extra_info}</p>}
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* نموذج الإضافة */}
          {adding ? (
            <Card className="border-gold/30 bg-gradient-to-br from-gold/5 to-transparent p-4">
              <p className="mb-3 flex items-center gap-1.5 text-sm font-bold text-navy"><Plus className="h-4 w-4 text-gold" /> إضافة حساب سحب</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="mb-1.5 flex items-center gap-1 text-xs font-bold text-navy/70"><Globe2 className="h-3 w-3 text-gold" /> بلد الحساب *</Label>
                  <LuxCombo value={form.country} onChange={(v) => setForm({ ...form, country: v, method_name: '' })} options={countryOptions} searchPlaceholder="ابحث عن الدولة..." />
                </div>
                <div>
                  <Label className="mb-1.5 flex items-center gap-1 text-xs font-bold text-navy/70"><Landmark className="h-3 w-3 text-gold" /> طريقة السحب *</Label>
                  <LuxCombo
                    value={form.method_name}
                    onChange={(v) => setForm({ ...form, method_name: v })}
                    options={methodOptions}
                    searchPlaceholder="ابحث عن الطريقة..."
                    disabled={countryMethods.length === 0}
                  />
                  {countryMethods.length === 0 && <p className="mt-1 text-[10px] text-amber-600">لا توجد طرق مفعّلة لهذه الدولة بعد — الإدارة تضيفها من لوحتها</p>}
                </div>
                <div>
                  <Label className="text-xs font-semibold">اسم صاحب الحساب *</Label>
                  <Input value={form.account_name} onChange={(e) => setForm({ ...form, account_name: e.target.value })} placeholder="الاسم كما في الهوية — يجب أن يطابق حسابك" className={inputCls} />
                </div>
                <div>
                  <Label className="text-xs font-semibold">الرقم / العنوان</Label>
                  <Input value={form.account_number} onChange={(e) => setForm({ ...form, account_number: e.target.value })} placeholder="رقم الحوالة / المحفظة / IBAN..." className={inputCls} dir="ltr" />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs font-semibold">بيانات إضافية</Label>
                  <Input value={form.extra_info} onChange={(e) => setForm({ ...form, extra_info: e.target.value })} placeholder="أي تفاصيل تساعد الإدارة: فرع، عملة مفضلة، ملاحظات..." className={inputCls} />
                </div>
              </div>
              {selectedMethod?.instructions && (
                <p className="mt-3 flex items-start gap-1.5 rounded-xl border border-sky-200 bg-sky-50 p-3 text-[11px] leading-relaxed text-sky-800">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {selectedMethod.instructions}
                </p>
              )}
              <div className="mt-4 flex gap-2">
                <Button onClick={addAccount} disabled={busy} className="relative flex-1 overflow-hidden rounded-xl bg-gradient-to-l from-gold to-amber-500 text-sm font-extrabold text-navy shadow-lg active:scale-[0.98] disabled:opacity-60">
                  {busy ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Plus className="ml-2 h-4 w-4" />} حفظ الحساب
                </Button>
                <Button onClick={() => setAdding(false)} variant="outline" className="rounded-xl border-navy/20 text-sm font-bold text-navy hover:bg-navy/5">إلغاء</Button>
              </div>
            </Card>
          ) : (
            <Button onClick={() => setAdding(true)} className="relative w-full overflow-hidden rounded-xl border border-gold/30 bg-gradient-to-l from-navy to-navy-light py-6 text-sm font-bold text-gold hover:from-navy-light hover:to-navy active:scale-[0.99]">
              <span className="absolute inset-0 fia-lux-shine" />
              <Plus className="ml-2 h-5 w-5" /> أضف حساب سحب جديد
            </Button>
          )}
        </>
      )}
    </SectionCard>
  )
}
