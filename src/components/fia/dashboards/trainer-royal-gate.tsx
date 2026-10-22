'use client'

// 👑👑👑 بوابة الحالة الملكية للمدرب — بانتظار المراجعة / بطاقة الاتفاق / الرفض 👑👑👑

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth-store'
import {
  Crown, Hourglass, FileX2, ScrollText, BadgeCheck, PartyPopper, Loader2,
  Percent, ShieldCheck, XCircle, CheckCircle2, Landmark, Sparkles,
} from 'lucide-react'

export type TrainerStatus = 'pending' | 'agreement_pending' | 'approved' | 'rejected'

interface GateProps {
  status: TrainerStatus
  name: string
  agreement: any | null
  rejectedReason?: string | null
  specialization?: string | null
  onRefresh: () => void
}

export function TrainerRoyalGate({ status, name, agreement, rejectedReason, specialization, onRefresh }: GateProps) {
  if (status === 'pending') return <PendingScreen />
  if (status === 'agreement_pending') return <AgreementCard name={name} agreement={agreement} specialization={specialization} onRefresh={onRefresh} />
  if (status === 'rejected') return <RejectedScreen reason={rejectedReason} />
  return null
}

/* ================= بانتظار المراجعة الملكية ================= */
function PendingScreen() {
  return (
    <div className="fia-lux-fadeup relative overflow-hidden rounded-3xl border border-[#C9A961]/35 bg-gradient-to-br from-[#0A1F44] via-[#12294f] to-[#0A1F44] p-8 text-center shadow-2xl">
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 15% 30%, #D4AF37 1.5px, transparent 1.5px), radial-gradient(circle at 85% 70%, white 1px, transparent 1px)', backgroundSize: '26px 26px, 20px 20px' }} />
      <div className="absolute -top-10 -left-10 h-40 w-40 rounded-full bg-[#C9A961]/20 blur-3xl" />
      <div className="relative">
        <div className="mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-full border-2 border-[#C9A961]/50 bg-gradient-to-br from-[#C9A961]/20 to-transparent shadow-[0_0_50px_rgba(201,169,97,0.3)]">
          <Hourglass className="h-11 w-11 animate-pulse text-[#E5C77E]" />
        </div>
        <h2 className="mb-2 text-2xl font-extrabold text-white">
          ملفك قيد <span className="bg-gradient-to-l from-[#C9A961] to-[#E5C77E] bg-clip-text text-transparent">المراجعة الملكية</span>
        </h2>
        <p className="mx-auto mb-7 max-w-md text-sm leading-relaxed text-white/65">
          طلب انضمامك إلى نخبة المدربين وصل قصر الإدارة وتُفحص مؤهلاتك وإنجازاتك بعناية وسرية تامة.
          فور الموافقة ستصلك بطاقة الاتفاق الفاخرة بنسبة أرباحك — عبر الجرس وإشعار فوري حتى لو كان التطبيق مغلقاً.
        </p>
        <div className="mx-auto grid max-w-xl gap-3 sm:grid-cols-3">
          {[
            { icon: ShieldCheck, t: 'فحص دقيق', d: 'مؤهلاتك وإنجازاتك وخبراتك' },
            { icon: ScrollText, t: 'اتفاق ملكي', d: 'نسبة أرباحك تصلك للتوقيع' },
            { icon: BadgeCheck, t: 'اعتماد رسمي', d: 'اسمك يظهر في «مدربينا»' },
          ].map((c) => (
            <div key={c.t} className="rounded-2xl border border-[#C9A961]/25 bg-white/[0.05] p-4">
              <c.icon className="mx-auto mb-2 h-6 w-6 text-[#E5C77E]" />
              <p className="text-xs font-bold text-white">{c.t}</p>
              <p className="mt-1 text-[10px] leading-relaxed text-white/55">{c.d}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ================= الرفض الملكي ================= */
function RejectedScreen({ reason }: { reason?: string | null }) {
  return (
    <div className="fia-lux-fadeup relative overflow-hidden rounded-3xl border border-red-500/30 bg-gradient-to-br from-[#2a0d0d] via-[#1a0808] to-[#0A1F44] p-8 text-center shadow-2xl">
      <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-red-500/15 blur-3xl" />
      <div className="relative">
        <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full border-2 border-red-400/40 bg-red-500/10">
          <FileX2 className="h-9 w-9 text-red-400" />
        </div>
        <h2 className="mb-2 text-xl font-extrabold text-white">لم تكتمل الموافقة على طلبك هذه المرة</h2>
        <p className="mx-auto mb-4 max-w-md text-sm leading-relaxed text-white/65">
          تحية احترام — قرار الإدارة بناءً على احتياجات الأكاديمية الحالية ولا يعني بالضرورة استحقال انضمامك مستقبلاً.
        </p>
        {reason && (
          <div className="mx-auto mb-5 max-w-md rounded-2xl border border-red-400/25 bg-red-500/10 p-4 text-right">
            <p className="mb-1 text-xs font-bold text-red-300">📝 سبب القرار:</p>
            <p className="text-sm leading-relaxed text-white/80">{reason}</p>
          </div>
        )}
        <p className="text-xs text-white/50">يمكنك التواصل مع الإدارة لأي استفسار — ولا مانع من إعادة التقديم مستقبلاً بملف أقوى 💪</p>
      </div>
    </div>
  )
}

/* ================= بطاقة الاتفاق الفاخرة ================= */
function AgreementCard({ name, agreement, specialization, onRefresh }: { name: string; agreement: any | null; specialization?: string | null; onRefresh: () => void }) {
  const setAuthUser = useAuth((s) => s.user)
  const pct = Number(agreement?.percentage || 0)
  const terms = String(agreement?.terms || '').trim()
  const declined = agreement?.trainer_response === 'declined'
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState<'accept' | 'decline' | null>(null)

  const respond = async (response: 'accepted' | 'declined') => {
    if (response === 'declined' && note.trim().length < 3) { toast.error('اكتب ملاحظتك للإدارة — ماذا تريد تعديله في العرض؟'); return }
    setBusy(response === 'accepted' ? 'accept' : 'decline')
    try {
      const res = await fetch('/api/trainers/agreement', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trainer_id: setAuthUser?.id, response, note: note.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'تعذر تنفيذ العملية'); return }
      if (response === 'accepted') {
        toast.success(data.message || '🏅 تم اعتمادك ملكياً!')
        setTimeout(() => window.location.reload(), 1200)
      } else {
        toast.success(data.message || 'أُرسلت ملاحظتك للإدارة')
        onRefresh()
      }
    } catch { toast.error('تعذر الاتصال — أعد المحاولة') }
    setBusy(null)
  }

  return (
    <div className="fia-lux-fadeup relative overflow-hidden rounded-3xl border border-[#C9A961]/45 bg-gradient-to-br from-[#0A1F44] via-[#132b55] to-[#0A1F44] shadow-[0_24px_90px_rgba(0,0,0,0.5)]">
      {/* شريط ذهبي علوي */}
      <div className="h-1.5 w-full bg-gradient-to-l from-transparent via-[#C9A961] to-transparent" />
      <div className="absolute inset-0 opacity-15" style={{ backgroundImage: 'radial-gradient(circle at 12% 50%, #D4AF37 1.5px, transparent 1.5px), radial-gradient(circle at 88% 20%, white 1px, transparent 1px)', backgroundSize: '24px 24px, 18px 18px' }} />

      <div className="relative p-6 sm:p-8">
        {/* الختم الملكي */}
        <div className="mb-5 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full border-2 border-[#C9A961]/60 bg-gradient-to-br from-[#C9A961]/25 to-transparent shadow-[0_0_60px_rgba(201,169,97,0.4)]">
            {declined ? <Sparkles className="h-9 w-9 text-[#E5C77E]" /> : <ScrollText className="h-9 w-9 text-[#E5C77E]" />}
          </div>
          <p className="mb-1 inline-flex items-center gap-1.5 rounded-full border border-[#C9A961]/40 bg-[#C9A961]/10 px-3 py-1 text-[10px] font-bold text-[#E5C77E]">
            <Crown className="h-3 w-3" /> وثيقة رسمية من قصر الأكاديمية
          </p>
          <h2 className="text-xl font-extrabold text-white sm:text-2xl">
            {declined ? 'عرض جديد في الطريق إليك' : 'اتفاق شراكة الأرباح الملكي'}
          </h2>
          <p className="mt-2 text-sm text-white/60">
            أستاذ <span className="font-bold text-[#E5C77E]">{name}</span>
            {specialization ? <span> — {specialization}</span> : null}
            {declined
              ? <span>، وصلت ملاحظتك للقصر وستصلك نسبة محدّثة فور اعتمادها.</span>
              : <span>، وافقت الإدارة الملكية على انضمامك! تصفح شروط الشراكة ووقّع بحرية.</span>}
          </p>
        </div>

        {/* نسبة الأرباح — البطاقة الذهبية */}
        <div className="relative mx-auto mb-5 max-w-md overflow-hidden rounded-2xl border border-[#C9A961]/50 bg-gradient-to-l from-[#C9A961]/20 via-[#C9A961]/10 to-transparent p-5 text-center">
          <div className="absolute inset-0 lux-shimmer" />
          <div className="relative">
            <p className="mb-1 flex items-center justify-center gap-1.5 text-xs font-bold text-white/70"><Percent className="h-4 w-4 text-[#E5C77E]" /> حصتك من أرباح كل دورة</p>
            <p className="bg-gradient-to-l from-[#C9A961] to-[#E5C77E] bg-clip-text text-6xl font-black text-transparent drop-shadow-[0_2px_18px_rgba(201,169,97,0.4)]" dir="ltr">{pct}%</p>
            <p className="mt-2 text-[11px] leading-relaxed text-white/60">تُحتسب تلقائياً من كل دفعة اشتراك تُعتمد لدوراتك — وتُودع في خزينتك الملكية فوراً</p>
          </div>
        </div>

        {/* الشروط */}
        {terms && (
          <div className="mx-auto mb-5 max-w-md rounded-2xl border border-white/10 bg-white/[0.05] p-4 text-right">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-[#E5C77E]"><Landmark className="h-4 w-4" /> بنود الاتفاق الملكي:</p>
            <p className="whitespace-pre-line text-xs leading-relaxed text-white/75">{terms}</p>
          </div>
        )}

        {/* التاريخ الملكي */}
        {agreement?.offered_at && (
          <p className="mb-5 text-center text-[10px] text-white/40">
            صدر هذا العرض بتاريخ {new Date(agreement.offered_at).toLocaleDateString('ar-EG', { timeZone: 'Asia/Aden' })} — ساري حتى توقيعك أو تقديم عرض محدّث
          </p>
        )}

        {/* القرار الملكي */}
        {!declined && (
          <div className="mx-auto max-w-md space-y-3">
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="ملاحظة اختيارية للإدارة (تُقرأ مع توقيعك — أو اكتب فيها ما تريد تعديله إن كنت سترفض)"
              className="min-h-[70px] rounded-xl border-white/15 bg-white/[0.06] text-sm text-white placeholder:text-white/35 focus-visible:border-[#C9A961]"
              rows={2}
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Button
                onClick={() => respond('accepted')}
                disabled={!!busy}
                className="relative h-12 overflow-hidden rounded-xl bg-gradient-to-l from-[#C9A961] to-[#E5C77E] text-sm font-extrabold text-[#0A1F44] shadow-[0_8px_28px_rgba(201,169,97,0.4)] active:scale-[0.98] disabled:opacity-60"
              >
                {busy === 'accept' ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="ml-2 h-5 w-5" />}
                أوقّع وأقبل الاتفاق 👑
              </Button>
              <Button
                onClick={() => respond('declined')}
                disabled={!!busy}
                variant="outline"
                className="h-12 rounded-xl border border-red-400/35 bg-red-500/10 text-sm font-bold text-red-300 hover:bg-red-500/20 active:scale-[0.98] disabled:opacity-60"
              >
                {busy === 'decline' ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <XCircle className="ml-2 h-5 w-5" />}
                أرفض وأطلب تعديلاً
              </Button>
            </div>
            <p className="flex items-center justify-center gap-1.5 text-center text-[10px] text-white/45">
              <PartyPopper className="h-3.5 w-3.5 text-[#C9A961]" />
              عند التوقيع: تُعتمد رسمياً في اللحظة — يظهر اسمك في «مدربينا» وتُفتح خزينتك وحسابات السحب
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
