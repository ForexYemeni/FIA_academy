'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, HelpCircle } from 'lucide-react'

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
      <div className="min-h-screen bg-white flex items-center justify-center" dir="rtl">
        <div className="text-center py-20">
          <HelpCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500">لا توجد أسئلة شائعة بعد.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-navy/5 to-white" dir="rtl">
      <section className="bg-gradient-to-br from-navy to-navy-light text-white py-20">
        <div className="container mx-auto px-4 lg:px-6 text-center">
          <Badge className="bg-gold/15 text-gold border-gold/30 mb-3">الأسئلة الشائعة</Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">إجابات لأكثر الأسئلة شيوعاً</h1>
          <p className="text-white/70 text-lg">كل ما تحتاج معرفته عن الدورات والتسجيل والشهادات</p>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4 lg:px-6 max-w-3xl">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category} className="mb-10">
              <h2 className="text-xl font-bold text-navy mb-4 flex items-center gap-2">
                <span className="w-1 h-6 bg-gold rounded-full" /> {category}
              </h2>
              <div className="space-y-3">
                {items.map((f, i) => {
                  const idx = faqs.indexOf(f)
                  const isOpen = openIdx === idx
                  return (
                    <Card key={f.id} className="overflow-hidden">
                      <button
                        onClick={() => setOpenIdx(isOpen ? null : idx)}
                        className="w-full flex items-center justify-between p-5 text-right hover:bg-navy/5 transition-colors"
                      >
                        <span className="font-bold text-navy">{f.question}</span>
                        <ChevronDown className={`w-5 h-5 text-gold flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {isOpen && (
                        <div className="px-5 pb-5 text-gray-700 leading-relaxed border-t border-gray-100 pt-4">
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
    </div>
  )
}
