import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

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
    const id = req.nextUrl.searchParams.get('id')
    let query = supabaseAdmin.from('trainers').select('*')
    if (id) query = query.eq('id', id)
    query = query.order('name', { ascending: true })
    const { data, error } = await query
    if (error) throw error

    const safe = (data || [])
      .filter((t: any) => !t.password || !t.password.startsWith(TEAM_MARKER_PREFIX))
      .map(({ password, ...rest }: any) => {
        const { bio, extra } = decodeBio(rest.bio)
        // Merge legacy encoded qualifications/achievements into a single professional bio
        const mergedBio = mergeLegacyBio(bio, extra)
        return { ...rest, bio: mergedBio }
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
    const body = await req.json()

    // Store bio as a plain string — no more encoding.
    // (qualifications and achievements are now part of the unified bio text)
    const { data, error } = await supabaseAdmin
      .from('trainers')
      .insert({
        name: body.name,
        title: body.title || null,
        specialization: body.specialization || null,
        bio: body.bio || null,
        avatar: body.avatar || null,
        email: body.email,
        password: body.password,
        phone: body.phone || null,
        courses_count: body.courses_count || 0,
        years_experience: body.years_experience || 0,
      })
      .select()
      .single()
    if (error) throw error
    const { password, ...rest } = data

    // Send a professional Telegram notification with the new trainer's full info
    // (fire-and-forget — never blocks the response)
    notifyTelegramNewTrainer(rest).catch(() => { /* silent */ })

    return NextResponse.json(rest)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { id, ...updates } = await req.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    // Bio is stored as plain string now — no encoding.
    // We only update fields that are explicitly provided.
    const patch: any = {}
    for (const key of ['name', 'title', 'specialization', 'bio', 'avatar', 'phone', 'years_experience', 'courses_count']) {
      if (updates[key] !== undefined) patch[key] = updates[key]
    }
    // Password update is optional — only set if provided and non-empty
    if (updates.password) patch.password = updates.password

    const { data, error } = await supabaseAdmin
      .from('trainers')
      .update(patch)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    const { password, ...rest } = data
    return NextResponse.json(rest)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json()
    const { error } = await supabaseAdmin.from('trainers').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
