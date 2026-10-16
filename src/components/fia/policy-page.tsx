'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Shield, FileText, RefreshCw, LifeBuoy } from 'lucide-react'

const POLICY_META: Record<string, { title: string; badge: string; icon: any; field: string; fallback: string }> = {
  privacy: {
    title: 'سياسة الخصوصية',
    badge: 'الخصوصية',
    icon: Shield,
    field: 'policy_privacy',
    fallback: 'سياسة الخصوصية قيد التحضير. سيتم تحديثها قريباً.',
  },
  terms: {
    title: 'شروط الاستخدام',
    badge: 'الشروط',
    icon: FileText,
    field: 'policy_terms',
    fallback: 'شروط الاستخدام قيد التحضير. سيتم تحديثها قريباً.',
  },
  refund: {
    title: 'سياسة الاسترداد',
    badge: 'الاسترداد',
    icon: RefreshCw,
    field: 'policy_refund',
    fallback: 'سياسة الاسترداد قيد التحضير. سيتم تحديثها قريباً.',
  },
  support: {
    title: 'الدعم والمساعدة',
    badge: 'الدعم',
    icon: LifeBuoy,
    field: 'policy_support',
    fallback: 'صفحة الدعم قيد التحضير. سيتم تحديثها قريباً.',
  },
}

export function PolicyPage({ policyType }: { policyType: 'privacy' | 'terms' | 'refund' | 'support' }) {
  const [settings, setSettings] = useState<any>({})

  useEffect(() => {
    fetch('/api/site-settings').then((r) => r.json()).then(setSettings).catch(() => {})
  }, [policyType])

  const meta = POLICY_META[policyType]
  const Icon = meta.icon
  const content = settings[meta.field] || meta.fallback

  return (
    <div className="container mx-auto px-4 lg:px-6 py-12 max-w-4xl">
      <div className="text-center mb-10">
        <Badge className="bg-navy/5 text-navy border-navy/10 mb-3">{meta.badge}</Badge>
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-navy flex items-center justify-center">
            <Icon className="w-6 h-6 text-gold" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-navy">{meta.title}</h1>
        </div>
      </div>

      <Card className="p-8 md:p-10">
        <div className="prose prose-lg max-w-none">
          <p className="text-sm md:text-base text-foreground/80 leading-relaxed whitespace-pre-wrap">{content}</p>
        </div>
      </Card>

      {/* Contact CTA */}
      <div className="mt-8 text-center">
        <p className="text-sm text-muted-foreground mb-3">لأي استفسار بخصوص {meta.title}</p>
        {settings.email && (
          <a href={`mailto:${settings.email}`} className="inline-block">
            <Badge className="bg-gold/15 text-gold border-gold/30 hover:bg-gold/20 cursor-pointer">
              راسلنا: <span dir="ltr" className="mr-1">{settings.email}</span>
            </Badge>
          </a>
        )}
      </div>
    </div>
  )
}
