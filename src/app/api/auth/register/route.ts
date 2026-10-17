import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { hashPassword, signToken } from '@/lib/auth-server'
import { notifyUserRegistered } from '@/lib/notifications'
import { tgUserRegistered } from '@/lib/telegram'

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, phone, affiliate_code } = await req.json()
    if (!email || !password || !name) {
      return NextResponse.json({ error: 'الاسم والبريد وكلمة المرور مطلوبة' }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' }, { status: 400 })
    }

    // Check if email is already registered
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle()
    if (existingUser) {
      return NextResponse.json({ error: 'البريد الإلكتروني مسجّل مسبقاً' }, { status: 400 })
    }

    // Hash the password with bcrypt
    const passwordHash = await hashPassword(password)

    const { data, error } = await supabaseAdmin
      .from('users')
      .insert({
        name,
        email,
        password: passwordHash,
        phone: phone || null,
        role: 'student',
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Process affiliate referral if a code was provided
    if (affiliate_code) {
      try {
        await processAffiliateReferral(affiliate_code, data.id)
      } catch { /* non-fatal — the user is still created */ }
    }

    // Send welcome + admin notifications (non-fatal if it fails)
    try {
      await notifyUserRegistered(data.id, data.name, 'student')
    } catch {}
    // Also post to the Telegram channel so admins see new signups
    try {
      await tgUserRegistered(data.id, data.name, 'student')
    } catch {}

    const user = {
      id: data.id,
      email: data.email,
      name: data.name,
      phone: data.phone || '',
      password: '', // never return password to client
      role: 'student' as const,
      avatar: data.avatar,
      title: data.title,
      bio: data.bio,
    }
    const token = signToken({
      sub: data.id,
      email: data.email,
      role: 'student',
      name: data.name,
    })
    return NextResponse.json({ user, token })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// Look up the affiliate by unique_code, create a referral record
// linking the affiliate to the new student, and increment the
// affiliate's total_referrals.
async function processAffiliateReferral(code: string, studentId: string) {
  const { data: affiliate } = await supabaseAdmin
    .from('affiliates')
    .select('id, commission_percent, total_referrals, total_earnings')
    .eq('unique_code', code.toUpperCase())
    .eq('status', 'نشط')
    .maybeSingle()
  if (!affiliate) return

  // Create the referral record (commission = 0 until the student pays)
  await supabaseAdmin.from('affiliate_referrals').insert({
    affiliate_id: affiliate.id,
    student_id: studentId,
    amount: 0,
    commission: 0,
    status: 'معلق', // pending — will become 'مكتمل' once the student pays
  })

  // Increment total_referrals on the affiliate
  await supabaseAdmin.from('affiliates').update({
    total_referrals: (affiliate.total_referrals || 0) + 1,
  }).eq('id', affiliate.id)
}
