/**
 * ============================================================================
 * FIA ACADEMY — الخاتم الملكي (Royal Seal) — الدورات المحمية الأبدية
 * ============================================================================
 * أمر ملكي: دورة «إتقان إدارة أكاديمية المستقبل الدولية» والدورة التعليمية
 * «دليل استخدام الأكاديمية للمتدربين والمدربين» هي دستور الأكاديمية —
 * لا تُحذف أبداً في أي عملية حذف (شاملة أو قسمية أو من إدارة الدورات)،
 * ولا تُمس وحداتها ودروسها وبنك أسئلتها. تظل باقية بعد أي محو ليعود
 * الفريق والمتدربون إليها فوراً.
 *
 * ملاحظة معمارية: دروس الدورتين مخزّنة داخل courses.description (بفاصل
 * ===FIA_MODULES===) لذا يكفي إنقاذ صفّي الدورة ذاته لحفظ كل محتواها.
 * ============================================================================
 */

import { supabaseAdmin } from '@/lib/supabase'

/** slugs الدورات المحمية بالخاتم الملكي — لا تُحذف أبداً */
export const ROYAL_COURSE_SLUGS = ['fia-admin-guide', 'fia-user-guide']

export const ROYAL_SLUG_ADMIN_GUIDE = 'fia-admin-guide'
export const ROYAL_SLUG_USER_GUIDE = 'fia-user-guide'

const ZERO_ID = '00000000-0000-0000-0000-000000000000'

interface RoyalScope {
  courseIds: string[]
  moduleIds: string[]
  has: boolean
  at: number
}

let cache: RoyalScope | null = null
const CACHE_MS = 60_000

/**
 * جلب هويات الدورات الملكية ووحداتها (مع تخزين مؤقت 60 ثانية).
 * يفشل بهدوء (يرجع فارغ) حتى لا يتعطل منطق الحذف إن تعذر الجلب.
 */
export async function getRoyalScope(force = false): Promise<RoyalScope> {
  if (!force && cache && Date.now() - cache.at < CACHE_MS) return cache
  const empty: RoyalScope = { courseIds: [], moduleIds: [], has: false, at: Date.now() }
  try {
    const { data: courses, error } = await supabaseAdmin
      .from('courses')
      .select('id, slug')
      .in('slug', ROYAL_COURSE_SLUGS)
    if (error || !courses) return empty
    const courseIds: string[] = (courses as any[]).map((c) => c.id).filter(Boolean)
    let moduleIds: string[] = []
    if (courseIds.length > 0) {
      const { data: mods } = await supabaseAdmin
        .from('course_modules')
        .select('id')
        .in('course_id', courseIds)
      moduleIds = (mods || []).map((m: any) => m.id).filter(Boolean)
    }
    cache = { courseIds, moduleIds, has: courseIds.length > 0, at: Date.now() }
    return cache
  } catch {
    return empty
  }
}

/**
 * يبني فلتر استبعاد «in» على عمودٍ ما — يُستخدم لاستبعاد صفوف الدورات
 * الملكية من حذفٍ جماعي. يرجع null إن لم يكن هناك ما يُستبعد.
 */
export function royalNotInFilter(ids: string[]): string | null {
  const clean = ids.filter(Boolean)
  if (clean.length === 0) return null
  return `(${clean.join(',')})`
}

/**
 * هل هذا المعرّف دورةً ملكية محمية؟ (للحراسة على حذف دورة واحدة)
 */
export async function isRoyalCourse(id: string): Promise<boolean> {
  if (!id) return false
  const scope = await getRoyalScope()
  return scope.courseIds.includes(id)
}

/** ثابت معرّف الصفر لحذف «كل الصفوف» بأسلوب neq الموجود */
export const ROYAL_ZERO_ID = ZERO_ID
