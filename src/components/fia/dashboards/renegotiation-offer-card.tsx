'use client'

// ============================================================================
// RENEGOTIATION OFFER CARD — «بطاقة اتفاق تعديل عقد الشراكة»
// 🛡️ v6.9.3 — القلب من علاج «الطلب يُرسل ولا يظهر للمدرب»: بطاقة ذهبية
// فاخرة مشتركة تظهر للمدرب في «نظرة عامة» (صفحة الهبوط) وفي «أرباحي» معاً،
// تحمل النسبة الحالية → المقترحة + سبب الإدارة + قراراً بلمسة واحدة
// (موافقة فورية / رفض بخطوتين مع ملاحظة اختيارية للإدارة).
// تبقى النسبة السارية مفعّلة حتى الرد — والقبول يقفل العقد الجديد من الطرفين.
// ============================================================================
import { useState } from 'react'
import { BadgePercent, CheckCircle2, XCircle, Loader2, FileText, ScrollText } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  /** كائن الاتفاق الكامل من صف المدرب (agreement) — يُقرأ منه renegotiation */
  agreement: any | null | undefined
  /** النسبة السارية حالياً (من profit_percentage أو agreement.percentage) */
  currentPercentage: number
  /** معرّف المدرب الموقّع (معرّف الجلسة) */
  trainerId: string
  /** يُستدعى بعد كل رد ناجح لتحديث الحالة من الخادم */
  onResponded?: () => void | Promise<void>
}

export function RenegotiationOfferCard({ agreement, currentPercentage, trainerId, onResponded }: Props) {
  const reneg: any = agreement?.renegotiation
  const pending = !!reneg && reneg.trainer_response === 'pending'
  const [busy, setBusy] = useState(false)
  const [declineOpen, setDeclineOpen] = useState(false)
  const [declineNote, setDeclineNote] = useState('')

  if (!pending) return null

  const newPct = Number(reneg.percentage) || 0
  const oldPct = Number(currentPercentage) || 0

  const respond = async (response: 'accepted' | 'declined') => {
    if (!trainerId || busy) return
    if (response === 'declined' && !declineOpen) { setDeclineOpen(true); return }
    setBusy(true)
    try {
      const res = await fetch('/api/trainers/agreement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trainer_id: trainerId, response, note: response === 'declined' ? declineNote.trim() || undefined : undefined }),
      })
      const d = await res.json().catch(() => ({}))
      if (res.ok && d.success) {
        toast.success(d.message || 'تم تسجيل ردّك')
        setDeclineNote(''); setDeclineOpen(false)
        await onResponded?.()
      } else {
        toast.error(d.error || 'تعذر تسجيل الرد')
      }
    } catch { toast.error('خطأ في الاتصال') } finally { setBusy(false) }
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-gold/50 bg-gradient-to-l from-amber-50 via-white to-gold/[0.06] p-5 shadow-lg">
      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 15% 50%, #D4AF37 1.5px, transparent 1.5px)', backgroundSize: '16px 16px' }} />
      <div className="relative space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold to-amber-500 flex items-center justify-center flex-shrink-0 shadow">
            <BadgePercent className="w-5 h-5 text-navy" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-extrabold text-navy flex items-center gap-1.5">
              <ScrollText className="w-4 h-4 text-gold flex-shrink-0" />
              📜 عرض تعديل عقد الشراكة بانتظار موافقتك
            </p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              الإدارة تقترح تعديل حصتك من <b className="text-navy" dir="ltr">{oldPct}%</b> إلى <b className="text-emerald-700" dir="ltr">{newPct}%</b> من كل دورة.
              نسبتك السارية تبقى مفعّلة حتى ترد — وبعد موافقتك يُقفل العقد الجديد من الطرفين.
            </p>
          </div>
        </div>
        {reneg.note && (
          <div className="rounded-xl border border-gold/35 bg-gradient-to-l from-gold/[0.12] to-amber-50 p-3 space-y-1.5">
            <p className="text-[11px] font-extrabold text-navy flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-gold flex-shrink-0" /> سبب طلب التعديل من الإدارة:
            </p>
            <p className="text-xs leading-relaxed text-navy/85 pr-5">{String(reneg.note)}</p>
          </div>
        )}
        {declineOpen && (
          <div className="rounded-xl border border-navy/20 bg-white/80 p-3 space-y-2">
            <p className="text-[11px] font-extrabold text-navy">ملاحظتك للإدارة مع الرفض (اختيارية — تُشرح سبب رفضك):</p>
            <textarea
              value={declineNote}
              onChange={(e) => setDeclineNote(e.target.value)}
              maxLength={400}
              rows={2}
              placeholder="اكتب ملاحظتك هنا إن رغبت..."
              className="w-full rounded-lg border border-navy/15 bg-white px-3 py-2 text-xs text-navy placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-gold/40 resize-none"
            />
          </div>
        )}
        <div className="flex flex-col sm:flex-row gap-2">
          <button type="button" disabled={busy} onClick={() => respond('accepted')}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-l from-gold to-amber-500 text-navy text-xs font-extrabold shadow hover:brightness-110 transition-all disabled:opacity-60 flex items-center justify-center gap-1.5">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            أوافق — أقفل الاتفاق بالنسبة الجديدة {newPct}%
          </button>
          {declineOpen ? (
            <button type="button" disabled={busy} onClick={() => respond('declined')}
              className="sm:w-44 py-2.5 rounded-xl border-2 border-red-300 bg-red-50 text-red-700 text-xs font-extrabold hover:bg-red-100 transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5">
              <XCircle className="w-4 h-4" /> تأكيد الرفض نهائياً
            </button>
          ) : (
            <button type="button" disabled={busy} onClick={() => respond('declined')}
              className="sm:w-44 py-2.5 rounded-xl border border-navy/25 bg-white text-navy text-xs font-extrabold hover:bg-navy/5 transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5">
              <XCircle className="w-4 h-4" /> أرفض — تبقى نسبيتي الحالية
            </button>
          )}
        </div>
        {declineOpen && (
          <button type="button" onClick={() => { setDeclineOpen(false); setDeclineNote('') }}
            className="text-[11px] text-muted-foreground hover:text-navy underline underline-offset-2">
            تراجع — أريد مراجعة العرض مرة أخرى
          </button>
        )}
      </div>
    </div>
  )
}
