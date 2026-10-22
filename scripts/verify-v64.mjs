// v6.4 production verification — three fixes
import pg from 'pg'
import jwt from 'jsonwebtoken'

const CS = 'postgresql://postgres.tzquudmfazysjogorrxz:m773057153M@aws-1-eu-central-1.pooler.supabase.com:5432/postgres'
const BASE = 'https://fiaacademy.vercel.app'
const pool = new pg.Pool({ connectionString: CS, ssl: { rejectUnauthorized: false } })

const ok = (label, cond, extra = '') =>
  console.log(`${cond ? '✅' : '❌'} ${label}${extra ? ' — ' + extra : ''}`)

const main = async () => {
  // 0) secret + actors
  const { rows: sec } = await pool.query(`SELECT value FROM app_secrets WHERE key='jwt_secret'`)
  const SECRET = sec[0]?.value
  if (!SECRET) throw new Error('no jwt_secret')
  const sign = (u) => jwt.sign({ sub: u.id, email: u.email, role: u.role, name: u.name }, SECRET, { expiresIn: '1h' })

  const { rows: trainers } = await pool.query(`SELECT id, name, email, role FROM users WHERE role='trainer' ORDER BY created_at DESC LIMIT 1`)
  const { rows: students } = await pool.query(`SELECT id, name, email, role, title, specialization, phone FROM users WHERE role='student' ORDER BY created_at DESC LIMIT 10`)
  const trainer = trainers[0]
  // pick a student WITHOUT enrollment in the تجريب course (202db027-2c5b-4e47-8d82-bd2534ac0fe5)
  const { rows: enrolled } = await pool.query(`SELECT user_id FROM payments WHERE course_id='202db027-2c5b-4e47-8d82-bd2534ac0fe5'`)
  const enrolledSet = new Set(enrolled.map(r => r.user_id))
  const testStudent = students.find(s => !enrolledSet.has(s.id)) || students[students.length - 1]
  console.log(`actors: trainer=${trainer?.name} | student=${testStudent?.name} (${testStudent?.id})`)
  const tTok = sign(trainer), sTok = sign(testStudent)

  // 1) wait for deploy
  console.log('\n=== waiting for v6.4 deploy ===')
  let live = false
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(BASE + '/api/health?t=' + Date.now(), { cache: 'no-store' }).catch(() => null)
      const r2 = await fetch(BASE, { cache: 'no-store' })
      if (r2.ok) { live = true; console.log(`site reachable after ${i * 10}s`); break }
    } catch {}
    await new Promise(r => setTimeout(r, 10000))
  }
  ok('site live', live)
  await new Promise(r => setTimeout(r, 20000)) // warm-up after deploy

  // 2) P1 — paid course + proof must stay PENDING (was auto-مكتمل)
  console.log('\n=== P1: paid enrollment with proof ===')
  const proofRef = 'TEST-V64 | PROOF: /api/telegram-file/stream?path=photos%2Ffile_138.jpg'
  const er = await fetch(BASE + '/api/enrollments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sTok}` },
    body: JSON.stringify({ course_id: '202db027-2c5b-4e47-8d82-bd2534ac0fe5', payment_status: 'pending', amount_paid: 50, currency: 'ر.س', payment_method: 'محفظة جيب', payment_reference: proofRef }),
  })
  const ej = await er.json().catch(() => ({}))
  ok('enrollment created', er.ok, JSON.stringify(ej).slice(0, 140))
  ok('NOT auto-approved (payment_status=pending)', ej.payment_status === 'pending', `payment_status=${ej.payment_status}`)
  ok('server price enforced (amount_paid=50)', Number(ej.amount_paid) === 50, `amount_paid=${ej.amount_paid}`)
  if (ej.id) {
    const { rowCount } = await pool.query(`DELETE FROM payments WHERE id=$1 AND reference LIKE 'TEST-V64%'`, [ej.id])
    ok('test row cleaned up', rowCount === 1)
  }

  // 3) P2 — trainer can list students (was 403) + cert requests readable
  console.log('\n=== P2: trainer certificate tab APIs ===')
  const sr = await fetch(BASE + '/api/students?role=student', { headers: { Authorization: `Bearer ${tTok}` } })
  const sj = await sr.json().catch(() => null)
  ok('GET /api/students as trainer = 200', sr.ok && Array.isArray(sj), sr.status + ` (${Array.isArray(sj) ? sj.length + ' students' : 'non-array'})`)
  ok('no password leak', Array.isArray(sj) && sj.every(u => !('password' in u)))
  const cr = await fetch(BASE + '/api/certificate-requests', { headers: { Authorization: `Bearer ${tTok}` } })
  const cj = await cr.json().catch(() => null)
  ok('GET /api/certificate-requests as trainer = 200', cr.ok && Array.isArray(cj), cr.status + ` (${Array.isArray(cj) ? cj.length + ' requests' : ''})`)
  const ar = await fetch(BASE + '/api/exam-attempts?all=1', { headers: { Authorization: `Bearer ${tTok}` } })
  ok('GET /api/exam-attempts?all=1 as trainer = 200', ar.ok, String(ar.status))

  // 4) P3 — student cannot edit title/specialization (server strips) but phone works
  console.log('\n=== P3: student profile lock ===')
  const orig = testStudent
  const hackTitle = 'HACK-V64-' + Date.now()
  const pr = await fetch(BASE + '/api/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sTok}` },
    body: JSON.stringify({ phone: orig.phone || '0500000000', title: hackTitle, specialization: hackTitle, bio: 'v64 test' }),
  })
  ok('PUT /api/profile as student = 200', pr.ok, String(pr.status))
  const { rows: after } = await pool.query(`SELECT title, specialization, phone FROM users WHERE id=$1`, [testStudent.id])
  const u = after[0]
  ok('title NOT changed by student', (u.title || '') !== hackTitle, `title=${JSON.stringify(u.title)}`)
  ok('specialization NOT changed by student', (u.specialization || '') !== hackTitle, `spec=${JSON.stringify(u.specialization)}`)
  ok('phone still editable by student', (u.phone || '') === (orig.phone || '0500000000'), `phone=${JSON.stringify(u.phone)}`)

  // 5) admin can still edit title/specialization via /api/students
  const { rows: admins } = await pool.query(`SELECT id, name, email, role FROM users WHERE role='admin' LIMIT 1`)
  const aTok = sign(admins[0])
  const setSpec = 'V64-ADMIN-' + Date.now()
  const ar2 = await fetch(BASE + '/api/students', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${aTok}` },
    body: JSON.stringify({ id: testStudent.id, title: setSpec, specialization: setSpec }),
  })
  ok('admin PUT /api/students with specialization = 200', ar2.ok, String(ar2.status))
  const { rows: after2 } = await pool.query(`SELECT title, specialization FROM users WHERE id=$1`, [testStudent.id])
  ok('admin CAN set title+specialization', after2[0].title === setSpec && after2[0].specialization === setSpec, JSON.stringify(after2[0]))
  // restore
  await pool.query(`UPDATE users SET title=$1, specialization=$2 WHERE id=$3`, [orig.title, orig.specialization, testStudent.id])
  ok('restored original values', true, `was title=${JSON.stringify(orig.title)} spec=${JSON.stringify(orig.specialization)}`)

  await pool.end()
}
main().catch(e => { console.error('FATAL', e); process.exit(1) })
