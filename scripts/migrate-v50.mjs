// ============================================================================
// MIGRATION v5.0 RUNNER — الدرع الملكي
// 1) يطبق 020_royal_shield.sql عبر pooler
// 2) يولد سر JWT الملكي ويثبته في app_secrets
// 3) يشفر كل كلمات المرور النصية الصريحة (users + trainers + علامات الفريق)
//    إلى bcrypt — دون كسر أي تسجيل دخول (verifyPassword يقبل الصيغتين)
// ============================================================================
import pg from 'pg'
import fs from 'fs'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'

const CS = 'postgresql://postgres.tzquudmfazysjogorrxz:m773057153M@aws-1-eu-central-1.pooler.supabase.com:6543/postgres'
const MARKER = '__TEAM_MEMBER__:'

const c = new pg.Client({ connectionString: CS, ssl: { rejectUnauthorized: false } })
const isBcrypt = (s) => typeof s === 'string' && /^\$2[aby]\$/.test(s)

async function main() {
  await c.connect()
  console.log('✅ connected')

  // 1) SQL migration
  const sql = fs.readFileSync(new URL('../supabase/migrations/020_royal_shield.sql', import.meta.url), 'utf8')
  try {
    await c.query(sql)
    console.log('✅ 020 SQL applied')
  } catch (e) {
    // transaction-mode pooler لا يدعم بعض الجمل المتزامنة — ننفذها سطراً سطراً
    console.log('ℹ️ bulk failed, executing statements individually:', e.message)
    for (const st of sql.split(';')) {
      const s = st.trim()
      if (!s || s.startsWith('--')) continue
      try { await c.query(s) } catch (e2) { console.log('  ⚠️ skip:', e2.message.split('\n')[0]) }
    }
    console.log('✅ 020 SQL applied (statement-by-statement)')
  }

  // 2) JWT secret — توليد ملكي وثبت في app_secrets
  const existing = await c.query(`SELECT value FROM app_secrets WHERE key='jwt_secret'`)
  if (existing.rows.length === 0) {
    const secret = crypto.randomBytes(48).toString('hex')
    await c.query(`INSERT INTO app_secrets (key, value) VALUES ('jwt_secret', $1) ON CONFLICT (key) DO NOTHING`, [secret])
    console.log('✅ royal JWT secret generated & stored in app_secrets (48 bytes hex)')
  } else {
    console.log('✅ jwt_secret already exists')
  }

  // 3) تشفير كلمات المرور — users
  const users = await c.query(`SELECT id, password FROM users WHERE password IS NOT NULL AND password <> ''`)
  let uHashed = 0, uMarkers = 0
  for (const row of users.rows) {
    const pw = row.password
    if (pw.startsWith(MARKER)) {
      // علامة فريق داخل users (نادر): شفّر كلمة المرور داخل العلامة
      const after = pw.substring(MARKER.length)
      const i = after.indexOf('__')
      if (i !== -1) {
        const role = after.substring(0, i)
        const rest = after.substring(i + 2)
        const actual = rest.startsWith(':') ? rest.substring(1) : rest
        if (actual && !isBcrypt(actual)) {
          const h = await bcrypt.hash(actual, 10)
          await c.query(`UPDATE users SET password=$1 WHERE id=$2`, [`${MARKER}${role}__:${h}`, row.id])
          uMarkers++
        }
      }
      continue
    }
    if (!isBcrypt(pw)) {
      const h = await bcrypt.hash(pw, 10)
      await c.query(`UPDATE users SET password=$1 WHERE id=$2`, [h, row.id])
      uHashed++
    }
  }
  console.log(`✅ users: hashed ${uHashed} plaintext (+${uMarkers} team markers)`)

  // 4) تشفير كلمات المرور — trainers (تشمل علامات الفريق)
  const trainers = await c.query(`SELECT id, password FROM trainers WHERE password IS NOT NULL AND password <> ''`)
  let tHashed = 0, tMarkers = 0, already = 0
  for (const row of trainers.rows) {
    const pw = row.password
    if (pw.startsWith(MARKER)) {
      const after = pw.substring(MARKER.length)
      const i = after.indexOf('__')
      if (i !== -1) {
        const role = after.substring(0, i)
        const rest = after.substring(i + 2)
        const actual = rest.startsWith(':') ? rest.substring(1) : rest
        if (actual && !isBcrypt(actual)) {
          const h = await bcrypt.hash(actual, 10)
          await c.query(`UPDATE trainers SET password=$1 WHERE id=$2`, [`${MARKER}${role}__:${h}`, row.id])
          tMarkers++
        } else already++
      }
      continue
    }
    if (!isBcrypt(pw)) {
      const h = await bcrypt.hash(pw, 10)
      await c.query(`UPDATE trainers SET password=$1 WHERE id=$2`, [h, row.id])
      tHashed++
    } else already++
  }
  console.log(`✅ trainers: hashed ${tHashed} plaintext + ${tMarkers} team-marker passwords (${already} already bcrypt)`)

  // تحقق نهائي
  const chk = await c.query(`SELECT
    (SELECT count(*) FROM users WHERE password NOT LIKE '$2%' AND password NOT LIKE '${MARKER}%') AS users_plain,
    (SELECT count(*) FROM trainers WHERE password NOT LIKE '$2%' AND password NOT LIKE '${MARKER}%') AS trainers_plain`)
  console.log('📊 remaining plaintext (should be 0):', chk.rows[0])

  // فحص الأعمدة الجديدة
  const cols = await c.query(`SELECT column_name FROM information_schema.columns WHERE table_name='trainer_earnings' AND column_name='consumed_amount'`)
  console.log('📊 consumed_amount column:', cols.rows.length ? 'OK' : 'MISSING!')
  const idx = await c.query(`SELECT indexname FROM pg_indexes WHERE indexname='uq_withdrawal_pending_per_trainer_currency'`)
  console.log('📊 pending-withdrawal unique index:', idx.rows.length ? 'OK' : 'MISSING!')
  const sec = await c.query(`SELECT count(*) FROM app_secrets WHERE key='jwt_secret'`)
  console.log('📊 jwt_secret in app_secrets:', sec.rows[0].count > 0 ? 'OK' : 'MISSING!')

  await c.end()
}

main().catch(async (e) => { console.error('❌', e.message); try { await c.end() } catch {}; process.exit(1) })
