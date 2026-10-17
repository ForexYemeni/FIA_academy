import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// GET /api/forum-bans?user_id=... — check if a user is banned (returns ban records)
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('user_id')
    if (userId) {
      const { data, error } = await supabaseAdmin
        .from('forum_bans')
        .select('*')
        .eq('banned_user_id', userId)
      if (error) throw error
      // Filter out expired bans
      const now = Date.now()
      const active = (data || []).filter((b: any) => !b.expires_at || new Date(b.expires_at).getTime() > now)
      return NextResponse.json({ banned: active.length > 0, bans: active })
    }
    // No user_id → list all bans (admin view)
    const { data, error } = await supabaseAdmin
      .from('forum_bans')
      .select('*')
      .order('banned_at', { ascending: false })
    if (error) throw error
    return NextResponse.json(data || [])
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// POST — ban a user (admin / trainer / team only)
export async function POST(req: NextRequest) {
  try {
    const { banned_user_id, banned_by_user_id, reason, scope, expires_at } = await req.json()
    if (!banned_user_id || !banned_by_user_id) {
      return NextResponse.json({ error: 'banned_user_id + banned_by_user_id required' }, { status: 400 })
    }

    // Fetch the banner's record to verify role (admin/trainer/team can ban)
    // First check users table
    const { data: bannerUser } = await supabaseAdmin
      .from('users')
      .select('id, role')
      .eq('id', banned_by_user_id)
      .maybeSingle()
    let bannerRole = bannerUser?.role
    let bannerIsTeam = false
    if (!bannerRole) {
      // Check trainers (incl. team members with __TEAM_MEMBER__ marker)
      const { data: trainer } = await supabaseAdmin
        .from('trainers')
        .select('id, password')
        .eq('id', banned_by_user_id)
        .maybeSingle()
      if (trainer?.password?.startsWith('__TEAM_MEMBER__')) bannerIsTeam = true
      if (trainer) bannerRole = 'trainer'
    }
    if (!bannerRole) {
      return NextResponse.json({ error: 'الحاسب غير موجود' }, { status: 403 })
    }
    // Only admin / trainer / team can ban others
    if (!['admin', 'trainer'].includes(bannerRole) && !bannerIsTeam) {
      return NextResponse.json({ error: 'غير مصرح — فقط المدرب/الإدارة يمكنه الحظر' }, { status: 403 })
    }

    // Students cannot ban anyone (only admin / trainer / team)
    // Trainers can ban students and other trainers (but not admins)
    // Fetch banned user role to enforce hierarchy
    const { data: bannedUserRow } = await supabaseAdmin
      .from('users')
      .select('id, role')
      .eq('id', banned_user_id)
      .maybeSingle()
    let bannedRole = bannedUserRow?.role
    if (!bannedRole) {
      const { data: t } = await supabaseAdmin
        .from('trainers')
        .select('id, password')
        .eq('id', banned_user_id)
        .maybeSingle()
      if (t) bannedRole = 'trainer'
    }
    if (bannedRole === 'admin') {
      return NextResponse.json({ error: 'لا يمكن حظر مدير النظام' }, { status: 403 })
    }

    const { data, error } = await supabaseAdmin
      .from('forum_bans')
      .upsert({
        banned_user_id,
        banned_by_user_id,
        reason: reason || null,
        scope: scope || 'all',
        expires_at: expires_at || null,
      }, { onConflict: 'banned_user_id,scope' })
      .select()
      .single()
    if (error) throw error
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// DELETE — unban a user
export async function DELETE(req: NextRequest) {
  try {
    const { id, banned_user_id, scope } = await req.json()
    let query = supabaseAdmin.from('forum_bans').delete()
    if (id) query = query.eq('id', id)
    else if (banned_user_id) {
      query = query.eq('banned_user_id', banned_user_id)
      if (scope) query = query.eq('scope', scope)
    }
    const { error } = await query
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
