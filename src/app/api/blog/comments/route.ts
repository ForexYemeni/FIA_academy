import { NextRequest, NextResponse } from 'next/server'
import { guardAdmin, guardAuth } from '@/lib/api-auth'
import { supabaseAdmin } from '@/lib/supabase'

// GET /api/blog/comments?blog_post_id=... — list comments with author profiles
export async function GET(req: NextRequest) {
  try {
    const blogPostId = req.nextUrl.searchParams.get('blog_post_id')
    if (!blogPostId) return NextResponse.json([])
    const { data: comments, error } = await supabaseAdmin
      .from('blog_comments')
      .select('*')
      .eq('blog_post_id', blogPostId)
      .order('created_at', { ascending: true })
    if (error) throw error
    // Enrich with author profiles
    const authorIds = Array.from(new Set((comments || []).map((c: any) => c.user_id)))
    let authorMap: Record<string, any> = {}
    for (const id of authorIds) {
      const { data: userRow } = await supabaseAdmin.from('users').select('id, name, avatar').eq('id', id).maybeSingle()
      if (userRow) authorMap[id] = { name: userRow.name, avatar: userRow.avatar }
      else {
        const { data: trainer } = await supabaseAdmin.from('trainers').select('id, name, avatar').eq('id', id).maybeSingle()
        if (trainer) authorMap[id] = { name: trainer.name, avatar: trainer.avatar }
      }
    }
    const enriched = (comments || []).map((c: any) => ({ ...c, author: authorMap[c.user_id] || null }))
    return NextResponse.json(enriched)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// POST — create a comment
export async function POST(req: NextRequest) {
  try {
    const g = await guardAuth(req)
    if (!g.ok) return g.res
    const { blog_post_id, user_id, body, parent_id } = await req.json()
    if (!blog_post_id || !user_id || !body) {
      return NextResponse.json({ error: 'blog_post_id + user_id + body required' }, { status: 400 })
    }
    const { data, error } = await supabaseAdmin
      .from('blog_comments')
      .insert({ blog_post_id, user_id, body, parent_id: parent_id || null })
      .select()
      .single()
    if (error) throw error
    // Enrich with author
    const { data: userRow } = await supabaseAdmin.from('users').select('name, avatar').eq('id', user_id).maybeSingle()
    if (userRow) data.author = { name: userRow.name, avatar: userRow.avatar }
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// DELETE — delete a comment
export async function DELETE(req: NextRequest) {
  try {
    // 🛡️ حذف التعليق: كاتبه أو الإدارة فقط
    const g = await guardAuth(req)
    if (!g.ok) return g.res
    const { id } = await req.json()
    if (g.user.role !== 'admin') {
      const { data: cm } = await supabaseAdmin.from('blog_comments').select('user_id').eq('id', id).maybeSingle()
      if (cm?.user_id && cm.user_id !== g.user.id) {
        return NextResponse.json({ error: 'غير مصرح — يمكنك حذف تعليقاتك فقط' }, { status: 403 })
      }
    }
    const { error } = await supabaseAdmin.from('blog_comments').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
