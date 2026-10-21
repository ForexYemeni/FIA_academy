'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, Eye, ArrowLeft, Sparkles, BookOpen } from 'lucide-react'

export default function BlogListClient({ posts }: { posts: any[] }) {
  if (!posts || posts.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-navy/5 to-white flex items-center justify-center" dir="rtl">
        <div className="text-center px-4">
          {/* Magical empty state */}
          <div className="relative inline-block mb-4">
            <div className="absolute inset-0 bg-gold/20 rounded-full blur-2xl animate-pulse" />
            <div className="relative w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-navy via-navy-light to-navy flex items-center justify-center shadow-xl border border-gold/30">
              <BookOpen className="w-10 h-10 text-gold" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-navy mb-3">المدونة</h1>
          <p className="text-gray-500 mb-6 max-w-xs mx-auto">لا توجد مقالات بعد — ترقّبوا قريباً مقالات من نخبة الخبراء ✨</p>
          <a href="/" className="inline-block bg-gradient-to-r from-navy to-navy-light text-gold px-6 py-3 rounded-xl font-bold shadow-lg">العودة للرئيسية</a>
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
            <span className="text-sm font-bold">المدونة</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight">
            <span className="bg-gradient-to-l from-white via-gold/90 to-white bg-clip-text text-transparent">
              مقالات ورؤى تعليمية
            </span>
          </h1>
          <p className="text-white/70 text-lg max-w-3xl mx-auto leading-relaxed">
            نصائح ومقالات من نخبة الخبراء في التعليم الطبي والتدريب المهني
          </p>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-navy/5 to-transparent" />
      </section>

      {/* Blog grid — magical cards */}
      <section className="py-16">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 fia-stagger">
            {posts.map((p) => (
              <a key={p.id} href={`/blog/${p.slug}`} className="block group">
                <Card className="fia-course-card overflow-hidden h-full border border-gold/20">
                  {p.cover ? (
                    <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-navy via-navy-light to-navy">
                      <img
                        src={p.cover}
                        alt={p.title}
                        loading="lazy"
                        className="fia-cover-img absolute inset-0 w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/20 to-transparent" />
                      <div className="fia-shine" />
                      {p.tags && (
                        <Badge className="absolute top-2 right-2 bg-navy/80 text-gold border-gold/30 backdrop-blur-sm">{p.tags.split(',')[0]}</Badge>
                      )}
                    </div>
                  ) : (
                    <div className="relative aspect-video bg-gradient-to-br from-navy via-navy-light to-navy flex items-center justify-center overflow-hidden">
                      <div className="absolute inset-0 opacity-20" style={{
                        backgroundImage: 'radial-gradient(circle at 20% 20%, #D4AF37 1px, transparent 1px)',
                        backgroundSize: '14px 14px'
                      }} />
                      <div className="fia-shine" />
                      <BookOpen className="relative w-12 h-12 text-gold/40" />
                    </div>
                  )}
                  <div className="relative p-5">
                    <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-l from-gold via-amber-400 to-gold opacity-70" />
                    {/* ROYAL author chip — the name shines */}
                    {p.author && (
                      <div className="flex items-center gap-2 mb-3">
                        <div className="relative">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-navy to-navy-light border-2 border-gold/40 flex items-center justify-center overflow-hidden">
                            {p.author.avatar ? (
                              <img src={p.author.avatar} alt={p.author.name || ''} className="w-full h-full object-cover rounded-xl" />
                            ) : (
                              <span className="text-gold font-extrabold text-xs">{p.author.name?.charAt(0) || '؟'}</span>
                            )}
                          </div>
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-extrabold text-navy truncate">{p.author.name || 'كاتب'}</div>
                          <span className="inline-block text-[8px] font-extrabold text-emerald-700 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-1.5 py-px">
                            {p.author.role === 'trainer' ? 'مدرب معتمد' : p.author.team_role === 'founder' ? 'المؤسس' : p.author.role === 'admin' ? 'الإدارة' : 'فريق الأكاديمية'}
                          </span>
                        </div>
                      </div>
                    )}
                    <h3 className="font-bold text-navy text-lg mb-2 line-clamp-2">{p.title}</h3>
                    {p.excerpt && <p className="text-gray-600 text-sm line-clamp-3 mb-4 leading-relaxed">{p.excerpt}</p>}
                    <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-border/40">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-gold/60" />
                        {p.published_at ? new Date(p.published_at).toLocaleDateString('ar-EG') : ''}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5 text-gold/60" />
                        <span className="font-bold text-navy">{p.views || 0}</span>
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
