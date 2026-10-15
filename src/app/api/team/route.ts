import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// We use the existing `trainers` table to store team members.
// Real trainers have a regular password. Team members have a marker
// `__TEAM_MEMBER__:<role>__` in the password field, and extra fields
// (vision, mission, qualifications, achievements, etc.) are JSON-encoded
// in the `bio` field with a special separator.

const TEAM_MARKER_PREFIX = '__TEAM_MEMBER__:'
const BIO_SEPARATOR = '\n\n===FIA_EXTRA===\n'

interface TeamMemberInput {
  id?: string
  name: string
  title?: string | null
  role: string // founder | leader | team
  specialization?: string | null
  bio?: string | null
  vision?: string | null
  mission?: string | null
  qualifications?: string | null
  achievements?: string | null
  avatar?: string | null
  signature?: string | null
  email?: string | null
  phone?: string | null
  linkedin?: string | null
  twitter?: string | null
  years_experience?: number
  display_order?: number
  is_active?: boolean
}

interface StoredTrainer {
  id: string
  name: string
  title: string | null
  specialization: string | null
  bio: string | null
  avatar: string | null
  email: string | null
  password: string | null
  phone: string | null
  courses_count: number | null
  years_experience: number | null
}

function encodeBio(bio: string | null, extra: any): string {
  const bioText = bio || ''
  const extraJson = JSON.stringify(extra)
  return `${bioText}${BIO_SEPARATOR}${extraJson}`
}

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

function isTeamMember(trainer: StoredTrainer): boolean {
  return !!trainer.password && trainer.password.startsWith(TEAM_MARKER_PREFIX)
}

function getRole(trainer: StoredTrainer): string {
  if (trainer.password && trainer.password.startsWith(TEAM_MARKER_PREFIX)) {
    return trainer.password.substring(TEAM_MARKER_PREFIX.length).replace(/__$/, '') || 'team'
  }
  return 'team'
}

function toTeamMember(trainer: StoredTrainer): any {
  const { bio, extra } = decodeBio(trainer.bio)
  return {
    id: trainer.id,
    name: trainer.name,
    title: trainer.title,
    role: getRole(trainer),
    specialization: trainer.specialization,
    bio,
    vision: extra.vision || null,
    mission: extra.mission || null,
    qualifications: extra.qualifications || null,
    achievements: extra.achievements || null,
    avatar: trainer.avatar,
    signature: extra.signature || null,
    email: trainer.email,
    phone: trainer.phone,
    linkedin: extra.linkedin || null,
    twitter: extra.twitter || null,
    years_experience: trainer.years_experience || 0,
    display_order: extra.display_order || 0,
    is_active: extra.is_active !== false,
    created_at: (trainer as any).created_at,
  }
}

export async function GET(req: NextRequest) {
  try {
    const role = req.nextUrl.searchParams.get('role')

    // Fetch all trainers and filter to team members only
    const { data: trainers, error } = await supabaseAdmin
      .from('trainers')
      .select('*')
      .order('name', { ascending: true })

    if (error) throw error

    // Filter to team members
    let teamMembers = (trainers || []).filter(isTeamMember).map(toTeamMember)

    if (role) {
      teamMembers = teamMembers.filter((m) => m.role === role)
    }

    // Sort by display_order, then name
    teamMembers.sort((a, b) => {
      const ao = a.display_order || 0
      const bo = b.display_order || 0
      if (ao !== bo) return ao - bo
      return a.name.localeCompare(b.name)
    })

    return NextResponse.json(teamMembers)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as TeamMemberInput
    if (!body.name) return NextResponse.json({ error: 'الاسم مطلوب' }, { status: 400 })

    // Build the encoded bio
    const extra = {
      vision: body.vision || null,
      mission: body.mission || null,
      qualifications: body.qualifications || null,
      achievements: body.achievements || null,
      linkedin: body.linkedin || null,
      twitter: body.twitter || null,
      signature: body.signature || null,
      display_order: body.display_order || 0,
      is_active: body.is_active !== false,
    }
    const encodedBio = encodeBio(body.bio || '', extra)

    // Password field stores the role marker
    const password = `${TEAM_MARKER_PREFIX}${body.role || 'team'}__`

    // Check if email already exists in trainers or users
    if (body.email) {
      const { data: existing } = await supabaseAdmin
        .from('trainers')
        .select('id, password')
        .eq('email', body.email)
        .maybeSingle()

      if (existing && !isTeamMember(existing as StoredTrainer)) {
        return NextResponse.json({ error: 'البريد الإلكتروني مسجّل كمدرب فعلي. استخدم بريداً مختلفاً.' }, { status: 400 })
      }
    }

    const { data, error } = await supabaseAdmin
      .from('trainers')
      .insert({
        name: body.name,
        title: body.title || null,
        specialization: body.specialization || null,
        bio: encodedBio,
        avatar: body.avatar || null,
        email: body.email || null,
        password,
        phone: body.phone || null,
        courses_count: 0,
        years_experience: body.years_experience || 0,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(toTeamMember(data as StoredTrainer))
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { id, ...updates } = await req.json() as TeamMemberInput & { id: string }
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    // Build the encoded bio from updates
    const extra = {
      vision: updates.vision || null,
      mission: updates.mission || null,
      qualifications: updates.qualifications || null,
      achievements: updates.achievements || null,
      linkedin: updates.linkedin || null,
      twitter: updates.twitter || null,
      signature: (updates as any).signature || null,
      display_order: updates.display_order || 0,
      is_active: updates.is_active !== false,
    }
    const encodedBio = encodeBio(updates.bio || '', extra)

    // Password stores the role marker
    const password = `${TEAM_MARKER_PREFIX}${updates.role || 'team'}__`

    const { data, error } = await supabaseAdmin
      .from('trainers')
      .update({
        name: updates.name,
        title: updates.title || null,
        specialization: updates.specialization || null,
        bio: encodedBio,
        avatar: updates.avatar || null,
        email: updates.email || null,
        password,
        phone: updates.phone || null,
        years_experience: updates.years_experience || 0,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(toTeamMember(data as StoredTrainer))
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const { error } = await supabaseAdmin.from('trainers').delete().eq('id', id)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
