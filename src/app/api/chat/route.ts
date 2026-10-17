import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// GET /api/chat?user_id=... OR ?conversation_id=...
// - user_id: list user's conversations (with last message preview)
// - conversation_id: list messages in a conversation
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('user_id')
    const conversationId = req.nextUrl.searchParams.get('conversation_id')

    if (conversationId) {
      const { data, error } = await supabaseAdmin
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
      if (error) throw error

      // Enrich senders with profiles
      const senderIds = Array.from(new Set((data || []).map((m: any) => m.sender_id)))
      let senderMap: Record<string, any> = {}
      if (senderIds.length > 0) {
        const { data: profiles } = await supabaseAdmin
          .from('public_profiles')
          .select('*')
          .in('user_id', senderIds)
        for (const p of profiles || []) senderMap[p.user_id] = p
      }
      return NextResponse.json((data || []).map((m: any) => ({ ...m, sender: senderMap[m.sender_id] || null })))
    }

    if (userId) {
      const { data, error } = await supabaseAdmin
        .from('chat_conversations')
        .select('*')
        .or(`participant_1.eq.${userId},participant_2.eq.${userId}`)
        .order('last_message_at', { ascending: false, nullsFirst: false })
      if (error) throw error

      // Enrich the OTHER participant with their profile
      const otherIds = (data || []).map((c: any) => c.participant_1 === userId ? c.participant_2 : c.participant_1)
      const uniqueOtherIds = Array.from(new Set(otherIds))
      let otherMap: Record<string, any> = {}
      if (uniqueOtherIds.length > 0) {
        const { data: profiles } = await supabaseAdmin
          .from('public_profiles')
          .select('*')
          .in('user_id', uniqueOtherIds)
        for (const p of profiles || []) otherMap[p.user_id] = p
      }
      return NextResponse.json((data || []).map((c: any) => {
        const otherId = c.participant_1 === userId ? c.participant_2 : c.participant_1
        return { ...c, other_id: otherId, other: otherMap[otherId] || null }
      }))
    }

    return NextResponse.json({ error: 'user_id or conversation_id required' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// POST — send a message (creates conversation if not exists)
export async function POST(req: NextRequest) {
  try {
    const { sender_id, recipient_id, body } = await req.json()
    if (!sender_id || !recipient_id || !body) {
      return NextResponse.json({ error: 'sender_id, recipient_id, body required' }, { status: 400 })
    }
    if (sender_id === recipient_id) {
      return NextResponse.json({ error: 'لا يمكن مراسلة نفسك' }, { status: 400 })
    }

    // Find or create conversation (unique constraint on the pair)
    const p1 = sender_id < recipient_id ? sender_id : recipient_id
    const p2 = sender_id < recipient_id ? recipient_id : sender_id

    const { data: existing } = await supabaseAdmin
      .from('chat_conversations')
      .select('*')
      .eq('participant_1', p1)
      .eq('participant_2', p2)
      .maybeSingle()

    let conversationId: string
    if (existing) {
      conversationId = existing.id
      // Update last_message_at + last_message_body
      await supabaseAdmin
        .from('chat_conversations')
        .update({
          last_message_at: new Date().toISOString(),
          last_message_body: body.substring(0, 200),
        })
        .eq('id', conversationId)
    } else {
      const { data: newConv, error } = await supabaseAdmin
        .from('chat_conversations')
        .insert({
          participant_1: p1,
          participant_2: p2,
          last_message_at: new Date().toISOString(),
          last_message_body: body.substring(0, 200),
        })
        .select()
        .single()
      if (error) throw error
      conversationId = newConv.id
    }

    // Insert message
    const { data: msg, error: msgErr } = await supabaseAdmin
      .from('chat_messages')
      .insert({
        conversation_id: conversationId,
        sender_id,
        body,
      })
      .select()
      .single()
    if (msgErr) throw msgErr

    // Attach sender's profile to the message so the client doesn't
    // need a separate lookup — the name/avatar/role are embedded.
    const senderProfile = await resolveProfile(sender_id)
    const msgWithSender = { ...msg, sender: senderProfile }

    // Create a notification for the recipient
    try {
      await supabaseAdmin.from('notifications').insert({
        user_id: recipient_id,
        type: 'message',
        title: `رسالة جديدة من ${senderProfile?.name || 'مستخدم'}`,
        body: body.substring(0, 120),
        link: '/chat',
      })
    } catch {}

    return NextResponse.json({ conversation_id: conversationId, message: msgWithSender })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// PUT — mark messages as read (for current user)
export async function PUT(req: NextRequest) {
  try {
    const { conversation_id, user_id } = await req.json()
    if (!conversation_id || !user_id) {
      return NextResponse.json({ error: 'conversation_id + user_id required' }, { status: 400 })
    }
    const { error } = await supabaseAdmin
      .from('chat_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('conversation_id', conversation_id)
      .neq('sender_id', user_id)
      .is('read_at', null)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

async function resolveProfile(userId: string): Promise<any | null> {
  const { data: u } = await supabaseAdmin.from('users').select('id, name, avatar, role').eq('id', userId).maybeSingle()
  if (u) return { user_id: userId, name: u.name, avatar: u.avatar, role: u.role }
  const { data: t } = await supabaseAdmin.from('trainers').select('id, name, avatar, password').eq('id', userId).maybeSingle()
  if (t) {
    let r = 'trainer'
    if (t.password?.startsWith('__TEAM_MEMBER__')) {
      const after = t.password.substring('__TEAM_MEMBER__:'.length)
      const sep = after.indexOf('__')
      if (sep !== -1) r = after.substring(0, sep) || 'team'
    }
    return { user_id: userId, name: t.name, avatar: t.avatar, role: r }
  }
  return null
}
