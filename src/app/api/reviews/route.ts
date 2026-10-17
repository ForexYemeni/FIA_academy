import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { notifyReviewSubmitted } from '@/lib/notifications'

export async function GET(req: NextRequest) {
  try {
    const courseId = req.nextUrl.searchParams.get('course_id')
    const userId = req.nextUrl.searchParams.get('user_id')
    let query = supabaseAdmin.from('reviews').select('*')
    if (courseId) query = query.eq('course_id', courseId)
    if (userId) query = query.eq('user_id', userId)
    query = query.eq('status', 'نشط').order('helpful_count', { ascending: false })
    const { data, error } = await query
    if (error) throw error

    // Enrich each review with the author's public profile (name, avatar, role).
    // We avoid the N+1 problem by batch-fetching from the public_profiles
    // cache first, then falling back to per-user lookup for any missing.
    const authorIds = Array.from(new Set((data || []).map((r: any) => r.user_id)))
    let authorMap: Record<string, any> = {}
    if (authorIds.length > 0) {
      const { data: profiles } = await supabaseAdmin
        .from('public_profiles')
        .select('*')
        .in('user_id', authorIds)
      for (const p of profiles || []) authorMap[p.user_id] = p
      // Resolve missing ones individually
      for (const id of authorIds) {
        if (authorMap[id]) continue
        const { data: u } = await supabaseAdmin
          .from('users')
          .select('id, name, avatar, role, title')
          .eq('id', id)
          .maybeSingle()
        if (u) {
          authorMap[id] = { user_id: id, name: u.name, avatar: u.avatar, role: u.role, title: u.title }
          try {
            await supabaseAdmin.from('public_profiles').upsert({
              user_id: id, name: u.name, avatar: u.avatar, role: u.role, title: u.title,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id' })
          } catch {}
        } else {
          const { data: t } = await supabaseAdmin
            .from('trainers')
            .select('id, name, avatar, title, specialization, password')
            .eq('id', id)
            .maybeSingle()
          if (t) {
            let r = 'trainer'
            if (t.password?.startsWith('__TEAM_MEMBER__')) {
              const after = t.password.substring('__TEAM_MEMBER__:'.length)
              const sep = after.indexOf('__')
              if (sep !== -1) r = after.substring(0, sep) || 'team'
            }
            authorMap[id] = { user_id: id, name: t.name, avatar: t.avatar, role: r, title: t.title, specialization: t.specialization }
            try {
              await supabaseAdmin.from('public_profiles').upsert({
                user_id: id, name: t.name, avatar: t.avatar, role: r, title: t.title,
                specialization: t.specialization, updated_at: new Date().toISOString(),
              }, { onConflict: 'user_id' })
            } catch {}
          }
        }
      }
    }

    const enriched = (data || []).map((r: any) => ({
      ...r,
      author: authorMap[r.user_id] || null,
    }))
    return NextResponse.json(enriched)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { course_id, user_id, rating, title, body } = await req.json()
    if (!course_id || !user_id || !rating) {
      return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
    }
    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'التقييم يجب أن يكون بين 1 و 5' }, { status: 400 })
    }
    // Upsert — one review per user per course (unique constraint enforced at DB)
    const { data, error } = await supabaseAdmin
      .from('reviews')
      .upsert({
        course_id,
        user_id,
        rating,
        title: title || null,
        body: body || null,
        status: 'نشط',
      }, { onConflict: 'course_id,user_id' })
      .select()
      .single()
    if (error) {
      if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
        return NextResponse.json({ error: 'لقد قمت بالتقييم مسبقاً' }, { status: 400 })
      }
      throw error
    }
    // Notify the course trainer + admins about the new review
    try {
      await notifyReviewSubmitted(user_id, course_id, rating)
    } catch {}
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// NOTE: PUT and DELETE are intentionally NOT implemented here.
// Reviews are student-owned feedback and must NEVER be edited, hidden,
// suspended, or deleted by anyone — including admins. This is by design
// to keep student feedback flowing unfiltered to leadership.
//
// If you need to remove a defamatory / illegal review, do it directly
// in the Supabase SQL editor (with full audit trail) — not via the app.

