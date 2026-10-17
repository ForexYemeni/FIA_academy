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
      return NextResponse.json({ ...data, views: (data.views || 0) + 1 })
    }
    const { data, error } = await supabaseAdmin
      .from('blog_posts')
      .select('*')
      .eq('status', 'منشور')
      .order('published_at', { ascending: false })
    if (error) throw error
    return NextResponse.json(data || [])
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { title, excerpt, body, cover, author_id, tags } = await req.json()
    if (!title || !body) {
      return NextResponse.json({ error: 'العنوان والمحتوى مطلوبان' }, { status: 400 })
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
      })
      .select()
      .single()
    if (error) throw error
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
