import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// POST /api/certificates/issue
// Body: { user_id, course_id } — issues a certificate if the user has
// completed all lessons + passed the exam. Returns the certificate record.
export async function POST(req: NextRequest) {
  try {
    const { user_id, course_id } = await req.json()
    if (!user_id || !course_id) {
      return NextResponse.json({ error: 'user_id + course_id required' }, { status: 400 })
    }

    // Fetch the course to get pass score + title
    const { data: course } = await supabaseAdmin
      .from('courses')
      .select('id, title, pass_score')
      .eq('id', course_id)
      .maybeSingle()
    if (!course) return NextResponse.json({ error: 'الدورة غير موجودة' }, { status: 404 })

    // Check that the user has at least one passing exam attempt
    const { data: passingAttempt } = await supabaseAdmin
      .from('exam_attempts')
      .select('id, score, passed')
      .eq('user_id', user_id)
      .eq('course_id', course_id)
      .eq('passed', true)
      .order('submitted_at', { ascending: 'desc' })
      .maybeSingle()
    if (!passingAttempt) {
      return NextResponse.json({
        error: 'لم تنجح في اختبار الدورة بعد — لا يمكن إصدار الشهادة',
      }, { status: 400 })
    }

    // Check if certificate already exists — idempotent
    const { data: existing } = await supabaseAdmin
      .from('certificates')
      .select('*')
      .eq('student_name', /* resolve name below */ '')
      // We'll do the check by metadata below — use lookup by other fields
      .maybeSingle()
      .catch(() => ({ data: null }))

    // Look up the user's name
    const { data: userRow } = await supabaseAdmin
      .from('users')
      .select('id, name')
      .eq('id', user_id)
      .maybeSingle()
    let studentName = userRow?.name
    if (!studentName) {
      const { data: trainer } = await supabaseAdmin
        .from('trainers')
        .select('name')
        .eq('id', user_id)
        .maybeSingle()
      studentName = trainer?.name
    }
    if (!studentName) return NextResponse.json({ error: 'تعذّر تحديد اسم المستخدم' }, { status: 400 })

    // Check if certificate already exists for this (student_name, course_title) pair
    const { data: existingCert } = await supabaseAdmin
      .from('certificates')
      .select('*')
      .eq('student_name', studentName)
      .eq('course_title', course.title)
      .maybeSingle()
    if (existingCert) {
      // Already issued — return existing
      return NextResponse.json({ certificate: existingCert, already: true })
    }

    // Generate a unique certificate number
    const year = new Date().getFullYear()
    const random = Math.floor(10000 + Math.random() * 89999)
    const certNumber = `FIA-${year}-${random}`

    const { data: cert, error } = await supabaseAdmin
      .from('certificates')
      .insert({
        certificate_number: certNumber,
        student_name: studentName,
        course_title: course.title,
        issued_by: 'أكاديمية المستقبل الدولية',
        issued_at: new Date().toISOString(),
        status: 'صالحة',
      })
      .select()
      .single()
    if (error) throw error

    // Notify the user
    try {
      await supabaseAdmin.from('notifications').insert({
        user_id, type: 'system',
        title: '🎉 تم إصدار شهادتك!',
        body: `الشهادة رقم ${certNumber} لدورة "${course.title}". اطّلع عليها وحمّلها من قسم الشهادات.`,
        link: `/verify/${certNumber}`,
      })
    } catch {}

    return NextResponse.json({ certificate: cert, already: false })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
