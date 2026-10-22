// 👑 تحقق إنتاجي v6.1 — بوابة الاعتماد الملكية (بمدرب اختباري مؤقت يُحذف بعدها)
import pg from 'pg'
import jwt from 'jsonwebtoken'
import { randomUUID } from 'crypto'

const DB = 'postgresql://postgres.tzquudmfazysjogorrxz:m773057153M@aws-1-eu-central-1.pooler.supabase.com:5432/postgres'
const BASE = 'https://fiaacademy.vercel.app'
const pool = new pg.Pool({ connectionString: DB, ssl: { rejectUnauthorized: false } })

const { rows: sec } = await pool.query(`SELECT value FROM app_secrets WHERE key='jwt_secret'`)
const secret = sec[0]?.value

// 0. إنشاء مدرب اختباري مؤقت (معلق) — يُحذف في النهاية
const testId = randomUUID()
await pool.query(
  `INSERT INTO trainers (id, name, email, title, specialization, bio, status, created_via, created_at)
   VALUES ($1, 'مدرب بوابة اختباري', 'gate-test-x1@fia-test.com', 'اختبار', 'اختبار', 'ملف اختباري مؤقت لفحص بوابة الاعتماد الملكية ثم يُحذف فوراً', 'pending', 'self_registration', now())`,
  [testId]
)
console.log('مدرب اختباري مؤقت أُنشئ (pending):', testId)
const tToken = jwt.sign({ sub: testId, role: 'trainer', email: 'gate-test-x1@fia-test.com' }, secret, { expiresIn: '10m' })

// 1. انتظار النشر
console.log('— انتظار نشر Vercel —')
let ready = false
for (let i = 0; i < 15; i++) {
  await new Promise(r => setTimeout(r, 20000))
  try {
    const h = await fetch(BASE + '/', { cache: 'no-store' })
    if (h.ok) { console.log(`محاولة ${i + 1}: الرئيسية 200`); ready = true; break }
    console.log(`محاولة ${i + 1}: ${h.status}`)
  } catch (e) { console.log(`محاولة ${i + 1}: ${e.message.slice(0, 50)}`) }
}
if (!ready) console.log('(!) لم نؤكد النشر — نتابع الفحص')

try {
  // 2. الفحص الجوهري: مدرب معلق ينشئ دورة → 403 برسالة ملكية
  console.log('\n— الفحص 1: مدرب معلق ينشئ دورة —')
  const res1 = await fetch(BASE + '/api/courses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tToken}` },
    body: JSON.stringify({ title: 'دورة اختبار البوابة', slug: 'gate-test-x1', description: 'اختبار', price: 0 }),
  })
  const d1 = await res1.json().catch(() => ({}))
  console.log('HTTP', res1.status, '| الرد:', JSON.stringify(d1).slice(0, 250))
  console.log(res1.status === 403 ? '✅✅ البوابة تمنع المدرب المعلق من الإنشاء' : '⚠️ لم يُمنع!')

  // 3. التعديل والحذف ممنوعان أيضاً
  const res2 = await fetch(BASE + '/api/courses', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tToken}` },
    body: JSON.stringify({ id: '00000000-0000-0000-0000-000000000000', title: 'x' }),
  })
  console.log('— الفحص 2: تعديل دورة — HTTP', res2.status, res2.status === 403 ? '✅' : '⚠️')

  const res3 = await fetch(BASE + '/api/courses', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tToken}` },
    body: JSON.stringify({ id: '00000000-0000-0000-0000-000000000000' }),
  })
  console.log('— الفحص 3: حذف دورة — HTTP', res3.status, res3.status === 403 ? '✅' : '⚠️')

  // 4. ترقية الاختباري إلى agreement_pending → يجب أن يمنع برسالة «وقّع الاتفاق»
  await pool.query(`UPDATE trainers SET status='agreement_pending' WHERE id=$1`, [testId])
  const res4 = await fetch(BASE + '/api/courses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tToken}` },
    body: JSON.stringify({ title: 'دورة اختبار البوابة 2', slug: 'gate-test-x2', description: 'اختبار', price: 0 }),
  })
  const d4 = await res4.json().catch(() => ({}))
  console.log('— الفحص 4: مدرب بانتظار التوقيع ينشئ — HTTP', res4.status, res4.status === 403 ? '✅' : '⚠️', '|', String(d4.error || '').slice(0, 120))

  // 5. ترقيته إلى approved → يجب أن يُسمح (لن نُكمل الإنشاء فعلياً — نتحقق أن الرسالة ليست 403 بوابة؛ بدلاً من إنشاء حقيقي نتحقق بالرفض المنطقي: نرسل عنواناً فارغاً فيجب 400/500 وليس 403)
  await pool.query(`UPDATE trainers SET status='approved' WHERE id=$1`, [testId])
  const res5 = await fetch(BASE + '/api/courses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tToken}` },
    body: JSON.stringify({ title: '', slug: '', description: '' }),
  })
  console.log('— الفحص 5: مدرب معتمد يمر من البوابة (فشل تحقق بيانات متوقع وليس 403) — HTTP', res5.status, res5.status !== 403 ? '✅ البوابة تسمح للمعتمد' : '⚠️ ما زال ممنوعاً!')
} finally {
  // 6. تنظيف ملكي فوري
  const del = await pool.query(`DELETE FROM trainers WHERE id=$1`, [testId])
  console.log('\n🧹 المدرب الاختباري حُذف:', del.rowCount === 1)
}

// 7. الإدارة سليمة
const { rows: admins } = await pool.query(`SELECT id, email FROM users WHERE role='admin' ORDER BY created_at LIMIT 1`)
const aToken = jwt.sign({ sub: admins[0].id, role: 'admin', email: admins[0].email }, secret, { expiresIn: '10m' })
const res6 = await fetch(BASE + '/api/trainers/applications', { headers: { Authorization: `Bearer ${aToken}` }, cache: 'no-store' })
console.log('— قصر الموافقات للإدارة — HTTP', res6.status, res6.status === 200 ? '✅' : '⚠️')
const res7 = await fetch(BASE + '/api/withdrawal-methods', { headers: { Authorization: `Bearer ${aToken}` }, cache: 'no-store' })
const d7 = await res7.json().catch(() => [])
console.log('— كتالوج السحب — HTTP', res7.status, '| الطرق:', Array.isArray(d7) ? d7.length : '?')

for (const p of ['/', '/register']) {
  const c = await fetch(BASE + p, { cache: 'no-store' })
  console.log(`صحة ${p}: ${c.status}`)
}

await pool.end()
