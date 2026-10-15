import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Certificate requests stored in the `payments` table creatively:
// - amount = certificate fee
// - method = 'certificate_request'
// - reference = JSON: {"type":"cert_request","student_name":"","course_title":"","course_id":"","status":"pending|trainer_approved|admin_approved|issued|rejected","trainer_note":"","admin_note":"","cert_number":"","verify_code":""}
// - status field = tracks enrollment/payment status
// We use the reference field as JSON storage for the request workflow

const REQUEST_MARKER = '__CERT_REQUEST__:'

interface CertRequest {
  id: string
  user_id: string
  course_id: string
  student_name: string
  course_title: string
  amount: number
  currency: string
  status: 'pending' | 'trainer_approved' | 'admin_approved' | 'issued' | 'rejected'
  trainer_note?: string
  admin_note?: string
  cert_number?: string
  verify_code?: string
  created_at?: string
  updated_at?: string
}

function parseRequest(reference: string | null, payment: any): CertRequest | null {
  if (!reference) return null
  try {
    const jsonStr = reference.startsWith(REQUEST_MARKER) ? reference.substring(REQUEST_MARKER.length) : null
    if (!jsonStr) return null
    const data = JSON.parse(jsonStr)
    return {
      id: payment.id,
      user_id: payment.user_id || data.user_id,
      course_id: data.course_id || payment.course_id,
      student_name: data.student_name || '',
      course_title: data.course_title || '',
      amount: payment.amount || data.amount || 0,
      currency: payment.currency || 'ر.ي',
      status: data.status || 'pending',
      trainer_note: data.trainer_note || '',
      admin_note: data.admin_note || '',
      cert_number: data.cert_number || '',
      verify_code: data.verify_code || '',
      created_at: payment.date,
      updated_at: payment.date,
    }
  } catch {
    return null
  }
}

function serializeRequest(req: Partial<CertRequest>): string {
  const data = {
    type: 'cert_request',
    student_name: req.student_name || '',
    course_title: req.course_title || '',
    course_id: req.course_id || '',
    status: req.status || 'pending',
    trainer_note: req.trainer_note || '',
    admin_note: req.admin_note || '',
    cert_number: req.cert_number || '',
    verify_code: req.verify_code || '',
    user_id: req.user_id || '',
  }
  return REQUEST_MARKER + JSON.stringify(data)
}

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('user_id')
    const status = req.nextUrl.searchParams.get('status')

    // Fetch all payments that are certificate requests
    const { data: payments, error } = await supabaseAdmin
      .from('payments')
      .select('*')
      .not('reference', 'is', null)
      .order('date', { ascending: false })

    if (error) throw error

    let requests = (payments || [])
      .map((p: any) => parseRequest(p.reference, p))
      .filter((r: any) => r !== null) as CertRequest[]

    if (userId) requests = requests.filter(r => r.user_id === userId)
    if (status) requests = requests.filter(r => r.status === status)

    return NextResponse.json(requests)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { user_id, course_id, student_name, course_title, fee } = body

    if (!user_id || !course_id || !student_name) {
      return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
    }

    // Check if request already exists
    const { data: existing } = await supabaseAdmin
      .from('payments')
      .select('id, reference')
      .eq('user_id', user_id)
      .eq('course_id', course_id)
      .not('reference', 'is', null)

    const alreadyRequested = (existing || []).some((p: any) => {
      const r = parseRequest(p.reference, p)
      return r && r.status !== 'rejected'
    })

    if (alreadyRequested) {
      return NextResponse.json({ error: 'لديك طلب شهادة قائم لهذه الدورة' }, { status: 400 })
    }

    // Create new certificate request as a payment record
    const refData = serializeRequest({
      user_id,
      course_id,
      student_name,
      course_title,
      status: 'pending',
    })

    const { data, error } = await supabaseAdmin
      .from('payments')
      .insert({
        user_id,
        course_id,
        amount: fee || 0,
        currency: 'ر.ي',
        method: 'certificate_request',
        status: 'active',
        reference: refData,
        date: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error

    const request = parseRequest(data.reference, data)
    return NextResponse.json(request)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { id, action, note, cert_number, verify_code } = await req.json()
    // action: 'trainer_approve' | 'admin_approve' | 'issue' | 'reject'

    if (!id || !action) {
      return NextResponse.json({ error: 'id و action مطلوبان' }, { status: 400 })
    }

    // Fetch the payment record
    const { data: payment, error: fetchErr } = await supabaseAdmin
      .from('payments')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchErr || !payment) {
      return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 })
    }

    const request = parseRequest(payment.reference, payment)
    if (!request) {
      return NextResponse.json({ error: 'ليس طلب شهادة' }, { status: 400 })
    }

    // Update based on action
    let newStatus = request.status
    let newNote = note
    let newCertNumber = request.cert_number
    let newVerifyCode = request.verify_code

    switch (action) {
      case 'trainer_approve':
        newStatus = 'trainer_approved'
        request.trainer_note = note || 'تمت الموافقة من المدرب'
        break
      case 'admin_approve':
        newStatus = 'admin_approved'
        request.admin_note = note || 'تمت الموافقة من الإدارة'
        break
      case 'issue':
        newStatus = 'issued'
        newCertNumber = cert_number || `FIA-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 99999)).padStart(5, '0')}`
        newVerifyCode = verify_code || Math.random().toString(36).substring(2, 10).toUpperCase()
        // Also create the certificate record
        await supabaseAdmin.from('certificates').insert({
          certificate_number: newCertNumber,
          student_name: request.student_name,
          course_title: request.course_title,
          issued_by: 'أكاديمية المستقبل الدولية',
          status: 'صالحة',
        }).select().single()
        break
      case 'reject':
        newStatus = 'rejected'
        request.admin_note = note || 'تم الرفض'
        break
      default:
        return NextResponse.json({ error: 'action غير معروف' }, { status: 400 })
    }

    const updatedRef = serializeRequest({
      ...request,
      status: newStatus,
      trainer_note: request.trainer_note,
      admin_note: request.admin_note,
      cert_number: newCertNumber,
      verify_code: newVerifyCode,
    })

    const { error: updateErr } = await supabaseAdmin
      .from('payments')
      .update({ reference: updatedRef })
      .eq('id', id)

    if (updateErr) throw updateErr

    return NextResponse.json({
      success: true,
      status: newStatus,
      cert_number: newCertNumber,
      verify_code: newVerifyCode,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
