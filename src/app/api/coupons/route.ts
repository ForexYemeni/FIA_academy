import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { guardAdmin, guardStaff, guardAuth } from '@/lib/api-auth'

export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get('code')
    // 🛡️ جلب قائمة كل الكوبونات للإدارة فقط — بالكود المحدد يُسمح أثناء الدفع
    if (!code) {
      const g = await guardAdmin(req)
      if (!g.ok) return g.res
    }
    const userId = req.nextUrl.searchParams.get('user_id')

    if (code) {
      // Look up a specific coupon by code (used during checkout)
      const { data, error } = await supabaseAdmin
        .from('coupons')
        .select('*')
        .eq('code', code)
        .eq('status', 'نشط')
        .maybeSingle()
      if (error) throw error
      if (!data) return NextResponse.json({ valid: false, message: 'الكوبون غير موجود أو غير نشط' })
      // Check expiry
      if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
        return NextResponse.json({ valid: false, message: 'انتهت صلاحية الكوبون' })
      }
      // Check max uses
      if (data.max_uses !== null && data.used_count >= data.max_uses) {
        return NextResponse.json({ valid: false, message: 'تم استخدام الكوبون للحد الأقصى' })
      }

      // ===== Per-user usage restriction =====
      // A student can only use a coupon for ONE course from their
      // account. Once they've used it, they cannot reuse it on
      // another course. We check the `coupon_usages` table.
      if (userId) {
        try {
          const { data: usage } = await supabaseAdmin
            .from('coupon_usages')
            .select('id, course_id')
            .eq('coupon_code', code)
            .eq('user_id', userId)
            .maybeSingle()
          if (usage) {
            return NextResponse.json({
              valid: false,
              message: `لقد استخدمت هذا الكوبون مسبقاً في دورة أخرى من حسابك. كل متدرب يمكنه استخدام الكوبون مرة واحدة فقط.`,
              already_used: true,
              used_course_id: usage.course_id,
            })
          }
        } catch {
          // coupon_usages table might not exist yet (pre-migration).
          // Fall through to the valid response — the migration will
          // enforce the restriction once applied.
        }
      }

      return NextResponse.json({ valid: true, coupon: data })
    }
    // List all coupons (admin view)
    const { data, error } = await supabaseAdmin
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return NextResponse.json(data || [])
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
  const g = await guardAdmin(req); if (!g.ok) return g.res
    const body = await req.json()
    // Generate code if not provided
    if (!body.code) {
      body.code = 'FIA-' + Math.random().toString(36).substring(2, 8).toUpperCase()
    }
    // Force uppercase code
    body.code = String(body.code).toUpperCase().trim()
    const { data, error } = await supabaseAdmin
      .from('coupons')
      .insert({
        code: body.code,
        description: body.description || null,
        discount_type: body.discount_type || 'percentage',
        discount_value: body.discount_value || 0,
        max_uses: body.max_uses ?? null,
        expires_at: body.expires_at || null,
        course_id: body.course_id || null,
        status: body.status || 'نشط',
      })
      .select()
      .single()
    if (error) {
      if (error.message?.includes('duplicate')) {
        return NextResponse.json({ error: 'كود الكوبون مستخدم بالفعل' }, { status: 400 })
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
  const g = await guardAdmin(req); if (!g.ok) return g.res
    const { id, ...updates } = await req.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    if (updates.code) updates.code = String(updates.code).toUpperCase().trim()
    const { data, error } = await supabaseAdmin
      .from('coupons')
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
  const g = await guardAdmin(req); if (!g.ok) return g.res
    const { id } = await req.json()
    const { error } = await supabaseAdmin.from('coupons').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
