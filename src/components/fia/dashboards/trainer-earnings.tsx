'use client'

// ============================================================================
// TRAINER EARNINGS ROYAL — «أرباحي» — خزينة متعددة العملات
// محفظة فاخرة للمدرب: الرصيد بكل عملة على حدة (دولار، ريال يمني، سعودي…)،
// نسبة الأرباح من كل دورة، طريقة الاستلام (محلي أو عملات رقمية)، وطلبات
// سحب تُرسل بالعملة نفسها التي رُبح بها — مع لقطات شاشة من الإدارة.
// ============================================================================
import { useEffect, useState, useCallback } from 'react'
import {
  Wallet, TrendingUp, BadgePercent, Landmark, Bitcoin, CheckCircle2,
  Clock, XCircle, Image as ImageIcon, Send, Loader2, Sparkles, Crown, Coins,
  ArrowDownToLine, Users, BookOpen, Eye, Banknote, Gem, ChevronDown,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { SectionCard } from './shell'
import { supabasePublic } from '@/lib/supabase'
import { fmtMoney, currencyInfo } from '@/lib/currency'

const LOCAL_METHODS = ['محفظة جيب', 'محفظة الكريمي', 'محفظة موبايل موني', 'حساب بنكي', 'الدفع عند المقابلة']
const CRYPTO_METHODS = ['USDT (TRC20)', 'USDT (ERC20)', 'Binance Pay', 'Bitcoin (BTC)', 'Ethereum (ETH)']

function StatusChip({ status }: { status: string }) {
  if (status === 'مكتمل')
    return <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-[10px] font-bold">✓ تم الصرف</Badge>
  if (status === 'ملغي')
    return <Badge className="bg-rose-500/15 text-rose-600 border-rose-500/30 text-[10px] font-bold">✗ مرفوض</Badge>
  if (status === 'مسحوب')
    return <Badge className="bg-navy/10 text-navy border-navy/25 text-[10px] font-bold">↗ مسحوب</Badge>
  if (status === 'متاح')
    return <Badge className="bg-gold/15 text-[#8a6d1d] border-gold/40 text-[10px] font-bold">◆ متاح</Badge>
  return <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 text-[10px] font-bold">⏳ قيد الانتظار</Badge>
}

/** شارة عملة فاخرة — gold pill بعملة صريحة */
function CurrencyPill({ currency, size = 'sm' }: { currency: string; size?: 'sm' | 'xs' }) {
  const info = currencyInfo(currency)
  return (
    <span className={`inline-flex items-center gap-1 rounded-full bg-gradient-to-l from-gold/25 to-amber-500/15 border border-gold/50 text-[#8a6d1d] font-extrabold ${size === 'sm' ? 'px-2.5 py-0.5 text-[11px]' : 'px-2 py-0.5 text-[9px]'}`} dir="ltr">
      {info.prefix ? <span className="text-[13px] leading-none">{info.symbol}</span> : info.symbol}
      <span className="text-[8px] opacity-70">{info.short}</span>
    </span>
  )
}

/** صفوف مبالغ لكل عملة — تُستخدم داخل البطاقات الإحصائية */
function MoneyLines({ byCur, pick, tone = 'navy' }: { byCur: Record<string, any>; pick: (t: any) => number; tone?: 'navy' | 'gold' | 'emerald' | 'purple' | 'blue' }) {
  const entries = Object.entries(byCur || {}).filter(([, t]: any) => pick(t) !== 0)
  const color = tone === 'gold' ? 'text-[#8a6d1d]' : tone === 'emerald' ? 'text-emerald-600' : tone === 'purple' ? 'text-purple-700' : tone === 'blue' ? 'text-blue-700' : 'text-navy'
  if (entries.length === 0) return <p className={`text-2xl font-extrabold tabular-nums ${color}`} dir="ltr">{fmtMoney(0, 'ر.ي')}</p>
  return (
    <div className="space-y-0.5">
      {entries.map(([cur, t]: any) => (
        <p key={cur} className={`${entries.length > 1 ? 'text-base' : 'text-2xl'} font-extrabold tabular-nums leading-tight ${color}`} dir="ltr">
          {fmtMoney(pick(t), cur)}
        </p>
      ))}
    </div>
  )
}

export function TrainerEarnings({ user }: { user: any }) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)

  // payout method form
  const [pmType, setPmType] = useState<'محلي' | 'عملات رقمية'>('محلي')
  const [pmName, setPmName] = useState('')
  const [pmAccount, setPmAccount] = useState('')
  const [savingPm, setSavingPm] = useState(false)

  // withdrawal dialog
  const [wdOpen, setWdOpen] = useState(false)
  const [wdAmount, setWdAmount] = useState('')
  const [wdCurrency, setWdCurrency] = useState('')
  const [wdSubmitting, setWdSubmitting] = useState(false)

  // screenshot viewer
  const [shot, setShot] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!user?.id) return
    try {
      const res = await fetch(`/api/trainer-earnings?trainer_id=${user.id}`)
      const d = await res.json()
      if (d && !d.error) {
        setData(d)
        setPmType(d.profile?.payment_method_type === 'عملات رقمية' ? 'عملات رقمية' : 'محلي')
        setPmName(d.profile?.payment_method_name || '')
        setPmAccount(d.profile?.payment_account || '')
      }
    } catch {}
    finally { setLoading(false) }
  }, [user?.id])

  useEffect(() => { load() }, [load])

  // ⚡ REAL-TIME: new earnings + withdrawal decisions appear instantly
  useEffect(() => {
    if (!user?.id) return
    let ch1: any, ch2: any
    try {
      ch1 = supabasePublic.channel(`trainer-earnings:${user.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'trainer_earnings' }, (payload: any) => {
          load()
          // ⚡ الإشعار فقط عند إضافة ربح فعلي — لا «أرباح جديدة» عند السحب أو المحاسبة!
          if (payload?.eventType === 'INSERT') {
            toast.success('💰 أرباح جديدة أُضيفت إلى محفظتك!')
          }
        })
        .subscribe()
      ch2 = supabasePublic.channel(`trainer-withdrawals:${user.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'withdrawal_requests' }, () => load())
        .subscribe()
    } catch {}
    return () => {
      try { supabasePublic.removeChannel(ch1) } catch {}
      try { supabasePublic.removeChannel(ch2) } catch {}
    }
  }, [user?.id, load])

  const savePayoutMethod = async () => {
    if (!pmName.trim() || !pmAccount.trim()) { toast.error('أدخل اسم الطريقة وبيانات الحساب'); return }
    setSavingPm(true)
    try {
      const res = await fetch('/api/trainers', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, payment_method_type: pmType, payment_method_name: pmName.trim(), payment_account: pmAccount.trim() }),
      })
      if (res.ok) { toast.success('✨ تم حفظ طريقة استلام الأرباح'); load() }
      else { const d = await res.json().catch(() => ({})); toast.error(d.error || 'فشل الحفظ') }
    } catch { toast.error('خطأ في الاتصال') }
    finally { setSavingPm(false) }
  }

  // ---- Multi-currency helpers ----
  const byCur: Record<string, any> = data?.totals_by_currency || {}
  // العملات ذات رصيد — مرتبة تنازلياً بالمكتسب
  const curEntries = Object.entries(byCur)
    .map(([cur, t]: any) => ({ currency: cur, ...t }))
    .sort((a: any, b: any) => b.total_earned - a.total_earned)
  const hasAnyBalance = curEntries.some((c: any) => c.available > 0)
  const wdCur = wdCurrency || curEntries.find((c: any) => c.available > 0)?.currency || data?.primary_currency || 'ر.ي'
  const wdTotals = byCur[wdCur] || { total_earned: 0, available: 0, withdrawn: 0, pending_withdrawals: 0 }
  const wdAvailable = wdTotals.available - wdTotals.pending_withdrawals

  const openWithdrawDialog = () => {
    const firstWithBalance = curEntries.find((c: any) => c.available > 0)?.currency || data?.primary_currency || 'ر.ي'
    setWdCurrency(firstWithBalance)
    setWdAmount('')
    setWdOpen(true)
  }

  const submitWithdrawal = async () => {
    const amount = parseInt(wdAmount) || 0
    if (amount <= 0) { toast.error('أدخل مبلغاً صحيحاً'); return }
    if (amount > wdAvailable) { toast.error(`المبلغ يتجاوز رصيدك المتاح بعملة ${wdCur} (${fmtMoney(wdAvailable, wdCur)})`); return }
    setWdSubmitting(true)
    try {
      const res = await fetch('/api/trainer-earnings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trainer_id: user.id, amount, currency: wdCur }),
      })
      const d = await res.json()
      if (res.ok) {
        toast.success(`💸 تم إرسال طلب سحب ${fmtMoney(amount, wdCur)} — الإدارة ستراجعه قريباً`)
        setWdOpen(false); setWdAmount(''); load()
      } else toast.error(d.error || 'فشل إرسال الطلب')
    } catch { toast.error('خطأ في الاتصال') }
    finally { setWdSubmitting(false) }
  }

  if (loading) {
    return <div className="text-center py-16"><Loader2 className="w-7 h-7 mx-auto animate-spin text-gold" /><p className="text-xs text-muted-foreground mt-3">جاري فتح خزينة أرباحك...</p></div>
  }

  const percentage = Number(data?.profile?.percentage || 0)
  const earnings = data?.earnings || []
  const withdrawals = data?.withdrawals || []
  const courses = data?.courses || []
  const suggestions = pmType === 'محلي' ? LOCAL_METHODS : CRYPTO_METHODS

  return (
    <div className="space-y-6">
      {/* ── Hero: الخزينة الذهبية متعددة العملات ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-navy via-navy-light to-navy p-6 text-white shadow-xl ring-1 ring-gold/30">
        <div className="absolute inset-0 opacity-25" style={{
          backgroundImage: 'radial-gradient(circle at 12% 50%, #D4AF37 1.5px, transparent 1.5px), radial-gradient(circle at 88% 50%, white 1px, transparent 1px)',
          backgroundSize: '24px 24px, 18px 18px',
        }} />
        <div className="absolute -top-14 -left-14 w-48 h-48 bg-gold/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-10 -right-10 w-36 h-36 bg-gold/10 rounded-full blur-2xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="relative">
            <div className="absolute inset-0 bg-gold/40 blur-xl rounded-full" />
            <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-gold to-amber-600 flex items-center justify-center shadow-lg border border-white/30">
              <Gem className="w-8 h-8 text-navy" strokeWidth={2.2} />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-gold/80 text-xs font-bold flex items-center gap-1.5 mb-1">
              <Sparkles className="w-3.5 h-3.5" /> خزينة أرباحك الملكية — كل عملة في خزنتها
            </p>
            {/* أرصدة السحب لكل عملة — ما ربح بالدولار يُسحب بالدولار */}
            {curEntries.filter((c: any) => c.available > 0 || c.pending_withdrawals > 0).length === 0 ? (
              <div className="flex items-end gap-2">
                <span className="text-4xl font-extrabold tabular-nums tracking-tight" dir="ltr">{fmtMoney(0, data?.primary_currency || 'ر.ي')}</span>
              </div>
            ) : (
              <div className="flex flex-wrap items-end gap-x-5 gap-y-1.5 mt-0.5">
                {curEntries.filter((c: any) => c.available > 0 || c.pending_withdrawals > 0).map((c: any) => (
                  <div key={c.currency} className="flex items-end gap-1.5">
                    <span className="text-3xl sm:text-4xl font-extrabold tabular-nums tracking-tight text-white" dir="ltr">{fmtMoney(c.available - c.pending_withdrawals, c.currency)}</span>
                    <CurrencyPill currency={c.currency} size="xs" />
                  </div>
                ))}
              </div>
            )}
            <p className="text-white/60 text-[11px] mt-1.5">
              الرصيد المتاح للسحب الآن
              {sumPending(byCur) > 0 ? ' • لديك طلبات سحب قيد المراجعة' : ''}
              {curEntries.length > 1 ? ' • أرباحك محفوظة بكل عملة على حدة وتُسحب بعملتها' : ''}
            </p>
          </div>
          <div className="flex flex-col gap-2 w-full sm:w-auto">
            <Button
              onClick={openWithdrawDialog}
              disabled={!hasAnyBalance}
              className="relative overflow-hidden bg-gradient-to-l from-gold to-amber-500 hover:from-amber-500 hover:to-gold text-navy font-extrabold rounded-xl shadow-lg active:scale-[0.97] transition-all disabled:opacity-40"
            >
              <span className="absolute inset-0 lux-shimmer" />
              <Send className="w-4 h-4 ml-1 relative" /> طلب سحب الأرباح
            </Button>
            {percentage > 0 && (
              <div className="self-center sm:self-end flex items-center gap-1.5 rounded-full bg-gold/15 border border-gold/40 px-3 py-1">
                <BadgePercent className="w-3.5 h-3.5 text-gold" />
                <span className="text-[11px] font-extrabold text-gold" dir="ltr">نسبة أرباحك: {percentage}%</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Stats — لكل عملة صفها الفاخر ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 fia-stagger">
        <Card className="p-4 border border-gold/25 bg-gradient-to-br from-white to-gold/5">
          <div className="flex items-center gap-2 mb-2"><TrendingUp className="w-4 h-4 text-emerald-600" /><span className="text-[11px] font-bold text-muted-foreground">إجمالي الأرباح</span></div>
          <MoneyLines byCur={byCur} pick={(t: any) => t.total_earned} tone="navy" />
        </Card>
        <Card className="p-4 border border-gold/25 bg-gradient-to-br from-white to-gold/5">
          <div className="flex items-center gap-2 mb-2"><Wallet className="w-4 h-4 text-gold" /><span className="text-[11px] font-bold text-muted-foreground">رصيد متاح</span></div>
          <MoneyLines byCur={byCur} pick={(t: any) => t.available} tone="gold" />
        </Card>
        <Card className="p-4 border border-gold/25 bg-gradient-to-br from-white to-gold/5">
          <div className="flex items-center gap-2 mb-2"><Clock className="w-4 h-4 text-amber-600" /><span className="text-[11px] font-bold text-muted-foreground">قيد السحب</span></div>
          <MoneyLines byCur={byCur} pick={(t: any) => t.pending_withdrawals} tone="purple" />
        </Card>
        <Card className="p-4 border border-gold/25 bg-gradient-to-br from-white to-gold/5">
          <div className="flex items-center gap-2 mb-2"><ArrowDownToLine className="w-4 h-4 text-blue-600" /><span className="text-[11px] font-bold text-muted-foreground">تم سحبه</span></div>
          <MoneyLines byCur={byCur} pick={(t: any) => t.withdrawn} tone="emerald" />
        </Card>
      </div>

      {/* ── نسبة الأرباح من كل دورة ── */}
      <SectionCard
        title="نسبة أرباحك من الدورات"
        description="حصتك المحددة من الإدارة لكل متدرب يشترك في دوراتك — بعملة الدورة نفسها وتُضاف تلقائياً بعد تأكيد الدفع"
      >
        {percentage <= 0 ? (
          <div className="relative overflow-hidden rounded-xl border border-amber-500/30 bg-gradient-to-l from-amber-500/[0.08] to-transparent p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
              <BadgePercent className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-navy">لم تحدد الإدارة نسبة أرباحك بعد</p>
              <p className="text-[11px] text-muted-foreground">تواصل مع الإدارة — ستُحدد نسبتك من كل دورة وستظهر هنا بفخامة</p>
            </div>
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
            لا توجد دورات بعد — أنشئ دورتك الأولى لتبدأ بالربح
          </div>
        ) : (
          <div className="space-y-2.5">
            {courses.map((c: any) => (
              <div key={c.id} className="group relative overflow-hidden rounded-xl border border-gold/20 bg-gradient-to-l from-gold/[0.06] to-transparent p-3.5 flex flex-wrap items-center gap-3 hover:border-gold/45 transition-colors">
                <div className="absolute right-0 top-0 bottom-0 w-1 bg-gradient-to-b from-gold to-amber-500 opacity-70" />
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-navy to-navy-light border border-gold/30 flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-5 h-5 text-gold" />
                </div>
                <div className="flex-1 min-w-[160px]">
                  <p className="text-sm font-bold text-navy line-clamp-1">{c.title}</p>
                  <p className="text-[10px] text-muted-foreground flex items-center gap-2 mt-0.5">
                    <span className="flex items-center gap-0.5"><Users className="w-3 h-3" /> {c.enrolled} متدرب</span>
                    <span>•</span>
                    <span>سعر الاشتراك: <b dir="ltr">{fmtMoney(c.price, c.currency)}</b></span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-center rounded-lg bg-navy/[0.04] border border-navy/10 px-2.5 py-1">
                    <p className="text-[8px] font-bold text-muted-foreground">نسبتك</p>
                    <p className="text-xs font-extrabold text-navy" dir="ltr">{c.percentage}%</p>
                  </div>
                  <div className="text-center rounded-lg bg-gradient-to-l from-gold/20 to-amber-500/10 border border-gold/40 px-2.5 py-1">
                    <p className="text-[8px] font-bold text-muted-foreground">حصتك لكل متدرب</p>
                    <p className="text-xs font-extrabold text-[#8a6d1d] tabular-nums" dir="ltr">{fmtMoney(c.my_share_per_student, c.currency)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* ── طريقة استلام الأرباح ── */}
      <SectionCard
        title="طريقة استلام الأرباح"
        description="حدد كيف تريد استلام مستحقاتك — محلياً أو عبر العملات الرقمية"
      >
        {/* Type toggle */}
        <div className="flex items-center gap-1 bg-gold/5 border border-gold/20 rounded-xl p-1 w-fit mb-4">
          <button type="button" onClick={() => { setPmType('محلي'); if (!LOCAL_METHODS.includes(pmName)) setPmName('') }}
            className={`px-4 py-1.5 text-xs font-extrabold rounded-lg flex items-center gap-1.5 transition-all ${pmType === 'محلي' ? 'bg-gradient-to-l from-navy to-navy-light text-gold shadow' : 'text-muted-foreground hover:text-navy'}`}>
            <Landmark className="w-3.5 h-3.5" /> محلي
          </button>
          <button type="button" onClick={() => { setPmType('عملات رقمية'); if (!CRYPTO_METHODS.includes(pmName)) setPmName('') }}
            className={`px-4 py-1.5 text-xs font-extrabold rounded-lg flex items-center gap-1.5 transition-all ${pmType === 'عملات رقمية' ? 'bg-gradient-to-l from-navy to-navy-light text-gold shadow' : 'text-muted-foreground hover:text-navy'}`}>
            <Bitcoin className="w-3.5 h-3.5" /> عملات رقمية
          </button>
        </div>
        <div className="grid sm:grid-cols-2 gap-4 max-w-2xl">
          <div>
            <Label className="text-xs font-bold text-navy flex items-center gap-1.5 mb-1.5">
              {pmType === 'محلي' ? <Banknote className="w-3.5 h-3.5 text-gold" /> : <Coins className="w-3.5 h-3.5 text-gold" />} اسم الطريقة
            </Label>
            <Input value={pmName} onChange={(e) => setPmName(e.target.value)} className="rounded-xl border-gold/30 focus:border-gold focus:ring-gold/30" placeholder={pmType === 'محلي' ? 'مثال: محفظة جيب' : 'مثال: USDT (TRC20)'} />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {suggestions.map((s) => (
                <button key={s} type="button" onClick={() => setPmName(s)}
                  className="text-[10px] font-bold rounded-full border border-gold/25 bg-white hover:bg-gold/10 hover:border-gold/50 text-navy px-2.5 py-0.5 transition-colors">
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-xs font-bold text-navy flex items-center gap-1.5 mb-1.5">
              <Wallet className="w-3.5 h-3.5 text-gold" /> {pmType === 'محلي' ? 'رقم المحفظة / الحساب' : 'عنوان المحفظة الرقمية'}
            </Label>
            <Input value={pmAccount} onChange={(e) => setPmAccount(e.target.value)} dir="ltr" className="rounded-xl border-gold/30 focus:border-gold focus:ring-gold/30 font-bold" placeholder={pmType === 'محلي' ? '7XXXXXXXX' : 'TXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'} />
            <p className="text-[10px] text-muted-foreground mt-2">تظهر للإدارة فقط عند معالجة طلبات السحب — محفوظة بأمان</p>
          </div>
        </div>
        <Button onClick={savePayoutMethod} disabled={savingPm} className="mt-4 bg-gradient-to-l from-navy to-navy-light hover:from-navy-light hover:to-navy text-gold rounded-xl shadow-md active:scale-[0.97] transition-all">
          {savingPm ? <Loader2 className="w-4 h-4 ml-1 animate-spin" /> : <CheckCircle2 className="w-4 h-4 ml-1" />}
          حفظ طريقة الاستلام
        </Button>
      </SectionCard>

      {/* ── سجل طلبات السحب ── */}
      <SectionCard title="سجل طلبات السحب" description="طلباتك السابقة بعملاتها وقرارات الإدارة مع لقطات إثبات التحويل">
        {withdrawals.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Send className="w-10 h-10 mx-auto mb-2 opacity-25" />
            <p className="text-sm font-bold text-navy">لا توجد طلبات سحب بعد</p>
            <p className="text-[11px]">اطلب سحب أرباحك متى بلغ رصيدك المتاح مبلغاً مناسباً</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {withdrawals.map((w: any) => (
              <div key={w.id} className="relative overflow-hidden rounded-xl border border-gold/20 bg-white p-3.5">
                <div className="flex flex-wrap items-center gap-3">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 border ${w.status === 'مكتمل' ? 'bg-emerald-500/10 border-emerald-500/30' : w.status === 'ملغي' ? 'bg-rose-500/10 border-rose-500/30' : 'bg-amber-500/10 border-amber-500/30'}`}>
                    {w.status === 'مكتمل' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : w.status === 'ملغي' ? <XCircle className="w-5 h-5 text-rose-600" /> : <Clock className="w-5 h-5 text-amber-600" />}
                  </div>
                  <div className="flex-1 min-w-[150px]">
                    <p className="text-sm font-extrabold text-navy tabular-nums flex items-center gap-2" dir="ltr">
                      {fmtMoney(w.amount, w.currency)}
                      <CurrencyPill currency={w.currency} size="xs" />
                    </p>
                    <p className="text-[10px] text-muted-foreground">{w.method_name || w.method_type} • <span dir="ltr">{w.account}</span></p>
                    <p className="text-[9px] text-muted-foreground mt-0.5">{new Date(w.created_at).toLocaleString('ar-EG')}</p>
                  </div>
                  <StatusChip status={w.status} />
                  {w.status === 'مكتمل' && w.screenshot_url && (
                    <Button size="sm" variant="outline" className="h-8 rounded-lg border-gold/35 hover:bg-gold/10 text-[11px] font-bold" onClick={() => setShot(w.screenshot_url)}>
                      <ImageIcon className="w-3.5 h-3.5 ml-1" /> لقطة التحويل
                    </Button>
                  )}
                </div>
                {w.admin_note && (
                  <div className="mt-2.5 rounded-lg bg-navy/[0.03] border border-navy/10 px-3 py-2 text-[11px] text-navy/80">
                    <b className="text-navy">ملاحظة الإدارة:</b> {w.admin_note}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* ── سجل الأرباح ── */}
      <SectionCard title="سجل الأرباح التفصيلي" description="كل عملية ربح أُضيفت لمحفظتك بعملتها بعد تأكيد الدفع">
        {earnings.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Crown className="w-10 h-10 mx-auto mb-2 opacity-25" />
            <p className="text-sm font-bold text-navy">لم تُسجل أرباح بعد</p>
            <p className="text-[11px]">بمجرد موافقة الإدارة على دفع متدرب تُضاف حصتك هنا فوراً</p>
          </div>
        ) : (
          <div className="space-y-2">
            {earnings.map((e: any) => (
              <div key={e.id} className="relative overflow-hidden rounded-xl border border-gold/15 bg-gradient-to-l from-gold/[0.05] to-transparent px-3.5 py-2.5 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-gold/25 to-amber-600/20 border border-gold/30 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-4 h-4 text-[#8a6d1d]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-navy truncate">{e.course_title || 'دورة'}</p>
                  <p className="text-[9px] text-muted-foreground">متدرب: {e.student_name || '—'} • {new Date(e.created_at).toLocaleDateString('ar-EG')}</p>
                </div>
                <div className="text-center px-2 border-r border-gold/15">
                  <p className="text-[8px] text-muted-foreground font-bold">النسبة</p>
                  <p className="text-[10px] font-extrabold text-navy" dir="ltr">{e.percentage}%</p>
                </div>
                <div className="text-left">
                  <p className="text-sm font-extrabold text-emerald-600 tabular-nums" dir="ltr">+{fmtMoney(e.amount, e.currency)}</p>
                  <CurrencyPill currency={e.currency} size="xs" />
                </div>
                <StatusChip status={e.status} />
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* ── Withdrawal dialog — اختيار العملة الفاخر ── */}
      <Dialog open={wdOpen} onOpenChange={setWdOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-navy">
              <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-gold to-amber-600 flex items-center justify-center"><Send className="w-5 h-5 text-navy" /></span>
              طلب سحب الأرباح
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* اختيار العملة — كل عملة خزينة مستقلة */}
            <div>
              <Label className="text-xs font-extrabold text-navy flex items-center gap-1.5 mb-2">
                <Coins className="w-3.5 h-3.5 text-gold" /> عملة السحب — تُسحب بعملة ربحك نفسها
              </Label>
              {curEntries.length === 0 ? (
                <div className="rounded-xl border border-gold/25 bg-gold/[0.04] p-3 text-center text-[11px] text-muted-foreground">لا توجد أرباح بعد — بمجرد تأكيد أول دفعة تظهر عملة ربحك هنا</div>
              ) : (
                <div className="grid grid-cols-1 gap-1.5 max-h-40 overflow-y-auto lux-scrollbar pl-1">
                  {curEntries.map((c: any) => {
                    const avail = c.available - c.pending_withdrawals
                    const active = wdCur === c.currency
                    return (
                      <button key={c.currency} type="button" disabled={avail <= 0}
                        onClick={() => { setWdCurrency(c.currency); setWdAmount('') }}
                        className={`w-full flex items-center justify-between rounded-xl border px-3 py-2.5 transition-all text-right ${active ? 'border-gold bg-gradient-to-l from-gold/20 to-amber-500/10 shadow-sm ring-1 ring-gold/40' : 'border-gold/20 bg-white hover:border-gold/50'} ${avail <= 0 ? 'opacity-40 cursor-not-allowed' : ''}`}>
                        <div className="flex items-center gap-2">
                          <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-extrabold text-[11px] ${active ? 'bg-gradient-to-br from-gold to-amber-500 text-navy' : 'bg-navy/5 text-navy border border-navy/10'}`} dir="ltr">
                            {currencyInfo(c.currency).prefix ? currencyInfo(c.currency).symbol : currencyInfo(c.currency).short.slice(0, 2)}
                          </span>
                          <div>
                            <p className="text-xs font-extrabold text-navy">{currencyInfo(c.currency).label}</p>
                            <p className="text-[9px] text-muted-foreground">{avail <= 0 ? 'لا يوجد رصيد متاح' : `متاح: ${fmtMoney(avail, c.currency)}`}</p>
                          </div>
                        </div>
                        <ChevronDown className={`w-4 h-4 text-gold transition-transform ${active ? '-rotate-90' : 'rotate-90 opacity-40'}`} />
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-l from-navy via-navy-light to-navy p-4 text-white border border-gold/30">
              <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 15% 50%, #D4AF37 1.5px, transparent 1.5px)', backgroundSize: '18px 18px' }} />
              <div className="relative flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-gold/80 font-bold">الرصيد المتاح بعملة {currencyInfo(wdCur).label}</p>
                  <p className="text-2xl font-extrabold tabular-nums" dir="ltr">{fmtMoney(wdAvailable, wdCur)}</p>
                </div>
                <Wallet className="w-8 h-8 text-gold/70" />
              </div>
            </div>
            <div>
              <Label className="text-xs font-bold text-navy">مبلغ السحب ({currencyInfo(wdCur).label})</Label>
              <Input type="number" value={wdAmount} onChange={(e) => setWdAmount(e.target.value)} dir="ltr" className="mt-1 rounded-xl border-gold/30 focus:border-gold focus:ring-gold/30 font-bold text-lg" placeholder="0" />
              <div className="flex gap-1.5 mt-2">
                {[25, 50, 75, 100].map((p) => (
                  <button key={p} type="button" onClick={() => setWdAmount(String(Math.floor(wdAvailable * p / 100)))}
                    className="text-[10px] font-bold rounded-full border border-gold/25 bg-white hover:bg-gold/10 px-2.5 py-0.5 text-navy transition-colors">{p}%</button>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-gold/25 bg-gradient-to-l from-gold/[0.08] to-transparent p-3 flex items-center gap-2.5">
              {pmType === 'محلي' ? <Landmark className="w-4 h-4 text-gold flex-shrink-0" /> : <Bitcoin className="w-4 h-4 text-gold flex-shrink-0" />}
              <div className="text-[11px] text-muted-foreground leading-relaxed">
                يُحوَّل <b className="text-navy" dir="ltr">{fmtMoney(parseInt(wdAmount) || 0, wdCur)}</b> إلى: <b className="text-navy">{pmName || 'طريقة الدفع المسجلة'}</b>
                {pmAccount && <> — <span dir="ltr" className="text-navy font-bold">{pmAccount}</span></>}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWdOpen(false)}>إلغاء</Button>
            <Button onClick={submitWithdrawal} disabled={wdSubmitting || wdAvailable <= 0} className="bg-gradient-to-l from-gold to-amber-500 hover:from-amber-500 hover:to-gold text-navy font-extrabold">
              {wdSubmitting ? <Loader2 className="w-4 h-4 ml-1 animate-spin" /> : <Send className="w-4 h-4 ml-1" />}
              إرسال الطلب للإدارة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Screenshot viewer ── */}
      <Dialog open={!!shot} onOpenChange={(o) => { if (!o) setShot(null) }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-navy"><ImageIcon className="w-5 h-5 text-gold" /> إثبات تحويل الأرباح من الإدارة</DialogTitle>
          </DialogHeader>
          {shot && <img src={shot} alt="إثبات التحويل" className="w-full rounded-xl border border-gold/30 shadow-lg" />}
          <DialogFooter>
            <Button variant="outline" onClick={() => window.open(shot!, '_blank')}><Eye className="w-4 h-4 ml-1" /> فتح بالحجم الكامل</Button>
            <Button onClick={() => setShot(null)}>إغلاق</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/** مجموع الطلبات المعلقة عبر كل العملات (للشريط السفلي في الهيرو) */
function sumPending(byCur: Record<string, any>): number {
  return Object.values(byCur || {}).reduce((a: number, t: any) => a + (t.pending_withdrawals || 0), 0)
}
