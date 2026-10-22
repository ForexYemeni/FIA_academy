// Shared notification helper used by all API routes.
// Each function sends a notification to a user via:
// 1) the notifications table (in-app bell + polling fallback)
// 2) Firebase Cloud Messaging push (instant external OS-level popup,
//    works even when the app is closed/force-killed)
// 3) OneSignal push (legacy backup — kept for users with old APKs
//    that still use OneSignal; will be removed in a future version)

import { supabaseAdmin } from '@/lib/supabase'
import { sendFcmPush } from '@/lib/firebase-admin'
import { sendPushNotification as sendOneSignalPush } from '@/lib/onesignal'

// =========================================================================
// Internal helpers
// =========================================================================

async function send(userId: string, type: string, title: string, body?: string, link?: string) {
  if (!userId || !type || !title) return
  // 1) Insert into the notifications table (in-app bell + polling fallback)
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
  // 2) Send Firebase Cloud Messaging push (the NEW primary push mechanism)
  //    This works even when the app is fully closed/force-killed.
  try {
    await sendFcmPush({
      userId,
      title,
      body: body || '',
      data: { type, link: link || '/' },
      link: link || '/',
    })
  } catch {
    // Non-fatal — in-app notification still works even if push fails
  }
  // 3) Send OneSignal push (legacy backup for old APKs)
  //    Will be removed in a future version once all users have updated
  //    to APK v2.6.0+ (which uses Firebase directly).
  try {
    await sendOneSignalPush(userId, title, body || '', { type, link: link || '/' })
  } catch {
    // Non-fatal — FCM push already sent above
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
  await send(userId, 'enrollment', 'تم التسجيل في الدورة بنجاح',
    `أنت الآن مسجّل في دورة "${courseTitle}". ابدأ التعلم الآن!`, '/')
  const admins = await getAdminIds()
  await sendToMany(admins, 'enrollment', 'تسجيل جديد في دورة',
    `متدرب جديد "${userName}" سجّل في دورة "${courseTitle}".`, '/')
}

/** Student submitted a payment proof for a paid course (pending approval).
 * Notify student + admins. */
export async function notifyPaymentRequest(userId: string, courseId: string, amount: number, currency: string) {
  const courseTitle = await getCourseTitle(courseId)
  const userName = await getUserName(userId)
  await send(userId, 'payment', 'تم استلام إثبات الدفع',
    `تم استلام طلب اشتراك في دورة "${courseTitle}" بمبلغ ${amount.toLocaleString()} ${currency}. سيتم تفعيل الدورة بعد مراجعة الإدارة وتأكيد الدفع.`, '/#payments')
  const admins = await getAdminIds()
  await sendToMany(admins, 'payment', 'طلب تأكيد دفع جديد',
    `طلب جديد من "${userName}" للاشتراك في دورة "${courseTitle}" — المبلغ ${amount.toLocaleString()} ${currency}. ينتظر المراجعة والموافقة.`, '/#payments')
}

/** Admin approved a payment. Notify student + trainer. */
export async function notifyPaymentApproved(userId: string, courseId: string) {
  const courseTitle = await getCourseTitle(courseId)
  await send(userId, 'payment', 'تم تأكيد الدفع ✓',
    `تم تأكيد دفعك لدورة "${courseTitle}". يمكنك الآن الوصول إلى محتوى الدورة. ابدأ التعلم!`, '/#courses')
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
  await send(userId, 'completion', '🎉 أكملت الدورة بنجاح!',
    `أحسنت! لقد أكملت دورة "${courseTitle}" بنجاح. يمكنك الآن طلب الشهادة من صفحة دوراتك.`, '/#profile')
  const trainerId = await getTrainerOfCourse(courseId)
  if (trainerId) {
    await send(trainerId, 'completion', 'متدرب أنهى دورتك',
      `المتدرب "${userName}" أنهى دورتك "${courseTitle}" بنجاح.`, '/')
  }
  const admins = await getAdminIds()
  await sendToMany(admins, 'completion', 'إكمال دورة',
    `المتدرب "${userName}" أنهى دورة "${courseTitle}".`, '/')
}

// === EXAM EVENTS ===

/** Student submitted a course exam attempt (auto-graded). Notify student + trainer + admins. */
export async function notifyExamGraded(userId: string, courseId: string, score: number, passed: boolean) {
  const courseTitle = await getCourseTitle(courseId)
  const userName = await getUserName(userId)
  if (passed) {
    await send(userId, 'exam', '🎉 نجحت في اختبار الدورة!',
      `مبروك! حصلت على ${score}% في اختبار دورة "${courseTitle}" — يمكنك الآن طلب شهادة الدورة.`, '/#exams')
  } else {
    await send(userId, 'exam', 'نتيجة اختبار الدورة',
      `حصلت على ${score}% في اختبار دورة "${courseTitle}" — لم تحقق درجة النجاح هذه المرة، يمكنك إعادة الاختبار من "اختباراتي".`, '/#exams')
  }
  const trainerId = await getTrainerOfCourse(courseId)
  if (trainerId) {
    await send(trainerId, 'exam', 'نتيجة اختبار جديدة لمتدرب',
      `المتدرب "${userName}" حصل على ${score}% في اختبار دورتك "${courseTitle}" (${passed ? 'ناجح' : 'راسب'}). راجع النتيجة من "نتائج المتدربين".`, '/#results')
  }
  const admins = await getAdminIds()
  await sendToMany(admins, 'exam', 'نتيجة اختبار جديدة',
    `المتدرب "${userName}" حصل على ${score}% في اختبار دورة "${courseTitle}" (${passed ? 'ناجح' : 'راسب'}).`, '/#exams')
}

/** Trainer corrected/overrode a trainee's exam result. Notify the student. */
export async function notifyTrainerGradedExam(userId: string, courseId: string, score: number, passed: boolean, note?: string) {
  const courseTitle = await getCourseTitle(courseId)
  if (passed) {
    await send(userId, 'exam', '📝 تمت مراجعة نتيجتك من المدرب',
      `راجع المدرب نتيجتك في اختبار دورة "${courseTitle}" — النتيجة النهائية: ${score}% (ناجح).${note ? ' ملاحظة المدرب: ' + note : ''}`, '/#results')
  } else {
    await send(userId, 'exam', '📝 تمت مراجعة نتيجتك من المدرب',
      `راجع المدرب نتيجتك في اختبار دورة "${courseTitle}" — النتيجة النهائية: ${score}% (راسب).${note ? ' ملاحظة المدرب: ' + note : ''}`, '/#results')
  }
}

// === CERTIFICATE REQUEST EVENTS ===

/** Student requested a certificate. Notify student + admins + trainer. */
export async function notifyCertificateRequested(userId: string, courseId: string) {
  const courseTitle = await getCourseTitle(courseId)
  const userName = await getUserName(userId)
  await send(userId, 'certificate', 'تم استلام طلب الشهادة',
    `تم استلام طلبك للحصول على شهادة دورة "${courseTitle}". سيتم مراجعته من قبل المدرب والإدارة.`, '/')
  const admins = await getAdminIds()
  await sendToMany(admins, 'certificate', 'طلب شهادة جديد',
    `طلب شهادة جديد من "${userName}" لدورة "${courseTitle}". ينتظر المراجعة.`, '/')
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
    `تمت الموافقة على طلب شهادتك لدورة "${courseTitle}". يمكنك تحميل الشهادة من صفحة شهاداتك.`, '/#profile')
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
  await send(userId, 'welcome', 'مرحباً بك في أكاديمية المستقبل الدولية! 🎓',
    `أهلاً ${name}! تم إنشاء حسابك بنجاح بصفتك ${role === 'admin' ? 'مشرف/إدارة' : role === 'trainer' ? 'مدرب' : 'متدرب'}. ابدأ رحلتك التعليمية الآن!`, '/')
  const admins = await getAdminIds()
  await sendToMany(admins, 'registration', 'تسجيل مستخدم جديد',
    `سجّل مستخدم جديد: "${name}" (${role}).`, '/')
}

// === ACCOUNT RECOVERY ===

/**
 * 👑 طلب استعادة كلمة مرور — يُشعر الإدارة كاملة بطلب المتدرب مع بياناته
 *    (الاسم/البريد/الهاتف/المعرّف) حتى يصدر لكلمة مرور جديدة من لوحة
 *    المستخدمين ويتواصلوا معه فوراً.
 */
export async function notifyPasswordResetRequested(
  requesterId: string,
  name: string,
  email: string,
  phone?: string | null
) {
  const admins = await getAdminIds()
  await sendToMany(admins, 'password_reset', '🔑 طلب استعادة كلمة مرور',
    `طلب "${name}" استعادة كلمة مروره. البريد: ${email}${phone ? ` — الهاتف: ${phone}` : ''}. مُعرّف الحساب: ${requesterId}. أصدر كلمة مرور جديدة من إدارة المستخدمين وتواصل معه.`,
    '/#users')
  await send(requesterId, 'password_reset', 'استلمنا طلب استعادة كلمة المرور ✅',
    `وصل طلبك إلى قصر الأكاديمية يا ${name}. ستصدر كلمة مرور جديدة إليك من الإدارة في أقرب وقت — إن كان الأمر عاجلاً تواصل معنا عبر «تواصل معنا».`, '/')
}

// === REVIEW EVENTS ===

/** Student submitted a review for a course. Notify trainer + admins. */
export async function notifyReviewSubmitted(userId: string, courseId: string, rating: number) {
  const courseTitle = await getCourseTitle(courseId)
  const userName = await getUserName(userId)
  const stars = `${'⭐'.repeat(Math.max(1, Math.min(5, rating || 5)))}`
  const trainerId = await getTrainerOfCourse(courseId)
  if (trainerId) {
    await send(trainerId, 'review', `تقييم جديد في دورتك ${stars}`,
      `قيّم المتدرب "${userName}" دورتك "${courseTitle}" بـ ${rating || 5} من 5.`, '/#courses')
  }
  const admins = await getAdminIds()
  await sendToMany(admins, 'review', 'تقييم جديد لدورة',
    `قيّم المتدرب "${userName}" دورة "${courseTitle}" بـ ${rating || 5} من 5.`, '/#courses')
}

// === FORUM EVENTS ===

/** New forum topic created. Notify admins (and optionally course students). */
export async function notifyForumTopicCreated(userId: string, topicTitle: string, topicId?: string) {
  const userName = await getUserName(userId)
  const admins = await getAdminIds()
  await sendToMany(admins, 'forum', 'موضوع جديد في المنتدى',
    `نشر "${userName}" موضوعاً جديداً: "${topicTitle}".`, '/#forum')
  const link = topicId ? `/#forum?t=${topicId}` : '/#forum'
  await send(userId, 'forum', 'تم نشر موضوعك',
    `تم نشر موضوعك "${topicTitle}" بنجاح في المنتدى.`, link)
}

/** New reply on a forum topic. Notify the original poster + admins. */
export async function notifyForumReplyPosted(replierId: string, topicTitle: string, originalPosterId?: string | null, topicId?: string) {
  const replierName = await getUserName(replierId)
  const link = topicId ? `/#forum?t=${topicId}` : '/#forum'
  if (originalPosterId && originalPosterId !== replierId) {
    await send(originalPosterId, 'forum', 'رد جديد على موضوعك',
      `ردّ "${replierName}" على موضوعك "${topicTitle}".`, link)
  }
  const admins = await getAdminIds()
  await sendToMany(admins, 'forum', 'رد جديد في المنتدى',
    `ردّ "${replierName}" على موضوع "${topicTitle}".`, '/#forum')
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
  try {
    const { data: users } = await supabaseAdmin.from('users').select('id')
    const ids = (users || []).map((u: any) => u.id)
    await sendToMany(ids, 'blog', 'منشور جديد في المدونة',
      `منشور جديد: "${postTitle}". اقرأه الآن في مدونة الأكاديمية.`, `/blog/${slug}`)
  } catch {}
}

// === ROYAL v4.2 — RETAKE BUDGET & TRAINER FOLLOW EVENTS ===

/** A submit was VOIDED because the retake budget was already exhausted —
 *  even though the raw score may have passed, the verdict is final: the
 *  student never passed this course. */
export async function notifyExamVoidedByExhaustion(userId: string, courseId: string, rawScore: number) {
  const courseTitle = await getCourseTitle(courseId)
  await send(userId, 'exam', '⛔ انتهت محاولاتك في هذه الدورة',
    `حصلت على ${rawScore}% في اختبار دورة "${courseTitle}"، لكنك كنت قد استهلكت جميع محاولاتك المسموحة — لم تتوفّق في هذه الدورة أبداً، ولن يمكن إصدار شهادة لها.`, '/#exams')
}

/** A student followed a trainer. Notify the trainer. */
export async function notifyTrainerGainedFollower(trainerUserId: string, followerName: string) {
  await send(trainerUserId, 'follow', '👑 متدرب جديد يتابعك',
    `"${followerName}" أصبح يتابعك الآن — سيتلقى إشعاراً فورياً بكل دورة أو درس جديد تنشره.`, '/#overview')
}

/** A followed trainer published a new course. Notify ALL his followers. */
export async function notifyFollowersNewCourse(trainerProfileId: string, trainerName: string, courseTitle: string, courseSlug?: string) {
  try {
    const { data: follows } = await supabaseAdmin
      .from('trainer_follows').select('follower_id').eq('trainer_id', trainerProfileId)
    const ids = (follows || []).map((f: any) => f.follower_id)
    if (ids.length === 0) return
    await sendToMany(ids, 'follow', `🎓 المدرب ${trainerName} أضاف دورة جديدة`,
      `دورة "${courseTitle}" متاحة الآن — كن أول من يسجّل فيها!`, courseSlug ? `/courses/${courseSlug}` : '/#browse')
  } catch {}
}

/** A followed trainer published a new lesson. Notify ALL his followers. */
export async function notifyFollowersNewLesson(trainerProfileId: string, trainerName: string, courseTitle: string, lessonTitle: string) {
  try {
    const { data: follows } = await supabaseAdmin
      .from('trainer_follows').select('follower_id').eq('trainer_id', trainerProfileId)
    const ids = (follows || []).map((f: any) => f.follower_id)
    if (ids.length === 0) return
    await sendToMany(ids, 'follow', `📚 درس جديد من ${trainerName}`,
      `أضاف المدرب ${trainerName} درساً جديداً "${lessonTitle}" في دورة "${courseTitle}".`, '/#courses')
  } catch {}
}

// === TRAINER IDENTITY RESOLVERS (profile table vs account table) ===
// `courses.trainer_id` historically points EITHER at the public `trainers`
// profile id OR at the `users` account id (role=trainer). These helpers
// resolve one from the other so follows + notifications always land on the
// right rows.

/** Resolve the public trainer profile id (trainers.id) from either ref. */
export async function resolveTrainerProfileId(trainerRef: string | null | undefined): Promise<string | null> {
  if (!trainerRef) return null
  try {
    const { data: direct } = await supabaseAdmin.from('trainers').select('id, email').eq('id', trainerRef).maybeSingle()
    if (direct) return direct.id
    const { data: userRow } = await supabaseAdmin.from('users').select('id, email').eq('id', trainerRef).maybeSingle()
    if (userRow?.email) {
      const { data: profile } = await supabaseAdmin.from('trainers').select('id').eq('email', userRow.email).maybeSingle()
      if (profile) return profile.id
    }
  } catch {}
  return null
}

/** Resolve the trainer ACCOUNT id (users.id) from either ref — so
 *  notifications reach the trainer's bell + FCM push. */
export async function resolveTrainerUserId(trainerRef: string | null | undefined): Promise<string | null> {
  if (!trainerRef) return null
  try {
    const { data: userRow } = await supabaseAdmin.from('users').select('id').eq('id', trainerRef).maybeSingle()
    if (userRow) return userRow.id
    const { data: profile } = await supabaseAdmin.from('trainers').select('email').eq('id', trainerRef).maybeSingle()
    if (profile?.email) {
      const { data: byEmail } = await supabaseAdmin.from('users').select('id').eq('email', profile.email).maybeSingle()
      if (byEmail) return byEmail.id
    }
  } catch {}
  return null
}

// === ROYAL BROADCAST (الإشعار الجماعي الملكي) ===

/**
 * 👑 بث ملكي جماعي — يرسل إشعاراً مخصصاً لقائمة مستخدمين (طلاب دورة،
 *    الجميع…) عبر قناة الإشعارات الملكية الكاملة (DB + FCM + OneSignal).
 *    يُستخدم من عرش المدرب (رسالة لطلاب دورته) وقصر الإدارة (إشعار شامل).
 */
export async function sendRoyalBroadcast(
  userIds: string[],
  title: string,
  body: string,
  link?: string
): Promise<number> {
  if (!userIds.length) return 0
  const uniq = Array.from(new Set(userIds.filter(Boolean)))
  await sendToMany(uniq, 'broadcast', title, body, link || '/')
  return uniq.length
}

// === TRAINER EARNINGS (أرباح المدرب) ===

/** A trainer earned money because the admin approved a student payment. */
export async function notifyTrainerNewEarning(trainerUserId: string, amount: number, currency: string, courseTitle: string, percentage: number) {
  await send(trainerUserId, 'earning', '💰 أرباح جديدة في محفظتك',
    `تمت موافقة الإدارة على دفعة متدرب جديد في دورة "${courseTitle}" — أُضيفت إليك ${amount.toLocaleString('en-US')} ${currency} (${percentage}% من قيمة الاشتراك).`, '/#earnings')
}

/** The admin approved a withdrawal request — money sent + screenshot proof. */
export async function notifyWithdrawalApproved(trainerUserId: string, amount: number, currency: string, hasScreenshot: boolean) {
  await send(trainerUserId, 'withdrawal', '✅ تمت الموافقة على سحب أرباحك',
    `وافقت الإدارة على طلب سحبك بمبلغ ${amount.toLocaleString('en-US')} ${currency}${hasScreenshot ? ' وأرفقت لقطة شاشة لإثبات التحويل — تجدها في قسم «أرباحي»' : ''}.`, '/#earnings')
}

/** The admin rejected a withdrawal request. */
export async function notifyWithdrawalRejected(trainerUserId: string, amount: number, currency: string, reason?: string | null) {
  await send(trainerUserId, 'withdrawal', '❌ تم رفض طلب سحب الأرباح',
    `رُفض طلب سحبك بمبلغ ${amount.toLocaleString('en-US')} ${currency}${reason ? ` — السبب: ${reason}` : ''}. المبلغ عاد إلى رصيدك المتاح.`, '/#earnings')
}

/** Notify all admin accounts (used for withdrawal requests etc.). */
export async function notifyAdmins(type: string, title: string, body?: string, link?: string) {
  try {
    const ids = await getAdminIds()
    await sendToMany(ids, type, title, body, link)
  } catch {}
}

// =========================================================================
// ROYAL TRAINER PIPELINE — إشعارات منظومة المدربين الملكية
// =========================================================================

/** للإدارة: وصل طلب انضمام مدرب جديد (تسجيل ذاتي) — يفتح قصر الموافقات مباشرة. */
export async function notifyTrainerApplicationReceived(name: string, specialty?: string | null) {
  await notifyAdmins('trainer_application', '🎓 طلب انضمام مدرب جديد',
    `${name}${specialty ? ' — ' + specialty : ''} بانتظار موافقتكم الملكية`, '/#trainer-applications')
}

/** للمدرب: وافقت الإدارة مبدئياً + عرض نسبة الربح (يتطلب قبوله). */
export async function notifyTrainerApplicationApproved(trainerUserId: string, percentage: number, terms?: string | null) {
  await send(trainerUserId, 'trainer_agreement', '👑 وافقت الإدارة على طلبك الملكي!',
    `تهانينا! وافقت الإدارة مبدئياً على انضمامك، وتُعرض عليك نسبة أرباح ${percentage}% من دوراتك${terms ? ' — ' + terms : ''}. افتح لوحتك لقراءة الاتفاق الفاخر وقبوله.`, '/#overview')
}

/** للمدرب: رفض الطلب مع السبب. */
export async function notifyTrainerApplicationRejected(trainerUserId: string, reason?: string | null) {
  await send(trainerUserId, 'trainer_rejected', 'بخصوص طلب انضمامك إلى الأكاديمية',
    reason ? `لم تكتمل الموافقة على طلبك هذه المرة — ${reason}` : 'لم تكتمل الموافقة على طلبك هذه المرة. يمكنك التواصل مع الإدارة لمعرفة التفاصيل.', '/#overview')
}

/** للمدرب: الاعتماد النهائي — أصبح معتمداً ويظهر في مدربينا. */
export async function notifyTrainerCertified(trainerUserId: string, name: string) {
  await send(trainerUserId, 'trainer_certified', '🏅 أنت الآن مدرب معتمد ملكياً!',
    `أهلاً بك رسمياً ${name} — وُقّع الاتفاق، وأصبح اسمك يظهر في نخبة مدربي الأكاديمية، وحقوقك ولوحتك مفعّلة بالكامل.`, '/#overview')
}

/** للإدارة: المدرب رفض النسبة المعروضة (لإعادة التفاوض). */
export async function notifyTrainerAgreementDeclined(trainerName: string, note?: string | null) {
  await notifyAdmins('trainer_agreement', '⚖️ رفض مدرب نسبة الربح المعروضة',
    `${trainerName}${note ? ' — ملاحظته: ' + note : ''}. يمكنك تعديل العرض وإعادة تقديمه من طلبات المدربين.`, '/#trainer-applications')
}

/** للمدرب: عرض محدّث بنسبة جديدة بعد التفاوض. */
export async function notifyTrainerAgreementRevised(trainerUserId: string, percentage: number) {
  await send(trainerUserId, 'trainer_agreement', '📜 عرض اتفاق محدّث',
    `راجعت الإدارة العرض وحدّثت نسبة الأرباح إلى ${percentage}%. تفحّص الاتفاق الجديد في لوحتك ووقّعه.`, '/#overview')
}
