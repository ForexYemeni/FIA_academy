import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { hashPassword } from '@/lib/auth-server'
import { rateLimit, clientIp, tooMany, signTokenAsync } from '@/lib/api-auth'
import { notifyTrainerApplicationReceived } from '@/lib/notifications'
import { tgTrainerApplication } from '@/lib/telegram'
import { getRegistrationGate, registrationStoppedMessage } from '@/lib/registration-gate'

export const dynamic = 'force-dynamic'

/**
 * 👑 POST /api/auth/register-trainer — التسجيل الملكي الذاتي للمدربين
 * ينشئ حساباً في جدول trainers بحالة 'pending' — لا يظهر للعامة ولا يُفعّل
 * حتى توافق الإدارة ويُوقّع اتفاق نسبة الأرباح (status='approved').
 */
export async function POST(req: NextRequest) {
  const ip = clientIp(req)
  const rl = rateLimit(`register-trainer:${ip}`, 5, 60 * 60 * 1000)
  if (!rl.ok) return tooMany(rl.retryAfterSec)

  // 🛡️ بوابة التسجيل — الإدارة قد توقف حسابات المدربين الجديدة
  try {
    const gate = await getRegistrationGate()
    if (gate.isStopped('trainer')) {
      return NextResponse.json({ error: registrationStoppedMessage('trainer'), registration_stopped: true }, { status: 403 })
    }
  } catch {}

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'بيانات غير سليمة' }, { status: 400 }) }

  const name = String(body.name || '').trim()
  const email = String(body.email || '').trim().toLowerCase()
  const password = String(body.password || '')
  const phone = String(body.phone || '').trim()
  const title = String(body.title || '').trim()          // المسمى الوظيفي
  const specialization = String(body.specialization || '').trim() // التخصص
  const bio = String(body.bio || '').trim()              // النبذة
  const country = String(body.country || '').trim() || null
  const avatar = String(body.avatar || '').trim() || null
  const years = Number(body.years_experience) || 0
  const qualifications = Array.isArray(body.qualifications) ? body.qualifications.slice(0, 25) : []
  const achievements = Array.isArray(body.achievements) ? body.achievements.slice(0, 25) : []
  const experiences = Array.isArray(body.experiences) ? body.experiences.slice(0, 25) : []

  // تحقق ملكي من الحقول الجوهرية
  if (!name || name.length < 3) return NextResponse.json({ error: 'الاسم الكامل مطلوب (3 أحرف على الأقل)' }, { status: 400 })
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: 'بريد إلكتروني غير صالح' }, { status: 400 })
  if (!password || password.length < 6) return NextResponse.json({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' }, { status: 400 })
  if (!title) return NextResponse.json({ error: 'المسمى الوظيفي مطلوب' }, { status: 400 })
  if (!specialization) return NextResponse.json({ error: 'التخصص مطلوب' }, { status: 400 })
  if (!bio || bio.length < 20) return NextResponse.json({ error: 'النبذة المهنية مطلوبة (20 حرفاً على الأقل)' }, { status: 400 })
  if (qualifications.length === 0) return NextResponse.json({ error: 'أضف مؤهلاً علمياً واحداً على الأقل' }, { status: 400 })

  try {
    // لا تكرار للبريد في الجدولين
    const [{ data: duUser }, { data: duTrainer }] = await Promise.all([
      supabaseAdmin.from('users').select('id').eq('email', email).maybeSingle(),
      supabaseAdmin.from('trainers').select('id').eq('email', email).maybeSingle(),
    ])
    if (duUser || duTrainer) {
      return NextResponse.json({ error: 'هذا البريد مسجل مسبقاً — استخدم بريداً آخر أو سجّل الدخول' }, { status: 409 })
    }

    const hashed = await hashPassword(password)
    const { data: created, error } = await supabaseAdmin
      .from('trainers')
      .insert({
        name, email, password: hashed, phone: phone || null,
        title, specialization, bio, avatar, country,
        years_experience: years,
        qualifications, achievements, experiences,
        status: 'pending',
        created_via: 'self_registration',
        profit_percentage: 0,
      })
      .select('id, name, email')
      .single()
    if (error) throw error

    // 🪞 مرآة الهوية: صف بنفس المعرف في public.users — ثمانية جداول تشغيلية
    // (المنتدى، المواضيع، الإشعارات، المحادثة، التقييمات...) لها مفتاح أجنبي
    // إلى public.users — بلا المرآة تفشل مشاركته وإشعاراته بصمت.
    // بريد فريد مشتق عند أي تعارض (لا يمنع التسجيل — الدخول عبر trainers).
    try {
      const { data: duUser } = await supabaseAdmin.from('users').select('id').eq('email', email).maybeSingle()
      const mirrorEmail = duUser ? `trainer.${created.id.slice(0, 8)}@fia-mirror.local` : email
      await supabaseAdmin.from('users').insert({
        id: created.id, email: mirrorEmail, name, phone: phone || null,
        password: hashed, role: 'trainer', avatar: avatar || null,
        title: title || null, bio: bio || null,
      })
    } catch (mirrorErr: any) {
      console.error('trainer user-mirror error (غير قاتل):', mirrorErr?.message)
    }

    // إشعارات غير قاتلة عند الفشل — مسار واحد فقط لكل قناة
    try { await notifyTrainerApplicationReceived(name, specialization) } catch {}
    try { await tgTrainerApplication(name, email, specialization, country) } catch {}

    // 🔑 تسجيل دخول تلقائي فوري: نُصدر توكن جلسة مع الرد — يدخل لوحته مباشرة
    const token = await signTokenAsync({
      sub: created.id,
      email: created.email,
      role: 'trainer',
      name: created.name,
    })
    const user = {
      id: created.id,
      email: created.email,
      name: created.name,
      phone: phone || '',
      password: '', // لا تُعاد كلمة المرور أبداً
      role: 'trainer' as const,
      avatar: avatar || undefined,
      title,
      bio,
    }

    return NextResponse.json({
      success: true,
      trainer: { id: created.id, name: created.name, email: created.email },
      user,
      token,
      message: 'وصل طلبك إلى الإدارة — سجّلنا دخولك تلقائياً وستُشعَر بالموافقة على بريدك وضمن التطبيق',
    })
  } catch (e: any) {
    console.error('register-trainer error:', e?.message)
    return NextResponse.json({ error: 'تعذر إنشاء الطلب الآن — أعد المحاولة' }, { status: 500 })
  }
}
