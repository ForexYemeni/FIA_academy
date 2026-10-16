'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Calendar, Eye, ArrowRight, Clock, Share2, Copy, MessageCircle,
  Facebook, Twitter, Bookmark, ChevronUp, Home,
} from 'lucide-react'
import { toast } from 'sonner'

export default function BlogPostClient({ post, related }: { post: any; related: any[] }) {
  const [progress, setProgress] = useState(0)
  const [showBackToTop, setShowBackToTop] = useState(false)

  // Reading progress bar
  useEffect(() => {
    const onScroll = () => {
      const scrolled = window.scrollY
      const height = document.documentElement.scrollHeight - window.innerHeight
      const pct = height > 0 ? Math.min((scrolled / height) * 100, 100) : 0
      setProgress(pct)
      setShowBackToTop(scrolled > 600)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Estimate reading time
  const wordCount = (post.body || '').trim().split(/\s+/).filter(Boolean).length
  const readTime = Math.max(1, Math.ceil(wordCount / 200)) // ~200 wpm for Arabic

  const shareUrl = typeof window !== 'undefined' ? window.location.href : `https://fiaacademy.vercel.app/blog/${post.slug}`
  const shareText = post.title

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      toast.success('تم نسخ الرابط')
    } catch {
      toast.error('تعذر النسخ — انسخ الرابط يدوياً')
    }
  }

  const shareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`, '_blank')
  }
  const shareTelegram = () => {
    window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`, '_blank')
  }
  const shareTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, '_blank')
  }
  const shareFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank')
  }

  // Split body into paragraphs for nicer typography
  const paragraphs = (post.body || '').split(/\n\s*\n/).filter(Boolean)

  return (
    <div className="min-h-screen bg-white" dir="rtl">
      {/* Reading progress bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-navy/10 z-50">
        <div
          className="h-full bg-gradient-to-l from-gold to-gold-light transition-all duration-150"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Hero — full-bleed cover image */}
      <section className="relative min-h-[60vh] flex items-end overflow-hidden bg-navy">
        {post.cover ? (
          <>
            <div className="absolute inset-0">
              <img src={post.cover} alt={post.title} className="w-full h-full object-cover" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/85 to-navy/40" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-navy via-navy-light to-navy" />
        )}
        <div className="container relative mx-auto px-4 lg:px-6 py-12 max-w-4xl text-white">
          <a href="/" className="inline-flex items-center gap-1 text-white/70 hover:text-gold mb-6 text-xs">
            <Home className="w-3.5 h-3.5" /> الرئيسية
          </a>
          {post.tags && (
            <div className="flex flex-wrap gap-2 mb-4">
              {post.tags.split(',').map((t: string, i: number) => (
                <Badge key={i} className="bg-gold/15 text-gold border-gold/30">{t.trim()}</Badge>
              ))}
            </div>
          )}
          <h1 className="text-3xl md:text-5xl font-bold mb-6 leading-tight">{post.title}</h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-white/80">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-gold" />
              {post.published_at ? new Date(post.published_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }) : ''}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-gold" /> {readTime} دقيقة قراءة
            </span>
            <span className="flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-gold" /> {post.views || 0} مشاهدة
            </span>
          </div>
        </div>
      </section>

      {/* Article body */}
      <article className="container mx-auto px-4 lg:px-6 max-w-3xl py-12">
        {/* Lead paragraph (excerpt) */}
        {post.excerpt && (
          <p className="text-xl md:text-2xl text-navy/80 leading-relaxed mb-8 border-r-4 border-gold pr-4 font-medium">
            {post.excerpt}
          </p>
        )}

        {/* Body — paragraphs with proper spacing */}
        <div className="prose prose-lg max-w-none">
          {paragraphs.length > 0 ? (
            paragraphs.map((p: string, i: number) => (
              <p key={i} className="text-navy/90 leading-loose mb-6 text-lg whitespace-pre-wrap">
                {p}
              </p>
            ))
          ) : (
            <p className="text-navy/90 leading-loose text-lg whitespace-pre-wrap">{post.body}</p>
          )}
        </div>

        {/* Share bar */}
        <div className="mt-12 pt-8 border-t border-border">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-navy flex items-center gap-1">
                <Share2 className="w-4 h-4 text-gold" /> شارك المقال
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={shareWhatsApp} className="w-10 h-10 rounded-full bg-green-500 hover:bg-green-600 text-white flex items-center justify-center transition-colors" title="واتساب">
                <MessageCircle className="w-5 h-5" />
              </button>
              <button onClick={shareTelegram} className="w-10 h-10 rounded-full bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center transition-colors" title="تيليجرام">
                <Share2 className="w-5 h-5" />
              </button>
              <button onClick={shareFacebook} className="w-10 h-10 rounded-full bg-blue-700 hover:bg-blue-800 text-white flex items-center justify-center transition-colors" title="فيسبوك">
                <Facebook className="w-5 h-5" />
              </button>
              <button onClick={shareTwitter} className="w-10 h-10 rounded-full bg-gray-900 hover:bg-black text-white flex items-center justify-center transition-colors" title="تويتر / X">
                <Twitter className="w-5 h-5" />
              </button>
              <button onClick={copyLink} className="w-10 h-10 rounded-full bg-navy hover:bg-navy-light text-gold flex items-center justify-center transition-colors" title="نسخ الرابط">
                <Copy className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </article>

      {/* Related posts */}
      {related && related.length > 0 && (
        <section className="bg-gradient-to-b from-navy/5 to-white py-16 border-t border-border">
          <div className="container mx-auto px-4 lg:px-6 max-w-5xl">
            <div className="text-center mb-10">
              <Badge className="bg-navy/5 text-navy border-navy/10 mb-3">مقالات ذات صلة</Badge>
              <h2 className="text-2xl md:text-3xl font-bold text-navy">اقرأ أيضاً</h2>
            </div>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5">
              {related.map((p) => (
                <a key={p.id} href={`/blog/${p.slug}`} className="block group">
                  <Card className="overflow-hidden card-hover h-full flex flex-col">
                    {p.cover ? (
                      <div className="aspect-video overflow-hidden bg-navy">
                        <img src={p.cover} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      </div>
                    ) : (
                      <div className="aspect-video bg-gradient-to-br from-navy to-navy-light flex items-center justify-center">
                        <Eye className="w-10 h-10 text-gold/40" />
                      </div>
                    )}
                    <div className="p-4 flex-1">
                      {p.excerpt && <p className="text-[10px] text-gold font-bold mb-1">{p.tags?.split(',')[0]?.trim()}</p>}
                      <h3 className="font-bold text-navy text-sm line-clamp-2 group-hover:text-gold transition-colors">{p.title}</h3>
                      {p.excerpt && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{p.excerpt}</p>}
                    </div>
                  </Card>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="bg-navy text-white py-12">
        <div className="container mx-auto px-4 lg:px-6 max-w-3xl text-center">
          <h2 className="text-2xl font-bold mb-3">هل أعجبك المقال؟</h2>
          <p className="text-white/70 mb-6">اكتشف المزيد من الدورات والشهادات المعتمدة في أكاديمية المستقبل الدولية</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <a href="/" className="bg-gold hover:bg-gold-light text-navy px-6 py-2.5 rounded-lg font-bold text-sm">تصفح الدورات</a>
            <a href="/blog" className="border border-gold/30 text-gold px-6 py-2.5 rounded-lg font-bold text-sm hover:bg-gold/10">كل المقالات</a>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 lg:px-6 max-w-3xl py-10 text-center">
        <a href="/blog" className="inline-flex items-center gap-2 text-navy hover:text-gold font-bold text-sm">
          <ArrowRight className="w-5 h-5" /> العودة إلى المدونة
        </a>
      </div>

      {/* Back to top FAB */}
      {showBackToTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 left-6 w-12 h-12 rounded-full bg-navy hover:bg-navy-light text-gold shadow-xl flex items-center justify-center transition-all"
          title="العودة للأعلى"
        >
          <ChevronUp className="w-6 h-6" />
        </button>
      )}
    </div>
  )
}
