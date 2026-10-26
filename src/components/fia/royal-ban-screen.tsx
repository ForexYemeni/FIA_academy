'use client'

/**
 * 👑🚫 RoyalBanScreen — بطاقة الحظر الملكية (v10.11)
 * ============================================================================
 * شاشة كاملة فاخرة تظهر لحظة حظر الحساب من الإدارة — تحجب كل المحتوى:
 *   • ختم حظر ملكي يهبط ختماً (ذهبي × قرمزي)
 *   • «تم حظرك من قبل الإدارة» + سبب الحظر في بطاقة رسمية
 *   • زر «دردشة فورية مع الإدارة» — يفتح الدردشة مباشرة مع حساب الإدارة
 *     (الشاشة تنكمش لشارة صغيرة حتى تتمكن الدردشة من العمل، وتعود بالضغط)
 *   • قنوات التواصل الرسمية من إعدادات الموقع (هاتف/بريد/واتساب/تيليجرام)
 *   • زر تسجيل الخروج
 * لا تمس أي منطق مصادقة — عرض فقط، والحرس الملكي هو من يدير الحالة.
 * ============================================================================
 */

import { useCallback, useEffect, useState } from 'react'
import { Ban, Crown, MessageCircle, Phone, Mail, Send, LogOut, ChevronDown, ShieldAlert, Loader2 } from 'lucide-react'

interface RoyalBanScreenProps {
  reason: string
  onLogout: () => void
}

export function RoyalBanScreen({ reason, onLogout }: RoyalBanScreenProps) {
  const [chatMode, setChatMode] = useState(false)
  const [cardClosing, setCardClosing] = useState(false)
  const [showContacts, setShowContacts] = useState(false)
  const [settings, setSettings] = useState<any>(null)
  // 👑 v10.18 — هوية الإدارة تُجلب مسبقاً لحظة ظهور البطاقة (لا لحظة الضغط)
  // فتنفتح المحادثة الفورية بنبضة واحدة مع الحساب الصحيح.
  const [admin, setAdmin] = useState<{ id: string; name: string; avatar?: string } | null>(null)
  const [adminLoading, setAdminLoading] = useState(false)

  useEffect(() => {
    let alive = true
    fetch('/api/admin/contact')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive && d?.id) setAdmin({ id: d.id, name: d.name || 'إدارة الأكاديمية', avatar: d.avatar || undefined }) })
      .catch(() => {})
    return () => { alive = false }
  }, [])

  // قنوات التواصل الرسمية — تُجلب عند أول توسيع
  useEffect(() => {
    if (!showContacts || settings) return
    fetch('/api/site-settings')
      .then((r) => r.json())
      .then((d) => setSettings(d || {}))
      .catch(() => setSettings({}))
  }, [showContacts, settings])

  const openAdminChat = useCallback(async () => {
    // 👑 v10.18 — إن لم تصل هوية الإدارة بعد: محاولة أخيرة فورية ثم رسالة واضحة —
    // لا يُفتح أي شيء ناقص أبداً، وتبقى البطاقة هي الوجه الوحيد.
    let target = admin
    if (!target) {
      setAdminLoading(true)
      try {
        const res = await fetch('/api/admin/contact')
        const d = res.ok ? await res.json() : null
        if (d?.id) { target = { id: d.id, name: d.name || 'إدارة الأكاديمية', avatar: d.avatar || undefined }; setAdmin(target) }
      } catch {}
      setAdminLoading(false)
    }
    if (!target?.id) {
      try {
        const { toast } = await import('sonner')
        toast.error('تعذر فتح المحادثة حالياً — تأكد من الاتصال ثم أعد المحاولة')
      } catch {}
      return
    }
    window.dispatchEvent(new CustomEvent('fia-ban:chat-admin', {
      detail: { id: target.id, name: target.name || 'إدارة الأكاديمية', avatar: target.avatar || undefined },
    }))
    setCardClosing(true)
    setTimeout(() => setChatMode(true), 380)
    setTimeout(() => setCardClosing(false), 420)
  }, [admin])

  const backToCard = useCallback(() => setChatMode(false), [])

  // 👑 v10.18 — إغلاق المحادثة (زر X) يُعيد بطاقة الحظر الكاملة فوراً —
  // لا يعود المستخدم أبداً إلى الصفحات عبر باب المحادثة.
  useEffect(() => {
    const onChatClosed = () => setChatMode(false)
    window.addEventListener('fia-ban:chat-closed', onChatClosed)
    return () => window.removeEventListener('fia-ban:chat-closed', onChatClosed)
  }, [])

  // ════════ وضع الدردشة: حاجز كامل + شارتان — الدردشة وحدها تعمل بحرية ════════
  // 🚫 v10.18 — إصلاح ثغرة الهروب الكبرى: كان هذا الوضع يُبقي كل الصفحات مفتوحة
  // خلف شارة صغيرة — الآن حاجز معتم كامل يمنع لمس أي صفحة، والمحادثة وحدها
  // ترتفع فوقه (z أعلى)، وإغلاقها يعيد البطاقة الكاملة.
  if (chatMode) {
    return (
      <>
        {/* الحاجز الكامل — يمنع أي تفاعل مع الصفحات خلفه */}
        <div className="fixed inset-0 z-[9990] bg-[#050b1e]/97" aria-hidden />
        <div className="fixed top-3 inset-x-0 z-[10000] flex justify-center pointer-events-none" dir="rtl">
          <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-red-400/50 bg-gradient-to-l from-[#2a0a12]/95 via-[#3d0f1a]/95 to-[#2a0a12]/95 backdrop-blur px-4 py-1.5 shadow-[0_8px_30px_-8px_rgba(0,0,0,0.7)]">
            <ShieldAlert className="w-4 h-4 text-red-300" />
            <span className="text-[11px] font-black text-white/90">حظرك سارٍ — أرسل رسالتك للإدارة هنا</span>
            <button onClick={backToCard} aria-label="عودة لبطاقة الحظر" className="rounded-full bg-white/10 p-1 text-gold hover:bg-white/20 transition-colors">
              <ChevronDown className="w-3.5 h-3.5 rotate-180" />
            </button>
          </div>
        </div>
        <button
          onClick={backToCard}
          className="fixed bottom-5 left-5 z-[10000] flex items-center gap-1.5 rounded-full border border-red-400/50 bg-[#2a0a12]/95 backdrop-blur px-3.5 py-2 text-[11px] font-black text-red-200 shadow-xl active:scale-95 transition-transform"
          dir="rtl"
        >
          <Ban className="w-3.5 h-3.5" />
          بطاقة الحظر
        </button>
      </>
    )
  }

  // ════════ البطاقة الملكية الكاملة — تحجب كل شيء ════════
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-gradient-to-br from-[#050b1e] via-[#0b1635] to-[#050b1e]" dir="rtl">
      {/* زخرفة خلفية */}
      <div className="absolute inset-0 opacity-25 pointer-events-none" style={{
        backgroundImage: 'radial-gradient(circle at 12% 20%, #D4AF37 1.2px, transparent 1.2px)',
        backgroundSize: '26px 26px',
      }} />
      <div className="absolute -top-20 -right-20 w-72 h-72 bg-red-900/25 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-16 w-80 h-80 bg-gold/10 rounded-full blur-3xl pointer-events-none" />

      <div className={`relative w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl border-2 border-gold/50 bg-white fia-ban-card ${cardClosing ? 'fia-ban-card-out' : ''}`}>
        {/* الترويسة الكحلية — الختم الملكي يهبط */}
        <div className="relative bg-gradient-to-br from-navy via-navy-light to-navy px-6 pt-7 pb-12 text-center">
          <div className="absolute inset-0 opacity-20 pointer-events-none" style={{
            backgroundImage: 'radial-gradient(circle at 12% 50%, #D4AF37 1.4px, transparent 1.4px)', backgroundSize: '20px 20px',
          }} />
          <div className="relative inline-block">
            <div className="absolute inset-0 rounded-full bg-red-500/30 blur-2xl animate-pulse" />
            <div className="fia-ban-seal relative w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-red-700 via-red-600 to-red-900 flex items-center justify-center shadow-[0_0_45px_rgba(220,38,38,0.55)] border-4 border-white/40">
              <svg viewBox="0 0 52 52" className="absolute inset-0 w-full h-full">
                <circle cx="26" cy="26" r="23" fill="none" stroke="#0A1F44" strokeWidth="1.4" strokeDasharray="3 4" opacity="0.55" />
              </svg>
              <Ban className="w-11 h-11 text-white" strokeWidth={2.6} />
            </div>
            <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-navy text-red-300 text-[11px] font-black rounded-full px-3.5 py-1 border border-red-400/50 shadow-lg whitespace-nowrap">
              حظر رسمي
            </span>
          </div>
          <div className="relative mt-3.5 flex items-center justify-center gap-1.5 text-gold/90">
            <Crown className="w-3.5 h-3.5" />
            <span className="text-[10px] font-black uppercase tracking-widest">أكاديمية المستقبل الدولية</span>
          </div>
        </div>

        {/* الجسم الرسمي */}
        <div className="relative px-6 pb-6 -mt-6">
          <div className="rounded-2xl border border-gold/30 bg-gradient-to-b from-white to-gold/[0.06] p-4 text-center shadow-md">
            <div className="text-lg font-black text-navy leading-snug">تم حظرك من قِبل الإدارة</div>
            <div className="mt-1 text-[12px] font-bold text-muted-foreground">
              حسابك موقوف حالياً ولا يمكنك الوصول إلى محتوى الأكاديمية
            </div>
            {/* بطاقة السبب الرسمية */}
            <div className="mt-3.5 rounded-xl border border-red-300/50 bg-red-500/[0.07] px-3.5 py-3 text-right">
              <div className="flex items-center gap-1.5 mb-1">
                <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
                <span className="text-[10px] font-black text-red-700 uppercase tracking-widest">سبب الحظر</span>
              </div>
              <p className="text-[13px] font-bold leading-6 text-navy whitespace-pre-wrap">{reason}</p>
            </div>

            {/* الأزرار الملكية */}
            <button
              onClick={openAdminChat}
              disabled={adminLoading}
              className="fia-ban-btn mt-4 w-full h-12 rounded-2xl bg-gradient-to-l from-gold to-amber-500 hover:from-amber-500 hover:to-gold text-navy text-sm font-black flex items-center justify-center gap-2 shadow-[0_10px_30px_-8px_rgba(212,175,55,0.6)] active:scale-[0.97] transition-all disabled:opacity-70"
            >
              {adminLoading
                ? <Loader2 className="w-4.5 h-4.5 animate-spin" strokeWidth={2.4} />
                : <MessageCircle className="w-4.5 h-4.5" strokeWidth={2.4} />}
              دردشة فورية مع الإدارة
            </button>

            <button
              onClick={() => setShowContacts((s) => !s)}
              className="mt-2.5 w-full h-11 rounded-2xl border border-navy/15 bg-navy/[0.04] hover:bg-navy/[0.08] text-navy text-[13px] font-black flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              <Phone className="w-4 h-4" />
              قنوات التواصل الرسمية
              <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${showContacts ? 'rotate-180' : ''}`} />
            </button>

            {/* لوحة القنوات — تنفتح بنعومة */}
            <div className={`overflow-hidden transition-all duration-500 ${showContacts ? 'max-h-64 opacity-100 mt-3' : 'max-h-0 opacity-0'}`}>
              <div className="space-y-2 text-right">
                {settings?.phone && (
                  <a href={`tel:${settings.phone}`} className="flex items-center gap-2.5 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.07] px-3.5 py-2.5 hover:bg-emerald-500/[0.12] transition-colors">
                    <Phone className="w-4 h-4 text-emerald-600" />
                    <div><div className="text-[10px] font-black text-emerald-700">هاتف الإدارة</div><div className="text-[13px] font-bold text-navy" dir="ltr">{settings.phone}</div></div>
                  </a>
                )}
                {settings?.email && (
                  <a href={`mailto:${settings.email}`} className="flex items-center gap-2.5 rounded-xl border border-blue-500/25 bg-blue-500/[0.07] px-3.5 py-2.5 hover:bg-blue-500/[0.12] transition-colors">
                    <Mail className="w-4 h-4 text-blue-600" />
                    <div><div className="text-[10px] font-black text-blue-700">البريد الرسمي</div><div className="text-[13px] font-bold text-navy" dir="ltr">{settings.email}</div></div>
                  </a>
                )}
                {settings?.social_whatsapp_enabled && settings?.social_whatsapp && (
                  <a
                    href={String(settings.social_whatsapp).startsWith('http') ? settings.social_whatsapp : `https://wa.me/${String(settings.social_whatsapp).replace(/[^0-9]/g, '')}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2.5 rounded-xl border border-green-500/25 bg-green-500/[0.07] px-3.5 py-2.5 hover:bg-green-500/[0.12] transition-colors"
                  >
                    <MessageCircle className="w-4 h-4 text-green-600" />
                    <div><div className="text-[10px] font-black text-green-700">واتساب الإدارة</div><div className="text-[13px] font-bold text-navy" dir="ltr">{settings.social_whatsapp}</div></div>
                  </a>
                )}
                {settings?.social_telegram_enabled && settings?.social_telegram && (
                  <a
                    href={String(settings.social_telegram).startsWith('http') ? settings.social_telegram : `https://t.me/${String(settings.social_telegram).replace('@', '')}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2.5 rounded-xl border border-sky-500/25 bg-sky-500/[0.07] px-3.5 py-2.5 hover:bg-sky-500/[0.12] transition-colors"
                  >
                    <Send className="w-4 h-4 text-sky-600" />
                    <div><div className="text-[10px] font-black text-sky-700">تيليجرام الإدارة</div><div className="text-[13px] font-bold text-navy" dir="ltr">{settings.social_telegram}</div></div>
                  </a>
                )}
                {!settings && <div className="text-center text-[11px] font-bold text-muted-foreground py-2">جاري تحميل القنوات…</div>}
              </div>
            </div>

            {/* خروج */}
            <button onClick={onLogout} className="mt-3.5 inline-flex items-center gap-1.5 text-[11px] font-bold text-red-600/80 hover:text-red-700 transition-colors">
              <LogOut className="w-3.5 h-3.5" />
              تسجيل الخروج من الحساب
            </button>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .fia-ban-card { animation: banCard .6s cubic-bezier(.2,.9,.3,1.2) both; }
        @keyframes banCard {
          from { opacity: 0; transform: translateY(34px) scale(.88); }
          to   { opacity: 1; transform: none; }
        }
        .fia-ban-card-out { animation: banCardOut .38s cubic-bezier(.4,0,.2,1) both !important; }
        @keyframes banCardOut {
          from { opacity: 1; transform: none; }
          to   { opacity: 0; transform: translateY(20px) scale(.94); }
        }
        .fia-ban-seal { animation: banSeal .7s cubic-bezier(.2,1.4,.4,1) .15s both; }
        @keyframes banSeal {
          0%   { transform: scale(2.2) rotate(-16deg); opacity: 0; }
          60%  { transform: scale(.94) rotate(3deg); opacity: 1; }
          100% { transform: scale(1) rotate(0); }
        }
        .fia-ban-btn { animation: banBtn .5s cubic-bezier(.2,.8,.3,1) .3s both; }
        @keyframes banBtn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
      `}</style>
    </div>
  )
}

export default RoyalBanScreen
