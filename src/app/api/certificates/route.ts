import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const num = req.nextUrl.searchParams.get('number')
    let query = supabaseAdmin.from('certificates').select('*')
    if (num) query = query.eq('certificate_number', num)
    const { data, error } = await query.order('issued_at', { ascending: false })
    if (error) throw error
    return NextResponse.json(data || [])
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // === Reissue mode: invalidate old cert & issue new one with same data ===
    if (body.action === 'reissue' && body.id) {
      // Fetch the original certificate
      const { data: original, error: fetchErr } = await supabaseAdmin
        .from('certificates')
        .select('*')
        .eq('id', body.id)
        .single()
      if (fetchErr || !original) {
        return NextResponse.json({ error: 'الشهادة الأصلية غير موجودة' }, { status: 404 })
      }

      // Mark the old certificate as "مستبدلة" (replaced) — DO NOT DELETE history
      await supabaseAdmin
        .from('certificates')
        .update({ status: 'مستبدلة' })
        .eq('id', body.id)

      // Generate new certificate number (different from old)
      const newNumber = `FIA-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 99999)).padStart(5, '0')}`

      // Insert new certificate with same data but new number + new issued_at
      const newCert: any = {
        certificate_number: newNumber,
        student_name: original.student_name,
        course_title: original.course_title,
        issued_by: original.issued_by || 'أكاديمية المستقبل الدولية',
        status: 'صالحة',
        issued_at: new Date().toISOString(),
        has_external_accreditation: original.has_external_accreditation || false,
        external_accreditation_body: original.external_accreditation_body || null,
      }
      // Copy any extra fields that exist on the original
      if (original.student_id) newCert.student_id = original.student_id
      if (original.course_id) newCert.course_id = original.course_id
      if (original.enrollment_id) newCert.enrollment_id = original.enrollment_id

      const { data: inserted, error: insertErr } = await supabaseAdmin
        .from('certificates')
        .insert(newCert)
        .select()
        .single()
      if (insertErr) throw insertErr

      return NextResponse.json({
        success: true,
        old_number: original.certificate_number,
        new_certificate: inserted,
      })
    }

    // === Default: create new certificate ===
    // Auto-generate certificate number if not provided
    if (!body.certificate_number) {
      body.certificate_number = `FIA-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 99999)).padStart(5, '0')}`
    }
    const { data, error } = await supabaseAdmin
      .from('certificates')
      .insert(body)
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
    const { data, error } = await supabaseAdmin
      .from('certificates')
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
    const { error } = await supabaseAdmin.from('certificates').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
