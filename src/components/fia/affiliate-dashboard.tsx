'use client'

// 🤝 التسويق بالعمولة — القسم الموحد الشامل (v6.3)
// كل ما يحتاجه المسوّق في قسم واحد فقط:
//   رابط الدعوة والمشاركة • إحالاته • حسابات السحب (إضافة/حذف بكلمة المرور)
//   سحب العمولة من الرصيد • سجل السحب • إشعارات العمولات لحظياً

import { useEffect, useState, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/lib/auth-store'
import { toast } from 'sonner'
import { LuxCombo } from './dashboards/luxury'
import { PasswordConfirmDialog } from './password-confirm-dialog'
import {
  Gift, Users, Copy, Share2, Loader2, Award,
  Clock, CheckCircle2, Sparkles, Wallet, Landmark, Plus, Trash2,
  XCircle, Bell, TrendingUp, Globe2, Coins, Info, HandCoins,
} from 'lucide-react'

const APP_URL = 'https://fiaacademy.vercel.app'

type SubTab = 'link' | 'accounts' | 'withdraw' | 'history' | 'notifs'

export function AffiliateDashboard() {
  const user = useAuth((s) => s.user)
  const [affiliate, setAffiliate] = useState<any>(null)
  const [referrals, setReferrals] = useState<any[]>([])
  const [accounts, setAccounts] = useState<any[]>([])
  const [withdrawals, setWithdrawals] = useState<any[]>([])
  const [methods, setMethods] = useState<any[]>([])
  const [affiliateNotifs, setAffiliateNotifs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [tab, setTab] = useState<SubTab>('link')

  // إضافة حساب
  const [adding, setAdding] = useState(false)
  const [busyAcc, setBusyAcc] = useState(false)
  const [accForm, setAccForm] = useState({ country: 'اليمن', method_name: '', account_name: '', account_number: '', extra_info: '', is_default: false })
  // حذف حساب بكلمة المرور
  const [deleteFor, setDeleteFor] = useState<any | null>(null)
  const [deleting, setDeleting] = useState(false)
  // طلب سحب
  const [wdAmount, setWdAmount] = useState('')
  const [wdAccount, setWdAccount] = useState('')
  const [wdBusy, setWdBusy] = useState(false)

  const load = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const res = await fetch(`/api/affiliates?user_id=${user.id}`)
      if (!res.ok) { setAffiliate(null); setReferrals([]); setLoading(false); return }
      const data = await res.json()
      if (data.valid && data.affiliate) {
        setAffiliate(data.affiliate)
        const [refsRes, accRes, wdRes, mRes, nRes] = await Promise.all([
          fetch(`/api/affiliate-referrals?affiliate_id=${data.affiliate.id}`).catch(() => null),
          fetch('/api/affiliate-accounts').catch(() => null),
          fetch('/api/affiliate-withdrawals').catch(() => null),
          fetch('/api/withdrawal-methods').catch(() => null),
          fetch(`/api/notifications?user_id=${user.id}`).catch(() => null),
        ])
        if (refsRes?.ok) { const r = await refsRes.json(); setReferrals(Array.isArray(r) ? r : []) }
        if (accRes?.ok) { const a = await accRes.json(); setAccounts(Array.isArray(a) ? a : []) }
        if (wdRes?.ok) { const w = await wdRes.json(); setWithdrawals(Array.isArray(w) ? w : []) }
        if (mRes?.ok) { const m = await mRes.json(); setMethods(Array.isArray(m) ? m : []) }
        if (nRes?.ok) {
          const n = await nRes.json().catch(() => [])
          setAffiliateNotifs((Array.isArray(n) ? n : []).filter((x: any) => String(x.type || '').startsWith('affiliate')))
        }
      } else {
        setAffiliate(null); setReferrals([]); setAccounts([]); setWithdrawals([])
      }
    } catch { setAffiliate(null) }
    setLoading(false)
  }, [user?.id])

  useEffect(() => { load() }, [load])

  const joinAffiliate = async () => {
    if (!user) return
    setCreating(true)
    try {
      const res = await fetch('/api/affiliates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ self_join: true, name: user.name, email: user.email, phone: user.phone || '' }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'فشل التسجيل'); return }
      toast.success('تم تسجيلك في برنامج المسوّقين — رابط دعوتك جاهز!')
      await load()
    } catch { toast.error('تعذر الاتصال') }
    setCreating(false)
  }

  const copyLink = async () => {
    const url = `${APP_URL}/?ref=${affiliate?.unique_code}`
    try { await navigator.clipboard.writeText(url); toast.success('تم نسخ رابط الدعوة') } catch { toast.error('تعذر النسخ') }
  }
  const shareWhatsApp = () => {
    const url = `${APP_URL}/?ref=${affiliate?.unique_code}`
    window.open(`https://wa.me/?text=${encodeURIComponent(`🎓 انضم إلى أكاديمية المستقبل الدولية! دورات احترافية معتمدة في مختلف التخصصات. سجّل عبر رابطي: ${url}`)}`, '_blank')
  }
  const shareTelegram = () => {
    const url = `${APP_URL}/?ref=${affiliate?.unique_code}`
    window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent('انضم إلى أكاديمية المستقبل الدولية')}`, '_blank')
  }

  /* ── حسابات السحب ── */
  const countries = useMemo(() => Array.from(new Set(methods.map((m: any) => m.country))), [methods])
  const countryOpts = countries.map((c: any) => ({ value: c, label: c, emoji: c === 'اليمن' ? '🏛️' : c === 'عالمي' ? '🌍' : '📍' }))
  const countryMethods = useMemo(() => methods.filter((m: any) => m.country === accForm.country), [methods, accForm.country])
  const methodOpts = countryMethods.map((m: any) => ({ value: m.name, label: m.name, emoji: m.name?.includes('USDT') || m.name?.includes('بيتكوين') || /BTC|ETH|عملات/.test(m.name) ? '₿' : '🏦', hint: m.instructions || undefined, meta: m.currency || undefined }))
  const selectedMethod = countryMethods.find((m: any) => m.name === accForm.method_name)

  const addAccount = async () => {
    if (!accForm.method_name || !accForm.account_number.trim()) { toast.error('طريقة السحب ورقم الحساب مطلوبان'); return }
    setBusyAcc(true)
    try {
      const res = await fetch('/api/affiliate-accounts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...accForm, currency: selectedMethod?.currency || 'ر.ي' }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'تعذر الإضافة'); return }
      toast.success('أُضيف حساب السحب — يمكنك سحب عمولتك إليه الآن')
      setAccForm({ country: accForm.country, method_name: '', account_name: '', account_number: '', extra_info: '', is_default: false })
      setAdding(false)
      load()
    } catch { toast.error('تعذر الاتصال') }
    setBusyAcc(false)
  }

  const removeAccount = async (id: string, password: string) => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/affiliate-accounts?id=${id}`, { method: 'DELETE', headers: { 'x-confirm-password': password } })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(data.error || 'تعذر الحذف'); return }
      toast.success('حُذف الحساب بتأكيد كلمة المرور')
      setDeleteFor(null)
      load()
    } catch { toast.error('تعذر الاتصال') }
    setDeleting(false)
  }

  /* ── سحب العمولة ── */
  const reserved = withdrawals.filter((w) => w.status === 'معلق' || w.status === 'مكتمل').reduce((s, w) => s + Number(w.amount || 0), 0)
  const totalEarned = Number(affiliate?.total_earnings || 0)
  const available = Math.max(0, totalEarned - reserved)
  const accountOpts = accounts.map((a: any) => ({ value: a.id, label: `${a.method_name} — ${a.account_number}`, emoji: /USDT|BTC|ETH|عملات|بيتكوين/i.test(a.method_name) ? '₿' : '🏦', hint: `${a.country}${a.account_name ? ' • ' + a.account_name : ''}`, meta: a.currency || undefined }))
  const wdAccountObj = accounts.find((a) => a.id === wdAccount)
  const wdCurrency = wdAccountObj?.currency || 'ر.ي'

  const submitWithdraw = async () => {
    const amount = Number(wdAmount)
    if (!wdAccount) { toast.error('اختر حساب الاستلام أولاً'); return }
    if (!amount || amount <= 0) { toast.error('أدخل مبلغاً صحيحاً'); return }
    setWdBusy(true)
    try {
      const res = await fetch('/api/affiliate-withdrawals', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, account_id: wdAccount }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'تعذر إرسال الطلب'); return }
      toast.success('أُرسل طلب السحب للإدارة — ستصلك إشعار عند المعالجة')
      setWdAmount(''); setWdAccount('')
      setTab('history')
      load()
    } catch { toast.error('تعذر الاتصال') }
    setWdBusy(false)
  }

  /* ── Loading ── */
  if (loading) {
    return <div className="text-center py-12"><Loader2 className="w-6 h-6 mx-auto animate-spin text-navy" /></div>
  }

  /* ── غير مسجّل في البرنامج ── */
  if (!affiliate) {
    return (
      <Card className="p-8 text-center bg-gradient-to-br from-gold/10 via-white to-navy/5 border-gold/30 overflow-hidden relative">
        <div className="absolute top-4 right-4 w-32 h-32 bg-gold/10 rounded-full blur-3xl" />
        <div className="absolute bottom-4 left-4 w-40 h-40 bg-navy/10 rounded-full blur-3xl" />
        <div className="relative">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-gold to-gold-light flex items-center justify-center mb-4 shadow-lg">
            <Gift className="w-8 h-8 text-navy" />
          </div>
          <h3 className="text-2xl font-bold text-navy mb-2">شارك أصدقاءك واكسب عمولة! 🎁</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
            فعّل حسابك في برنامج التسويق بالعمولة واحصل على رابط دعوة خاص بك —
            كل متدرب يسجّل عبر رابطك ويلتحق بدورة مدفوعة تُضاف عمولتك إلى محفظتك تلقائياً مع إشعار فوري.
          </p>
          <div className="grid grid-cols-3 gap-2 max-w-md mx-auto mb-6 text-xs">
            <div className="p-2 bg-white/60 rounded-lg border border-gold/10"><Users className="w-4 h-4 mx-auto text-gold mb-1" /><div>شارك رابطك</div></div>
            <div className="p-2 bg-white/60 rounded-lg border border-gold/10"><CheckCircle2 className="w-4 h-4 mx-auto text-gold mb-1" /><div>سجّل أصدقاءك</div></div>
            <div className="p-2 bg-white/60 rounded-lg border border-gold/10"><HandCoins className="w-4 h-4 mx-auto text-gold mb-1" /><div>اسحب عمولتك</div></div>
          </div>
          <Button onClick={joinAffiliate} disabled={creating} className="bg-navy hover:bg-navy-light" size="lg">
            {creating ? <Loader2 className="w-4 h-4 ml-1 animate-spin" /> : <Gift className="w-4 h-4 ml-1" />}
            {creating ? 'جاري التسجيل...' : '🎉 فعّل حسابي في البرنامج'}
          </Button>
        </div>
      </Card>
    )
  }

  const referralUrl = `${APP_URL}/?ref=${affiliate.unique_code}`
  const pendingWd = withdrawals.filter((w) => w.status === 'معلق').length

  const TABS: [SubTab, string, any][] = [
    ['link', 'رابط الدعوة', Share2],
    ['accounts', `حسابات السحب${accounts.length ? ` (${accounts.length})` : ''}`, Landmark],
    ['withdraw', 'سحب العمولة', HandCoins],
    ['history', `سجل السحب${pendingWd ? ` (${pendingWd})` : ''}`, Clock],
    ['notifs', `الإشعارات${affiliateNotifs.length ? ` (${affiliateNotifs.length})` : ''}`, Bell],
  ]

  return (
    <div className="space-y-4">
      {/* شريط التبويبات الموحد */}
      <div className="flex flex-wrap gap-1.5 p-1.5 rounded-2xl border border-gold/25 bg-gradient-to-l from-gold/[0.08] to-transparent">
        {TABS.map(([id, label, Icon]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-bold transition-all active:scale-95 ${
              tab === id ? 'bg-gradient-to-l from-navy to-navy-light text-gold shadow-md' : 'text-navy/60 hover:bg-gold/10'}`}>
            <Icon className="h-3.5 w-3.5" /> {label}
          </button>
        ))}
      </div>

      {/* ═══════════ رابط الدعوة والإحالات ═══════════ */}
      {tab === 'link' && (
        <div className="space-y-4 fia-lux-fadeup">
          <Card className="p-5 bg-gradient-to-br from-navy to-navy-light text-white border-gold/20 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-40 h-40 bg-gold/10 rounded-full blur-3xl" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-xl bg-gold/20 flex items-center justify-center shadow-lg"><Gift className="w-5 h-5 text-gold" /></div>
                <div>
                  <h3 className="font-bold flex items-center gap-2">رابط الدعوة الخاص بك <Badge className="bg-green-500/15 text-green-300 border-green-500/30 text-[9px]">● نشط</Badge></h3>
                  <p className="text-white/70 text-xs">كل تسجيل مدفوع عبر رابطك يكسبك {affiliate.commission_percent}% عمولة تلقائياً</p>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur border border-gold/30 rounded-xl p-3.5">
                <div className="font-mono text-sm text-gold break-all leading-relaxed" dir="ltr">{referralUrl}</div>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Button size="sm" onClick={copyLink} className="bg-gold hover:bg-gold-light text-navy font-bold"><Copy className="w-3.5 h-3.5 ml-1" /> نسخ الرابط</Button>
                  <Button size="sm" onClick={shareWhatsApp} className="bg-green-500 hover:bg-green-600 text-white"><Share2 className="w-3.5 h-3.5 ml-1" /> واتساب</Button>
                  <Button size="sm" onClick={shareTelegram} className="bg-blue-500 hover:bg-blue-600 text-white"><Share2 className="w-3.5 h-3.5 ml-1" /> تيليجرام</Button>
                </div>
              </div>
            </div>
          </Card>

          {/* إحصاءات المحفظة */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[
              { icon: Wallet, label: 'القابل للسحب', value: `${available.toLocaleString('en-US')}`, grad: 'from-emerald-400 to-teal-600' },
              { icon: TrendingUp, label: 'إجمالي العمولات', value: `${totalEarned.toLocaleString('en-US')}`, grad: 'from-gold to-amber-600' },
              { icon: Users, label: 'إحالاتي', value: referrals.length, grad: 'from-sky-400 to-blue-600' },
              { icon: Clock, label: 'سحبات معلقة', value: pendingWd, grad: 'from-violet-400 to-purple-600' },
            ].map((s, i) => (
              <Card key={i} className="relative overflow-hidden border-white/40 p-3.5 shadow-sm">
                <div className={`absolute inset-0 bg-gradient-to-br opacity-90 ${s.grad}`} />
                <div className="relative flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center"><s.icon className="w-4 h-4 text-white" /></div>
                  <div className="min-w-0">
                    <div className="text-lg font-extrabold text-white leading-none tabular-nums">{s.value}</div>
                    <div className="text-[10px] text-white/85 mt-0.5">{s.label}</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* قائمة الإحالات */}
          <Card className="p-4 border-gold/20">
            <p className="mb-3 flex items-center gap-2 text-sm font-extrabold text-navy"><Users className="w-4 h-4 text-gold" /> إحالاتي ({referrals.length})</p>
            {referrals.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">لا توجد إحالات بعد — شارك رابطك وابدأ الكسب</p>
            ) : (
              <div className="space-y-1.5">
                {referrals.slice(0, 12).map((r: any) => (
                  <div key={r.id} className="flex items-center justify-between gap-2 rounded-xl border border-gold/15 bg-white px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-navy truncate">{r.student_name || 'متدرب'}</p>
                      <p className="text-[10px] text-muted-foreground">{r.course_title || 'دورة'} • {new Date(r.created_at).toLocaleDateString('ar')}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {Number(r.commission) > 0 && <span className="text-[11px] font-black text-emerald-600">+{Number(r.commission).toLocaleString('en-US')}</span>}
                      <Badge variant="outline" className={`text-[9px] ${r.status === 'مؤكد' || r.status === 'مكتمل' ? 'border-emerald-300 text-emerald-600' : 'border-amber-300 text-amber-600'}`}>{r.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ═══════════ حسابات السحب ═══════════ */}
      {tab === 'accounts' && (
        <div className="space-y-4 fia-lux-fadeup">
          {adding ? (
            <Card className="p-4 border-gold/30 bg-gradient-to-br from-gold/[0.06] to-transparent">
              <p className="mb-3 flex items-center gap-2 text-sm font-extrabold text-navy"><Plus className="w-4 h-4 text-gold" /> إضافة حساب سحب للعمولات</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="mb-1 flex items-center gap-1 text-[11px] font-bold text-navy/70"><Globe2 className="h-3 w-3 text-gold" /> الدولة</Label>
                  <LuxCombo value={accForm.country} onChange={(v) => setAccForm({ ...accForm, country: v, method_name: '' })} options={countryOpts} title="اختر الدولة" icon={Globe2} searchPlaceholder="ابحث عن الدولة..." />
                </div>
                <div>
                  <Label className="mb-1 flex items-center gap-1 text-[11px] font-bold text-navy/70"><Landmark className="h-3 w-3 text-gold" /> طريقة السحب *</Label>
                  <LuxCombo value={accForm.method_name} onChange={(v) => setAccForm({ ...accForm, method_name: v })} options={methodOpts} title="اختر طريقة السحب" icon={Landmark} searchPlaceholder="ابحث عن الطريقة..." disabled={countryMethods.length === 0} />
                  {countryMethods.length === 0 && <p className="mt-1 text-[10px] text-amber-600">لا توجد طرق مفعّلة لهذه الدولة بعد</p>}
                </div>
                <div>
                  <Label className="text-[11px] font-bold text-navy/70 mb-1 block">اسم صاحب الحساب</Label>
                  <Input value={accForm.account_name} onChange={(e) => setAccForm({ ...accForm, account_name: e.target.value })} placeholder="الاسم كما في الحساب" className="h-11 rounded-xl border-gold/30 focus:border-gold" />
                </div>
                <div>
                  <Label className="text-[11px] font-bold text-navy/70 mb-1 block">الرقم / العنوان *</Label>
                  <Input value={accForm.account_number} onChange={(e) => setAccForm({ ...accForm, account_number: e.target.value })} placeholder="رقم الحوالة / المحفظة / IBAN" dir="ltr" className="h-11 rounded-xl border-gold/30 focus:border-gold" />
                </div>
              </div>
              {selectedMethod?.instructions && (
                <p className="mt-3 flex items-start gap-1.5 rounded-xl border border-sky-200 bg-sky-50 p-2.5 text-[11px] text-sky-800"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {selectedMethod.instructions}</p>
              )}
              <div className="mt-3 flex gap-2">
                <Button onClick={addAccount} disabled={busyAcc} className="relative flex-1 overflow-hidden rounded-xl bg-gradient-to-l from-gold to-amber-500 text-sm font-extrabold text-navy shadow-lg active:scale-[0.98]">
                  <span className="absolute inset-0 lux-shimmer" />
                  {busyAcc ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Plus className="ml-2 h-4 w-4" />} حفظ الحساب
                </Button>
                <Button onClick={() => setAdding(false)} variant="outline" className="rounded-xl border-navy/20 text-sm font-bold text-navy">إلغاء</Button>
              </div>
            </Card>
          ) : (
            <Button onClick={() => setAdding(true)} className="relative w-full overflow-hidden rounded-xl border border-gold/30 bg-gradient-to-l from-navy to-navy-light py-5 text-sm font-bold text-gold hover:from-navy-light hover:to-navy">
              <span className="absolute inset-0 fia-lux-shine" />
              <Plus className="ml-2 h-5 w-5" /> أضف حساب سحب لعمولاتك
            </Button>
          )}

          {accounts.length === 0 ? (
            <Card className="border-dashed p-8 text-center">
              <Landmark className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm font-bold text-navy">لا توجد حسابات سحب بعد</p>
              <p className="mt-1 text-xs text-muted-foreground">أضف حسابك لتستلم عمولاتك — وسترن يونيون، محفظة، بنك أو عملات رقمية</p>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {accounts.map((a: any) => (
                <Card key={a.id} className="relative overflow-hidden border-gold/20 p-4">
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-transparent via-gold/60 to-transparent" />
                  <div className="mb-2 flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-navy to-navy-light text-gold"><Wallet className="h-4 w-4" /></div>
                      <div>
                        <p className="text-sm font-extrabold text-navy">{a.method_name}</p>
                        <p className="flex items-center gap-1 text-[10px] text-muted-foreground"><Globe2 className="h-3 w-3" /> {a.country}{a.currency ? ` • ${a.currency}` : ''}</p>
                      </div>
                    </div>
                    <button onClick={() => setDeleteFor(a)} className="rounded-lg p-1.5 text-red-500/70 transition-all hover:bg-red-50 hover:text-red-600 active:scale-90" title="حذف — يتطلب كلمة المرور">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="space-y-1 text-xs">
                    {a.account_name && <p className="flex justify-between gap-2"><span className="text-muted-foreground">صاحب الحساب:</span><span className="font-bold text-navy">{a.account_name}</span></p>}
                    <p className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">الرقم:</span>
                      <button onClick={() => { navigator.clipboard?.writeText(a.account_number || '').catch(() => {}); toast.success('نُسخ الرقم') }} className="flex items-center gap-1 font-mono font-bold text-navy hover:text-gold" dir="ltr">
                        {a.account_number} <Copy className="h-3 w-3" />
                      </button>
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          )}
          <p className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground"><Coins className="h-3 w-3" /> حذف أي حساب يتطلب تأكيد كلمة المرور الخاصة بك</p>
        </div>
      )}

      {/* ═══════════ سحب العمولة ═══════════ */}
      {tab === 'withdraw' && (
        <div className="space-y-4 fia-lux-fadeup">
          <Card className="relative overflow-hidden border-gold/25 bg-gradient-to-br from-emerald-500/[0.08] via-white to-gold/[0.05] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold text-muted-foreground">رصيدك القابل للسحب</p>
                <p className="text-3xl font-black text-navy tabular-nums">{available.toLocaleString('en-US')} <span className="text-sm font-bold text-muted-foreground">{wdCurrency}</span></p>
                <p className="mt-1 text-[10px] text-muted-foreground">إجمالي العمولات {totalEarned.toLocaleString('en-US')} — محجوز للسحبات الجارية {reserved.toLocaleString('en-US')}</p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gold to-amber-500 flex items-center justify-center shadow-lg"><HandCoins className="w-7 h-7 text-navy" /></div>
            </div>
          </Card>

          {accounts.length === 0 ? (
            <Card className="border-amber-300 bg-amber-50/60 p-6 text-center">
              <Landmark className="mx-auto mb-3 h-10 w-10 text-amber-500" />
              <p className="text-sm font-extrabold text-navy">أضف حساب سحب أولاً لاستلام عمولاتك</p>
              <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">لا يمكن سحب العمولة دون حساب استلام — أضفه من تبويب «حسابات السحب» في هذا القسم نفسه</p>
              <Button onClick={() => setTab('accounts')} className="mt-4 rounded-xl bg-gradient-to-l from-navy to-navy-light px-6 font-bold text-gold"><Plus className="ml-2 h-4 w-4" /> التوجه لإضافة حساب السحب</Button>
            </Card>
          ) : (
            <Card className="p-5 border-gold/25">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="mb-1.5 flex items-center gap-1 text-xs font-bold text-navy/70"><Wallet className="h-3.5 w-3.5 text-gold" /> حساب الاستلام *</Label>
                  <LuxCombo value={wdAccount} onChange={setWdAccount} options={accountOpts} title="اختر حساب الاستلام" icon={Wallet} searchPlaceholder="ابحث في حساباتك..." placeholder="— اختر الحساب —" />
                </div>
                <div>
                  <Label className="mb-1.5 flex items-center gap-1 text-xs font-bold text-navy/70"><Coins className="h-3.5 w-3.5 text-gold" /> المبلغ *</Label>
                  <Input value={wdAmount} onChange={(e) => setWdAmount(e.target.value.replace(/[^\d.]/g, ''))} placeholder={`حتى ${available.toLocaleString('en-US')}`} dir="ltr" inputMode="decimal" className="h-11 rounded-xl border-gold/30 focus:border-gold" />
                </div>
              </div>
              <Button onClick={submitWithdraw} disabled={wdBusy || available <= 0} className="relative mt-4 w-full overflow-hidden rounded-xl bg-gradient-to-l from-gold to-amber-500 py-3 text-sm font-extrabold text-navy shadow-[0_6px_20px_rgba(212,175,55,0.4)] active:scale-[0.98] disabled:opacity-60">
                <span className="absolute inset-0 lux-shimmer" />
                {wdBusy ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <HandCoins className="ml-2 h-4 w-4" />} إرسال طلب السحب للإدارة
              </Button>
              <p className="mt-2 text-center text-[10px] text-muted-foreground">تُراجع الإدارة الطلب وترسل التحويل إلى حسابك — وستصلك إشعارات بكل تحديث</p>
            </Card>
          )}
        </div>
      )}

      {/* ═══════════ سجل السحب ═══════════ */}
      {tab === 'history' && (
        <div className="space-y-2 fia-lux-fadeup">
          {withdrawals.length === 0 ? (
            <Card className="border-dashed p-8 text-center">
              <Clock className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm font-bold text-navy">لا توجد طلبات سحب بعد</p>
              <p className="mt-1 text-xs text-muted-foreground">أول طلب سحب لعمولاتك سيظهر هنا مع حالته وملاحظات الإدارة</p>
            </Card>
          ) : withdrawals.map((w: any) => (
            <Card key={w.id} className="flex items-center justify-between gap-3 p-3.5 border-gold/15">
              <div className="min-w-0">
                <p className="text-sm font-extrabold text-navy">{Number(w.amount).toLocaleString('en-US')} <span className="text-[11px] text-muted-foreground">{w.currency}</span></p>
                <p className="text-[10px] text-muted-foreground truncate">{w.method_name} • {w.account_number} • {new Date(w.created_at).toLocaleDateString('ar')}</p>
                {w.admin_note && <p className="mt-0.5 text-[10px] text-red-500">ملاحظة الإدارة: {w.admin_note}</p>}
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <Badge variant="outline" className={`text-[10px] ${w.status === 'مكتمل' ? 'border-emerald-300 text-emerald-600' : w.status === 'مرفوض' ? 'border-red-300 text-red-500' : 'border-amber-300 text-amber-600'}`}>
                  {w.status === 'مكتمل' ? '✅ مكتمل' : w.status === 'مرفوض' ? '❌ مرفوض' : '⏳ معلق'}
                </Badge>
                {w.screenshot_url && <a href={w.screenshot_url} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-sky-600 hover:underline">لقطة التحويل ↗</a>}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ═══════════ إشعارات العمولات ═══════════ */}
      {tab === 'notifs' && (
        <div className="space-y-2 fia-lux-fadeup">
          {affiliateNotifs.length === 0 ? (
            <Card className="border-dashed p-8 text-center">
              <Bell className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm font-bold text-navy">لا توجد إشعارات عمولات بعد</p>
              <p className="mt-1 text-xs text-muted-foreground">ستصلك هنا إشعارات كل عمولة تُضاف لرصيدك وكل تحديث على طلبات سحبك</p>
            </Card>
          ) : affiliateNotifs.map((n: any) => (
            <Card key={n.id} className={`flex items-start gap-3 p-3.5 ${n.read_at ? 'border-gold/10 opacity-75' : 'border-gold/40 bg-gold/[0.04]'}`}>
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-gold to-amber-500 text-white"><Sparkles className="h-4 w-4" /></div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-extrabold text-navy">{n.title}</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{n.body}</p>
                <p className="mt-1 text-[9px] text-muted-foreground/70">{new Date(n.created_at).toLocaleString('ar')}</p>
              </div>
              {!n.read_at && <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-gold" />}
            </Card>
          ))}
        </div>
      )}

      {/* 🔐 حوار تأكيد حذف الحساب بكلمة المرور */}
      <PasswordConfirmDialog
        open={!!deleteFor}
        onOpenChange={(o) => !o && setDeleteFor(null)}
        title="تأكيد حذف حساب السحب"
        message={`سيتم حذف «${deleteFor?.method_name || ''}» (${deleteFor?.country || ''}) نهائياً. أدخل كلمة المرور الخاصة بك للمتابعة.`}
        itemName={deleteFor?.method_name}
        confirmLabel="حذف الحساب"
        loading={deleting}
        onConfirm={(password) => removeAccount(deleteFor!.id, password)}
      />
    </div>
  )
}
