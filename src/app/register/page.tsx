'use client'

// 👑👑👑 بوابة التسجيل الملكية — نوعان: متدرب / مدرب 👑👑👑

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth-store'
import { TrainerRegistration } from '@/components/fia/trainer-registration'
import {
  Crown, BookOpen, GraduationCap, User, ArrowRight, Sparkles, Loader2, Lock, BadgeCheck,
} from 'lucide-react'

type AccType = 'student' | 'trainer'

export default function RegisterPage() {
  const [type, setType] = useState<AccType>('student')
  const setAuth = useAuth((s) => s.setAuth)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' })

  useEffect(() => {
    try {
      const t = new URLSearchParams(window.location.search).get('type')
      if (t === 'trainer' || t === 'student') setType(t)
    } catch {}
  }, [])

  const submitStudent = async () => {
    if (!form.name.trim() || form.name.trim().length < 3) { toast.error('اكتب اسمك الكامل (3 أحرف على الأقل)'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) { toast.error('بريد إلكتروني غير صالح'); return }
    if (form.password.length < 6) { toast.error('كلمة المرور 6 أحرف على الأقل'); return }
    setLoading(true)
    try {
      let affiliateCode: string | undefined
      try { affiliateCode = localStorage.getItem('fia_ref_code') || undefined } catch {}
      const res = await fetch('/api/auth/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name.trim(), email: form.email.trim(), password: form.password, phone: form.phone.trim(), affiliate_code: affiliateCode }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'فشل إنشاء الحساب'); return }
      setAuth(data.user, data.token)
      try { localStorage.removeItem('fia_ref_code'); localStorage.removeItem('fia_ref_id') } catch {}
      toast.success(`👑 أهلاً بك في الأكاديمية يا ${data.user.name}`)
      // الموقع تطبيق صفحة واحدة — لوحات التحكم تُعرض في الرئيسية (كان /dashboard مساراً غير موجود → 404)
      window.location.href = '/'
    } catch { toast.error('حدث خطأ غير متوقع') }
    finally { setLoading(false) }
  }

  const inputCls =
    'h-12 rounded-xl border-[#C9A961]/35 bg-white/[0.07] text-white placeholder:text-white/35 focus-visible:border-[#C9A961] focus-visible:ring-[#C9A961]/25 text-sm'

  return (
    <div
      className="relative min-h-screen overflow-hidden bg-gradient-to-b from-[#0A1F44] via-[#0C2452] to-[#051429] px-4 py-8 sm:py-12"
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 2rem)' }}
      dir="rtl"
    >
      {/* الخلفية الملكية */}
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

      <div className="relative mx-auto flex w-full max-w-2xl flex-col items-center">
        {/* العنوان الملكي */}
        <Link href="/" className="mb-5 flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-white/60 transition-all hover:bg-white/10">
          <ArrowRight className="h-3.5 w-3.5" /> العودة إلى الأكاديمية
        </Link>
        <div className="fia-lux-fadeup mb-7 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl border border-[#C9A961]/50 bg-gradient-to-br from-[#C9A961]/25 to-transparent shadow-[0_0_50px_rgba(201,169,97,0.35)]">
            <Crown className="h-10 w-10 text-[#E5C77E]" />
          </div>
          <h1 className="text-2xl font-extrabold text-white sm:text-3xl">
            إنشاء حساب في <span className="bg-gradient-to-l from-[#C9A961] to-[#E5C77E] bg-clip-text text-transparent">الأكاديمية</span>
          </h1>
          <p className="mt-2 text-sm text-white/60">اختر صفتك في الأكاديمية — متدرب يتعلم، أو مدرب ينضم إلى النخبة</p>
        </div>

        {/* اختيار النوع */}
        <div className="fia-lux-fadeup mb-6 grid w-full grid-cols-2 gap-3">
          <button
            onClick={() => setType('student')}
            className={`group relative overflow-hidden rounded-2xl border p-4 text-center transition-all active:scale-[0.98] ${
              type === 'student'
                ? 'border-[#C9A961]/70 bg-gradient-to-br from-[#C9A961]/20 to-transparent shadow-[0_0_35px_rgba(201,169,97,0.25)]'
                : 'border-white/12 bg-white/[0.04] hover:border-[#C9A961]/35'
            }`}
          >
            <div className={`mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl ${type === 'student' ? 'bg-gradient-to-br from-[#C9A961] to-[#E5C77E] text-[#0A1F44]' : 'bg-white/8 text-white/50'}`}>
              <BookOpen className="h-6 w-6" />
            </div>
            <p className={`text-sm font-extrabold ${type === 'student' ? 'text-[#E5C77E]' : 'text-white/75'}`}>متدرب</p>
            <p className="mt-1 text-[10px] leading-relaxed text-white/50">أسجل لتتعلم الدورات والشهادات</p>
            {type === 'student' && <BadgeCheck className="absolute left-3 top-3 h-5 w-5 text-[#E5C77E]" />}
          </button>
          <button
            onClick={() => setType('trainer')}
            className={`group relative overflow-hidden rounded-2xl border p-4 text-center transition-all active:scale-[0.98] ${
              type === 'trainer'
                ? 'border-[#C9A961]/70 bg-gradient-to-br from-[#C9A961]/20 to-transparent shadow-[0_0_35px_rgba(201,169,97,0.25)]'
                : 'border-white/12 bg-white/[0.04] hover:border-[#C9A961]/35'
            }`}
          >
            <div className={`mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl ${type === 'trainer' ? 'bg-gradient-to-br from-[#C9A961] to-[#E5C77E] text-[#0A1F44]' : 'bg-white/8 text-white/50'}`}>
              <GraduationCap className="h-6 w-6" />
            </div>
            <p className={`flex items-center justify-center gap-1 text-sm font-extrabold ${type === 'trainer' ? 'text-[#E5C77E]' : 'text-white/75'}`}>
              مدرب <Crown className="h-3.5 w-3.5" />
            </p>
            <p className="mt-1 text-[10px] leading-relaxed text-white/50">ملف احترافي + اتفاق أرباح + اعتماد</p>
            {type === 'trainer' && <BadgeCheck className="absolute left-3 top-3 h-5 w-5 text-[#E5C77E]" />}
          </button>
        </div>

        {/* النموذج حسب النوع */}
        {type === 'trainer' ? (
          <div className="w-full">
            <TrainerRegistration />
          </div>
        ) : (
          <div className="fia-lux-fadeup w-full rounded-3xl border border-[#C9A961]/35 bg-gradient-to-br from-[#0A1F44] via-[#12294f] to-[#0A1F44] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
            <div className="mb-5 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#C9A961]/50 bg-gradient-to-br from-[#C9A961]/25 to-transparent">
                <User className="h-7 w-7 text-[#E5C77E]" />
              </div>
              <h2 className="text-lg font-extrabold text-white">تسجيل متدرب جديد</h2>
              <p className="mt-1 text-xs text-white/55">رحلتك التعليمية تبدأ من هنا — خلال دقيقة واحدة</p>
            </div>
            <div className="space-y-3.5">
              <div>
                <Label className="text-xs font-semibold text-[#E5C77E]/85">الاسم الكامل *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="مثال: محمد أحمد محمد صالح" className={inputCls} autoComplete="name" />
                <p className="mt-1 flex items-center gap-1 text-[10px] text-white/45"><Lock className="h-3 w-3 text-[#C9A961]" /> الاسم يُثبَّت نهائياً بعد التسجيل — يظهر على شهادتك الرسمية</p>
              </div>
              <div>
                <Label className="text-xs font-semibold text-[#E5C77E]/85">البريد الإلكتروني *</Label>
                <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} type="email" dir="ltr" placeholder="example@fia.edu" className={inputCls} autoComplete="email" />
              </div>
              <div>
                <Label className="text-xs font-semibold text-[#E5C77E]/85">رقم الهاتف</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} dir="ltr" inputMode="tel" placeholder="+967 7XX XXX XXX" className={inputCls} autoComplete="tel" />
              </div>
              <div>
                <Label className="text-xs font-semibold text-[#E5C77E]/85">كلمة المرور *</Label>
                <Input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} type="password" dir="ltr" placeholder="••••••••" className={inputCls} autoComplete="new-password" onKeyDown={(e) => { if (e.key === 'Enter') submitStudent() }} />
              </div>
              <Button
                onClick={submitStudent}
                disabled={loading}
                className="relative h-12 w-full overflow-hidden rounded-xl bg-gradient-to-l from-[#C9A961] to-[#E5C77E] text-sm font-extrabold text-[#0A1F44] shadow-[0_8px_24px_rgba(201,169,97,0.35)] active:scale-[0.98] disabled:opacity-60"
              >
                {loading ? <><Loader2 className="ml-2 h-4 w-4 animate-spin" /> جاري التتويج...</> : <><Sparkles className="ml-2 h-4 w-4" /> إنشاء حساب المتدرب</>}
              </Button>
              <p className="text-center text-[11px] text-white/50">
                لديك حساب بالفعل؟ <a href="/" className="font-bold text-[#E5C77E] hover:underline">سجّل الدخول من هنا</a>
              </p>
            </div>
          </div>
        )}

        <p className="mt-6 text-center text-[10px] text-white/35">أكاديمية المستقبل الدولية — حيث تُصنع النخب 🏛️</p>
      </div>
    </div>
  )
}
