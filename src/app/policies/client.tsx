'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Shield, FileText, RefreshCw, LifeBuoy, Mail, Sparkles, ArrowRight } from 'lucide-react'

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
      {/* ⚡ Magical hero header */}
      <section className="relative bg-gradient-to-br from-navy via-navy-light to-navy text-white py-20 overflow-hidden">
        <div className="absolute inset-0 opacity-25" style={{
          backgroundImage: 'radial-gradient(circle at 12% 50%, #D4AF37 1.5px, transparent 1.5px), radial-gradient(circle at 88% 20%, white 1px, transparent 1px)',
          backgroundSize: '24px 24px, 18px 18px'
        }} />
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-gold/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-gold/10 rounded-full blur-3xl pointer-events-none" />
        <div className="container relative mx-auto px-4 lg:px-6 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold/15 border border-gold/30 mb-4">
            <Sparkles className="w-3.5 h-3.5 text-gold" />
            <span className="text-[11px] font-bold text-gold">السياسات</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">سياسات الأكاديمية</h1>
          <p className="text-white/70 text-lg max-w-2xl mx-auto">نظم وأحكام وسياسات استخدام منصة أكاديمية المستقبل الدولية</p>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4 lg:px-6 max-w-4xl">
          {/* Magical back button */}
          <a
            href="/"
            className="inline-flex items-center gap-1.5 text-navy hover:text-gold font-bold text-sm mb-6 transition-colors group"
          >
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /> العودة للرئيسية
          </a>

          {/* Tab navigation — magical cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-8">
            {tabs.map((t) => {
              const Icon = t.icon
              const isActive = active === t.id
              return (
                <button
                  key={t.id}
                  onClick={() => setActive(t.id)}
                  className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all overflow-hidden ${
                    isActive
                      ? 'border-gold/50 bg-gradient-to-br from-gold/10 to-gold/5 text-navy shadow-md'
                      : 'border-transparent bg-white hover:bg-navy/5 text-navy/70 hover:border-gold/20'
                  }`}
                >
                  {isActive && (
                    <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-l from-gold via-amber-400 to-gold opacity-70" />
                  )}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isActive ? 'bg-gradient-to-br from-navy to-navy-light' : 'bg-navy/5'}`}>
                    <Icon className={`w-5 h-5 ${isActive ? 'text-gold' : 'text-navy/50'}`} />
                  </div>
                  <span className="text-xs font-bold text-center">{t.title}</span>
                </button>
              )
            })}
          </div>

          {/* Active policy — magical card with gold border */}
          <Card className="relative p-8 border-gold/30 overflow-hidden">
            {/* Top gold strip */}
            <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-l from-gold via-amber-400 to-gold opacity-70" />
            {/* Magical glow */}
            <div className="absolute -top-8 -right-8 w-32 h-32 bg-gold/10 rounded-full blur-2xl pointer-events-none" />

            <div className="relative flex items-center gap-3 mb-6 pb-6 border-b border-gray-100">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-navy to-navy-light flex items-center justify-center shadow-md">
                <current.icon className="w-6 h-6 text-gold" />
              </div>
              <h2 className="text-2xl font-bold text-navy">{current.title}</h2>
            </div>
            <div className="relative prose prose-lg max-w-none text-gray-700 leading-loose whitespace-pre-wrap">
              {current.content}
            </div>
            {settings.email && (
              <div className="relative mt-8 pt-6 border-t border-gray-100 text-center">
                <p className="text-gray-500 text-sm mb-3">لأي استفسار بخصوص {current.title}</p>
                <a
                  href={`mailto:${settings.email}`}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-navy to-navy-light text-gold border border-gold/30 text-sm font-medium hover:from-navy-light hover:to-navy transition-all shadow-md active:scale-[0.97]"
                >
                  <Mail className="w-4 h-4" /> راسلنا
                </a>
              </div>
            )}
          </Card>
        </div>
      </section>
    </div>
  )
}
