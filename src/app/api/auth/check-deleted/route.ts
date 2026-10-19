import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * GET /api/auth/check-deleted?user_id=...
 *
 * Checks if a user's account has been deleted (by checking both
 * the force_logout table AND whether the user still exists in the
 * users/trainers tables). Returns { deleted: boolean }.
 *
 * Called by the auth-store on app rehydration to force-logout
 * deleted users.
 */
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('user_id')
    if (!userId) {
      return NextResponse.json({ deleted: false })
    }

    // 1. Check if the user exists in the users table
    const { data: userRow } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', userId)
      .maybeSingle()

    if (userRow) {
      // User still exists — check force_logout table
      const { data: fl } = await supabaseAdmin
        .from('force_logout')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle()
      if (fl) {
        return NextResponse.json({ deleted: true, reason: fl.reason })
      }
      return NextResponse.json({ deleted: false })
    }

    // 2. Check if the user exists in the trainers table (for team members)
    const { data: trainerRow } = await supabaseAdmin
      .from('trainers')
      .select('id')
      .eq('id', userId)
      .maybeSingle()

    if (trainerRow) {
      const { data: fl } = await supabaseAdmin
        .from('force_logout')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle()
      if (fl) {
        return NextResponse.json({ deleted: true, reason: fl.reason })
      }
      return NextResponse.json({ deleted: false })
    }

    // 3. User not found in either table — account was deleted
    return NextResponse.json({ deleted: true, reason: 'account_not_found' })
  } catch {
    // On error, don't force-logout (safer to allow than to lock out)
    return NextResponse.json({ deleted: false })
  }
}
