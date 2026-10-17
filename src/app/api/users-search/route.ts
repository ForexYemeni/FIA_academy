import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// GET /api/users-search?q=name&role=student — search users by name (for ban UI)
export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get('q') || ''
    const role = req.nextUrl.searchParams.get('role') // filter role
    if (!q || q.length < 2) return NextResponse.json([])

    const results: any[] = []

    // Search students in users table
    let userQuery = supabaseAdmin
      .from('users')
      .select('id, name, email, avatar, role')
      .ilike('name', `%${q}%`)
      .limit(10)
    if (role && role !== 'trainer') {
      userQuery = userQuery.eq('role', role)
    }
    const { data: users } = await userQuery
    if (users) {
      for (const u of users) {
        results.push({
          id: u.id,
          name: u.name,
          email: u.email,
          avatar: u.avatar,
          role: u.role,
          source: 'users',
        })
      }
    }

    // Search trainers (and team members)
    if (!role || role === 'trainer' || role === 'team') {
      const { data: trainers } = await supabaseAdmin
        .from('trainers')
        .select('id, name, email, avatar, title, specialization, password')
        .ilike('name', `%${q}%`)
        .limit(10)
      if (trainers) {
        for (const t of trainers) {
          let r = 'trainer'
          if (t.password?.startsWith('__TEAM_MEMBER__')) {
            const after = t.password.substring('__TEAM_MEMBER__:'.length)
            const sep = after.indexOf('__')
            if (sep !== -1) r = after.substring(0, sep) || 'team'
          }
          results.push({
            id: t.id,
            name: t.name,
            email: t.email,
            avatar: t.avatar,
            role: r,
            title: t.title,
            specialization: t.specialization,
            source: 'trainers',
          })
        }
      }
    }

    return NextResponse.json(results.slice(0, 20))
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
