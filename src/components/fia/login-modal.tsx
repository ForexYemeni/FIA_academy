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
  Sparkles, X, Mail, Lock, User, Phone, Loader2,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 border-0 overflow-hidden" showCloseButton={false}>
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
              {/* Magical gold-glow Sparkles icon */}
              <div className="relative inline-block mb-3">
                <div className="absolute inset-0 bg-gold/20 rounded-full blur-xl animate-pulse" />
                <div className="relative w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-gold to-amber-500 flex items-center justify-center shadow-md border border-white/30">
                  <Sparkles className="w-7 h-7 text-navy" strokeWidth={2.2} />
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
                  className="w-full bg-gradient-to-r from-navy to-navy-light hover:from-navy-light hover:to-navy text-gold rounded-xl shadow-md active:scale-[0.97] transition-all border border-gold/20 h-11"
                >
                  {loading ? <Loader2 className="w-4 h-4 ml-1 animate-spin" /> : <Sparkles className="w-4 h-4 ml-1" />}
                  {loading ? 'جاري المعالجة...' : 'دخول'}
                </Button>
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
                    placeholder="مثال: محمد أحمد"
                    className="rounded-xl border-gold/30 focus:border-gold focus:ring-gold/30"
                  />
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
                  className="w-full bg-gradient-to-r from-navy to-navy-light hover:from-navy-light hover:to-navy text-gold rounded-xl shadow-md active:scale-[0.97] transition-all border border-gold/20 h-11"
                >
                  {loading ? <Loader2 className="w-4 h-4 ml-1 animate-spin" /> : <Sparkles className="w-4 h-4 ml-1" />}
                  {loading ? 'جاري المعالجة...' : 'إنشاء الحساب'}
                </Button>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
