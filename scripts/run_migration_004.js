// Run the major-features SQL migration against the live Supabase database.
// Forces IPv4 resolution to bypass the unreachable IPv6 address on this host.
const { Pool } = require('pg')
const dns = require('dns')
const fs = require('fs')
const path = require('path')

// Make Node prefer IPv4 when resolving hostnames — Supabase's IPv6 endpoint is
// unreachable in this environment (ECONNREFUSED), so this is required.
dns.setDefaultResultOrder('ipv4first')

async function main() {
  const pool = new Pool({
    host: 'db.tzquudmfazysjogorrxz.supabase.co',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: 'm773057153M@#$778288150omy',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 30000,
  })

  const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', '004_major_features_extension.sql')
  const sql = fs.readFileSync(sqlPath, 'utf8')
  console.log('Connected to Supabase. Running migration 004...')

  const statements = sql
    .split(/;\s*\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)

  let ok = 0, skipped = 0, failed = 0
  for (const stmt of statements) {
    const meaningful = stmt.replace(/--.*$/gm, '').trim()
    if (!meaningful) continue
    try {
      await pool.query(stmt + ';')
      ok++
    } catch (e) {
      const msg = e.message || ''
      if (msg.includes('already exists') || msg.includes('duplicate key')) {
        skipped++
      } else {
        console.error('STMT FAILED:', stmt.substring(0, 100).replace(/\s+/g, ' '))
        console.error('   ERROR:', msg.substring(0, 200))
        failed++
      }
    }
  }

  console.log(`\nMigration: ${ok} OK, ${skipped} skipped (already existed), ${failed} unexpected failures.`)

  const result = await pool.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('coupons','affiliates','affiliate_referrals','reviews','forum_categories','forum_topics','forum_posts','blog_posts','exam_questions','exam_attempts','lesson_progress','course_progress','contact_messages','faqs') ORDER BY table_name"
  )
  console.log(`\nNew tables in DB (${result.rows.length}/14):`)
  result.rows.forEach((r) => console.log(' -', r.table_name))

  await pool.end()
}

main().catch((e) => {
  console.error('FATAL:', e.message)
  process.exit(1)
})
