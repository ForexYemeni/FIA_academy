import { MetadataRoute } from 'next'
import { supabaseAdmin } from '@/lib/supabase'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = 'https://fiaacademy.vercel.app'
  
  // Static pages — كل الصفحات العامة (توافق كامل مع Search Console: تضمين جميع عناوين URL)
  const staticPages: MetadataRoute.Sitemap = [
    { url: base, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${base}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/download`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${base}/register`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/blog`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/faq`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/start`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/contact`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/verify`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
    { url: `${base}/policies`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.4 },
  ]

  // Dynamic course pages
  try {
    const { data: courses } = await supabaseAdmin
      .from('courses')
      .select('slug, updated_at, status')
      .neq('status', 'مسودة')
      .not('slug', 'is', null)
      .order('updated_at', { ascending: false })

    const coursePages: MetadataRoute.Sitemap = (courses || []).map((c: any) => ({
      url: `${base}/courses/${encodeURIComponent(c.slug)}`,
      lastModified: c.updated_at ? new Date(c.updated_at) : new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    }))

    // Dynamic blog post pages
    const { data: posts } = await supabaseAdmin
      .from('blog_posts')
      .select('slug, published_at, status')
      .eq('status', 'منشور')
      .not('slug', 'is', null)
      .order('published_at', { ascending: false })

    const blogPages: MetadataRoute.Sitemap = (posts || []).map((p: any) => ({
      url: `${base}/blog/${encodeURIComponent(p.slug)}`,
      lastModified: p.published_at ? new Date(p.published_at) : new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    }))

    return [...staticPages, ...coursePages, ...blogPages]
  } catch {
    return staticPages
  }
}
