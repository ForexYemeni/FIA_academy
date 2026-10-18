# تقرير الفحص الشامل — منصة أكاديمية المستقبل الدولية (FIA Academy)

> **تاريخ الفحص:** 2026-10-18
> **النطاق:** جميع الحسابات (طالب / مدرب / مؤسس / إدارة) + APIs + قاعدة البيانات + الأمان
> **عدد المشاكل المُكتشفة:** 80+ مشكلة موزّعة على 4 مستويات خطورة
> **المنهجية:** قراءة فعلية لكل ملف في النطاق المُحدّد مع التحقق من أرقام الأسطر

---

## 🚨 ملخص تنفيذي

المنصة قابلة للعمل بصرياً لكنها تعاني من **فجوة أمان جذرية**: لا يوجد أي تحقق من JWT على الخادم، وسياسات RLS مفتوحة بالكامل (`USING (true) WITH CHECK (true)`)، وكلمات مرور المدرّبين/الفريق/الطلاب (المنشأة عبر لوحة الإدارة) مخزّنة كنص صريح. كل API يثق بقيمة `user_id` القادمة من جسم الطلب.

بجانب ذلك توجد عدة مشاكل صمت في تدفق البيانات:
- الشهادات تُجلب باسم الطالب (نص) لا بمعرّفه → تسرّب بيانات + فقدانها عند إعادة التسمية
- زر "ابدأ الاختبار" لا يوجد له `onClick` → كل منظومة الاختبارات غير قابلة للوصول
- حفظ الملف الشخصي للطالب لا يرسل PUT فعلي → التغييرات لا تُحفظ
- `getCourseTitle` غير مُستورد في مسار رفض الدفع → لا تصلك إشعارات الرفض
- `useHashTab` يلغي الـ hash قبل أن يقرأه `SharedForum` → روابط الإشعارات لا تفتح الموضوع
- زر "حذف جميع البيانات" يحسب `bcrypt === plaintext` → لا يعمل أبداً
- حفظ إعدادات الموقع يفشل 403 دائماً عند وجود توكن تيليجرام
- مسار `/api/admin/danger-zone` لقسم "team" يستهدف جدول غير موجود (`team_members`)

---

## 🔴 مشاكل CRITICAL (أمنية + فقدان بيانات)

### C1. لا يوجد أي تحقق من JWT على الخادم
**ملفات:** `src/middleware.ts` (no-op معترف به في تعليقاته) + كل `src/app/api/**/route.ts`

`verifyToken` و `extractToken` مُعرّفان في `src/lib/auth-server.ts` لكنهما **لا يُستوردان في أي route**. كل مسار يأخذ `user_id` من جسم الطلب ويعامله كالمستخدم المُصادَق عليه.

**التأثير العملي:** أي شخص يستطيع:
- `POST /api/payments {id, status:'مكتمل'}` → تأكيد دفعه هو
- `POST /api/certificates/issue {user_id, course_id}` → إصدار شهادة لنفسه
- `DELETE /api/chat {conversation_id}` → مسح محادثات الآخرين
- `POST /api/admin/danger-zone {section:'students'}` → مسح كل الطلاب
- `PUT /api/students {id: <self>, role: 'admin'}` → ترقية نفسه لأدمن

**الإصلاح المُقترح:**
1. أضف `requireUser(req)` helper يستخدم `extractToken` + `verifyToken` ويرجع 401 عند الفشل
2. أضف `requireRole('admin')` لنقاط الإدارة
3. طبّقها على كل POST/PUT/DELETE في الـ APIs
4. ارفض أي جسم طلب فيه `user_id` يختلف عن `token.sub`
5. هذا الإصلاح وحده يغلق أكثر من 12 مشكلة أخرى في القائمة

---

### C2. سياسات RLS كلها مفتوحة للعامة
**ملف:** `supabase/migrations/001_create_tables.sql:138-146` + 002:88-101 + 004:200-229 + 005:33-34 + 007:73-76 + 008:36-37 + 010:26-27,43-44,58-59

كل جدول يفعّل RLS ثم يفتحه مباشرة: `allow_all_*` policy مع `USING (true) WITH CHECK (true)`.

**التأثير:** المفتاح العام `NEXT_PUBLIC_SUPABASE_ANON_KEY` موجود في المتصفح. أي شخص يستطيع:
```
curl https://<project>.supabase.co/rest/v1/users?select=id,email,password \
  -H "apikey: <anon-key>"
```
ويرجع له كل كلمات المرور.

**الإصلاح:**
- احذف كل `allow_all_*` policies
- اكتب سياسات لكل جدول مبنية على `auth.uid()`
- للأعمدة الحساسة (مثل `users.password`): امنع القراءة تماماً (الخادم فقط يقرأها عبر service role)
- للجداول العامة (`faqs`, `site_settings` العامة): قراءة للجميع، كتابة للأدمن فقط

---

### C3. توكن تيليجرام مكشوف في 3 أماكن
**ملفات:**
- `supabase/migrations/001_create_tables.sql:121,150` — hardcoded في المايجريشن
- `src/app/api/site-settings/route.ts:73` — GET يرجعه للعميل
- `src/app/api/upload/image/route.ts:91`, `src/app/api/upload/avatar/route.ts:41`, `src/app/api/telegram-file/route.ts:92` — يرجع URL بصيغة `https://api.telegram.org/file/bot<TOKEN>/<path>`

**التأثير:** أي زائر يفتح Network tab يرى توكن البوت ويستخدمه لإرسال/حذف رسائل كأنه البوت.

**الإصلاح:**
1. **استبدل التوكن فوراً** عبر BotFather
2. احذف القيم الافتراضية من المايجريشن (استخدم NULL)
3. احذف `telegram_bot_token` من SELECT في GET site-settings
4. بدّل ملفات التيليجرام: إمّا proxy عبر الخادم، أو استخدم Supabase Storage بدلاً من تيليجرام لتخزين الملفات

---

### C4. كلمات مرور المدرّبين/الفريق/الطلاب مخزّنة كنص صريح
**ملفات:**
- `src/app/api/trainers/route.ts:181-214, 227` — `password: body.password` بدون هاش
- `src/app/api/team/route.ts:179-182, 242-245` — يخزّن `__TEAM_MEMBER__:<role>__:<plaintext>` 
- `src/app/api/students/route.ts:50, 69-85` — نفس المشكلة للطلاب
- `src/app/api/auth/login/route.ts:116-122` — للفريق: `isMatch = actualPassword === password` (مقارنة نصية)
- `src/app/api/auth/change-credentials/route.ts:73-83` — تغيير كلمة مرور الفريق يحفظها كنص صريح

مقارنةً بـ `/api/auth/register` الذي يستخدم `hashPassword()` بشكل صحيح.

**التأثير:** أي وصول للـ DB (انظر C2) يكشف كلمات مرور كل المدرّبين والفريق. مع إعادة استخدام كلمات المرور عبر مواقع، هذا اختراق شامل.

**الإصلاح:**
1. استورد `hashPassword` في كل routes أعلاه
2. للفريق: أضف عمود `team_role TEXT` في جدول trainers بدلاً من تخزين الدور في كلمة المرور
3. شفّ كلمات المرور بـ bcrypt
4. اكتب سكريبت migration لمرة واحدة يشفّر كل الصفوف الموجودة

---

### C5. ويبهوك الدفع بلا تحقق من توقيع
**ملف:** `src/app/api/payments/webhook/route.ts:7-72`

الـ POST يقبل `?payment_id=...&status=success` بدون أي تحقق (لا توقيع Stripe، لا HMAC Moyasar، لا shared secret).

**التأثير:** أي شخص يستطيع:
```
POST /api/payments/webhook?payment_id=<any-pending>&status=success
```
وتُعلّم الدفعة "مكتملة" + تُنشأ تسجيل + إشعارات بالنجاح — مجاناً.

**الإصلاح:**
- إمّا أضف هيدر `X-FIA-Webhook-Secret` مع `crypto.timingSafeEqual`
- أو تحقق من توقيع Stripe باستخدام `stripe.webhooks.constructEvent`
- أو تحقق من webhook IP range لمويزار
- أرجع 404 للـ GET callback (مفتوح لإعادة التوجيه + تفعيل مجاني)

---

### C6. `/api/exam-questions` يرجع الإجابات الصحيحة لأي شخص
**ملف:** `src/app/api/exam-questions/route.ts:4-25`

```ts
// Note: in a real exam scenario we would NOT return correct_answer.
// For the admin editor (this endpoint), we DO return it so they can edit.
return NextResponse.json(data || [])
```
لا auth، `select('*')` يشمل `correct_answer`.

**التأثير:** الطالب يستطيع `GET /api/exam-questions?course_id=X` قبل الاختبار ويعرف كل الإجابات.

**الإصلاح:**
-endpoint واحد للأدمن/المدرب يرجع كل الحقول (مع auth)
- endpoint ثانٍ للطالب يشطب `correct_answer` و `explanation`

---

### C7. `/api/admin/danger-zone` بدون auth + يستهدف جدول غير موجود
**ملفات:** `src/app/api/admin/danger-zone/route.ts:14-148` + `src/app/api/danger-zone/route.ts:52`

مشكلتان:
1. لا يوجد أي تحقق من role/identity
2. قسم `team` يستهدف جدول `team_members` الذي **لا يوجد أصلاً** — أعضاء الفريق يخزّنون في جدول `trainers` مع team marker. النتيجة: 0 صفوف محذوفة + toast يقول "تم الحذف" (كاذب)
3. `/api/danger-zone` يحسب `storedPassword !== password` (مقارنة نصية) بينما الباسوورد مخزّن كـ bcrypt hash ← يفشل دائماً ← المؤسس لا يستطيع تفعيل "حذف جميع البيانات" أبداً

**الإصلاح:**
- أضف `requireRole('admin')` على كلا المسارين
- بدّل `'team_members'` بـ `'trainers'` مع فلتر `password like '__TEAM_MEMBER__:%'`
- استبدل المقارنة النصية بـ `verifyPassword(password, storedPassword)`

---

### C8. `/api/notifications` POST = حقنة HTML + تصيّد
**ملف:** `src/app/api/notifications/route.ts:28-56, 108-130`

لا auth، يقبل `{ user_id, title, body, link }` من أي شخص، يُرسل OneSignal push وإيميل مع `body` داخل HTML بدون escaping.

**التأثير:** أي شخص يستطيع:
1. إرسال إشعار لأي مستخدم (مزعج)
2. تضمين HTML: `<a href="https://attacker.example/login?token=...">انقر هنا لتفعيل حسابك</a>`
3. يبدو كأنه إيميل رسمي من FIA

**الإصلاح:**
- تحقق من `user_id === JWT sub`
- HTML-escape الـ title و body قبل الإقحام في HTML
- قصر POST على الـ server-side callers فقط (لا يقبل من المتصفح)

---

### C9. `/api/auth/verify-password` = أوراكل لكلمات المرور
**ملف:** `src/app/api/auth/verify-password/route.ts:18-51`

لا auth، لا rate limit، يقبل `{ user_id, password }` ويرجع `{ valid: boolean }`.

**التأثير:** مهاجم لديه قاعدة بيانات مسرّبة يستطيع فحص كل كلمة مرور ضد كل user_id دون تسجيل دخول (لا تترك أثراً في سجلات الدخول).

**الإصلاح:**
- خذ `user_id` من JWT فقط، ارفض أي معرّف آخر
- أضف rate limiting (max 5 محاولات/10 دقائق/IP)
- استجب بزمن ثابت (constant-time)

---

### C10. `/api/certificates/issue` يصدر شهادة لأي طالب
**ملف:** `src/app/api/certificates/issue/route.ts:7-108`

لا auth، التحقق من idempotency مكسور (يقارن بـ `student_name = ''` دائماً)، والمعرّف يعتمد على `student_name + course_title` (نص) → "محمد" ثاني يحصل على شهادة "محمد" الأول.

**الإصلاح:**
- أضف `student_id UUID` + `course_id UUID` لجدول certificates
- استخدمهما للـ idempotency
- أضف auth: إمّا أدمن، أو `user_id === JWT sub` مع `passed=true` موثّق
- استخدم `crypto.randomBytes(4)` بدلاً من `Math.random()` لتوليد رقم الشهادة

---

### C11. إعدادات الموقع غير قابلة للحفظ عند وجود توكن تيليجرام
**ملف:** `src/app/api/site-settings/route.ts:97-131` + `src/components/fia/dashboards/admin.tsx:1805`

الخادم يرفض أي PUT يحتوي `telegram_bot_token` (حتى لو لم يتغير) بدون `user_id` + `password`. العميل AdminSite يرسل كل الإعدادات دفعة واحدة بدون هذين الحقلين.

**النتيجة:** بعد ضبط توكن تيليجرام لأول مرة، كل حفظ (حتى لتغيير رقم الهاتف) يفشل 403.

**الإصلاح:**
- بدّل المنطق: احصل على الإعدادات الحالية، قارن الـ Telegram fields، اطلب كلمة المرور فقط عند التغيير الفعلي
- أو أضف حوار تأكيد كلمة المرور في AdminSite قبل الحفظ عند تعديل حقل تيليجرام

---

### C12. `getCourseTitle` غير مُستورد → إشعارات رفض الدفع لا تصل
**ملف:** `src/app/api/payments/route.ts:102`

```ts
try {
  const courseTitle = await getCourseTitle(updated.course_id)  // ← ReferenceError
  // ... insert notification + sendPushNotification
} catch {}   // ← يبتلع الخطأ
```

`getCourseTitle` مُعرّفة كـ private helper في `lib/notifications.ts:56`، لكنها غير مُصدّرة (not exported) ولا مستوردة في هذا الملف.

**النتيجة:** عند رفض دفع طالب:
- لا يُرسل إشعار in-app
- لا يُرسل OneSignal push
- لا يصل إشعار تيليجرام
الطالب لا يعرف لماذا لم تُفعّل دورته. (بينما `notifyPaymentRejected` المُستوردة نفسها تعمل، لكن داخلها أيضاً تستخدم getCourseTitle بشكل غير مباشر.)

**الإصلاح:**
- صدّر `getCourseTitle` من `lib/notifications.ts`
- استوردها في `/api/payments/route.ts`

---

### C13. الشهادات تُجلب باسم الطالب → تسرّب + فقدان
**ملفات:** `src/components/fia/dashboards/student.tsx:2193-2207` + `src/components/fia/certificate-request.tsx:52-58`

```ts
fetch(`/api/certificates?student_name=${encodeURIComponent(user.name)}`)
```

جدول `certificates` لا يحتوي على `student_id` (تحقق من migration 001:58-66).

**التأثير:**
1. طالبان بنفس الاسم "محمد أحمد" يريان شهادات بعضهما
2. عند تغيير الاسم، تختفي كل الشهادات السابقة (لا تطابق نصي)

**الإصلاح:**
1. أضف migration يضيف عمود `student_id UUID` لجدول certificates + backfill من user_id عبر name match
2. عدّل `/api/certificates` GET ليجلب بـ `student_id` عندما يوفر
3. بدّل العميل ليمرر `user.id` بدلاً من `user.name`

---

### C14. روابط الإشعارات لـ forum topic محبوسة بـ useHashTab
**ملفات:** `src/lib/use-hash-tab.ts:38-50` + `src/components/fia/dashboards/shared-community.tsx:336-369`

عند النقر على إشعار "رد جديد على موضوعك" برابط `/#forum?t=<id>`:
1. `useHashTab` يقرأ hash، يستخرج `forum`، يستدعي `setActive('forum')`
2. فوراً يحذف الـ hash كاملاً: `history.replaceState(null, '', path + search)`
3. `SharedForum` يُركّب بعد ذلك — يجد hash فارغ ← يخرج مبكراً ← الموضوع لا يفتح

**الإصلاح:**
- الخيار (a): لا تحذف الجزء بعد `?` — احذف فقط الجزء التبويبي `forum` واترك `?t=<id>`
- الخيار (b): ارفع الحالة عبر custom event `fia:open-topic` مع `detail: { topicId }`، استمع له SharedForum
- الخيار (c): استخدم Zustand slice لكتابة الـ topic id قبل التنقل

---

## 🟠 مشاكل HIGH (ميزات مكسورة)

### H1. زر "ابدأ الاختبار" بدون `onClick` — الاختبارات غير قابلة للوصول
**ملف:** `src/components/fia/dashboards/student.tsx:1276-1279`

```tsx
<Button size="sm" className="bg-navy hover:bg-navy-light">
  ابدأ الاختبار
</Button>
```

لا يوجد handler. البنية التحتية كاملة (`/app/exam/[attemptId]/client.tsx` فيه anti-cheat، عدّاد، تصحيح) لكن لا أحد يستدعيه.

**بالإضافة:** كل منظومة الاختبارات مفكّكة:
- `ExamBuilder` (مدرب) يكتب الأسئلة كـ JSON في `lessons.content`
- `/app/exam/[attemptId]/page.tsx` يقرأ من جدول `exam_questions` (مختلف!)
- `/api/exam-attempts` PUT يصحّح ضد جدول `exam_questions`
- لا يوجد code path ينسخ JSON من ExamBuilder إلى `exam_questions`
- `student-course-viewer.tsx` لا يحتوي على زر "Start Exam" (grep يرجع 0 مطابقات)

**الإصلاح:**
- حدد مصدر واحد للحقيقة: إمّا استخدم `exam_questions` table، أو اقرأ JSON من `lessons.content` مباشرة
- أضف زر "ابدأ الاختبار" في `student-course-viewer.tsx` يستدعي `POST /api/exam-attempts`
- علّق زر `ابدأ الاختبار` في `student.tsx:1276` ليستدعي `router.push('/exam/' + attemptId)`

---

### H2. حفظ الملف الشخصي للطالب = stub لا يفعل شيئاً
**ملف:** `src/components/fia/dashboards/student.tsx:1610-1625`

```ts
const save = async () => {
  // Update locally — in real app, would call /api/students PUT
  updateUser({ name: profile.name, phone: profile.phone, ... })
  toast.success('تم تحديث الملف الشخصي')  // ← كاذب
}
```

الـ endpoint موجود ويعمل (`/api/students` PUT)، لكن العميل لا يستدعيه أبداً.

**التأثير:** الطالب يغيّر اسمه → يرى التحديث محلياً → عند إعادة الدخول يرجع الاسم القديم. كما أن رسائله في الدردشة تحمل اسمه القديم (لأن `resolveProfile` يقرأ من DB).

**الإصلاح:**
```ts
const save = async () => {
  setLoading(true)
  const res = await fetch('/api/students', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: user.id, name, phone, title, bio: joinBio(...) })
  })
  if (!res.ok) { toast.error('فشل الحفظ'); return }
  updateUser({ ... })
  toast.success('تم تحديث الملف الشخصي')
}
```

---

### H3. رفض الدفع يحبس الطالب في حالة "بانتظار التأكيد"
**ملف:** `src/components/fia/dashboards/student.tsx:1310-1320, 1316-1330`

```ts
// handleCardClick
if (enr.payment_status === 'pending') {
  toast.info('بانتظار تأكيد الإدارة للدفع')  // ← كاذب عند الرفض
  return  // ← يمنع إعادة الاشتراك
}
```

الخادم يدعم إعادة الاشتراك (`/api/enrollments` POST يحذف الصف المرفوض قبل إدراج جديد)، لكن العميل يمنع المستخدم من الوصول لهذا المسار.

**الإصلاح:**
- بدّل المنطق: تحقق من `raw payment.status === 'ملغي'` (الأصلية)، افتح PaymentDialog عند الرفض بدلاً من toast-blocking

---

### H4. `activeConv` غير مُعلن في chat-widget → ReferenceError
**ملف:** `src/components/fia/chat-widget.tsx:149-150`

```ts
msg.sender = recipient
  ? { ... }
  : (activeConv?.other  // ← activeConv لا يوجد
    ? { ... }
    : null)
```

داخل Supabase Realtime INSERT callback. عند `recipient === null` (race condition بعد `goBack()`)، يُرمى `ReferenceError: activeConv is not defined` → يقتل الـ subscription بصمت.

**الإصلاح:**
```ts
const conv = conversations.find((c) => c.id === activeConvId)
... : (conv?.other
  ? { user_id: conv.other.user_id || conv.other_id, name: conv.other.name, ... }
  : null)
```
أضف `conversations` إلى deps array.

---

### H5. AdminCourses لا يوجد UI لتعيين مدرب
**ملف:** `src/components/fia/dashboards/admin.tsx:480` + `src/components/fia/course-dialog.tsx:249`

```tsx
<ProCourseDialog trainerId={undefined} ... />
```
دائماً `undefined`. الـ body لا يحتوي على `trainer_id` → الدورة تُنشأ بدون مدرب. لا يوجد selector للمدرب في الـ dialog.

**الإصلاح:**
- أضف `<select>` في `course-dialog.tsx` يجلب قائمة المدربين من `/api/trainers`
- اربطه بـ `form.trainer_id`
- مرّره في body

---

### H6. AdminStudents: حذف بدون cascade + لا يتحقق من `res.ok`
**ملفات:** `src/app/api/students/route.ts:87-96` + `src/components/fia/dashboards/admin.tsx:527-538`

الخادم: `delete from users where id = X` — لا cascade لـ payments, certificates, reviews, forum, lesson_progress, chat, notifications.

العميل: لا يفحص `res.ok` — حتى لو فشل الخادم بـ 500، يُظهر `toast.success('تم الحذف')` ويزيل الطالب من القائمة محلياً. عدم تطابق UI/DB.

**الإصلاح:**
- أضف cascade حذف ككل الجداول المرتبطة (كما يفعل `/api/courses` DELETE)
- تحقق من `res.ok` وأعد التحميل عند النجاح

---

### H7. AdminTrainers `isTeamMember` دائماً false
**ملف:** `src/components/fia/dashboards/admin.tsx:1393`

```ts
const isTeamMember = t.password && t.password.startsWith('__TEAM_MEMBER__')
```
لكن `/api/trainers` GET (line 163-170) يشطب `password` قبل الإرجاع، ويفلتر أعضاء الفريق تماماً. النتيجة:
- `t.password` دائماً `undefined`
- أعضاء الفريق لا يظهرون في القائمة أصلاً
- الـ "👑 عضو فريق" badge (line 1404) لا يظهر أبداً
- الـ disabled-delete state (line 1414) لا يعمل

**الإصلاح:**
- اجلب أعضاء الفريق عبر `/api/team` endpoint منفصل
- ادمجهم مع قائمة المدربين في الواجهة

---

### H8. AdminReports يمزج العملات (USD + SAR + ر.ي) تحت وسم "ر.ي"
**ملف:** `src/components/fia/dashboards/admin.tsx:2638-2671`

```ts
const totalRevenue = data.payments.reduce((sum, p) => sum + (p.amount || 0), 0)
// ...
{ label: 'إجمالي الإيرادات', value: `${totalRevenue.toLocaleString()} ر.ي` }
```

كل المبالغ تُجمّع بغض النظر عن العملة، ثم تُوسم بـ "ر.ي". $500 + 200 ر.ي = "700 ر.ي".

**الإصلاح:**
- استخدم منطق AdminOverview الموجود (يجمّع حسب العملة)
- إمّا أعرض بطاقة لكل عملة، أو حوّل لعملة أساسية بجدول أسعار صرف

---

### H9. AdminOverview يفشل صمتاً عند فشل أي fetch
**ملف:** `src/components/fia/dashboards/admin.tsx:245-307`

```ts
Promise.all([
  fetch('/api/courses').then(r => r.json()),
  fetch('/api/trainers').then(r => r.json()),
  // ... 5 endpoints
]).then(...).catch(() => {})  // يبتلع كل شيء
```

`Promise.all` يرفض عند فشل أي واحد → كل الإحصائيات تبقى 0 → لوحة فارغة. `.catch(() => {})` يبتلع الخطأ → الإدارة لا تعرف لماذا.

**الإصلاح:**
- استخدم `Promise.allSettled` وعالج كل نتيجة على حدة
- أعرض banner لكل مصدر فشل

---

### H10. AdminExams = placeholder
**ملف:** `src/components/fia/dashboards/admin.tsx:500-510`

المحتوى hardcoded "لا توجد اختبارات" + زر "اختبار جديد" بدون onClick. لا state، لا API، لا list.

**الإصلاح:**
- إمّا احذف التبويب، أو نفّذ exam CRUD مدعوم بجدول `exams`

---

### H11. AdminLogs = واجهة مزيفة
**ملف:** `src/components/fia/dashboards/admin.tsx:2787-2865`

لا يوجد جدول audit_logs. الـ "سجل العمليات" مُركّب من فحص `payments.status` و `enrollments.status`. لا توجد سجلات فعلية لمن أنشأ/حذف/عدّل ماذا.

**الإصلاح:**
- أنشئ جدول `audit_logs` بـ `{ actor_user_id, action, target_table, target_id, payload, at }`
- أدخل صفاً في كل admin route
- اعرض السجلات الفعلية في AdminLogs

---

### H12. `/api/chat` بدون auth على الإطلاق
**ملف:** `src/app/api/chat/route.ts` (كامل)

- GET `?user_id=X` يرجع كل محادثات أي مستخدم
- POST يقبل `sender_id` من الجسم → يستطيع انتحال أي شخص
- PUT يمسح رسائل أي شخص "كمقروءة"
- DELETE يحذف أي محادثة بـ id

**الإصلاح:**
- تحقق من JWT
- في GET: تأكد أن `userId` هو `token.sub`
- في POST: `sender_id === token.sub`
- في DELETE: تحقق أن المستخدم أحد المشاركَين قبل الحذف

---

### H13. `/api/exam-attempts` — تسرّب + pass score hardcoded
**ملف:** `src/app/api/exam-attempts/route.ts`

```ts
// GET line 9: anyone reads any user's attempts
// PUT line 98: const passed = score >= 60
```

`course.pass_score` قابل للتعديل من المدرب لكنه لا يُستخدم في التصحيح. دورة بـ `pass_score=80` تنجح طالباً بدرجة 65%.

**الإصلاح:**
- تحقق أن `user_id === JWT sub` في GET/PUT
- اجلب `course.pass_score` واستخدمه في التصحيح
- تحقق من ملكية الـ attempt في DELETE

---

### H14. Founder's "حذف القسم" بدون password re-verification على الخادم
**ملفات:** `src/components/fia/dashboards/admin.tsx:2487-2510` + `src/app/api/admin/danger-zone/route.ts`

العميل يستخدم `PasswordConfirmDialog` محلياً، لكن الـ API call يرسل `{ section, user_id }` فقط — لا كلمة مرور. أي استدعاء مباشر للـ API يتجاوز التحقيق.

**الإصلاح:**
- أرسل كلمة المرور المُتحقّق منها مع الطلب
- أعد التحقق على الخادم

---

### H15. AdminAccount يكتب كلمة المرور الجديدة كنص صريح في localStorage
**ملف:** `src/components/fia/dashboards/admin.tsx:2080-2085`

```ts
updateUser({
  email: newEmail || user.email,
  password: newPassword || user.password,  // ← plaintext new password
})
```

Zustand persist إلى localStorage يخزّن `user.password` كنص صريح عبر الجلسات حتى تسجيل الخروج.

**الإصلاح:**
- لا تخزّن `password` في client store أصلاً (اجعلها دائماً `''`)
- استخدم الـ API response لتحديث auth store

---

### H16. AdminForum يستخدم `window.__fia_auth_user` (لا يُعين أبداً) + يقرأ localStorage مباشرة
**ملف:** `src/components/fia/dashboards/admin-extended.tsx:855-868`

```ts
const adminUser = (typeof window !== 'undefined') ? (window as any).__fia_auth_user : null
// ↑ __fia_auth_user لا يُعين في أي مكان — دائماً null
const getAdminUser = () => {
  try {
    const stored = localStorage.getItem('fia-auth')
    if (stored) { ... return parsed?.state?.user || null }
  } catch {}
  return null
}
```

`adminUser` dead code. `currentUser` لا يتفاعل مع تغييرات auth-state (تسجيل خروج في تبويب آخر لا يحدث هذا التبويب).

**الإصلاح:**
- استخدم `useAuth((s) => s.user)` مباشرة
- احذف فرع `window.__fia_auth_user` الميت

---

### H17. TrainerStudents لا يحتوي مراجعة تقدم الطالب
**ملف:** `src/components/fia/dashboards/trainer.tsx:632-748`

التبويب يعرض سجلات التسجيل (عنوان الدورة، عدد الدروس، حالة الدفع) لكن لا يعرض:
- نسبة إكمال كل درس (الحقل `progress` موجود في enrollments + جداول `lesson_progress` + `course_progress` + API `/api/progress` لكن لا تُستدعى)
- درجات الاختبارات (لا fetch لـ `/api/exam-attempts?user_id=...&course_id=...`)
- آخر درس وُصول + وقت الدراسة

المدرب لا يعرف كيف يتقدم طالبه فعلياً.

**الإصلاح:**
- أضف زر "عرض التقدم" لكل طالب يستدعي `/api/progress?user_id=...&course_id=...` + `/api/exam-attempts?user_id=...&course_id=...`
- اعرض نسبة كل درس + درجة آخر محاولة

---

### H18. TrainerEarnings مفقود تماماً
**ملف:** `src/components/fia/dashboards/trainer.tsx:27-39`

لا يوجد تبويب earnings/payouts. الـ NAV يحوي: overview, courses, students, exams, forum, blog, faqs, affiliate, profile, notifications, settings. لا يوجد:
- عمود `trainer_cut` على trainers
- جدول `payouts`
- route `/api/payouts`

**الإصلاح:**
- أنشئ تبويب "الأرباح" يجمع `payments.amount_paid` للتسجيلات في دورات المدرب
- طبّق نسبة `trainer_cut` قابلة للتهيئة (في trainers table أو site_settings)
- أعرض pending/paid payouts

---

### H19. `GET /api/trainers` و `GET /api/students` يكشفان PII للعامة
**ملفات:** `src/app/api/trainers/route.ts:154-179` (يُرجع name, email, phone لكل مدرب) + `src/app/api/students/route.ts:4-42` (يُرجع كل الطلاب)

`/api/trainers` بدون auth يرجع `select('*')` لكل المدربين. `/api/students?role=student` يرجع كل الطلاب. المدرب يجلب الكل ويُرشّح client-side.

**الإصلاح:**
- للـ unauthenticated callers: أرجع الحقول العامة فقط (name, title, specialization, bio, avatar)
- قيّد email/phone للأدمن فقط
- أضف `?trainer_id=` filter لـ `/api/students` يحصل فقط على طلاب هذا المدرب

---

### H20. `loadMessages` في chat-widget يجلب كل الرسائل بدون pagination
**ملفات:** `src/components/fia/chat-widget.tsx:108-118` + `src/app/api/chat/route.ts:13-17`

```ts
// API
.from('chat_messages').select('*').eq('conversation_id', conversationId)
.order('created_at', { ascending: true })  // لا .limit() أو .range()
```

لمحادثة طويلة، يرجع آلاف الرسائل مع enrichment → يجمّد المتصفح.

**الإصلاح:**
- استخدم `.range(0, 49)` على الخادم
- cursor-based pagination (`?before=<msg_id>`) على العميل
- اعرض في صفحات

---

### H21. chat-widget badge يعرض عدد المحادثات الكلي، لا الرسائل غير المقروءة
**ملف:** `src/components/fia/chat-widget.tsx:208-212`

```tsx
{!open && conversations.length > 0 && (
  <span ...>{conversations.length > 9 ? '9+' : conversations.length}</span>
)}
```

يعرض "3" لـ "3 محادثات موجودة" بدلاً من "3 رسائل جديدة".

**الإصلاح:**
- اجعل `/api/chat?user_id=...` يرجع `unread_count` لكل محادثة
- اجمع واعرض الإجمالي

---

## 🟡 مشاكل MEDIUM (حالات حدية + UX)

| # | العنوان | الملف | الحل المختصر |
|---|---|---|---|
| M1 | Forum view counter يزيد مع كل GET (بما فيه الكاتب) | `/api/forum:11-22` | جدول `forum_topic_views` بـ (topic_id, user_id) |
| M2 | NotificationsBell polling كل 15s حتى والتبويب مخفي | `notifications-bell.tsx:351-356` | أوقف عند `document.hidden` |
| M3 | `deleteAllNotifications` يطلق N DELETE متتالية | `notifications-bell.tsx:427-440` | وسّع DELETE endpoint لـ `{user_id}` bulk |
| M4 | Optimistic message يبقى عند `!targetId` return | `chat-widget.tsx:165-183` | أضف `setMessages(filter)` قبل الـ return |
| M5 | `Overview` "دورات مكتملة" دائماً 0 (يفلتر `status==='completed'` لكن DB يخزّن `'مكتمل'` بالعربية) | `student.tsx:230` | فلتر بـ `e.payment_status === 'completed'` |
| M6 | NotificationsBell يعيد ضبط mute على mount (يفقد التفضيل) | `notifications-bell.tsx:88-99` | احترم localStorage |
| M7 | AdminPayments يستخدم `window.prompt` لسبب الرفض | `admin.tsx:858, 939` | استبدل بـ Dialog مخصّص |
| M8 | AdminCoupons لا يعرض `course_id` (كوبون لكل دورة) | `admin-extended.tsx:105-176` | أضف select للدورة |
| M9 | AdminFounder: تبويب "الفريق القيادي" لا يصل لـ role='team' | `admin.tsx:1787-1791` | أضف تبويب ثالث |
| M10 | AdminSite يرسل كل الإعدادات دفعة واحدة | `admin.tsx:1802-1813` | تابع dirty state لكل تبويب |
| M11 | `c.price.toLocaleString()` يرمي TypeError لو price=null | `admin.tsx:466` | استخدم `(c.price ?? 0).toLocaleString()` |
| M12 | `/api/upload/image` fallback يرجع data URI (<2MB) → تنفّخ DB | `upload/image:107-134` | استخدم Supabase Storage بدلاً من data URI |
| M13 | toggleStatus لا يفحص `res.ok` (partners/licenses/coupons/affiliates) | متعدد | أضف `if (!res.ok) toast.error(...)` |
| M14 | `reactionCount` updates غير atomic (read-modify-write race) | `forum/react:52-66`, `blog/react:44-50` | استخدم SQL RPC `bump_count()` |
| M15 | `coupon used_count` increment غير atomic | `payments/create-intent:50-54` | `UPDATE ... SET used_count = used_count + 1 WHERE ... RETURNING` |
| M16 | `forum/react` و `blog/react` يقبلان `user_id` من body (تزييف إعجابات) | كل منهما | استخرج من JWT |
| M17 | `forum-bans` POST يقبل `banned_by_user_id` من body (IDOR) | `forum-bans:34-103` | خذ من JWT |
| M18 | `verifyPassword` يرجع `valid:true` للنص الصريح (fallback قديم) | `auth-server.ts:33-42` | هاجِر الـ plaintext للـ bcrypt ثم احذف fallback |
| M19 | JWT_SECRET له fallback غير آمن | `auth-server.ts:4` | ارفض الإقلاع دون JWT_SECRET |
| M20 | JWT في localStorage (XSS-vulnerable) | `auth-store.ts:14-29` | انقل لـ httpOnly cookie |
| M21 | لا CSP / X-Frame-Options / X-Content-Type-Options | `next.config.ts` | أضف `headers()` |
| M22 | `reactStrictMode: false` + `ignoreBuildErrors: true` | `next.config.ts:7-8` | فعّلهم |
| M23 | Service worker يقبل `postMessage` من أي origin | `public/sw.js:135-156` | تحقق من `event.origin` |
| M24 | SW `notificationclick` يوجّه لروابط مهاجم | `public/sw.js:115-131` | قصر الروابط على paths تبدأ بـ `/` |
| M25 | `notifyForumReplyPosted` يُرسل للممنوع من المنتدى | `notifications.ts:236-246` | تحقق من forum_bans قبل الإرسال |
| M26 | `/api/contact` POST = spam vector (لا rate limit) | `contact/route.ts:19-46` | أضف rate limit per IP |
| M27 | لا rate limit على login/register | auth routes | أضف per-IP + per-email |
| M28 | `affiliate-track` يثق بـ X-Forwarded-For | `affiliate-track:6-52` | تحقق من proxy IP |
| M29 | `affiliate_dashboard` يحدد `commission_percent: 10` + `status: 'نشط'` client-side | `affiliate-dashboard.tsx:68-70` | فروض من الخادم |
| M30 | روابط الإحالة hardcoded لـ `fiaacademy.vercel.app` |多处 | استخدم `window.location.origin` |
| M31 | `deriveRoleBadge` في shell.tsx يحتوي فرع legacy ميت (يقارن `user.password`) | `shell.tsx:71-85` | احذف الفرع الميت |
| M32 | `isTeamMember` في AdminTrainers دائماً false (شطب password من API) | `admin.tsx:1393` | اجلب team عبر endpoint منفصل |
| M33 | AdminForum يحذف topic بدون ConfirmDialog | `admin-extended.tsx:1086-1090` | استخدم ConfirmDialog |
| M34 | `/api/forum-topics` DELETE لا ي cascade-delete `forum_posts` | `forum-topics:161-170` | أضف cascade |
| M35 | `M14/M15`: Forum view counter يتضخم + لا ديبلكاشن |
| M36 | `Overview` "ساعات التعلّم" hardcoded = 24 | `student.tsx:233` | احسب من `duration_hours × progress` أو احذف |
| M37 | `requestCertificate` في MyCourses = dead code (الزر مُعلّق) | `student.tsx:327-352` | احذف |
| M38 | `Certificates` function في student.tsx = dead code (هناك `StudentCertificates`) | `student.tsx:1312-1413` | احذف |
| M39 | `TrainerSettings` = dead code (يستخدم `TrainerAccountSettings`) | `trainer.tsx:1347-1355` | احذف |
| M40 | CourseDialog محلي في trainer.tsx = dead code (يستورد ProCourseDialog) | `trainer.tsx:392-630` | احذف |
| M41 | SET_SQL كبير في course-content-manager.tsx = dead code + يكشف schema | `course-content-manager.tsx:58-136` | احذف من bundle |
| M42 | `TrainerAccountSettings` يكتب كلمة مرور جديدة plaintext في auth-store | `trainer.tsx:1053-1056` | لا تُحدّث password في client store |
| M43 | `loadMessages` يعرض history بدون pagination |
| M44 | AdminTrainers delete cascade مفقود (courses بـ trainer_id معلّق) | `trainers:243-252` | تحقق من courses قبل الحذف |
| M45 | re-subscribe-after-rejection لا يفرغ coupon_usages → الكوبون محبوس | `enrollments:138-156` | احذف coupon_usages + decrement used_count |
| M46 | `affiliate_clicks` RLS مفتوح → IPs زوار مكشوفة | `migration 007:53-76` | أغلق RLS |
| M47 | `notifyBlogPublished` يرسل لكل المستخدمين (N API calls) | `notifications.ts:269-278` | استخدم `broadcastPushNotification` (one API call) |
| M48 | `notifyMany` لا يخصّص مكرّر عبر الأحداث → المؤسس (admin + trainer) يحصل على إشعارين | `notifications.ts:37-40` | اجمع المستلمين per-event ثم خصّص |

---

## 🟢 مشاكل LOW (تحسينات)

| # | العنوان | الملف | الحل |
|---|---|---|---|
| L1 | `/api/route.ts` = "Hello, world!" stub | احذف | |
| L2 | `next.config.ts:7-8` reactStrictMode=false + ignoreBuildErrors=true | فعّلهم | |
| L3 | `affiliate-dashboard.tsx` يكتب `commission_percent` + `status` client-side | فروض من الخادم | |
| L4 | `student.tsx` 2315 سطر = ملف ضخم | قسّم لملفات صغيرة | |
| L5 | `testSoundOnly` يستخدم dynamic `import('@/lib/sounds')` رغم وجود import ثابت | استخدم الـ import العلوي | |
| L6 | Results tab = حالة فارغة دائمة (لا backend) | اخفِ التبويب أو نفّذه | |
| L7 | `AdminReviews` read-only (تصميم مقصود) | وثّق القرار أو أضف moderation | |
| L8 | `AdminContact.updateStatus` بلا toast.success | أضف toast | |
| L9 | `AdminReports` يستخدم `e.id \|\| i` كمفتاح React | استخدم id فقط | |
| L10 | `en-US` locale لـ toLocaleString في UI عربي | مقبول | |
| L11 | `window.open()` للـ PDF قد يحجبه popup blocker | اعرض رابطاً | |
| L12 | TITLES + SPECIALIZATIONS hardcoded في AdminTrainers | انقلها لـ lookup table | |
| L13 | `deriveRoleBadge` في shell يحتوي فرع password ميت | احذفه | |
| L14 | `slug` generation يضيف timestamp دائماً → غير قابل للقراءة | مقبول لكن دون تحسين SEO | |
| L15 | Caddyfile على `:81` بدون TLS | أضف HTTPS | |

---

## 🎯 خطة الإصلاح المُقترحة (بأولوية تنفيذية)

### المرحلة 1 — جذور الأمان (يجب فعلها أولاً)
1. **C1**: أضف `requireUser()` + `requireRole()` helpers باستخدام `verifyToken`/`extractToken`. طبّقها على كل POST/PUT/DELETE. **هذا الإصلاح وحده يغلق 12+ مشكلة أخرى.**
2. **C2**: احذف كل `allow_all_*` policies. اكتب سياسات حقيقية لكل جدول. **بدون هذا، الإصلاحات الأخرى مجرد ديكور.**
3. **C3 + C4**: استبدل توكن تيليجرام المسروق، احذف hardcoded من migration 001، احذفه من `/api/site-settings` GET، أوقف إرجاع URLs بـ token من upload/telegram-file.
4. **C5**: أضف signature verification على `/api/payments/webhook`.
5. **C6**: قسم `/api/exam-questions` لـ admin/student endpoints، اشطب correct_answer من student.
6. **C7**: أضف `requireRole('admin')` على danger-zone + بدّل `team_members` بـ `trainers` + استخدم `verifyPassword` بدلاً من `===`.
7. **C8**: HTML-escape title/body في notifications POST، قصر على server callers.
8. **C9**: أضف auth على certificates/issue + استخدم `(student_id, course_id)` للـ idempotency + استخدم `crypto.randomBytes`.
9. **C10**: أضف admin JWT على danger-zone.
10. **C11**: هاش كل كلمات المرور في admin-create paths + هاجِر plaintext قديم + احذف fallback في `verifyPassword`.
11. **C12**: قصر verify-password على `token.sub` + rate limit.

### المرحلة 2 — الميزات المكسورة (تؤثر على المستخدمين يومياً)
1. **C12 (chat)**: صلّح `getCourseTitle` import في `/api/payments` (إشعارات الرفض).
2. **C13 (cert)**: أضف `student_id` لجدول certificates + استخدمه.
3. **C14 (forum)**: أصلح useHashTab ليحافظ على `?t=<id>` جزء.
4. **H1**: أصلح pipeline الاختبارات كامل (زر + API + ربط ExamBuilder بـ exam_questions table).
5. **H2**: أضف `fetch('/api/students', ...)` لحفظ الملف الشخصي للطالب.
6. **H3**: اسمح بإعادة اشتراك بعد رفض الدفع.
7. **H4**: صلّح `activeConv` ReferenceError في chat-widget.
8. **H5**: أضف trainer selector في CourseDialog.
9. **H6**: أضف cascade delete للطالب + تحقق `res.ok`.
10. **H7**: أظهر أعضاء الفريق في AdminTrainers (اجلبهم من `/api/team`).
11. **H8**: اعرض الإيرادات حسب العملة في AdminReports.
12. **H9**: استخدم `Promise.allSettled` في AdminOverview.
13. **H11**: أنشئ `audit_logs` table + أدخل سجل في كل admin route.
14. **H14**: أرسل password مع طلب danger-zone للتحقق الخادمي.
15. **H15**: لا تخزّن password في client store.
16. **H16**: استخدم `useAuth` في AdminForum بدلاً من `window.__fia_auth_user`.
17. **H17**: أضف زر "عرض التقدم" لـ TrainerStudents.
18. **H18**: أنشئ تبويب "الأرباح" للمدرب.
19. **H19**: قيّد PII في `/api/trainers` و `/api/students`.
20. **H20**: أضف pagination لـ chat messages.

### المرحلة 3 — تحسينات UX + cleanup
- M1-M48 حسب الأولوية
- احذف dead code (L4-L8, L13)
- فعّل `reactStrictMode` + `ignoreBuildErrors: false` (L2)
- أضف security headers (M21)
- نقل JWT لـ httpOnly cookie (M20)
- SW origin check (M23, M24)

---

## 📊 ملخص إحصائي

| الشدة | العدد | أبرز المشاكل |
|---|---|---|
| 🔴 CRITICAL | 14 | لا auth، RLS مفتوح، كلمات مرور plaintext، تيليجرام مكشوف، webhook بدون تحقق، إشعارات الرفض لا تصل، الشهادات بالاسم |
| 🟠 HIGH | 21 | زر الاختبار ميت، حفظ الملف stub، رفض الدفع يحبس، `activeConv` غير مُعلن، لا UI لتعيين مدرب، حذف بلا cascade، عملات ممزوجة، chat بلا auth، audit logs مزيفة، لا أرباح للمدرب، PII مكشوفة، لا pagination |
| 🟡 MEDIUM | 48 | دوران polling، N DELETEs، race conditions في reactions، UI بلا res.ok، CSP مفقود، SW بلا origin check، dead code متعدد |
| 🟢 LOW | 15 | stubs، hardcoded constants، تحسينات SEO |

**أهم 3 إصلاحات إذا أردت البدء بأقل جهد وأكبر أثر:**
1. **C1 + C2** (auth + RLS) — يغلق 60% من المشاكل دفعة واحدة
2. **H1 + H2** (الاختبارات + حفظ الملف) — يُعيد الميزات الأساسية للطالب
3. **C12 + C13 + C14** (إشعارات الرفض + الشهادات + forum deep-link) — يُصلح تدفق البيانات الصامت

---

## ⚠️ ملاحظات مهمة

1. **Migration 010** الذي يجب تشغيله على Supabase — تحقّقنا منه، SQL صحيح وآمن لـ re-run. لكنه يرث نفس نمط `allow_all_*` policies (C2).
2. **الإصلاحات الأخيرة** (chat founder ID alias، blog client-side error، founder badge) تعمل بشكل صحيح حسب الفحص.
3. **`ignoreBuildErrors: true`** في `next.config.ts` يعني أن أخطاء TypeScript تُشحَن للإنتاج بصمت — هذا سبب وجود bugs مثل `student_name: ''` placeholder.
4. **JWT_SECRET** غير موجود في `.env.example` — أي نشر جديد سيستخدم fallback غير آمن.

---

**تم إعداد هذا التقرير بناءً على قراءة فعلية لكل ملف في النطاق. لم يُنفّذ أي تعديل كما طلبت.**
