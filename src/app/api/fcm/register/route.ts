import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * POST /api/fcm/register
 *
 * Body: { user_id, token }
 *
 * Registers an FCM token for a user. Called by the APK when:
 *   1. The Firebase SDK generates a new FCM token (on app install)
 *   2. The user logs in (after the user_id is known)
 *
 * The server stores the (user_id, token) pair in the fcm_tokens table.
 * Multiple tokens per user are allowed — the user may be logged in
 * on multiple devices.
 *
 * Returns:
 *  - { success: true } if registered successfully
 *  - { success: false, error: '...' } on error
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const userId = body?.user_id
    const token = body?.token

    if (!userId || !token) {
      return NextResponse.json(
        { success: false, error: 'user_id and token required' },
        { status: 400 }
      )
    }

    // Upsert the token — if it already exists for this user, don't duplicate
    const { error } = await supabaseAdmin
      .from('fcm_tokens')
      .upsert({
        user_id: userId,
        token: token,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,token',
        ignoreDuplicates: false,
      })

    if (error) {
      // If the table doesn't exist, the user needs to create it.
      // Return a helpful error.
      if (error.message.includes('does not exist') || error.message.includes('relation')) {
        return NextResponse.json({
          success: false,
          error: 'fcm_tokens table does not exist. Please run the SQL migration to create it (see src/lib/fcm-schema.sql).',
          db_error: error.message,
        }, { status: 500 })
      }
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('[FIA-FCM] register error:', e)
    return NextResponse.json(
      { success: false, error: e.message },
      { status: 500 }
    )
  }
}
