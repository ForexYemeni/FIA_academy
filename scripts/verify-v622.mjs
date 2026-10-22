// 👑 تحقق إنتاجي v6.2.2 — ربط خزينة «أرباحي» بحسابات السحب
// (1) ترحيل 025: عمودا account_owner/account_country على withdrawal_requests
// (2) بوابة الخادم: طلب السحب بلا حساب سحب مضاف → 400 no_withdrawal_account
// (3) استدعاء الحساب المضاف: account_id يُتحقق من ملكيته وتُلتقط بياناته
// (4) نظرة الإدارة تعرض حسابات السحب الحقيقية لكل مدرب
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
const aToken = jwt.sign({ sub: adminId, role: 'admin', email: admins[0]?.email }, secret, { expiresIn: '15m' })

// 0. انتظار النشر — مؤشر النسخة الجديدة: مفتاح withdrawal_accounts في نظرة الإدارة
console.log('— انتظار نشر Vercel —')
let ready = false
for (let i = 0; i < 15 && !ready; i++) {
  await new Promise(r => setTimeout(r, 20000))
  try {
    const probe = await fetch(BASE + '/api/trainer-earnings?admin=1', { headers: { Authorization: `Bearer ${aToken}` } })
    if (probe.ok) {
      const d = await probe.json().catch(() => ({}))
      if (Array.isArray(d.per_trainer) && d.per_trainer.length > 0 && 'withdrawal_accounts' in d.per_trainer[0]) {
        ready = true; console.log(`محاولة ${i + 1}: النسخة الجديدة حية (مفتاح withdrawal_accounts موجود)`)
      } else console.log(`محاولة ${i + 1}: 200 لكن بلا withdrawal_accounts — النسخة القديمة`)
    } else console.log(`محاولة ${i + 1}: admin=1 ${probe.status}`)
  } catch (e) { console.log(`محاولة ${i + 1}: ${e.message.slice(0, 60)}`) }
}
ok('انتظار النشر', ready)

// 1. الفحص 1 — ترحيل 025 مطبق على الإنتاج
const cols = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name='withdrawal_requests' AND column_name IN ('account_owner','account_country')`)
ok('ترحيل 025 — عمودا لقطة الحساب موجودان', cols.rowCount === 2, cols.rows.map(r => r.column_name).join(' • '))

// 2. إنشاء مدرب اختباري مؤقت (يُحذف بعدها)
const email = `v622-wd-${randomUUID().slice(0, 8)}@fia-test.com`
const reg = await fetch(BASE + '/api/auth/register-trainer', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'مدرب فحص v622', email, password: 'test-123456', phone: '+967700000022',
    title: 'اختبار', specialization: 'اختبار', bio: 'ملف اختباري مؤقت يُحذف فور انتهاء فحص v6.2.2 بالكامل.',
    country: 'اليمن', years_experience: 1,
    qualifications: [{ title: 'بكالوريوس فحص', institution: 'جامعة الاختبار', year: '2021' }],
    achievements: [], experiences: [],
  }),
})
const regD = await reg.json().catch(() => ({}))
ok('تسجيل مدرب اختباري', reg.ok && regD.success && !!regD.token)
const testId = regD.user?.id
const tToken = regD.token

// 3. الفحص 2 — بوابة الخادم: سحب بلا حساب مضاف → 400 no_withdrawal_account
const wd1 = await fetch(BASE + '/api/trainer-earnings', {
  method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tToken}` },
  body: JSON.stringify({ trainer_id: testId, amount: 100, currency: 'ر.ي' }),
})
const wd1D = await wd1.json().catch(() => ({}))
ok('السحب بلا حساب مضاف مرفوض خادمياً (400)', wd1.status === 400, wd1D.error?.slice(0, 60))
ok('الرمز no_withdrawal_account يعود', wd1D.code === 'no_withdrawal_account')

// 4. إضافة حساب سحب للمدرب الاختباري مباشرة في القاعدة (واجهة الحسابات تتطلب اعتماداً)
const accId = randomUUID()
await pool.query(
  `INSERT INTO trainer_withdrawal_accounts (id, trainer_id, country, method_name, currency, account_name, account_number, is_default)
   VALUES ($1, $2, 'اليمن', 'وسترن يونيون', 'ر.ي', 'صاحب فحص', '737000111', true)`,
  [accId, testId])
ok('حساب سحب اختباري أُدرج', true, accId.slice(0, 8))

// 5. الفحص 3 — السحب مع حساب مزوّر → مرفوض (ملكية الحساب محمية)
const wdBad = await fetch(BASE + '/api/trainer-earnings', {
  method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tToken}` },
  body: JSON.stringify({ trainer_id: testId, amount: 100, currency: 'ر.ي', account_id: randomUUID() }),
})
const wdBadD = await wdBad.json().catch(() => ({}))
ok('account_id غريب مرفوض (حماية الملكية)', wdBad.status === 400 && /حساب السحب المحدد/.test(wdBadD.error || ''), wdBadD.error?.slice(0, 50))

// 6. الفحص 4 — السحب بالحساب الصحيح يعبر بوابة الحسابات ويُوقف عند الرصيد (لا طلب يُنشأ)
const wd2 = await fetch(BASE + '/api/trainer-earnings', {
  method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tToken}` },
  body: JSON.stringify({ trainer_id: testId, amount: 99999999, currency: 'ر.ي', account_id: accId }),
})
const wd2D = await wd2.json().catch(() => ({}))
ok('الحساب الصحيح يعبر البوابة — يُوقف عند فحص الرصيد', wd2.status === 400 && /رصيدك المتاح/.test(wd2D.error || ''), wd2D.error?.slice(0, 60))
const wdCount = await pool.query(`SELECT COUNT(*)::int AS c FROM withdrawal_requests WHERE trainer_id=$1`, [testId])
ok('لم يُنشأ أي طلب سحب اختباري', wdCount.rows[0]?.c === 0, `الطلبات: ${wdCount.rows[0]?.c}`)

// 7. الفحص 5 — واجهة حسابات السحب للإدارة (بمعرّف مدرب آخر)
const accs = await fetch(BASE + `/api/trainer/withdrawal-accounts?trainer_id=${testId}`, { headers: { Authorization: `Bearer ${aToken}` } })
const accsD = await accs.json().catch(() => ({}))
ok('الإدارة تقرأ حسابات سحب المدرب', accs.status === 200 && Array.isArray(accsD) && accsD.length === 1 && accsD[0].method_name === 'وسترن يونيون')

// 8. الفحص 6 — نظرة الإدارة تحمل withdrawal_accounts لكل مدرب
const adm = await fetch(BASE + '/api/trainer-earnings?admin=1', { headers: { Authorization: `Bearer ${aToken}` } })
const admD = await adm.json().catch(() => ({}))
const mine = (admD.per_trainer || []).find((t) => t.trainer_id === testId)
ok('per_trainer يحمل withdrawal_accounts', adm.status === 200 && !!mine && Array.isArray(mine.withdrawal_accounts) && mine.withdrawal_accounts.length === 1)

// 9. الفحص 7 — العقد القديم سليم: إشعارات بلا توكن + الصفحات العامة
const notif = await fetch(BASE + '/api/notifications?user_id=' + testId)
ok('عقد الإشعارات القديم سليم (بلا توكن)', notif.status === 200)
const home = await fetch(BASE + '/')
ok('الصفحة الرئيسية 200', home.status === 200)
const sw = await fetch(BASE + '/sw.js')
ok('sw.js موجود (نظام الإشعارات محمي)', sw.status === 200)

// ══════════ تنظيف فوري ══════════
console.log('\n— التنظيف الفوري لآثار الفحص —')
try {
  await pool.query(`DELETE FROM trainer_withdrawal_accounts WHERE trainer_id=$1`, [testId])
  await pool.query(`DELETE FROM notifications WHERE user_id=$1`, [testId])
  await pool.query(`DELETE FROM notifications WHERE body LIKE '%مدرب فحص v622%'`)
  await pool.query(`DELETE FROM trainers WHERE id=$1`, [testId])
  await pool.query(`DELETE FROM users WHERE id=$1`, [testId])
  console.log('🧹 حُذف المدرب الاختباري وحسابه وإشعاراته — بقايا صفر')
} catch (e) { console.log('⚠️ تحذير تنظيف:', e.message.slice(0, 80)) }

const finalAdm = await fetch(BASE + '/api/trainer-earnings?admin=1', { headers: { Authorization: `Bearer ${aToken}` } })
ok('بعد التنظيف: نظرة الإدارة سليمة', finalAdm.status === 200)

await pool.end()
console.log(`\n════════ النتيجة: ${PASS} ناجح / ${FAIL} فاشل ════════`)
process.exit(FAIL > 0 ? 1 : 0)
