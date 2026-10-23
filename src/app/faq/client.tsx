'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, HelpCircle, Sparkles } from 'lucide-react'

// 🌟 v10 — لافتة مركز «كيف تبدأ» — مكوّن مشترك يُعرض في حالة الفراغ وبعد الأسئلة
function StartCenterBanner() {
  return (
    <a
      href="/start"
      className="group relative block overflow-hidden rounded-3xl bg-gradient-to-br from-navy via-navy-light to-navy text-white p-7 sm:p-9 shadow-xl transition-all hover:shadow-2xl hover:-translate-y-1 active:scale-[0.99]"
    >
      <div className="absolute inset-0 opacity-25" style={{
        backgroundImage: 'radial-gradient(circle at 12% 50%, #D4AF37 1.5px, transparent 1.5px), radial-gradient(circle at 88% 20%, white 1px, transparent 1px)',
        backgroundSize: '24px 24px, 18px 18px',
      }} />
      <div className="absolute -top-14 -left-14 w-44 h-44 bg-gold/15 rounded-full blur-3xl group-hover:bg-gold/25 transition-colors" />
      <div className="relative flex items-center gap-5">
        <div className="shrink-0 w-16 h-16 rounded-2xl bg-gradient-to-br from-gold to-amber-500 text-navy flex items-center justify-center shadow-[0_10px_30px_rgba(212,175,55,0.4)]">
          <Sparkles className="w-8 h-8" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg sm:text-xl font-extrabold">
            <span className="bg-gradient-to-l from-white via-gold/90 to-white bg-clip-text text-transparent">
              مركز «كيف تبدأ» — أدلة مصوّرة خطوة بخطوة
            </span>
          </h3>
          <p className="mt-1.5 text-sm text-white/70 leading-relaxed">
            كيف تسجل؟ كيف تدفع؟ كيف تستلم شهادتك؟ كيف تنضم مدرباً؟ — إجابات مصوّرة في دقائق
          </p>
        </div>
        <ChevronDown className="shrink-0 w-6 h-6 text-gold -rotate-90 group-hover:-translate-x-1 transition-transform" />
      </div>
    </a>
  )
}

export default function FaqClient({ faqs }: { faqs: any[] }) {
  const [openIdx, setOpenIdx] = useState<number | null>(0)

  const grouped: Record<string, any[]> = {}
  for (const f of faqs) {
    const c = f.category || 'عام'
    if (!grouped[c]) grouped[c] = []
    grouped[c].push(f)
  }

  if (faqs.length === 0) {
    return (
      <div className="min-h-screen bg-white flex flex-col justify-center" dir="rtl">
        <div className="text-center py-20 px-4">
          {/* ⚡ Magical empty state */}
          <div className="relative inline-block mb-4">
            <div className="absolute inset-0 bg-gold/20 rounded-full blur-2xl animate-pulse" />
            <div className="relative w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-navy via-navy-light to-navy flex items-center justify-center shadow-xl border border-gold/30">
              <HelpCircle className="w-10 h-10 text-gold" />
            </div>
          </div>
          <p className="text-gray-500 max-w-xs mx-auto">لا توجد أسئلة شائعة بعد — سيتم إضافتها قريباً ✨</p>
          {/* 🌟 v10 — حتى في حالة الفراغ: بوابة مركز «كيف تبدأ» تبقى متاحة */}
          <div className="max-w-xl mx-auto mt-10 px-4">
            <StartCenterBanner />
          </div>
        </div>
      </div>
    )
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
            <span className="text-sm font-bold">الأسئلة الشائعة</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight">
            <span className="bg-gradient-to-l from-white via-gold/90 to-white bg-clip-text text-transparent">
              إجابات لأكثر الأسئلة شيوعاً
            </span>
          </h1>
          <p className="text-white/70 text-lg">كل ما تحتاج معرفته عن الدورات والتسجيل والشهادات</p>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-navy/5 to-transparent" />
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4 lg:px-6 max-w-3xl">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category} className="mb-10">
              <h2 className="text-xl font-bold text-navy mb-4 flex items-center gap-2">
                <div className="w-1 h-6 bg-gradient-to-b from-gold to-amber-500 rounded-full" />
                {category}
              </h2>
              <div className="space-y-3">
                {items.map((f) => {
                  const idx = faqs.indexOf(f)
                  const isOpen = openIdx === idx
                  return (
                    <Card key={f.id} className={`fia-card-hover overflow-hidden border ${isOpen ? 'border-gold/40' : 'border-gold/20'} hover:border-gold/40 transition-colors`}>
                      <button
                        onClick={() => setOpenIdx(isOpen ? null : idx)}
                        className="w-full flex items-center justify-between p-5 text-right hover:bg-gradient-to-l hover:from-gold/5 hover:to-transparent transition-all"
                      >
                        <span className="font-bold text-navy flex items-center gap-2.5">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${isOpen ? 'bg-gradient-to-br from-gold to-amber-500 text-navy shadow-md' : 'bg-navy/5 text-gold'}`}>
                            <HelpCircle className="w-4 h-4" />
                          </div>
                          {f.question}
                        </span>
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${isOpen ? 'bg-gold text-navy rotate-180' : 'bg-navy/5 text-gold'}`}>
                          <ChevronDown className="w-4 h-4" />
                        </div>
                      </button>
                      {isOpen && (
                        <div className="px-5 pb-5 pl-14 text-gray-700 leading-relaxed border-t border-gold/10 pt-4 bg-gradient-to-l from-gold/5 to-transparent">
                          {f.answer}
                        </div>
                      )}
                    </Card>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 🌟 v10 — لافتة مركز «كيف تبدأ»: أدلة مصوّرة خطوة بخطوة */}
      <section className="pb-20">
        <div className="container mx-auto px-4 lg:px-6 max-w-3xl">
          <StartCenterBanner />
        </div>
      </section>
    </div>
  )
}
