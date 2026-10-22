// Run SQL migration 019 (royal visibility) directly via PostgreSQL pooler
import pg from 'pg'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
const { Pool } = pg
const __dirname = path.dirname(fileURLToPath(import.meta.url))

const CONF = {
  host: 'aws-1-eu-central-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.tzquudmfazysjogorrxz',
  password: 'm773057153M',
  ssl: { rejectUnauthorized: false },
  max: 1,
}
const DIRECT_CONF = {
  host: 'db.tzquudmfazysjogorrxz.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'm773057153M',
  ssl: { rejectUnauthorized: false },
  max: 1,
}

async function apply(pool, sqlPath) {
  const sql = fs.readFileSync(sqlPath, 'utf8')
  const statements = sql.split(';')
    .map((s) => s.split('\n').filter((line) => !line.trim().startsWith('--')).join('\n').trim())
    .filter((s) => s.length > 0)
  console.log('Running', statements.length, 'statements from 019...')
  for (const stmt of statements) {
    try {
      await pool.query(stmt)
      console.log('OK:', stmt.split('\n')[0].slice(0, 60))
    } catch (e) {
      if (/already exists/i.test(e.message)) { console.log('SKIP (exists):', stmt.split('\n')[0].slice(0, 50)); continue }
      throw e
    }
  }
}

async function main() {
  const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', '019_royal_visibility.sql')
  for (const [name, conf] of [['POOLER', CONF], ['DIRECT', DIRECT_CONF]]) {
    const pool = new Pool(conf)
    try {
      console.log(`Trying ${name} connection...`)
      await apply(pool, sqlPath)
      const { rows } = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name='danger_zone_snapshots'")
      console.log('Verify danger_zone_snapshots:', rows.length === 1 ? 'CREATED ✓' : 'MISSING ✗')
      await pool.end()
      return
    } catch (e) {
      console.error(`${name} FAILED:`, e.message)
      try { await pool.end() } catch {}
    }
  }
  process.exit(1)
}
main()
