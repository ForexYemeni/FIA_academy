import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const TEAM_MARKER_PREFIX = '__TEAM_MEMBER__:'
const BIO_SEPARATOR = '\n\n===FIA_EXTRA===\n'

// Encode bio + extra fields (qualifications, achievements) into a single bio string
function encodeBio(bio: string | null, extra: any): string {
  const bioText = bio || ''
  const extraJson = JSON.stringify(extra)
  return extra ? `${bioText}${BIO_SEPARATOR}${extraJson}` : bioText
}

// Decode bio string into bio text + extra fields
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

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('trainers')
      .select('*')
      .order('name', { ascending: true })
    if (error) throw error
    const safe = (data || [])
      .filter((t: any) => !t.password || !t.password.startsWith(TEAM_MARKER_PREFIX))
      .map(({ password, ...rest }: any) => {
        const { bio, extra } = decodeBio(rest.bio)
        return { ...rest, bio, qualifications: extra.qualifications || '', achievements: extra.achievements || '' }
      })
    return NextResponse.json(safe)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    // Encode qualifications + achievements into the bio field
    const extra: any = {}
    if (body.qualifications) extra.qualifications = body.qualifications
    if (body.achievements) extra.achievements = body.achievements
    const encodedBio = encodeBio(body.bio || null, Object.keys(extra).length > 0 ? extra : null)

    const { data, error } = await supabaseAdmin
      .from('trainers')
      .insert({
        name: body.name,
        title: body.title || null,
        specialization: body.specialization || null,
        bio: encodedBio,
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
    const { bio, extra: decoded } = decodeBio(rest.bio)
    return NextResponse.json({ ...rest, bio, qualifications: decoded.qualifications || '', achievements: decoded.achievements || '' })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { id, bio, qualifications, achievements, ...updates } = await req.json()
    // Encode qualifications + achievements into the bio field
    const extra: any = {}
    if (qualifications) extra.qualifications = qualifications
    if (achievements) extra.achievements = achievements
    if (bio !== undefined) {
      updates.bio = encodeBio(bio || null, Object.keys(extra).length > 0 ? extra : null)
    }
    if (!updates.password) delete updates.password
    const { data, error } = await supabaseAdmin
      .from('trainers')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    const { password, ...rest } = data
    const { bio: decodedBio, extra: decoded } = decodeBio(rest.bio)
    return NextResponse.json({ ...rest, bio: decodedBio, qualifications: decoded.qualifications || '', achievements: decoded.achievements || '' })
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
