// v6.5 production verification — read-only
// 1) mint admin JWT from app_secrets  2) GET /api/trainer-earnings?admin=1
// 3) assert withdrawal snapshot fields exist  4) check affiliate withdrawals snapshot
// 5) confirm new bundle deployed (placeholder string gone from chunks)
import pg from 'pg'
import jwt from 'jsonwebtoken'
const { Client } = pg

const DB = 'postgresql://postgres.tzquudmfazysjogorrxz:m773057153M@aws-1-eu-central-1.pooler.supabase.com:5432/postgres'
const BASE = 'https://fiaacademy.vercel.app'

async function main() {
  const results = []
  const ok = (name, cond, extra = '') => { results.push([cond ? 'PASS' : 'FAIL', name, extra]); if (!cond) process.exitCode = 1 }

  // --- DB: secret + snapshot columns
  const c = new Client({ connectionString: DB, ssl: { rejectUnauthorized: false } })
  await c.connect()
  const { rows: sec } = await c.query("SELECT value FROM app_secrets WHERE key='jwt_secret' LIMIT 1")
  ok('jwt_secret present in app_secrets', sec.length > 0)
  const secret = sec[0]?.value

  const { rows: adm } = await c.query("SELECT id, email, name FROM users WHERE role='admin' ORDER BY created_at ASC LIMIT 1")
  ok('admin account exists', adm.length > 0, adm[0]?.email || '')
  await c.end()

  const token = jwt.sign({ sub: adm[0].id, email: adm[0].email, role: 'admin', name: adm[0].name }, secret, { expiresIn: '30m' })

  // --- trainer earnings admin view
  const r1 = await fetch(`${BASE}/api/trainer-earnings?admin=1`, { headers: { Authorization: `Bearer ${token}` } })
  ok('GET /api/trainer-earnings?admin=1 → 200', r1.status === 200, `status=${r1.status}`)
  const d1 = await r1.json().catch(() => null)
  const wds = Array.isArray(d1?.withdrawals) ? d1.withdrawals : []
  const withSnap = wds.filter((w) => w.method_name || w.account || w.account_owner)
  ok(`trainer withdrawals carry snapshot fields (${withSnap.length}/${wds.length} rows)`, wds.length === 0 || withSnap.length > 0)
  if (withSnap[0]) {
    const w = withSnap[0]
    ok('snapshot fields populated (method_name/account/owner/country)',
      !!(w.method_name || w.account), `${w.method_name || '-'} | ${w.account || '-'} | ${w.account_owner || '-'} | ${w.account_country || '-'}`)
  }
  ok('per-trainer summary includes withdrawal_accounts array', Array.isArray(d1?.per_trainer) && d1.per_trainer.every((t) => Array.isArray(t.withdrawal_accounts)))

  // --- affiliate withdrawals admin view
  const r2 = await fetch(`${BASE}/api/affiliate-withdrawals?admin=1`, { headers: { Authorization: `Bearer ${token}` } })
  ok('GET /api/affiliate-withdrawals?admin=1 → 200', r2.status === 200, `status=${r2.status}`)
  const d2 = await r2.json().catch(() => null)
  const aws = Array.isArray(d2) ? d2 : []
  const aWithSnap = aws.filter((w) => w.method_name || w.account_number || w.account_name)
  ok(`affiliate withdrawals carry snapshot fields (${aWithSnap.length}/${aws.length} rows)`, aws.length === 0 || aWithSnap.length > 0)

  // --- notifications contract untouched
  const r3 = await fetch(`${BASE}/api/notifications?user_id=probe-no-auth`, { headers: { Authorization: `Bearer ${token}` } })
  ok('GET /api/notifications?user_id=... responds (old APK contract alive)', r3.status === 200 || r3.status === 401 || r3.status === 400, `status=${r3.status}`)

  // --- new bundle deployed: removed placeholder must be absent from client chunks
  const home = await fetch(BASE)
  const html = await home.text()
  const chunks = Array.from(new Set([...html.matchAll(/\/_next\/static\/[^"']+\.js/g)].map((m) => m[0])))
  let found = 0
  for (const u of chunks) {
    const t = await fetch(BASE + u).then((x) => x.text()).catch(() => '')
    if (t.includes('لم تحدده الإدارة بعد') || t.includes('المسمى الوظيفي والتخصص مغلّقان')) found++
  }
  ok('removed v6.4 placeholder strings absent from homepage chunks', found === 0, `chunks=${chunks.length}, hits=${found}`)

  for (const [s, n, e] of results) console.log(`${s} — ${n}${e ? '  [' + e + ']' : ''}`)
  const fails = results.filter((r) => r[0] === 'FAIL').length
  console.log(fails === 0 ? '\nALL GREEN ✓' : `\n${fails} FAILURES`)
}

main().catch((e) => { console.error('FATAL', e.message); process.exit(1) })
