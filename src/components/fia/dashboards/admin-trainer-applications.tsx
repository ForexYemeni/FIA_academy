'use client'

// 👑👑👑 طلبات المدربين الملكية — قصر الموافقات والإتفاقات 👑👑👑
// v2 فاخر: حزام ملكي متوهج + إحصاءات حية + بحث سريع + فلاتر ذكية
// + بطاقات أعمق (زمن نسبي، عدادات ملكية، لوحة النسبة الذهبية)

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { LuxDialog, LuxField, luxInput, LuxSection, LuxStats, LuxSearch, LuxEmpty } from './luxury'
import { cn } from '@/lib/utils'
import {
  Crown, GraduationCap, Hourglass, CheckCircle2, XCircle, Percent, Loader2,
  Award, Trophy, Star, FileText, Globe2, Mail, Phone, ShieldCheck, ScrollText,
  Scale, Eye, RefreshCw, Sparkles, Clock, ChevronDown, ChevronUp,
  Ban, PenLine, CalendarClock,
} from 'lucide-react'

interface App {
  id: string
  name: string
  email: string
  phone?: string | null
  title?: string | null
  specialization?: string | null
  bio?: string | null
  avatar?: string | null
  country?: string | null
  years_experience?: number
  qualifications?: any[]
  achievements?: any[]
  experiences?: any[]
  status: string
  agreement?: any | null
  rejected_reason?: string | null
  profit_percentage?: number
  created_at?: string
  reviewed_at?: string | null
}

/* ⏳ زمن نسبي عربي أنيق */
function timeAgo(iso?: string | null): string {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 0) return 'الآن'
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'الآن'
  if (m < 60) return `منذ ${m} دقيقة`
  const h = Math.floor(m / 60)
  if (h < 24) return `منذ ${h} ${h === 1 ? 'ساعة' : h === 2 ? 'ساعتين' : 'ساعات'}`
  const d = Math.floor(h / 24)
  if (d < 30) return `منذ ${d} ${d === 1 ? 'يوم' : d === 2 ? 'يومين' : 'أيام'}`
  return new Date(iso).toLocaleDateString('ar-EG')
}

type FilterKey = 'all' | 'pending' | 'awaiting' | 'declined' | 'rejected'

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'الكل' },
  { key: 'pending', label: 'بانتظار الموافقة' },
  { key: 'awaiting', label: 'بانتظار التوقيع' },
  { key: 'declined', label: 'يحتاج تفاوضاً' },
  { key: 'rejected', label: 'مرفوضة' },
]

export function AdminTrainerApplications() {
  const [apps, setApps] = useState<App[]>([])
  const [awaiting, setAwaiting] = useState<App[]>([])
  const [rejected, setRejected] = useState<App[]>([])
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState<App | null>(null)
  const [approveFor, setApproveFor] = useState<App | null>(null)
  const [rejectFor, setRejectFor] = useState<App | null>(null)
  const [busy, setBusy] = useState(false)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<FilterKey>('all')
  const [lastSync, setLastSync] = useState<Date | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/trainers/applications')
      const data = await res.json()
      setApps(data.applications || [])
      setAwaiting(data.awaiting_signature || [])
      setRejected(data.rejected || [])
      setLastSync(new Date())
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const decide = async (payload: any) => {
    setBusy(true)
    try {
      const res = await fetch('/api/trainers/applications', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'فشل التنفيذ'); return }
      toast.success(data.message || 'تم')
      setApproveFor(null); setRejectFor(null); setDetail(null)
      load()
    } catch { toast.error('تعذر الاتصال') }
    setBusy(false)
  }

  /* 🔍 البحث الملكي — اسم / بريد / تخصص / مسمى / بلد */
  const matchQ = (a: App) => {
    if (!query.trim()) return true
    const q = query.trim().toLowerCase()
    return [a.name, a.email, a.specialization, a.title, a.country, a.phone]
      .some((v) => v && String(v).toLowerCase().includes(q))
  }

  const declinedCount = awaiting.filter((a) => a.agreement?.trainer_response === 'declined').length
  const pureAwaiting = awaiting.filter((a) => a.agreement?.trainer_response !== 'declined')
  const total = apps.length + awaiting.length + rejected.length

  /* الترشيح حسب الفلتر المختار */
  const showPending = filter === 'all' || filter === 'pending'
  const showAwaiting = filter === 'all' || filter === 'awaiting' || filter === 'declined'
  const showRejected = filter === 'all' || filter === 'rejected'
  const pendingList = apps.filter(matchQ)
  const awaitingList = (filter === 'declined' ? awaiting.filter((a) => a.agreement?.trainer_response === 'declined') : awaiting).filter(matchQ)
  const rejectedList = rejected.filter(matchQ)
  const nothingAtAll = !loading && filter === 'all' && total === 0

  return (
    <LuxSection
      title="قصر الموافقات الملكي — طلبات المدربين"
      subtitle="افحص ملفات المتقدمين بالكامل — وافق وأرسل اتفاق النسبة الفاخر — أو ارفض مع السبب. لا يظهر مدرب في «مدربينا» إلا بعد التوقيع"
      icon={GraduationCap}
      themeKey="trainers"
      count={total}
      actions={
        <Button onClick={load} variant="ghost" size="sm" className="border border-white/20 bg-white/5 text-white/85 hover:bg-white/15 hover:text-white">
          <RefreshCw className={cn('ml-1 h-3.5 w-3.5', loading && 'animate-spin')} /> تحديث
        </Button>
      }
      toolbar={
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <LuxSearch value={query} onChange={setQuery} placeholder="ابحث بالاسم أو البريد أو التخصص أو البلد..." className="min-w-[220px] flex-1" />
            {lastSync && (
              <span className="hidden items-center gap-1 text-[10px] text-white/45 sm:flex">
                <Clock className="h-3 w-3" /> آخر مزامنة {lastSync.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {FILTERS.map((f) => {
              const n = f.key === 'all' ? total
                : f.key === 'pending' ? apps.length
                : f.key === 'awaiting' ? pureAwaiting.length
                : f.key === 'declined' ? declinedCount
                : rejected.length
              return (
                <button key={f.key} onClick={() => setFilter(f.key)}
                  className={cn('rounded-full border px-3 py-1 text-[11px] font-bold transition-all active:scale-95',
                    filter === f.key
                      ? 'border-gold bg-gradient-to-l from-gold to-amber-500 text-navy shadow-[0_2px_12px_rgba(212,175,55,0.4)]'
                      : 'border-white/15 bg-white/5 text-white/60 hover:border-gold/40 hover:text-white')}>
                  {f.label} {n > 0 && <span className={cn('mr-1 rounded-full px-1.5 text-[9px]', filter === f.key ? 'bg-navy/20' : 'bg-white/10')}>{n}</span>}
                </button>
              )
            })}
          </div>
        </div>
      }
      stats={
        <LuxStats items={[
          { icon: Hourglass, label: 'بانتظار الموافقة', value: apps.length, grad: 'from-amber-400 to-orange-600' },
          { icon: ScrollText, label: 'بانتظار توقيع المدرب', value: pureAwaiting.length, grad: 'from-emerald-400 to-teal-600' },
          { icon: Scale, label: 'رفض النسبة — تفاوض', value: declinedCount, grad: 'from-rose-400 to-red-600' },
          { icon: Ban, label: 'طلبات مرفوضة', value: rejected.length, grad: 'from-slate-500 to-slate-700' },
        ]} />
      }
    >
      {loading ? (
        <div className="flex flex-col items-center gap-3 py-14">
          <Loader2 className="h-10 w-10 animate-spin text-gold" />
          <p className="text-xs font-bold text-muted-foreground">تُفتح أرشيفات القصر الملكية...</p>
        </div>
      ) : nothingAtAll && filter === 'all' ? (
        <LuxEmpty
          icon={Crown}
          title="القصر هادئ — لا طلبات في الأفق"
          hint="عندما يسجّل مدرب من بوابة /register سيصل ملفه الكامل هنا بمؤهلاته وإنجازاته بانتظار حكمكم الملكي"
        />
      ) : (
        <div className="space-y-6">
          {/* === بانتظار الموافقة === */}
          {showPending && (
            <RoyalGroup
              title={`طلبات جديدة بانتظار موافقتكم (${pendingList.length})`}
              icon={Hourglass}
              accent="amber"
              empty={pendingList.length === 0}
              emptyText={filter === 'all' ? 'لا طلبات جديدة — القصر هادئ 👑' : 'لا نتائج مطابقة في هذا القسم'}
            >
              {pendingList.map((a) => (
                <ApplicationCard key={a.id} a={a} onDetail={() => setDetail(a)} onApprove={() => setApproveFor(a)} onReject={() => setRejectFor(a)} mode="pending" />
              ))}
            </RoyalGroup>
          )}

          {/* === بانتظار توقيع المدرب === */}
          {showAwaiting && (
            <RoyalGroup
              title={`اتفاقات معروضة بانتظار توقيع المدرب (${awaitingList.length})`}
              icon={ScrollText}
              accent="emerald"
              empty={awaitingList.length === 0}
              emptyText={filter === 'declined' ? 'لا تفاوضات معلقة — كل النسب حُسمت 👑' : 'لا اتفاقات معلقة — كلها موقّعة أو لم تُعرض بعد'}
            >
              {awaitingList.map((a) => {
                const declined = a.agreement?.trainer_response === 'declined'
                return (
                  <ApplicationCard
                    key={a.id} a={a}
                    onDetail={() => setDetail(a)}
                    onApprove={() => setApproveFor(a)}
                    mode={declined ? 'declined' : 'awaiting'}
                    note={declined ? `المدرب رفض عرض ${a.agreement?.percentage}%${a.agreement?.response_note ? ' — ملاحظته: ' + a.agreement.response_note : ''} — يمكنك تقديم عرض محدّث` : undefined}
                  />
                )
              })}
            </RoyalGroup>
          )}

          {/* === المرفوضة حديثاً === */}
          {showRejected && rejectedList.length > 0 && (
            <RoyalGroup
              title={`طلبات مرفوضة (${rejectedList.length})`}
              icon={XCircle}
              accent="slate"
              empty={false}
              emptyText=""
            >
              {rejectedList.map((a) => (
                <ApplicationCard key={a.id} a={a} onDetail={() => setDetail(a)} mode="rejected" note={a.rejected_reason || undefined} />
              ))}
            </RoyalGroup>
          )}
        </div>
      )}

      {/* حوار الملف الكامل */}
      <LuxDialog
        open={!!detail} onOpenChange={(o) => !o && setDetail(null)}
        title={`الملف الملكي — ${detail?.name || ''}`} subtitle={detail ? `${detail.title || ''}${detail.specialization ? ' • ' + detail.specialization : ''}` : ''}
        icon={Crown} maxWidth="sm:max-w-2xl"
      >
        {detail && <FullProfile a={detail} />}
      </LuxDialog>

      {/* حوار الموافقة + عرض الاتفاق */}
      <ApproveDialog
        app={approveFor} busy={busy}
        onClose={() => setApproveFor(null)}
        onSubmit={(percentage, terms) => decide({ id: approveFor?.id, action: approveFor?.status === 'agreement_pending' ? 'reoffer' : 'approve', percentage, terms })}
      />

      {/* حوار الرفض */}
      <LuxDialog
        open={!!rejectFor} onOpenChange={(o) => !o && setRejectFor(null)}
        title={`رفض طلب — ${rejectFor?.name || ''}`} subtitle="سيصل المدرب إشعار رسمي بالسبب — اكتبه باحترام ووضوح"
        icon={XCircle}
        footer={
          <RejectFooter busy={busy} onCancel={() => setRejectFor(null)} onSubmit={(reason) => decide({ id: rejectFor?.id, action: 'reject', reason })} />
        }
      >
        <RejectBody name={rejectFor?.name} />
      </LuxDialog>
    </LuxSection>
  )
}

/* ================= مجموعة ملكية بقسم ملوّن ================= */
function RoyalGroup({ title, icon: Icon, children, empty, emptyText, accent }: {
  title: string
  icon: any
  children: React.ReactNode
  empty: boolean
  emptyText: string
  accent: 'amber' | 'emerald' | 'slate'
}) {
  const accentCls = accent === 'amber'
    ? 'from-amber-400 to-orange-500'
    : accent === 'emerald'
      ? 'from-emerald-400 to-teal-500'
      : 'from-slate-400 to-slate-600'
  return (
    <div>
      <div className="mb-3 flex items-center gap-2.5">
        <span className={cn('flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md', accentCls)}>
          <Icon className="h-4 w-4" />
        </span>
        <p className="text-sm font-extrabold text-navy">{title}</p>
        <span className={cn('hidden h-px flex-1 bg-gradient-to-l sm:block', accent === 'amber' ? 'from-transparent via-amber-300 to-transparent' : accent === 'emerald' ? 'from-transparent via-emerald-300 to-transparent' : 'from-transparent via-slate-300 to-transparent')} />
      </div>
      {empty ? (
        <Card className="border-dashed border-gold/25 bg-gold/[0.02] p-6 text-center text-sm text-muted-foreground">{emptyText}</Card>
      ) : <div className="space-y-3">{children}</div>}
    </div>
  )
}

/* ================= بطاقة الطلب الملكية ================= */

function ApplicationCard({ a, onDetail, onApprove, onReject, mode, note }: {
  a: App
  onDetail: () => void
  onApprove?: () => void
  onReject?: () => void
  mode: 'pending' | 'awaiting' | 'declined' | 'rejected'
  note?: string
}) {
  const [open, setOpen] = useState(false)

  const nQual = (a.qualifications || []).length
  const nAchv = (a.achievements || []).length
  const nExp = (a.experiences || []).length

  const statusBadge =
    mode === 'pending' ? <Badge className="border-amber-400/40 bg-amber-400/10 text-amber-700"><Hourglass className="ml-1 h-3 w-3" /> بانتظار الموافقة</Badge>
    : mode === 'awaiting' ? <Badge className="border-emerald-400/40 bg-emerald-400/10 text-emerald-700"><ScrollText className="ml-1 h-3 w-3" /> بانتظار توقيعه</Badge>
    : mode === 'declined' ? <Badge className="border-red-400/40 bg-red-400/10 text-red-700"><Scale className="ml-1 h-3 w-3" /> رفض العرض — يحتاج تعديلاً</Badge>
    : <Badge variant="outline" className="border-red-300 text-red-500">مرفوض</Badge>

  const ribbonCls =
    mode === 'pending' ? 'bg-gradient-to-l from-amber-400 to-orange-500'
    : mode === 'awaiting' ? 'bg-gradient-to-l from-emerald-400 to-teal-500'
    : mode === 'declined' ? 'bg-gradient-to-l from-rose-400 to-red-500'
    : 'bg-gradient-to-l from-slate-300 to-slate-400'

  return (
    <Card className={cn('group relative overflow-hidden p-0 transition-all duration-300 hover:shadow-[0_14px_40px_-12px_rgba(11,22,53,0.28)]',
      mode === 'declined' ? 'border-red-300/50' : 'border-gold/20 hover:border-gold/45')}>
      {/* شريط الحالة العلوي */}
      <div className={cn('h-1 w-full', ribbonCls)} />

      <div className="flex flex-wrap items-center gap-3 p-4">
        {/* الصورة بحلقة ذهبية + نقطة حالة */}
        <div className="relative shrink-0">
          {a.avatar ? (
            <img src={a.avatar} alt={a.name} className="h-14 w-14 rounded-full border-[3px] border-gold/50 object-cover shadow-[0_4px_14px_rgba(212,175,55,0.25)]" />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full border-[3px] border-gold/50 bg-gradient-to-br from-navy to-navy-light text-lg font-bold text-gold shadow-[0_4px_14px_rgba(212,175,55,0.25)]">{a.name?.charAt(0)}</div>
          )}
          <span className={cn('absolute -bottom-0.5 -left-0.5 h-4 w-4 rounded-full border-2 border-white',
            mode === 'pending' ? 'bg-amber-400' : mode === 'awaiting' ? 'bg-emerald-400' : mode === 'declined' ? 'bg-red-400' : 'bg-slate-300')} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-extrabold text-navy">{a.name}</p>
            {statusBadge}
            {a.created_at && (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <CalendarClock className="h-3 w-3" /> {timeAgo(a.created_at)}
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {a.title || '—'} {a.specialization ? `• ${a.specialization}` : ''} {a.country ? `• ${a.country}` : ''}
            {typeof a.years_experience === 'number' && a.years_experience > 0 ? ` • ${a.years_experience}+ سنوات` : ''}
          </p>
          {/* عدادات الملف الملكي */}
          {(nQual > 0 || nAchv > 0 || nExp > 0) && (
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {nQual > 0 && <Chip icon={Award} tone="gold">{nQual} مؤهل</Chip>}
              {nAchv > 0 && <Chip icon={Trophy} tone="gold">{nAchv} إنجاز</Chip>}
              {nExp > 0 && <Chip icon={Star} tone="gold">{nExp} خبرة</Chip>}
            </div>
          )}
          {note && <p className="mt-1.5 rounded-lg border border-red-100 bg-red-50 px-2.5 py-1.5 text-[11px] leading-relaxed text-red-700">{note}</p>}
        </div>

        {/* لوحة النسبة الذهبية للعروض القائمة */}
        {mode === 'awaiting' && a.agreement?.percentage !== undefined && (
          <div className="relative hidden overflow-hidden rounded-2xl border border-gold/35 bg-gradient-to-br from-gold/15 via-gold/5 to-transparent px-4 py-2 text-center sm:block">
            <div className="absolute inset-0 opacity-15" style={{ backgroundImage: 'radial-gradient(circle at 30% 30%, #D4AF37 1px, transparent 1px)', backgroundSize: '9px 9px' }} />
            <p className="relative text-xl font-black leading-none text-gold" dir="ltr">{a.agreement.percentage}%</p>
            <p className="relative mt-0.5 text-[9px] font-bold text-navy/60">نسبة معروضة</p>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button onClick={onDetail} variant="outline" size="sm" className="border-navy/20 text-xs font-bold text-navy hover:bg-navy/5">
            <Eye className="ml-1 h-3.5 w-3.5" /> الملف الكامل
          </Button>
          {(mode === 'pending' || mode === 'declined') && (
            <Button onClick={onApprove} size="sm" className="relative overflow-hidden bg-gradient-to-l from-gold to-amber-500 text-xs font-extrabold text-navy shadow-[0_4px_16px_rgba(212,175,55,0.35)] active:scale-95">
              <span className="absolute inset-0 lux-shimmer" />
              <Crown className="ml-1 h-3.5 w-3.5" /> {mode === 'declined' ? 'عرض محدّث' : 'موافقة + اتفاق'}
            </Button>
          )}
          {mode === 'pending' && onReject && (
            <Button onClick={onReject} size="sm" variant="outline" className="border-red-300 text-xs font-bold text-red-600 hover:bg-red-50 active:scale-95">
              <XCircle className="ml-1 h-3.5 w-3.5" /> رفض
            </Button>
          )}
        </div>
      </div>

      {/* ملخص سريع قابل للفتح */}
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-center gap-1 border-t border-gold/10 bg-gold/[0.04] py-1.5 text-[10px] font-bold text-muted-foreground transition-all hover:bg-gold/10">
        {open ? <><ChevronUp className="h-3 w-3" /> إخفاء الملخص</> : <><ChevronDown className="h-3 w-3" /> نظرة سريعة على المؤهلات والإنجازات</>}
      </button>
      {open && (
        <div className="space-y-2 border-t border-gold/10 bg-gold/[0.03] p-4 text-xs">
          <QuickChips icon={Award} label="المؤهلات" items={(a.qualifications || []).map((q: any) => typeof q === 'string' ? q : q?.title).filter(Boolean)} />
          <QuickChips icon={Trophy} label="الإنجازات" items={(a.achievements || []).map((x: any) => typeof x === 'string' ? x : x?.title).filter(Boolean)} />
          <QuickChips icon={Star} label="الخبرات" items={(a.experiences || []).map((x: any) => typeof x === 'string' ? x : x?.position || x?.organization).filter(Boolean)} />
          {a.bio && <p className="line-clamp-2 rounded-lg bg-white/60 p-2 leading-relaxed text-muted-foreground">{a.bio}</p>}
        </div>
      )}
    </Card>
  )
}

function Chip({ icon: Icon, children, tone }: { icon: any; children: React.ReactNode; tone?: string }) {
  return (
    <span className="flex items-center gap-1 rounded-full border border-gold/30 bg-gradient-to-l from-gold/10 to-transparent px-2 py-0.5 text-[10px] font-bold text-navy/75">
      <Icon className="h-3 w-3 text-gold" /> {children}
    </span>
  )
}

function QuickChips({ icon: Icon, label, items }: any) {
  if (!items?.length) return null
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="flex items-center gap-1 text-[10px] font-bold text-navy/60"><Icon className="h-3.5 w-3.5 text-gold" /> {label}:</span>
      {items.slice(0, 6).map((it: string, i: number) => (
        <span key={i} className="rounded-full border border-gold/25 bg-white px-2 py-0.5 text-[10px] text-navy">{it}</span>
      ))}
    </div>
  )
}

/* ================= الملف الكامل ================= */
function FullProfile({ a }: { a: App }) {
  return (
    <div className="space-y-4">
      {/* الهوية */}
      <div className="relative flex flex-wrap items-center gap-4 overflow-hidden rounded-2xl border border-gold/25 bg-gradient-to-l from-gold/10 to-transparent p-4">
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'radial-gradient(circle at 85% 30%, #D4AF37 1.2px, transparent 1.2px)', backgroundSize: '14px 14px' }} />
        {a.avatar ? (
          <img src={a.avatar} alt={a.name} className="relative h-20 w-20 rounded-full border-4 border-gold/40 object-cover shadow-lg" />
        ) : (
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full border-4 border-gold/40 bg-gradient-to-br from-navy to-navy-light text-2xl font-bold text-gold">{a.name?.charAt(0)}</div>
        )}
        <div className="relative flex-1 space-y-1 text-sm">
          <p className="text-lg font-extrabold text-navy">{a.name}</p>
          <p className="text-xs text-muted-foreground"><ShieldCheck className="ml-1 inline h-3.5 w-3.5 text-gold" /> {a.title || '—'} • {a.specialization || '—'}</p>
          <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
            <span><Mail className="ml-1 inline h-3 w-3" />{a.email}</span>
            {a.phone && <span><Phone className="ml-1 inline h-3 w-3" />{a.phone}</span>}
            {a.country && <span><Globe2 className="ml-1 inline h-3 w-3" />{a.country}</span>}
            {typeof a.years_experience === 'number' && a.years_experience > 0 && <span>⏳ {a.years_experience}+ سنوات خبرة</span>}
          </div>
        </div>
        {/* عدادات الملف */}
        <div className="relative flex gap-2">
          <MiniStat value={(a.qualifications || []).length} label="مؤهل" icon={Award} />
          <MiniStat value={(a.achievements || []).length} label="إنجاز" icon={Trophy} />
          <MiniStat value={(a.experiences || []).length} label="خبرة" icon={Star} />
        </div>
      </div>

      {/* النبذة */}
      {a.bio && (
        <div className="rounded-2xl border border-gold/20 p-4">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-navy"><FileText className="h-4 w-4 text-gold" /> النبذة المهنية</p>
          <p className="whitespace-pre-line text-xs leading-relaxed text-muted-foreground">{a.bio}</p>
        </div>
      )}

      <ListBlock icon={Award} title="المؤهلات العلمية" items={a.qualifications || []} render={(q: any) => typeof q === 'string' ? q : `${q?.title || '—'}${q?.institution ? ' — ' + q.institution : ''}${q?.year ? ` (${q.year})` : ''}`} empty="لم تُضف مؤهلات" />
      <ListBlock icon={Trophy} title="الإنجازات والجوائز" items={a.achievements || []} render={(x: any) => typeof x === 'string' ? x : `${x?.title || '—'}${x?.description ? ' — ' + x.description : ''}${x?.year ? ` (${x.year})` : ''}`} empty="لم تُضف إنجازات" />
      <ListBlock icon={Star} title="الخبرات العملية" items={a.experiences || []} render={(x: any) => typeof x === 'string' ? x : `${x?.position || '—'}${x?.organization ? ' في ' + x.organization : ''}${x?.period ? ` (${x.period})` : ''}${x?.description ? ' — ' + x.description : ''}`} empty="لم تُضف خبرات" />

      {/* سجل الاتفاق */}
      {a.agreement?.history?.length > 0 && (
        <div className="rounded-2xl border border-gold/25 bg-gradient-to-l from-gold/5 to-transparent p-4">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-navy"><ScrollText className="h-4 w-4 text-gold" /> سجل الاتفاق الملكي</p>
          <div className="space-y-1.5">
            {a.agreement.history.map((h: any, i: number) => (
              <div key={i} className="flex items-center justify-between gap-2 rounded-lg bg-white/60 px-3 py-1.5 text-[11px]">
                <span className="font-bold text-navy">
                  {h.action === 'offered' ? '📜 عرض أول' : h.action === 'revised' ? '🔄 عرض محدّث' : h.action === 'accepted' ? '✅ قبول المدرب' : '⚖️ رفض المدرب'}
                  {h.percentage !== undefined ? ` — ${h.percentage}%` : ''}
                </span>
                <span className="text-muted-foreground">{h.byName || ''} • {h.at ? new Date(h.at).toLocaleDateString('ar-EG') : ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {a.rejected_reason && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <p className="mb-1 text-xs font-bold text-red-700">سبب الرفض:</p>
          <p className="text-xs text-red-600">{a.rejected_reason}</p>
        </div>
      )}

      <p className="flex items-center gap-1 text-center text-[10px] text-muted-foreground"><Clock className="h-3 w-3" /> أُرسل الطلب: {a.created_at ? new Date(a.created_at).toLocaleString('ar-EG') : '—'}</p>
    </div>
  )
}

function MiniStat({ value, label, icon: Icon }: { value: number; label: string; icon: any }) {
  return (
    <div className="flex min-w-[54px] flex-col items-center rounded-xl border border-gold/30 bg-white/70 px-2.5 py-1.5">
      <Icon className="mb-0.5 h-3.5 w-3.5 text-gold" />
      <span className="text-sm font-black text-navy tabular-nums">{value}</span>
      <span className="text-[8px] font-bold text-muted-foreground">{label}</span>
    </div>
  )
}

function ListBlock({ icon: Icon, title, items, render, empty }: any) {
  return (
    <div className="rounded-2xl border border-gold/20 p-4">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-navy"><Icon className="h-4 w-4 text-gold" /> {title}</p>
      {(!items || items.length === 0) ? (
        <p className="text-[11px] text-muted-foreground">{empty}</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((it: any, i: number) => (
            <li key={i} className="flex items-start gap-2 rounded-lg bg-white/60 px-3 py-2 text-xs leading-relaxed text-navy">
              <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-gold" /> {render(it)}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/* ================= حوار الموافقة + عرض الاتفاق ================= */
function ApproveDialog({ app, busy, onClose, onSubmit }: {
  app: App | null
  busy: boolean
  onClose: () => void
  onSubmit: (percentage: number, terms: string) => void
}) {
  const isReoffer = app?.status === 'agreement_pending'
  const [percentage, setPercentage] = useState(30)
  const [terms, setTerms] = useState('')

  useEffect(() => {
    if (app) {
      setPercentage(Number(app.agreement?.percentage ?? app.profit_percentage ?? 30) || 30)
      setTerms(String(app.agreement?.terms || ''))
    }
  }, [app])

  if (!app) return null
  const presets = [10, 15, 20, 25, 30, 40, 50, 60]

  return (
    <LuxDialog
      open={!!app} onOpenChange={(o) => !o && onClose()}
      title={isReoffer ? `عرض محدّث — ${app.name}` : `موافقة ملكية — ${app.name}`}
      subtitle={isReoffer ? 'عدّل النسبة والشروط ثم أرسل العرض الجديد للتوقيع' : 'وافق على المدرب وحدّد نسبة أرباحه — ستصله بطاقة اتفاق فاخرة للتوقيع'}
      icon={Crown}
      footer={
        <div className="flex w-full gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl border-navy/20 font-bold text-navy hover:bg-navy/5">تراجع</Button>
          <Button
            onClick={() => onSubmit(percentage, terms)} disabled={busy}
            className="relative flex-[2] overflow-hidden rounded-xl bg-gradient-to-l from-gold to-amber-500 font-extrabold text-navy shadow-lg active:scale-[0.98] disabled:opacity-60"
          >
            <span className="absolute inset-0 lux-shimmer" />
            {busy ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Crown className="ml-2 h-4 w-4" />}
            {isReoffer ? 'أرسل العرض المحدّث' : `وافق وأرسل اتفاق ${percentage}%`}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <LuxField label="نسبة أرباح المدرب من كل دورة" icon={Percent} required hint="تُحتسب تلقائياً من كل دفعة معتمدة لدوراته — وتصل خزينته فوراً">
          <div className="flex items-center gap-2">
            <Input value={percentage} onChange={(e) => setPercentage(Math.max(0, Math.min(90, Number(e.target.value.replace(/\D/g, '')) || 0)))} className={`${luxInput} w-24 text-center text-xl font-black`} dir="ltr" />
            <span className="text-lg font-black text-gold">%</span>
            <div className="flex flex-1 flex-wrap gap-1">
              {presets.map((p) => (
                <button key={p} onClick={() => setPercentage(p)} className={`rounded-lg border px-2 py-1 text-[10px] font-bold transition-all ${percentage === p ? 'border-gold bg-gold text-navy' : 'border-gold/30 bg-white text-navy/70 hover:bg-gold/10'}`} dir="ltr">{p}%</button>
              ))}
            </div>
          </div>
        </LuxField>
        <LuxField label="بنود الاتفاق الملكي (اختياري)" icon={ScrollText} hint="تظهر في بطاقة الاتفاق عند المدرب — مثل: مدة السداد، شروط الترجمة، الحد الأدنى للسحب...">
          <Textarea value={terms} onChange={(e) => setTerms(e.target.value)} rows={4} placeholder={'مثال:\n• تُصرف الأرباح أسبوعياً عبر الطريقة المتفق عليها\n• الحد الأدنى للسحب 5,000 ر.ي\n• يلتزم المدرب بجودة المحتوى وسياسات الأكاديمية'} className={luxInput} />
        </LuxField>
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-[11px] leading-relaxed text-emerald-800">
          <CheckCircle2 className="ml-1 inline h-3.5 w-3.5" /> بعد الإرسال: يصل المدرب إشعار فوري (جرس + إشعار منبثق حتى لو التطبيق مغلق) — يقبل فيُعتمد ملكياً ويظهر في «مدربينا»، أو يرفض فيعود إليك بملاحظته لإعادة التفاوض. ولن يستطيع إنشاء الدورات إلا بعد توقيعه.
        </p>
      </div>
    </LuxDialog>
  )
}

/* ================= حوار الرفض ================= */
function RejectBody({ name }: { name?: string }) {
  return (
    <div className="space-y-3">
      <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
        ⚠️ الرفض نهائي لهذا الطلب — سيصل {name || 'المدرب'} إشعار رسمي بالسبب ولا يظهر في «مدربينا». يمكنك لاحقاً طلب منه إعادة التقديم بملف أقوى.
      </p>
    </div>
  )
}

function RejectFooter({ busy, onCancel, onSubmit }: { busy: boolean; onCancel: () => void; onSubmit: (reason: string) => void }) {
  const [reason, setReason] = useState('')
  return (
    <div className="w-full space-y-3">
      <LuxField label="سبب الرفض" icon={PenLine} required>
        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="مثال: نحتاج مزيداً من المؤهلات المعتمدة أو خبرة تدريس موثقة — نرحب بإعادة التقديم مستقبلاً" className={luxInput} />
      </LuxField>
      <div className="flex gap-2">
        <Button variant="outline" onClick={onCancel} className="flex-1 rounded-xl border-navy/20 font-bold text-navy hover:bg-navy/5">تراجع</Button>
        <Button
          onClick={() => onSubmit(reason)} disabled={busy || reason.trim().length < 5}
          className="flex-1 rounded-xl bg-gradient-to-l from-red-500 to-red-600 font-extrabold text-white shadow-lg active:scale-[0.98] disabled:opacity-50"
        >
          {busy ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <XCircle className="ml-2 h-4 w-4" />} رفض الطلب نهائياً
        </Button>
      </div>
    </div>
  )
}
