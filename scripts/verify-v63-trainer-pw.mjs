// فحص موجه: مسار trainers في verify-password للحسابات المدربية الذاتية
import pg from 'pg'
import jwt from 'jsonwebtoken'

const pool = new pg.Pool({ host: 'aws-1-eu-central-1.pooler.supabase.com', port: 5432, database: 'postgres', user: 'postgres.tzquudmfazysjogorrxz', password: 'm773057153M', ssl: { rejectUnauthorized: false }, max: 1 })
const { rows: s } = await pool.query(`SELECT value FROM app_secrets WHERE key='jwt_secret' LIMIT 1`)
const { rows: t } = await pool.query(`SELECT id, email FROM trainers WHERE password IS NOT NULL AND password <> '' AND status='approved' ORDER BY created_at DESC LIMIT 1`)
const { rows: u } = await pool.query(`SELECT count(*)::int n FROM users WHERE id = '${t[0].id}'`)
console.log('مدرب اختباري:', t[0].email, '| صف مرآة في users:', u[0].n)

const token = jwt.sign({ sub: t[0].id, role: 'trainer', email: t[0].email }, s[0].value, { expiresIn: '5m' })
// كلمة مرور خاطئة — يجب أن يصل لجدول trainers ويرد valid:false بدل 404
const r = await fetch('https://fiaacademy.vercel.app/api/auth/verify-password', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  body: JSON.stringify({ user_id: t[0].id, password: 'definitely-wrong-063' }),
})
const d = await r.json()
console.log('verify-password لمدرب ذاتي بكلمة خاطئة →', r.status, JSON.stringify(d))
console.log(d.valid === false ? '✓ وصل لمسار trainers (كان 404 قبل v6.3)' : '✗ المسار لم يصل')
await pool.end()
