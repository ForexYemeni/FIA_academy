import { NextRequest, NextResponse } from 'next/server'
import { guardAdmin, guardAuth } from '@/lib/api-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { notifyForumReplyPosted } from '@/lib/notifications'

// GET /api/forum?topic_id=... — list posts in a topic (with author profiles)
export async function GET(req: NextRequest) {
  try {
    const topicId = req.nextUrl.searchParams.get('topic_id')
    if (!topicId) return NextResponse.json({ error: 'topic_id required' }, { status: 400 })

    // Increment topic views
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

    const { data: posts, error } = await supabaseAdmin
      .from('forum_posts')
      .select('*')
      .eq('topic_id', topicId)
      .order('created_at', { ascending: true })
    if (error) throw error

    // Enrich with author profiles (batch lookup)
    const authorIds = Array.from(new Set((posts || []).map((p: any) => p.user_id)))
    let authorMap: Record<string, any> = {}
    if (authorIds.length > 0) {
      const { data: profiles } = await supabaseAdmin
        .from('public_profiles')
        .select('*')
        .in('user_id', authorIds)
      for (const p of profiles || []) {
        authorMap[p.user_id] = p
      }
      // For any IDs not cached, fetch individually via the API endpoint
      // (which also writes the cache for next time)
      for (const id of authorIds) {
        if (!authorMap[id]) {
          // Resolve directly via the same logic in /api/public-profiles
          // to avoid an extra HTTP call.
          const { data: userRow } = await supabaseAdmin
            .from('users')
            .select('id, name, avatar, role, title')
            .eq('id', id)
            .maybeSingle()
          if (userRow) {
            authorMap[id] = { user_id: id, name: userRow.name, avatar: userRow.avatar, role: userRow.role, title: userRow.title }
            // Update cache
            try {
              await supabaseAdmin.from('public_profiles').upsert({
                user_id: id, name: userRow.name, avatar: userRow.avatar,
                role: userRow.role, title: userRow.title, updated_at: new Date().toISOString()
              }, { onConflict: 'user_id' })
            } catch {}
          } else {
            const { data: trainer } = await supabaseAdmin
              .from('trainers')
              .select('id, name, avatar, title, specialization, password')
              .eq('id', id)
              .maybeSingle()
            if (trainer) {
              let r = 'trainer'
              if (trainer.password?.startsWith('__TEAM_MEMBER__')) {
                const after = trainer.password.substring('__TEAM_MEMBER__:'.length)
                const sep = after.indexOf('__')
                if (sep !== -1) r = after.substring(0, sep) || 'team'
              }
              authorMap[id] = { user_id: id, name: trainer.name, avatar: trainer.avatar, role: r, title: trainer.title, specialization: trainer.specialization }
              try {
                await supabaseAdmin.from('public_profiles').upsert({
                  user_id: id, name: trainer.name, avatar: trainer.avatar,
                  role: r, title: trainer.title, specialization: trainer.specialization,
                  updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' })
              } catch {}
            }
          }
        }
      }
    }

    const enriched = (posts || []).map((p: any) => ({
      ...p,
      author: authorMap[p.user_id] || null,
    }))

    return NextResponse.json(enriched)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// POST — create a post. Checks if the user is banned first.
export async function POST(req: NextRequest) {
  try {
    // 🛡️ المشاركة لحسابك أنت — والهوية من التوقيع
    const g = await guardAuth(req)
    if (!g.ok) return g.res
    const { topic_id, body } = await req.json()
    const user_id = g.user.id
    if (!topic_id || !body) {
      return NextResponse.json({ error: 'الموضوع والنص مطلوبان' }, { status: 400 })
    }

    // Check ban status
    const { data: bans } = await supabaseAdmin
      .from('forum_bans')
      .select('*')
      .eq('banned_user_id', user_id)
    const now = Date.now()
    const activeBans = (bans || []).filter((b: any) => !b.expires_at || new Date(b.expires_at).getTime() > now)
    if (activeBans.length > 0) {
      return NextResponse.json({ error: 'تم حظرك من المنتدى. تواصل مع الإدارة.' }, { status: 403 })
    }

    // Insert post
    const { data, error } = await supabaseAdmin
      .from('forum_posts')
      .insert({ topic_id, user_id, body })
      .select()
      .single()
    if (error) throw error

    // Increment replies_count
    const { data: topic } = await supabaseAdmin
      .from('forum_topics')
      .select('replies_count, title, user_id')
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
      // Send forum reply notifications (in-app + OneSignal push)
      try { await notifyForumReplyPosted(user_id, topic.title || 'موضوع', topic.user_id, topic_id) } catch {}
    }

    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    // 🛡️ تعديل الرد: كاتبه أو الإدارة
    const g = await guardAuth(req)
    if (!g.ok) return g.res
    const { id, ...updates } = await req.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    if (g.user.role !== 'admin') {
      const { data: post } = await supabaseAdmin.from('forum_posts').select('user_id').eq('id', id).maybeSingle()
      if (post?.user_id !== g.user.id) {
        return NextResponse.json({ error: 'غير مصرح — يمكنك تعديل ردودك فقط' }, { status: 403 })
      }
    }
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
    // 🛡️ حذف الرد: كاتبه أو الإدارة
    const g = await guardAuth(req)
    if (!g.ok) return g.res
    const { id } = await req.json()
    if (g.user.role !== 'admin') {
      const { data: post } = await supabaseAdmin.from('forum_posts').select('user_id').eq('id', id).maybeSingle()
      if (post?.user_id !== g.user.id) {
        return NextResponse.json({ error: 'غير مصرح — يمكنك حذف ردودك فقط' }, { status: 403 })
      }
    }
    const { error } = await supabaseAdmin.from('forum_posts').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
