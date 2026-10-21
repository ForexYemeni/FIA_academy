// Public blog list page — SSG with SEO metadata — ROYAL v4.2 author enrich
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
    .select('id, title, slug, excerpt, cover, tags, views, published_at, author_id')
    .eq('status', 'منشور')
    .order('published_at', { ascending: false })

  // ROYAL v4.2 — resolve each post's author (users first, then trainers)
  const enriched = await (async () => {
    const list = posts || []
    const ids = Array.from(new Set(list.map((p: any) => p.author_id).filter(Boolean)))
    const map: Record<string, any> = {}
    if (ids.length > 0) {
      const { data: authors } = await supabaseAdmin
        .from('users')
        .select('id, name, role, avatar, title, team_role')
        .in('id', ids)
      for (const a of authors || []) map[a.id] = a
    }
    return list.map((p: any) => ({ ...p, author: map[p.author_id] || null }))
  })()

  return <BlogListClient posts={enriched} />
}
