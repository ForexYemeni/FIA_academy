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
      // Look up the founder/team member's linked trainer ID by email.
      // If the user is an admin with a corresponding trainers table
      // entry (team marker), they have TWO IDs — the admin ID (used
      // for login + chat) and the trainer ID (legacy, what students
      // used to send messages to before the fix). We need to fetch
      // conversations for BOTH IDs so the founder sees all their
      // historical + current chats.
      const adminRow = await supabaseAdmin
        .from('users')
        .select('id, email, role')
        .eq('id', userId)
        .maybeSingle()
      let linkedTrainerId: string | null = null
      if (adminRow.data?.role === 'admin' && adminRow.data?.email) {
        try {
          const { data: trainerRow } = await supabaseAdmin
            .from('trainers')
            .select('id, password')
            .eq('email', adminRow.data.email)
            .maybeSingle()
          if (trainerRow?.password?.startsWith('__TEAM_MEMBER__:')) {
            linkedTrainerId = trainerRow.id
          }
        } catch {}
      }

      // Build the OR filter for all the user's IDs (admin ID + trainer
      // ID if applicable). Supabase's `.or()` accepts multiple clauses.
      const participantIds = [userId]
      if (linkedTrainerId && linkedTrainerId !== userId) {
        participantIds.push(linkedTrainerId)
      }
      const orClause = participantIds
        .flatMap((id) => [`participant_1.eq.${id}`, `participant_2.eq.${id}`])
        .join(',')

      const { data, error } = await supabaseAdmin
        .from('chat_conversations')
        .select('*')
        .or(orClause)
        .order('last_message_at', { ascending: false, nullsFirst: false })
      if (error) throw error

      // Enrich the OTHER participant with their profile. For each
      // conversation, the "other" participant is whoever isn't in
      // the user's ID set.
      const userIdSet = new Set(participantIds)
      const otherIds = (data || [])
        .map((c: any) => userIdSet.has(c.participant_1) ? c.participant_2 : c.participant_1)
      const uniqueOtherIds = Array.from(new Set(otherIds))
      let otherMap: Record<string, any> = {}
      if (uniqueOtherIds.length > 0) {
        // Try public_profiles cache first
        const { data: profiles } = await supabaseAdmin
          .from('public_profiles')
          .select('*')
          .in('user_id', uniqueOtherIds)
        for (const p of profiles || []) otherMap[p.user_id] = p

        // For any IDs not in the cache, resolve directly from
        // users/trainers tables and write back to cache
        for (const id of uniqueOtherIds) {
          if (otherMap[id]) continue
          const profile = await resolveProfile(id)
          if (profile) {
            otherMap[id] = profile
            try {
              await supabaseAdmin.from('public_profiles').upsert({
                user_id: id, name: profile.name, avatar: profile.avatar,
                role: profile.role, title: profile.title,
                specialization: profile.specialization,
                updated_at: new Date().toISOString(),
              }, { onConflict: 'user_id' })
            } catch {}
          }
        }
      }
      return NextResponse.json((data || []).map((c: any) => {
        const otherId = userIdSet.has(c.participant_1) ? c.participant_2 : c.participant_1
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

    // If the sender OR recipient is an admin who is ALSO a team member
    // (founder/leader/team), they have a linked trainer-table ID. Users
    // who messaged them BEFORE this fix would have sent to the trainer
    // ID (because that's what users-search returned at the time). To
    // avoid creating duplicate conversations, we look for an existing
    // conversation using EITHER the admin ID or the linked trainer ID
    // for BOTH the sender and the recipient.
    const allAliasMap: Record<string, string[]> = {}
    async function getAliasIds(uid: string): Promise<string[]> {
      if (allAliasMap[uid]) return allAliasMap[uid]
      const aliases = [uid]
      try {
        const { data: adminRow } = await supabaseAdmin
          .from('users')
          .select('id, email, role')
          .eq('id', uid)
          .maybeSingle()
        if (adminRow?.role === 'admin' && adminRow?.email) {
          const { data: trainerRow } = await supabaseAdmin
            .from('trainers')
            .select('id, password')
            .eq('email', adminRow.email)
            .maybeSingle()
          if (trainerRow?.password?.startsWith('__TEAM_MEMBER__:') && trainerRow.id !== uid) {
            aliases.push(trainerRow.id)
          }
        }
      } catch {}
      allAliasMap[uid] = aliases
      return aliases
    }

    // Also handle the recipient being a founder (student → founder).
    // The student's client may have selected the founder by the OLD
    // trainer ID (from a stale search cache). Resolve the canonical
    // admin ID for the recipient so the new conversation is created
    // with the canonical admin ID, not the legacy trainer ID.
    let canonicalRecipientId = recipient_id
    try {
      const { data: trainerRow } = await supabaseAdmin
        .from('trainers')
        .select('id, email, password')
        .eq('id', recipient_id)
        .maybeSingle()
      if (trainerRow?.password?.startsWith('__TEAM_MEMBER__:') && trainerRow.email) {
        const { data: adminRow } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('email', trainerRow.email)
          .eq('role', 'admin')
          .maybeSingle()
        if (adminRow?.id) canonicalRecipientId = adminRow.id
      }
    } catch {}

    const senderAliases = await getAliasIds(sender_id)
    const recipientAliases = await getAliasIds(canonicalRecipientId)

    // Try to find an existing conversation for ANY combination of
    // sender aliases × recipient aliases.
    let existing: any = null
    for (const sid of senderAliases) {
      for (const rid of recipientAliases) {
        if (sid === rid) continue
        const p1a = sid < rid ? sid : rid
        const p2a = sid < rid ? rid : sid
        const { data } = await supabaseAdmin
          .from('chat_conversations')
          .select('*')
          .eq('participant_1', p1a)
          .eq('participant_2', p2a)
          .maybeSingle()
        if (data) { existing = data; break }
      }
      if (existing) break
    }

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
      // Create new conversation using canonical IDs (admin ID for
      // team members, the user's own ID otherwise).
      const p1 = sender_id < canonicalRecipientId ? sender_id : canonicalRecipientId
      const p2 = sender_id < canonicalRecipientId ? canonicalRecipientId : sender_id
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

    // Create a notification for the recipient — use the CANONICAL
    // recipient ID (admin ID for founders) so the notification lands
    // in the inbox they actually check (the founder logs in via the
    // admin ID and the notifications table is keyed by that ID).
    try {
      await supabaseAdmin.from('notifications').insert({
        user_id: canonicalRecipientId,
        type: 'message',
        title: `رسالة جديدة من ${senderProfile?.name || 'مستخدم'}`,
        body: body.substring(0, 120),
        link: '/',
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

// DELETE — delete an entire conversation (and all its messages via CASCADE)
export async function DELETE(req: NextRequest) {
  try {
    const { conversation_id } = await req.json()
    if (!conversation_id) {
      return NextResponse.json({ error: 'conversation_id required' }, { status: 400 })
    }
    // Delete the conversation — messages cascade-delete via FK constraint
    const { error } = await supabaseAdmin
      .from('chat_conversations')
      .delete()
      .eq('id', conversation_id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

async function resolveProfile(userId: string): Promise<any | null> {
  const { data: u } = await supabaseAdmin.from('users').select('id, name, avatar, role, email').eq('id', userId).maybeSingle()
  if (u) {
    // For admin users, also check the trainers table by email — if they
    // have a team marker (founder/leader/team), override the role label
    // so chat recipients see "المؤسس" instead of "مدير" in the message
    // header. We use the admin's name + avatar (which they actively
    // maintain), but pull the team_role from the trainers table marker.
    let teamRole: string | undefined
    if (u.role === 'admin' && u.email) {
      try {
        const { data: trainerRow } = await supabaseAdmin
          .from('trainers')
          .select('password')
          .eq('email', u.email)
          .maybeSingle()
        if (trainerRow?.password?.startsWith('__TEAM_MEMBER__:')) {
          const after = trainerRow.password.substring('__TEAM_MEMBER__:'.length)
          const sep = after.indexOf('__')
          if (sep !== -1) teamRole = after.substring(0, sep) || 'team'
        }
      } catch {}
    }
    return {
      user_id: userId,
      name: u.name,
      avatar: u.avatar,
      role: teamRole || u.role,
      team_role: teamRole,
    }
  }
  // Fall back to trainers table (the user wasn't in users — could be a
  // team member who hasn't been linked to an admin account yet).
  const { data: t } = await supabaseAdmin.from('trainers').select('id, name, avatar, password').eq('id', userId).maybeSingle()
  if (t) {
    let r = 'trainer'
    let teamRole: string | undefined
    if (t.password?.startsWith('__TEAM_MEMBER__')) {
      const after = t.password.substring('__TEAM_MEMBER__:'.length)
      const sep = after.indexOf('__')
      if (sep !== -1) {
        r = after.substring(0, sep) || 'team'
        teamRole = r
      }
    }
    return {
      user_id: userId,
      name: t.name,
      avatar: t.avatar,
      role: r,
      team_role: teamRole,
    }
  }
  return null
}
