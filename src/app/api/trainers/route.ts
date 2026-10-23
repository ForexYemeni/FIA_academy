import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { guardAdmin, getAuthUser } from '@/lib/api-auth'
import { hashPassword } from '@/lib/auth-server'
import { notifyTrainerRenegotiationOffered, resolveTrainerUserId } from '@/lib/notifications'
import { tgTrainerRenegotiationOffered } from '@/lib/telegram'
import { audit } from '@/lib/audit'

const TEAM_MARKER_PREFIX = '__TEAM_MEMBER__:'

// Legacy encoding marker — kept only for backward compatibility with old data.
// New trainer bios are stored as plain strings (no encoding).
const BIO_SEPARATOR = '\n\n===FIA_EXTRA===\n'

// Decode legacy bio string into bio text + extra fields (qualifications, achievements)
function decodeBio(stored: string | null): { bio: string; extra: any } {
  if (!stored) return { bio: '', extra: {} }
  const idx = stored.indexOf(BIO_SEPARATOR)
  if (idx === -1) return { bio: stored, extra: {} }
  const bio = stored.substring(0, idx)
  const extraJson = stored.substring(idx + BIO_SEPARATOR.length)
  try {
    const extra = JSON.parse(extraJson)
    return { bio, extra }
  } catch {
    return { bio: stored, extra: {} }
  }
}

// Combine legacy encoded bio + qualifications + achievements into ONE professional bio string.
// This is used for backward compatibility — old trainers that had separate fields
// are now presented as a single unified bio.
function mergeLegacyBio(bio: string, extra: any): string {
  const parts: string[] = []
  if (bio && bio.trim()) parts.push(bio.trim())

  const quals = extra?.qualifications
  if (quals && typeof quals === 'string' && quals.trim()) {
    let arr: string[] | null = null
    try {
      const parsed = JSON.parse(quals)
      if (Array.isArray(parsed)) arr = parsed.filter(Boolean)
    } catch {
      arr = null
    }
    if (arr && arr.length > 0) {
      parts.push('🎓 المؤهلات العلمية\n' + arr.map((q) => `• ${q}`).join('\n'))
    } else {
      const lines = quals.split('\n').map((s: string) => s.trim()).filter(Boolean)
      if (lines.length > 0) {
        parts.push('🎓 المؤهلات العلمية\n' + lines.map((q: string) => `• ${q}`).join('\n'))
      }
    }
  }

  const achs = extra?.achievements
  if (achs && typeof achs === 'string' && achs.trim()) {
    let arr: string[] | null = null
    try {
      const parsed = JSON.parse(achs)
      if (Array.isArray(parsed)) arr = parsed.filter(Boolean)
    } catch {
      arr = null
    }
    if (arr && arr.length > 0) {
      parts.push('🏆 الإنجازات\n' + arr.map((a) => `• ${a}`).join('\n'))
    } else {
      const lines = achs.split('\n').map((s: string) => s.trim()).filter(Boolean)
      if (lines.length > 0) {
        parts.push('🏆 الإنجازات\n' + lines.map((a: string) => `• ${a}`).join('\n'))
      }
    }
  }

  return parts.join('\n\n')
}

// ---------------------------------------------------------------------------
// Telegram helper — send a professional "new trainer added" notification
// ---------------------------------------------------------------------------

async function getBotSettings() {
  const { data, error } = await supabaseAdmin
    .from('site_settings')
    .select('telegram_bot_token, telegram_channel_id')
    .limit(1)
    .single()
  if (error || !data) return { token: '', channelId: '' }
  return { token: data.telegram_bot_token || '', channelId: data.telegram_channel_id || '' }
}

// Build a professional Telegram caption block for a newly-added trainer.
function buildTrainerCaption(t: any): string {
  const lines: string[] = []
  lines.push('🎉 تمت إضافة مدرب جديد إلى المنصة')
  lines.push('')
  lines.push('━━━━━━━━━━━━━━━━━━━')
  lines.push('👤 الاسم: ' + (t.name || '—'))
  if (t.title) lines.push('🏷️ المسمى: ' + t.title)
  if (t.specialization) lines.push('🎯 التخصص: ' + t.specialization)
  if (t.email) lines.push('📧 البريد: ' + t.email)
  if (t.phone) lines.push('📞 الهاتف: ' + t.phone)
  if (typeof t.years_experience === 'number' && t.years_experience > 0) {
    lines.push('⏳ سنوات الخبرة: ' + t.years_experience + ' سنة')
  }
  lines.push('━━━━━━━━━━━━━━━━━━━')
  if (t.bio && t.bio.trim()) {
    lines.push('')
    lines.push('📝 النبذة التعريفية:')
    // Trim very long bios to keep Telegram caption limits reasonable (1024 chars)
    const bioText = t.bio.length > 700 ? t.bio.substring(0, 700) + '…' : t.bio
    lines.push(bioText)
  }
  lines.push('')
  lines.push('🕐 تاريخ الإضافة: ' + new Date().toLocaleString('ar-EG', { timeZone: 'Asia/Aden' }))
  lines.push('')
  lines.push('✅ تم حفظ المدرب في قاعدة البيانات')
  return lines.join('\n')
}

// Send the trainer's avatar + professional caption to the Telegram channel.
// Falls back to a text-only message if the avatar URL is missing.
async function notifyTelegramNewTrainer(trainer: any): Promise<void> {
  const { token, channelId } = await getBotSettings()
  if (!token || !channelId) return
  const caption = buildTrainerCaption(trainer)

  try {
    if (trainer.avatar) {
      // sendPhoto accepts an HTTP URL — re-use the already-uploaded avatar URL
      const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: channelId,
          photo: trainer.avatar,
          caption,
          parse_mode: 'HTML',
        }),
      })
      const data = await res.json()
      if (data.ok) return
      // If sendPhoto-by-URL fails (e.g. URL not yet propagated), fall through
      // to send a text message so the trainer's data still lands in Telegram.
    }
    // Fallback: text-only message
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: channelId, text: caption, parse_mode: 'HTML' }),
    })
  } catch {
    // Non-fatal — the trainer is already saved in the DB.
  }
}

// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  try {
    // 🛡️ الحسابات المالية (أرقام المحافظ) للإدارة فقط — العام يرى الاسم والتعريف
    const adminUser = await getAuthUser(req)
    const isAdmin = adminUser?.role === 'admin'
    const id = req.nextUrl.searchParams.get('id')
    let query = supabaseAdmin.from('trainers').select('*')
    if (id) query = query.eq('id', id)
    // 👑 القائمة العامة تُظهر المعتمدين فقط — المعلّق/المرفوض لا يظهران إلا للإدارة
    //    أو لصاحب الملف نفسه في لوحته (?id= يبقى متاحاً للجميع لأنه يُفلتس الحقول الحساسة)
    if (!id && !isAdmin) query = query.eq('status', 'approved')
    query = query.order('name', { ascending: true })
    const { data, error } = await query
    if (error) throw error

    // 🛡️ v6.9.3 — هوية مزدوجة: جلسة حساب المستخدم قد تحمل معرّفاً غير معرّف
    // صف المدرب (عالمان في نموذج الهوية). إن طُلب ملف بـ id ولم يُوجد، نحلّه
    // ببريد الطالب نفسه من جلسته — لا تسريب: الحل ببريد الطالب حصراً لا بالـ id.
    let rows = data || []
    if (id && rows.length === 0) {
      const au = await getAuthUser(req)
      if (au?.email) {
        const { data: byEmail } = await supabaseAdmin
          .from('trainers').select('*').ilike('email', au.email).limit(1)
        if (byEmail && byEmail.length) rows = byEmail
      }
    }

    const safe = (rows)
      .filter((t: any) => !t.password || !t.password.startsWith(TEAM_MARKER_PREFIX))
      .map((t: any) => {
        const { password, ...rest } = t
        const { bio, extra } = decodeBio(rest.bio)
        const mergedBio = mergeLegacyBio(bio, extra)
        const base: any = { ...rest, bio: mergedBio, is_team_member: false }
        if (!isAdmin) {
          delete base.payment_account
          delete base.payment_method_name
        }
        return base
      })
    // For single-id queries, return a single object; otherwise return array
    if (id) {
      return NextResponse.json(safe[0] || null)
    }
    return NextResponse.json(safe)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    // 🛡️ إنشاء المدربين للإدارة فقط — كان أي زائر ينشئ مدرباً بكلمة مرور يختارها!
    const g = await guardAdmin(req)
    if (!g.ok) return g.res
    const body = await req.json()

    // 👑 v6.9.1 — «المرسوم المزدوج للإنشاء الإداري»: المدرب الذي تضيفه الإدارة
    // لا يُولد معتمداً بنسبة مفتوحة — بل يستلم **عرض اتفاق ملكي** بالنسبة التي
    // حددتها الإدارة، يدخل بلوحته فيوقّعه فيُقفل التعديل (وبعده لا تغيير إلا
    // بإعادة تفاوض يوافق عليها هو أيضاً). طريقة السحب يضيفها بنفسه من لوحته.
    const offeredPct = typeof body.profit_percentage === 'number' ? Math.max(0, Math.min(100, body.profit_percentage)) : 0
    const wantsOffer = (body.status || 'agreement_pending') === 'agreement_pending'
    const nowIso = new Date().toISOString()
    const agreementOffer = wantsOffer
      ? {
          offered_at: nowIso,
          percentage: offeredPct,
          trainer_response: 'pending',
          offered_via: 'admin',
          history: [{ at: nowIso, by: 'admin', action: 'offered', percentage: offeredPct }],
        }
      : null

    const { data, error } = await supabaseAdmin
      .from('trainers')
      .insert({
        name: body.name,
        title: body.title || null,
        specialization: body.specialization || null,
        bio: body.bio || null,
        avatar: body.avatar || null,
        email: body.email,
        password: await hashPassword(String(body.password || '')),
        phone: body.phone || null,
        courses_count: body.courses_count || 0,
        years_experience: body.years_experience || 0,
        // Earnings system — profit share per course per student + payout method
        profit_percentage: offeredPct,
        payment_method_type: body.payment_method_type || 'محلي',
        payment_method_name: body.payment_method_name || null,
        payment_account: body.payment_account || null,
        // 👑 المنظومة الملكية: العرض بانتظار توقيع المدرب
        status: body.status || 'agreement_pending',
        created_via: 'admin',
        ...(agreementOffer ? { agreement: agreementOffer } : {}),
      })
      .select()
      .single()
    if (error) throw error
    const { password, ...rest } = data

    audit({ action: 'trainer_created', entity: 'trainers', entityId: data.id, actor: g.user, details: { name: body.name, email: body.email, percentage: offeredPct, offered: !!agreementOffer }, req })

    // Send a professional Telegram notification with the new trainer's full info
    // (fire-and-forget — never blocks the response)
    notifyTelegramNewTrainer(rest).catch(() => { /* silent */ })

    return NextResponse.json({
      ...rest,
      agreement_offer_sent: !!agreementOffer,
      message: agreementOffer
        ? `أُضيف المدرب — وسيجد عرض الاتفاق (${offeredPct}%) في لوحته عند أول دخول، وبعد توقيعه تُقفل النسبة للطرفين`
        : undefined,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    // 🛡️ تعديل المدربين (وأسهم الأرباح ومحافظهم) للإدارة فقط!
    const g = await guardAdmin(req)
    if (!g.ok) return g.res
    const { id, ...updates } = await req.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const trainerId = id

    // 👑 v6.9 — «العقد الملكي المقفول»: قراءة حالة الاتفاق الحالية قبل أي تعديل
    const { data: current } = await supabaseAdmin
      .from('trainers')
      .select('id, name, profit_percentage, agreement, status, password')
      .eq('id', trainerId)
      .maybeSingle()
    if (!current) return NextResponse.json({ error: 'المدرب غير موجود' }, { status: 404 })

    const agreementNow: any = (current as any).agreement || {}
    const isConfirmed =
      !!agreementNow.confirmed_at &&
      agreementNow.trainer_response === 'accepted' &&
      (current as any).status === 'approved'
    const isTeamMember = typeof (current as any).password === 'string' &&
      (current as any).password.startsWith(TEAM_MARKER_PREFIX)

    // 🤝 v6.9 — باب إعادة التفاوض الملكي: الإدارة ترسل عرضاً جديداً للمدرب
    // بدل التعديل المباشر على نسبة مُتفقاً عليها — يبقى المدرب معتمداً
    // ونشِراً، ويستعرض العرض في محفظته فيقبل أو يرفض بحرية تامة.
    if (updates.renegotiation && typeof updates.renegotiation === 'object') {
      if (!isConfirmed) {
        return NextResponse.json({ error: 'إعادة التفاوض متاحة فقط بعد اعتماد الاتفاق وتوقيع الطرفين' }, { status: 409 })
      }
      const newPct = Math.max(0, Math.min(100, Number(updates.renegotiation.percentage) || 0))
      const note = String(updates.renegotiation.note || '').trim()
      const now = new Date().toISOString()
      const history = Array.isArray(agreementNow.history) ? agreementNow.history : []
      history.push({
        at: now, action: 'renegotiation_offered',
        percentage: newPct, previous_percentage: Number((current as any).profit_percentage) || 0, note: note || null,
      })
      const nextAgreement = {
        ...agreementNow,
        renegotiation: {
          offered_at: now,
          percentage: newPct,
          note: note || null,
          trainer_response: 'pending',
        },
        trainer_response: 'pending',
      }
      const { data, error } = await supabaseAdmin
        .from('trainers')
        .update({ agreement: nextAgreement })
        .eq('id', trainerId)
        .select('id, name, profit_percentage, agreement, status')
        .single()
      if (error) throw error
      // 🤝 v6.9.2 — وصول الطلب للمدرب فوراً: إشعار ثلاثي القنوات (DB + FCM + OneSignal) يحمل السبب + سجل تلجرام للإدارة
      // 🛡️ v6.9.3 — هوية مزدوجة: الإشعار يهبط على معرّفَي صف المدرب وحسابه
      // معاً (قد يكونان مختلفين) فلا يضيع مهما كان عالم الهوية — والقيد
      // الأجنبي المميت أُسقط (027) فلا إدراج يسقط بصمت بعد اليوم.
      const renegRefs = Array.from(new Set([trainerId, (await resolveTrainerUserId(trainerId)) || ''].filter(Boolean)))
      try { await notifyTrainerRenegotiationOffered(renegRefs, Number((current as any).profit_percentage) || 0, newPct, note || null) } catch (e: any) { console.error('renegotiation notify failed:', e?.message) }
      try { await tgTrainerRenegotiationOffered((data as any).name, Number((current as any).profit_percentage) || 0, newPct, note || null) } catch {}
      const { password: _pw, ...restSafe } = data as any
      return NextResponse.json({
        ...restSafe,
        renegotiation_sent: true,
        message: note
          ? `أُرسل طلب تعديل عقد الشراكة (${newPct}%) إلى المدرب مع السبب — وصلته صورة إشعار فورية، ويبقى الاتفاق الساري مفعولاً حتى موافقته`
          : `أُرسل طلب تعديل عقد الشراكة (${newPct}%) إلى المدرب — ويبقى الاتفاق الساري مفعولاً حتى موافقته`,
      })
    }

    // Bio is stored as plain string now — no encoding.
    // We only update fields that are explicitly provided.
    const patch: any = {}
    for (const key of [
      'name', 'title', 'specialization', 'bio', 'avatar', 'phone', 'years_experience', 'courses_count',
      'profit_percentage', 'payment_method_type', 'payment_method_name', 'payment_account',
      // 👑 المنظومة الملكية: ملف المدرب الكامل + الاعتماد والاتفاق
      'qualifications', 'achievements', 'experiences', 'country', 'status', 'agreement', 'rejected_reason',
    ]) {
      if (updates[key] !== undefined) patch[key] = updates[key]
    }
    // Password update is optional — hashed always
    if (updates.password) patch.password = await hashPassword(String(updates.password))

    // 🔒 v6.9 — القفل الخادمي: نسبة أرباح مُتفقاً عليها لا تُمس بتعديل
    // مباشر مهما كان مَن يطلب — إن أرادت الإدارة تغييرها فلترسل عرض
    // إعادة تفاوض (renegotiation) يوافق عليه المدرب ليعود القفل جديداً.
    if (patch.profit_percentage !== undefined) {
      if (isTeamMember) {
        delete patch.profit_percentage // أعضاء الفريق لا يملكون حصة أرباح أصلاً
      } else {
        const newPct = Number(patch.profit_percentage) || 0
        const curPct = Number((current as any).profit_percentage) || 0
        if (isConfirmed && newPct !== curPct) {
          return NextResponse.json({
            error: '🔒 الاتفاق مُوقَّع من الطرفين ومقفول — نسبة الأرباح لا تُعدَّل مباشرة. أرسل «عرض تعديل» للمدرب من بطاقته ليُعيد التوقيع على النسبة الجديدة.',
            locked: true,
            renegotiation_required: true,
            confirmed_percentage: curPct,
          }, { status: 423 })
        }
        patch.profit_percentage = newPct
        // 🤝 v6.9.1 — مزامنة العرض المعلّق: تعديل النسبة قبل توقيع المدرب
        // يُحدّث ما سيراه ويوقّع عليه في بطاقة الاتفاق (لا عرض قديم يخدع أحداً)
        if (!isConfirmed && agreementNow.offered_at && agreementNow.trainer_response === 'pending' && newPct !== Number(agreementNow.percentage || 0)) {
          const history2 = Array.isArray(agreementNow.history) ? agreementNow.history : []
          history2.push({ at: new Date().toISOString(), by: 'admin', action: 'offer_updated', percentage: newPct, previous_percentage: Number(agreementNow.percentage) || 0 })
          patch.agreement = { ...agreementNow, percentage: newPct, history: history2 }
        }
      }
    }

    const { data, error } = await supabaseAdmin
      .from('trainers')
      .update(patch)
      .eq('id', trainerId)
      .select()
      .single()
    if (error) throw error
    const { password, ...rest } = data
    audit({ action: 'trainer_updated', entity: 'trainers', entityId: trainerId, actor: g.user, details: { fields: Object.keys(updates || {}) }, req })
    return NextResponse.json(rest)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    // 🛡️ حذف المدربين للإدارة فقط + حماية الأرصدة — لا حذف لمدرب له رصيد أو سحبات
    const g = await guardAdmin(req)
    if (!g.ok) return g.res
    const { id } = await req.json()

    // 💰 حماية الخزينة: مدرب له رصيد متاح أو طلب سحب معلق لا يُحذف
    const { data: rows } = await supabaseAdmin
      .from('trainer_earnings')
      .select('amount, consumed_amount, status, currency')
      .eq('trainer_id', id)
    const available = (rows || [])
      .filter((r: any) => r.status === 'متاح')
      .reduce((s: number, r: any) => s + Math.max(0, Number(r.amount || 0) - Number(r.consumed_amount || 0)), 0)
    if (available > 0) {
      return NextResponse.json(
        { error: `لا يمكن حذف المدرب — لديه رصيد أرباح غير مصروف (${available}). صرف الرصيد أو صفّره أولاً.` },
        { status: 409 }
      )
    }
    const { data: pend } = await supabaseAdmin
      .from('withdrawal_requests').select('id').eq('trainer_id', id).eq('status', 'قيد الانتظار')
    if (pend && pend.length > 0) {
      return NextResponse.json(
        { error: 'لا يمكن حذف المدرب — لديه طلب سحب معلق. عالج الطلب أولاً.' },
        { status: 409 }
      )
    }

    // فصل دوراته عنه بدل تركها معلقة
    try { await supabaseAdmin.from('courses').update({ trainer_id: null }).eq('trainer_id', id) } catch {}

    const { error } = await supabaseAdmin.from('trainers').delete().eq('id', id)
    if (error) throw error
    audit({ action: 'trainer_deleted', entity: 'trainers', entityId: id, actor: g.user, req })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
