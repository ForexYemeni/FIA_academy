'use client'

// ============================================================================
// ADMIN TRAINER EARNINGS ROYAL — «أرباح المدربين»
// الإدارة ترى طلبات سحب أرباح المدربين وتوافق (مع رفع لقطة شاشة إلزامية
// لإثبات التحويل) أو ترفض مع السبب — وتشاهد ملخص مستحقات كل مدرب ونسبته.
// ============================================================================
import { useEffect, useState, useCallback } from 'react'
import {
  Wallet, TrendingUp, BadgePercent, Landmark, Bitcoin, CheckCircle2, XCircle,
  Clock, Image as ImageIcon, Loader2, Sparkles, Crown, Users, BookOpen,
  GraduationCap, Upload, Eye, Hourglass, ChevronDown, ChevronUp, Banknote,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { LuxSection, LuxStats, LuxEmpty, LuxRow, LuxBadge } from './luxury'
import { supabasePublic } from '@/lib/supabase'
import { fmtMoney, currencyInfo } from '@/lib/currency'


/** صفوف مبالغ لكل عملة داخل بطاقة إحصائية أو بطاقة مدرب */
function CurLines({ byCur, pick, cls = 'text-white' }: { byCur: Record<string, any>; pick: (t: any) => number; cls?: string }) {
  const entries = Object.entries(byCur || {}).filter(([, t]: any) => pick(t) !== 0)
  if (entries.length === 0) return <span className={cls} dir="ltr">{fmtMoney(0, 'ر.ي')}</span>
  return (
    <div className="space-y-0.5">
      {entries.map(([cur, t]: any) => (
        <div key={cur} className={`${cls} ${entries.length > 1 ? 'text-sm' : 'text-xl'} font-extrabold leading-none tabular-nums`} dir="ltr">
          {fmtMoney(pick(t), cur)}
        </div>
      ))}
    </div>
  )
}

function compressImage(file: File, maxW = 1400, maxH = 1400, quality = 0.85): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        let { width, height } = img
        const scale = Math.min(maxW / width, maxH / height, 1)
        width = Math.round(width * scale); height = Math.round(height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = width; canvas.height = height
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
        canvas.toBlob((blob) => {
          if (!blob) { reject(new Error('فشل ضغط الصورة')); return }
          resolve(new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }))
        }, 'image/jpeg', quality)
      }
      img.onerror = () => reject(new Error('فشل تحميل الصورة'))
      img.src = e.target?.result as string
    }
    reader.onerror = () => reject(new Error('فشل قراءة الملف'))
    reader.readAsDataURL(file)
  })
}

export function AdminTrainerEarningsRoyal() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)

  // approve dialog state
  const [approveTarget, setApproveTarget] = useState<any | null>(null)
  const [approveShot, setApproveShot] = useState<string>('')
  const [approveNote, setApproveNote] = useState('')
  const [uploadingShot, setUploadingShot] = useState(false)
  const [processing, setProcessing] = useState(false)

  // reject dialog state
  const [rejectTarget, setRejectTarget] = useState<any | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  // expanded trainer summary
  const [expanded, setExpanded] = useState<string | null>(null)

  const load = useCallback(() => {
    fetch('/api/trainer-earnings?admin=1').then((r) => r.json()).then((d) => {
      if (d && !d.error) setData(d)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  // ⚡ REAL-TIME: withdrawal requests + earnings live
  useEffect(() => {
    let ch1: any, ch2: any
    try {
      ch1 = supabasePublic.channel('admin-withdrawals-royal')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'withdrawal_requests' }, () => load())
        .subscribe()
      ch2 = supabasePublic.channel('admin-earnings-royal')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'trainer_earnings' }, () => load())
        .subscribe()
    } catch {}
    return () => { try { supabasePublic.removeChannel(ch1) } catch {} try { supabasePublic.removeChannel(ch2) } catch {} }
  }, [load])

  const handleShotUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) { toast.error('اختر صورة (JPG / PNG)'); return }
    setUploadingShot(true)
    try {
      const compressed = await compressImage(file)
      const fd = new FormData()
      fd.append('file', compressed)
      fd.append('folder', 'withdrawal-proofs')
      const res = await fetch('/api/upload/image', { method: 'POST', body: fd })
      const d = await res.json()
      if (d.url) { setApproveShot(d.url); toast.success('تم رفع لقطة إثبات التحويل') }
      else toast.error(d.error || 'فشل رفع الصورة')
    } catch { toast.error('خطأ في رفع الصورة') }
    finally { setUploadingShot(false) }
  }

  const processDecision = async (status: 'مكتمل' | 'ملغي') => {
    const target = status === 'مكتمل' ? approveTarget : rejectTarget
    if (!target) return
    if (status === 'مكتمل' && !approveShot) { toast.error('ارفع لقطة شاشة لإثبات تحويل الأرباح أولاً'); return }
    if (status === 'ملغي' && !rejectReason.trim()) { toast.error('اكتب سبب الرفض'); return }
    setProcessing(true)
    try {
      const res = await fetch('/api/trainer-earnings', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: target.id, status,
          screenshot_url: status === 'مكتمل' ? approveShot : undefined,
          admin_note: status === 'مكتمل' ? approveNote : rejectReason,
        }),
      })
      const d = await res.json()
      if (res.ok) {
        toast.success(status === 'مكتمل' ? '✅ تمت الموافقة — أُرسلت لقطة الإثبات للمدرب' : 'تم رفض الطلب وإشعار المدرب')
        setApproveTarget(null); setRejectTarget(null)
        setApproveShot(''); setApproveNote(''); setRejectReason('')
        load()
      } else toast.error(d.error || 'فشل تنفيذ القرار')
    } catch { toast.error('خطأ في الاتصال') }
    finally { setProcessing(false) }
  }

  if (loading) {
    return <div className="text-center py-16"><Loader2 className="w-7 h-7 mx-auto animate-spin text-gold" /></div>
  }

  const perTrainer = data?.per_trainer || []
  const withdrawals = data?.withdrawals || []
  const pending = withdrawals.filter((w: any) => w.status === 'قيد الانتظار')
  const processed = withdrawals.filter((w: any) => w.status !== 'قيد الانتظار')
  // ⚡ إجماليات عالمية لكل عملة — كل عملة خزينة مستقلة
  const globalByCur: Record<string, any> = {}
  for (const t of perTrainer) {
    for (const [cur, tt] of Object.entries(t.totals_by_currency || {}) as any[]) {
      if (!globalByCur[cur]) globalByCur[cur] = { total_earned: 0, available: 0, withdrawn: 0, pending_withdrawals: 0 }
      globalByCur[cur].total_earned += tt.total_earned || 0
      globalByCur[cur].available += tt.available || 0
      globalByCur[cur].withdrawn += tt.withdrawn || 0
      globalByCur[cur].pending_withdrawals += tt.pending_withdrawals || 0
    }
  }
  const pendingByCur: Record<string, number> = {}
  for (const w of pending) pendingByCur[w.currency || 'ر.ي'] = (pendingByCur[w.currency || 'ر.ي'] || 0) + (w.amount || 0)

  return (
    <LuxSection
      title="أرباح المدربين"
      subtitle="محفظة مستحقات نخبة المدربين — طلبات السحب وقراراتك بلقطات الإثبات"
      icon={Wallet}
      themeKey="trainers"
      count={pending.length}
      stats={
        <LuxStats
          items={[
            { icon: TrendingUp, label: 'إجمالي ما كُسب للمدربين', value: <CurLines byCur={globalByCur} pick={(t: any) => t.total_earned} />, grad: 'from-emerald-500 to-teal-600' },
            { icon: Hourglass, label: 'مستحقات بانتظار السحب', value: <CurLines byCur={globalByCur} pick={(t: any) => t.available} />, grad: 'from-amber-500 to-gold' },
            { icon: Clock, label: 'طلبات سحب معلقة', value: <CurLines byCur={pendingByCur} pick={(v: any) => v} />, grad: 'from-purple-500 to-fuchsia-600' },
            { icon: CheckCircle2, label: 'إجمالي ما تم صرفه', value: <CurLines byCur={globalByCur} pick={(t: any) => t.withdrawn} />, grad: 'from-blue-500 to-indigo-600' },
          ]}
        />
      }
    >
      {/* ── طلبات السحب المعلقة ── */}
      <div className="mb-3 flex items-center gap-2">
        <h3 className="text-sm font-extrabold text-navy flex items-center gap-1.5"><Clock className="w-4 h-4 text-amber-600" /> طلبات السحب بانتظار قرارك</h3>
        {pending.length > 0 && <LuxBadge tone="gold">{pending.length}</LuxBadge>}
        {pending.length > 0 && <span className="text-[10px] text-muted-foreground">بمجموع <CurLines byCur={pendingByCur} pick={(v: any) => v} cls="text-navy font-extrabold" /></span>}
      </div>
      {pending.length === 0 ? (
        <div className="rounded-xl border border-gold/20 bg-gradient-to-l from-gold/[0.04] to-transparent p-6 text-center mb-6">
          <Sparkles className="w-8 h-8 mx-auto mb-2 text-gold/60" />
          <p className="text-sm font-bold text-navy">لا توجد طلبات سحب معلقة</p>
          <p className="text-[11px] text-muted-foreground">عندما يطلب مدرب سحب أرباحه سيظهر هنا فوراً</p>
        </div>
      ) : (
        <div className="space-y-3 mb-6">
          {pending.map((w: any) => (
            <Card key={w.id} className="relative overflow-hidden p-0 border border-amber-500/40 bg-gradient-to-l from-amber-500/[0.06] to-transparent">
              <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-amber-500 to-gold" />
              <div className="p-4 flex flex-wrap items-center gap-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-gold/30 blur-md rounded-full" />
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden border-2 border-gold/50 bg-navy-light">
                    {w.trainer_avatar ? <img src={w.trainer_avatar} alt={w.trainer_name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-gold font-extrabold text-lg bg-gradient-to-br from-navy to-navy-light">{w.trainer_name?.charAt(0)}</div>}
                  </div>
                </div>
                <div className="flex-1 min-w-[180px]">
                  <p className="text-sm font-extrabold text-navy flex items-center gap-1.5">
                    {w.trainer_name}
                    <span className="text-[9px] font-bold rounded-full bg-gold/15 border border-gold/40 text-[#8a6d1d] px-2 py-0.5" dir="ltr">{fmtMoney(w.amount, w.currency)}</span>
                  </p>
                  <div className="mt-1 space-y-0.5">
                    <LuxRow icon={w.method_type === 'عملات رقمية' ? Bitcoin : Landmark}>
                      {w.method_name || '—'} • <span dir="ltr" className="font-bold">{w.account}</span>
                    </LuxRow>
                    <p className="text-[9px] text-muted-foreground">طلب بتاريخ {new Date(w.created_at).toLocaleString('ar-EG')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={() => { setApproveTarget(w); setApproveShot(''); setApproveNote('') }}
                    className="bg-gradient-to-l from-emerald-600 to-teal-600 hover:from-teal-600 hover:to-emerald-600 text-white rounded-xl shadow-md font-bold">
                    <CheckCircle2 className="w-4 h-4 ml-1" /> موافقة + لقطة
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setRejectTarget(w); setRejectReason('') }}
                    className="border-rose-500/40 text-rose-600 hover:bg-rose-500/10 rounded-xl font-bold">
                    <XCircle className="w-4 h-4 ml-1" /> رفض
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── ملخص مستحقات كل مدرب ── */}
      <div className="mb-3 flex items-center gap-2">
        <h3 className="text-sm font-extrabold text-navy flex items-center gap-1.5"><GraduationCap className="w-4 h-4 text-gold" /> ملخص مستحقات المدربين</h3>
      </div>
      {perTrainer.length === 0 ? (
        <LuxEmpty icon={GraduationCap} themeKey="trainers" title="لا يوجد مدربون" hint="أضف مدربين وحدد نسب أرباحهم لتظهر محافظهم هنا" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {perTrainer.map((t: any) => {
            const hasActivity = t.total_earned > 0 || t.pending_withdrawals > 0
            const isExpanded = expanded === t.trainer_id
            const myEarnings = (data?.earnings || []).filter((e: any) => e.trainer_id === t.trainer_id).slice(0, 8)
            return (
              <Card key={t.trainer_id} className={`relative overflow-hidden p-0 border ${hasActivity ? 'border-gold/30' : 'border-border/60'} bg-gradient-to-br from-white to-gold/[0.03]`}>
                <div className="h-1 bg-gradient-to-l from-gold via-amber-300 to-gold opacity-70" />
                <div className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-11 h-11 rounded-xl overflow-hidden border-2 border-gold/40 bg-navy-light flex-shrink-0">
                      {t.avatar ? <img src={t.avatar} alt={t.name} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-gold font-extrabold text-base bg-gradient-to-br from-navy to-navy-light">{t.name?.charAt(0)}</div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-extrabold text-navy truncate flex items-center gap-1.5">{t.name}
                        {(Number(t.profit_percentage) || 0) > 0 && (
                          <span className="text-[9px] font-extrabold rounded-full bg-gold/15 border border-gold/40 text-[#8a6d1d] px-2 py-0.5" dir="ltr">{Number(t.profit_percentage)}%</span>
                        )}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">{t.title || 'مدرب'} {t.students_paid > 0 && `• ${t.students_paid} دفعة متدربين`}</p>
                    </div>
                    {t.payment_method_name && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 bg-emerald-500/10 border border-emerald-500/25 rounded-full px-2 py-0.5 flex-shrink-0">
                        {t.payment_method_type === 'عملات رقمية' ? <Bitcoin className="w-3 h-3" /> : <Landmark className="w-3 h-3" />} {t.payment_method_name}
                      </span>
                    )}
                  </div>
                  {/* 4 mini numbers — لكل عملة صفها الفاخر */}
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    <div className="rounded-lg bg-navy/[0.03] border border-navy/10 px-2 py-1.5 text-center">
                      <p className="text-[8px] font-bold text-muted-foreground">كُسب</p>
                      <CurLines byCur={t.totals_by_currency || {}} pick={(t2: any) => t2.total_earned} cls="text-navy" />
                    </div>
                    <div className="rounded-lg bg-amber-500/[0.07] border border-amber-500/20 px-2 py-1.5 text-center">
                      <p className="text-[8px] font-bold text-muted-foreground">متاح</p>
                      <CurLines byCur={t.totals_by_currency || {}} pick={(t2: any) => t2.available} cls="text-[#8a6d1d]" />
                    </div>
                    <div className="rounded-lg bg-purple-500/[0.07] border border-purple-500/20 px-2 py-1.5 text-center">
                      <p className="text-[8px] font-bold text-muted-foreground">معلق</p>
                      <CurLines byCur={t.totals_by_currency || {}} pick={(t2: any) => t2.pending_withdrawals} cls="text-purple-700" />
                    </div>
                    <div className="rounded-lg bg-emerald-500/[0.07] border border-emerald-500/20 px-2 py-1.5 text-center">
                      <p className="text-[8px] font-bold text-muted-foreground">مصروف</p>
                      <CurLines byCur={t.totals_by_currency || {}} pick={(t2: any) => t2.withdrawn} cls="text-emerald-700" />
                    </div>
                  </div>
                  {/* expand earnings log */}
                  {hasActivity && (
                    <>
                      <button type="button" onClick={() => setExpanded(isExpanded ? null : t.trainer_id)}
                        className="w-full flex items-center justify-center gap-1.5 text-[10px] font-bold text-gold hover:text-navy transition-colors">
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        {isExpanded ? 'إخفاء سجل الأرباح' : 'عرض سجل أرباحه'}
                      </button>
                      {isExpanded && (
                        <div className="mt-2.5 space-y-1.5 max-h-56 overflow-y-auto lux-scrollbar pl-1">
                          {myEarnings.length === 0 ? (
                            <p className="text-[10px] text-muted-foreground text-center py-2">لا توجد أرباح مسجلة بعد</p>
                          ) : myEarnings.map((e: any) => (
                            <div key={e.id} className="flex items-center gap-2 rounded-lg border border-gold/15 bg-white px-2.5 py-1.5">
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-bold text-navy truncate">{e.course_title || 'دورة'}</p>
                                <p className="text-[8px] text-muted-foreground truncate">{e.student_name || '—'} • {new Date(e.created_at).toLocaleDateString('ar-EG')}</p>
                              </div>
                              <p className="text-[10px] font-extrabold text-emerald-600 tabular-nums" dir="ltr">+{fmtMoney(e.amount, e.currency)}</p>
                              <span className={`text-[8px] font-bold rounded-full px-1.5 py-0.5 border ${e.status === 'متاح' ? 'bg-gold/15 text-[#8a6d1d] border-gold/40' : 'bg-navy/10 text-navy border-navy/20'}`}>{e.status}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* ── سجل الطلبات المعالجة ── */}
      {processed.length > 0 && (
        <>
          <div className="mb-3 mt-6 flex items-center gap-2">
            <h3 className="text-sm font-extrabold text-navy flex items-center gap-1.5"><BookOpen className="w-4 h-4 text-gold" /> سجل الطلبات المعالجة</h3>
            <LuxBadge tone="gray">{processed.length}</LuxBadge>
          </div>
          <div className="space-y-2">
            {processed.map((w: any) => (
              <div key={w.id} className="relative overflow-hidden rounded-xl border border-gold/15 bg-white px-3.5 py-2.5 flex flex-wrap items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center border flex-shrink-0 ${w.status === 'مكتمل' ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-rose-500/10 border-rose-500/30'}`}>
                  {w.status === 'مكتمل' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <XCircle className="w-5 h-5 text-rose-600" />}
                </div>
                <div className="flex-1 min-w-[140px]">
                  <p className="text-xs font-extrabold text-navy">{w.trainer_name} — <span dir="ltr">{fmtMoney(w.amount, w.currency)}</span></p>
                  <p className="text-[9px] text-muted-foreground">عولج في {new Date(w.processed_at || w.created_at).toLocaleString('ar-EG')}</p>
                </div>
                {w.admin_note && <p className="text-[10px] text-muted-foreground max-w-[220px] truncate">📝 {w.admin_note}</p>}
                {w.screenshot_url && (
                  <Button size="sm" variant="outline" className="h-7 rounded-lg border-gold/30 hover:bg-gold/10 text-[10px] font-bold" onClick={() => window.open(w.screenshot_url, '_blank')}>
                    <ImageIcon className="w-3 h-3 ml-1" /> الإثبات
                  </Button>
                )}
                <Badge className={`text-[9px] font-bold ${w.status === 'مكتمل' ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30' : 'bg-rose-500/15 text-rose-600 border-rose-500/30'}`}>{w.status}</Badge>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Approve dialog (screenshot REQUIRED) ── */}
      <Dialog open={!!approveTarget} onOpenChange={(o) => { if (!o && !processing) setApproveTarget(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-navy">
              <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center"><CheckCircle2 className="w-5 h-5 text-white" /></span>
              الموافقة على سحب الأرباح
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-l from-navy via-navy-light to-navy p-4 text-white border border-gold/30">
              <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 15% 50%, #D4AF37 1.5px, transparent 1.5px)', backgroundSize: '16px 16px' }} />
              <div className="relative">
                <p className="text-[10px] text-gold/80 font-bold mb-1">تحويل إلى</p>
                <p className="text-sm font-extrabold">{approveTarget?.trainer_name}</p>
                <p className="text-[11px] text-white/70 mt-0.5 flex items-center gap-1">
                  {approveTarget?.method_type === 'عملات رقمية' ? <Bitcoin className="w-3 h-3" /> : <Landmark className="w-3 h-3" />}
                  {approveTarget?.method_name} — <span dir="ltr" className="font-bold text-gold">{approveTarget?.account}</span>
                </p>
                <p className="text-2xl font-extrabold mt-2" dir="ltr">{fmtMoney(approveTarget?.amount, approveTarget?.currency)}</p>
              </div>
            </div>
            <div>
              <Label className="text-xs font-extrabold text-navy flex items-center gap-1.5 mb-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-gold" /> لقطة شاشة إثبات التحويل <span className="text-rose-500">*</span>
              </Label>
              {approveShot ? (
                <div className="relative rounded-xl overflow-hidden border-2 border-emerald-500/40 shadow-md">
                  <img src={approveShot} alt="إثبات التحويل" className="w-full max-h-52 object-cover" />
                  <button type="button" onClick={() => setApproveShot('')} className="absolute top-2 left-2 w-7 h-7 rounded-full bg-rose-500 text-white flex items-center justify-center shadow">
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer block">
                  <div className="rounded-xl border-2 border-dashed border-gold/40 bg-gold/[0.04] p-6 text-center hover:bg-gold/[0.08] transition-colors">
                    {uploadingShot ? <Loader2 className="w-7 h-7 mx-auto text-gold animate-spin" /> : <Upload className="w-7 h-7 mx-auto text-gold mb-2" />}
                    <p className="text-xs font-bold text-navy">{uploadingShot ? 'جاري الرفع...' : 'ارفع لقطة الشاشة من تطبيق التحويل'}</p>
                    <p className="text-[9px] text-muted-foreground mt-1">ستظهر للمدرب في قسم «أرباحي» مع إشعار فوري</p>
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleShotUpload(f); e.target.value = '' }} />
                </label>
              )}
            </div>
            <div>
              <Label className="text-xs font-bold text-navy mb-1.5 block">ملاحظة للمدرب (اختياري)</Label>
              <textarea value={approveNote} onChange={(e) => setApproveNote(e.target.value)} rows={2}
                className="w-full rounded-xl border border-gold/30 p-3 text-xs focus:outline-none focus:ring-2 focus:ring-gold/25 focus:border-gold"
                placeholder="مثال: تم التحويل عبر محفظة جيب — شكراً لتميزك معنا ✦" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveTarget(null)} disabled={processing}>إلغاء</Button>
            <Button onClick={() => processDecision('مكتمل')} disabled={processing || !approveShot}
              className="bg-gradient-to-l from-emerald-600 to-teal-600 hover:from-teal-600 hover:to-emerald-600 text-white font-extrabold">
              {processing ? <Loader2 className="w-4 h-4 ml-1 animate-spin" /> : <CheckCircle2 className="w-4 h-4 ml-1" />}
              تأكيد الموافقة والصرف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Reject dialog ── */}
      <Dialog open={!!rejectTarget} onOpenChange={(o) => { if (!o && !processing) setRejectTarget(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <span className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center"><XCircle className="w-5 h-5" /></span>
              رفض طلب السحب
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="rounded-xl bg-rose-500/[0.06] border border-rose-500/25 p-3">
              <p className="text-xs text-navy">
                طلب <b>{rejectTarget?.trainer_name}</b> بمبلغ <b dir="ltr">{fmtMoney(rejectTarget?.amount, rejectTarget?.currency)}</b> — سيعود المبلغ إلى رصيده المتاح بعملته نفسها.
              </p>
            </div>
            <div>
              <Label className="text-xs font-extrabold text-navy mb-1.5 block">سبب الرفض <span className="text-rose-500">*</span></Label>
              <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3}
                className="w-full rounded-xl border border-rose-500/30 p-3 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/25 focus:border-rose-500"
                placeholder="مثال: بيانات المحفظة غير صحيحة — حدّثها من قسم أرباحي ثم أعد الطلب" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)} disabled={processing}>إلغاء</Button>
            <Button onClick={() => processDecision('ملغي')} disabled={processing || !rejectReason.trim()}
              className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold">
              {processing ? <Loader2 className="w-4 h-4 ml-1 animate-spin" /> : <XCircle className="w-4 h-4 ml-1" />}
              تأكيد الرفض
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </LuxSection>
  )
}
