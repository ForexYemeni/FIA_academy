'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  Sparkles, X, Mail, Lock, User, Phone, Loader2, KeyRound,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-store'

interface LoginModalProps {
  open: boolean
  onOpenChange: (o: boolean) => void
  onSuccess?: () => void
}

export function LoginModal({ open, onOpenChange, onSuccess }: LoginModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' })
  const [forgotOpen, setForgotOpen] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const setAuth = useAuth((s) => s.setAuth)

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
      onOpenChange(false)
      onSuccess?.()
    } catch (e) {
      toast.error('حدث خطأ غير متوقع')
    } finally {
      setLoading(false)
    }
  }

  const submitForgot = async () => {
    if (!forgotEmail.trim()) {
      toast.error('أدخل بريدك الإلكتروني')
      return
    }
    setForgotLoading(true)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'فشل إرسال الطلب')
        return
      }
      toast.success(data.message || 'وصل طلبك إلى الإدارة — ستتواصل معك الأكاديمية 👑')
      setForgotOpen(false)
      setForgotEmail('')
    } catch {
      toast.error('خطأ في الاتصال')
    } finally {
      setForgotLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 border-0 overflow-hidden rounded-3xl shadow-2xl" showCloseButton={false}>
        <div className="overflow-hidden rounded-lg">
          {/* ⚡ Magical navy gradient header with gold dot pattern */}
          <div className="relative bg-gradient-to-br from-navy via-navy-light to-navy px-5 pt-5 pb-6 overflow-hidden text-center">
            <div className="absolute inset-0 opacity-25" style={{
              backgroundImage: 'radial-gradient(circle at 12% 50%, #D4AF37 1.5px, transparent 1.5px), radial-gradient(circle at 88% 20%, white 1px, transparent 1px)',
              backgroundSize: '24px 24px, 18px 18px'
            }} />
            <div className="absolute -top-8 -right-8 w-32 h-32 bg-gold/15 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-gold/10 rounded-full blur-2xl pointer-events-none" />
            {/* Gold close button */}
            <button
              onClick={() => onOpenChange(false)}
              className="absolute top-3 left-3 w-9 h-9 rounded-lg bg-white/10 hover:bg-gold/20 flex items-center justify-center z-10 backdrop-blur-sm transition-all active:scale-95"
              aria-label="إغلاق"
            >
              <X className="w-4 h-4 text-gold" />
            </button>
            <DialogHeader className="border-0 bg-transparent p-0 text-center items-center">
              {/* v2.7: شعار الأكاديمية بإطار ذهبي متدرج + هالة نابضة */}
              <div className="relative inline-block mb-3">
                <div className="absolute -inset-2 bg-gold/25 rounded-full blur-xl animate-pulse" />
                <div className="relative rounded-2xl bg-gradient-to-br from-gold via-[#E5C77E] to-gold p-[2px] shadow-xl">
                  <img src="/fia/logo-fia.png" alt="FIA" width={56} height={56} className="h-14 w-14 rounded-[14px] object-cover" />
                </div>
              </div>
              <DialogTitle className="text-white text-2xl font-bold mb-1 flex items-center justify-center gap-2">
                {mode === 'login' ? 'تسجيل الدخول' : 'إنشاء حساب جديد'}
              </DialogTitle>
              <DialogDescription className="text-white/70 text-center">
                {mode === 'login'
                  ? 'ادخل بياناتك للوصول إلى لوحة التحكم'
                  : 'انضم إلى أكاديمية المستقبل الدولية'}
              </DialogDescription>
            </DialogHeader>
          </div>

          {/* Body — magical gradient background */}
          <div className="p-5 bg-gradient-to-b from-navy/5 to-white">
            <Tabs value={mode} onValueChange={(v) => setMode(v as 'login' | 'register')}>
              <TabsList className="grid w-full grid-cols-2 bg-navy/10 border border-gold/20 rounded-xl h-10 p-1">
                <TabsTrigger
                  value="login"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-navy data-[state=active]:to-navy-light data-[state=active]:text-gold data-[state=active]:shadow-md rounded-lg font-medium transition-all"
                >
                  دخول
                </TabsTrigger>
                <TabsTrigger
                  value="register"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-navy data-[state=active]:to-navy-light data-[state=active]:text-gold data-[state=active]:shadow-md rounded-lg font-medium transition-all"
                >
                  تسجيل
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="space-y-4 pt-4">
                <div>
                  <Label htmlFor="login-email" className="flex items-center gap-1.5 mb-1.5 text-navy font-medium">
                    <Mail className="w-3.5 h-3.5 text-gold" />
                    البريد الإلكتروني
                  </Label>
                  <Input
                    id="login-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="example@fia.edu"
                    className="rounded-xl border-gold/30 focus:border-gold focus:ring-gold/30"
                    dir="ltr"
                  />
                </div>
                <div>
                  <Label htmlFor="login-password" className="flex items-center gap-1.5 mb-1.5 text-navy font-medium">
                    <Lock className="w-3.5 h-3.5 text-gold" />
                    كلمة المرور
                  </Label>
                  <Input
                    id="login-password"
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="••••••••"
                    className="rounded-xl border-gold/30 focus:border-gold focus:ring-gold/30"
                    dir="ltr"
                  />
                </div>
                <Button
                  onClick={submit}
                  disabled={loading}
                  className="fia-lux-shine w-full bg-gradient-to-r from-navy to-navy-light hover:from-navy-light hover:to-navy text-gold rounded-xl shadow-md active:scale-[0.97] transition-all border border-gold/30 h-11"
                >
                  {loading ? <Loader2 className="w-4 h-4 ml-1 animate-spin" /> : <Sparkles className="w-4 h-4 ml-1" />}
                  {loading ? 'جاري المعالجة...' : 'دخول'}
                </Button>
                {/* 👑 بوابة الاستعادة الملكية */}
                <button
                  type="button"
                  onClick={() => { setForgotOpen(true); setForgotEmail(form.email) }}
                  className="w-full text-center text-xs text-navy/70 hover:text-gold font-medium transition-colors flex items-center justify-center gap-1.5"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  نسيت كلمة المرور؟ استعدها بخطوة واحدة
                </button>
              </TabsContent>

              <TabsContent value="register" className="space-y-4 pt-4">
                <div>
                  <Label htmlFor="reg-name" className="flex items-center gap-1.5 mb-1.5 text-navy font-medium">
                    <User className="w-3.5 h-3.5 text-gold" />
                    الاسم الكامل
                  </Label>
                  <Input
                    id="reg-name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="مثال: محمد أحمد محمد صالح"
                    className="rounded-xl border-gold/30 focus:border-gold focus:ring-gold/30"
                  />
                  <p className="text-[10px] text-amber-700 mt-1.5 flex items-center gap-1 font-medium">
                    <Sparkles className="w-3 h-3 text-gold" />
                    ملاحظة: يُفضّل كتابة الاسم الرباعي — فهو الذي يظهر على شهادتك الرسمية
                  </p>
                </div>
                <div>
                  <Label htmlFor="reg-email" className="flex items-center gap-1.5 mb-1.5 text-navy font-medium">
                    <Mail className="w-3.5 h-3.5 text-gold" />
                    البريد الإلكتروني
                  </Label>
                  <Input
                    id="reg-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="example@fia.edu"
                    className="rounded-xl border-gold/30 focus:border-gold focus:ring-gold/30"
                    dir="ltr"
                  />
                </div>
                <div>
                  <Label htmlFor="reg-phone" className="flex items-center gap-1.5 mb-1.5 text-navy font-medium">
                    <Phone className="w-3.5 h-3.5 text-gold" />
                    رقم الهاتف
                  </Label>
                  <Input
                    id="reg-phone"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+967 7XX XXX XXX"
                    className="rounded-xl border-gold/30 focus:border-gold focus:ring-gold/30"
                    dir="ltr"
                  />
                </div>
                <div>
                  <Label htmlFor="reg-password" className="flex items-center gap-1.5 mb-1.5 text-navy font-medium">
                    <Lock className="w-3.5 h-3.5 text-gold" />
                    كلمة المرور
                  </Label>
                  <Input
                    id="reg-password"
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="••••••••"
                    className="rounded-xl border-gold/30 focus:border-gold focus:ring-gold/30"
                    dir="ltr"
                  />
                </div>
                <Button
                  onClick={submit}
                  disabled={loading}
                  className="fia-lux-shine w-full bg-gradient-to-r from-navy to-navy-light hover:from-navy-light hover:to-navy text-gold rounded-xl shadow-md active:scale-[0.97] transition-all border border-gold/30 h-11"
                >
                  {loading ? <Loader2 className="w-4 h-4 ml-1 animate-spin" /> : <Sparkles className="w-4 h-4 ml-1" />}
                  {loading ? 'جاري المعالجة...' : 'إنشاء الحساب'}
                </Button>
                <a
                  href="/register?type=trainer"
                  className="group flex items-center justify-center gap-2 rounded-xl border border-gold/30 bg-gold/5 px-4 py-2.5 text-xs font-bold text-gold transition-all hover:bg-gold/10 active:scale-[0.98]"
                >
                  👑 تريد الانضمام مدرباً إلى النخبة؟ سجّل كمدرب بملفك الاحترافي الكامل
                </a>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>

      {/* 👑 حوار استعادة كلمة المرور الملكي */}
      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent className="sm:max-w-sm p-0 border-0 overflow-hidden rounded-3xl shadow-2xl">
          <div className="relative bg-gradient-to-br from-navy via-navy-light to-navy px-5 pt-5 pb-5 text-center overflow-hidden">
            <div className="absolute inset-0 opacity-25" style={{
              backgroundImage: 'radial-gradient(circle at 12% 50%, #D4AF37 1.5px, transparent 1.5px)',
              backgroundSize: '24px 24px'
            }} />
            <div className="relative w-14 h-14 mx-auto rounded-2xl bg-white/10 border border-gold/30 flex items-center justify-center mb-2">
              <KeyRound className="w-7 h-7 text-gold" />
            </div>
            <DialogTitle className="text-white text-xl font-bold">استعادة كلمة المرور</DialogTitle>
            <DialogDescription className="text-white/70 text-center mt-1">
              أدخل بريدك المسجّل — سيصل طلبك للإدارة فوراً وتصدر لك كلمة مرور جديدة
            </DialogDescription>
          </div>
          <div className="p-5 bg-gradient-to-b from-navy/5 to-white space-y-4">
            <div>
              <Label htmlFor="forgot-email" className="flex items-center gap-1.5 mb-1.5 text-navy font-medium">
                <Mail className="w-3.5 h-3.5 text-gold" />
                البريد الإلكتروني المسجّل
              </Label>
              <Input
                id="forgot-email"
                type="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="example@fia.edu"
                className="rounded-xl border-gold/30 focus:border-gold focus:ring-gold/30"
                dir="ltr"
                onKeyDown={(e) => { if (e.key === 'Enter') submitForgot() }}
              />
            </div>
            <Button
              onClick={submitForgot}
              disabled={forgotLoading}
              className="fia-lux-shine w-full bg-gradient-to-r from-navy to-navy-light hover:from-navy-light hover:to-navy text-gold rounded-xl shadow-md active:scale-[0.97] transition-all border border-gold/30 h-11"
            >
              {forgotLoading ? <Loader2 className="w-4 h-4 ml-1 animate-spin" /> : <Sparkles className="w-4 h-4 ml-1" />}
              {forgotLoading ? 'جاري الإرسال...' : 'أرسل طلب الاستعادة'}
            </Button>
            <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
              سيصل طلبك إلى قصر الإدارة باسمك وبريدك ورقم هاتفك المسجّل — وتواصل معك الأكاديمية لإصدار كلمة مرور جديدة.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}
