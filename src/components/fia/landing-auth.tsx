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
      {/* === LEFT SIDE: Brand showcase + real stats === */}
      <div className="relative bg-navy text-white overflow-hidden p-8 lg:p-12 flex flex-col justify-between">
        <div className="absolute inset-0 bg-fia-radial" />
        <div className="absolute top-20 left-20 w-72 h-72 bg-gold/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-20 w-96 h-96 bg-gold/5 rounded-full blur-3xl" />

        <div className="relative space-y-6">
          <div className="flex items-center gap-3">
            <img src="/fia/logo-official.png" alt="FIA" className="h-14 w-auto object-contain" />
            <div>
              <div className="font-bold text-lg">{academyName}</div>
              <div className="text-gold text-xs font-semibold tracking-wider">{academyNameEn}</div>
            </div>
          </div>

          <Badge className="bg-gold/15 text-gold border-gold/30 hover:bg-gold/20">
            <Award className="w-4 h-4 ml-1" /> منصة تعليم طبي معتمدة
          </Badge>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight">
            منصة التعليم الطبي
            <br />
            <span className="text-fia-gradient">المعتمدة</span>
          </h1>

          <p className="text-lg text-white/80 leading-relaxed max-w-xl">
            نُقدّم دورات تدريبية احترافية في الإنعاش القلبي الرئوي، التمريض السريري، مكافحة العدوى، طب الطوارئ، صحة الأم والطفل، الصيدلة السريرية وإدارة المنشآت الصحية.
          </p>

          {/* Real stats — fetched from DB */}
          <div className="grid grid-cols-3 gap-4 pt-4">
            <div>
              <div className="text-2xl md:text-3xl font-extrabold text-gold">{courses.length}</div>
              <div className="text-xs md:text-sm text-white/70">دورة تدريبية</div>
            </div>
            <div>
              <div className="text-2xl md:text-3xl font-extrabold text-gold">{trainers.length}</div>
              <div className="text-xs md:text-sm text-white/70">مدرب معتمد</div>
            </div>
            <div>
              <div className="text-2xl md:text-3xl font-extrabold text-gold">{founder ? '1' : '0'}</div>
              <div className="text-xs md:text-sm text-white/70">المؤسس</div>
            </div>
          </div>
        </div>

        {/* Features list — clean and professional */}
        <div className="relative space-y-3 mt-8">
          <div className="flex items-center gap-3 text-white/90">
            <div className="w-8 h-8 rounded-lg bg-gold/20 flex items-center justify-center flex-shrink-0">
              <Shield className="w-4 h-4 text-gold" />
            </div>
            <span className="text-sm">شهادات قابلة للتحقق إلكترونياً</span>
          </div>
          <div className="flex items-center gap-3 text-white/90">
            <div className="w-8 h-8 rounded-lg bg-gold/20 flex items-center justify-center flex-shrink-0">
              <Clock className="w-4 h-4 text-gold" />
            </div>
            <span className="text-sm">وصول مدى الحياة للمحتوى</span>
          </div>
          <div className="flex items-center gap-3 text-white/90">
            <div className="w-8 h-8 rounded-lg bg-gold/20 flex items-center justify-center flex-shrink-0">
              <Users className="w-4 h-4 text-gold" />
            </div>
            <span className="text-sm">مدربون من نخبة الأطباء</span>
          </div>
        </div>
      </div>

      {/* === RIGHT SIDE: Login/Register form + Quick links === */}
      <div className="p-6 lg:p-12 flex flex-col">
        <div className="max-w-md mx-auto w-full space-y-6">
          {/* Tabs: login / register */}
          <div className="flex gap-2 p-1 bg-muted/30 rounded-lg">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-semibold transition-all ${
                mode === 'login' ? 'bg-navy text-gold' : 'text-navy hover:bg-muted'
              }`}
            >
              <User className="w-4 h-4" /> تسجيل الدخول
            </button>
            <button
              onClick={() => setMode('register')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-semibold transition-all ${
                mode === 'register' ? 'bg-navy text-gold' : 'text-navy hover:bg-muted'
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
                <Label htmlFor="name" className="text-navy">الاسم الكامل</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="مثال: محمد أحمد"
                  className="mt-1"
                />
              </div>
            )}
            <div>
              <Label htmlFor="email" className="text-navy">البريد الإلكتروني</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="example@fia.edu"
                className="mt-1"
                dir="ltr"
              />
            </div>
            {mode === 'register' && (
              <div>
                <Label htmlFor="phone" className="text-navy">رقم الهاتف</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+967 7XX XXX XXX"
                  className="mt-1"
                  dir="ltr"
                />
              </div>
            )}
            <div>
              <Label htmlFor="password" className="text-navy">كلمة المرور</Label>
              <Input
                id="password"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                className="mt-1"
                dir="ltr"
                onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
              />
            </div>
            <Button onClick={submit} disabled={loading} className="w-full bg-navy hover:bg-navy-light text-white h-12 text-base">
              {loading ? 'جاري المعالجة...' : mode === 'login' ? 'دخول' : 'إنشاء الحساب'}
            </Button>
          </div>

          {/* Quick links — professional */}
          <div className="border-t border-border pt-4">
            <h3 className="text-sm font-bold text-navy mb-3">روابط سريعة</h3>
            <div className="grid grid-cols-2 gap-2">
              <a href="#about" className="text-xs text-navy hover:text-gold transition-colors flex items-center gap-1">
                <ChevronLeft className="w-3 h-3" /> من نحن
              </a>
              <a href="#privacy" className="text-xs text-navy hover:text-gold transition-colors flex items-center gap-1">
                <ChevronLeft className="w-3 h-3" /> سياسة الخصوصية
              </a>
              <a href="#terms" className="text-xs text-navy hover:text-gold transition-colors flex items-center gap-1">
                <ChevronLeft className="w-3 h-3" /> شروط الاستخدام
              </a>
              <a href="#refund" className="text-xs text-navy hover:text-gold transition-colors flex items-center gap-1">
                <ChevronLeft className="w-3 h-3" /> سياسة الاسترداد
              </a>
              <a href="#support" className="text-xs text-navy hover:text-gold transition-colors flex items-center gap-1">
                <ChevronLeft className="w-3 h-3" /> الدعم
              </a>
              {settings.email && (
                <a href={`mailto:${settings.email}`} className="text-xs text-navy hover:text-gold transition-colors flex items-center gap-1">
                  <ChevronLeft className="w-3 h-3" /> راسلنا
                </a>
              )}
            </div>
          </div>

          {/* Contact info (real from settings) */}
          {(settings.phone || settings.email || settings.address) && (
            <div className="border-t border-border pt-4 space-y-2">
              <h3 className="text-sm font-bold text-navy mb-2">معلومات التواصل</h3>
              {settings.phone && (
                <a href={`tel:${settings.phone}`} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-navy transition-colors">
                  <Phone className="w-3 h-3 text-gold" />
                  <span dir="ltr">{settings.phone}</span>
                </a>
              )}
              {settings.email && (
                <a href={`mailto:${settings.email}`} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-navy transition-colors">
                  <Mail className="w-3 h-3 text-gold" />
                  <span dir="ltr">{settings.email}</span>
                </a>
              )}
              {settings.address && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3 text-gold" />
                  <span>{settings.address}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
