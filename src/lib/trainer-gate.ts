import { supabaseAdmin } from '@/lib/supabase'

/**
 * 🛡️ بوابة اعتماد المدرب — المصدر الواحد للحقيقة على الخادم
 * أي قدرة تشغيلية (دورات، منتدى، مدونة، ردود) تُفتح فقط بعد:
 *   1) موافقة الإدارة على الطلب
 *   2) توقيع المدرب على اتفاق نسبة الأرباح
 * status='approved' هو الحالة الوحيدة المفتوحة.
 */

export type TrainerGateResult = { ok: boolean; status?: string; message?: string }

/** قراءة حالة المدرب من القاعدة — تُعيد null إن لم يكن له صف مدرب أصلاً */
export async function getTrainerStatus(userId: string): Promise<string | null> {
  try {
    const { data } = await supabaseAdmin
      .from('trainers')
      .select('status')
      .eq('id', userId)
      .maybeSingle()
    return data ? String((data as any).status || '') : null
  } catch {
    return 'ERROR'
  }
}

/** الرسائل المهنية حسب الحالة — لكل سياق صياغته المناسبة */
export function gateMessage(status: string, context: 'courses' | 'forum' | 'blog' | 'general' = 'general'): string {
  const ctx: Record<string, { pending: string; agreement: string; fallback: string }> = {
    courses: {
      pending: 'ملفك ما زال بانتظار موافقة الإدارة — تُفتح إدارة الدورات بعد الاعتماد وتوقيع اتفاق نسبة الأرباح',
      agreement: 'وافقت الإدارة مبدئياً! وقّع اتفاق النسبة المعروض في لوحتك (نظرة عامة) — وبعد التوقيع تُفتح لك إدارة الدورات فوراً',
      fallback: 'لا يمكن إدارة الدورات الآن — تواصل مع الإدارة بخصوص حالة عضويتك',
    },
    forum: {
      pending: 'قسم المنتدى يُفتح بعد اعتماد ملفك وتوقيع اتفاق الشراكة — ملفك ما زال بانتظار موافقة الإدارة',
      agreement: 'وقّع اتفاق النسبة المعروض في لوحتك (نظرة عامة) — وبعد التوقيع يُفتح لك المنتدى فوراً',
      fallback: 'لا يمكن المشاركة في المنتدى حالياً — تواصل مع الإدارة بخصوص حالة عضويتك',
    },
    blog: {
      pending: 'المدونة متاحة للقراءة فقط حتى اعتماد ملفك وتوقيع اتفاق الشراكة — ملفك ما زال بانتظار موافقة الإدارة',
      agreement: 'وقّع اتفاق النسبة المعروض في لوحتك (نظرة عامة) — وبعد التوقيع يُفتح لك النشر في المدونة فوراً',
      fallback: 'المدونة متاحة للقراءة فقط حالياً — تواصل مع الإدارة بخصوص حالة عضويتك',
    },
    general: {
      pending: 'ملفك ما زال بانتظار موافقة الإدارة — هذه القدرة تُفتح بعد الاعتماد وتوقيع اتفاق الشراكة',
      agreement: 'وقّع اتفاق النسبة المعروض في لوحتك (نظرة عامة) — وبعد التوقيع تُفتح لك هذه القدرة فوراً',
      fallback: 'لا يمكن تنفيذ العملية الآن — تواصل مع الإدارة بخصوص حالة عضويتك',
    },
  }
  const c = ctx[context] || ctx.general
  if (status === 'pending') return c.pending
  if (status === 'agreement_pending') return c.agreement
  return c.fallback
}

/**
 * الحارس الموحد: هل هذا الحساب مدرباً معتمداً (موقّعاً على الاتفاق)؟
 * - بلا صف مدرب (طلاب/إدارة/فريق/مدربون قدماء) → مسموح كما كان
 * - status='approved' أو '' → مسموح
 * - أي حالة أخرى → ممنوع برسالة مهنية
 * - فشل الفحص نفسه → ممنوع احتياطاً حمايةً للمنظومة
 */
export async function assertTrainerCertified(
  userId: string,
  context: 'courses' | 'forum' | 'blog' | 'general' = 'general',
): Promise<TrainerGateResult> {
  const status = await getTrainerStatus(userId)
  if (status === 'ERROR') {
    return { ok: false, message: 'تعذر التحقق من حالة عضويتك — أعد المحاولة' }
  }
  if (status === null || status === 'approved' || status === '') return { ok: true, status: status ?? undefined }
  return { ok: false, status, message: gateMessage(status, context) }
}
