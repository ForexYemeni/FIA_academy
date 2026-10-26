import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { guardAdmin } from '@/lib/api-auth'
import { audit } from '@/lib/audit'

/**
 * 👑 v10.11 — POST /api/admin/ban — «مرسوم الحظر الملكي»
 * ============================================================================
 * حظر/رفع الحظر عن أي حساب غير إداري (متدرب أو مدرب أو شريك…) بقرار الإدارة.
 * • الوعاء الأول: users (كل الحسابات ذات صف هناك)
 * • الوعاء الثاني: trainers (حسابات المدربين المستقلة)
 * • حسابات الإدارة (role=admin) وأعضاء الفريق (علامة __TEAM_MEMBER__)
 *   لا تُحظر أبداً — حماية مطلقة
 * • الحظر يُكتشف لحظياً من الحرس الملكي (check-deleted + realtime)
 *   فتظهر بطاقة الحظر الفاخرة فوراً حتى لو كان التطبيق مفتوحاً
 * ============================================================================
 */

export async function POST(req: NextRequest) {
  const g = await guardAdmin(req as unknown as Request)
  if (!g.ok) return g.res

  const body = await req.json().catch(() => null)
  const userId = String(body?.user_id || '').trim()
  const banned = !!body?.banned
  const reason = String(body?.reason || '').trim()
  if (!userId) {
    return NextResponse.json({ error: 'user_id مطلوب' }, { status: 400 })
  }

  // ── الوعاء الأول: users ──────────────────────────────────────────
  const { data: userRow } = await supabaseAdmin
    .from('users')
    .select('id, role, name, email, banned')
    .eq('id', userId)
    .maybeSingle()

  if (userRow) {
    if ((userRow as any).role === 'admin') {
      return NextResponse.json({ error: 'لا يمكن حظر حساب إداري' }, { status: 403 })
    }
    const updates: Record<string, unknown> = banned
      ? { banned: true, banned_reason: reason || 'مخالفة سياسات الأكاديمية', banned_at: new Date().toISOString() }
      : { banned: false, banned_reason: null, banned_at: null }
    const { error } = await supabaseAdmin.from('users').update(updates).eq('id', userId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    audit({
      action: banned ? 'ban_user' : 'unban_user',
      entity: 'users', entityId: userId,
      actor: { id: g.user.id, email: g.user.email, role: g.user.role },
      details: { reason, name: (userRow as any).name }, req,
    })
    return NextResponse.json({ ok: true, banned, table: 'users' })
  }

  // ── الوعاء الثاني: trainers ──────────────────────────────────────
  const { data: trainerRow } = await supabaseAdmin
    .from('trainers')
    .select('id, name, email, banned, password')
    .eq('id', userId)
    .maybeSingle()

  if (trainerRow) {
    // أعضاء الفريق = إدارة — لا حظر
    const pw = (trainerRow as any).password
    if (typeof pw === 'string' && pw.startsWith('__TEAM_MEMBER__:')) {
      return NextResponse.json({ error: 'أعضاء الفريق من الإدارة — لا يمكن حظرهم' }, { status: 403 })
    }
    const updates: Record<string, unknown> = banned
      ? { banned: true, banned_reason: reason || 'مخالفة سياسات الأكاديمية', banned_at: new Date().toISOString() }
      : { banned: false, banned_reason: null, banned_at: null }
    const { error } = await supabaseAdmin.from('trainers').update(updates).eq('id', userId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    audit({
      action: banned ? 'ban_trainer' : 'unban_trainer',
      entity: 'trainers', entityId: userId,
      actor: { id: g.user.id, email: g.user.email, role: g.user.role },
      details: { reason, name: (trainerRow as any).name }, req,
    })
    return NextResponse.json({ ok: true, banned, table: 'trainers' })
  }

  return NextResponse.json({ error: 'الحساب غير موجود' }, { status: 404 })
}

/**
 * GET /api/admin/ban — قائمة المحظورين (users + trainers) للوحة الإدارة
 */
export async function GET(req: NextRequest) {
  const g = await guardAdmin(req as unknown as Request)
  if (!g.ok) return g.res

  const [{ data: ub }, { data: tb }] = await Promise.all([
    supabaseAdmin.from('users').select('id, name, email, role, banned, banned_reason, banned_at').eq('banned', true),
    supabaseAdmin.from('trainers').select('id, name, email, banned, banned_reason, banned_at').eq('banned', true),
  ])

  const usersList = (ub || []).map((u: any) => ({ ...u, kind: 'user' }))
  const trainersList = (tb || []).map((t: any) => ({ ...t, kind: 'trainer' }))
  return NextResponse.json([...usersList, ...trainersList])
}
