import { NextRequest, NextResponse } from 'next/server'
import { guardAdmin, guardAuth } from '@/lib/api-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { notifyForumTopicCreated, notifyForumReplyPosted } from '@/lib/notifications'
import { assertTrainerCertified } from '@/lib/trainer-gate'

// Batch-fetch profiles for a list of user IDs
async function fetchProfiles(userIds: string[]): Promise<Record<string, any>> {
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)))
  if (uniqueIds.length === 0) return {}
  const { data: cached } = await supabaseAdmin
    .from('public_profiles')
    .select('*')
    .in('user_id', uniqueIds)
  const map: Record<string, any> = {}
  for (const p of cached || []) map[p.user_id] = p

  // Resolve any missing ones individually
  for (const id of uniqueIds) {
    if (map[id]) continue
    let profile: any = null
    const { data: userRow } = await supabaseAdmin
      .from('users')
      .select('id, name, avatar, role, title')
      .eq('id', id)
      .maybeSingle()
    if (userRow) {
      profile = { user_id: id, name: userRow.name, avatar: userRow.avatar, role: userRow.role, title: userRow.title }
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
        profile = { user_id: id, name: trainer.name, avatar: trainer.avatar, role: r, title: trainer.title, specialization: trainer.specialization }
      }
    }
    if (profile) {
      map[id] = profile
      try {
        await supabaseAdmin.from('public_profiles').upsert({
          ...profile, updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' })
      } catch {}
    }
  }
  return map
}

export async function GET(req: NextRequest) {
  try {
    const categoryId = req.nextUrl.searchParams.get('category_id')
    const slug = req.nextUrl.searchParams.get('slug')
    const userId = req.nextUrl.searchParams.get('user_id') // filter by author
    const topicId = req.nextUrl.searchParams.get('topic_id')

    // Single-topic deep-link fetch (used by notification deep links
    // when the topic might be in a different category than the one
    // currently loaded in the UI). Returns a single enriched topic.
    if (topicId) {
      const { data: topic, error } = await supabaseAdmin
        .from('forum_topics')
        .select('*')
        .eq('id', topicId)
        .maybeSingle()
      if (error) throw error
      if (!topic) return NextResponse.json({ error: 'موضوع غير موجود' }, { status: 404 })
      const profiles = await fetchProfiles([topic.user_id])
      return NextResponse.json({ ...topic, author: profiles[topic.user_id] || null })
    }

    if (slug && !categoryId) {
      const { data: cat } = await supabaseAdmin
        .from('forum_categories')
        .select('id')
        .eq('slug', slug)
        .maybeSingle()
      if (!cat) return NextResponse.json([])
      return GET(new NextRequest(`${req.url}&category_id=${cat.id}`))
    }

    let query = supabaseAdmin
      .from('forum_topics')
      .select('*')
      .order('pinned', { ascending: false })
      .order('updated_at', { ascending: false })
    if (categoryId) query = query.eq('category_id', categoryId)
    if (userId) query = query.eq('user_id', userId)
    const { data: topics, error } = await query
    if (error) throw error

    // Enrich with author profiles
    const profiles = await fetchProfiles((topics || []).map((t: any) => t.user_id))
    const enriched = (topics || []).map((t: any) => ({ ...t, author: profiles[t.user_id] || null }))

    return NextResponse.json(enriched)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    // 🛡️ إنشاء موضوع لحسابك أنت — والهوية من التوقيع
    const g = await guardAuth(req)
    if (!g.ok) return g.res
    const { category_id, title, body } = await req.json()
    const user_id = g.user.id
    if (!category_id || !title) {
      return NextResponse.json({ error: 'الفئة والعنوان مطلوبان' }, { status: 400 })
    }

    // 🛡️ بوابة الاعتماد: المدرب غير المعتمد (قبل توقيع الاتفاق) لا ينشئ مواضيع
    const trainerGate = await assertTrainerCertified(user_id, 'forum')
    if (!trainerGate.ok) {
      return NextResponse.json({ error: trainerGate.message }, { status: 403 })
    }

    // Check ban status — banned users can't create topics
    const { data: bans } = await supabaseAdmin
      .from('forum_bans')
      .select('*')
      .eq('banned_user_id', user_id)
    const now = Date.now()
    const activeBans = (bans || []).filter((b: any) => !b.expires_at || new Date(b.expires_at).getTime() > now)
    if (activeBans.length > 0) {
      return NextResponse.json({ error: 'تم حظرك من المنتدى. تواصل مع الإدارة.' }, { status: 403 })
    }

    const { data, error } = await supabaseAdmin
      .from('forum_topics')
      .insert({
        category_id,
        user_id,
        title,
        body: body || null,
      })
      .select()
      .single()
    if (error) throw error
    // Send forum notifications (in-app + OneSignal push)
    try { await notifyForumTopicCreated(user_id, title, data.id) } catch {}
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    // 🛡️ تعديل الموضوع: كاتبه أو الإدارة
    const g = await guardAuth(req)
    if (!g.ok) return g.res
    const { id, ...updates } = await req.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    if (g.user.role !== 'admin') {
      const { data: t } = await supabaseAdmin.from('forum_topics').select('user_id').eq('id', id).maybeSingle()
      if (t?.user_id !== g.user.id) {
        return NextResponse.json({ error: 'غير مصرح — يمكنك تعديل مواضيعك فقط' }, { status: 403 })
      }
    }
    const { data, error } = await supabaseAdmin
      .from('forum_topics')
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
    // 🛡️ حذف الموضوع: كاتبه أو الإدارة
    const g = await guardAuth(req)
    if (!g.ok) return g.res
    const { id } = await req.json()
    if (g.user.role !== 'admin') {
      const { data: t } = await supabaseAdmin.from('forum_topics').select('user_id').eq('id', id).maybeSingle()
      if (t?.user_id !== g.user.id) {
        return NextResponse.json({ error: 'غير مصرح — يمكنك حذف مواضيعك فقط' }, { status: 403 })
      }
    }
    const { error } = await supabaseAdmin.from('forum_topics').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
