import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const categoryId = req.nextUrl.searchParams.get('category_id')
    const slug = req.nextUrl.searchParams.get('slug')

    // If slug is provided, resolve to category_id
    if (slug && !categoryId) {
      const { data: cat } = await supabaseAdmin
        .from('forum_categories')
        .select('id')
        .eq('slug', slug)
        .maybeSingle()
      if (!cat) return NextResponse.json([])
      return GET(new NextRequest(`${req.url}&category_id=${cat.id}`))
    }

    let query = supabaseAdmin
      .from('forum_topics')
      .select('*')
      .order('pinned', { ascending: false })
      .order('updated_at', { ascending: false })
    if (categoryId) query = query.eq('category_id', categoryId)
    const { data, error } = await query
    if (error) throw error
    return NextResponse.json(data || [])
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { category_id, user_id, title, body } = await req.json()
    if (!category_id || !user_id || !title) {
      return NextResponse.json({ error: 'الفئة والمستخدم والعنوان مطلوبون' }, { status: 400 })
    }
    const { data, error } = await supabaseAdmin
      .from('forum_topics')
      .insert({
        category_id,
        user_id,
        title,
        body: body || null,
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
    const { data, error } = await supabaseAdmin
      .from('forum_topics')
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
    const { error } = await supabaseAdmin.from('forum_topics').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
