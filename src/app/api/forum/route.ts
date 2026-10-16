import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// GET /api/forum?topic_id=... — list posts in a topic
export async function GET(req: NextRequest) {
  try {
    const topicId = req.nextUrl.searchParams.get('topic_id')
    if (!topicId) return NextResponse.json({ error: 'topic_id required' }, { status: 400 })

    // Increment topic views atomically
    await supabaseAdmin.rpc('increment_topic_views', { topic_id: topicId }).catch(() => {})
    // Even if the RPC function doesn't exist, fall back to manual increment
    const { data: topic } = await supabaseAdmin
      .from('forum_topics')
      .select('views')
      .eq('id', topicId)
      .maybeSingle()
    if (topic) {
      await supabaseAdmin
        .from('forum_topics')
        .update({ views: (topic.views || 0) + 1 })
        .eq('id', topicId)
    }

    const { data, error } = await supabaseAdmin
      .from('forum_posts')
      .select('*')
      .eq('topic_id', topicId)
      .order('created_at', { ascending: true })
    if (error) throw error
    return NextResponse.json(data || [])
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { topic_id, user_id, body } = await req.json()
    if (!topic_id || !user_id || !body) {
      return NextResponse.json({ error: 'الموضوع والمستخدم والنص مطلوبة' }, { status: 400 })
    }

    // Insert post
    const { data, error } = await supabaseAdmin
      .from('forum_posts')
      .insert({ topic_id, user_id, body })
      .select()
      .single()
    if (error) throw error

    // Increment replies_count on the topic
    const { data: topic } = await supabaseAdmin
      .from('forum_topics')
      .select('replies_count')
      .eq('id', topic_id)
      .maybeSingle()
    if (topic) {
      await supabaseAdmin
        .from('forum_topics')
        .update({
          replies_count: (topic.replies_count || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', topic_id)
    }

    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { id, ...updates } = await req.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const { data, error } = await supabaseAdmin
      .from('forum_posts')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json()
    const { error } = await supabaseAdmin.from('forum_posts').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
