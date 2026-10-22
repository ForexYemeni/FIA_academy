import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendFcmPush } from '@/lib/firebase-admin'
import { guardAdmin, guardStaff, guardAuth } from '@/lib/api-auth'

/**
 * POST /api/fcm/test-push
 *
 * Body: { user_id, title?, body? }
 *
 * Sends a test FCM push directly to the user's device(s) to verify
 * Firebase Cloud Messaging is working end-to-end.
 *
 * Returns:
 *  - { success: true, sent: N, failed: M } if at least one push went through
 *  - { success: false, reason: '...' } otherwise
 *  - Also returns env_check (which Firebase env vars are set)
 */
export async function POST(req: NextRequest) {
  try {
  const g = await guardAdmin(req); if (!g.ok) return g.res
    const body = await req.json().catch(() => ({}))
    const userId = body?.user_id
    if (!userId) {
      return NextResponse.json(
        { error: 'user_id required' },
        { status: 400 }
      )
    }

    const title = body?.title || '🔔 اختبار الإشعارات الفورية'
    const bodyText = body?.body || `إشعار اختبار مباشر (${new Date().toLocaleString('ar-EG')}). إن كنت تراه، الإشعارات تعمل!`

    // 1) Check env vars are set
    const envCheck = {
      FIREBASE_PROJECT_ID_set: !!process.env.FIREBASE_PROJECT_ID,
      FIREBASE_CLIENT_EMAIL_set: !!process.env.FIREBASE_CLIENT_EMAIL,
      FIREBASE_PRIVATE_KEY_set: !!process.env.FIREBASE_PRIVATE_KEY,
      FIREBASE_PROJECT_ID_value: process.env.FIREBASE_PROJECT_ID || null,
    }

    // 2) Check if user has any FCM tokens registered
    const { data: tokens, error: tokensError } = await supabaseAdmin
      .from('fcm_tokens')
      .select('token, created_at')
      .eq('user_id', userId)

    if (tokensError) {
      return NextResponse.json({
        success: false,
        reason: `DB error fetching FCM tokens: ${tokensError.message}`,
        env_check: envCheck,
        hint: tokensError.message.includes('does not exist') || tokensError.message.includes('relation')
          ? 'The fcm_tokens table does not exist. Run the SQL migration to create it.'
          : undefined,
      }, { status: 500 })
    }

    if (!tokens || tokens.length === 0) {
      return NextResponse.json({
        success: false,
        reason: 'No FCM tokens registered for this user. The user must install the new APK (v2.6.0+) and log in — the APK sends the FCM token to /api/fcm/register on login.',
        env_check: envCheck,
        token_count: 0,
        hint: 'If the user has the new APK installed and logged in, check that the APK can reach https://fiaacademy.vercel.app/api/fcm/register. Also check that the fcm_tokens table exists in Supabase.',
      })
    }

    // 3) Send the FCM push
    const result = await sendFcmPush({
      userId,
      title,
      body: bodyText,
      data: { type: 'system', link: '/', test: 'true' },
    })

    // 4) Also insert into the notifications table (so the polling
    //    service can ALSO pick it up — backup path)
    try {
      await supabaseAdmin.from('notifications').insert({
        user_id: userId,
        type: 'system',
        title,
        body: bodyText,
        link: '/',
      })
    } catch {}

    return NextResponse.json({
      success: result.success,
      sent: result.sent,
      failed: result.failed,
      reason: result.reason,
      env_check: envCheck,
      token_count: tokens.length,
      user_id: userId,
      timestamp: new Date().toISOString(),
    })
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e.message },
      { status: 500 }
    )
  }
}
