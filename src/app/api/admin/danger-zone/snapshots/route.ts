import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { listDangerSnapshots, restoreDangerSnapshot, createDangerSnapshot } from '@/lib/danger-snapshot'
import { tgDangerZoneRestored } from '@/lib/telegram'
import { guardAdmin, guardDangerZone } from '@/lib/api-auth'

// GET /api/admin/danger-zone/snapshots
// → Royal rescue archive: the latest snapshots (metadata only, no heavy rows)
// 🛡️ إدارة فقط
export async function GET(req: NextRequest) {
  const g = await guardAdmin(req)
  if (!g.ok) return g.res
  try {
    const snapshots = await listDangerSnapshots(12)
    return NextResponse.json({ snapshots })
  } catch (e: any) {
    return NextResponse.json({ error: e.message, snapshots: [] }, { status: 500 })
  }
}

// DELETE /api/admin/danger-zone/snapshots?id=...
// Body: { user_id, password }
// → حذف نهائي لنسخة إنقاذ واحدة من الأرشيف الملكي
// 🛡️ الحرس الملكي: هوية إدارة + كلمة مرور صحيحة في الخادم + حد محاولات
export async function DELETE(req: NextRequest) {
  try {
    const snapshot_id = req.nextUrl.searchParams.get('id')
    const body = await req.json().catch(() => ({})) as { user_id?: string; password?: string }
    if (!snapshot_id) {
      return NextResponse.json({ error: 'snapshot_id مطلوب' }, { status: 400 })
    }

    const guard = await guardDangerZone(req, body.user_id, body.password)
    if (!guard.ok) return guard.res

    // كل النسخ قابلة للحذف النهائي بأمر الإدارة الصريح (كلمة مرور + تأكيد)
    const { data: meta } = await supabaseAdmin
      .from('danger_zone_snapshots')
      .select('id, kind, section, label, row_total')
      .eq('id', snapshot_id)
      .maybeSingle()
    if (!meta) {
      return NextResponse.json({ error: 'النسخة غير موجودة — ربما حُذفت سابقاً' }, { status: 404 })
    }

    const { error } = await supabaseAdmin
      .from('danger_zone_snapshots')
      .delete()
      .eq('id', snapshot_id)
    if (error) throw error

    return NextResponse.json({
      success: true,
      deleted: { id: meta.id, label: meta.label, row_total: meta.row_total },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'خطأ غير متوقع' }, { status: 500 })
  }
}

// POST /api/admin/danger-zone/snapshots
// Body: { snapshot_id, user_id, password } → royal restore of every captured row
// 🛡️ الحرس الملكي: هوية إدارة + كلمة مرور صحيحة في الخادم + حد محاولات
export async function POST(req: NextRequest) {
  try {
    const { snapshot_id, user_id, password } = (await req.json()) as { snapshot_id?: string; user_id?: string; password?: string }
    if (!snapshot_id) {
      return NextResponse.json({ error: 'snapshot_id مطلوب' }, { status: 400 })
    }

    const guard = await guardDangerZone(req, user_id, password)
    if (!guard.ok) return guard.res
    const adminId = guard.user.id

    // 🛡️ لقطة «قبل الاستعادة» — نلتقط الحالة الحالية لنفس جداول النسخة
    //    المستهدفة، فلا تُفقد البيانات الحالية أبداً إذا كانت الاستعادة فجّة
    try {
      const { data: meta } = await supabaseAdmin
        .from('danger_zone_snapshots')
        .select('tables')
        .eq('id', snapshot_id)
        .maybeSingle()
      const tables = (Array.isArray(meta?.tables) ? meta.tables : []) as string[]
      if (tables.length > 0) {
        await createDangerSnapshot('section', 'pre-restore', 'حالة قبل الاستعادة', tables, adminId)
      }
    } catch {}

    const result = await restoreDangerSnapshot(snapshot_id)
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error || 'فشلت الاستعادة الملكية' },
        { status: 500 }
      )
    }

    // One royal Telegram notice — the rescue is complete
    try {
      await tgDangerZoneRestored(result.rowTotal, adminId)
    } catch {}

    return NextResponse.json({
      success: true,
      restored: result.restored,
      row_total: result.rowTotal,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'خطأ غير متوقع' }, { status: 500 })
  }
}
