import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { guardAdmin, guardStaff, guardAuth } from '@/lib/api-auth'

// POST /api/forum/react
// Body: { user_id, topic_id?, post_id?, reaction: 'like' | 'dislike' }
// Toggles the reaction — if the user already has the same reaction, remove it.
// If the user has a different reaction, switch it.
export async function POST(req: NextRequest) {
  try {
  const g = await guardAuth(req); if (!g.ok) return g.res
    const { user_id, topic_id, post_id, reaction } = await req.json()
    if (!user_id || !reaction || (!topic_id && !post_id)) {
      return NextResponse.json({ error: 'user_id + reaction + (topic_id or post_id) required' }, { status: 400 })
    }
    if (reaction !== 'like' && reaction !== 'dislike') {
      return NextResponse.json({ error: 'reaction must be like or dislike' }, { status: 400 })
    }

    // Check if the user already has a reaction
    let query = supabaseAdmin.from('forum_reactions').select('*').eq('user_id', user_id)
    if (topic_id) query = query.eq('topic_id', topic_id)
    if (post_id) query = query.eq('post_id', post_id)
    const { data: existing } = await query.maybeSingle()

    if (existing) {
      if (existing.reaction === reaction) {
        // Same reaction — remove it (toggle off)
        await supabaseAdmin.from('forum_reactions').delete().eq('id', existing.id)
        await updateCounts(topic_id, post_id, -1, reaction)
        return NextResponse.json({ action: 'removed', reaction: null })
      } else {
        // Different reaction — switch it
        await supabaseAdmin.from('forum_reactions').update({ reaction }).eq('id', existing.id)
        // Decrease old count, increase new count
        await updateCounts(topic_id, post_id, -1, existing.reaction)
        await updateCounts(topic_id, post_id, 1, reaction)
        return NextResponse.json({ action: 'switched', reaction })
      }
    } else {
      // No existing reaction — add new one
      await supabaseAdmin.from('forum_reactions').insert({
        user_id, topic_id: topic_id || null, post_id: post_id || null, reaction
      })
      await updateCounts(topic_id, post_id, 1, reaction)
      return NextResponse.json({ action: 'added', reaction })
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// Helper: update aggregate counts on the topic or post row
async function updateCounts(topicId: string | null, postId: string | null, delta: number, reaction: string) {
  const col = reaction === 'like' ? 'likes_count' : 'dislikes_count'
  if (topicId) {
    const { data: t } = await supabaseAdmin.from('forum_topics').select(col).eq('id', topicId).maybeSingle()
    if (t) {
      await supabaseAdmin.from('forum_topics').update({ [col]: Math.max(0, (t[col] || 0) + delta) }).eq('id', topicId)
    }
  }
  if (postId) {
    const { data: p } = await supabaseAdmin.from('forum_posts').select(col).eq('id', postId).maybeSingle()
    if (p) {
      await supabaseAdmin.from('forum_posts').update({ [col]: Math.max(0, (p[col] || 0) + delta) }).eq('id', postId)
    }
  }
}
