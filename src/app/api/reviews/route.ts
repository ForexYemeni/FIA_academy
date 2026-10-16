import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const courseId = req.nextUrl.searchParams.get('course_id')
    const userId = req.nextUrl.searchParams.get('user_id')
    let query = supabaseAdmin.from('reviews').select('*')
    if (courseId) query = query.eq('course_id', courseId)
    if (userId) query = query.eq('user_id', userId)
    query = query.eq('status', 'نشط').order('helpful_count', { ascending: false })
    const { data, error } = await query
    if (error) throw error
    return NextResponse.json(data || [])
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { course_id, user_id, rating, title, body } = await req.json()
    if (!course_id || !user_id || !rating) {
      return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
    }
    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'التقييم يجب أن يكون بين 1 و 5' }, { status: 400 })
    }
    // Upsert — one review per user per course (unique constraint enforced at DB)
    const { data, error } = await supabaseAdmin
      .from('reviews')
      .upsert({
        course_id,
        user_id,
        rating,
        title: title || null,
        body: body || null,
        status: 'نشط',
      }, { onConflict: 'course_id,user_id' })
      .select()
      .single()
    if (error) {
      if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
        return NextResponse.json({ error: 'لقد قمت بالتقييم مسبقاً' }, { status: 400 })
      }
      throw error
    }
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
      .from('reviews')
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
    const { error } = await supabaseAdmin.from('reviews').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
