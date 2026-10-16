import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'
export const maxDuration = 60

// On Vercel, env vars are present — we can connect directly via pg.
// In local dev, env vars may be missing — we fall back to supabaseAdmin checks.
async function runMigrationViaPg(sql: string): Promise<{ ok: number; failed: number; errors: string[] }> {
  // Try to load pg dynamically — it's installed as a dependency
  let Pool: any
  try {
    const pg = await import('pg')
    Pool = pg.Pool
  } catch {
    return { ok: 0, failed: 0, errors: ['pg module not available — skipping direct DB migration'] }
  }

  // Construct the connection string from env vars
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) {
    return { ok: 0, failed: 0, errors: ['DATABASE_URL not set on server'] }
  }

  const pool = new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 30000,
  })

  const statements = sql
    .split(/;\s*\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)

  let ok = 0
  let failed = 0
  const errors: string[] = []

  for (const stmt of statements) {
    const meaningful = stmt.replace(/--.*$/gm, '').trim()
    if (!meaningful) continue
    try {
      await pool.query(stmt + ';')
      ok++
    } catch (e: any) {
      const msg = e.message || ''
      if (msg.includes('already exists') || msg.includes('duplicate key')) {
        // expected when re-running
      } else {
        failed++
        errors.push(`${stmt.substring(0, 80).replace(/\s+/g, ' ')} → ${msg.substring(0, 150)}`)
      }
    }
  }

  try { await pool.end() } catch {}
  return { ok, failed, errors }
}

// List which of the new tables exist in the DB after migration
async function listNewTables() {
  const tables = [
    'coupons', 'affiliates', 'affiliate_referrals', 'reviews',
    'forum_categories', 'forum_topics', 'forum_posts', 'blog_posts',
    'exam_questions', 'exam_attempts', 'lesson_progress', 'course_progress',
    'contact_messages', 'faqs',
  ]
  const existing: string[] = []
  for (const t of tables) {
    const { error } = await supabaseAdmin.from(t).select('*').limit(1)
    if (!error || !error.message?.includes('Could not find')) {
      existing.push(t)
    }
  }
  return existing
}

export async function GET() {
  // Expose (sanitized) which env vars are actually set on the server,
  // so we can understand which connection path will work.
  const envCheck = {
    has_supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL || !!process.env.SUPABASE_URL,
    has_service_key: !!process.env.SUPABASE_SERVICE_KEY,
    has_anon_key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || !!process.env.SUPABASE_ANON_KEY,
    has_database_url: !!process.env.DATABASE_URL,
    supabase_url_prefix: (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '').substring(0, 40),
    database_url_prefix: (process.env.DATABASE_URL || '').substring(0, 40),
    jwt_secret_set: !!process.env.JWT_SECRET,
  }

  let sql = ''
  try {
    const fs = await import('fs')
    const path = await import('path')
    const sqlPath = path.join(process.cwd(), 'supabase', 'migrations', '004_major_features_extension.sql')
    sql = fs.readFileSync(sqlPath, 'utf8')
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed to read migration file', details: e.message, envCheck }, { status: 500 })
  }

  const result = await runMigrationViaPg(sql)
  const existing = await listNewTables()

  return NextResponse.json({
    env: envCheck,
    ok: result.ok,
    failed: result.failed,
    errors: result.errors.slice(0, 20),
    tables_present: existing,
    tables_count: `${existing.length}/14`,
  })
}
