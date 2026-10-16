// Public blog list page — SSG with SEO metadata
import { Metadata } from 'next'
import { supabaseAdmin } from '@/lib/supabase'
import BlogListClient from './client'

export const metadata: Metadata = {
  title: 'المدونة | أكاديمية المستقبل الدولية',
  description: 'مقالات ونصائح في التعليم الطبي والتدريب المهني من نخبة الخبراء في أكاديمية المستقبل الدولية.',
  openGraph: {
    title: 'المدونة | أكاديمية المستقبل الدولية',
    description: 'مقالات ونصائح في التعليم الطبي والتدريب المهني.',
    type: 'website',
    siteName: 'أكاديمية المستقبل الدولية',
    locale: 'ar_YE',
  },
  alternates: { canonical: 'https://fiaacademy.vercel.app/blog' },
}

export const revalidate = 60

export default async function Page() {
  const { data: posts } = await supabaseAdmin
    .from('blog_posts')
    .select('id, title, slug, excerpt, cover, tags, views, published_at')
    .eq('status', 'منشور')
    .order('published_at', { ascending: false })

  return <BlogListClient posts={posts || []} />
}
