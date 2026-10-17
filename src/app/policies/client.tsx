'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Shield, FileText, RefreshCw, LifeBuoy, Mail } from 'lucide-react'

const DEFAULTS = {
  policy_privacy: 'نحترم خصوصيتك ونحمي بياناتك الشخصية. لا نشارك معلوماتك مع أي طرف ثالث دون موافقتك. يتم استخدام بياناتك فقط لتقديم خدماتنا التعليمية والتواصل معك بشأن الدورات والشهادات.',
  policy_terms: 'باستخدامك لمنصة أكاديمية المستقبل الدولية، فإنك توافق على الالتزام بشروط الاستخدام التالية: 1) عدم مشاركة حسابك مع أي شخص آخر. 2) عدم استخدام المنصة لأي غرض غير قانوني. 3) احترام حقوق الملكية الفكرية للمحتوى المنشور. 4) الالتزام بقواعد السلوك المهني في التفاعل مع المدربين والمتدربين الآخرين.',
  policy_refund: 'يمكن استرداد المبلغ المدفوع للدورة في الحالات التالية: 1) خلال 7 أيام من التسجيل إذا لم تكن قد أكملت أكثر من 25% من الدورة. 2) إذا تم إلغاء الدورة من قبل الأكاديمية. لا يتم استرداد المبلغ إذا تجاوزت 25% من الدورة أو إذا تم إصدار شهادة الإكمال.',
  policy_support: 'فريق الدعم لدينا متاح لمساعدتك في أي وقت. يمكنك التواصل معنا عبر البريد الإلكتروني أو الهاتف. ساعات العمل: السبت - الخميس، 9 صباحاً - 5 مساءً. نسعى للرد على جميع الاستفسارات خلال 24 ساعة عمل.',
}

export default function PoliciesClient({ settings }: { settings: any }) {
  const [active, setActive] = useState<'privacy' | 'terms' | 'refund' | 'support'>('privacy')

  const tabs = [
    { id: 'privacy' as const, title: 'سياسة الخصوصية', icon: Shield, content: settings.policy_privacy || DEFAULTS.policy_privacy },
    { id: 'terms' as const, title: 'شروط الاستخدام', icon: FileText, content: settings.policy_terms || DEFAULTS.policy_terms },
    { id: 'refund' as const, title: 'سياسة الاسترداد', icon: RefreshCw, content: settings.policy_refund || DEFAULTS.policy_refund },
    { id: 'support' as const, title: 'الدعم والمساعدة', icon: LifeBuoy, content: settings.policy_support || DEFAULTS.policy_support },
  ]

  const current = tabs.find((t) => t.id === active)!

  return (
    <div className="min-h-screen bg-gradient-to-b from-navy/5 to-white" dir="rtl">
      <section className="bg-gradient-to-br from-navy to-navy-light text-white py-20">
        <div className="container mx-auto px-4 lg:px-6 text-center">
          <Badge className="bg-gold/15 text-gold border-gold/30 mb-3">السياسات</Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">سياسات الأكاديمية</h1>
          <p className="text-white/70 text-lg">نظم وأحكام وسياسات استخدام منصة أكاديمية المستقبل الدولية</p>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4 lg:px-6 max-w-4xl">
          {/* Tab navigation */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-8">
            {tabs.map((t) => {
              const Icon = t.icon
              const isActive = active === t.id
              return (
                <button
                  key={t.id}
                  onClick={() => setActive(t.id)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    isActive
                      ? 'border-gold/50 bg-gold/10 text-navy'
                      : 'border-transparent bg-white hover:bg-navy/5 text-navy/70'
                  }`}
                >
                  <Icon className={`w-6 h-6 ${isActive ? 'text-gold' : 'text-navy/50'}`} />
                  <span className="text-xs font-bold text-center">{t.title}</span>
                </button>
              )
            })}
          </div>

          {/* Active policy */}
          <Card className="p-8">
            <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-100">
              <div className="w-12 h-12 rounded-xl bg-navy flex items-center justify-center">
                <current.icon className="w-6 h-6 text-gold" />
              </div>
              <h2 className="text-2xl font-bold text-navy">{current.title}</h2>
            </div>
            <div className="prose prose-lg max-w-none text-gray-700 leading-loose whitespace-pre-wrap">
              {current.content}
            </div>
            {settings.email && (
              <div className="mt-8 pt-6 border-t border-gray-100 text-center">
                <p className="text-gray-500 text-sm mb-3">لأي استفسار بخصوص {current.title}</p>
                <a
                  href={`mailto:${settings.email}`}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-navy/5 border border-gold/20 text-sm font-medium text-navy hover:bg-navy/10 transition-colors"
                >
                  <Mail className="w-4 h-4 text-gold" /> راسلنا
                </a>
              </div>
            )}
          </Card>
        </div>
      </section>
    </div>
  )
}
