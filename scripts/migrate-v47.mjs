// Run SQL migration 017 (telegram dedup) directly via PostgreSQL pooler
import pg from 'pg'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
const { Pool } = pg
const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function runMigration() {
  const pool = new Pool({
    host: 'aws-1-eu-central-1.pooler.supabase.com',
    port: 5432,
    database: 'postgres',
    user: 'postgres.tzquudmfazysjogorrxz',
    password: 'm773057153M',
    ssl: { rejectUnauthorized: false },
    max: 1,
  })

  const sqlPath = __dirname + '/../supabase/migrations/017_telegram_dedup.sql'
  const sql = fs.readFileSync(sqlPath, 'utf8')
  const statements = sql.split(';')
    .map((s) => s.split('\n').filter((line) => !line.trim().startsWith('--')).join('\n').trim())
    .filter((s) => s.length > 0)
  console.log('Running', statements.length, 'statements from 017...')
  for (const stmt of statements) {
    try {
      await pool.query(stmt)
      console.log('OK:', stmt.split('\n')[0].slice(0, 60))
    } catch (e) {
      console.error('FAIL:', stmt.split('\n')[0].slice(0, 60), '→', e.message)
      process.exitCode = 1
    }
  }
  // Verify
  const { rows } = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE 'telegram%'")
  console.log('Telegram tables now:', rows.map(r => r.table_name).join(', '))
  await pool.end()
}
runMigration().catch((e) => { console.error('MIGRATION FAILED:', e.message); process.exit(1) })
