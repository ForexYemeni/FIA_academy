import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { guardAdmin, rateLimit, clientIp, tooMany } from '@/lib/api-auth'

export const runtime = 'nodejs'
export const maxDuration = 60

// ============================================================================
// 👑 v10.6 — الرسائل الجماعية الملكية للدفعات
// ============================================================================
// تبُثّ الإدارة إشعاراً واحداً لشريحة كاملة بضغطة واحدة:
//   • all      → كل الحسابات (متدربون + مدربون + إدارة)
//   • students → كل المتدربين
//   • trainers → كل المدربين
//   • admins   → الإدارة فقط (اختبارات)
//   • course   → كل المسجلين في دورة محددة (من enrollments)
// الإدخال دفعي (chunks ×300) والعدّ يُعاد للواجهة لعرض شارة النجاح.
// ============================================================================

export async function POST(req: NextRequest) {
  const g = await guardAdmin(req)
  if (!g.ok) return g.res

  const rl = rateLimit(`broadcast:${clientIp(req)}`, 6, 60 * 1000)
  if (!rl.ok) return tooMany(rl.retryAfterSec)

  try {
    const body = await req.json().catch(() => ({}))
    const audience = ['all', 'students', 'trainers', 'admins', 'course'].includes(body?.audience)
      ? body.audience
      : null
    const courseId = String(body?.course_id || '')
    const title = String(body?.title || '').trim().slice(0, 120)
    const message = String(body?.message || '').trim().slice(0, 2000)
    const link = String(body?.link || '').trim().slice(0, 400) || null

    if (!audience) {
      return NextResponse.json({ error: 'شريحة المستلمين غير صالحة' }, { status: 400 })
    }
    if (!title || !message) {
      return NextResponse.json({ error: 'العنوان والنص مطلوبان' }, { status: 400 })
    }
    if (audience === 'course' && !courseId) {
      return NextResponse.json({ error: 'اختر الدورة أولاً' }, { status: 400 })
    }

    // ═══ حل شريحة المستلمين ═══
    const ids = new Set<string>()

    if (audience === 'all' || audience === 'students' || audience === 'admins') {
      let q = supabaseAdmin.from('users').select('id, role').limit(100000)
      if (audience === 'students') q = q.eq('role', 'student')
      if (audience === 'admins') q = q.eq('role', 'admin')
      const { data } = await q
      for (const u of data || []) ids.add(u.id)
    }
    if (audience === 'all' || audience === 'trainers') {
      const { data } = await supabaseAdmin.from('trainers').select('id').limit(50000)
      for (const t of data || []) ids.add(t.id)
    }
    if (audience === 'course') {
      const { data } = await supabaseAdmin
        .from('enrollments')
        .select('user_id')
        .eq('course_id', courseId)
        .limit(100000)
      for (const e of data || []) if (e.user_id) ids.add(e.user_id)
    }

    if (ids.size === 0) {
      return NextResponse.json({ error: 'لا يوجد مستلمون في هذه الشريحة' }, { status: 400 })
    }

    // ═══ الإدخال الدفعي ═══
    const rows = Array.from(ids).map((uid) => ({
      user_id: uid,
      type: 'broadcast',
      title: `📣 ${title}`,
      body: message,
      link,
    }))
    let sent = 0
    for (let i = 0; i < rows.length; i += 300) {
      const chunk = rows.slice(i, i + 300)
      const { error } = await supabaseAdmin.from('notifications').insert(chunk)
      if (!error) sent += chunk.length
    }

    return NextResponse.json({ ok: true, recipients: ids.size, sent })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'خطأ غير متوقع' }, { status: 500 })
  }
}
