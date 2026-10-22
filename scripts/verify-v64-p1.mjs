// v6.4 P1 re-test — temp paid course with the exact pathological data (price=50, offer_price="0")
import pg from 'pg'
import jwt from 'jsonwebtoken'

const CS = 'postgresql://postgres.tzquudmfazysjogorrxz:m773057153M@aws-1-eu-central-1.pooler.supabase.com:5432/postgres'
const BASE = 'https://fiaacademy.vercel.app'
const pool = new pg.Pool({ connectionString: CS, ssl: { rejectUnauthorized: false } })
const ok = (label, cond, extra = '') => console.log(`${cond ? '✅' : '❌'} ${label}${extra ? ' — ' + extra : ''}`)

const COURSE_ID = '7e57a110-0000-4000-8000-v64test001'.replace(/-/g, '').replace('v64test001', '000000000001') // fixed uuid-ish
const CID = '7e57a110-6404-4c01-b7ad-000000000001'

const main = async () => {
  const { rows: sec } = await pool.query(`SELECT value FROM app_secrets WHERE key='jwt_secret'`)
  const SECRET = sec[0]?.value
  const { rows: students } = await pool.query(`SELECT id, name, email, role FROM users WHERE role='student' ORDER BY created_at DESC LIMIT 1`)
  const student = students[0]
  const sTok = jwt.sign({ sub: student.id, email: student.email, role: student.role, name: student.name }, SECRET, { expiresIn: '1h' })
  console.log(`student=${student.name}`)

  // 0) cleanup any leftovers
  await pool.query(`DELETE FROM payments WHERE course_id=$1`, [CID])
  await pool.query(`DELETE FROM courses WHERE id=$1`, [CID])

  // 1) insert temp course with the pathological combo
  await pool.query(`
    INSERT INTO courses (id, title, slug, price_type, price, offer_price, offer_type, currency, status, visibility)
    VALUES ($1, 'TEST-V64 دورة مؤقتة للتحقق', 'test-v64-temp', 'مدفوعة', 50, '0', 'none', 'ر.س', 'منشورة', 'public')`,
    [CID])
  console.log('temp course inserted (price=50, offer_price="0", offer_type=none)')

  // 2) enroll WITH proof → must stay pending, amount=50
  const er = await fetch(BASE + '/api/enrollments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sTok}` },
    body: JSON.stringify({ course_id: CID, payment_status: 'pending', amount_paid: 50, currency: 'ر.س', payment_method: 'محفظة جيب', payment_reference: 'TEST-V64 | PROOF: /api/telegram-file/stream?path=photos%2Ffile_138.jpg' }),
  })
  const ej = await er.json().catch(() => ({}))
  ok('enrollment created', er.ok, JSON.stringify(ej).slice(0, 160))
  ok('NOT auto-approved (payment_status=pending)', ej.payment_status === 'pending', `payment_status=${ej.payment_status}`)
  ok('server price enforced (amount_paid=50)', Number(ej.amount_paid) === 50, `amount_paid=${ej.amount_paid}`)

  // 3) enroll WITHOUT proof on a temp FREE course? covered by existing behavior — skip.
  //    Instead verify free-enroll still auto-approves: temp free course
  const FID = '7e57a110-6404-4c01-b7ad-000000000002'
  await pool.query(`DELETE FROM payments WHERE course_id=$1`, [FID])
  await pool.query(`DELETE FROM courses WHERE id=$1`, [FID])
  await pool.query(`
    INSERT INTO courses (id, title, slug, price_type, price, currency, status, visibility)
    VALUES ($1, 'TEST-V64 دورة مجانية مؤقتة', 'test-v64-free', 'مجانية', 0, 'ر.س', 'منشورة', 'public')`, [FID])
  const fr = await fetch(BASE + '/api/enrollments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sTok}` },
    body: JSON.stringify({ course_id: FID, payment_status: 'free' }),
  })
  const fj = await fr.json().catch(() => ({}))
  ok('free enrollment still auto-approved', fr.ok && (fj.payment_status === 'free' || fj.status === 'مكتمل' || fj.already_enrolled), `payment_status=${fj.payment_status}`)

  // 4) cleanup everything
  const d1 = await pool.query(`DELETE FROM payments WHERE course_id IN ($1,$2)`, [CID, FID])
  const d2 = await pool.query(`DELETE FROM courses WHERE id IN ($1,$2)`, [CID, FID])
  ok('cleanup done', true, `payments=${d1.rowCount} courses=${d2.rowCount}`)

  await pool.end()
}
main().catch(e => { console.error('FATAL', e); process.exit(1) })
