// Run SQL migration directly via PostgreSQL connection (CommonJS)
const { Pool } = require('pg')
const fs = require('fs')

async function runMigration() {
  const databaseUrl = process.env.DATABASE_URL || ''
  if (!databaseUrl) {
    console.error('DATABASE_URL not set')
    process.exit(1)
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
    // Force IPv4 — IPv6 unreachable in this environment
    host: 'db.tzquudmfazysjogorrxz.supabase.co',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: decodeURIComponent('m773057153M%40%23%24778288150omy'),
    options: '-c search_path=public',
    family: 4,
  })

  try {
    const sqlPath = '/home/z/my-project/supabase/migrations/003_site_settings_extras.sql'
    const sql = fs.readFileSync(sqlPath, 'utf8')
    console.log('Running migration...')

    const statements = sql.split(';').map((s) => s.trim()).filter((s) => s && !s.startsWith('--'))
    for (const stmt of statements) {
      try {
        await pool.query(stmt + ';')
        console.log('OK:', stmt.substring(0, 80).replace(/\n/g, ' '))
      } catch (e) {
        if (e.message.includes('already exists')) {
          console.log('SKIP (exists):', stmt.substring(0, 80).replace(/\n/g, ' '))
        } else {
          console.error('ERR:', e.message || e.toString(), 'in:', stmt.substring(0, 80))
        }
      }
    }

    const result = await pool.query('SELECT column_name FROM information_schema.columns WHERE table_name = $1', ['site_settings'])
    console.log('\n=== Final site_settings columns ===')
    result.rows.forEach((r) => console.log(' -', r.column_name))
  } catch (e) {
    console.error('Migration failed:', e.message)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

runMigration()
