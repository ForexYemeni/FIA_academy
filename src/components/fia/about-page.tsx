'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Award, HeartPulse, Shield, Users, Target, Eye } from 'lucide-react'

export function AboutPage() {
  const [settings, setSettings] = useState<any>({})

  useEffect(() => {
    fetch('/api/site-settings').then((r) => r.json()).then(setSettings).catch(() => {})
  }, [])

  const academyName = settings.academy_name || 'أكاديمية المستقبل الدولية'
  const vision = settings.about_vision || 'لم تتم إضافة رؤيتنا بعد. سيتم تحديثها قريباً.'
  const mission = settings.about_mission || 'لم تتم إضافة رسالتنا بعد. سيتم تحديثها قريباً.'
  const values = settings.about_values || 'لم تتم إضافة قيمنا بعد. سيتم تحديثها قريباً.'
  const team = settings.about_team || 'لم يتم إضافة فريقنا بعد. سيتم تحديثه قريباً.'

  return (
    <div className="container mx-auto px-4 lg:px-6 py-12 max-w-5xl">
      {/* Header */}
      <div className="text-center mb-12">
        <Badge className="bg-navy/5 text-navy border-navy/10 mb-3">من نحن</Badge>
        <h1 className="text-4xl md:text-5xl font-bold text-navy mb-4">{academyName}</h1>
        <p className="text-muted-foreground text-lg max-w-3xl mx-auto leading-relaxed">
          {settings.academy_name_en || 'FUTURE INTERNATIONAL ACADEMY'} (FIA)
        </p>
      </div>

      {/* Vision / Mission / Values / Team */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <Card className="p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-navy flex items-center justify-center">
              <Eye className="w-6 h-6 text-gold" />
            </div>
            <h2 className="text-xl font-bold text-navy">رؤيتنا</h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{vision}</p>
        </Card>

        <Card className="p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-navy flex items-center justify-center">
              <Target className="w-6 h-6 text-gold" />
            </div>
            <h2 className="text-xl font-bold text-navy">رسالتنا</h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{mission}</p>
        </Card>

        <Card className="p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-navy flex items-center justify-center">
              <Shield className="w-6 h-6 text-gold" />
            </div>
            <h2 className="text-xl font-bold text-navy">قيمنا</h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{values}</p>
        </Card>

        <Card className="p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-navy flex items-center justify-center">
              <Users className="w-6 h-6 text-gold" />
            </div>
            <h2 className="text-xl font-bold text-navy">فريقنا</h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{team}</p>
        </Card>
      </div>

      {/* Contact info */}
      <Card className="p-8 bg-gradient-to-b from-navy to-navy-light text-white">
        <h2 className="text-2xl font-bold text-gold mb-4">تواصل معنا</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {settings.phone && (
            <a href={`tel:${settings.phone}`} className="text-white/80 hover:text-gold transition-colors">
              <div className="text-xs text-gold mb-1">الهاتف</div>
              <div dir="ltr">{settings.phone}</div>
            </a>
          )}
          {settings.email && (
            <a href={`mailto:${settings.email}`} className="text-white/80 hover:text-gold transition-colors">
              <div className="text-xs text-gold mb-1">البريد</div>
              <div dir="ltr">{settings.email}</div>
            </a>
          )}
          {settings.address && (
            <div className="text-white/80">
              <div className="text-xs text-gold mb-1">العنوان</div>
              <div>{settings.address}</div>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
