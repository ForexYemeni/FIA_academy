import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { notifyTrainerGainedFollower, resolveTrainerUserId } from '@/lib/notifications'
import { guardAdmin, guardStaff, guardAuth } from '@/lib/api-auth'

// ============================================================================
// TRAINER FOLLOWS API — ROYAL v4.2 magical follow system
// ----------------------------------------------------------------------------
// GET  ?user_id=<users.id>            → the user's follows (trainer profile
//                                       rows enriched with name/avatar/title)
// GET  ?trainer_id=<users.id|trainers.id>
//                                     → followers of a trainer (enriched with
//                                       follower names/avatars) + followers_count
// POST {follower_id, trainer_id}      → follow (unique per pair) + notify trainer
// DELETE {follower_id, trainer_id}    → unfollow
//
// `trainer_id` here always refers to the PUBLIC trainers profile id — but we
// gracefully accept the users.id too (resolved via email).
// ============================================================================

async function enrichTrainerIds(ids: string[]): Promise<Record<string, any>> {
  const unique = Array.from(new Set(ids.filter(Boolean)))
  const map: Record<string, any> = {}
  if (unique.length === 0) return map
  const { data } = await supabaseAdmin
    .from('trainers')
    .select('id, name, title, specialization, bio, avatar, email, years_experience')
    .in('id', unique)
  for (const t of data || []) map[t.id] = t
  return map
}

async function enrichFollowerIds(ids: string[]): Promise<Record<string, any>> {
  const unique = Array.from(new Set(ids.filter(Boolean)))
  const map: Record<string, any> = {}
  if (unique.length === 0) return map
  const { data } = await supabaseAdmin
    .from('users')
    .select('id, name, avatar, role, title')
    .in('id', unique)
  for (const u of data || []) map[u.id] = u
  return map
}

/** Resolve a trainer ref (users.id OR trainers.id) to the profile id. */
async function toProfileId(ref: string): Promise<string | null> {
  const { data: direct } = await supabaseAdmin.from('trainers').select('id').eq('id', ref).maybeSingle()
  if (direct) return direct.id
  const { data: userRow } = await supabaseAdmin.from('users').select('email').eq('id', ref).maybeSingle()
  if (userRow?.email) {
    const { data: profile } = await supabaseAdmin.from('trainers').select('id').eq('email', userRow.email).maybeSingle()
    if (profile) return profile.id
  }
  return null
}

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('user_id')
    const trainerRef = req.nextUrl.searchParams.get('trainer_id')

    if (userId) {
      // This student's follows — enriched trainer profile rows
      const { data, error } = await supabaseAdmin
        .from('trainer_follows')
        .select('*')
        .eq('follower_id', userId)
        .order('created_at', { ascending: false })
      if (error) throw error
      const rows = data || []
      const profiles = await enrichTrainerIds(rows.map((r: any) => r.trainer_id))
      return NextResponse.json(
        rows.map((r: any) => ({ ...r, trainer: profiles[r.trainer_id] || null }))
      )
    }

    if (trainerRef) {
      const profileId = await toProfileId(trainerRef)
      if (!profileId) return NextResponse.json({ followers: [], followers_count: 0 })
      const { data, error } = await supabaseAdmin
        .from('trainer_follows')
        .select('*')
        .eq('trainer_id', profileId)
        .order('created_at', { ascending: false })
      if (error) throw error
      const rows = data || []
      const profiles = await enrichFollowerIds(rows.map((r: any) => r.follower_id))
      const followers = rows.map((r: any) => ({ ...r, follower: profiles[r.follower_id] || null }))
      return NextResponse.json({ followers, followers_count: followers.length, trainer_id: profileId })
    }

    // No params → global counts per trainer (for leaderboards / cards)
    const { data, error } = await supabaseAdmin
      .from('trainer_follows')
      .select('trainer_id')
    if (error) throw error
    const counts: Record<string, number> = {}
    for (const r of data || []) counts[r.trainer_id] = (counts[r.trainer_id] || 0) + 1
    return NextResponse.json(counts)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
  const g = await guardAuth(req); if (!g.ok) return g.res
    const { follower_id, trainer_id } = await req.json()
    if (!follower_id || !trainer_id) {
      return NextResponse.json({ error: 'follower_id و trainer_id مطلوبان' }, { status: 400 })
    }
    const profileId = await toProfileId(trainer_id)
    if (!profileId) {
      return NextResponse.json({ error: 'المدرب غير موجود' }, { status: 404 })
    }

    // Idempotent follow (unique constraint) — do not duplicate
    const { data: existing } = await supabaseAdmin
      .from('trainer_follows')
      .select('id')
      .eq('follower_id', follower_id)
      .eq('trainer_id', profileId)
      .maybeSingle()
    if (existing) {
      return NextResponse.json({ ok: true, already: true, trainer_id: profileId })
    }

    const { error } = await supabaseAdmin
      .from('trainer_follows')
      .insert({ follower_id, trainer_id: profileId })
    if (error) throw error

    // Notify the trainer's ACCOUNT (bell + FCM push) — non-fatal
    try {
      const trainerUserId = await resolveTrainerUserId(profileId)
      const { data: followerRow } = await supabaseAdmin
        .from('users').select('name').eq('id', follower_id).maybeSingle()
      if (trainerUserId) {
        await notifyTrainerGainedFollower(trainerUserId, followerRow?.name || 'متدرب')
      }
      // Follower count snapshot for the client
      const { count } = await supabaseAdmin
        .from('trainer_follows').select('id', { count: 'exact' }).eq('trainer_id', profileId)
      return NextResponse.json({ ok: true, trainer_id: profileId, followers_count: count || 0 })
    } catch {
      return NextResponse.json({ ok: true, trainer_id: profileId })
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
  const g = await guardAuth(req); if (!g.ok) return g.res
    const { follower_id, trainer_id } = await req.json()
    if (!follower_id || !trainer_id) {
      return NextResponse.json({ error: 'follower_id و trainer_id مطلوبان' }, { status: 400 })
    }
    const profileId = await toProfileId(trainer_id)
    if (!profileId) return NextResponse.json({ ok: true })
    const { error } = await supabaseAdmin
      .from('trainer_follows')
      .delete()
      .eq('follower_id', follower_id)
      .eq('trainer_id', profileId)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
