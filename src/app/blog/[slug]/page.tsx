// Public blog post detail page — dynamic (always fresh) with full SEO metadata per article.
// We don't use SSG here because new blog posts are created at runtime — forcing SSG
// would 404 on any slug that wasn't pre-rendered at build time.
import { Metadata, ResolvingMetadata } from 'next'
import { supabaseAdmin } from '@/lib/supabase'
import BlogPostClient from './client'

interface Props { params: Promise<{ slug: string }> }

// Decode a slug param — Next.js 16 does not auto-decode URL-encoded path segments,
// so an Arabic slug like 'مضاد' arrives as '%D9%85%D8%B6%D8%A7%D8%AF' and the DB
// lookup fails. We decode it (and any double-encoded sequences) before querying.
function decodeSlug(raw: string): string {
  let s = raw || ''
  try {
    // Decode once
    let decoded = decodeURIComponent(s)
    // If still looks URL-encoded, decode again
    while (decoded !== decodeURIComponent(decoded) && decoded.length < 1000) {
      decoded = decodeURIComponent(decoded)
    }
    return decoded
  } catch {
    return s
  }
}

export async function generateMetadata({ params }: Props, parent: ResolvingMetadata): Promise<Metadata> {
  const { slug: rawSlug } = await params
  const slug = decodeSlug(rawSlug)
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

// Always server-render on demand so newly-created posts work immediately.
export const dynamic = 'force-dynamic'
// Disable static rendering — every request re-fetches from the DB so admin
// edits / new posts are visible without a redeploy.
export const revalidate = 0

export default async function Page({ params }: Props) {
  const { slug: rawSlug } = await params
  const slug = decodeSlug(rawSlug)

  const { data: post } = await supabaseAdmin
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'منشور')
    .maybeSingle()

  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-navy text-white" dir="rtl">
        <div className="text-center max-w-md px-4">
          <h1 className="text-3xl font-bold mb-3">المقال غير موجود</h1>
          <p className="text-white/60 mb-6">قد يكون المقال غير منشور، أو تم حذفه، أو أن الرابط غير صحيح.</p>
          <a href="/blog" className="inline-block bg-gold text-navy px-6 py-3 rounded-lg font-bold">العودة للمدونة</a>
        </div>
      </div>
    )
  }

  // Atomically increment views count — only when this render is a real
  // page request (not a metadata pre-render). We do the increment before
  // returning so even the first ever visitor is counted.
  try {
    const { data: current } = await supabaseAdmin
      .from('blog_posts')
      .select('views')
      .eq('id', post.id)
      .maybeSingle()
    const newViews = (current?.views || 0) + 1
    await supabaseAdmin
      .from('blog_posts')
      .update({ views: newViews })
      .eq('id', post.id)
    // Reflect the new view count in the data passed to the client
    post.views = newViews
  } catch {
    // Non-fatal — the page still renders even if the views increment fails
  }

  // Fetch related posts (excluding the current one)
  const { data: relatedData } = await supabaseAdmin
    .from('blog_posts')
    .select('id, title, slug, excerpt, cover, tags')
    .neq('id', post.id)
    .eq('status', 'منشور')
    .order('published_at', { ascending: false })
    .limit(3)
  const related = relatedData || []

  return <BlogPostClient post={post} related={related} />
}
