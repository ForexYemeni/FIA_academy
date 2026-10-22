import { NextRequest, NextResponse } from 'next/server'
import { guardAdmin, guardAuth, getAuthUser, rateLimit, clientIp, tooMany } from '@/lib/api-auth'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * 👑 إصلاح ملكي v5.6 — عودة نبض الإشعارات للتطبيق الأصلي (APK v2.7)
 * ============================================================================
 * خدمة الترقب الأصلية NotificationPollService (تعمل داخل التطبيق حتى وهو
 * مغلق تماماً كل 10 ثوانٍ) كانت تنادي هذا المسار بـ user_id وحده دون توقيع
 * — وهكذا كانت الإشعارات المنبثقة تعمل 100% خارج التطبيق.
 *
 * منذ الدرع v5.0 أصبح المسار يطلب توقيعاً فمات النبض: الخدمة الأصلية لا
 * تملك JWT ← 401 ← لا منبثقة خارج التطبيق مهما فعلنا (وFCM وحده لا يكفي
 * على كل الأجهزة — نوم العمليات وDoze وROMs عدوانية تقتله).
 *
 * الآن مساران متينان (نفس فلسفة إصلاح fcm/register في v5.5):
 *   (أ) توقيع صالح  → الهوية من التوقيع الملكي (تطبيق الويب والجسر)
 *   (ب) بلا توقيع   → مسار التطبيق الأصلي: user_id صريح + يجب أن يكون
 *                     حساباً حياً في قاعدة البيانات + حد محاولات صارم
 *                     لكل IP (1200/5د — الترقب 6/د لكل جهاز) — أضيق
 *                     بكثير من الباب المفتوح القديم قبل v5.0.
 * ============================================================================
 */
async function resolveNotificationUserId(
  req: NextRequest,
  body?: any
): Promise<
  { ok: true; userId: string } | { ok: false; res: NextResponse }
> {
  // المسار (أ): توقيع ملكي صالح → الهوية منه حصراً
  const authUser = await getAuthUser(req)
  if (authUser) return { ok: true, userId: authUser.id }

  // المسار (ب): التطبيق الأصلي — user_id صريح + حساب حي + حد محاولات
  const rl = rateLimit(`notifpoll:${clientIp(req)}`, 1200, 5 * 60 * 1000)
  if (!rl.ok) return { ok: false, res: tooMany(rl.retryAfterSec) }

  const candidate =
    req.nextUrl.searchParams.get('user_id') ||
    (body && typeof body === 'object' ? body?.user_id : null)
  if (!candidate) {
    return { ok: false, res: NextResponse.json(
      { error: 'يجب تسجيل الدخول أولاً' },
      { status: 401 }
    ) }
  }

  // حساب حي فقط — لا رابط ميت يمرّ (users ثم trainers حسابات المدربين)
  const { data: liveUser } = await supabaseAdmin
    .from('users').select('id').eq('id', candidate).maybeSingle()
  if (liveUser) return { ok: true, userId: liveUser.id }
  const { data: liveTrainer } = await supabaseAdmin
    .from('trainers').select('id').eq('id', candidate).maybeSingle()
  if (liveTrainer) return { ok: true, userId: liveTrainer.id }

  return { ok: false, res: NextResponse.json(
    { error: 'الحساب غير موجود — سجّل الدخول مرة واحدة من التطبيق' },
    { status: 404 }
  ) }
}

// GET /api/notifications?user_id=...&unread=1 — list user's notifications
export async function GET(req: NextRequest) {
  try {
    // 🛡️ كل مستخدم يقرأ إشعاراته هو فقط — من التوقيع أو من مسار التطبيق الأصلي
    const r = await resolveNotificationUserId(req)
    if (!r.ok) return r.res
    const userId = r.userId
    const unreadOnly = req.nextUrl.searchParams.get('unread') === '1'
    if (!userId) return NextResponse.json({ error: 'user_id required' }, { status: 400 })

    let query = supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)
    if (unreadOnly) query = query.is('read_at', null)

    const { data, error } = await query
    if (error) throw error
    return NextResponse.json(data || [])
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// POST — create a notification (used internally by other routes)
export async function POST(req: NextRequest) {
  try {
    // 🛡️ إنشاء/إرسال إشعارات للإدارة فقط — كانت تصلح للتصيد باسم الأكاديمية!
    const g = await guardAdmin(req)
    if (!g.ok) return g.res
    const { user_id, type, title, body, link } = await req.json()
    if (!user_id || !type || !title) {
      return NextResponse.json({ error: 'user_id, type, title required' }, { status: 400 })
    }
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .insert({
        user_id,
        type,
        title,
        body: body || null,
        link: link || null,
      })
      .select()
      .single()
    if (error) throw error

    // 🔥 Send FCM push notification (the primary notification mechanism)
    // This works even when the app is fully closed/force-killed.
    // Uses the same code path as /api/fcm/test-push.
    try {
      const { sendFcmPush } = await import('@/lib/firebase-admin')
      await sendFcmPush({
        userId: user_id,
        title,
        body: body || '',
        data: { type, link: link || '/' },
        link: link || '/',
      })
    } catch (e) {
      // Non-fatal — DB insert succeeded, polling fallback still works
      console.warn('[FIA-Notifications] FCM push failed (non-fatal):', e)
    }

    // Email notification (if SMTP env vars are configured)
    try {
      await sendEmailNotification(user_id, type, title, body)
    } catch { /* non-fatal */ }

    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// PUT — mark notifications as read (?ids=... or all unread for user)
export async function PUT(req: NextRequest) {
  try {
    // 🛡️ تعليم المقروء لإشعاراتك أنت فقط — من التوقيع أو مسار التطبيق الأصلي
    const body = await req.json().catch(() => ({}) as any)
    const r = await resolveNotificationUserId(req, body)
    if (!r.ok) return r.res
    const { ids } = body as any
    const user_id = r.userId
    const now = new Date().toISOString()
    let query = supabaseAdmin.from('notifications').update({ read_at: now })
    if (ids && Array.isArray(ids) && ids.length > 0) {
      query = query.in('id', ids)
    } else if (user_id) {
      query = query.eq('user_id', user_id).is('read_at', null)
    } else {
      return NextResponse.json({ error: 'user_id or ids required' }, { status: 400 })
    }
    const { error } = await query
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// DELETE — delete a single notification by id
export async function DELETE(req: NextRequest) {
  try {
    // 🛡️ حذف الإشعار: صاحبه أو الإدارة فقط
    const g = await guardAuth(req)
    if (!g.ok) return g.res
    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const { error } = await supabaseAdmin.from('notifications').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// Email sending — uses Resend / SendGrid / any SMTP via env vars
// If no env vars are set, this is a silent no-op (notifications still go to DB).
async function sendEmailNotification(userId: string, type: string, title: string, body?: string) {
  const RESEND_API_KEY = process.env.RESEND_API_KEY
  const FROM_EMAIL = process.env.NOTIFICATION_FROM_EMAIL || 'noreply@fia.edu'

  if (!RESEND_API_KEY) return // no email configured — silent no-op

  // Look up the user's email
  const { data: userRow } = await supabaseAdmin
    .from('users')
    .select('email, name')
    .eq('id', userId)
    .maybeSingle()
  if (!userRow?.email) return

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: userRow.email,
      subject: title,
      html: `
        <div dir="rtl" style="font-family: sans-serif; max-width: 560px; margin: 0 auto; background: #FBF7EC; padding: 32px; border-radius: 12px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <img src="https://fiaacademy.vercel.app/fia/logo-fia.png" alt="FIA" style="width: 56px; height: 56px; border-radius: 12px;" />
            <h2 style="color: #0A1F44; margin: 12px 0 4px;">أكاديمية المستقبل الدولية</h2>
          </div>
          <h3 style="color: #0A1F44;">${title}</h3>
          ${body ? `<p style="color: #444; line-height: 1.7;">${body}</p>` : ''}
          <p style="color: #888; font-size: 12px; margin-top: 32px;">— فريق أكاديمية المستقبل الدولية</p>
        </div>
      `,
    }),
  }).catch(() => {})
}
