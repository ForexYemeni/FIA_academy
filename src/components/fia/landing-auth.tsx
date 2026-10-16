'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth-store'
import {
  Shield, Award, Users, Clock, BookOpen, GraduationCap, Stethoscope,
  HeartPulse, CheckCircle2, Star, Phone, Mail, MapPin,
  ChevronLeft, User, Lock, UserPlus,
} from 'lucide-react'

type Course = {
  id: string
  title: string
  short_description?: string
  price: number
  currency?: string
  duration_hours?: number
  level?: string
  rating?: number
  enrolled?: number
  cover?: string
  price_type?: string
  status: string
}

type Trainer = {
  id: string
  name: string
  title?: string
  specialization?: string
  bio?: string
  avatar?: string
  courses_count?: number
  years_experience?: number
}

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
    // Fetch REAL data only — no fake stats
    fetch('/api/courses').then((r) => r.json()).then((d) => setCourses(Array.isArray(d) ? d : [])).catch(() => {})
    fetch('/api/trainers').then((r) => r.json()).then((d) => setTrainers(Array.isArray(d) ? d : [])).catch(() => {})
    fetch('/api/team?role=founder').then((r) => r.json()).then((d) => { if (Array.isArray(d) && d.length > 0) setFounder(d[0]) }).catch(() => {})
    fetch('/api/site-settings').then((r) => r.json()).then(setSettings).catch(() => {})
  }, [])

  const submit = async () => {
    setLoading(true)
    try {
      const url = mode === 'login' ? '/api/auth/login' : '/api/auth/register'
      const payload =
        mode === 'login'
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
  const academyShort = settings.academy_short || 'FIA'

  return (
    <div className="min-h-[calc(100vh-80px)] grid lg:grid-cols-2">
      {/* === LEFT SIDE: Premium brand showcase === */}
      <div className="relative bg-gradient-to-br from-navy via-navy-light to-navy text-white overflow-hidden p-8 lg:p-16 flex flex-col justify-between">
        {/* Decorative background elements */}
        <div className="absolute inset-0 bg-fia-radial opacity-50" />
        <div className="absolute top-10 left-10 w-64 h-64 bg-gold/8 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-80 h-80 bg-gold/5 rounded-full blur-3xl" />
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(#C9A961 1px, transparent 1px), linear-gradient(90deg, #C9A961 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

        <div className="relative space-y-8 z-10">
          {/* Logo + Academy name */}
          <div className="flex items-center gap-4">
            <img src="/fia/logo-premium.svg" alt="FIA" className="h-16 w-16 object-contain rounded-xl" />
            <div>
              <div className="font-bold text-xl">{academyName}</div>
              <div className="text-gold text-xs font-semibold tracking-[0.15em]">{academyNameEn}</div>
            </div>
          </div>

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gold/10 border border-gold/20 rounded-full">
            <Award className="w-4 h-4 text-gold" />
            <span className="text-sm text-gold/90 font-medium">منصة تعليم طبي معتمدة</span>
          </div>

          {/* Main headline */}
          <div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight">
              منصة التعليم
              <br />
              الطبي <span className="text-gold">المعتمدة</span>
            </h1>
            <p className="text-lg text-white/70 leading-relaxed max-w-xl mt-4">
              دورات تدريبية احترافية في الإنعاش القلبي الرئوي، التمريض السريري، مكافحة العدوى، طب الطوارئ، الصيدلة السريرية وإدارة المنشآت الصحية.
            </p>
          </div>

          {/* Real stats — from DB */}
          <div className="flex items-center gap-8 pt-4">
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-extrabold text-gold">{courses.length}</div>
              <div className="text-xs text-white/60 mt-1">دورة تدريبية</div>
            </div>
            <div className="h-12 w-px bg-white/10" />
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-extrabold text-gold">{trainers.length}</div>
              <div className="text-xs text-white/60 mt-1">مدرب معتمد</div>
            </div>
            <div className="h-12 w-px bg-white/10" />
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-extrabold text-gold">{founder ? '1' : '0'}</div>
              <div className="text-xs text-white/60 mt-1">المؤسس</div>
            </div>
          </div>
        </div>

        {/* Features at bottom */}
        <div className="relative space-y-3 mt-8 z-10">
          {[
            { icon: Shield, text: 'شهادات قابلة للتحقق إلكترونياً' },
            { icon: Clock, text: 'وصول مدى الحياة للمحتوى التعليمي' },
            { icon: Users, text: 'مدربون من نخبة الأطباء والاستشاريين' },
          ].map((f, i) => (
            <div key={i} className="flex items-center gap-3 text-white/80">
              <div className="w-8 h-8 rounded-lg bg-gold/15 border border-gold/20 flex items-center justify-center flex-shrink-0">
                <f.icon className="w-4 h-4 text-gold" />
              </div>
              <span className="text-sm">{f.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* === RIGHT SIDE: Clean login/register form === */}
      <div className="p-6 lg:p-12 flex items-center justify-center bg-gradient-to-b from-white to-muted/20">
        <div className="w-full max-w-md space-y-6">
          {/* Logo centered */}
          <div className="text-center">
            <img src="/fia/logo-premium.svg" alt="FIA" className="h-16 w-16 mx-auto rounded-xl mb-3" />
          </div>

          {/* Tabs: login / register */}
          <div className="flex gap-2 p-1 bg-muted/40 rounded-xl">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold transition-all ${
                mode === 'login' ? 'bg-navy text-gold shadow-md' : 'text-navy/70 hover:text-navy'
              }`}
            >
              <User className="w-4 h-4" /> تسجيل الدخول
            </button>
            <button
              onClick={() => setMode('register')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold transition-all ${
                mode === 'register' ? 'bg-navy text-gold shadow-md' : 'text-navy/70 hover:text-navy'
              }`}
            >
              <UserPlus className="w-4 h-4" /> إنشاء حساب
            </button>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-navy">
              {mode === 'login' ? 'مرحباً بعودتك' : 'انضم إلى الأكاديمية'}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {mode === 'login'
                ? 'ادخل بياناتك للوصول إلى لوحة التحكم ودوراتك'
                : 'أنشئ حسابك للوصول إلى الدورات التدريبية المعتمدة'}
            </p>
          </div>

          {/* Form */}
          <div className="space-y-4">
            {mode === 'register' && (
              <div>
                <Label htmlFor="name" className="text-navy font-medium">الاسم الكامل</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="مثال: محمد أحمد"
                  className="mt-1.5 h-11"
                />
              </div>
            )}
            <div>
              <Label htmlFor="email" className="text-navy font-medium">البريد الإلكتروني</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="example@fia.edu"
                className="mt-1.5 h-11"
                dir="ltr"
              />
            </div>
            {mode === 'register' && (
              <div>
                <Label htmlFor="phone" className="text-navy font-medium">رقم الهاتف</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+967 7XX XXX XXX"
                  className="mt-1.5 h-11"
                  dir="ltr"
                />
              </div>
            )}
            <div>
              <Label htmlFor="password" className="text-navy font-medium">كلمة المرور</Label>
              <Input
                id="password"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                className="mt-1.5 h-11"
                dir="ltr"
                onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
              />
            </div>
            <Button onClick={submit} disabled={loading} className="w-full bg-navy hover:bg-navy-light text-white h-12 text-base font-semibold rounded-lg">
              {loading ? 'جاري المعالجة...' : mode === 'login' ? 'دخول' : 'إنشاء الحساب'}
            </Button>
          </div>

          {/* Quick links */}
          <div className="border-t border-border pt-4">
            <h3 className="text-sm font-bold text-navy mb-3">روابط سريعة</h3>
            <div className="grid grid-cols-2 gap-2">
              <a href="#about" className="text-xs text-navy/70 hover:text-gold transition-colors flex items-center gap-1">
                <ChevronLeft className="w-3 h-3" /> من نحن
              </a>
              <a href="#privacy" className="text-xs text-navy/70 hover:text-gold transition-colors flex items-center gap-1">
                <ChevronLeft className="w-3 h-3" /> سياسة الخصوصية
              </a>
              <a href="#terms" className="text-xs text-navy/70 hover:text-gold transition-colors flex items-center gap-1">
                <ChevronLeft className="w-3 h-3" /> شروط الاستخدام
              </a>
              <a href="#refund" className="text-xs text-navy/70 hover:text-gold transition-colors flex items-center gap-1">
                <ChevronLeft className="w-3 h-3" /> سياسة الاسترداد
              </a>
              <a href="#support" className="text-xs text-navy/70 hover:text-gold transition-colors flex items-center gap-1">
                <ChevronLeft className="w-3 h-3" /> الدعم
              </a>
              {settings.email && (
                <a href={`mailto:${settings.email}`} className="text-xs text-navy/70 hover:text-gold transition-colors flex items-center gap-1">
                  <ChevronLeft className="w-3 h-3" /> راسلنا
                </a>
              )}
            </div>
          </div>

          {/* Contact info (real from settings) */}
          {(settings.phone || settings.email) && (
            <div className="border-t border-border pt-4 flex items-center gap-4 justify-center">
              {settings.phone && (
                <a href={`tel:${settings.phone}`} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-navy transition-colors">
                  <Phone className="w-3 h-3 text-gold" />
                  <span dir="ltr">{settings.phone}</span>
                </a>
              )}
              {settings.email && (
                <a href={`mailto:${settings.email}`} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-navy transition-colors">
                  <Mail className="w-3 h-3 text-gold" />
                  <span dir="ltr" className="truncate max-w-[150px]">{settings.email}</span>
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
