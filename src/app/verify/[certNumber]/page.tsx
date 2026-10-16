import { supabaseAdmin } from '@/lib/supabase'
import VerifyClient from './client'

interface Props { params: Promise<{ certNumber: string }> }

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function Page({ params }: Props) {
  const { certNumber } = await params

  const { data: cert } = await supabaseAdmin
    .from('certificates')
    .select('*')
    .eq('certificate_number', certNumber)
    .maybeSingle()

  return <VerifyClient certificate={cert} />
}
