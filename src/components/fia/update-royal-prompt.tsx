'use client'

/**
 * 👑✨ UpdateRoyalPrompt — بطاقة التحديث الحقيقية 100% (v10.19)
 * ============================================================================
 * تظهر داخل التطبيق فقط (WebView) — الفحص **فعلي حقيقي 100%**:
 * • الجسر الأصلي FIANativeBridge.getAppVersion (متوفر في APK v2.9.10+) يعيد
 *   versionCode المثبّت فعلاً من PackageManager — نقارنه مباشرة بنقطة
 *   /api/app-version فتظهر الحقيقة لا الافتراض:
 *   – إصدار أحدث متاح → بطاقة سينمائية تعرض **المميزات الجديدة فقط** وزر
 *     «تحديث الآن» يستدعي FIANativeBridge.installUpdate (تنزيل + تثبيت أصلي)
 *   – التطبيق محدّث فعلاً → بطاقة خضراء «التطبيق محدّث بالكامل» بتحقق فعلي
 * • الأجهزة على APK قديم (بلا getAppVersion): نافذة النظام الأصلية
 *   (maybeCheckForUpdate في التطبيق نفسه) تتولّى التنبيه التلقائي، وزر
 *   «التحديثات» اليدوي يعرض أحدث إصدار متاح للتحميل
 * • «لاحقاً» تؤجل البطاقة لهذه الجلسة فقط (sessionStorage)
 * ============================================================================
 */

import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, Crown, Download, ShieldCheck, X } from 'lucide-react'
import { toast } from 'sonner'

interface UpdateInfo {
  version_code: number
  version_name: string
  apk_url: string
  notes?: string
  features?: string[]
  force_update?: boolean
}

const DISMISS_KEY = 'fia-royal-update-dismissed'

export function UpdateRoyalPrompt() {
  const [info, setInfo] = useState<UpdateInfo | null>(null)
  const [closing, setClosing] = useState(false)
  // 👑 v10.16 — manual: فُتحت بالاستدعاء اليدوي (زر «التحديثات») — عنوان ولون مختلفان
  const [manual, setManual] = useState(false)
  // 👑 v10.19 — الحقيقة الكاملة: حالة «التطبيق محدّث بالكامل» بفحص فعلي
  // (جسر getAppVersion) — تُعرض كبطاقة خضراء فاخرة لا مجرد توست عابر
  const [upToDate, setUpToDate] = useState<{ installed: number; latest: number; name: string } | null>(null)

  useEffect(() => {
    let alive = true
    const check = async (isManual = false) => {
      try {
        const bridge = (window as any)?.FIANativeBridge
        const hasBridge = !!bridge && typeof bridge.getAppVersion === 'function'
        // كشف WebView (داخل التطبيق) عبر User-Agent — للأجهزة بلا جسر
        const ua = typeof navigator !== 'undefined' ? String(navigator.userAgent || '') : ''
        const isWebView = /;\s*wv\)/i.test(ua)
        let installed = 0
        if (hasBridge) {
          installed = Number(await bridge.getAppVersion())
          if (!installed || Number.isNaN(installed)) {
            if (isManual) toast.info('تعذر قراءة إصدار التطبيق المثبّت — تُعرض أحدث نسخة متاحة')
            installed = 0
          }
        }
        const res = await fetch('/api/app-version', { cache: 'no-store' })
        const data = await res.json()
        if (!alive || !data?.version_code) return
        if (hasBridge && installed > 0 && Number(data.version_code) <= installed) {
          // ✅ الحقيقة الفعلية: النسخة المثبتة هي الأحدث — بطاقة «محدّث بالكامل»
          if (isManual) {
            setTimeout(() => { if (alive) setUpToDate({ installed, latest: Number(data.version_code), name: String(data.version_name || '') }) }, 200)
          }
          return
        }
        if (!hasBridge && !isManual) {
          // بلا جسر: البطاقة التلقائية فقط عند الإلزام داخل التطبيق
          // (لا نعرف إصدار الجهاز بدون الجسر — ولا إزعاج كاذب أبداً)
          if (!isWebView || !data.force_update) return
        }
        try {
          if (!isManual && !data.force_update && sessionStorage.getItem(`${DISMISS_KEY}-${data.version_code}`) === '1') return
        } catch {}
        // نمنح التطبيق لحظات ليستقر قبل الترفّع بالبطاقة الملكية
        setTimeout(() => { if (alive) { setManual(!!isManual); setInfo(data as UpdateInfo) } }, isManual ? 200 : 1800)
      } catch {}
    }
    check()
    // 👑 v10.16 — الاستدعاء اليدوي الملكي: زر «التحديثات» في شريط اللوحات يبثّ هذا الحدث
    const onManual = () => { check(true) }
    window.addEventListener('fia-check-updates', onManual as EventListener)
    return () => { alive = false; window.removeEventListener('fia-check-updates', onManual as EventListener) }
  }, [])

  const close = useCallback(() => {
    if (closing) return
    setClosing(true)
    try {
      if (info) sessionStorage.setItem(`${DISMISS_KEY}-${info.version_code}`, '1')
    } catch {}
    setTimeout(() => { setInfo(null); setClosing(false); setUpToDate(null) }, 380)
  }, [closing, info])

  const install = useCallback(() => {
    if (!info) return
    try {
      const bridge = (window as any)?.FIANativeBridge
      if (bridge && typeof bridge.installUpdate === 'function') {
        bridge.installUpdate(info.apk_url)
        close()
        return
      }
    } catch {}
    // 👑 v10.16 — بلا جسر: فتح رابط الـ APK مباشرة — داخل التطبيق يلتقطه
    // مستمع التنزيلات الأصلي (DownloadListener) ويكفل التنزيل والتثبيت،
    // وفي المتصفح يبدأ التنزيل الطبيعي فوراً
    try { window.location.href = info.apk_url } catch { window.open(info.apk_url, '_blank') }
    close()
  }, [info, close])

  // 👑 v10.19 — بطاقة «التطبيق محدّث بالكامل» — تظهر فقط بفحص فعلي حقيقي:
  // الجسر الأصلي أعاد versionCode المثبّت وكان هو الأحدث — الحقيقة لا الافتراض
  if (upToDate && !info) {
    return (
      <div className="fixed inset-0 z-[9997] flex items-center justify-center p-4" dir="rtl" onClick={close}>
        <div className={`absolute inset-0 bg-navy/70 backdrop-blur-[4px] ${closing ? 'fia-upd-bd-out' : 'fia-upd-bd'}`} />
        <div
          className={`relative w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl border-2 border-emerald-400/60 bg-white fia-upd-card ${closing ? 'fia-upd-card-out' : ''}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* الترويسة الخضراء الملكية */}
          <div className="relative bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 px-6 pt-7 pb-9 text-center">
            <div className="absolute inset-0 opacity-20 pointer-events-none" style={{
              backgroundImage: 'radial-gradient(circle at 14% 45%, #ffffff 1.4px, transparent 1.4px)', backgroundSize: '20px 20px',
            }} />
            <div className="relative inline-block">
              <div className="absolute inset-0 rounded-full bg-white/30 blur-2xl animate-pulse" />
              <div className="fia-upd-crown relative w-[74px] h-[74px] mx-auto rounded-full bg-gradient-to-br from-emerald-400 via-teal-300 to-emerald-400 flex items-center justify-center shadow-[0_0_45px_rgba(16,185,129,0.55)] border-4 border-white/40">
                <ShieldCheck className="w-9 h-9 text-white" strokeWidth={2.2} />
              </div>
            </div>
            <div className="relative mt-3 text-white font-black text-lg">التطبيق محدّث بالكامل ✅</div>
            <div className="relative mt-1.5 text-emerald-50/90 text-[12px] font-bold">
              تم الفحص الفعلي من خوادم الأكاديمية — لا يوجد أي تحديث جديد حالياً
            </div>
            <button onClick={close} aria-label="إغلاق" className="absolute top-3 left-3 rounded-full border border-white/10 bg-white/10 p-1.5 text-white/90 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* جسم البطاقة: إصدارك الحالي = الأحدث */}
          <div className="relative px-5 py-5">
            <div className="absolute -top-8 -left-8 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="relative flex items-center justify-between rounded-2xl border border-emerald-200 bg-gradient-to-l from-emerald-50 to-white px-4 py-3.5">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
                  <CheckCircle2 className="w-5 h-5 text-white" strokeWidth={2.4} />
                </span>
                <div>
                  <div className="text-[12px] font-black text-navy">نسختك المثبّتة</div>
                  <div className="text-[10px] text-muted-foreground">مطابقة تماماً لأحدث إصدار رسمي</div>
                </div>
              </div>
              <span className="rounded-full bg-emerald-500/10 border border-emerald-400/40 px-2.5 py-1 text-[11px] font-black text-emerald-700" dir="ltr">
                {upToDate.name ? `v${upToDate.name}` : `#${upToDate.installed}`}
              </span>
            </div>
            <div className="relative mt-3 space-y-2 text-[11.5px] font-bold text-navy/80 leading-5">
              <div className="flex items-start gap-2 rounded-xl border border-gold/25 bg-gradient-to-l from-gold/[0.08] to-transparent px-3 py-2.5">
                <CheckCircle2 className="w-[17px] h-[17px] text-gold flex-shrink-0 mt-0.5" strokeWidth={2.4} />
                أنت على أحدث إصدار — كل مميزات التطبيق تعمل بالكامل
              </div>
              <div className="flex items-start gap-2 rounded-xl border border-gold/25 bg-gradient-to-l from-gold/[0.08] to-transparent px-3 py-2.5">
                <CheckCircle2 className="w-[17px] h-[17px] text-gold flex-shrink-0 mt-0.5" strokeWidth={2.4} />
                عندما يصدر تحديث جديد ستظهر لك ميزاته هنا فوراً — تلقائياً
              </div>
            </div>
            <button
              onClick={close}
              className="fia-upd-btn relative mt-4 w-full h-12 rounded-2xl bg-gradient-to-l from-emerald-500 to-teal-600 hover:from-teal-600 hover:to-emerald-500 text-white text-sm font-black flex items-center justify-center gap-2 shadow-[0_10px_30px_-8px_rgba(16,185,129,0.6)] active:scale-[0.97] transition-all"
            >
              <CheckCircle2 className="w-4.5 h-4.5" strokeWidth={2.4} />
              تمام — إغلاق
            </button>
            <div className="mt-2 text-center text-[10px] text-muted-foreground/80">
              فحص حقيقي 100% — يقرأ رقم نسختك المثبّتة من النظام ويقارنه بالخادم مباشرة
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!info) return null
  const features = Array.isArray(info.features) && info.features.length > 0
    ? info.features
    : [String(info.notes || '').trim()].filter(Boolean)

  return (
    <div className="fixed inset-0 z-[9997] flex items-center justify-center p-4" dir="rtl" onClick={close}>
      <div className={`absolute inset-0 bg-navy/70 backdrop-blur-[4px] ${closing ? 'fia-upd-bd-out' : 'fia-upd-bd'}`} />
      <div
        className={`relative w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl border-2 border-gold/55 bg-white fia-upd-card ${closing ? 'fia-upd-card-out' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* التاج الكحلي */}
        <div className="relative bg-gradient-to-br from-navy via-navy-light to-navy px-6 pt-7 pb-9 text-center">
          <div className="absolute inset-0 opacity-20 pointer-events-none" style={{
            backgroundImage: 'radial-gradient(circle at 14% 45%, #D4AF37 1.4px, transparent 1.4px)', backgroundSize: '20px 20px',
          }} />
          <div className="relative inline-block">
            <div className="absolute inset-0 rounded-full bg-gold/30 blur-2xl animate-pulse" />
            <div className="fia-upd-crown relative w-[74px] h-[74px] mx-auto rounded-full bg-gradient-to-br from-gold via-amber-400 to-gold flex items-center justify-center shadow-[0_0_45px_rgba(212,175,55,0.55)] border-4 border-white/40">
              <Crown className="w-8 h-8 text-navy" strokeWidth={2.3} />
            </div>
          </div>
          <div className="relative mt-3 text-white font-black text-lg">{manual ? 'أحدث إصدار متاح ✨' : 'تحديث جديد متاح ✨'}</div>
          <div className="relative mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-gold/15 border border-gold/50 px-3 py-1 text-[11px] font-black text-gold">
            <Crown className="w-3 h-3" />
            الإصدار {info.version_name}
          </div>
          {manual && (
            <div className="relative mt-1.5 text-[10px] text-white/60">إن كان هذا نفس رقم إصدارك الحالي فأنت محدّث بالكامل</div>
          )}
          <button onClick={close} aria-label="إغلاق" className="absolute top-3 left-3 rounded-full border border-white/10 bg-white/10 p-1.5 text-gold/80 hover:text-gold transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* المميزات الجديدة فقط — صفوف ذهبية متدرجة الظهور */}
        <div className="relative px-5 py-5">
          <div className="absolute -top-8 -left-8 w-28 h-28 bg-gold/10 rounded-full blur-2xl pointer-events-none" />
          <div className="relative space-y-2">
            {features.map((f, i) => (
              <div
                key={i}
                className="fia-upd-row flex items-start gap-2.5 rounded-xl border border-gold/25 bg-gradient-to-l from-gold/[0.08] to-transparent px-3 py-2.5"
                style={{ animationDelay: `${0.18 + i * 0.09}s` }}
              >
                <CheckCircle2 className="w-[18px] h-[18px] text-gold flex-shrink-0 mt-0.5" strokeWidth={2.4} />
                <span className="text-[12.5px] font-bold text-navy leading-5">{f}</span>
              </div>
            ))}
          </div>
          {/* زر التثبيت الذهبي */}
          <button
            onClick={install}
            className="fia-upd-btn relative mt-4 w-full h-12 rounded-2xl bg-gradient-to-l from-gold to-amber-500 hover:from-amber-500 hover:to-gold text-navy text-sm font-black flex items-center justify-center gap-2 shadow-[0_10px_30px_-8px_rgba(212,175,55,0.6)] active:scale-[0.97] transition-all"
          >
            <Download className="w-4.5 h-4.5" strokeWidth={2.4} />
            تحديث الآن
          </button>
          <button onClick={close} className="mt-2.5 w-full text-center text-[12px] font-bold text-muted-foreground hover:text-navy transition-colors">
            لاحقاً
          </button>
          <div className="mt-2 text-center text-[10px] text-muted-foreground/80">
            يُثبَّت مباشرة فوق نسختك الحالية — بياناتك محفوظة بالكامل
          </div>
        </div>
      </div>

      <style jsx global>{`
        .fia-upd-bd { animation: updBd .45s ease both; }
        @keyframes updBd { from { opacity: 0; } to { opacity: 1; } }
        .fia-upd-bd-out { animation: updBdOut .38s ease both; }
        @keyframes updBdOut { from { opacity: 1; } to { opacity: 0; } }
        .fia-upd-card { animation: updCard .6s cubic-bezier(.2,.9,.3,1.2) both; }
        @keyframes updCard {
          from { opacity: 0; transform: translateY(34px) scale(.88); }
          to   { opacity: 1; transform: none; }
        }
        .fia-upd-card-out { animation: updCardOut .38s cubic-bezier(.4,0,.2,1) both !important; }
        @keyframes updCardOut {
          from { opacity: 1; transform: none; }
          to   { opacity: 0; transform: translateY(22px) scale(.92); }
        }
        .fia-upd-crown { animation: updCrown .8s cubic-bezier(.2,1.4,.4,1) .12s both; }
        @keyframes updCrown {
          0%   { opacity: 0; transform: scale(0.3) rotate(-20deg); }
          60%  { opacity: 1; transform: scale(1.08) rotate(3deg); }
          100% { opacity: 1; transform: scale(1) rotate(0); }
        }
        .fia-upd-row { animation: updRow .5s cubic-bezier(.2,.8,.3,1) both; }
        @keyframes updRow {
          from { opacity: 0; transform: translateX(14px); }
          to   { opacity: 1; transform: none; }
        }
        .fia-upd-btn { animation: updRow .5s cubic-bezier(.2,.8,.3,1) .3s both; }
      `}</style>
    </div>
  )
}

export default UpdateRoyalPrompt
