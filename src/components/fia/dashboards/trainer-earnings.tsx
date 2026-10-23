'use client'

// ============================================================================
// TRAINER EARNINGS ROYAL — «أرباحي» — خزينة متعددة العملات
// محفظة المدرب: الرصيد بكل عملة على حدة (دولار، ريال يمني، سعودي…)،
// نسبة الأرباح من كل دورة، وطلبات سحب تُرسل بالعملة نفسها التي رُبح بها.
// طريقة الاستلام تُستدعى حصراً من «حسابات السحب» التي أضافها المدرب بنفسه —
// وإذا لم يضف حساباً يُوجَّه إلى القسم لإضافة طريقة قبل أي طلب سحب.
// ============================================================================
import { useEffect, useState, useCallback } from 'react'
import {
  Wallet, TrendingUp, BadgePercent, Landmark, Bitcoin, CheckCircle2,
  Clock, XCircle, Image as ImageIcon, Send, Loader2, Sparkles, Crown, Coins,
  ArrowDownToLine, Users, BookOpen, Eye, Gem, ChevronDown, Globe2, Copy, Star,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { SectionCard } from './shell'
import { LuxCombo } from './luxury'
import { supabasePublic } from '@/lib/supabase'
import { fmtMoney, currencyInfo } from '@/lib/currency'

/** حساب سحب مضاف من المدرب في قسم «حسابات السحب» */
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

/** نفس استنتاج نوع الطريقة الذي يطبقه الخادم — لأيقونة العرض */
const isCryptoMethod = (name?: string | null, currency?: string | null) =>
  /(usdt|bitcoin|btc|ethereum|\beth\b|binance|tron|tether|عملات\s*رقمية)/i.test(`${name || ''} ${currency || ''}`)

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
  const [accounts, setAccounts] = useState<WAccount[]>([])

  // withdrawal dialog
  const [wdOpen, setWdOpen] = useState(false)
  const [wdAmount, setWdAmount] = useState('')
  const [wdCurrency, setWdCurrency] = useState('')
  const [wdAccountId, setWdAccountId] = useState('')
  const [wdSubmitting, setWdSubmitting] = useState(false)

  // screenshot viewer
  const [shot, setShot] = useState<string | null>(null)
  // 🤝 v6.9 — ردّ المدرب على عرض إعادة التفاوض الملكي
  const [renegBusy, setRenegBusy] = useState(false)
  const [renegDeclineNote, setRenegDeclineNote] = useState('')

  const load = useCallback(async () => {
    if (!user?.id) return
    try {
      const [eRes, aRes] = await Promise.all([
        fetch(`/api/trainer-earnings?trainer_id=${user.id}`),
        fetch('/api/trainer/withdrawal-accounts'),
      ])
      const d = await eRes.json().catch(() => null)
      const a = await aRes.json().catch(() => null)
      if (d && !d.error) setData(d)
      if (Array.isArray(a)) setAccounts(a)
    } catch {}
    finally { setLoading(false) }
  }, [user?.id])

  useEffect(() => { load() }, [load])

  // ⚡ REAL-TIME: new earnings + withdrawal decisions + account changes appear instantly
  useEffect(() => {
    if (!user?.id) return
    let ch1: any, ch2: any, ch3: any
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
      ch3 = supabasePublic.channel(`trainer-accounts:${user.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'trainer_withdrawal_accounts' }, () => load())
        .subscribe()
    } catch {}
    return () => {
      try { supabasePublic.removeChannel(ch1) } catch {}
      try { supabasePublic.removeChannel(ch2) } catch {}
      try { supabasePublic.removeChannel(ch3) } catch {}
    }
  }, [user?.id, load])

  /** التحويل إلى قسم «حسابات السحب» داخل لوحة المدرب نفسها */
  const goAccounts = () => {
    try { window.location.hash = 'withdrawal-accounts' } catch {}
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

  // 💳 حسابات الاستلام — تُستدعى من «حسابات السحب» مباشرة
  const wdAccount = accounts.find((a) => a.id === wdAccountId) || accounts[0] || null
  const accountOptions = accounts.map((a) => ({
    value: a.id,
    label: a.method_name,
    hint: `${a.country}${a.account_name ? ' • ' + a.account_name : ''}`,
    meta: a.currency || undefined,
  }))

  const openWithdrawDialog = () => {
    const firstWithBalance = curEntries.find((c: any) => c.available > 0)?.currency || data?.primary_currency || 'ر.ي'
    setWdCurrency(firstWithBalance)
    setWdAmount('')
    setWdAccountId(accounts[0]?.id || '')
    setWdOpen(true)
  }

  const submitWithdrawal = async () => {
    const amount = parseInt(wdAmount) || 0
    if (amount <= 0) { toast.error('أدخل مبلغاً صحيحاً'); return }
    if (amount > wdAvailable) { toast.error(`المبلغ يتجاوز رصيدك المتاح بعملة ${wdCur} (${fmtMoney(wdAvailable, wdCur)})`); return }
    if (!wdAccount) { toast.error('أضف حساب سحب أولاً من قسم «حسابات السحب»'); goAccounts(); return }
    setWdSubmitting(true)
    try {
      const res = await fetch('/api/trainer-earnings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trainer_id: user.id, amount, currency: wdCur, account_id: wdAccount.id }),
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

  // 🤝 v6.9 — عرض إعادة التفاوض المعلّق (إن وُجد): النسبة السارية تبقى مفعّلة حتى الرد
  const renegOffer: any = data?.profile?.agreement?.renegotiation
  const renegPending = !!renegOffer && renegOffer.trainer_response === 'pending'

  const respondRenegotiation = async (response: 'accepted' | 'declined') => {
    if (!user?.id || renegBusy) return
    setRenegBusy(true)
    try {
      const res = await fetch('/api/trainers/agreement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trainer_id: user.id, response, note: response === 'declined' ? renegDeclineNote : undefined }),
      })
      const d = await res.json().catch(() => ({}))
      if (res.ok && d.success) {
        toast.success(d.message || 'تم تسجيل ردّك')
        setRenegDeclineNote('')
        await load()
      } else {
        toast.error(d.error || 'تعذر تسجيل الرد')
      }
    } catch { toast.error('خطأ') } finally { setRenegBusy(false) }
  }

  return (
    <div className="space-y-6">
      {/* 🤝 v6.9 — عرض إعادة التفاوض الملكي: قرارات سريعة بلمسة واحدة */}
      {renegPending && (
        <div className="relative overflow-hidden rounded-2xl border border-gold/50 bg-gradient-to-l from-amber-50 via-white to-gold/[0.06] p-5 shadow-lg">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 15% 50%, #D4AF37 1.5px, transparent 1.5px)', backgroundSize: '16px 16px' }} />
          <div className="relative space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold to-amber-500 flex items-center justify-center flex-shrink-0 shadow">
                <BadgePercent className="w-5 h-5 text-navy" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-extrabold text-navy">📜 عرض تعديل اتفاق الأرباح بانتظار موافقتك</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  الإدارة تقترح تعديل نسبتك من <b className="text-navy" dir="ltr">{percentage}%</b> إلى <b className="text-emerald-700" dir="ltr">{Number(renegOffer.percentage) || 0}%</b> من كل دورة.
                  نسبتك السارية تبقى مفعّلة حتى توافق — وبعد موافقتك يُقفل العقد الجديد من الطرفين.
                </p>
              </div>
            </div>
            {renegOffer.note && (
              <p className="text-[11px] rounded-xl bg-gold/10 border border-gold/25 p-2.5 text-navy"><b className="text-gold">ملاحظة الإدارة:</b> {String(renegOffer.note)}</p>
            )}
            <div className="flex flex-col sm:flex-row gap-2">
              <button type="button" disabled={renegBusy} onClick={() => respondRenegotiation('accepted')}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-l from-gold to-amber-500 text-navy text-xs font-extrabold shadow hover:brightness-110 transition-all disabled:opacity-60 flex items-center justify-center gap-1.5">
                {renegBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                أوافق — أقفل الاتفاق بالنسبة الجديدة {Number(renegOffer.percentage) || 0}%
              </button>
              <button type="button" disabled={renegBusy} onClick={() => respondRenegotiation('declined')}
                className="sm:w-44 py-2.5 rounded-xl border border-navy/25 bg-white text-navy text-xs font-extrabold hover:bg-navy/5 transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5">
                <XCircle className="w-4 h-4" /> أرفض — تبقى نسبيتي الحالية
              </button>
            </div>
          </div>
        </div>
      )}
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

      {/* ── طريقة استلام الأرباح — تُستدعى من «حسابات السحب» ── */}
      <SectionCard
        title="طريقة استلام الأرباح"
        description="تُصرف أرباحك إلى حساباتك المضافة في قسم «حسابات السحب» — أضف حساباً واحداً على الأقل لتصل أرباحك"
      >
        {accounts.length === 0 ? (
          <div className="relative overflow-hidden rounded-xl border border-amber-500/30 bg-gradient-to-l from-amber-500/[0.08] to-transparent p-5 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-gold/25 to-amber-500/15 border border-gold/40 flex items-center justify-center">
              <Landmark className="w-6 h-6 text-[#8a6d1d]" />
            </div>
            <p className="text-sm font-bold text-navy">لا يوجد حساب سحب مضاف بعد</p>
            <p className="text-[11px] text-muted-foreground mt-1 mb-4">أضف طريقة استلامك — محفظة، حوالة بنكية أو عملات رقمية — من قسم «حسابات السحب» ثم عد هنا لطلب سحب أرباحك</p>
            <Button onClick={goAccounts} className="relative overflow-hidden bg-gradient-to-l from-gold to-amber-500 hover:from-amber-500 hover:to-gold text-navy font-extrabold rounded-xl shadow-md active:scale-[0.97] transition-all">
              <span className="absolute inset-0 lux-shimmer" />
              <Landmark className="w-4 h-4 ml-1 relative" /> الانتقال إلى حسابات السحب لإضافة طريقة
            </Button>
          </div>
        ) : (
          <>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {accounts.map((a) => (
                <div key={a.id} className="relative overflow-hidden rounded-xl border border-gold/25 bg-gradient-to-l from-gold/[0.06] to-transparent p-3.5 hover:border-gold/50 transition-colors">
                  <div className="absolute right-0 top-0 bottom-0 w-1 bg-gradient-to-b from-gold to-amber-500 opacity-70" />
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-navy to-navy-light border border-gold/30 flex items-center justify-center flex-shrink-0">
                      {isCryptoMethod(a.method_name, a.currency) ? <Bitcoin className="w-5 h-5 text-gold" /> : <Landmark className="w-5 h-5 text-gold" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-navy flex items-center gap-1.5 truncate">
                        {a.method_name}
                        {a.is_default && <Star className="w-3.5 h-3.5 fill-gold text-gold flex-shrink-0" />}
                      </p>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                        <Globe2 className="w-3 h-3" /> {a.country}
                        {a.currency && <span className="rounded-full border border-gold/40 bg-gold/10 px-1.5 text-[9px] font-black text-[#8a6d1d]" dir="ltr">{a.currency}</span>}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1 text-[11px]">
                    <p className="flex justify-between gap-2"><span className="text-muted-foreground">صاحب الحساب:</span><span className="font-bold text-navy truncate">{a.account_name}</span></p>
                    {a.account_number && (
                      <p className="flex items-center justify-between gap-2">
                        <span className="text-muted-foreground">الرقم / العنوان:</span>
                        <button onClick={() => { navigator.clipboard?.writeText(a.account_number || '').catch(() => {}); toast.success('نُسخ رقم الحساب') }}
                          className="flex items-center gap-1 font-mono font-bold text-navy hover:text-[#8a6d1d] transition-colors" dir="ltr">
                          {a.account_number} <Copy className="w-3 h-3 flex-shrink-0" />
                        </button>
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <Button variant="outline" onClick={goAccounts} className="mt-3 w-full rounded-xl border-gold/40 hover:bg-gold/10 text-navy text-xs font-bold">
              <Landmark className="w-4 h-4 ml-1" /> إدارة حسابات السحب — إضافة أو حذف حساب
            </Button>
          </>
        )}
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
                    <p className="text-[10px] text-muted-foreground">{w.method_name || w.method_type}{w.account_owner ? ` — ${w.account_owner}` : ''} • <span dir="ltr">{w.account}</span>{w.account_country ? ` • ${w.account_country}` : ''}</p>
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
            {/* 💳 حساب الاستلام — يُستدعى حصراً من «حسابات السحب» المضافة */}
            {accounts.length === 0 ? (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-4 text-center">
                <Landmark className="w-8 h-8 mx-auto mb-2 text-amber-600/70" />
                <p className="text-sm font-bold text-navy">لا يوجد حساب سحب مضاف بعد</p>
                <p className="text-[11px] text-muted-foreground mt-1 mb-3">أضف حسابك أولاً في قسم «حسابات السحب» ثم عد لطلب سحب أرباحك</p>
                <Button onClick={() => { setWdOpen(false); goAccounts() }} size="sm" className="bg-gradient-to-l from-gold to-amber-500 hover:from-amber-500 hover:to-gold text-navy font-extrabold rounded-xl">
                  <Landmark className="w-4 h-4 ml-1" /> الانتقال إلى حسابات السحب
                </Button>
              </div>
            ) : (
              <div>
                <Label className="text-xs font-extrabold text-navy flex items-center gap-1.5 mb-2">
                  <Landmark className="w-3.5 h-3.5 text-gold" /> حساب استلام الأرباح — من حساباتك المضافة
                </Label>
                <LuxCombo value={wdAccount?.id || ''} onChange={(v) => setWdAccountId(v)} options={accountOptions} searchPlaceholder="ابحث في حساباتك..." />
                <p className="mt-1.5 text-[10px] text-muted-foreground">تظهر بيانات الحساب للإدارة فقط عند معالجة الطلب — محفوظة بأمان</p>
              </div>
            )}
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
            {wdAccount && (
              <div className="rounded-xl border border-gold/25 bg-gradient-to-l from-gold/[0.08] to-transparent p-3 flex items-start gap-2.5">
                {isCryptoMethod(wdAccount.method_name, wdAccount.currency) ? <Bitcoin className="w-4 h-4 text-gold flex-shrink-0 mt-0.5" /> : <Landmark className="w-4 h-4 text-gold flex-shrink-0 mt-0.5" />}
                <div className="text-[11px] text-muted-foreground leading-relaxed">
                  {'\u064a\u064f\u062d\u0648\u0651\u064e\u0644'} <b className="text-navy" dir="ltr">{fmtMoney(parseInt(wdAmount) || 0, wdCur)}</b> إلى: <b className="text-navy">{wdAccount.method_name}</b>
                  {wdAccount.account_number && <> — <span dir="ltr" className="text-navy font-bold">{wdAccount.account_number}</span></>}
                  {wdAccount.account_name && <> باسم <b className="text-navy">{wdAccount.account_name}</b></>}
                  {wdAccount.currency && wdAccount.currency !== wdCur && (
                    <p className="mt-1 text-amber-600">ملاحظة: عملة الحساب ({wdAccount.currency}) تختلف عن عملة السحب ({wdCur}) — الإدارة ستنسّق التحويل عند المعالجة</p>
                  )}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWdOpen(false)}>إلغاء</Button>
            <Button onClick={submitWithdrawal} disabled={wdSubmitting || wdAvailable <= 0 || accounts.length === 0 || !wdAccount} className="bg-gradient-to-l from-gold to-amber-500 hover:from-amber-500 hover:to-gold text-navy font-extrabold">
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
