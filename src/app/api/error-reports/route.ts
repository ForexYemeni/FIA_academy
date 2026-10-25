import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { guardAdmin, rateLimit, clientIp, tooMany } from '@/lib/api-auth'

export const runtime = 'nodejs'
export const maxDuration = 30

// ============================================================================
// 👑 v10.6 — مراقبة الأخطاء الحية الملكية
// ============================================================================
// فلسفة التصميم: صفر ترحيل قاعدة بيانات — الأخطاء تصل للإدارة كإشعارات
// حقيقية (نوع 'error') فيرنها الجرس فوراً في كل جهاز، والبث الفوري في
// التطبيق يرفعها كمنبثقة أصلياً. بذلك «أي خلل يصل لك فوراً كإشعار» حرفياً.
//
// الحماية من الفيضان (ثلاث طبقات):
//   1) العميل: بصمة خطأ لا تُرسل مرتين خلال 60 دقيقة + سقف 12 تقرير/5 دقائق
//   2) الخادم: حد معدل 30 طلب/5 دقائق لكل IP
//   3) الخادم: نفس البصمة لا تولّد إشعاراً جديداً قبل 3 ساعات (فحص قاعدة)
// ============================================================================

const ERROR_NOTIF_TYPE = 'error'

async function adminIds(): Promise<string[]> {
  try {
    const { data } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('role', 'admin')
      .limit(50)
    return (data || []).map((u) => u.id)
  } catch {
    return []
  }
}

// POST — استقبال تقرير خطأ من العميل (عام مع حدود صارمة)
export async function POST(req: NextRequest) {
  try {
    const rl = rateLimit(`err:${clientIp(req)}`, 30, 5 * 60 * 1000)
    if (!rl.ok) return tooMany(rl.retryAfterSec)

    const body = await req.json().catch(() => ({}))
    const message = String(body?.message || '').slice(0, 500)
    const stack = String(body?.stack || '').slice(0, 3000)
    const pageUrl = String(body?.url || '').slice(0, 400)
    const severity = ['critical', 'error', 'warning'].includes(body?.severity) ? body.severity : 'error'
    const fingerprint = String(body?.fingerprint || '').replace(/[^a-f0-9]/g, '').slice(0, 32)

    if (!message) return NextResponse.json({ ok: false }, { status: 400 })

    // طبقة 3: نفس البصمة خلال 3 ساعات → صامت (مُحصود مسبقاً)
    if (fingerprint) {
      const since = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
      const { data: recent } = await supabaseAdmin
        .from('notifications')
        .select('id')
        .eq('type', ERROR_NOTIF_TYPE)
        .ilike('body', `%fp:${fingerprint}%`)
        .gte('created_at', since)
        .limit(1)
      if (recent && recent.length > 0) {
        return NextResponse.json({ ok: true, deduped: true })
      }
    }

    const ids = await adminIds()
    if (ids.length === 0) return NextResponse.json({ ok: true, no_admins: true })

    const icon = severity === 'critical' ? '🚨' : severity === 'warning' ? '⚠️' : '❗'
    const title = `${icon} خلل في الأكاديمية — مراقب حي`
    const bodyText = [
      message,
      pageUrl ? `الصفحة: ${pageUrl}` : '',
      stack ? `التتبع: ${stack.slice(0, 600)}` : '',
      fingerprint ? `fp:${fingerprint}` : '',
    ].filter(Boolean).join('\n').slice(0, 1900)

    await supabaseAdmin.from('notifications').insert(
      ids.map((uid) => ({
        user_id: uid,
        type: ERROR_NOTIF_TYPE,
        title,
        body: bodyText,
        link: pageUrl || null,
      }))
    )

    return NextResponse.json({ ok: true, notified: ids.length })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}

// GET — قائمة آخر تقارير الأخطاء (للإدارة)
export async function GET(req: NextRequest) {
  const g = await guardAdmin(req)
  if (!g.ok) return g.res
  try {
    const { data } = await supabaseAdmin
      .from('notifications')
      .select('id, title, body, link, created_at, read_at')
      .eq('type', ERROR_NOTIF_TYPE)
      .order('created_at', { ascending: false })
      .limit(120)
    return NextResponse.json({ reports: data || [] })
  } catch (e: any) {
    return NextResponse.json({ reports: [], error: e?.message }, { status: 500 })
  }
}

// DELETE — مسح سجل الأخطاء كاملاً (للإدارة)
export async function DELETE(req: NextRequest) {
  const g = await guardAdmin(req)
  if (!g.ok) return g.res
  try {
    await supabaseAdmin.from('notifications').delete().eq('type', ERROR_NOTIF_TYPE)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 })
  }
}
