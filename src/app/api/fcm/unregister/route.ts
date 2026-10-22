import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { guardAdmin, guardStaff, guardAuth } from '@/lib/api-auth'

/**
 * POST /api/fcm/unregister
 *
 * Body: { user_id, token }
 *
 * Removes an FCM token for a user. Called by the APK when:
 *   - The user logs out (so this device stops receiving notifications
 *     for the previous user)
 *   - The Firebase SDK rotates the token (the old token is removed)
 *
 * Returns:
 *  - { success: true } if removed (or didn't exist — same result)
 *  - { success: false, error: '...' } on error
 */
export async function POST(req: NextRequest) {
  try {
  const g = await guardAuth(req); if (!g.ok) return g.res
    const body = await req.json().catch(() => ({}))
    const userId = body?.user_id
    const token = body?.token

    if (!userId || !token) {
      return NextResponse.json(
        { success: false, error: 'user_id and token required' },
        { status: 400 }
      )
    }

    const { error } = await supabaseAdmin
      .from('fcm_tokens')
      .delete()
      .eq('user_id', userId)
      .eq('token', token)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('[FIA-FCM] unregister error:', e)
    return NextResponse.json(
      { success: false, error: e.message },
      { status: 500 }
    )
  }
}
