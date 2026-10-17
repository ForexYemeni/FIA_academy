import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// POST /api/notifications/test
// Body: { user_id }
//
// Creates a TEST notification for the given user. This is used by the
// bell's "Test notification" button so the user can verify that:
//   1) Notifications are being created in the DB ✓
//   2) Supabase Realtime INSERT events fire (sub-second latency)
//   3) Polling fallback detects the new notification (every 15s)
//   4) The matching professional tone plays
//   5) The in-app professional toast renders
//   6) The browser native notification appears (if permission granted)
//
// The test notification has type='system' so the user gets the
// 'system' sound (gentle warning) and the red AlertCircle icon.

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const userId = body?.user_id
    if (!userId) {
      return NextResponse.json({ error: 'user_id required' }, { status: 400 })
    }
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: userId,
        type: 'system',
        title: '🔔 اختبار الإشعارات',
        body: 'تم استلام هذا الإشعار بنجاح! إن كنت تراه + تسمع النغمة، فالنظام يعمل بشكل صحيح.',
        link: '/',
      })
      .select()
      .single()
    if (error) throw error
    return NextResponse.json({ success: true, id: data.id })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
