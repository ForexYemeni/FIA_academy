'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth-store'
import { User, UserPlus } from 'lucide-react'

type Course = { id: string; title: string; status: string }
type Trainer = { id: string; name: string }

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
      className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-white px-4 py-6 sm:py-8"
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1rem)' }}
    >
      <div className="w-full max-w-sm sm:max-w-md space-y-4 sm:space-y-5">
        {/* Logo centered — compact, slightly bigger on mobile for impact */}
        <div className="text-center">
          <img
            src="/fia/logo-fia.png"
            alt="FIA"
            loading="eager"
            width={64}
            height={64}
            className="h-16 w-16 sm:h-20 sm:w-20 mx-auto rounded-xl shadow-md object-cover mb-2 sm:mb-3"
          />
          <h2 className="text-xl sm:text-2xl font-bold text-[#0A1F44]">
            {mode === 'login' ? 'مرحباً بعودتك' : 'انضم إلى الأكاديمية'}
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1">
            {mode === 'login' ? 'ادخل بياناتك للوصول إلى حسابك' : 'أنشئ حسابك للوصول إلى الدورات المعتمدة'}
          </p>
        </div>

        {/* Tabs — compact, with minimum 44px touch targets */}
        <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
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
            className="w-full bg-[#0A1F44] hover:bg-[#102a63] text-white h-12 sm:h-11 text-sm font-semibold rounded-lg active:scale-[0.98] transition-transform"
          >
            {loading ? 'جاري المعالجة...' : mode === 'login' ? 'تسجيل الدخول' : 'إنشاء الحساب'}
          </Button>
        </div>

        {/* Quick links — responsive grid with bigger touch targets on mobile */}
        <div className="border-t border-gray-100 pt-4">
          <div className="grid grid-cols-3 gap-1.5 sm:gap-1">
            {[
              { id: 'courses', label: 'دوراتنا' },
              { id: 'trainers', label: 'مدربونا' },
              { id: 'team', label: 'الفريق' },
              { id: 'about', label: 'من نحن' },
              { id: 'privacy', label: 'الخصوصية' },
              { id: 'terms', label: 'الشروط' },
              { id: 'refund', label: 'الاسترداد' },
              { id: 'support', label: 'الدعم' },
              { id: 'social', label: 'تابعنا' },
            ].map((link) => (
              <button
                key={link.id}
                onClick={() => goToCard(link.id)}
                className="text-[11px] sm:text-[11px] text-gray-600 hover:text-[#C9A961] transition-colors py-2.5 sm:py-1.5 rounded-lg hover:bg-gray-50 active:bg-gray-100"
              >
                {link.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
