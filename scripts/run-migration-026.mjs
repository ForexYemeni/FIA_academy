// تشغيل الترحيل 026 — كتالوج التخصصات + منظومة سحب عمولات المسوّقين
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

const sql = fs.readFileSync('/home/z/my-project/fia-src/supabase/migrations/026_specializations_affiliate_payouts.sql', 'utf8')
try {
  await pool.query(sql)
  console.log('✓ الترحيل 026 نُفّذ كاملاً')
} catch (e) {
  console.error('خطأ:', e.message)
  process.exit(1)
}

// تحقق شامل
const checks = [
  [`SELECT count(*)::int n FROM specializations WHERE type='title'`, 'مسميات وظيفية مزروعة'],
  [`SELECT count(*)::int n FROM specializations WHERE type='specialization'`, 'تخصصات عالمية مزروعة'],
  [`SELECT count(*)::int n FROM information_schema.columns WHERE table_name='users' AND column_name='specialization'`, 'users.specialization'],
  [`SELECT count(*)::int n FROM information_schema.tables WHERE table_name='affiliate_withdrawal_accounts'`, 'جدول حسابات المسوّقين'],
  [`SELECT count(*)::int n FROM information_schema.tables WHERE table_name='affiliate_withdrawals'`, 'جدول سحب العمولات'],
]
for (const [q, label] of checks) {
  const { rows } = await pool.query(q)
  console.log(`✓ ${label}: ${rows[0].n}`)
}
await pool.end()
