import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { guardAdmin, guardStaff, guardAuth } from '@/lib/api-auth'

// POST /api/blog/react — toggle like/dislike on a blog post
// Body: { user_id, blog_post_id, reaction: 'like' | 'dislike' }
export async function POST(req: NextRequest) {
  try {
  const g = await guardAuth(req); if (!g.ok) return g.res
    const { user_id, blog_post_id, reaction } = await req.json()
    if (!user_id || !blog_post_id || !reaction) {
      return NextResponse.json({ error: 'user_id + blog_post_id + reaction required' }, { status: 400 })
    }
    if (reaction !== 'like' && reaction !== 'dislike') {
      return NextResponse.json({ error: 'reaction must be like or dislike' }, { status: 400 })
    }

    const { data: existing } = await supabaseAdmin
      .from('blog_reactions')
      .select('*')
      .eq('user_id', user_id)
      .eq('blog_post_id', blog_post_id)
      .maybeSingle()

    if (existing) {
      if (existing.reaction === reaction) {
        await supabaseAdmin.from('blog_reactions').delete().eq('id', existing.id)
        await updateCount(blog_post_id, -1, reaction)
        return NextResponse.json({ action: 'removed', reaction: null })
      } else {
        await supabaseAdmin.from('blog_reactions').update({ reaction }).eq('id', existing.id)
        await updateCount(blog_post_id, -1, existing.reaction)
        await updateCount(blog_post_id, 1, reaction)
        return NextResponse.json({ action: 'switched', reaction })
      }
    } else {
      await supabaseAdmin.from('blog_reactions').insert({ user_id, blog_post_id, reaction })
      await updateCount(blog_post_id, 1, reaction)
      return NextResponse.json({ action: 'added', reaction })
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

async function updateCount(blogPostId: string, delta: number, reaction: string) {
  const col = reaction === 'like' ? 'likes_count' : 'dislikes_count'
  const { data: p } = await supabaseAdmin.from('blog_posts').select(col).eq('id', blogPostId).maybeSingle()
  if (p) {
    await supabaseAdmin.from('blog_posts').update({ [col]: Math.max(0, (p[col] || 0) + delta) }).eq('id', blogPostId)
  }
}
