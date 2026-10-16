'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Phone, Mail, MapPin, Send, Loader2 } from 'lucide-react'

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
      <section className="bg-gradient-to-br from-navy to-navy-light text-white py-20">
        <div className="container mx-auto px-4 lg:px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">تواصل معنا</h1>
          <p className="text-white/70 text-lg max-w-3xl mx-auto">فريقنا جاهز للإجابة على استفساراتك في أي وقت</p>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4 lg:px-6 max-w-5xl">
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {[
              { icon: Phone, title: 'اتصل بنا', value: settings.phone || '+967 700 000 000', href: `tel:${settings.phone}` },
              { icon: Mail, title: 'راسلنا', value: settings.email || 'info@fia.edu', href: `mailto:${settings.email}` },
              { icon: MapPin, title: 'زورنا', value: settings.address || 'صنعاء، الجمهورية اليمنية' },
            ].map((c, i) => {
              const Icon = c.icon
              return (
                <Card key={i} className="p-8 text-center card-hover">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-navy flex items-center justify-center mb-4">
                    <Icon className="w-7 h-7 text-gold" />
                  </div>
                  <h3 className="font-bold text-navy mb-2">{c.title}</h3>
                  {c.href ? (
                    <a href={c.href} className="text-gold hover:underline" dir="ltr">{c.value}</a>
                  ) : (
                    <p className="text-gray-600">{c.value}</p>
                  )}
                </Card>
              )
            })}
          </div>

          <Card className="p-8 max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-navy mb-6 text-center">أرسل لنا رسالة</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>الاسم الكامل *</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1" placeholder="مثال: محمد أحمد" />
                </div>
                <div>
                  <Label>البريد الإلكتروني *</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1" dir="ltr" placeholder="example@email.com" />
                </div>
              </div>
              <div>
                <Label>الموضوع</Label>
                <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="mt-1" placeholder="موضوع رسالتك" />
              </div>
              <div>
                <Label>الرسالة *</Label>
                <Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={5} className="mt-1" placeholder="اكتب رسالتك هنا..." />
              </div>
              <Button onClick={submit} disabled={loading} className="w-full bg-navy hover:bg-navy-light text-white h-12 text-base">
                {loading ? <><Loader2 className="w-4 h-4 ml-2 animate-spin" /> جاري الإرسال...</> : <><Send className="w-4 h-4 ml-2" /> إرسال الرسالة</>}
              </Button>
            </div>
          </Card>
        </div>
      </section>
    </div>
  )
}
