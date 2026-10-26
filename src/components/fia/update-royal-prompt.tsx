'use client'

/**
 * 👑✨ UpdateRoyalPrompt — بطاقة التحديث الملكية (v10.16)
 * ============================================================================
 * تظهر داخل التطبيق فقط (WebView) حين يكون هناك إصدار أحدث من نقطة
 * /api/app-version — بطاقة سينمائية وسط الشاشة تعرض **المميزات الجديدة فقط**
 * بأيقونات ذهبية متدرجة الظهور، وزر «تحديث الآن» الذهبي يستدعي الجسر الأصلي
 * FIANativeBridge.installUpdate لتنزيل التطبيق وتثبيته مباشرة.
 * • الأجهزة على APK قديم (بلا getAppVersion) تتبع نافذة النظام الاحتياطية
 * • «لاحقاً» تؤجل البطاقة لهذه الجلسة فقط (sessionStorage)
 * • لا تمس أي منطق مصادقة أو إشعارات — طبقة عرض مستقلة تماماً
 *
 * 👑 v10.16 — الوضع الملكي بلا جسر (لثنائيات APK القديمة بلا getAppVersion):
 * • الاستدعاء اليدوي: زر «التحديثات» في شريط اللوحات يبثّ حدث window
 *   «fia-check-updates» فتُفتح البطاقة فوراً وتعرض أحدث إصدار متاح ومميزاته
 *   وزر «تحديث الآن» يفتح رابط الـ APK — داخل التطبيق يلتقطه مستمع
 *   التنزيلات الأصلي (DownloadListener) تلقائياً، وفي المتصفح يبدأ التنزيل الطبيعي
 * • التلقائي بلا جسر: يظهر فقط عند force_update=true داخل التطبيق —
 *   لأننا لا نعرف إصدار الجهاز بدون الجسر، ولا نريد إزعاجاً كاذباً أبداً
 * ============================================================================
 */

import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, Crown, Download, X } from 'lucide-react'
import { toast } from 'sonner'

interface UpdateInfo {
  version_code: number
  version_name: string
  apk_url: string
  features?: string[]
  force_update?: boolean
}

const DISMISS_KEY = 'fia-royal-update-dismissed'

export function UpdateRoyalPrompt() {
  const [info, setInfo] = useState<UpdateInfo | null>(null)
  const [closing, setClosing] = useState(false)
  // 👑 v10.16 — manual: فُتحت بالاستدعاء اليدوي (زر «التحديثات») — عنوان ولون مختلفان
  const [manual, setManual] = useState(false)

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
            if (isManual) toast.info('👑 أنت على أحدث إصدار — التطبيق محدّث بالكامل')
            return
          }
        }
        const res = await fetch('/api/app-version', { cache: 'no-store' })
        const data = await res.json()
        if (!alive || !data?.version_code) return
        if (hasBridge && Number(data.version_code) <= installed) {
          if (isManual) toast.success('👑 أنت على أحدث إصدار — التطبيق محدّث بالكامل')
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
    setTimeout(() => { setInfo(null); setClosing(false) }, 380)
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
          <div className="relative mt-3 text-white font-black text-lg">{manual ? 'أحدث إصدار متاح 👑' : 'تحديث جديد متاح ✨'}</div>
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
