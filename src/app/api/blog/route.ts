import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Generate a URL-friendly ASCII slug from a title — strips Arabic and other
// non-ASCII characters entirely (URL encoding of Arabic is fragile across
// CDNs and routers), falls back to a random short ID.
function slugify(text: string): string {
  // Try to extract ASCII-alphanumeric parts of the title (English fragments,
  // digits, etc.) — e.g. "BLS / ACLS Course" → "bls-acls-course"
  const asciiPart = text
    .toString()
    .toLowerCase()
    .replace(/[^\x00-\x7F]/g, ' ')       // replace non-ASCII with space
    .trim()
    .replace(/[^a-z0-9]+/g, '-')         // collapse non-alphanumeric to single hyphen
    .replace(/^-+|-+$/g, '')             // strip leading/trailing hyphens
  if (asciiPart.length >= 3) {
    return `${asciiPart}-${Math.random().toString(36).substring(2, 6)}`
  }
  // Pure-Arabic title — generate a random ASCII slug
  return `post-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`
}

export async function GET(req: NextRequest) {
  try {
    const slug = req.nextUrl.searchParams.get('slug')
    if (slug) {
      const { data, error } = await supabaseAdmin
        .from('blog_posts')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'منشور')
        .maybeSingle()
      if (error) throw error
      if (!data) return NextResponse.json({ error: 'المقال غير موجود' }, { status: 404 })
      // Increment views
      await supabaseAdmin.from('blog_posts').update({ views: (data.views || 0) + 1 }).eq('id', data.id)
      const author = await resolveAuthor(data.author_id)
      return NextResponse.json({ ...data, views: (data.views || 0) + 1, author })
    }
    const { data, error } = await supabaseAdmin
      .from('blog_posts')
      .select('*')
      .eq('status', 'منشور')
      .order('published_at', { ascending: false })
    if (error) throw error
    // ROYAL v4.2 — enrich every post with its author (name + role + avatar +
    // title) so the UI can show luxurious author chips: مدرب معتمد / الإدارة /
    // المؤسس / فريق الإدارة.
    const posts = data || []
    const authorIds = Array.from(new Set(posts.map((p: any) => p.author_id).filter(Boolean)))
    const map: Record<string, any> = {}
    if (authorIds.length > 0) {
      const { data: authors } = await supabaseAdmin
        .from('users')
        .select('id, name, role, avatar, title, team_role')
        .in('id', authorIds)
      for (const a of authors || []) map[a.id] = a
    }
    return NextResponse.json(posts.map((p: any) => ({ ...p, author: map[p.author_id] || null })))
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// Resolve one author (users first, then the public trainers table) — used by
// the single-slug endpoint.
async function resolveAuthor(authorId: string | null): Promise<any | null> {
  if (!authorId) return null
  const { data: userRow } = await supabaseAdmin
    .from('users')
    .select('id, name, role, avatar, title, team_role')
    .eq('id', authorId)
    .maybeSingle()
  if (userRow) return userRow
  const { data: trainerRow } = await supabaseAdmin
    .from('trainers')
    .select('id, name, avatar, title')
    .eq('id', authorId)
    .maybeSingle()
  if (trainerRow) return { ...trainerRow, role: 'trainer' }
  return null
}

export async function POST(req: NextRequest) {
  try {
    const { title, excerpt, body, cover, author_id, tags } = await req.json()
    if (!title || !body) {
      return NextResponse.json({ error: 'العنوان والمحتوى مطلوبان' }, { status: 400 })
    }
    // 🔒 ROYAL GATE: only admins and trainers may publish blog posts.
    // The author must exist and carry an elevated role — no anonymous publishing.
    const author = await resolveAuthor(author_id || null)
    const canPublish = !!author && (
      author.role === 'admin' || author.role === 'trainer' || !!author.team_role
    )
    if (!canPublish) {
      return NextResponse.json({ error: 'غير مصرّح — النشر متاح للإدارة والمدربين فقط' }, { status: 403 })
    }
    // Auto-generate a unique slug if not provided
    let slug = slugify(title)
    if (!slug) slug = 'post-' + Date.now()
    // Ensure uniqueness by appending a short suffix if needed
    const { data: existing } = await supabaseAdmin
      .from('blog_posts')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()
    if (existing) slug = `${slug}-${Math.random().toString(36).substring(2, 5)}`

    const { data, error } = await supabaseAdmin
      .from('blog_posts')
      .insert({
        title,
        slug,
        excerpt: excerpt || null,
        body,
        cover: cover || null,
        author_id: author_id || null,
        tags: tags || null,
        status: 'منشور',
        published_at: new Date().toISOString(),
      })
      .select()
      .single()
    if (error) throw error

    // ROYAL v4.2 — newsletter notification (in-app + push) — non-fatal
    try {
      const { notifyBlogPublished } = await import('@/lib/notifications')
      await notifyBlogPublished(title, slug)
    } catch {}

    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { id, ...updates } = await req.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    if (updates.title && !updates.slug) {
      // Keep slug as-is when editing
    }
    const { data, error } = await supabaseAdmin
      .from('blog_posts')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json()
    const { error } = await supabaseAdmin.from('blog_posts').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
