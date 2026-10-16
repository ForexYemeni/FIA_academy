'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth-store'
import {
  Shield, Clock, Users, Award, ChevronLeft, User, UserPlus, Phone, Mail,
} from 'lucide-react'

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
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'فشل العملية')
        return
      }
      setAuth(data.user, data.token)
      toast.success(mode === 'login' ? `مرحباً ${data.user.name}` : 'تم إنشاء الحساب بنجاح')
    } catch (e) {
      toast.error('حدث خطأ غير متوقع')
    } finally {
      setLoading(false)
    }
  }

  const academyName = settings.academy_name || 'أكاديمية المستقبل الدولية'
  const academyNameEn = settings.academy_name_en || 'FUTURE INTERNATIONAL ACADEMY'

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-stretch">
      {/* === LEFT: Premium brand showcase === */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-[#0A1F44] via-[#102a63] to-[#020A15] text-white overflow-hidden">
        {/* Decorative glows */}
        <div className="absolute top-20 left-20 w-72 h-72 bg-[#C9A961]/8 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-[#C9A961]/5 rounded-full blur-3xl" />
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: 'linear-gradient(#C9A961 1px, transparent 1px), linear-gradient(90deg, #C9A961 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />

        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 w-full">
          {/* Top: Logo + Academy name */}
          <div className="flex items-center gap-4">
            <img src="/fia/logo-fia.png" alt="FIA" className="h-16 w-16 object-cover rounded-xl" />
            <div>
              <div className="font-bold text-xl">{academyName}</div>
              <div className="text-[#C9A961] text-xs font-semibold tracking-[0.15em]">{academyNameEn}</div>
            </div>
          </div>

          {/* Middle: Main headline */}
          <div className="space-y-6 my-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#C9A961]/10 border border-[#C9A961]/20 rounded-full">
              <Award className="w-4 h-4 text-[#C9A961]" />
              <span className="text-sm text-[#C9A961]/90 font-medium">منصة تعليم طبي معتمدة</span>
            </div>

            <h1 className="text-4xl xl:text-5xl font-extrabold leading-tight">
              منصة التعليم
              <br />
              الطبي <span className="text-[#C9A961]">المعتمدة</span>
            </h1>

            <p className="text-lg text-white/60 leading-relaxed max-w-lg">
              دورات تدريبية احترافية في الإنعاش القلبي الرئوي، التمريض السريري، مكافحة العدوى، طب الطوارئ، الصيدلة السريرية وإدارة المنشآت الصحية.
            </p>

            {/* Real stats */}
            <div className="flex items-center gap-8 pt-4">
              <div className="text-center">
                <div className="text-3xl xl:text-4xl font-extrabold text-[#C9A961]">{courses.length}</div>
                <div className="text-xs text-white/50 mt-1">دورة تدريبية</div>
              </div>
              <div className="h-12 w-px bg-white/10" />
              <div className="text-center">
                <div className="text-3xl xl:text-4xl font-extrabold text-[#C9A961]">{trainers.length}</div>
                <div className="text-xs text-white/50 mt-1">مدرب معتمد</div>
              </div>
              <div className="h-12 w-px bg-white/10" />
              <div className="text-center">
                <div className="text-3xl xl:text-4xl font-extrabold text-[#C9A961]">{founder ? '1' : '0'}</div>
                <div className="text-xs text-white/50 mt-1">المؤسس</div>
              </div>
            </div>
          </div>

          {/* Bottom: Features */}
          <div className="space-y-3">
            {[
              { icon: Shield, text: 'محتوى معتمد وموثوق' },
              { icon: Clock, text: 'وصول مدى الحياة للمحتوى' },
              { icon: Users, text: 'مدربون من نخبة الأطباء' },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-3 text-white/70">
                <div className="w-8 h-8 rounded-lg bg-[#C9A961]/15 border border-[#C9A961]/20 flex items-center justify-center flex-shrink-0">
                  <f.icon className="w-4 h-4 text-[#C9A961]" />
                </div>
                <span className="text-sm">{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* === RIGHT: Login/Register form === */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-gradient-to-b from-white to-gray-50">
        <div className="w-full max-w-md space-y-6">
          {/* Logo centered */}
          <div className="text-center">
            <img src="/fia/logo-fia.png" alt="FIA" className="h-20 w-20 mx-auto rounded-2xl shadow-lg mb-4 object-cover" />
            <h2 className="text-2xl font-bold text-[#0A1F44]">
              {mode === 'login' ? 'مرحباً بعودتك' : 'انضم إلى الأكاديمية'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {mode === 'login' ? 'ادخل بياناتك للوصول إلى حسابك ودوراتك' : 'أنشئ حسابك للوصول إلى الدورات المعتمدة'}
            </p>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 p-1.5 bg-gray-100 rounded-2xl">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all ${
                mode === 'login' ? 'bg-[#0A1F44] text-[#C9A961] shadow-md' : 'text-gray-600 hover:text-[#0A1F44]'
              }`}
            >
              <User className="w-4 h-4" /> دخول
            </button>
            <button
              onClick={() => setMode('register')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all ${
                mode === 'register' ? 'bg-[#0A1F44] text-[#C9A961] shadow-md' : 'text-gray-600 hover:text-[#0A1F44]'
              }`}
            >
              <UserPlus className="w-4 h-4" /> حساب جديد
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

          {/* Quick links */}
          <div className="border-t border-gray-100 pt-4">
            <div className="grid grid-cols-2 gap-2">
              <a href="#about" className="text-xs text-gray-500 hover:text-[#C9A961] transition-colors flex items-center gap-1">من نحن</a>
              <a href="#privacy" className="text-xs text-gray-500 hover:text-[#C9A961] transition-colors flex items-center gap-1">الخصوصية</a>
              <a href="#terms" className="text-xs text-gray-500 hover:text-[#C9A961] transition-colors flex items-center gap-1">الشروط</a>
              <a href="#refund" className="text-xs text-gray-500 hover:text-[#C9A961] transition-colors flex items-center gap-1">الاسترداد</a>
              <a href="#support" className="text-xs text-gray-500 hover:text-[#C9A961] transition-colors flex items-center gap-1">الدعم</a>
              {settings.email && (
                <a href={`mailto:${settings.email}`} className="text-xs text-gray-500 hover:text-[#C9A961] transition-colors flex items-center gap-1">راسلنا</a>
              )}
            </div>
          </div>

          {/* Contact */}
          {(settings.phone || settings.email) && (
            <div className="flex items-center gap-4 justify-center pt-2">
              {settings.phone && (
                <a href={`tel:${settings.phone}`} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-[#0A1F44] transition-colors">
                  <Phone className="w-3 h-3 text-[#C9A961]" /><span dir="ltr">{settings.phone}</span>
                </a>
              )}
              {settings.email && (
                <a href={`mailto:${settings.email}`} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-[#0A1F44] transition-colors">
                  <Mail className="w-3 h-3 text-[#C9A961]" /><span dir="ltr" className="truncate max-w-[150px]">{settings.email}</span>
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
