// تشغيل الترحيل 022 — عمود created_at لجدول المدربين (إصلاح قائمة الطلبات الفارغة)
import pg from 'pg'
import fs from 'fs'

const HOST = 'aws-1-eu-central-1.pooler.supabase.com'
const PASSWORDS = ['m773057153M', decodeURIComponent('m773057153M%40%23%24778288150omy')]

let pool = null
for (const pw of PASSWORDS) {
  try {
    const p = new pg.Pool({ host: HOST, port: 5432, database: 'postgres', user: 'postgres.tzquudmfazysjogorrxz', password: pw, ssl: { rejectUnauthorized: false }, max: 2 })
    await p.query('SELECT 1')
    pool = p
    console.log('متصل بكلمة المرور #' + (PASSWORDS.indexOf(pw) + 1))
    break
  } catch (e) { console.log('فشلت المحاولة:', e.message.slice(0, 50)) }
}
if (!pool) { console.error('فشل الاتصال'); process.exit(1) }

const sql = fs.readFileSync('/home/z/my-project/fia-src/supabase/migrations/022_trainers_created_at.sql', 'utf8')
try {
  await pool.query(sql)
  console.log('✓ الترحيل 022 نُفّذ كاملاً')
} catch (e) {
  console.error('خطأ:', e.message)
  process.exit(1)
}

// ─── إصلاح روابط إشعارات المنظومة القديمة (كانت /dashboard → 404) ───
// الإدارة → قصر الموافقات، المدرب → نظرة عامة (بطاقة الاتفاق)
const n1 = await pool.query(
  `UPDATE notifications SET link='/#trainer-applications'
   WHERE type='trainer_application' AND link='/dashboard'`
)
console.log('✓ إشعارات طلبات المدربين (إدارة):', n1.rowCount)

const n2 = await pool.query(
  `UPDATE notifications n SET link='/#trainer-applications'
   WHERE n.type='trainer_agreement' AND n.link='/dashboard'
     AND EXISTS (SELECT 1 FROM users u WHERE u.id = n.user_id AND u.role='admin')`
)
console.log('✓ إشعارات اتفاق (إدارة):', n2.rowCount)

const n3 = await pool.query(
  `UPDATE notifications SET link='/#overview'
   WHERE type IN ('trainer_rejected','trainer_certified') AND link='/dashboard'`
)
console.log('✓ إشعارات رفض/اعتماد (مدرب):', n3.rowCount)

const n4 = await pool.query(
  `UPDATE notifications n SET link='/#overview'
   WHERE n.type='trainer_agreement' AND n.link='/dashboard'
     AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = n.user_id AND u.role='admin')`
)
console.log('✓ إشعارات اتفاق (مدرب):', n4.rowCount)

// ─── تحقق نهائي ───
const cols = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name='trainers' AND column_name='created_at'`)
console.log('عمود created_at موجود:', cols.rows.length === 1)
const st = await pool.query(`SELECT name, status, created_at FROM trainers ORDER BY created_at DESC NULLS LAST`)
console.log('المدربون مع created_at:')
for (const r of st.rows) console.log(`  - ${r.name} | ${r.status} | ${r.created_at}`)
const links = await pool.query(`SELECT type, link, count(*)::int AS n FROM notifications WHERE type LIKE 'trainer%' GROUP BY type, link`)
console.log('روابط إشعارات المدربين الآن:')
for (const r of links.rows) console.log(`  - ${r.type} → ${r.link} (${r.n})`)

await pool.end()
