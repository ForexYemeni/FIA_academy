// Comprehensive Telegram helper used by ALL API routes.
// Every meaningful action by any user (admin / trainer / student) is
// mirrored to the Telegram channel with a professional formatted
// message. This is in addition to the in-app notifications system.

import { supabaseAdmin } from '@/lib/supabase'

const TELEGRAM_TEXT_LIMIT = 4096

// === Bot settings ===
let _cachedSettings: { token: string; channelId: string } | null = null
let _settingsFetchedAt = 0

export async function getBotSettings(): Promise<{ token: string; channelId: string }> {
  // Cache for 60s — multiple notifications in quick succession shouldn't
  // each hit the DB for settings.
  if (_cachedSettings && Date.now() - _settingsFetchedAt < 60000) return _cachedSettings
  try {
    const { data, error } = await supabaseAdmin
      .from('site_settings')
      .select('telegram_bot_token, telegram_channel_id')
      .limit(1)
      .maybeSingle()
    if (error || !data) {
      _cachedSettings = { token: '', channelId: '' }
    } else {
      _cachedSettings = {
        token: data.telegram_bot_token || '',
        channelId: data.telegram_channel_id || '',
      }
    }
  } catch {
    _cachedSettings = { token: '', channelId: '' }
  }
  _settingsFetchedAt = Date.now()
  return _cachedSettings
}

// === HTML escaping ===
export function escapeHtml(s: unknown): string {
  if (s === null || s === undefined) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// === Core sender ===
async function sendTelegramMessage(text: string): Promise<boolean> {
  try {
    const { token, channelId } = await getBotSettings()
    if (!token || !channelId) return false
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: channelId,
        text: text.slice(0, TELEGRAM_TEXT_LIMIT),
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    })
    const data = await res.json().catch(() => null)
    return !!(data && data.ok)
  } catch {
    return false
  }
}

// === Data fetchers ===
async function getCourse(id: string): Promise<any | null> {
  try {
    const { data } = await supabaseAdmin
      .from('courses')
      .select('id, title, price, price_type, currency, duration_hours, level')
      .eq('id', id).maybeSingle()
    return data
  } catch { return null }
}
async function getCourseTitle(id: string): Promise<string> {
  return (await getCourse(id))?.title || 'دورة'
}
async function getUserName(id: string): Promise<string> {
  try {
    const { data } = await supabaseAdmin.from('users').select('name, role').eq('id', id).maybeSingle()
    return data?.name || 'مستخدم'
  } catch { return 'مستخدم' }
}
async function getTrainerName(id: string): Promise<string> {
  try {
    const { data } = await supabaseAdmin.from('trainers').select('name').eq('id', id).maybeSingle()
    return data?.name || 'مدرب'
  } catch { return 'مدرب' }
}

// === Section decorators ===
function header(emoji: string, title: string): string {
  return `<b>${emoji} ${escapeHtml(title)}</b>\n`
}
function line(label: string, value: any): string {
  return `\n${label}: <b>${escapeHtml(value)}</b>`
}

// =========================================================================
// COURSE EVENTS
// =========================================================================

export async function tgCourseCreated(courseId: string, byUserId?: string) {
  const c = await getCourse(courseId)
  if (!c) return
  const by = byUserId ? await getUserName(byUserId) : 'النظام'
  const price = (c.price_type === 'مجانية' || !c.price || c.price <= 0) ? 'مجانية' : `${c.price} ${c.currency || 'ر.ي'}`
  const msg =
    header('🎓', 'دورة جديدة متاحة الآن') +
    line('📋 العنوان', c.title) +
    line('📊 المستوى', c.level || 'مبتدئ') +
    line('⏱️ المدة', `${c.duration_hours || 0} ساعة`) +
    line('💰 السعر', price) +
    line('✨ أُنشأت بواسطة', by) +
    `\n\n✅ سجل الآن في منصة FIA\n🔗 fiaacademy.vercel.app`
  await sendTelegramMessage(msg)
}

export async function tgCourseUpdated(courseId: string, byUserId?: string) {
  const c = await getCourse(courseId)
  if (!c) return
  const by = byUserId ? await getUserName(byUserId) : 'النظام'
  const price = (c.price_type === 'مجانية' || !c.price || c.price <= 0) ? 'مجانية' : `${c.price} ${c.currency || 'ر.ي'}`
  const msg =
    header('🔄', 'تم تحديث دورة') +
    line('📋 العنوان', c.title) +
    line('📊 المستوى', c.level || 'مبتدئ') +
    line('⏱️ المدة', `${c.duration_hours || 0} ساعة`) +
    line('💰 السعر', price) +
    line('✨ حدّثها', by) +
    `\n\n✅ سجل الآن في منصة FIA\n🔗 fiaacademy.vercel.app`
  await sendTelegramMessage(msg)
}

export async function tgCourseDeleted(courseTitle: string, byUserId?: string) {
  const by = byUserId ? await getUserName(byUserId) : 'الإدارة'
  const msg =
    header('🗑️', 'تم حذف دورة') +
    line('📋 العنوان', courseTitle) +
    line('✨ حذفها', by) +
    `\n\n⚠️ تم حذف جميع التقييمات والشهادات والمدفوعات المرتبطة بها أيضاً.`
  await sendTelegramMessage(msg)
}

// =========================================================================
// MODULE + LESSON EVENTS
// =========================================================================

export async function tgModuleCreated(courseId: string, moduleTitle: string, byUserId?: string) {
  const courseTitle = await getCourseTitle(courseId)
  const by = byUserId ? await getUserName(byUserId) : 'النظام'
  const msg =
    header('📚', 'وحدة جديدة أُضيفت لدورة') +
    `\n📋 الدورة: <b>${escapeHtml(courseTitle)}</b>` +
    line('📚 الوحدة', moduleTitle) +
    line('✨ أضافها', by)
  await sendTelegramMessage(msg)
}

export async function tgLessonCreated(courseId: string, lessonTitle: string, lessonType: string, byUserId?: string) {
  const courseTitle = await getCourseTitle(courseId)
  const by = byUserId ? await getUserName(byUserId) : 'النظام'
  const typeAr = lessonType === 'video' ? '🎬 فيديو' : lessonType === 'pdf' ? '📄 PDF' : lessonType === 'exam' ? '📝 اختبار' : '📖 نص'
  const msg =
    header(typeAr.split(' ')[0], 'درس جديد في دورة') +
    `\n📋 الدورة: <b>${escapeHtml(courseTitle)}</b>` +
    line('📖 العنوان', lessonTitle) +
    line(' النوع', typeAr) +
    line('✨ أضافه', by)
  await sendTelegramMessage(msg)
}

// =========================================================================
// ENROLLMENT + PAYMENT EVENTS
// =========================================================================

export async function tgEnrollmentFree(userId: string, courseId: string) {
  const [userName, courseTitle] = await Promise.all([getUserName(userId), getCourseTitle(courseId)])
  const msg =
    header('✅', 'تسجيل مجاني جديد') +
    line('👤 المتدرب', userName) +
    line('📋 الدورة', courseTitle) +
    `\n\n🎓 انضمّ متدرب جديد إلى دورتك — نوّجه برحابة صدر!`
  await sendTelegramMessage(msg)
}

export async function tgPaymentRequest(userId: string, courseId: string, amount: number, currency: string, method?: string) {
  const [userName, courseTitle] = await Promise.all([getUserName(userId), getCourseTitle(courseId)])
  const msg =
    header('💳', 'طلب تأكيد دفع جديد') +
    line('👤 المتدرب', userName) +
    line('📋 الدورة', courseTitle) +
    line('💰 المبلغ', `${amount.toLocaleString()} ${currency}`) +
    (method ? line('🏦 الطريقة', method) : '') +
    `\n\n⏳ ينتظر موافقة الإدارة — يرجى المراجعة في لوحة التحكم.`
  await sendTelegramMessage(msg)
}

export async function tgPaymentApproved(userId: string, courseId: string, byUserId?: string) {
  const [userName, courseTitle, byName] = await Promise.all([
    getUserName(userId), getCourseTitle(courseId),
    byUserId ? getUserName(byUserId) : Promise.resolve('الإدارة'),
  ])
  const msg =
    header('✅', 'تم تأكيد دفع') +
    line('👤 المتدرب', userName) +
    line('📋 الدورة', courseTitle) +
    line('✨ أكّده', byName) +
    `\n\n🔓 تم تفعيل الدورة للمتدرب — يستطيع الآن الوصول إلى المحتوى.`
  await sendTelegramMessage(msg)
}

export async function tgPaymentRejected(userId: string, courseId: string, byUserId?: string) {
  const [userName, courseTitle, byName] = await Promise.all([
    getUserName(userId), getCourseTitle(courseId),
    byUserId ? getUserName(byUserId) : Promise.resolve('الإدارة'),
  ])
  const msg =
    header('❌', 'تم رفض دفع') +
    line('👤 المتدرب', userName) +
    line('📋 الدورة', courseTitle) +
    line('✨ رفضه', byName) +
    `\n\n⚠️ يرجى من المتدرب رفع إثبات دفع صحيح أو التواصل مع الإدارة.`
  await sendTelegramMessage(msg)
}

// =========================================================================
// CERTIFICATE EVENTS
// =========================================================================

export async function tgCertRequested(userId: string, courseId: string) {
  const [userName, courseTitle] = await Promise.all([getUserName(userId), getCourseTitle(courseId)])
  const msg =
    header('🎓', 'طلب شهادة جديد') +
    line('👤 المتدرب', userName) +
    line('📋 الدورة', courseTitle) +
    `\n\n⏳ ينتظر موافقة المدرب ثم الإدارة.`
  await sendTelegramMessage(msg)
}

export async function tgCertIssued(userId: string, courseId: string, certNumber: string) {
  const [userName, courseTitle] = await Promise.all([getUserName(userId), getCourseTitle(courseId)])
  const msg =
    header('🎉', 'تم إصدار شهادة') +
    line('👤 المتدرب', userName) +
    line('📋 الدورة', courseTitle) +
    line('📜 رقم الشهادة', certNumber) +
    `\n\n✅ يمكنك التحقق من الشهادة في صفحة التحقق.`
  await sendTelegramMessage(msg)
}

export async function tgCertRejected(userId: string, courseId: string, byUserId?: string) {
  const [userName, courseTitle, byName] = await Promise.all([
    getUserName(userId), getCourseTitle(courseId),
    byUserId ? getUserName(byUserId) : Promise.resolve('الإدارة'),
  ])
  const msg =
    header('❌', 'تم رفض طلب شهادة') +
    line('👤 المتدرب', userName) +
    line('📋 الدورة', courseTitle) +
    line('✨ رفضه', byName)
  await sendTelegramMessage(msg)
}

// =========================================================================
// COURSE COMPLETION
// =========================================================================

export async function tgCourseCompleted(userId: string, courseId: string) {
  const [userName, courseTitle] = await Promise.all([getUserName(userId), getCourseTitle(courseId)])
  const msg =
    header('🏆', 'إكمال دورة') +
    line('👤 المتدرب', userName) +
    line('📋 الدورة', courseTitle) +
    `\n\n🎉 أحسنت! أنهى المتدرب جميع دروس الدورة بنجاح.`
  await sendTelegramMessage(msg)
}

// =========================================================================
// USER + TRAINER + TEAM EVENTS
// =========================================================================

export async function tgUserRegistered(userId: string, name: string, role: string) {
  const roleAr = role === 'admin' ? 'مشرف' : role === 'trainer' ? 'مدرب' : 'متدرب'
  const msg =
    header('👋', 'تسجيل مستخدم جديد') +
    line('👤 الاسم', name) +
    line('🔑 الصفة', roleAr)
  await sendTelegramMessage(msg)
}

export async function tgTrainerAdded(trainerId: string, name: string, byUserId?: string) {
  const by = byUserId ? await getUserName(byUserId) : 'الإدارة'
  const msg =
    header('👨‍⚕️', 'انضمام مدرب جديد') +
    line('👤 الاسم', name) +
    line('✨ أضافه', by)
  await sendTelegramMessage(msg)
}

export async function tgTeamMemberAdded(name: string, role: string, byUserId?: string) {
  const by = byUserId ? await getUserName(byUserId) : 'الإدارة'
  const roleAr = role === 'founder' ? 'المؤسس' : role === 'leader' ? 'قائد' : 'عضو فريق'
  const msg =
    header('👑', 'انضمام عضو جديد للفريق') +
    line('👤 الاسم', name) +
    line('🎖️ الدور', roleAr) +
    line('✨ أضافه', by)
  await sendTelegramMessage(msg)
}

// =========================================================================
// REVIEW + FORUM + BLOG + CONTACT EVENTS
// =========================================================================

export async function tgReviewSubmitted(userId: string, courseId: string, rating: number) {
  const [userName, courseTitle] = await Promise.all([getUserName(userId), getCourseTitle(courseId)])
  const stars = '⭐'.repeat(Math.max(1, Math.min(5, rating)))
  const msg =
    header('⭐', 'تقييم جديد لدورة') +
    line('👤 المتدرب', userName) +
    line('📋 الدورة', courseTitle) +
    line('📊 التقييم', `${rating}/5 ${stars}`)
  await sendTelegramMessage(msg)
}

export async function tgForumTopicCreated(userId: string, topicTitle: string) {
  const userName = await getUserName(userId)
  const msg =
    header('💬', 'موضوع جديد في المنتدى') +
    line('👤 الكاتب', userName) +
    line('📋 العنوان', topicTitle)
  await sendTelegramMessage(msg)
}

export async function tgBlogPublished(title: string, slug: string, byUserId?: string) {
  const by = byUserId ? await getUserName(byUserId) : 'الإدارة'
  const msg =
    header('📰', 'منشور جديد في المدونة') +
    line('📋 العنوان', title) +
    line('✨ نشره', by) +
    `\n\n🔗 fiaacademy.vercel.app/blog/${slug}`
  await sendTelegramMessage(msg)
}

export async function tgContactReceived(name: string, subject?: string | null) {
  const msg =
    header('📧', 'رسالة جديدة من نموذج التواصل') +
    line('👤 الاسم', name) +
    (subject ? line('📋 الموضوع', subject) : '') +
    `\n\n📩 يرجى الرد عبر صندوق الرسائل في لوحة التحكم.`
  await sendTelegramMessage(msg)
}

// =========================================================================
// AFFILIATE + COUPON EVENTS
// =========================================================================

export async function tgAffiliateRegistered(name: string, email: string) {
  const msg =
    header('🤝', 'طلب تسجيل في برنامج العمولة') +
    line('👤 الاسم', name) +
    line('📧 البريد', email)
  await sendTelegramMessage(msg)
}

export async function tgCouponCreated(code: string, discountType: string, discountValue: number, byUserId?: string) {
  const by = byUserId ? await getUserName(byUserId) : 'الإدارة'
  const disc = discountType === 'percentage' ? `${discountValue}%` : `${discountValue} ر.ي`
  const msg =
    header('🎟️', 'كوبون خصم جديد') +
    line('🎟️ الكود', code) +
    line('💰 الخصم', disc) +
    line('✨ أنشأه', by)
  await sendTelegramMessage(msg)
}

// =========================================================================
// CLEANUP EVENTS
// =========================================================================

export async function tgCleanupOrphans(deletedPayments: number, deletedCertReqs: number, byUserId?: string) {
  const by = byUserId ? await getUserName(byUserId) : 'الإدارة'
  const msg =
    header('🧹', 'تنظيف السجلات اليتيمة') +
    line('🗑️ مدفوعات يتيمة محذوفة', deletedPayments) +
    line('🗑️ طلبات شهادات يتيمة محذوفة', deletedCertReqs) +
    line('✨ نفّذها', by)
  await sendTelegramMessage(msg)
}

export async function tgDangerZoneWiped(section: string, count: number, byUserId?: string, snapshotId?: string | null) {
  const by = byUserId ? await getUserName(byUserId) : 'الإدارة'
  const shield = snapshotId
    ? line('🛡️ نسخة إنقاذ ملكية جاهزة للاستعادة', String(snapshotId).slice(0, 8))
    : line('🛡️ نسخة الإنقاذ', 'تعذّر إنشاؤها — حذف مباشر')
  const msg =
    header('⚠️', 'تنظيف منطقة خطرة') +
    line('🗑️ القسم', section) +
    line('📊 عدد السجلات المحذوفة', count) +
    shield +
    line('✨ نفّذها', by) +
    `\n\n⚠️ هذا إجراء تدميري — لكن نسخة الإنقاذ تسمح بالاستعادة الكاملة من أرشيف الإنقاذ الملكي.`
  await sendTelegramMessage(msg)
}

export async function tgDangerZoneRestored(rowTotal: number, byUserId?: string) {
  const by = byUserId ? await getUserName(byUserId) : 'الإدارة'
  const msg =
    header('🛡️', 'استعادة إنقاذ ملكية') +
    line('♻️ السجلات المستعادة', rowTotal) +
    line('✨ نفّذها', by) +
    `\n\n✅ تم إرجاع البيانات من أرشيف الإنقاذ بنجاح.`
  await sendTelegramMessage(msg)
}

// =========================================================================
// ROYAL TRAINER PIPELINE — تسجيل المدرب الذاتي + الموافقة + الاتفاق + الاعتماد
// =========================================================================

export async function tgTrainerApplication(name: string, email: string, specialty?: string | null, country?: string | null) {
  const msg =
    header('🎓', 'طلب انضمام مدرب جديد — تسجيل ذاتي') +
    line('👤 الاسم', name) +
    line('💼 التخصص', specialty || '—') +
    line('🌍 الدولة', country || '—') +
    line('📧 البريد', email) +
    `\n\n⏳ بانتظار الموافقة الملكية في لوحة الإدارة → طلبات المدربين.`
  await sendTelegramMessage(msg)
}

export async function tgTrainerApplicationApproved(name: string, percentage: number, byUserId?: string) {
  const by = byUserId ? await getUserName(byUserId) : 'الإدارة'
  const msg =
    header('🤝', 'موافقة مبدئية على مدرب') +
    line('👤 الاسم', name) +
    line('💰 نسبة الأرباح المعروضة', percentage + '%') +
    line('✨ وافقت', by) +
    `\n\n📜 الآن يصل الاتفاق الفاخر للمدرب ليقبل النسبة أو يرفضها.`
  await sendTelegramMessage(msg)
}

export async function tgTrainerApplicationRejected(name: string, reason?: string | null, byUserId?: string) {
  const by = byUserId ? await getUserName(byUserId) : 'الإدارة'
  const msg =
    header('🚫', 'رفض طلب انضمام مدرب') +
    line('👤 الاسم', name) +
    line('📝 السبب', reason || '—') +
    line('✨ رفض', by)
  await sendTelegramMessage(msg)
}

export async function tgTrainerCertified(name: string, percentage: number) {
  const msg =
    header('🏅', 'اعتماد مدرب ملكياً') +
    line('👤 الاسم', name) +
    line('🤝 نسبة الأرباح المتفق عليها', percentage + '%') +
    line('👑 الحالة', 'معتمد — يظهر الآن في نخبة مدربي الأكاديمية')
  await sendTelegramMessage(msg)
}

export async function tgTrainerAgreementDeclined(name: string, note?: string | null) {
  const msg =
    header('⚖️', 'رفض مدرب نسبة الربح المعروضة') +
    line('👤 الاسم', name) +
    line('📝 ملاحظته', note || '—') +
    `\n\n💡 يمكنك مراجعة العرض وإعادة تقديمه من: لوحة الإدارة → طلبات المدربين.`
  await sendTelegramMessage(msg)
}
