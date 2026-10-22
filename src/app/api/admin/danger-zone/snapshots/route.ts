import { NextRequest, NextResponse } from 'next/server'
import { listDangerSnapshots, restoreDangerSnapshot } from '@/lib/danger-snapshot'
import { tgDangerZoneRestored } from '@/lib/telegram'

// GET /api/admin/danger-zone/snapshots
// → Royal rescue archive: the latest snapshots (metadata only, no heavy rows)
export async function GET() {
  try {
    const snapshots = await listDangerSnapshots(12)
    return NextResponse.json({ snapshots })
  } catch (e: any) {
    return NextResponse.json({ error: e.message, snapshots: [] }, { status: 500 })
  }
}

// POST /api/admin/danger-zone/snapshots
// Body: { snapshot_id, user_id } → royal restore of every captured row
export async function POST(req: NextRequest) {
  try {
    const { snapshot_id, user_id } = (await req.json()) as { snapshot_id?: string; user_id?: string }
    if (!snapshot_id) {
      return NextResponse.json({ error: 'snapshot_id مطلوب' }, { status: 400 })
    }

    const result = await restoreDangerSnapshot(snapshot_id)
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error || 'فشلت الاستعادة الملكية' },
        { status: 500 }
      )
    }

    // One royal Telegram notice — the rescue is complete
    try {
      await tgDangerZoneRestored(result.rowTotal, user_id)
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
