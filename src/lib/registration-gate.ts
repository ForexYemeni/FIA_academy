// 🛡️ بوابة التسجيل الملكية — تقرأ مفاتيح التحكم بالتسجيل من إعدادات الموقع
// المفاتيح (تُخزَّن ضمن الحقول الإضافية JSON في عمود address — بلا أي ترحيل):
//   registration_stop_all      ← إيقاف كل الحسابات الجديدة (متدرب + مدرب)
//   registration_stop_students ← إيقاف حسابات المتدربين فقط
//   registration_stop_trainers ← إيقاف حسابات المدربين فقط
// القيم: true / '1' / 'true' تعني موقوفاً
import { supabaseAdmin } from '@/lib/supabase'

const EXTRA_SEPARATOR = '\n===FIA_EXTRA===\n'

export interface RegistrationGate {
  stopAll: boolean
  stopStudents: boolean
  stopTrainers: boolean
  /** هل التسجيل موقوف لصفة معينة؟ */
  isStopped(role: 'student' | 'trainer'): boolean
}

function truthy(v: any): boolean {
  return v === true || v === 'true' || v === 1 || v === '1'
}

export async function getRegistrationGate(): Promise<RegistrationGate> {
  let stopAll = false
  let stopStudents = false
  let stopTrainers = false
  try {
    const { data } = await supabaseAdmin
      .from('site_settings')
      .select('address')
      .limit(1)
      .single()
    const addr: string = data?.address || ''
    const idx = addr.indexOf(EXTRA_SEPARATOR)
    if (idx !== -1) {
      try {
        const extra = JSON.parse(addr.substring(idx + EXTRA_SEPARATOR.length))
        stopAll = truthy(extra.registration_stop_all)
        stopStudents = truthy(extra.registration_stop_students)
        stopTrainers = truthy(extra.registration_stop_trainers)
      } catch {}
    }
  } catch {}
  return {
    stopAll,
    stopStudents,
    stopTrainers,
    isStopped(role: 'student' | 'trainer') {
      return stopAll || (role === 'student' ? stopStudents : stopTrainers)
    },
  }
}

/** رسالة الرفض الموحدة الفاخرة */
export function registrationStoppedMessage(role: 'student' | 'trainer'): string {
  return role === 'trainer'
    ? 'إنشاء حسابات المدربين الجديدة موقوف مؤقتاً من قبل إدارة الأكاديمية — تابعنا وسيُعاد الفتح قريباً.'
    : 'إنشاء الحسابات الجديدة موقوف مؤقتاً من قبل إدارة الأكاديمية — تابعنا وسيُعاد الفتح قريباً.'
}
