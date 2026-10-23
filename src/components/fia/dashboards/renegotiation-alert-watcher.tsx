'use client'

// ============================================================================
// RENEGOTIATION ALERT WATCHER — «المنبّث الذهبي الملكي» 🔔👑
// 🛡️ v6.9.4 — علاج «لا توجد إشعارات صوتية ومنبثقة عند طلب تعديل النسبة»:
// مكوّن مستقل 100% لا يمس منظومة الإشعارات الثلاثية (Polling+FCM+Web Push)
// ولا sw.js v6 ولا أي إشعار قائم إطلاقاً — نبضة خاصة به كل 20 ثانية على
// مسار /api/trainers/offer-status (وكذلك فور عودة التطبيق للمقدمة وفور
// وصول إشعار النظام الأصلي في APK عبر استماع منفصل لا يعدّل المستمع القائم):
// عند اكتشاف عرض تعديل معلّق جديد → جرس ملكي نحاسي (Web Audio مُركَّب
// محلياً بلا ملفات) + اهتزاز + نافذة منبثقة ذهبية فاخرة تحمل النسبة
// الحالية → المقترحة وسبب الإدارة وأزرار الموافقة/الرفض الفورية
// (نفس API بطاقة الاتفاق) — فلا يمر الطلب على المدرب إلا رنّةً ومنبثقاً.
// ============================================================================

import { useCallback, useEffect, useRef, useState } from 'react'
import { BadgePercent, Bell, CheckCircle2, Crown, Loader2, ScrollText, XCircle, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'

interface Props {
  trainerId: string
  onRefresh?: () => void | Promise<void>
}

interface OfferState {
  offered_at: string
  percentage: number
  current_percentage: number
  note: string | null
  name: string
}

const seenKey = (id: string) => `fia_reneg_seen:${id || 'anon'}`

// ─── الجرس الملكي النحاسي — مُركَّب بـ Web Audio API (بلا أي ملف صوتي) ───
function playRoyalChime() {
  try {
    const AC: any = (window as any).AudioContext || (window as any).webkitAudioContext
    if (!AC) return
    const schedule = (ctx: any) => {
      try {
        const t0 = ctx.currentTime + 0.04
        // أربع نغمات صاعدة على سلّم ماجستير مهيب: E5 → G#5 → B5 → E6
        const notes = [
          { f: 659.25, at: 0.0, g: 0.30 },
          { f: 830.61, at: 0.16, g: 0.30 },
          { f: 987.77, at: 0.32, g: 0.32 },
          { f: 1318.51, at: 0.5, g: 0.34 },
        ]
        for (const n of notes) {
          // الصوت الأساسي + توافقية ثريانغل بأوكتاف أدنى لعمق نحاسي
          const mk = (freq: number, type: OscillatorType, amp: number) => {
            const osc = ctx.createOscillator()
            const gain = ctx.createGain()
            osc.type = type
            osc.frequency.value = freq
            const s = t0 + n.at
            gain.gain.setValueAtTime(0.0001, s)
            gain.gain.linearRampToValueAtTime(amp, s + 0.025)
            gain.gain.exponentialRampToValueAtTime(0.0008, s + 1.7)
            osc.connect(gain)
            gain.connect(ctx.destination)
            osc.start(s)
            osc.stop(s + 1.8)
          }
          mk(n.f, 'sine', n.g)
          mk(n.f / 2, 'triangle', n.g * 0.35)
        }
        // صدى منفصل بإزاحة 0.55 ثانية
        for (const n of notes) {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.type = 'sine'
          osc.frequency.value = n.f
          const s = t0 + n.at + 0.55
          gain.gain.setValueAtTime(0.0001, s)
          gain.gain.linearRampToValueAtTime(n.g * 0.26, s + 0.03)
          gain.gain.exponentialRampToValueAtTime(0.0006, s + 1.5)
          osc.connect(gain)
          gain.connect(ctx.destination)
          osc.start(s)
          osc.stop(s + 1.6)
        }
        setTimeout(() => { try { ctx.close() } catch {} }, 4200)
      } catch {}
    }
    const ctx = new AC()
    if (ctx.state === 'suspended') {
      // المتصفح/الويب-فيو يشترط لمسة مستخدم: نجدول فور السماح، وإن لم
      // يُسمح بعد نعلّق لمسةً واحدة على النافذة كلها — أول لمسة تُرنّ الجرس
      ctx.resume().then(() => { try { schedule(ctx) } catch {} }).catch(() => {})
      const onGesture = () => {
        try {
          const c2 = new AC()
          c2.resume().then(() => schedule(c2)).catch(() => { try { schedule(c2) } catch {} })
        } catch {}
        window.removeEventListener('pointerdown', onGesture)
        window.removeEventListener('touchstart', onGesture)
        window.removeEventListener('keydown', onGesture)
      }
      window.addEventListener('pointerdown', onGesture, { once: false })
      window.addEventListener('touchstart', onGesture, { once: false })
      window.addEventListener('keydown', onGesture, { once: false })
      setTimeout(() => {
        window.removeEventListener('pointerdown', onGesture)
        window.removeEventListener('touchstart', onGesture)
        window.removeEventListener('keydown', onGesture)
      }, 60000)
    } else {
      schedule(ctx)
    }
  } catch {}
}

// ─── اهتزاز ملكي (إن سمح الجهاز) ───
function royalVibrate() {
  try { (navigator as any).vibrate?.([130, 70, 130, 70, 280]) } catch {}
}

export function RenegotiationAlertWatcher({ trainerId, onRefresh }: Props) {
  const [offer, setOffer] = useState<OfferState | null>(null)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [declineOpen, setDeclineOpen] = useState(false)
  const [declineNote, setDeclineNote] = useState('')
  const alertedRef = useRef<Set<string>>(new Set()) // العروض التي رنّ لها الجرس في هذه الجلسة
  const mountedRef = useRef(true)

  const check = useCallback(async () => {
    if (!trainerId || !mountedRef.current) return
    try {
      const res = await fetch('/api/trainers/offer-status', { cache: 'no-store' })
      const d = await res.json().catch(() => null)
      if (!d || !mountedRef.current) return
      if (d.pending && d.offered_at) {
        const stamp = String(d.offered_at)
        // ختم المشاهدة: إن أغلق المدرب المنبّث بـ«لاحقاً» أو ردّ عليه فلا يعود
        // يفتح لنفس العرض — يبقى دائماً في بطاقة الاتفاق داخل «نظرة عامة» و«أرباحي»
        let seen = ''
        try { seen = localStorage.getItem(seenKey(trainerId)) || '' } catch {}
        if (stamp === seen) return
        // المنبثق يظهر لكل عرض لم يُغلق/يُردّ عليه بعد — حتى بعد إعادة فتح التطبيق
        setOffer({
          offered_at: stamp,
          percentage: Number(d.percentage) || 0,
          current_percentage: Number(d.current_percentage) || 0,
          note: d.note || null,
          name: d.name || '',
        })
        setOpen(true)
        // الجرس يرن مرة واحدة لكل عرض جديد في هذه الجلسة
        if (!alertedRef.current.has(stamp)) {
          alertedRef.current.add(stamp)
          playRoyalChime()
          royalVibrate()
        }
      }
    } catch { /* صمت تام — النبضة المعزولة لا تُزعج أحداً */ }
  }, [trainerId])

  // ── النبضة المعزولة: فور التركيب + كل 20 ثانية + فور عودة التطبيق للمقدمة ──
  useEffect(() => {
    mountedRef.current = true
    if (!trainerId) return
    check()
    const timer = setInterval(check, 20000)
    const onVis = () => { if (document.visibilityState === 'visible') check() }
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('focus', onVis)
    // استماع منفصل لجسر الإشعارات الأصلي في APK — لا يمس المستمع القائم إطلاقاً:
    // عند وصول أي إشعار أصلي يذكر «تعديل» نتحقق فوراً لعرض المنبّث بلا انتظار
    const onNative = (event: any) => {
      try {
        const d = event?.detail || {}
        const txt = `${d.title || ''} ${d.body || ''}`
        if (txt.includes('تعديل')) setTimeout(check, 1500)
      } catch {}
    }
    window.addEventListener('fia-native-notification', onNative as EventListener)
    return () => {
      mountedRef.current = false
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('focus', onVis)
      window.removeEventListener('fia-native-notification', onNative as EventListener)
    }
  }, [trainerId, check])

  const markSeen = (stamp: string) => {
    try { localStorage.setItem(seenKey(trainerId), stamp) } catch {}
  }

  const dismissLater = () => {
    if (offer) markSeen(offer.offered_at)
    setOpen(false)
    setDeclineOpen(false)
    setDeclineNote('')
  }

  const respond = async (response: 'accepted' | 'declined') => {
    if (!trainerId || busy || !offer) return
    if (response === 'declined' && !declineOpen) { setDeclineOpen(true); return }
    setBusy(true)
    try {
      const res = await fetch('/api/trainers/agreement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trainer_id: trainerId,
          response,
          note: response === 'declined' ? (declineNote.trim() || undefined) : undefined,
        }),
      })
      const d = await res.json().catch(() => ({}))
      if (res.ok && d.success) {
        toast.success(d.message || 'تم تسجيل ردّك')
        markSeen(offer.offered_at)
        setOpen(false)
        setDeclineOpen(false)
        setDeclineNote('')
        setOffer(null)
        await onRefresh?.()
      } else {
        toast.error(d.error || 'تعذر تسجيل الرد')
      }
    } catch { toast.error('خطأ في الاتصال') } finally { setBusy(false) }
  }

  if (!offer) return null
  const newPct = offer.percentage
  const oldPct = offer.current_percentage
  const pctUp = newPct >= oldPct

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) dismissLater() }}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-2 border-gold/60 bg-white rounded-2xl shadow-2xl" dir="rtl">
        {/* هالة ذهبية عليا */}
        <div className="relative bg-gradient-to-l from-navy via-navy-light to-navy px-5 pt-6 pb-8 text-center">
          <div className="absolute inset-0 opacity-25" style={{ backgroundImage: 'radial-gradient(circle at 15% 40%, #D4AF37 1.5px, transparent 1.5px)', backgroundSize: '18px 18px' }} />
          <div className="absolute -top-12 -left-12 w-40 h-40 bg-gold/25 rounded-full blur-3xl" />
          <div className="relative">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-gold to-amber-600 flex items-center justify-center shadow-lg border border-white/30 relative">
              <Crown className="w-8 h-8 text-navy" strokeWidth={2.2} />
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-extrabold flex items-center justify-center animate-pulse shadow">1</span>
            </div>
            <DialogHeader className="mt-3 space-y-1.5">
              <DialogTitle className="text-base font-extrabold text-gold flex items-center justify-center gap-1.5">
                <ScrollText className="w-4 h-4" /> عرض تعديل عقد الشراكة
              </DialogTitle>
              <DialogDescription className="text-[11px] text-white/75 leading-relaxed">
                الإدارة أرسلت إليك طلب تعديل حصتك — بانتظار موافقتك أو رفضك الآن
              </DialogDescription>
            </DialogHeader>
          </div>
        </div>

        <div className="relative px-5 pb-5 -mt-5 space-y-4">
          {/* النسبة الحالية → المقترحة */}
          <div className="rounded-2xl border border-gold/50 bg-gradient-to-l from-amber-50 via-white to-gold/[0.08] p-4 shadow-lg">
            <div className="flex items-center justify-center gap-4" dir="ltr">
              <div className="text-center">
                <p className="text-[10px] font-bold text-muted-foreground">الحالية</p>
                <p className="text-3xl font-black text-navy">{oldPct}<span className="text-sm">%</span></p>
              </div>
              <div className={`flex flex-col items-center ${pctUp ? 'text-emerald-600' : 'text-amber-600'}`}>
                <BadgePercent className="w-5 h-5 mb-0.5" />
                <span className="text-xl font-black">→</span>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-bold text-muted-foreground">المقترحة</p>
                <p className={`text-3xl font-black ${pctUp ? 'text-emerald-600' : 'text-amber-600'}`}>{newPct}<span className="text-sm">%</span></p>
              </div>
            </div>
            <p className="text-center text-[11px] text-muted-foreground mt-2.5 leading-relaxed">
              نسبتك السارية تبقى مفعّلة حتى ترد — وبعد موافقتك يُقفل العقد الجديد من الطرفين
            </p>
          </div>

          {/* سبب الإدارة */}
          {offer.note && (
            <div className="rounded-xl border border-gold/35 bg-gradient-to-l from-gold/[0.12] to-amber-50 p-3 space-y-1.5">
              <p className="text-[11px] font-extrabold text-navy flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-gold flex-shrink-0" /> سبب طلب التعديل من الإدارة:
              </p>
              <p className="text-xs leading-relaxed text-navy/85 pr-5">{String(offer.note)}</p>
            </div>
          )}

          {/* ملاحظة الرفض */}
          {declineOpen && (
            <div className="rounded-xl border border-navy/20 bg-white p-3 space-y-2">
              <p className="text-[11px] font-extrabold text-navy">ملاحظتك للإدارة مع الرفض (اختيارية):</p>
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

          {/* الأزرار */}
          <div className="space-y-2">
            <button type="button" disabled={busy} onClick={() => respond('accepted')}
              className="w-full py-3 rounded-xl bg-gradient-to-l from-gold to-amber-500 text-navy text-sm font-extrabold shadow hover:brightness-110 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              أوافق — أقفل الاتفاق بالنسبة الجديدة {newPct}%
            </button>
            {declineOpen ? (
              <button type="button" disabled={busy} onClick={() => respond('declined')}
                className="w-full py-3 rounded-xl border-2 border-red-300 bg-red-50 text-red-700 text-sm font-extrabold hover:bg-red-100 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                <XCircle className="w-4 h-4" /> تأكيد الرفض نهائياً
              </button>
            ) : (
              <button type="button" disabled={busy} onClick={() => respond('declined')}
                className="w-full py-3 rounded-xl border border-navy/25 bg-white text-navy text-sm font-extrabold hover:bg-navy/5 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                <XCircle className="w-4 h-4" /> أرفض — تبقى نسبيتي الحالية
              </button>
            )}
            <button type="button" disabled={busy} onClick={dismissLater}
              className="w-full py-2 rounded-xl text-[11px] font-bold text-muted-foreground hover:text-navy transition-colors flex items-center justify-center gap-1.5">
              <Bell className="w-3.5 h-3.5" /> لاحقاً — سأجدها في بطاقة الاتفاق داخل لوحي
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
