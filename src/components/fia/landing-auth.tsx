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
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' })
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
  }, [])

  const submit = async () => {
    setLoading(true)
    try {
      const url = mode === 'login' ? '/api/auth/login' : '/api/auth/register'
      const payload = mode === 'login'
        ? { email: form.email, password: form.password }
        : { name: form.name, email: form.email, password: form.password, phone: form.phone }
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'فشل العملية'); return }
      setAuth(data.user, data.token)
      toast.success(mode === 'login' ? `مرحباً ${data.user.name}` : 'تم إنشاء الحساب بنجاح')
    } catch { toast.error('حدث خطأ غير متوقع') }
    finally { setLoading(false) }
  }

  const academyName = settings.academy_name || 'أكاديمية المستقبل الدولية'
  const academyNameEn = settings.academy_name_en || 'FUTURE INTERNATIONAL ACADEMY'

  // Navigate to a quick link via hash (triggers QuickLinkCard in page.tsx)
  const goToCard = (id: string) => { window.location.hash = id }

  return (
    <div className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-white px-4 py-8">
      <div className="w-full max-w-md space-y-6">
        {/* Logo centered */}
        <div className="text-center">
          <img src="/fia/logo-fia.png" alt="FIA" className="h-20 w-20 mx-auto rounded-2xl shadow-md object-cover mb-3" />
          <h2 className="text-2xl font-bold text-[#0A1F44]">
            {mode === 'login' ? 'مرحباً بعودتك' : 'انضم إلى الأكاديمية'}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {mode === 'login' ? 'ادخل بياناتك للوصول إلى حسابك' : 'أنشئ حسابك للوصول إلى الدورات المعتمدة'}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 p-1.5 bg-gray-100 rounded-2xl">
          <button onClick={() => setMode('register')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all ${mode === 'register' ? 'bg-[#0A1F44] text-[#C9A961] shadow-md' : 'text-gray-600'}`}>
            <UserPlus className="w-4 h-4" /> حساب جديد
          </button>
          <button onClick={() => setMode('login')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all ${mode === 'login' ? 'bg-[#0A1F44] text-[#C9A961] shadow-md' : 'text-gray-600'}`}>
            <User className="w-4 h-4" /> دخول
          </button>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {mode === 'register' && (
            <div>
              <Label htmlFor="name" className="text-[#0A1F44] font-medium text-sm">الاسم الكامل</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="مثال: محمد أحمد" className="mt-1.5 h-12 rounded-xl" />
            </div>
          )}
          <div>
            <Label htmlFor="email" className="text-[#0A1F44] font-medium text-sm">البريد الإلكتروني</Label>
            <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="example@fia.edu" className="mt-1.5 h-12 rounded-xl" dir="ltr" />
          </div>
          {mode === 'register' && (
            <div>
              <Label htmlFor="phone" className="text-[#0A1F44] font-medium text-sm">رقم الهاتف</Label>
              <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+967 7XX XXX XXX" className="mt-1.5 h-12 rounded-xl" dir="ltr" />
            </div>
          )}
          <div>
            <Label htmlFor="password" className="text-[#0A1F44] font-medium text-sm">كلمة المرور</Label>
            <Input id="password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" className="mt-1.5 h-12 rounded-xl" dir="ltr" onKeyDown={(e) => { if (e.key === 'Enter') submit() }} />
          </div>
          <Button onClick={submit} disabled={loading} className="w-full bg-[#0A1F44] hover:bg-[#102a63] text-white h-12 text-base font-semibold rounded-xl">
            {loading ? 'جاري المعالجة...' : mode === 'login' ? 'تسجيل الدخول' : 'إنشاء الحساب'}
          </Button>
        </div>

        {/* Quick links — trigger hash navigation → QuickLinkCard in page.tsx */}
        <div className="border-t border-gray-100 pt-4">
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'about', label: 'من نحن' },
              { id: 'privacy', label: 'الخصوصية' },
              { id: 'terms', label: 'الشروط' },
              { id: 'refund', label: 'الاسترداد' },
              { id: 'support', label: 'الدعم' },
              { id: 'social', label: 'تابعنا' },
            ].map((link) => (
              <button key={link.id} onClick={() => goToCard(link.id)}
                className="text-xs text-gray-500 hover:text-[#C9A961] transition-colors py-2 rounded-lg hover:bg-gray-50">
                {link.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
