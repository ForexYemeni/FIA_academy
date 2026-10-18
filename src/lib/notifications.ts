// Shared notification helper used by all API routes.
// Each function sends a notification to a user via the `notifications`
// table (in-app) AND via OneSignal push (instant external OS-level
// popup, even when the app is closed/force-killed).

import { supabaseAdmin } from '@/lib/supabase'
import { sendPushNotification } from '@/lib/onesignal'

// =========================================================================
// Internal helpers
// =========================================================================

async function send(userId: string, type: string, title: string, body?: string, link?: string) {
  if (!userId || !type || !title) return
  // 1) Insert into the notifications table (in-app bell)
  try {
    await supabaseAdmin.from('notifications').insert({
      user_id: userId,
      type,
      title,
      body: body || null,
      link: link || null,
    })
  } catch {
    // Non-fatal — don't fail the parent operation because the
    // notification couldn't be inserted.
  }
  // 2) Send OneSignal push notification (instant external OS-level
  //    popup, works even when the app is closed/force-killed)
  try {
    await sendPushNotification(userId, title, body || '', { type, link: link || '/' })
  } catch {
    // Non-fatal — in-app notification still works even if push fails
  }
}

async function sendToMany(userIds: string[], type: string, title: string, body?: string, link?: string) {
  const uniq = Array.from(new Set(userIds.filter(Boolean)))
  await Promise.all(uniq.map((uid) => send(uid, type, title, body, link)))
}

async function getAdminIds(): Promise<string[]> {
  try {
    const { data } = await supabaseAdmin.from('users').select('id').eq('role', 'admin')
    return (data || []).map((u: any) => u.id)
  } catch { return [] }
}

async function getTrainerOfCourse(courseId: string): Promise<string | null> {
  try {
    const { data } = await supabaseAdmin.from('courses').select('trainer_id').eq('id', courseId).maybeSingle()
    return data?.trainer_id || null
  } catch { return null }
}

async function getCourseTitle(courseId: string): Promise<string> {
  try {
    const { data } = await supabaseAdmin.from('courses').select('title').eq('id', courseId).maybeSingle()
    return data?.title || 'دورة'
  } catch { return 'دورة' }
}

async function getUserName(userId: string): Promise<string> {
  try {
    const { data } = await supabaseAdmin.from('users').select('name').eq('id', userId).maybeSingle()
    return data?.name || 'متدرب'
  } catch { return 'متدرب' }
}

// =========================================================================
// Public notification helpers — grouped by event type
// =========================================================================

// === ENROLLMENT EVENTS ===

/** Student enrolled in a free course. Notify student + admins. */
export async function notifyFreeEnrollment(userId: string, courseId: string) {
  const courseTitle = await getCourseTitle(courseId)
  const userName = await getUserName(userId)
  // Notify student
  await send(userId, 'enrollment', 'تم التسجيل في الدورة بنجاح',
    `أنت الآن مسجّل في دورة "${courseTitle}". ابدأ التعلم الآن!`, '/')
  // Notify admins
  const admins = await getAdminIds()
  await sendToMany(admins, 'enrollment', 'تسجيل جديد في دورة',
    `متدرب جديد "${userName}" سجّل في دورة "${courseTitle}".`, '/')
}

/** Student submitted a payment proof for a paid course (pending approval).
 * Notify student + admins. */
export async function notifyPaymentRequest(userId: string, courseId: string, amount: number, currency: string) {
  const courseTitle = await getCourseTitle(courseId)
  const userName = await getUserName(userId)
  // Notify student
  await send(userId, 'payment', 'تم استلام إثبات الدفع',
    `تم استلام طلب اشتراك في دورة "${courseTitle}" بمبلغ ${amount.toLocaleString()} ${currency}. سيتم تفعيل الدورة بعد مراجعة الإدارة وتأكيد الدفع.`, '#payments')
  // Notify admins
  const admins = await getAdminIds()
  await sendToMany(admins, 'payment', 'طلب تأكيد دفع جديد',
    `طلب جديد من "${userName}" للاشتراك في دورة "${courseTitle}" — المبلغ ${amount.toLocaleString()} ${currency}. ينتظر المراجعة والموافقة.`, '#payments')
}

/** Admin approved a payment. Notify student + trainer. */
export async function notifyPaymentApproved(userId: string, courseId: string) {
  const courseTitle = await getCourseTitle(courseId)
  await send(userId, 'payment', 'تم تأكيد الدفع ✓',
    `تم تأكيد دفعك لدورة "${courseTitle}". يمكنك الآن الوصول إلى محتوى الدورة. ابدأ التعلم!`, '#courses')
  // Notify the course trainer
  const trainerId = await getTrainerOfCourse(courseId)
  if (trainerId) {
    const userName = await getUserName(userId)
    await send(trainerId, 'payment', 'متدرب جديد في دورتك',
      `المتدرب "${userName}" تم تأكيد اشتراكه في دورتك "${courseTitle}".`, '/')
  }
}

/** Admin rejected a payment. Notify student. */
export async function notifyPaymentRejected(userId: string, courseId: string) {
  const courseTitle = await getCourseTitle(courseId)
  await send(userId, 'payment', 'تم رفض الدفع',
    `للأسف لم يتم قبول دفعك لدورة "${courseTitle}". يرجى التواصل مع الإدارة لمزيد من التفاصيل أو إعادة رفع إثبات دفع صحيح.`, '/')
}

// === COURSE COMPLETION EVENTS ===

/** Student completed a course (100% progress). Notify student + trainer + admins. */
export async function notifyCourseCompleted(userId: string, courseId: string) {
  const courseTitle = await getCourseTitle(courseId)
  const userName = await getUserName(userId)
  // Notify student
  await send(userId, 'completion', '🎉 أكملت الدورة بنجاح!',
    `أحسنت! لقد أكملت دورة "${courseTitle}" بنجاح. يمكنك الآن طلب الشهادة من صفحة دوراتك.`, '#profile')
  // Notify trainer
  const trainerId = await getTrainerOfCourse(courseId)
  if (trainerId) {
    await send(trainerId, 'completion', 'متدرب أنهى دورتك',
      `المتدرب "${userName}" أنهى دورتك "${courseTitle}" بنجاح.`, '/')
  }
  // Notify admins
  const admins = await getAdminIds()
  await sendToMany(admins, 'completion', 'إكمال دورة',
    `المتدرب "${userName}" أنهى دورة "${courseTitle}".`, '/')
}

// === CERTIFICATE REQUEST EVENTS ===

/** Student requested a certificate. Notify student + admins + trainer. */
export async function notifyCertificateRequested(userId: string, courseId: string) {
  const courseTitle = await getCourseTitle(courseId)
  const userName = await getUserName(userId)
  // Notify student
  await send(userId, 'certificate', 'تم استلام طلب الشهادة',
    `تم استلام طلبك للحصول على شهادة دورة "${courseTitle}". سيتم مراجعته من قبل المدرب والإدارة.`, '/')
  // Notify admins
  const admins = await getAdminIds()
  await sendToMany(admins, 'certificate', 'طلب شهادة جديد',
    `طلب شهادة جديد من "${userName}" لدورة "${courseTitle}". ينتظر المراجعة.`, '/')
  // Notify trainer
  const trainerId = await getTrainerOfCourse(courseId)
  if (trainerId) {
    await send(trainerId, 'certificate', 'طلب شهادة جديد في دورتك',
      `المتدرب "${userName}" طلب شهادة دورة "${courseTitle}". يرجى مراجعة إكماله للدورة قبل الموافقة.`, '/')
  }
}

/** Trainer approved a certificate request (passes to admin). Notify student + admins. */
export async function notifyTrainerApprovedCertificate(userId: string, courseId: string) {
  const courseTitle = await getCourseTitle(courseId)
  await send(userId, 'certificate', 'تمت موافقة المدرب على طلبك',
    `وافق المدرب على طلب شهادتك لدورة "${courseTitle}". ينتظر الآن موافقة الإدارة النهائية.`, '/')
  const admins = await getAdminIds()
  await sendToMany(admins, 'certificate', 'موافقة مدرب على طلب شهادة',
    `وافق المدرب على طلب شهادة لدورة "${courseTitle}". ينتظر موافقتك النهائية.`, '/')
}

/** Admin approved a certificate request. Notify student. */
export async function notifyCertificateApproved(userId: string, courseId: string) {
  const courseTitle = await getCourseTitle(courseId)
  await send(userId, 'certificate', '🎉 تمت الموافقة على شهادتك!',
    `تمت الموافقة على طلب شهادتك لدورة "${courseTitle}". يمكنك تحميل الشهادة من صفحة شهاداتك.`, '#profile')
}

/** Admin rejected a certificate request. Notify student. */
export async function notifyCertificateRejected(userId: string, courseId: string) {
  const courseTitle = await getCourseTitle(courseId)
  await send(userId, 'certificate', 'تم رفض طلب الشهادة',
    `لم تتم الموافقة على طلب شهادتك لدورة "${courseTitle}". يرجى التواصل مع الإدارة لمعرفة السبب.`, '/')
}

// === REGISTRATION & ACCOUNT EVENTS ===

/** New user registered. Notify the user + all admins. */
export async function notifyUserRegistered(userId: string, name: string, role: string) {
  // Notify user
  await send(userId, 'welcome', 'مرحباً بك في أكاديمية المستقبل الدولية! 🎓',
    `أهلاً ${name}! تم إنشاء حسابك بنجاح بصفتك ${role === 'admin' ? 'مشرف/إدارة' : role === 'trainer' ? 'مدرب' : 'متدرب'}. ابدأ رحلتك التعليمية الآن!`, '/')
  // Notify admins
  const admins = await getAdminIds()
  await sendToMany(admins, 'registration', 'تسجيل مستخدم جديد',
    `سجّل مستخدم جديد: "${name}" (${role}).`, '/')
}

// === REVIEW EVENTS ===

/** Student submitted a review for a course. Notify trainer + admins. */
export async function notifyReviewSubmitted(userId: string, courseId: string, rating: number) {
  const courseTitle = await getCourseTitle(courseId)
  const userName = await getUserName(userId)
  const stars = `${'⭐'.repeat(Math.max(1, Math.min(5, rating || 5)))}`
  // Notify trainer
  const trainerId = await getTrainerOfCourse(courseId)
  if (trainerId) {
    await send(trainerId, 'review', `تقييم جديد في دورتك ${stars}`,
      `قيّم المتدرب "${userName}" دورتك "${courseTitle}" بـ ${rating || 5} من 5.`, '#courses')
  }
  // Notify admins
  const admins = await getAdminIds()
  await sendToMany(admins, 'review', 'تقييم جديد لدورة',
    `قيّم المتدرب "${userName}" دورة "${courseTitle}" بـ ${rating || 5} من 5.`, '#courses')
}

// === FORUM EVENTS ===

/** New forum topic created. Notify admins (and optionally course students). */
export async function notifyForumTopicCreated(userId: string, topicTitle: string, topicId?: string) {
  const userName = await getUserName(userId)
  const admins = await getAdminIds()
  await sendToMany(admins, 'forum', 'موضوع جديد في المنتدى',
    `نشر "${userName}" موضوعاً جديداً: "${topicTitle}".`, '/forum')
  const link = topicId ? `/forum?topic=${topicId}` : '/forum'
  await send(userId, 'forum', 'تم نشر موضوعك',
    `تم نشر موضوعك "${topicTitle}" بنجاح في المنتدى.`, link)
}

/** New reply on a forum topic. Notify the original poster + admins. */
export async function notifyForumReplyPosted(replierId: string, topicTitle: string, originalPosterId?: string | null) {
  const replierName = await getUserName(replierId)
  if (originalPosterId && originalPosterId !== replierId) {
    await send(originalPosterId, 'forum', 'رد جديد على موضوعك',
      `ردّ "${replierName}" على موضوعك "${topicTitle}".`, '/forum')
  }
  const admins = await getAdminIds()
  await sendToMany(admins, 'forum', 'رد جديد في المنتدى',
    `ردّ "${replierName}" على موضوع "${topicTitle}".`, '/forum')
}

// === CONTACT MESSAGE EVENTS ===

/** Visitor sent a contact message. Notify admins. */
export async function notifyContactMessage(senderName: string, subject?: string | null) {
  const admins = await getAdminIds()
  await sendToMany(admins, 'contact', 'رسالة جديدة من نموذج التواصل',
    `رسالة جديدة من "${senderName}"${subject ? ` — ${subject}` : ''}. يرجى الرد عبر صندوق الرسائل.`, '/')
}

// === AFFILIATE EVENTS ===

/** New affiliate registration. Notify admins. */
export async function notifyAffiliateRegistered(name: string, email: string) {
  const admins = await getAdminIds()
  await sendToMany(admins, 'affiliate', 'طلب تسجيل في برنامج العمولة',
    `سجّل "${name}" (${email}) في برنامج العمولة. ينتظر المراجعة.`, '/')
}

// === BLOG POST EVENTS ===

/** Admin published a new blog post. Notify all users (newsletter). */
export async function notifyBlogPublished(postTitle: string, slug: string) {
  // Notify all users (broadcast) — could be expensive for large user
  // counts, but the notifications table can handle it.
  try {
    const { data: users } = await supabaseAdmin.from('users').select('id')
    const ids = (users || []).map((u: any) => u.id)
    await sendToMany(ids, 'blog', 'منشور جديد في المدونة',
      `منشور جديد: "${postTitle}". اقرأه الآن في مدونة الأكاديمية.`, `/blog/${slug}`)
  } catch {}
}
