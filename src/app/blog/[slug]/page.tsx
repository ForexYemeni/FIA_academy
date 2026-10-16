// Public blog post detail page — SSG with full SEO metadata per article
import { Metadata, ResolvingMetadata } from 'next'
import { supabaseAdmin } from '@/lib/supabase'
import BlogPostClient from './client'

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props, parent: ResolvingMetadata): Promise<Metadata> {
  const { slug } = await params
  const { data: post } = await supabaseAdmin
    .from('blog_posts')
    .select('title, excerpt, cover, tags')
    .eq('slug', slug)
    .eq('status', 'منشور')
    .maybeSingle()

  if (!post) {
    return { title: 'مقال غير موجود | أكاديمية المستقبل الدولية' }
  }

  const title = `${post.title} | مدونة أكاديمية المستقبل الدولية`
  const description = post.excerpt || post.title

  return {
    title,
    description,
    keywords: post.tags ? post.tags.split(',') : [],
    openGraph: {
      title,
      description,
      type: 'article',
      images: post.cover ? [{ url: post.cover, width: 1200, height: 630 }] : undefined,
      siteName: 'أكاديمية المستقبل الدولية',
      locale: 'ar_YE',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: post.cover ? [post.cover] : undefined,
    },
    alternates: { canonical: `https://fiaacademy.vercel.app/blog/${slug}` },
    robots: { index: true, follow: true },
  }
}

export async function generateStaticParams() {
  try {
    const { data } = await supabaseAdmin
      .from('blog_posts')
      .select('slug')
      .eq('status', 'منشور')
      .not('slug', 'is', null)
    return (data || []).map((p: any) => ({ slug: p.slug }))
  } catch { return [] }
}

export const revalidate = 60

export default async function Page({ params }: Props) {
  const { slug } = await params
  const { data: post } = await supabaseAdmin
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'منشور')
    .maybeSingle()

  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-navy text-white" dir="rtl">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-3">المقال غير موجود</h1>
          <a href="/blog" className="inline-block bg-gold text-navy px-6 py-3 rounded-lg font-bold">العودة للمدونة</a>
        </div>
      </div>
    )
  }

  // Fetch related posts (same tags, excluding current)
  let related: any[] = []
  if (post.tags) {
    const { data } = await supabaseAdmin
      .from('blog_posts')
      .select('id, title, slug, excerpt, cover')
      .neq('id', post.id)
      .eq('status', 'منشور')
      .limit(3)
    related = data || []
  }

  return <BlogPostClient post={post} related={related} />
}
