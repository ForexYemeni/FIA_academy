'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth-store'
import {
  User, UserPlus, BookOpen, Users, UserCog, Award, Shield, FileText,
  RefreshCw, LifeBuoy, Share2, ChevronLeft, Sparkles, GraduationCap,
} from 'lucide-react'

type Course = { id: string; title: string; status: string }
type Trainer = { id: string; name: string }

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
  const [courses, setCourses] = useState<Course[]>([])
  const [trainers, setTrainers] = useState<Trainer[]>([])
  const [founder, setFounder] = useState<any>(null)
  const [settings, setSettings] = useState<any>({})
  const setAuth = useAuth((s) => s.setAuth)

  useEffect(() => {
    fetch('/api/courses').then((r) => r.json()).then((d) => setCourses(Array.isArray(d) ? d : [])).catch(() => {})
    fetch('/api/trainers').then((r) => r.json()).then((d) => setTrainers(Array.isArray(d) ? d : [])).catch(() => {})
    fetch('/api/team?role=founder').then((r) => r.json()).then((d) => { if (Array.isArray(d) && d.length > 0) setFounder(d[0]) }).catch(() => {})
    fetch('/api/site-settings').then((r) => r.json()).then(setSettings).catch(() => {})
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

  const academyName = settings.academy_name || 'أكاديمية المستقبل الدولية'
  const academyNameEn = settings.academy_name_en || 'FUTURE INTERNATIONAL ACADEMY'

  // Navigate to a quick link via hash (triggers QuickLinkCard in page.tsx)
  const goToCard = (id: string) => { window.location.hash = id }

  return (
    <div
      className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-center bg-gradient-to-b from-gray-50 via-white to-gray-50 px-4 py-6 sm:py-8"
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1rem)' }}
    >
      <div className="w-full max-w-sm sm:max-w-md space-y-4 sm:space-y-5">
        {/* Logo centered — compact, slightly bigger on mobile for impact */}
        <div className="text-center">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-gradient-to-br from-[#C9A961]/20 to-[#0A1F44]/20 rounded-2xl blur-xl" />
            <img
              src="/fia/logo-fia.png"
              alt="FIA"
              loading="eager"
              width={64}
              height={64}
              className="relative h-16 w-16 sm:h-20 sm:w-20 mx-auto rounded-2xl shadow-lg object-cover mb-2 sm:mb-3 ring-2 ring-[#C9A961]/30"
            />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#0A1F44] tracking-tight">
            {mode === 'login' ? 'مرحباً بعودتك' : 'انضم إلى الأكاديمية'}
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1">
            {mode === 'login' ? 'ادخل بياناتك للوصول إلى حسابك' : 'أنشئ حسابك للوصول إلى الدورات المعتمدة'}
          </p>
        </div>

        {/* Tabs — compact, with minimum 44px touch targets */}
        <div className="flex gap-2 p-1 bg-gray-100 rounded-xl shadow-sm">
          <button
            onClick={() => setMode('register')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 sm:py-2.5 rounded-lg text-sm font-semibold transition-all ${mode === 'register' ? 'bg-[#0A1F44] text-[#C9A961] shadow-md' : 'text-gray-600'}`}
          >
            <UserPlus className="w-4 h-4" /> حساب جديد
          </button>
          <button
            onClick={() => setMode('login')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 sm:py-2.5 rounded-lg text-sm font-semibold transition-all ${mode === 'login' ? 'bg-[#0A1F44] text-[#C9A961] shadow-md' : 'text-gray-600'}`}
          >
            <User className="w-4 h-4" /> دخول
          </button>
        </div>

        {/* Form — compact, h-11 on mobile for 44px touch targets */}
        <div className="space-y-3">
          {mode === 'register' && (
            <div>
              <Label htmlFor="name" className="text-[#0A1F44] font-medium text-xs sm:text-sm">الاسم الكامل</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="مثال: محمد أحمد" className="mt-1 h-11 sm:h-10 rounded-lg text-sm" />
            </div>
          )}
          <div>
            <Label htmlFor="email" className="text-[#0A1F44] font-medium text-xs sm:text-sm">البريد الإلكتروني</Label>
            <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="example@fia.edu" className="mt-1 h-11 sm:h-10 rounded-lg text-sm" dir="ltr" inputMode="email" autoComplete="email" />
          </div>
          {mode === 'register' && (
            <div>
              <Label htmlFor="phone" className="text-[#0A1F44] font-medium text-xs sm:text-sm">رقم الهاتف</Label>
              <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+967 7XX XXX XXX" className="mt-1 h-11 sm:h-10 rounded-lg text-sm" dir="ltr" inputMode="tel" autoComplete="tel" />
            </div>
          )}
          {mode === 'register' && (
            <div>
              <Label htmlFor="affiliate" className="text-[#0A1F44] font-medium text-xs sm:text-sm">كود الدعوة (اختياري)</Label>
              <Input id="affiliate" value={form.affiliateCode} onChange={(e) => setForm({ ...form, affiliateCode: e.target.value })} placeholder="FIA-XXXX" className="mt-1 h-11 sm:h-10 rounded-lg text-sm font-mono" dir="ltr" />
              {form.affiliateCode && <p className="text-[10px] text-green-600 mt-1">✓ تمت إضافته تلقائياً من رابط الدعوة</p>}
            </div>
          )}
          <div>
            <Label htmlFor="password" className="text-[#0A1F44] font-medium text-xs sm:text-sm">كلمة المرور</Label>
            <Input id="password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" className="mt-1 h-11 sm:h-10 rounded-lg text-sm" dir="ltr" autoComplete="current-password" onKeyDown={(e) => { if (e.key === 'Enter') submit() }} />
          </div>
          <Button
            onClick={submit}
            disabled={loading}
            className="w-full bg-gradient-to-r from-[#0A1F44] to-[#102a63] hover:from-[#102a63] hover:to-[#0A1F44] text-white h-12 sm:h-11 text-sm font-semibold rounded-lg active:scale-[0.98] transition-all shadow-md hover:shadow-lg"
          >
            {loading ? 'جاري المعالجة...' : mode === 'login' ? 'تسجيل الدخول' : 'إنشاء الحساب'}
          </Button>
        </div>

        {/* ⚡ PROFESSIONAL QUICK LINKS — each link is a polished button
            with a gradient icon, hover animation, and professional card
            styling. Clicking any of them opens a beautiful modal
            (QuickLinkCard) with the relevant content.

            Performance: these are pure CSS gradients (no images), so
            they render instantly. No animation libraries — we use
            Tailwind's transition + hover effects which are GPU-
            accelerated and don't affect Realtime performance. */}
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
    </div>
  )
}
