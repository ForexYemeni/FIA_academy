import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// GET /api/affiliate-referrals?affiliate_id=...
// Returns all referrals attributed to a specific affiliate.
export async function GET(req: NextRequest) {
  try {
    const affiliateId = req.nextUrl.searchParams.get('affiliate_id')
    if (!affiliateId) return NextResponse.json({ error: 'affiliate_id required' }, { status: 400 })

    const { data, error } = await supabaseAdmin
      .from('affiliate_referrals')
      .select('*')
      .eq('affiliate_id', affiliateId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return NextResponse.json(data || [])
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
