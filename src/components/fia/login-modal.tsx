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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex justify-center mb-2">
            <img src="/fia/logo-official.png" alt="FIA" className="h-16 w-auto object-contain" />
          </div>
          <DialogTitle className="text-center text-navy text-2xl font-bold">
            {mode === 'login' ? 'تسجيل الدخول' : 'إنشاء حساب جديد'}
          </DialogTitle>
          <DialogDescription className="text-center">
            {mode === 'login'
              ? 'ادخل بياناتك للوصول إلى لوحة التحكم'
              : 'انضم إلى أكاديمية المستقبل الدولية'}
          </DialogDescription>
        </DialogHeader>
        <Tabs value={mode} onValueChange={(v) => setMode(v as 'login' | 'register')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">دخول</TabsTrigger>
            <TabsTrigger value="register">تسجيل</TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="space-y-4 pt-4">
            <div>
              <Label htmlFor="email">البريد الإلكتروني</Label>
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
            <div>
              <Label htmlFor="password">كلمة المرور</Label>
              <Input
                id="password"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                className="mt-1"
                dir="ltr"
              />
            </div>
            <Button onClick={submit} disabled={loading} className="w-full bg-navy hover:bg-navy-light text-white">
              {loading ? 'جاري المعالجة...' : 'دخول'}
            </Button>
          </TabsContent>

          <TabsContent value="register" className="space-y-4 pt-4">
            <div>
              <Label htmlFor="name">الاسم الكامل</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="مثال: محمد أحمد"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="email">البريد الإلكتروني</Label>
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
            <div>
              <Label htmlFor="phone">رقم الهاتف</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+967 7XX XXX XXX"
                className="mt-1"
                dir="ltr"
              />
            </div>
            <div>
              <Label htmlFor="password">كلمة المرور</Label>
              <Input
                id="password"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                className="mt-1"
                dir="ltr"
              />
            </div>
            <Button onClick={submit} disabled={loading} className="w-full bg-navy hover:bg-navy-light text-white">
              {loading ? 'جاري المعالجة...' : 'إنشاء الحساب'}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
