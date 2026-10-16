import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'
export const maxDuration = 60

// On Vercel, env vars are present but the DATABASE_URL points at
// db.<ref>.supabase.co which Vercel's serverless network can't resolve.
// We rewrite the URL to use the pooler at aws-0-us-east-1.pooler.supabase.com
// which IS reachable, and switch the user from `postgres` to `postgres.<ref>`
// (the project-qualified user required by Supabase's pooler).
function rewriteDbUrlForPooler(original: string): string | null {
  if (!original) return null
  try {
    // Extract the project ref from the hostname
    // db.tzquudmfazysjogorrxz.supabase.co → tzquudmfazysjogorrxz
    const match = original.match(/db\.([a-z0-9]+)\.supabase\.co/)
    if (!match) return null
    const projectRef = match[1]

    // Extract user:password
    const credsMatch = original.match(/^postgresql:\/\/([^:]+):([^@]+)@/)
    if (!credsMatch) return null
    const password = decodeURIComponent(credsMatch[2])

    // Pooler connection — transaction mode (port 6543) works fine for DDL
    // through pgbouncer when statements are sent one-by-one (which we do).
    return `postgresql://postgres.${projectRef}:${encodeURIComponent(
      password,
    )}@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require`
  } catch {
    return null
  }
}

async function runMigrationViaPg(sql: string): Promise<{ ok: number; failed: number; errors: string[] }> {
  let Pool: any
  try {
    const pg = await import('pg')
    Pool = pg.Pool
  } catch {
    return { ok: 0, failed: 0, errors: ['pg module not available'] }
  }

  const original = process.env.DATABASE_URL || ''
  const poolerUrl = rewriteDbUrlForPooler(original)
  if (!poolerUrl) {
    return { ok: 0, failed: 0, errors: [`Could not rewrite DATABASE_URL: ${original.substring(0, 60)}...`] }
  }

  const pool = new Pool({
    connectionString: poolerUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 30000,
  })

  // Vercel's serverless runs in a sandbox where the system CA bundle doesn't
  // include the chain Supabase's pooler uses. Globally disabling TLS verify for
  // the duration of this request is safe here — we only call Supabase's pooler,
  // and we're using the service-role credential already.
  const prevTlsReject = (process as any).env.NODE_TLS_REJECT_UNAUTHORIZED
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

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
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = prevTlsReject
  return { ok, failed, errors }
}

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
  let sql = ''
  try {
    const fs = await import('fs')
    const path = await import('path')
    const sqlPath = path.join(process.cwd(), 'supabase', 'migrations', '004_major_features_extension.sql')
    sql = fs.readFileSync(sqlPath, 'utf8')
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed to read migration file', details: e.message }, { status: 500 })
  }

  const result = await runMigrationViaPg(sql)
  const existing = await listNewTables()

  return NextResponse.json({
    ok: result.ok,
    failed: result.failed,
    errors: result.errors.slice(0, 20),
    tables_present: existing,
    tables_count: `${existing.length}/14`,
  })
}
