// تنفيذ الدرع الملكي v7.0.0 على القاعدة الحية — بيان بكل خطوة
import pg from 'pg'
import fs from 'fs'
import dns from 'dns'

dns.setDefaultResultOrder('ipv4first')

const SQL_FILE = process.argv[2] || 'scripts/royal-security-v7.sql'
const raw = fs.readFileSync(SQL_FILE, 'utf8')

// تقسيم على الفواصل المنقوطة مع تجاهل التعليقات
const stmts = raw
  .split('\n')
  .filter((l) => !l.trim().startsWith('--'))
  .join('\n')
  .split(';')
  .map((s) => s.trim())
  .filter(Boolean)

const pws = ['m773057153M', decodeURIComponent('m773057153M%40%23%24778288150omy')]
let pool = null
for (const pw of pws) {
  try {
    pool = new pg.Pool({
      host: 'aws-1-eu-central-1.pooler.supabase.com', port: 5432,
      database: 'postgres', user: 'postgres.tzquudmfazysjogorrxz', password: pw,
      ssl: { rejectUnauthorized: false }, max: 2,
    })
    await pool.query('SELECT 1')
    break
  } catch (e) { pool = null }
}
if (!pool) { console.error('NO_CONNECTION'); process.exit(1) }

let ok = 0, fail = 0
for (const s of stmts) {
  const label = s.replace(/\s+/g, ' ').slice(0, 72)
  try {
    await pool.query(s)
    ok++
    console.log('✓', label)
  } catch (e) {
    // "already exists" ليست فشلاً حقيقياً — العملية مرجعية (idempotent)
    if (/already exists/i.test(e.message)) { ok++; console.log('◌ موجود مسبقاً — تجاوز:', label) }
    else { fail++; console.error('✗', label, '→', e.message) }
  }
}
console.log(`\nالنتيجة: ${ok} نجحت / ${fail} فشلت`)

// تحقق ختامي حي
const chk = await pool.query(`SELECT c.relname, c.relrowsecurity FROM pg_class c
  JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relkind='r' AND c.relname IN
  ('specializations','trainer_earnings','trainer_follows','trainer_withdrawal_accounts',
   'withdrawal_methods','withdrawal_requests','affiliate_withdrawal_accounts','affiliate_withdrawals','audit_log')
  ORDER BY c.relname`)
console.log('\n=== تحقق RLS بعد التنفيذ ===')
for (const r of chk.rows) console.log(`  ${r.relname}: RLS=${r.relrowsecurity}`)
const pol = await pool.query(`SELECT tablename, policyname FROM pg_policies WHERE schemaname='public' AND tablename IN ('trainer_earnings','withdrawal_requests','trainer_withdrawal_accounts','trainer_follows','specializations','withdrawal_methods')`)
console.log('=== السياسات المضافة ===')
for (const p of pol.rows) console.log(`  ${p.tablename} → ${p.policyname}`)
const t = await pool.query(`SELECT to_regclass('public.audit_log') AS t`)
console.log('=== audit_log ===', t.rows[0].t)
await pool.end()
process.exit(fail ? 1 : 0)
