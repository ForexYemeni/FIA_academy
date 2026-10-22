import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { guardAdmin, guardStaff, guardAuth } from '@/lib/api-auth'

const TEAM_MARKER_PREFIX = '__TEAM_MEMBER__:'

// GET /api/users-search?q=name&role=student — search users by name
//
// CRITICAL: For team members (founder/leader/team) who exist in BOTH the
// `trainers` table (with team marker in password) AND the `users` table
// (with role=admin, used for login), we MUST return the **admin user ID**
// (from `users.id`) — NOT the trainer ID. Otherwise the student's chat
// messages would be sent to the trainer ID, but the founder logs in via
// the admin ID and would never see those conversations.
//
// The link between the two tables is the email address.
export async function GET(req: NextRequest) {
  try {
  const g = await guardAuth(req); if (!g.ok) return g.res
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
        // Skip admin-role users in chat search — they duplicate with
        // the founder entry from trainers table. The founder should
        // only appear once (from the team/trainers search with team marker).
        if (u.role === 'admin') continue
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
        // Build a list of emails for team members so we can batch-lookup
        // their admin user IDs in the users table.
        const teamEmails = trainers
          .filter((t: any) => t.password?.startsWith(TEAM_MARKER_PREFIX))
          .map((t: any) => t.email)
          .filter(Boolean)

        let adminUserByEmail: Record<string, { id: string; name?: string; avatar?: string | null }> = {}
        if (teamEmails.length > 0) {
          const { data: adminRows } = await supabaseAdmin
            .from('users')
            .select('id, name, email, avatar')
            .in('email', teamEmails)
            .eq('role', 'admin')
          for (const a of adminRows || []) {
            adminUserByEmail[a.email] = { id: a.id, name: a.name, avatar: a.avatar }
          }
        }

        for (const t of trainers) {
          let r = 'trainer'
          let teamRole: string | undefined
          if (t.password?.startsWith(TEAM_MARKER_PREFIX)) {
            const after = t.password.substring(TEAM_MARKER_PREFIX.length)
            const sep = after.indexOf('__')
            if (sep !== -1) {
              r = after.substring(0, sep) || 'team'
              teamRole = r
            }
          }

          // For team members (founder/leader/team), prefer the admin
          // user ID — that's the ID they use to log in and fetch chat
          // conversations. If no admin entry exists, fall back to the
          // trainer ID (so the search result is still usable, even if
          // the founder hasn't been set up in the users table).
          const adminEntry = adminUserByEmail[t.email]
          const canonicalId = adminEntry?.id || t.id
          // Prefer the admin user's name + avatar (the founder updates
          // their admin profile, not the trainers one). Fall back to
          // trainer fields if admin row didn't have them.
          const displayName = adminEntry?.name || t.name
          const displayAvatar = adminEntry?.avatar || t.avatar

          results.push({
            id: canonicalId,
            trainer_id: adminEntry ? t.id : undefined, // for debugging/optional use
            name: displayName,
            email: t.email,
            avatar: displayAvatar,
            role: r,
            team_role: teamRole,
            title: t.title,
            specialization: t.specialization,
            source: adminEntry ? 'users+trainers' : 'trainers',
          })
        }
      }
    }

    return NextResponse.json(results.slice(0, 20))
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
