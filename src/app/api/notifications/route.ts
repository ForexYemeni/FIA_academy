import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// GET /api/notifications?user_id=...&unread=1 — list user's notifications
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('user_id')
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
    const { user_id, ids } = await req.json()
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
