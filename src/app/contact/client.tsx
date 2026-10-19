'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Phone, Mail, MapPin, Send, Loader2, Sparkles, MessageSquare } from 'lucide-react'

export default function ContactClient({ settings }: { settings: any }) {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (!form.name || !form.email || !form.message) {
      toast.error('الرجاء إدخال الاسم والبريد والرسالة')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'فشل الإرسال')
        return
      }
      toast.success('تم إرسال رسالتك بنجاح — سنتواصل معك قريباً')
      setForm({ name: '', email: '', subject: '', message: '' })
    } catch {
      toast.error('فشل الإرسال')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-navy/5 to-white" dir="rtl">
      {/* ⚡ Magical hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-navy via-navy-light to-navy text-white py-20">
        <div className="absolute inset-0 opacity-25" style={{
          backgroundImage: 'radial-gradient(circle at 12% 50%, #D4AF37 1.5px, transparent 1.5px), radial-gradient(circle at 88% 20%, white 1px, transparent 1px)',
          backgroundSize: '24px 24px, 18px 18px'
        }} />
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-gold/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-gold/10 rounded-full blur-2xl" />
        <div className="container mx-auto px-4 lg:px-6 text-center relative">
          <div className="inline-flex items-center gap-2 mb-3 px-3 py-1.5 rounded-full bg-gold/15 text-gold border border-gold/30 backdrop-blur-sm">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-bold">تواصل معنا</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight">
            <span className="bg-gradient-to-l from-white via-gold/90 to-white bg-clip-text text-transparent">
              تواصل معنا
            </span>
          </h1>
          <p className="text-white/70 text-lg max-w-3xl mx-auto">فريقنا جاهز للإجابة على استفساراتك في أي وقت</p>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-navy/5 to-transparent" />
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4 lg:px-6 max-w-5xl">
          {/* ⚡ Magical contact methods — 3 cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-12 fia-stagger">
            {[
              { icon: Phone, title: 'اتصل بنا', value: settings.phone || '+967 700 000 000', href: `tel:${settings.phone}`, gradient: 'from-emerald-600 to-teal-700' },
              { icon: Mail, title: 'راسلنا', value: settings.email || 'info@fia.edu', href: `mailto:${settings.email}`, gradient: 'from-blue-600 to-indigo-700' },
              { icon: MapPin, title: 'زورنا', value: settings.address || 'صنعاء، الجمهورية اليمنية', gradient: 'from-amber-600 to-orange-700' },
            ].map((c, i) => {
              const Icon = c.icon
              return (
                <Card key={i} className="fia-card-hover p-8 text-center border-2 border-gold/20 hover:border-gold/40 relative overflow-hidden">
                  <div className="absolute inset-0 opacity-15 pointer-events-none" style={{
                    backgroundImage: 'radial-gradient(circle at 20% 20%, rgba(212, 175, 55, 0.4) 1px, transparent 1px)',
                    backgroundSize: '14px 14px'
                  }} />
                  <div className="absolute -top-6 -right-6 w-20 h-20 bg-gold/10 rounded-full blur-2xl" />
                  <div className="relative">
                    <div className={`w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br ${c.gradient} flex items-center justify-center mb-4 shadow-lg border border-white/20`}>
                      <Icon className="w-8 h-8 text-white" strokeWidth={2.2} />
                    </div>
                    <h3 className="font-bold text-navy mb-2 text-base">{c.title}</h3>
                    {c.href ? (
                      <a href={c.href} className="text-gold hover:underline font-semibold text-sm" dir="ltr">{c.value}</a>
                    ) : (
                      <p className="text-gray-600 text-sm">{c.value}</p>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>

          {/* ⚡ Magical form card */}
          <Card className="relative p-8 max-w-2xl mx-auto border-2 border-gold/30 shadow-lg overflow-hidden">
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{
              backgroundImage: 'radial-gradient(circle at 20% 20%, #D4AF37 1px, transparent 1px)',
              backgroundSize: '14px 14px'
            }} />
            <div className="absolute -top-8 -left-8 w-32 h-32 bg-gold/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-8 -right-8 w-28 h-28 bg-navy/10 rounded-full blur-2xl" />

            <div className="relative">
              <div className="flex items-center justify-center gap-2 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold to-amber-500 flex items-center justify-center shadow-md">
                  <MessageSquare className="w-5 h-5 text-navy" />
                </div>
                <h2 className="text-2xl font-bold text-navy">أرسل لنا رسالة</h2>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-navy flex items-center gap-1.5 mb-1.5">
                      <span className="w-1 h-4 bg-gradient-to-b from-gold to-amber-500 rounded-full" />
                      الاسم الكامل *
                    </Label>
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-xl border-gold/30 focus:border-gold focus:ring-gold/30" placeholder="مثال: محمد أحمد" />
                  </div>
                  <div>
                    <Label className="text-navy flex items-center gap-1.5 mb-1.5">
                      <span className="w-1 h-4 bg-gradient-to-b from-gold to-amber-500 rounded-full" />
                      البريد الإلكتروني *
                    </Label>
                    <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} dir="ltr" className="rounded-xl border-gold/30 focus:border-gold focus:ring-gold/30" placeholder="example@email.com" />
                  </div>
                </div>
                <div>
                  <Label className="text-navy flex items-center gap-1.5 mb-1.5">
                    <span className="w-1 h-4 bg-gradient-to-b from-gold to-amber-500 rounded-full" />
                    الموضوع
                  </Label>
                  <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="rounded-xl border-gold/30 focus:border-gold focus:ring-gold/30" placeholder="موضوع رسالتك" />
                </div>
                <div>
                  <Label className="text-navy flex items-center gap-1.5 mb-1.5">
                    <span className="w-1 h-4 bg-gradient-to-b from-gold to-amber-500 rounded-full" />
                    الرسالة *
                  </Label>
                  <Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={5} className="rounded-xl border-gold/30 focus:border-gold focus:ring-gold/30" placeholder="اكتب رسالتك هنا..." />
                </div>
                <Button
                  onClick={submit}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-navy to-navy-light hover:from-navy-light hover:to-navy text-gold h-12 text-base rounded-xl shadow-md active:scale-[0.97] transition-all"
                >
                  {loading ? <><Loader2 className="w-4 h-4 ml-2 animate-spin" /> جاري الإرسال...</> : <><Send className="w-4 h-4 ml-2" /> إرسال الرسالة</>}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </section>
    </div>
  )
}
