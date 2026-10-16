'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, Eye, ArrowLeft } from 'lucide-react'

export default function BlogListClient({ posts }: { posts: any[] }) {
  if (!posts || posts.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-navy/5 to-white flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-navy mb-3">المدونة</h1>
          <p className="text-gray-500 mb-6">لا توجد مقالات بعد.</p>
          <a href="/" className="inline-block bg-navy text-white px-6 py-3 rounded-lg">العودة للرئيسية</a>
        </div>
      </div>
    )
  }
  return (
    <div className="min-h-screen bg-gradient-to-b from-navy/5 to-white" dir="rtl">
      <section className="bg-navy text-white py-20">
        <div className="container mx-auto px-4 lg:px-6 text-center">
          <Badge className="bg-gold/15 text-gold border-gold/30 mb-3">المدونة</Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">مقالات ورؤى تعليمية</h1>
          <p className="text-white/70 text-lg max-w-3xl mx-auto">نصائح ومقالات من نخبة الخبراء في التعليم الطبي والتدريب المهني</p>
        </div>
      </section>
      <section className="py-16">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((p) => (
              <a key={p.id} href={`/blog/${p.slug}`} className="block group">
                <Card className="overflow-hidden card-hover h-full">
                  {p.cover && (
                    <div className="aspect-video overflow-hidden bg-navy">
                      <img src={p.cover} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    </div>
                  )}
                  <div className="p-5">
                    {p.tags && (
                      <Badge variant="outline" className="mb-2 text-xs">{p.tags.split(',')[0]}</Badge>
                    )}
                    <h3 className="font-bold text-navy text-lg mb-2 line-clamp-2">{p.title}</h3>
                    {p.excerpt && <p className="text-gray-600 text-sm line-clamp-3 mb-4">{p.excerpt}</p>}
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {p.published_at ? new Date(p.published_at).toLocaleDateString('ar-EG') : ''}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" /> {p.views || 0}
                      </span>
                    </div>
                  </div>
                </Card>
              </a>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
