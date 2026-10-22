'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth-store'
import {
  User, UserPlus, BookOpen, Users, Award, Shield, FileText,
  RefreshCw, LifeBuoy, Share2, ChevronLeft, Sparkles, GraduationCap,
} from 'lucide-react'

// ⚡ Professional quick-link config: each link has an icon, a gradient,
// and a hover animation. The cards are visually distinctive (not just
// text links) so the user knows they're interactive.
const QUICK_LINKS = [
  { id: 'courses',  label: 'دوراتنا',  icon: BookOpen,  gradient: 'from-blue-500 to-indigo-600',    bg: 'from-blue-50 to-indigo-50' },
  { id: 'trainers', label: 'مدربونا', icon: GraduationCap, gradient: 'from-emerald-500 to-teal-600', bg: 'from-emerald-50 to-teal-50' },
  { id: 'team',     label: 'الفريق',   icon: Users,     gradient: 'from-amber-500 to-orange-600',    bg: 'from-amber-50 to-orange-50' },
  { id: 'about',    label: 'من نحن',  icon: Award,     gradient: 'from-purple-500 to-fuchsia-600',  bg: 'from-purple-50 to-fuchsia-50' },
  { id: 'privacy',  label: 'الخصوصية', icon: Shield,    gradient: 'from-slate-500 to-gray-600',     bg: 'from-slate-50 to-gray-50' },
  { id: 'terms',    label: 'الشروط',   icon: FileText,  gradient: 'from-sky-500 to-blue-600',       bg: 'from-sky-50 to-blue-50' },
  { id: 'refund',   label: 'الاسترداد', icon: RefreshCw, gradient: 'from-rose-500 to-pink-600',      bg: 'from-rose-50 to-pink-50' },
  { id: 'support',  label: 'الدعم',    icon: LifeBuoy,  gradient: 'from-cyan-500 to-blue-600',      bg: 'from-cyan-50 to-blue-50' },
  { id: 'social',   label: 'تابعنا',   icon: Share2,    gradient: 'from-violet-500 to-purple-600',  bg: 'from-violet-50 to-purple-50' },
]

export function LandingAuth({ onLoginClick }: { onLoginClick: () => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', affiliateCode: '' })
  const setAuth = useAuth((s) => s.setAuth)

  useEffect(() => {
    // ⚡ v2.7 تحسين سرعة جوهري: أُزيلت طلبات /api/courses و /api/trainers
    // و /api/team و /api/site-settings التي كانت تُجلب في كل زيارة للصفحة
    // الرئيسية بينما هذا المكوّن لا يعرض نتائجها إطلاقاً (4 رحلات شبكة
    // كاملة كانت تؤخّر أول تفاعل دون أي فائدة). بقي فقط تعبئة كود الدعوة
    // وهي عملية محلية فورية.
    // Auto-fill the affiliate code field. Check TWO sources:
    // 1. URL ?ref= parameter (direct, synchronous, most reliable)
    // 2. localStorage fia_ref_code (set by layout script on prior visit)
    try {
      const urlParams = new URLSearchParams(window.location.search)
      const refFromUrl = urlParams.get('ref')
      const refFromStorage = localStorage.getItem('fia_ref_code')
      const refCode = refFromUrl || refFromStorage || ''
      if (refCode) setForm((prev) => ({ ...prev, affiliateCode: refCode.toUpperCase() }))
    } catch {}
  }, [])

  const submit = async () => {
    setLoading(true)
    try {
      const url = mode === 'login' ? '/api/auth/login' : '/api/auth/register'
      const payload = mode === 'login'
        ? { email: form.email, password: form.password }
        : { name: form.name, email: form.email, password: form.password, phone: form.phone, affiliate_code: form.affiliateCode || undefined }
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'فشل العملية'); return }
      setAuth(data.user, data.token)
      toast.success(mode === 'login' ? `مرحباً ${data.user.name}` : 'تم إنشاء الحساب بنجاح')
      // Clear the stored ref code after successful registration
      if (mode === 'register') {
        try { localStorage.removeItem('fia_ref_code'); localStorage.removeItem('fia_ref_id') } catch {}
      }
    } catch { toast.error('حدث خطأ غير متوقع') }
    finally { setLoading(false) }
  }

  // Navigate to a quick link via hash (triggers QuickLinkCard in page.tsx)
  const goToCard = (id: string) => { window.location.hash = id }

  // حُقول النموذج بأسلوب زجاجي فاخر موحّد (خلفية داكنة + لمسة ذهبية عند التركيز)
  const inputCls =
    'mt-1 h-12 rounded-xl border-white/15 bg-white/[0.08] text-white placeholder:text-white/35 focus-visible:border-[#C9A961] focus-visible:ring-[#C9A961]/40 text-sm'

  return (
    <div
      className="relative min-h-[calc(100vh-64px)] overflow-hidden bg-gradient-to-b from-[#0A1F44] via-[#0C2452] to-[#051429] px-4 py-8 sm:py-10"
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 2rem)' }}
    >
      {/* === خلفية فاخرة: توهجات ذهبية + نمط نجوم خفيف (CSS خالص — بلا صور) === */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-[#C9A961]/15 blur-3xl" />
        <div className="absolute top-1/3 -left-28 h-80 w-80 rounded-full bg-[#1B3A6B]/50 blur-3xl" />
        <div className="absolute -bottom-24 right-1/4 h-64 w-64 rounded-full bg-[#C9A961]/10 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 15% 35%, #C9A961 1.2px, transparent 1.2px), radial-gradient(circle at 85% 15%, #ffffff 1px, transparent 1px), radial-gradient(circle at 55% 85%, #C9A961 1px, transparent 1px)',
            backgroundSize: '44px 44px, 30px 30px, 56px 56px',
          }}
        />
      </div>

      <div className="relative mx-auto flex w-full max-w-sm sm:max-w-md flex-col items-center">
        {/* === تاج الشعار: إطار ذهبي متدرج + هالة نابضة === */}
        <div className="fia-lux-fadeup text-center">
          <div className="relative inline-block">
            <div className="fia-lux-glow absolute -inset-3 rounded-full bg-[#C9A961]/25 blur-2xl" />
            <div className="relative rounded-3xl bg-gradient-to-br from-[#C9A961] via-[#E5C77E] to-[#C9A961] p-[2px] shadow-2xl">
              <img
                src="/fia/logo-fia.png"
                alt="FIA"
                loading="eager"
                width={88}
                height={88}
                className="h-20 w-20 sm:h-24 sm:w-24 rounded-[22px] object-cover"
              />
            </div>
          </div>
          <h1 className="mt-4 text-2xl sm:text-3xl font-extrabold tracking-tight text-white drop-shadow-sm">
            أكاديمية المستقبل الدولية
          </h1>
          <p className="mt-1 text-[11px] font-bold tracking-[0.25em] text-[#C9A961]">
            FUTURE INTERNATIONAL ACADEMY
          </p>
        </div>

        {/* === بطاقة الدخول الزجاجية === */}
        <div
          className="fia-lux-fadeup mt-6 w-full rounded-3xl border border-[#C9A961]/25 bg-white/[0.07] p-5 shadow-2xl backdrop-blur-xl sm:p-6"
          style={{ animationDelay: '80ms' }}
        >
          <div className="text-center">
            <h2 className="text-lg font-bold text-white sm:text-xl">
              {mode === 'login' ? 'مرحباً بعودتك' : 'انضم إلى الأكاديمية'}
            </h2>
            <p className="mt-1 text-xs text-white/60">
              {mode === 'login' ? 'ادخل بياناتك للوصول إلى حسابك' : 'أنشئ حسابك للوصول إلى الدورات المعتمدة'}
            </p>
          </div>

          {/* Tabs — حبة ذهبية منزلقة، أهداف لمس 44px+ */}
          <div className="mt-4 flex gap-1 rounded-2xl border border-white/10 bg-[#051429]/60 p-1">
            <button
              onClick={() => setMode('register')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all duration-200 ${
                mode === 'register'
                  ? 'bg-gradient-to-r from-[#C9A961] to-[#E5C77E] text-[#0A1F44] shadow-lg'
                  : 'text-white/65 hover:text-white'
              }`}
            >
              <UserPlus className="h-4 w-4" /> حساب جديد
            </button>
            <button
              onClick={() => setMode('login')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all duration-200 ${
                mode === 'login'
                  ? 'bg-gradient-to-r from-[#C9A961] to-[#E5C77E] text-[#0A1F44] shadow-lg'
                  : 'text-white/65 hover:text-white'
              }`}
            >
              <User className="h-4 w-4" /> دخول
            </button>
          </div>

          {/* Form — نفس المنطق والحقول تماماً */}
          <div className="mt-4 space-y-3">
            {mode === 'register' && (
              <div>
                <Label htmlFor="name" className="text-xs font-medium text-white/75 sm:text-sm">الاسم الكامل</Label>
                <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="مثال: محمد أحمد محمد صالح" className={inputCls} autoComplete="name" />
                <p className="text-[10px] text-white/55 mt-1.5 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[#C9A961]" />
                  ملاحظة: يُفضّل كتابة الاسم الرباعي — فهو الذي يظهر على شهادتك الرسمية
                </p>
              </div>
            )}
            <div>
              <Label htmlFor="email" className="text-xs font-medium text-white/75 sm:text-sm">البريد الإلكتروني</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="example@fia.edu" className={inputCls} dir="ltr" inputMode="email" autoComplete="email" />
            </div>
            {mode === 'register' && (
              <div>
                <Label htmlFor="phone" className="text-xs font-medium text-white/75 sm:text-sm">رقم الهاتف</Label>
                <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+967 7XX XXX XXX" className={inputCls} dir="ltr" inputMode="tel" autoComplete="tel" />
              </div>
            )}
            {mode === 'register' && (
              <div>
                <Label htmlFor="affiliate" className="text-xs font-medium text-white/75 sm:text-sm">كود الدعوة (اختياري)</Label>
                <Input id="affiliate" value={form.affiliateCode} onChange={(e) => setForm({ ...form, affiliateCode: e.target.value })} placeholder="FIA-XXXX" className={`${inputCls} font-mono`} dir="ltr" />
                {form.affiliateCode && <p className="mt-1 text-[10px] text-emerald-400">✓ تمت إضافته تلقائياً من رابط الدعوة</p>}
              </div>
            )}
            <div>
              <Label htmlFor="password" className="text-xs font-medium text-white/75 sm:text-sm">كلمة المرور</Label>
              <Input id="password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" className={inputCls} dir="ltr" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} onKeyDown={(e) => { if (e.key === 'Enter') submit() }} />
            </div>
            <Button
              onClick={submit}
              disabled={loading}
              className="fia-lux-shine mt-1 h-12 w-full rounded-xl border border-[#E5C77E]/50 bg-gradient-to-r from-[#C9A961] via-[#D9BC77] to-[#C9A961] text-sm font-extrabold text-[#0A1F44] shadow-[0_8px_24px_rgba(201,169,97,0.35)] transition-all hover:shadow-[0_10px_32px_rgba(201,169,97,0.5)] active:scale-[0.98] disabled:opacity-60"
            >
              {loading ? 'جاري المعالجة...' : mode === 'login' ? 'تسجيل الدخول' : 'إنشاء الحساب'}
            </Button>
            {mode === 'register' && (
              <a
                href="/register?type=trainer"
                className="group mt-2 flex items-center justify-center gap-2 rounded-xl border border-[#C9A961]/35 bg-gradient-to-l from-[#C9A961]/10 to-transparent px-4 py-3 text-xs font-bold text-[#E5C77E] transition-all hover:border-[#C9A961]/60 hover:bg-[#C9A961]/15 active:scale-[0.98]"
              >
                <GraduationCap className="h-4 w-4 transition-transform group-hover:scale-110" />
                تريد الانضمام مدرباً إلى النخبة؟ سجّل كمدرب مع ملفك الاحترافي الكامل 👑
              </a>
            )}
          </div>
        </div>

        {/* ✋ قسم الروابط السريعة — محفوظ حرفياً كما هو (طلب المالك: لا تلمس الروابط
            السريعة). وُضع فقط حوله لوحة فاتحة أنيقة ليبقى على خلفية فاخرة داكنة
            بنفس قراءته وألوانه وتصرفاته الأصلية دون أي تغيير داخلي. */}
        <div
          className="fia-lux-fadeup mt-5 w-full rounded-3xl bg-[#FDFDFB]/95 p-4 shadow-2xl ring-1 ring-[#C9A961]/30"
          style={{ animationDelay: '160ms' }}
        >
          <div className="border-t border-gray-100 pt-4">
            <div className="flex items-center gap-1.5 mb-3">
              <Sparkles className="w-3 h-3 text-[#C9A961]" />
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">روابط سريعة</p>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
              {QUICK_LINKS.map((link) => {
                const Icon = link.icon
                return (
                  <button
                    key={link.id}
                    onClick={() => goToCard(link.id)}
                    className={`group relative flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-xl bg-gradient-to-br ${link.bg} border border-gray-200/60 hover:border-[#C9A961]/40 hover:shadow-md active:scale-95 transition-all duration-200`}
                  >
                    {/* Gradient icon circle */}
                    <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${link.gradient} flex items-center justify-center shadow-sm group-hover:scale-110 group-hover:rotate-3 transition-transform duration-200`}>
                      <Icon className="w-4.5 h-4.5 text-white" strokeWidth={2.2} />
                    </div>
                    {/* Label */}
                    <span className="text-[11px] font-semibold text-gray-700 group-hover:text-[#0A1F44] transition-colors">
                      {link.label}
                    </span>
                    {/* Hover arrow indicator */}
                    <ChevronLeft className="w-3 h-3 text-[#C9A961] opacity-0 group-hover:opacity-100 group-hover:-translate-x-0.5 transition-all absolute top-2 left-2" />
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <p className="fia-lux-fadeup mt-6 text-center text-[10px] font-medium tracking-wide text-white/40" style={{ animationDelay: '240ms' }}>
          شهادات معتمدة • تدريب طبي احترافي • منصة آمنة 100%
        </p>
      </div>
    </div>
  )
}
