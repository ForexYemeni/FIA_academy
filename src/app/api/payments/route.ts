import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// GET /api/payments — admin: list all PAID payments only.
// Free enrollments (amount=0, method='free') are tracked in the
// enrollments system, NOT in payments — so we filter them out here
// to keep the admin's "المدفوعات" view clean.
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('user_id')
    let query = supabaseAdmin
      .from('payments')
      .select('*')
      // Exclude free enrollments: amount = 0 + method = 'free' + reference starts with FREE
      .or('amount.gt.0,method.neq.free')
      // Also exclude certificate requests stored in the payments table
      .neq('method', 'certificate_request')
      .order('date', { ascending: false })
    if (userId) query = query.eq('user_id', userId)
    const { data, error } = await query
    if (error) throw error
    return NextResponse.json(data || [])
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// POST — admin: manually create a payment record
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { data, error } = await supabaseAdmin
      .from('payments')
      .insert(body)
      .select()
      .single()
    if (error) throw error
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
