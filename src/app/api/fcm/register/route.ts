import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser, rateLimit, clientIp, tooMany } from '@/lib/api-auth'

/**
 * POST /api/fcm/register
 *
 * Body: { user_id, token }
 *
 * Registers an FCM token for a user. Called by:
 *   1. The APK (native Firebase SDK) when a token is generated or the
 *      user logs in — the APK does NOT attach a JWT header.
 *   2. The web app via the api-auth-bridge (attaches a Bearer JWT).
 *
 * 👑 إصلاح ملكي v5.5 — كان الحرس يرفض نداءات التطبيق الأصلي (بلا توقيع)
 *    فتوقفت تسجيلات التوكنات منذ الدرع v5.0 = انطفأت الإشعارات المنبثقة
 *    خارج التطبيق لكل الأجهزة (كانت تصل فقط داخل التطبيق المفتوح عبر
 *    Realtime). الآن مساران متينان:
 *
 *    (أ) توقيع صالح  → الهوية من التوقيع الملكي (الأدق — يتفوق على الجسم)
 *    (ب) بلا توقيع   → مسار التطبيق الأصلي: يُقبل الربط فقط لحساب حيّ
 *                      في قاعدة البيانات + حد محاولات صارم لكل IP
 *                      (30/5د) — أضيق من الباب المفتوح القديم قبل v5.0.
 *
 * 🧬 ترحيل التوكن الملكي: إذا كان التوكن نفسه مربوطاً بحساب آخر (قديم/
 *    محذوف) تُمسح الروابط القديمة أولاً — فالتوكن يتبع آخر تسجيل دخول
 *    دائماً ولا تبقى روابط ميتة تعيق الإشعارات أبداً.
 *
 * Returns:
 *  - { success: true } if registered successfully
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

    // 🛡️ المسار (أ): توقيع ملكي صالح → الهوية منه حصراً
    const authUser = await getAuthUser(req)
    let effectiveUserId = bodyUserId

    if (authUser) {
      effectiveUserId = authUser.id
    } else {
      // 🛡️ المسار (ب): التطبيق الأصلي بلا توقيع — حد محاولات صارم + حساب حيّ فقط
      const rl = rateLimit(`fcmreg:${clientIp(req)}`, 30, 5 * 60 * 1000)
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
        return NextResponse.json(
          { success: false, error: 'الحساب غير موجود — سجّل الدخول مرة واحدة من التطبيق لإعادة ربط الإشعارات' },
          { status: 404 }
        )
      }
    }

    // 🧬 ترحيل التوكن: أي ربط قديم لنفس التوكن بحساب آخر يُمسح أولاً —
    //    فلا تبقى روابط ميتة (حسابات محذوفة) تحتكر الجهاز.
    try {
      await supabaseAdmin
        .from('fcm_tokens')
        .delete()
        .eq('token', token)
        .neq('user_id', effectiveUserId)
    } catch {}

    // Upsert the token — if it already exists for this user, don't duplicate
    const { error } = await supabaseAdmin
      .from('fcm_tokens')
      .upsert({
        user_id: effectiveUserId,
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
