import { supabaseAdmin } from '@/lib/supabase'
import VerifyClient from './client'

interface Props { params: Promise<{ certNumber: string }> }

// ⚡ v10.23-CPU — ISR بخزنة 5 دقائق (توازن بين طزاجة بيانات التحقق وخفض Fluid CPU)
export const revalidate = 300

export default async function Page({ params }: Props) {
  const { certNumber } = await params

  const { data: cert } = await supabaseAdmin
    .from('certificates')
    .select('*')
    .eq('certificate_number', certNumber)
    .maybeSingle()

  return <VerifyClient certificate={cert} />
}
