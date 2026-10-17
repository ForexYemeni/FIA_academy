import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const TEAM_MARKER = '__TEAM_MEMBER__:'

// Resolve a user_id to a display profile, looking up the users table first,
// then the trainers table (including team members). Caches the result in the
// public_profiles table to avoid repeated lookups.
async function resolveProfile(userId: string): Promise<any | null> {
  // Try cache first
  const { data: cached } = await supabaseAdmin
    .from('public_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  // If cache is fresh (< 1 hour), return it
  if (cached?.updated_at && (Date.now() - new Date(cached.updated_at).getTime()) < 3600000) {
    return cached
  }

  // Otherwise rebuild from source
  let profile: any = null
  const { data: userRow } = await supabaseAdmin
    .from('users')
    .select('id, name, avatar, role, title')
    .eq('id', userId)
    .maybeSingle()

  if (userRow) {
    profile = {
      user_id: userId,
      name: userRow.name,
      avatar: userRow.avatar,
      role: userRow.role,
      title: userRow.title,
      specialization: null,
    }
  } else {
    const { data: trainer } = await supabaseAdmin
      .from('trainers')
      .select('id, name, avatar, title, specialization, password')
      .eq('id', userId)
      .maybeSingle()
    if (trainer) {
      // Detect team member role from password marker
      let role = 'trainer'
      if (trainer.password?.startsWith(TEAM_MARKER)) {
        const after = trainer.password.substring(TEAM_MARKER.length)
        const sep = after.indexOf('__')
        if (sep !== -1) {
          const trole = after.substring(0, sep)
          role = trole || 'team' // founder | leader | team
        }
      }
      profile = {
        user_id: userId,
        name: trainer.name,
        avatar: trainer.avatar,
        role,
        title: trainer.title,
        specialization: trainer.specialization,
      }
    }
  }

  if (!profile) return null

  // Update cache
  try {
    await supabaseAdmin
      .from('public_profiles')
      .upsert({ ...profile, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  } catch {}

  return profile
}

// GET /api/public-profiles?user_id=...&ids=id1,id2,id3 — fetch display info
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('user_id')
    const ids = req.nextUrl.searchParams.get('ids')

    if (userId) {
      const profile = await resolveProfile(userId)
      if (!profile) return NextResponse.json({ error: 'غير موجود' }, { status: 404 })
      return NextResponse.json(profile)
    }

    if (ids) {
      const idList = ids.split(',').filter(Boolean)
      const results: any[] = []
      for (const id of idList) {
        const p = await resolveProfile(id.trim())
        if (p) results.push(p)
      }
      return NextResponse.json(results)
    }

    return NextResponse.json({ error: 'user_id or ids required' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
