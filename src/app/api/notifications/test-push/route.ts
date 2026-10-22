import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendPushNotification } from '@/lib/onesignal'
import { guardAdmin, guardStaff, guardAuth } from '@/lib/api-auth'

/**
 * POST /api/notifications/test-push
 *
 * Body: { user_id }
 *
 * Forces a OneSignal push notification to the given user's device(s),
 * bypassing the regular notification flow. Used to diagnose whether
 * OneSignal delivery itself is working.
 *
 * Returns:
 *  - { success: true, push_sent: true } if OneSignal accepted the push
 *  - { success: true, push_sent: false, reason: '...' } if push failed
 *  - { error: '...' } on internal error
 */
export async function POST(req: NextRequest) {
  try {
  const g = await guardAdmin(req); if (!g.ok) return g.res
    const body = await req.json().catch(() => ({}))
    const userId = body?.user_id
    if (!userId) {
      return NextResponse.json({ error: 'user_id required' }, { status: 400 })
    }

    // 1) Insert into the notifications table (so the polling service
    //    can ALSO pick it up — this gives us a backup path)
    let notifId: string | null = null
    try {
      const { data, error } = await supabaseAdmin
        .from('notifications')
        .insert({
          user_id: userId,
          type: 'system',
          title: '🔔 اختبار الإشعارات الفورية',
          body: `هذا إشعار اختبار مباشر (${new Date().toLocaleString('ar-EG')}). إن كنت تراه، الإشعارات تعمل!`,
          link: '/',
        })
        .select()
        .single()
      if (!error && data) {
        notifId = data.id
      }
    } catch {}

    // 2) Try to send via OneSignal directly
    let pushResult: { success: boolean; reason?: string; raw?: any } = {
      success: false,
    }
    try {
      const ok = await sendPushNotification(
        userId,
        '🔔 اختبار الإشعارات الفورية',
        `هذا إشعار اختبار مباشر (${new Date().toLocaleString('ar-EG')}). إن كنت تراه، الإشعارات تعمل!`,
        { type: 'system', link: '/', test: true }
      )
      pushResult = { success: ok }
      if (!ok) {
        pushResult.reason =
          'OneSignal push failed — check ONESIGNAL_APP_ID and ONESIGNAL_API_KEY env vars, OR the user has not logged in from the APK yet (so OneSignal.login(userId) was never called).'
      }
    } catch (e: any) {
      pushResult = {
        success: false,
        reason: e?.message || 'Unknown error',
        raw: e?.toString()?.substring(0, 200),
      }
    }

    // 3) Check the env vars are set (without revealing them)
    const envCheck = {
      ONESIGNAL_APP_ID_set: !!process.env.ONESIGNAL_APP_ID,
      ONESIGNAL_API_KEY_set: !!process.env.ONESIGNAL_API_KEY,
      ONESIGNAL_APP_ID_length: process.env.ONESIGNAL_APP_ID?.length || 0,
      ONESIGNAL_API_KEY_length: process.env.ONESIGNAL_API_KEY?.length || 0,
    }

    return NextResponse.json({
      success: true,
      notification_id: notifId,
      push_sent: pushResult.success,
      push_reason: pushResult.reason,
      env_check: envCheck,
      user_id: userId,
      timestamp: new Date().toISOString(),
      note: pushResult.success
        ? 'Push notification sent successfully. The user should see it within 5-10 seconds if their device is online and the APK is installed with the OneSignal SDK registered.'
        : 'Push failed. The polling service will still pick up the DB notification within 30 seconds (if the APK is running and the user is logged in).',
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
