import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser, rateLimit, clientIp, tooMany } from '@/lib/api-auth'

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
 * 👑 إصلاح ملكي v5.5: يرحّب بنداءات التطبيق الأصلي بلا توقيع (بحساب حيّ
 *    + حد محاولات) — كما في مسار التسجيل، حتى لا تظل روابط الأجهزة معلقة.
 *
 * Returns:
 *  - { success: true } if removed (or didn't exist — same result)
 *  - { success: false, error: '...' } on error
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const bodyUserId = body?.user_id
    const token = body?.token

    if (!bodyUserId || !token) {
      return NextResponse.json(
        { success: false, error: 'user_id and token required' },
        { status: 400 }
      )
    }

    const authUser = await getAuthUser(req)
    let effectiveUserId = bodyUserId
    if (authUser) {
      effectiveUserId = authUser.id
    } else {
      const rl = rateLimit(`fcmunreg:${clientIp(req)}`, 30, 5 * 60 * 1000)
      if (!rl.ok) return tooMany(rl.retryAfterSec)

      const { data: liveUser } = await supabaseAdmin
        .from('users').select('id').eq('id', bodyUserId).maybeSingle()
      let live = liveUser
      if (!live) {
        const { data: liveTrainer } = await supabaseAdmin
          .from('trainers').select('id').eq('id', bodyUserId).maybeSingle()
        live = liveTrainer
      }
      if (!live) {
        // لا ضرر بإزالة رابط حساب ميت — ننجح بصمت (النتيجة نفسها)
        return NextResponse.json({ success: true })
      }
    }

    const { error } = await supabaseAdmin
      .from('fcm_tokens')
      .delete()
      .eq('user_id', effectiveUserId)
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
