'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Eye, Target, Heart, Users } from 'lucide-react'

export default function AboutClient({ settings }: { settings: any }) {
  const blocks = [
    { icon: Eye, title: 'رؤيتنا', text: settings.about_vision, color: 'bg-navy' },
    { icon: Target, title: 'رسالتنا', text: settings.about_mission, color: 'bg-gold' },
    { icon: Heart, title: 'قيمنا', text: settings.about_values, color: 'bg-navy-light' },
    { icon: Users, title: 'فريقنا', text: settings.about_team, color: 'bg-gold-light' },
  ]

  return (
    <div className="min-h-screen bg-white" dir="rtl">
      <section className="bg-gradient-to-br from-navy to-navy-light text-white py-20">
        <div className="container mx-auto px-4 lg:px-6 text-center">
          <Badge className="bg-gold/15 text-gold border-gold/30 mb-3">من نحن</Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">{settings.academy_name || 'أكاديمية المستقبل الدولية'}</h1>
          <p className="text-white/70 text-lg max-w-3xl mx-auto">منصة تعليمية رائدة في التعليم الطبي والتدريب المهني، نسعى لتمكين الكوادر الصحية بالمعرفة والمهارات اللازمة لتقديم رعاية صحية متميزة.</p>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4 lg:px-6 max-w-5xl">
          <div className="grid md:grid-cols-2 gap-6">
            {blocks.map((b, i) => {
              const Icon = b.icon
              return (
                <Card key={i} className="p-6 card-hover">
                  <div className={`w-14 h-14 rounded-2xl ${b.color} flex items-center justify-center mb-4`}>
                    <Icon className="w-7 h-7 text-gold" />
                  </div>
                  <h3 className="font-bold text-navy text-xl mb-3">{b.title}</h3>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {b.text || `نعمل حالياً على تحديث هذا القسم. سيتم نشر ${b.title} قريباً.`}
                  </p>
                </Card>
              )
            })}
          </div>
        </div>
      </section>
    </div>
  )
}
