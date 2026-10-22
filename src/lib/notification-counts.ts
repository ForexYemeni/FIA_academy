// ⚡ v6.6 — عدادات القائمة الجانبية الملكية (طلب صاحب المنصة)
// ============================================================================
// «عند وصول أي إشعار جديد لأي شيء يجب أن يظهر عداد في القائمة الجانبية
//  لكل قسم بشكل فاخر»
//
// الفلسفة: بلا أي طلب شبكي إضافي وبلا أي قناة Realtime ثانية.
// الجرس (notifications-bell) يملك أصلاً مصدر الحقيقة الكامل — جلب أولي +
// اشتراك Realtime (INSERT/UPDATE/DELETE) + polling احتياطي + تحديثات تفاؤلية
// عند فتح/تعليم الإشعارات. نحن فقط نستمع إلى «نشر» حالته إلى هنا:
//   - الجرس ينشر مصفوفة إشعاراته عبر publishNotifications() عند كل تغيير.
//   - القائمة الجانبية (DashboardShell) تقرأ اللقطة عبر useSyncExternalStore
//     وتحسب لكل قسم عدد الإشعارات غير المقروءة التي تشير إليه.
//
// مطابقة الإشعار → القسم:
//   (1) رابط الإشعار «/#tab-id» → إن وُجد tab-id ضمن قائمة الدور الحالي فهو
//       الحسم (decodeURIComponent للروابط العربية المشفّرة).
//   (2) وإلا فallback على نوع الإشعار عبر TYPE_TAB ثم يُقبل فقط إن كان
//       القسم موجوداً في قائمة الدور الحالي (حتى لا يظهر عداد لقسم غير معروض).
// ============================================================================

export type CountNotif = {
  id: string
  type?: string | null
  link?: string | null
  read_at?: string | null
  [k: string]: any
}

let items: CountNotif[] = []
const subs = new Set<() => void>()
const EMPTY: CountNotif[] = []

function emit() {
  for (const cb of subs) {
    try { cb() } catch { /* لا يُسقط مستخدماً واحداً البقية */ }
  }
}

/** الجرس ينشر حالته هنا عند كل تغيير (جلب/Realtime/تفاؤلي/حذف). */
export function publishNotifications(next: any[]) {
  const arr = Array.isArray(next) ? next : []
  // تجاهل النشر إن كانت نفس المصفوفة تماماً (نفس المراجع) — بلا إعادة حساب بلا داعٍ
  if (arr.length === items.length) {
    let same = true
    for (let i = 0; i < arr.length; i++) { if (arr[i] !== items[i]) { same = false; break } }
    if (same) return
  }
  items = arr
  emit()
}

export function subscribeNotificationCounts(cb: () => void) {
  subs.add(cb)
  return () => { subs.delete(cb) }
}

export function getNotificationSnapshot(): CountNotif[] { return items }
export function getNotificationServerSnapshot(): CountNotif[] { return EMPTY }

// --- مطابقة النوع → القسم (fallback للروابط بلا هاش مثل '/') ---
// القيم مصفوفة أولويات: أول قسم موجود في قائمة الدور الحالي هو الحسم
// (مثال: إشعار شهادة للإدارة → «الشهادات»، وللمدرب → «نتائج المتدربين»).
const TYPE_TAB: Record<string, string | string[]> = {
  enrollment: 'courses',
  payment: 'payments',
  completion: 'courses',
  exam: 'exams',
  certificate: ['certificates', 'results'],
  welcome: 'overview',
  password_reset: 'settings',
  review: 'reviews',
  forum: 'forum',
  reply: 'forum',
  blog: 'blog',
  contact: 'contact',
  registration: 'overview',
  follow: 'followers',
  earning: ['earnings', 'trainer-earnings'],
  withdrawal: ['earnings', 'trainer-earnings'],
  trainer_application: 'trainer-applications',
  trainer_agreement: 'overview',
  trainer_rejected: 'overview',
  trainer_certified: 'overview',
  affiliate_commission: 'affiliate',
  affiliate_withdrawal: ['affiliate', 'affiliates'],
  system: 'overview',
}

/** إشعار واحد → معرف قسم القائمة الجانبية (أو null إن لا مطابقة لهذا الدور). */
export function notifTabId(n: CountNotif, navIds: Set<string>): string | null {
  if (!n || n.read_at) return null
  // (1) رابط «/#tab-id» — الأقوى والأدق
  if (typeof n.link === 'string' && n.link.startsWith('/#')) {
    try {
      const h = decodeURIComponent(n.link.slice(2))
      if (navIds.has(h)) return h
    } catch { /* رابط تالف → fallback */ }
  }
  // (2) النوع → قسم، بشرط وجود القسم في قائمة الدور الحالي
  const def = n.type ? TYPE_TAB[n.type] : undefined
  const candidates = Array.isArray(def) ? def : def ? [def] : []
  for (const c of candidates) {
    if (navIds.has(c)) return c
  }
  return null
}

/** عداد لكل قسم: { tabId: عدد غير المقروء المطابق له }. */
export function countsByTab(navIds: Set<string>): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const n of items) {
    if (n.read_at) continue
    const tab = notifTabId(n, navIds)
    if (tab) counts[tab] = (counts[tab] || 0) + 1
  }
  return counts
}

/** معرفات الإشعارات غير المقروءة المطابقة لقسم معين. */
export function unreadIdsForTab(tabId: string, navIds: Set<string>): string[] {
  const ids: string[] = []
  for (const n of items) {
    if (n.read_at) continue
    if (notifTabId(n, navIds) === tabId) ids.push(n.id)
  }
  return ids
}

/** تعليم تفاؤلي محلي (الخادم يُحدَّث من المستدعي) — يُصحّحه نشر الجرس التالي. */
export function markReadLocally(ids: string[]) {
  if (!ids.length) return
  const s = new Set(ids)
  items = items.map((n) => (!n.read_at && s.has(n.id)) ? { ...n, read_at: new Date().toISOString() } : n)
  emit()
}
