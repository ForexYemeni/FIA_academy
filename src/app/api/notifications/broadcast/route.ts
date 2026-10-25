import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { guardAdmin, rateLimit, clientIp, tooMany } from '@/lib/api-auth'

export const runtime = 'nodejs'
export const maxDuration = 60

// ============================================================================
// 👑 v10.6.1 — الرسائل الجماعية بعدّ صادق
// ============================================================================
// تبُثّ الإدارة إشعاراً واحداً لشريحة كاملة بضغطة واحدة:
//   • all      → كل الحسابات الحقيقية (متدربون + مدربون معتمدون + إدارة)
//   • students → كل المتدربين
//   • trainers → كل المدربين المعتمدين
//   • admins   → الإدارة فقط (اختبارات)
//   • course   → كل المسجلين في دورة محددة (من enrollments)
//
// 🛡️ قاعدة العدّ الصادق: المستلم هو حساب حقيقي يستطيع قراءة الإشعار فقط:
//   • المتدربون والإدارة من users حسب الدور
//   • المدربون = trainers.status='approved' الموجودون فعلاً في users
//   • طلبات الانضمام المعلّقة/المرفوضة والحسابات اليتيمة لا تُحسب ولا يصلها شيء
//   • المسجلون في دورة يُرشَّحون ليعودوا إلى حسابات موجودة في users
// يعيد الاستجابة توزيع الشرائح الحقيقي {students, trainers, admins} + الإجمالي
// لتبني الواجهة بطاقة النتيجة الفاخرة بأرقام صحيحة لا متضخمة.
// GET  = معاينة العدد قبل البث (للإدارة فقط)
// POST = البث الفعلي (إدخال دفعي ×300)
// ============================================================================

type Breakdown = { students: number; trainers: number; admins: number; total: number }

async function resolveRecipients(audience: string, courseId: string): Promise<{ ids: Set<string>; breakdown: Breakdown } | { error: string }> {
  // ═══ مصدر الحقيقة: users (الحسابات الحقيقية) + trainers (حالة الاعتماد) ═══
  const [{ data: users }, { data: tr }] = await Promise.all([
    supabaseAdmin.from('users').select('id, role').limit(200000),
    supabaseAdmin.from('trainers').select('id, status').limit(100000),
  ])

  const userIds = new Set<string>()
  const roleById = new Map<string, string>()
  for (const u of users || []) {
    if (!u?.id) continue
    userIds.add(u.id)
    roleById.set(u.id, String(u.role || 'student'))
  }

  const studentIds: string[] = []
  const adminIds: string[] = []
  for (const u of users || []) {
    if (u?.role === 'student') studentIds.push(u.id)
    else if (u?.role === 'admin') adminIds.push(u.id)
  }
  const trainerIds: string[] = []
  for (const t of tr || []) {
    // المدرب الحقيقي = معتمد + له حساب مرآة في users (يستطيع قراءة الإشعار فعلاً)
    if (t?.status === 'approved' && t?.id && userIds.has(t.id)) trainerIds.push(t.id)
  }

  const ids = new Set<string>()
  let breakdown: Breakdown = { students: 0, trainers: 0, admins: 0, total: 0 }

  if (audience === 'students') {
    for (const id of studentIds) ids.add(id)
    breakdown = { students: ids.size, trainers: 0, admins: 0, total: ids.size }
  } else if (audience === 'trainers') {
    for (const id of trainerIds) ids.add(id)
    breakdown = { students: 0, trainers: ids.size, admins: 0, total: ids.size }
  } else if (audience === 'admins') {
    for (const id of adminIds) ids.add(id)
    breakdown = { students: 0, trainers: 0, admins: ids.size, total: ids.size }
  } else if (audience === 'all') {
    for (const id of [...studentIds, ...trainerIds, ...adminIds]) ids.add(id)
    breakdown = { students: studentIds.length, trainers: trainerIds.length, admins: adminIds.length, total: ids.size }
  } else if (audience === 'course') {
    const { data: enr } = await supabaseAdmin
      .from('enrollments')
      .select('user_id')
      .eq('course_id', courseId)
      .limit(100000)
    let s = 0, t = 0, a = 0
    for (const e of enr || []) {
      const uid = e?.user_id
      if (!uid || !userIds.has(uid) || ids.has(uid)) continue
      ids.add(uid)
      const role = roleById.get(uid)
      if (role === 'admin') a++
      else if (role === 'trainer') t++
      else s++
    }
    breakdown = { students: s, trainers: t, admins: a, total: ids.size }
  } else {
    return { error: 'شريحة المستلمين غير صالحة' }
  }

  return { ids, breakdown }
}

// ═══ معاينة العدد قبل البث — للإدارة فقط ═══
export async function GET(req: NextRequest) {
  const g = await guardAdmin(req)
  if (!g.ok) return g.res
  try {
    const url = new URL(req.url)
    const audience = String(url.searchParams.get('audience') || '')
    const courseId = String(url.searchParams.get('course_id') || '')
    if (!['all', 'students', 'trainers', 'admins', 'course'].includes(audience)) {
      return NextResponse.json({ error: 'شريحة غير صالحة' }, { status: 400 })
    }
    if (audience === 'course' && !courseId) {
      return NextResponse.json({ error: 'اختر الدورة أولاً' }, { status: 400 })
    }
    const r = await resolveRecipients(audience, courseId)
    if ('error' in r) return NextResponse.json({ error: r.error }, { status: 400 })
    return NextResponse.json({ ok: true, ...r.breakdown }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'خطأ غير متوقع' }, { status: 500 })
  }
}

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

    // ═══ حل شريحة المستلمين — حسابات حقيقية فقط ═══
    const r = await resolveRecipients(audience, courseId)
    if ('error' in r) return NextResponse.json({ error: r.error }, { status: 400 })
    const { ids, breakdown } = r

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

    return NextResponse.json({ ok: true, recipients: ids.size, sent, breakdown })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'خطأ غير متوقع' }, { status: 500 })
  }
}
