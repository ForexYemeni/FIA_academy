// تشغيل الترحيل 021 — المنظومة الملكية للمدربين
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

const sql = fs.readFileSync('/home/z/my-project/fia-src/supabase/migrations/021_trainer_royal_agreement.sql', 'utf8')
try {
  await pool.query(sql)
  console.log('✓ الترحيل 021 نُفّذ كاملاً')
} catch (e) {
  console.error('خطأ:', e.message)
  process.exit(1)
}

// تحقق
const cols = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name='trainers' AND column_name IN ('status','agreement','qualifications','achievements','experiences','country','created_via','certified_at')`)
console.log('أعمدة المدربين الجديدة:', cols.rows.map(r => r.column_name).join(', '))
const t1 = await pool.query(`SELECT count(*)::int AS n FROM trainer_withdrawal_accounts`)
const t2 = await pool.query(`SELECT count(*)::int AS n FROM withdrawal_methods`)
const st = await pool.query(`SELECT status, count(*)::int AS n FROM trainers GROUP BY status`)
console.log('trainer_withdrawal_accounts:', t1.rows[0].n, '| withdrawal_methods:', t2.rows[0].n)
console.log('حالات المدربين الحاليين:', st.rows.map(r => `${r.status}=${r.n}`).join(', '))
await pool.end()
