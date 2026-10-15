import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// We store enrollments in the existing `payments` table creatively.
// - amount = 0 means FREE enrollment
// - amount > 0 means PAID enrollment
// - status field is reused as enrollment status: 'active' | 'completed' | 'cancelled'
// - method field stores the payment method (e.g., 'free', 'جيب', 'جوالي')
// - reference field stores the payment reference (e.g., 'FREE', 'JB-12345')
// - We track lesson completion in the `description` field as JSON

const COMPLETION_MARKER = '__ENROLL_PROGRESS__:'

interface StoredEnrollment {
  id: string
  amount: number
  currency: string | null
  method: string | null
  status: string  // active | completed | cancelled
  reference: string | null
  date: string | null
  user_id: string | null
  course_id: string | null
}

function toEnrollment(p: StoredEnrollment): any {
  // Determine if it's free or paid
  const isFree = !p.amount || p.amount === 0
  // Determine payment_status from amount
  let payment_status = 'free'
  if (!isFree) {
    payment_status = p.status === 'paid' ? 'paid' : 'pending'
  }
  return {
    id: p.id,
    user_id: p.user_id,
    course_id: p.course_id,
    status: p.status || 'active',
    progress: 0, // we'll calculate from a separate field if needed
    payment_status,
    amount_paid: p.amount || 0,
    currency: p.currency || 'ر.ي',
    payment_method: p.method,
    payment_reference: p.reference,
    enrolled_at: p.date,
    completed_at: null,
  }
}

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('user_id')
    const courseId = req.nextUrl.searchParams.get('course_id')

    let query = supabaseAdmin.from('payments').select('*')
    if (userId) query = query.eq('user_id', userId)
    if (courseId) query = query.eq('course_id', courseId)
    const { data, error } = await query.order('date', { ascending: false })
    if (error) throw error
    return NextResponse.json((data || []).map(toEnrollment))
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Check if already enrolled (payment record exists for this user+course)
    const { data: existing } = await supabaseAdmin
      .from('payments')
      .select('id, status')
      .eq('user_id', body.user_id)
      .eq('course_id', body.course_id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ already_enrolled: true, ...toEnrollment(existing as StoredEnrollment) })
    }

    const isFree = body.payment_status === 'free' || !body.amount_paid || body.amount_paid === 0

    const { data, error } = await supabaseAdmin
      .from('payments')
      .insert({
        user_id: body.user_id,
        course_id: body.course_id,
        amount: body.amount_paid || 0,
        currency: body.currency || 'ر.ي',
        method: body.payment_method || (isFree ? 'free' : null),
        status: 'active',  // enrollment is active
        reference: body.payment_reference || (isFree ? 'FREE' : null),
        date: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(toEnrollment(data as StoredEnrollment))
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { id, ...updates } = await req.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    // Map enrollment fields back to payment fields
    const paymentUpdates: any = {}
    if (updates.status !== undefined) paymentUpdates.status = updates.status
    if (updates.amount_paid !== undefined) paymentUpdates.amount = updates.amount_paid
    if (updates.currency !== undefined) paymentUpdates.currency = updates.currency
    if (updates.payment_method !== undefined) paymentUpdates.method = updates.payment_method
    if (updates.payment_reference !== undefined) paymentUpdates.reference = updates.payment_reference
    if (updates.enrolled_at !== undefined) paymentUpdates.date = updates.enrolled_at

    if (Object.keys(paymentUpdates).length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('payments')
      .update(paymentUpdates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(toEnrollment(data as StoredEnrollment))
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json()
    const { error } = await supabaseAdmin.from('payments').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
