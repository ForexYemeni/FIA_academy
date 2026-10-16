'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth-store'
import {
  Shield, Clock, Users, Award, User, UserPlus, Phone, Mail,
  ChevronLeft, X, Eye, Target, Heart, FileText, RefreshCw, LifeBuoy,
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
  const [activeCard, setActiveCard] = useState<string | null>(null)
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

  return (
    <div className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-white px-4 py-8">
      <div className="w-full max-w-md space-y-6">
        {/* Logo centered — moderate size */}
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

        {/* Quick links — open as professional cards */}
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
              <button key={link.id} onClick={() => setActiveCard(link.id)}
                className="text-xs text-gray-500 hover:text-[#C9A961] transition-colors py-2 rounded-lg hover:bg-gray-50">
                {link.label}
              </button>
            ))}
          </div>
        </div>

        {/* Contact info */}
        {(settings.phone || settings.email) && (
          <div className="flex items-center gap-4 justify-center pt-2">
            {settings.phone && (
              <a href={`tel:${settings.phone}`} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-[#0A1F44]">
                <Phone className="w-3 h-3 text-[#C9A961]" /><span dir="ltr">{settings.phone}</span>
              </a>
            )}
            {settings.email && (
              <a href={`mailto:${settings.email}`} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-[#0A1F44]">
                <Mail className="w-3 h-3 text-[#C9A961]" /><span dir="ltr" className="truncate max-w-[150px]">{settings.email}</span>
              </a>
            )}
          </div>
        )}
      </div>

      {/* === Quick Link Cards (Dialog overlays) === */}
      <QuickLinkCard cardId={activeCard} onClose={() => setActiveCard(null)} settings={settings} />
    </div>
  )
}

// ============== Quick Link Card — professional Dialog overlay ==============
function QuickLinkCard({ cardId, onClose, settings }: { cardId: string | null; onClose: () => void; settings: any }) {
  if (!cardId) return null

  const meta: Record<string, { title: string; icon: any }> = {
    about: { title: 'من نحن', icon: Award },
    privacy: { title: 'سياسة الخصوصية', icon: Shield },
    terms: { title: 'شروط الاستخدام', icon: FileText },
    refund: { title: 'سياسة الاسترداد', icon: RefreshCw },
    support: { title: 'الدعم والمساعدة', icon: LifeBuoy },
    social: { title: 'تابعنا', icon: Users },
  }

  const m = meta[cardId]
  if (!m) return null
  const Icon = m.icon

  // Content per card type
  const getContent = () => {
    if (cardId === 'about') {
      return (
        <div className="space-y-4">
          {[
            { icon: Eye, title: 'رؤيتنا', text: settings.about_vision || 'لم تتم إضافة رؤيتنا بعد.' },
            { icon: Target, title: 'رسالتنا', text: settings.about_mission || 'لم تتم إضافة رسالتنا بعد.' },
            { icon: Heart, title: 'قيمنا', text: settings.about_values || 'لم تتم إضافة قيمنا بعد.' },
            { icon: Users, title: 'فريقنا', text: settings.about_team || 'لم تتم إضافة فريقنا بعد.' },
          ].map((item, i) => {
            const ItemIcon = item.icon
            return (
              <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="w-10 h-10 rounded-xl bg-[#0A1F44] flex items-center justify-center flex-shrink-0">
                  <ItemIcon className="w-5 h-5 text-[#C9A961]" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-[#0A1F44] text-sm mb-1">{item.title}</h4>
                  <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">{item.text}</p>
                </div>
              </div>
            )
          })}
        </div>
      )
    }
    if (cardId === 'social') {
      const socials = [
        { key: 'facebook', name: 'فيسبوك', enabled: settings.social_facebook_enabled, url: settings.social_facebook, color: '#1877F2',
          icon: <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg> },
        { key: 'telegram', name: 'تيليجرام', enabled: settings.social_telegram_enabled, url: settings.social_telegram, color: '#0088cc',
          icon: <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z"/></svg> },
        { key: 'whatsapp', name: 'واتساب', enabled: settings.social_whatsapp_enabled, url: settings.social_whatsapp, color: '#25D366',
          icon: <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297.149-1.255.362-1.255.362-.49.139-.614.471-.021.789.595.316 1.123.767 1.437 1.387.314.62.349 1.392.07 2.068-.279.676-.84 1.215-1.55 1.508-.71.293-1.523.335-2.282.124-.76-.211-1.443-.67-1.962-1.295-.52-.625-.852-1.392-.955-2.21-.103-.818.021-1.646.356-2.388.335-.742.873-1.375 1.547-1.817.674-.442 1.465-.672 2.27-.66.805.012 1.602.264 2.27.715l.02-.02c-.297-.149-1.255-.362-1.255-.362z M12.02 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12.02 0zm.01 21.82c-5.42 0-9.82-4.4-9.82-9.82S6.6 2.18 12.02 2.18s9.82 4.4 9.82 9.82-4.4 9.82-9.82 9.82z"/></svg> },
        { key: 'sms', name: 'رسائل نصية', enabled: settings.social_sms_enabled, url: settings.social_sms, color: '#34A853',
          icon: <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V8h16v10zm-2-5c0 .55-.45 1-1 1h-2c-.55 0-1-.45-1-1s.45-1 1-1h2c.55 0 1 .45 1 1zm-6 0c0 .55-.45 1-1 1H7c-.55 0-1-.45-1-1s.45-1 1-1h4c.55 0 1 .45 1 1z"/></svg> },
      ]

      const activeSocials = socials.filter((s) => s.enabled && s.url)
      if (activeSocials.length === 0) {
        return <p className="text-sm text-gray-500 text-center py-8">لم تتم إضافة روابط التواصل بعد. يمكنك إضافتها من لوحة الإدارة.</p>
      }

      return (
        <div className="grid grid-cols-2 gap-3">
          {activeSocials.map((s) => {
            const href = s.key === 'telegram'
              ? (s.url.startsWith('http') ? s.url : `https://t.me/${s.url.replace('@', '')}`)
              : s.key === 'whatsapp'
              ? (s.url.startsWith('http') ? s.url : `https://wa.me/${s.url.replace(/[^0-9]/g, '')}`)
              : s.key === 'sms'
              ? `sms:${s.url}`
              : s.url
            return (
              <a key={s.key} href={href} target="_blank" rel="noopener noreferrer"
                className="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all hover:shadow-md"
                style={{ borderColor: s.color + '40', backgroundColor: s.color + '08' }}>
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: s.color }}>
                  {s.icon}
                </div>
                <span className="text-xs font-semibold text-gray-700">{s.name}</span>
              </a>
            )
          })}
        </div>
      )
    }

    // Policy cards (privacy, terms, refund, support)
    const fieldMap: Record<string, string> = {
      privacy: 'policy_privacy',
      terms: 'policy_terms',
      refund: 'policy_refund',
      support: 'policy_support',
    }
    const content = settings[fieldMap[cardId]] || 'هذا المحتوى قيد التحضير. سيتم تحديثه قريباً.'

    return (
      <div className="p-4 bg-gray-50 rounded-xl">
        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{content}</p>
      </div>
    )
  }

  return (
    <Dialog open={!!cardId} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-[#0A1F44] flex items-center justify-center">
              <Icon className="w-5 h-5 text-[#C9A961]" />
            </div>
            <DialogTitle className="text-lg font-bold text-[#0A1F44]">{m.title}</DialogTitle>
          </div>
        </DialogHeader>
        {getContent()}

        {/* Contact CTA for policy cards */}
        {['privacy', 'terms', 'refund', 'support'].includes(cardId) && settings.email && (
          <div className="mt-4 pt-4 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-500 mb-2">لأي استفسار بخصوص {m.title}</p>
            <a href={`mailto:${settings.email}`} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0A1F44]/5 border border-[#C9A961]/20 text-sm font-medium text-[#0A1F44] hover:bg-[#0A1F44]/10 transition-colors">
              <Mail className="w-4 h-4 text-[#C9A961]" /> راسلنا
            </a>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
