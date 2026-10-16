import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'
export const maxDuration = 30

// Upload avatar via Telegram Bot → get public URL, then persist to the DB record
async function getBotSettings() {
  const { data, error } = await supabaseAdmin
    .from('site_settings')
    .select('telegram_bot_token, telegram_channel_id')
    .limit(1)
    .single()
  if (error || !data) return { token: '', channelId: '' }
  return { token: data.telegram_bot_token || '', channelId: data.telegram_channel_id || '' }
}

// Look up the user's full info so we can include it in the Telegram notification.
// Returns null when no record can be found.
async function fetchUserInfo(userId: string, role: string): Promise<{
  name: string | null
  email: string | null
  phone: string | null
  title: string | null
  specialization: string | null
  role: string
} | null> {
  try {
    if (role === 'trainer' || role === 'team') {
      const { data } = await supabaseAdmin
        .from('trainers')
        .select('name, email, phone, title, specialization')
        .eq('id', userId)
        .maybeSingle()
      if (data) {
        return {
          name: data.name,
          email: data.email,
          phone: data.phone,
          title: data.title,
          specialization: data.specialization,
          role,
        }
      }
    } else if (role === 'student') {
      const { data } = await supabaseAdmin
        .from('users')
        .select('name, email, phone, role')
        .eq('id', userId)
        .maybeSingle()
      if (data) {
        return {
          name: data.name,
          email: data.email,
          phone: data.phone,
          title: null,
          specialization: null,
          role: data.role || 'student',
        }
      }
    }
  } catch {
    // silent
  }
  return null
}

const TEAM_MARKER_PREFIX = '__TEAM_MEMBER__:'

function roleLabel(role: string, password?: string | null): string {
  // Detect team member (founder/leader/team) by the password marker
  if (password && password.startsWith(TEAM_MARKER_PREFIX)) {
    const afterPrefix = password.substring(TEAM_MARKER_PREFIX.length)
    const roleEnd = afterPrefix.indexOf('__')
    const trole = roleEnd !== -1 ? afterPrefix.substring(0, roleEnd) : 'team'
    if (trole === 'founder') return '👑 المؤسس التنفيذي'
    if (trole === 'leader') return '🛡️ قائد الفريق'
    if (trole === 'team') return '🤝 عضو الفريق'
    return trole
  }
  if (role === 'trainer') return '🎓 مدرب معتمد'
  if (role === 'student') return '📚 متدرب'
  if (role === 'admin') return '🔐 مدير النظام'
  return role || 'مستخدم'
}

// Build a professional Telegram caption with all the user's identifying info.
function buildCaption(info: {
  name: string | null
  email: string | null
  phone: string | null
  title: string | null
  specialization: string | null
  role: string
  password?: string | null
  action: string
}): string {
  const lines: string[] = []
  lines.push('🖼️ ' + info.action)
  lines.push('')
  lines.push('━━━━━━━━━━━━━━━━━━')
  lines.push('👤 الاسم: ' + (info.name || '—'))
  lines.push('🔖 الصفة: ' + roleLabel(info.role, info.password))
  if (info.title) lines.push('🏷️ المسمى الوظيفي: ' + info.title)
  if (info.specialization) lines.push('🎯 التخصص: ' + info.specialization)
  if (info.email) lines.push('📧 البريد: ' + info.email)
  if (info.phone) lines.push('📞 الهاتف: ' + info.phone)
  lines.push('━━━━━━━━━━━━━━━━━━')
  lines.push('🕐 التاريخ: ' + new Date().toLocaleString('ar-EG', { timeZone: 'Asia/Aden' }))
  lines.push('')
  lines.push('✅ تم تحديث الأيقونة الشخصية وحفظها في قاعدة البيانات')
  return lines.join('\n')
}

async function uploadViaTelegram(
  file: File,
  botToken: string,
  channelId: string,
  caption: string,
): Promise<string | null> {
  if (!botToken || !channelId) return null

  const formData = new FormData()
  formData.append('chat_id', channelId)
  formData.append('photo', file)
  formData.append('caption', caption)
  formData.append('parse_mode', 'HTML')

  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
    method: 'POST',
    body: formData,
  })
  const data = await res.json()
  if (!data.ok) return null

  const photos = data.result?.photo
  if (!photos || photos.length === 0) return null
  const fileId = photos[photos.length - 1].file_id

  const fileRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`)
  const fileData = await fileRes.json()
  if (!fileData.ok) return null

  const filePath = fileData.result.file_path
  return `https://api.telegram.org/file/bot${botToken}/${filePath}`
}

// Persist the avatar URL to the correct DB table based on role.
// For team members (password starts with __TEAM_MEMBER__), we still update the trainers row —
// the avatar column is the same.
async function persistAvatar(userId: string, role: string, url: string): Promise<void> {
  if (role === 'trainer') {
    await supabaseAdmin
      .from('trainers')
      .update({ avatar: url })
      .eq('id', userId)
  } else if (role === 'student') {
    await supabaseAdmin
      .from('users')
      .update({ avatar: url })
      .eq('id', userId)
  } else if (role === 'team') {
    // Team members live in the trainers table — same update path
    await supabaseAdmin
      .from('trainers')
      .update({ avatar: url })
      .eq('id', userId)
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const userId = (formData.get('user_id') as string) || ''
    const role = (formData.get('role') as string) || ''

    if (!file) {
      return NextResponse.json({ error: 'لم يتم إرسال ملف' }, { status: 400 })
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'الملف يجب أن يكون صورة' }, { status: 400 })
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'حجم الصورة كبير جداً (الحد 5 ميجابايت)' }, { status: 400 })
    }

    const { token, channelId } = await getBotSettings()

    if (!token || !channelId) {
      return NextResponse.json({ error: 'إعدادات تيليجرام غير مُهيأة' }, { status: 500 })
    }

    // Fetch the user's profile info so we can include it in the Telegram caption.
    // For team members, we also need the password to detect the founder/leader role.
    let userInfo: any = null
    let userPassword: string | null = null
    if (userId && role) {
      try {
        if (role === 'trainer' || role === 'team') {
          const { data } = await supabaseAdmin
            .from('trainers')
            .select('name, email, phone, title, specialization, password')
            .eq('id', userId)
            .maybeSingle()
          if (data) {
            userInfo = data
            userPassword = data.password
          }
        } else if (role === 'student') {
          const { data } = await supabaseAdmin
            .from('users')
            .select('name, email, phone, role')
            .eq('id', userId)
            .maybeSingle()
          if (data) userInfo = data
        }
      } catch {
        // silent — we'll still upload with a generic caption
      }
    }

    // Build a professional Telegram caption with the user's full identifying info
    const action = role === 'student' ? 'تحديث أيقونة متدرب' : role === 'team' ? 'تحديث أيقونة عضو فريق' : 'تحديث أيقونة مدرب'
    const caption = buildCaption({
      name: userInfo?.name || null,
      email: userInfo?.email || null,
      phone: userInfo?.phone || null,
      title: userInfo?.title || null,
      specialization: userInfo?.specialization || null,
      role,
      password: userPassword,
      action,
    })

    const url = await uploadViaTelegram(file, token, channelId, caption)

    if (!url) {
      return NextResponse.json({ error: 'فشل رفع الصورة' }, { status: 500 })
    }

    // Persist to DB so admin / homepage see the new avatar immediately
    if (userId && role) {
      try {
        await persistAvatar(userId, role, url)
      } catch {
        // Non-fatal — the URL is still returned to the client which can update its own state.
      }
    }

    return NextResponse.json({ url })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
