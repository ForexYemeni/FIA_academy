// تشغيل الترحيل 025 — أعمدة لقطة حساب السحب على withdrawal_requests
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

const sql = fs.readFileSync('/home/z/my-project/fia-src/supabase/migrations/025_withdrawal_snapshot.sql', 'utf8')
try {
  await pool.query(sql)
  console.log('✓ الترحيل 025 نُفّذ كاملاً')
} catch (e) {
  console.error('خطأ:', e.message)
  process.exit(1)
}

// تحقق: الأعمدة موجودة
const { rows } = await pool.query(`
  SELECT column_name FROM information_schema.columns
  WHERE table_name='withdrawal_requests' AND column_name IN ('account_owner','account_country')
  ORDER BY column_name`)
console.log('أعمدة لقطة الحساب:', rows.map(r => r.column_name).join(' • ') || 'لا شيء!')
await pool.end()
