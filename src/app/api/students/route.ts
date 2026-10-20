import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const role = req.nextUrl.searchParams.get('role') || 'student'
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '0') || 0
    const offset = parseInt(req.nextUrl.searchParams.get('offset') || '0') || 0

    // Fetch all users with role='student'
    let query = supabaseAdmin
      .from('users')
      .select('*')
      .eq('role', role)
      .order('created_at', { ascending: false })
    if (limit > 0) {
      query = query.range(offset, offset + limit - 1)
    }
    const { data: users, error } = await query

    if (error) throw error

    // Strip passwords before returning
    const safe = (users || []).map(({ password, ...rest }: any) => rest)

    // Optionally enrich with enrollment counts (count of payment records per student)
    const { data: allPayments } = await supabaseAdmin
      .from('payments')
      .select('user_id, id')
      .not('user_id', 'is', null)

    const enrollmentCounts: Record<string, number> = {}
    ;(allPayments || []).forEach((p: any) => {
      if (p.user_id) {
        enrollmentCounts[p.user_id] = (enrollmentCounts[p.user_id] || 0) + 1
      }
    })

    const enriched = safe.map((u: any) => ({
      ...u,
      enrollment_count: enrollmentCounts[u.id] || 0,
    }))

    return NextResponse.json(enriched)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { data, error } = await supabaseAdmin
      .from('users')
      .insert({
        name: body.name,
        email: body.email,
        password: body.password,
        phone: body.phone || null,
        role: body.role || 'student',
        title: body.title || null,
        bio: body.bio || null,
        avatar: body.avatar || null,
      })
      .select()
      .single()
    if (error) throw error
    const { password, ...safe } = data
    return NextResponse.json(safe)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { id, ...updates } = await req.json()
    if (!updates.password) delete updates.password
    const { data, error } = await supabaseAdmin
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    const { password, ...safe } = data
    return NextResponse.json(safe)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    // Before deleting, store the user's ID in a "force_logout" table
    // so the auth store can check and force-logout the deleted user
    // on their next app load. Without this, the deleted user's session
    // in localStorage remains valid until they manually logout.
    try {
      await supabaseAdmin.from('force_logout').upsert({
        user_id: id,
        reason: 'account_deleted',
        created_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
    } catch {}

    // Cascade delete related data to prevent orphaned rows
    for (const table of ['payments', 'certificates', 'reviews', 'forum_topics', 'forum_posts', 'lesson_progress', 'course_progress', 'exam_attempts', 'chat_messages', 'notifications']) {
      try {
        await supabaseAdmin.from(table).delete().eq('user_id', id)
      } catch {}
      try {
        await supabaseAdmin.from(table).delete().eq('sender_id', id)
      } catch {}
    }

    // Also delete their chat conversations
    try {
      await supabaseAdmin.from('chat_conversations').delete().or(`participant_1.eq.${id},participant_2.eq.${id}`)
    } catch {}

    // Delete public profiles
    try {
      await supabaseAdmin.from('public_profiles').delete().eq('user_id', id)
    } catch {}

    // Finally, delete the user
    const { error } = await supabaseAdmin.from('users').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
