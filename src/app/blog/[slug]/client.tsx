'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, Eye, ArrowRight, Clock } from 'lucide-react'

export default function BlogPostClient({ post, related }: { post: any; related: any[] }) {
  return (
    <div className="min-h-screen bg-white" dir="rtl">
      {/* Hero */}
      <section className="relative bg-navy text-white py-20">
        {post.cover && (
          <div className="absolute inset-0 opacity-20">
            <img src={post.cover} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        <div className="container relative mx-auto px-4 lg:px-6 max-w-4xl">
          {post.tags && (
            <div className="flex flex-wrap gap-2 mb-4">
              {post.tags.split(',').map((t: string, i: number) => (
                <Badge key={i} className="bg-gold/15 text-gold border-gold/30">{t.trim()}</Badge>
              ))}
            </div>
          )}
          <h1 className="text-3xl md:text-5xl font-bold mb-6 leading-tight">{post.title}</h1>
          <div className="flex items-center gap-6 text-sm text-white/70">
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4 text-gold" />
              {post.published_at ? new Date(post.published_at).toLocaleDateString('ar-EG') : ''}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="w-4 h-4 text-gold" /> {post.views || 0} قراءة
            </span>
          </div>
        </div>
      </section>

      {/* Cover image */}
      {post.cover && (
        <div className="container mx-auto px-4 lg:px-6 max-w-4xl -mt-10 relative z-10">
          <div className="aspect-video rounded-2xl overflow-hidden shadow-2xl">
            <img src={post.cover} alt={post.title} className="w-full h-full object-cover" />
          </div>
        </div>
      )}

      {/* Body */}
      <article className="container mx-auto px-4 lg:px-6 max-w-3xl py-12">
        {post.excerpt && (
          <p className="text-xl text-gray-600 leading-relaxed mb-8 border-r-4 border-gold pr-4">
            {post.excerpt}
          </p>
        )}
        <div
          className="prose prose-lg max-w-none text-gray-800 leading-loose whitespace-pre-wrap"
          style={{ fontFamily: 'inherit' }}
        >
          {post.body}
        </div>
      </article>

      {/* Related */}
      {related && related.length > 0 && (
        <section className="bg-navy/5 py-12">
          <div className="container mx-auto px-4 lg:px-6 max-w-5xl">
            <h2 className="text-2xl font-bold text-navy mb-6 flex items-center gap-2">
              <ArrowRight className="w-6 h-6 text-gold" /> مقالات ذات صلة
            </h2>
            <div className="grid md:grid-cols-3 gap-4">
              {related.map((p) => (
                <a key={p.id} href={`/blog/${p.slug}`} className="block group">
                  <Card className="overflow-hidden card-hover h-full">
                    {p.cover && (
                      <div className="aspect-video overflow-hidden bg-navy">
                        <img src={p.cover} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      </div>
                    )}
                    <div className="p-4">
                      <h3 className="font-bold text-navy text-sm line-clamp-2">{p.title}</h3>
                    </div>
                  </Card>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      <div className="container mx-auto px-4 lg:px-6 max-w-3xl pb-16">
        <a href="/blog" className="inline-flex items-center gap-2 text-navy hover:text-gold font-bold">
          <ArrowRight className="w-5 h-5" /> العودة إلى المدونة
        </a>
      </div>
    </div>
  )
}
