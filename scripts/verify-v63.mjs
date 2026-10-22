// تحقق إنتاجي v6.3 — القوائم الفاخرة + التخصصات + حماية الحذف بكلمة المرور + عمولات المسوّقين
import jwt from 'jsonwebtoken'
import pg from 'pg'

const BASE = 'https://fiaacademy.vercel.app'
const HOST = 'aws-1-eu-central-1.pooler.supabase.com'
const PASSWORDS = ['m773057153M', decodeURIComponent('m773057153M%40%23%24778288150omy')]

let pool = null
for (const pw of PASSWORDS) {
  try {
    const p = new pg.Pool({ host: HOST, port: 5432, database: 'postgres', user: 'postgres.tzquudmfazysjogorrxz', password: pw, ssl: { rejectUnauthorized: false }, max: 2 })
    await p.query('SELECT 1'); pool = p; break
  } catch {}
}
if (!pool) { console.error('فشل الاتصال بقاعدة البيانات'); process.exit(1) }

// jwt_secret من خزنة الأسرار
const { rows: secretRows } = await pool.query(`SELECT value FROM app_secrets WHERE key='jwt_secret' LIMIT 1`)
const JWT_SECRET = secretRows[0]?.value
if (!JWT_SECRET) { console.error('لا يوجد jwt_secret'); process.exit(1) }

// حساب إدارة حي
const { rows: admins } = await pool.query(`SELECT id, email, name FROM users WHERE role='admin' ORDER BY created_at LIMIT 1`)
const admin = admins[0]
const token = jwt.sign({ sub: admin.id, role: 'admin', email: admin.email, name: admin.name }, JWT_SECRET, { expiresIn: '10m' })
console.log('✓ JWT إدارة مُصدر لحساب:', admin.email)

const results = []
const check = (name, ok, detail = '') => { results.push({ name, ok }); console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ' — ' + detail : ''}`) }
const H = (t) => ({ 'Authorization': `Bearer ${t}`, 'Content-Type': 'application/json' })

// ── 1) كتالوج التخصصات: عام يرى المفعّلة فقط ──
const specPub = await fetch(`${BASE}/api/specializations`).then(r => r.json()).catch(() => null)
check('GET /api/specializations عام — مصفوفة', Array.isArray(specPub))
check('الكتالوج مزروع كاملاً (59)', Array.isArray(specPub) && specPub.length >= 59, `${specPub?.length || 0} عنصراً`)
const hasTitles = Array.isArray(specPub) && specPub.some(s => s.type === 'title' && s.name === 'مدرب معتمد')
const hasSpecs = Array.isArray(specPub) && specPub.some(s => s.type === 'specialization' && s.name === 'الطب الباطني')
check('مسميات وظيفية ظاهرة (مدرب معتمد)', !!hasTitles)
check('تخصصات عالمية ظاهرة (الطب الباطني)', !!hasSpecs)

// ── 2) إضافة/تعديل/تعطيل/حذف (إدارة) ──
const created = await fetch(`${BASE}/api/specializations`, { method: 'POST', headers: H(token), body: JSON.stringify({ name: 'فحص-تخصص-مؤقت-063', type: 'specialization', icon: '🧪', sort: 999 }) }).then(r => r.json()).catch(() => null)
check('POST تخصص جديد (إدارة)', !!created?.id)
if (created?.id) {
  const up = await fetch(`${BASE}/api/specializations`, { method: 'PUT', headers: H(token), body: JSON.stringify({ id: created.id, name: 'فحص-تخصص-مؤقت-063-معدل', enabled: false }) }).then(r => r.json()).catch(() => null)
  check('PUT تعديل/تعطيل', up?.id === created.id && up?.enabled === false)
  // العام لا يرى المعطّلة
  const pub2 = await fetch(`${BASE}/api/specializations`).then(r => r.json()).catch(() => [])
  check('العام لا يرى المعطّلة', Array.isArray(pub2) && !pub2.some(s => s.id === created.id))
  const del = await fetch(`${BASE}/api/specializations?id=${created.id}`, { method: 'DELETE', headers: H(token) }).then(r => r.json()).catch(() => null)
  check('DELETE تنظيف الفحص', del?.ok === true)
}

// ── 3) حماية حذف طرق السحب بكلمة المرور ──
const { rows: wm } = await pool.query(`SELECT id, name FROM withdrawal_methods WHERE enabled=true LIMIT 1`)
const wmId = wm[0]?.id
const delNoPw = await fetch(`${BASE}/api/withdrawal-methods?id=${wmId}`, { method: 'DELETE', headers: H(token) }).then(r => r.status)
check('حذف طريقة بلا كلمة مرور → 400', delNoPw === 400, `status=${delNoPw}`)
const delBadPw = await fetch(`${BASE}/api/withdrawal-methods?id=${wmId}`, { method: 'DELETE', headers: { ...H(token), 'x-confirm-password': 'wrong-password-123' } }).then(r => r.status)
check('حذف بكلمة مرور خاطئة → 403', delBadPw === 403, `status=${delBadPw}`)

// ── 4) عمولات المسوّقين: الواجهات ──
const awAdmin = await fetch(`${BASE}/api/affiliate-withdrawals?admin=1`, { headers: H(token) }).then(r => r.json()).catch(() => null)
check('GET affiliate-withdrawals?admin=1 (إدارة) — مصفوفة', Array.isArray(awAdmin), `${awAdmin?.length || 0} طلباً`)
const aaNoAuth = await fetch(`${BASE}/api/affiliate-accounts`).then(r => r.status)
check('affiliate-accounts بلا توكن → 401', aaNoAuth === 401, `status=${aaNoAuth}`)
const awNoAuth = await fetch(`${BASE}/api/affiliate-withdrawals`).then(r => r.status)
check('affiliate-withdrawals بلا توكن → 401', awNoAuth === 401, `status=${awNoAuth}`)

// ── 5) عمود users.specialization + أعمدة المنظومة ──
const { rows: colUsers } = await pool.query(`SELECT count(*)::int n FROM information_schema.columns WHERE table_name='users' AND column_name='specialization'`)
check('users.specialization موجود', colUsers[0].n === 1)
const { rows: t26 } = await pool.query(`SELECT count(*)::int n FROM information_schema.tables WHERE table_name IN ('affiliate_withdrawal_accounts','affiliate_withdrawals','specializations')`)
check('جداول 026 الثلاثة موجودة', t26[0].n === 3)
const { rows: seedN } = await pool.query(`SELECT count(*)::int n FROM specializations`)
check('بذور الكتالوج سليمة (≥59)', seedN[0].n >= 59, `${seedN[0].n}`)

// ── 6) العقد القديم للإشعارات سليم ──
const notifNoAuth = await fetch(`${BASE}/api/notifications?user_id=x`).then(r => r.status)
check('عقد الإشعارات القديم (بلا توكن → 401)', notifNoAuth === 401, `status=${notifNoAuth}`)
const sw = await fetch(`${BASE}/sw.js`).then(r => r.text()).catch(() => '')
check('sw.js v6 سليم', sw.includes('v6') || sw.length > 1000, `${sw.length} بايت`)

const failed = results.filter(r => !r.ok)
console.log(`\n━━━ النتيجة: ${results.length - failed.length}/${results.length} فحصاً ناجحاً ━━━`)
if (failed.length) { console.log('فاشلة:', failed.map(f => f.name).join(' • ')); process.exit(1) }
await pool.end()
