import { supabaseAdmin } from '@/lib/supabase'
import CheckoutClient from './client'

interface Props { params: Promise<{ courseId: string }> }

// ⚡ v10.23-CPU — ISR مخزّن بدل force-dynamic (قشرة client — الدفع والجلسة تعمل client-side كما هي)
// تعديلات أسعار الدورات تظهر خلال 10 دقائق كحد أقصى — خفض Fluid CPU
export const revalidate = 600

export default async function Page({ params }: Props) {
  const { courseId } = await params

  const { data: course } = await supabaseAdmin
    .from('courses')
    .select('*')
    .eq('id', courseId)
    .neq('status', 'مسودة')
    .maybeSingle()

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-navy text-white" dir="rtl">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-3">الدورة غير موجودة</h1>
          <a href="/" className="inline-block bg-gold text-navy px-6 py-3 rounded-lg font-bold">العودة للرئيسية</a>
        </div>
      </div>
    )
  }

  // Fetch active coupons for this course (or general ones)
  const { data: coupons } = await supabaseAdmin
    .from('coupons')
    .select('code, description, discount_type, discount_value, expires_at, max_uses, used_count')
    .eq('status', 'نشط')
    .or(`course_id.is.null,course_id.eq.${course.id}`)

  return <CheckoutClient course={course} coupons={coupons || []} />
}
