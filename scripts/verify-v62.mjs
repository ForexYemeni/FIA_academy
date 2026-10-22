// 👑 تحقق إنتاجي v6.2 — ست ترقيات منظومة المدربين (بمدرب اختباري مؤقت يُحذف بعدها)
// (1) المنتدى مغلق + المدونة للقراءة فقط قبل الاعتماد (2) تبويب المتفق معهم
// (3) قفل الاتفاق النهائي بعد موافقة الطرفين (4) طرق السحب: تعديل + كتالوج 72
// (5) تسجيل مع دخول تلقائي + صورة (6) اللغة الاحترافية
import pg from 'pg'
import jwt from 'jsonwebtoken'
import { randomUUID } from 'crypto'

const DB = 'postgresql://postgres.tzquudmfazysjogorrxz:m773057153M@aws-1-eu-central-1.pooler.supabase.com:5432/postgres'
const BASE = 'https://fiaacademy.vercel.app'
const pool = new pg.Pool({ connectionString: DB, ssl: { rejectUnauthorized: false } })
let PASS = 0, FAIL = 0
const ok = (name, cond, extra = '') => { if (cond) { PASS++; console.log(`✅ ${name}${extra ? ' — ' + extra : ''}`) } else { FAIL++; console.log(`❌ ${name}${extra ? ' — ' + extra : ''}`) } }

const { rows: sec } = await pool.query(`SELECT value FROM app_secrets WHERE key='jwt_secret'`)
const secret = sec[0]?.value
const { rows: admins } = await pool.query(`SELECT id, email FROM users WHERE role='admin' ORDER BY created_at LIMIT 1`)
const adminId = admins[0]?.id

// 0. انتظار النشر — بوابة جديدة: GET applications بدون توكن لا يكفي، نستخدم وجود مفتاح certified عبر توكن إداري
console.log('— انتظار نشر Vercel —')
let aToken = null
let ready = false
for (let i = 0; i < 15 && !ready; i++) {
  await new Promise(r => setTimeout(r, 20000))
  try {
    const h = await fetch(BASE + '/', { cache: 'no-store' })
    if (!h.ok) { console.log(`محاولة ${i + 1}: رئيسية ${h.status}`); continue }
    aToken = jwt.sign({ sub: adminId, role: 'admin', email: admins[0]?.email }, secret, { expiresIn: '15m' })
    const probe = await fetch(BASE + '/api/trainers/applications', { headers: { Authorization: `Bearer ${aToken}` } })
    if (probe.ok) {
      const d = await probe.json().catch(() => ({}))
      if (Array.isArray(d.certified)) { ready = true; console.log(`محاولة ${i + 1}: النسخة الجديدة حية (مفتاح certified موجود)`) }
      else console.log(`محاولة ${i + 1}: 200 لكن بلا certified — النسخة القديمة`)
    } else console.log(`محاولة ${i + 1}: applications ${probe.status}`)
  } catch (e) { console.log(`محاولة ${i + 1}: ${e.message.slice(0, 60)}`) }
}
ok('انتظار النشر', ready)

// 1. الفحص 1 — تطبيق إجراء التسجيل الكامل عبر API (دخول تلقائي: token + user في الرد)
const email1 = `v62-reg-${randomUUID().slice(0, 8)}@fia-test.com`
const reg = await fetch(BASE + '/api/auth/register-trainer', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'مدرب فحص v62', email: email1, password: 'test-123456', phone: '+967700000001',
    title: 'اختبار', specialization: 'اختبار', bio: 'ملف اختباري مؤقت يُحذف فور انتهاء فحص v6.2 بالكامل.',
    country: 'اليمن', years_experience: 2,
    qualifications: [{ title: 'بكالوريوس فحص', institution: 'جامعة الاختبار', year: '2020' }],
    achievements: [], experiences: [],
  }),
})
const regD = await reg.json().catch(() => ({}))
ok('تسجيل مدرب جديد يعمل', reg.ok && regD.success)
ok('الرد يحمل توكن دخول تلقائي', !!regD.token && !!regD.user?.id && regD.user?.role === 'trainer')
const testId = regD.user?.id
const tToken = regD.token
console.log('   مدرب اختباري:', testId, '| token:', tToken ? 'مُصدَر ✓' : 'مفقود ✗')

// 2. الفحص 2 — المنتدى مغلق خادمياً قبل الاعتماد (موضوع + رد + تفاعل)
const topicRes = await fetch(BASE + '/api/forum-topics', {
  method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tToken}` },
  body: JSON.stringify({ category_id: randomUUID(), title: 'موضوع اختباري', body: 'اختبار' }),
})
const topicD = await topicRes.json().catch(() => ({}))
ok('إنشاء موضوع بالمنتدى → 403 قبل الاعتماد', topicRes.status === 403, String(topicD.error || '').slice(0, 70))

const replyRes = await fetch(BASE + '/api/forum', {
  method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tToken}` },
  body: JSON.stringify({ topic_id: randomUUID(), body: 'رد اختباري' }),
})
ok('الرد في المنتدى → 403 قبل الاعتماد', replyRes.status === 403)

const reactRes = await fetch(BASE + '/api/forum/react', {
  method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tToken}` },
  body: JSON.stringify({ user_id: testId, topic_id: randomUUID(), reaction: 'like' }),
})
ok('تفاعل المنتدى → 403 قبل الاعتماد', reactRes.status === 403)

// 3. الفحص 3 — المدونة للقراءة فقط (النشر ممنوع — القراءة تعمل)
const blogPost = await fetch(BASE + '/api/blog', {
  method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tToken}` },
  body: JSON.stringify({ title: 'مقال اختباري', body: 'محتوى اختباري' }),
})
const blogD = await blogPost.json().catch(() => ({}))
ok('نشر مقال → 403 قبل الاعتماد', blogPost.status === 403, String(blogD.error || '').slice(0, 70))
const blogRead = await fetch(BASE + '/api/blog')
ok('قراءة المدونة متاحة للجميع', blogRead.status === 200)
const blogComment = await fetch(BASE + '/api/blog/comments', {
  method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tToken}` },
  body: JSON.stringify({ blog_post_id: randomUUID(), user_id: testId, body: 'تعليق اختباري' }),
})
ok('تعليق المدونة → 403 قبل الاعتماد', blogComment.status === 403)

// 4. الفحص 4 — الدورات ما زالت ممنوعة (بوابة موحدة برسائل احترافية)
const courseRes = await fetch(BASE + '/api/courses', {
  method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tToken}` },
  body: JSON.stringify({ title: 'دورة اختبارية', slug: 'v62-test-x', description: 'اختبار', price: 0 }),
})
const courseD = await courseRes.json().catch(() => ({}))
ok('إنشاء دورة → 403 قبل الاعتماد', courseRes.status === 403, String(courseD.error || '').slice(0, 70))
ok('الرسالة احترافية بلا «قصر»', !(courseD.error || '').includes('قصر'))

// 5. الفحص 5 — إضافة صورة شخصية بعد الدخول التلقائي (self-profile مع avatar)
const avatarRes = await fetch(BASE + '/api/trainers/self-profile', {
  method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tToken}` },
  body: JSON.stringify({ avatar: 'https://res.cloudinary.com/demo/image/upload/sample.jpg' }),
})
const avatarD = await avatarRes.json().catch(() => ({}))
ok('حفظ الصورة الشخصية عبر self-profile', avatarRes.status === 200 && avatarD.success, 'avatar في ALLOWED')

// 6. الفحص 6 — دورة الاتفاق الكاملة ثم القفل النهائي
// 6-أ: الإدارة توافق وتعرض نسبة
const approveRes = await fetch(BASE + '/api/trainers/applications', {
  method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${aToken}` },
  body: JSON.stringify({ id: testId, action: 'approve', percentage: 40, terms: 'شروط اختبارية' }),
})
const approveD = await approveRes.json().catch(() => ({}))
ok('موافقة الإدارة + عرض نسبة', approveRes.status === 200 && approveD.success)

// 6-ب: المدرب يوقّع → معتمد
const signRes = await fetch(BASE + '/api/trainers/agreement', {
  method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tToken}` },
  body: JSON.stringify({ trainer_id: testId, response: 'accepted' }),
})
const signD = await signRes.json().catch(() => ({}))
ok('توقيع المدرب على الاتفاق', signRes.status === 200 && signD.success)

// 6-ج: بعد توقيع الطرفين — أي إجراء إداري يُرد 409 (القفل النهائي)
const reofferRes = await fetch(BASE + '/api/trainers/applications', {
  method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${aToken}` },
  body: JSON.stringify({ id: testId, action: 'reoffer', percentage: 50 }),
})
ok('تعديل النسبة بعد التوقيع → 409 (مغلق تماماً)', reofferRes.status === 409)

const rejectAfter = await fetch(BASE + '/api/trainers/applications', {
  method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${aToken}` },
  body: JSON.stringify({ id: testId, action: 'reject', reason: 'محاولة رفض بعد التوقيع' }),
})
ok('الرفض بعد التوقيع → 409 (مغلق تماماً)', rejectAfter.status === 409)

// 6-د: بعد الاعتماد — المنتدى والمدونة يُفتحان فعلاً
const topicAfter = await fetch(BASE + '/api/forum-topics', {
  method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tToken}` },
  body: JSON.stringify({ category_id: randomUUID(), title: 'موضوع بعد الاعتماد (اختبار)', body: 'سيُحذف مع المدرب' }),
})
ok('بعد التوقيع: إنشاء موضوع يُسمح', topicAfter.status === 200)

// 6-هـ: المدرب يظهر في قائمة «المتفق معهم»
const appsRes = await fetch(BASE + '/api/trainers/applications', { headers: { Authorization: `Bearer ${aToken}` } })
const appsD = await appsRes.json().catch(() => ({}))
ok('قائمة الطلبات تعمل', appsRes.status === 200)
ok('تبويب المتفق معهم يحمي المدرب الموقّع', Array.isArray(appsD.certified) && appsD.certified.some((c) => c.id === testId))
ok('stats.certified يعكس العدد', typeof appsD.stats?.certified === 'number')

// 7. الفحص 7 — كتالوج طرق السحب الكامل
const wm = await fetch(BASE + '/api/withdrawal-methods', { headers: { Authorization: `Bearer ${aToken}` } })
const wmD = await wm.json().catch(() => ({}))
const wmList = Array.isArray(wmD) ? wmD : []
const wmCountries = new Set(wmList.map((m) => m.country)).size
ok('كتالوج طرق السحب ≥ 70 طريقة', wmList.length >= 70, `${wmList.length} طريقة في ${wmCountries} دولة`)

// 8. الفحص 8 — عقد القديم سليم: إشعارات بعقدها القديم + الصفحات العامة
const notif = await fetch(BASE + '/api/notifications?user_id=' + testId)
ok('عقد الإشعارات القديم سليم (بلا توكن)', notif.status === 200)
const home = await fetch(BASE + '/')
const reg2 = await fetch(BASE + '/register')
ok('الصفحات العامة 200', home.status === 200 && reg2.status === 200)

// ══════════ تنظيف ملكي فوري ══════════
console.log('\n— التنظيف الفوري لآثار الفحص —')
try {
  // حذف الموضوع الاختباري (إن نُشر بعد الاعتماد)
  if (topicAfter.status === 200) {
    const td = await topicAfter.json().catch(() => ({}))
    if (td?.id) await pool.query(`DELETE FROM forum_posts WHERE topic_id=$1`, [td.id]).catch(() => {})
    await pool.query(`DELETE FROM forum_topics WHERE id=$1`, [td?.id]).catch(() => {})
  }
  // إشعارات المدرب الاختباري + إشعارات الإدارة المرتبطة باسمه
  await pool.query(`DELETE FROM notifications WHERE user_id=$1`, [testId])
  await pool.query(`DELETE FROM notifications WHERE title IN ('🎓 طلب انضمام مدرب جديد') AND body LIKE '%مدرب فحص v62%'`)
  await pool.query(`DELETE FROM notifications WHERE title IN ('🏅 أنت الآن مدرب معتمد!') AND user_id=$1`, [testId])
  // حذف المدرب الاختباري نفسه
  await pool.query(`DELETE FROM trainers WHERE id=$1`, [testId])
  console.log('🧹 حُذف المدرب الاختباري وموضوعه وإشعاراته — بقايا صفر')
} catch (e) { console.log('⚠️ تحذير تنظيف:', e.message.slice(0, 80)) }

// تحقق أخير من بقاء الإدارة سليمة
const finalApps = await fetch(BASE + '/api/trainers/applications', { headers: { Authorization: `Bearer ${aToken}` } })
ok('بعد التنظيف: قائمة الطلبات سليمة', finalApps.status === 200)

await pool.end()
console.log(`\n════════ النتيجة: ${PASS} ناجح / ${FAIL} فاشل ════════`)
process.exit(FAIL > 0 ? 1 : 0)
