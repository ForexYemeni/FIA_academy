import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'
export const maxDuration = 60

// This endpoint runs the 004 migration on the live Supabase DB. It does so
// by issuing many small SQL statements through the Supabase REST endpoint
// via the `supabaseAdmin` client. Since the JS client doesn't have a raw
// SQL method, we use the pg_meta extension at /pg/query.
//
// Required env vars (set on Vercel):
//   NEXT_PUBLIC_SUPABASE_URL / SUPABASE_URL
//   SUPABASE_SERVICE_KEY
//
// The /pg/query endpoint is part of the supabase admin REST API and accepts
// raw SQL. We call it directly with fetch — supabase-js doesn't expose it.
async function runSqlViaPgMeta(sql: string): Promise<{ ok: number; failed: number; errors: string[] }> {
  const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''
  const serviceKey = process.env.SUPABASE_SERVICE_KEY || ''
  if (!projectUrl || !serviceKey) {
    return { ok: 0, failed: 0, errors: ['Supabase URL or service key not set on server'] }
  }

  // Split the SQL into individual statements
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
      const res = await fetch(`${projectUrl}/pg/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${serviceKey}`,
          apikey: serviceKey,
        },
        body: JSON.stringify({ query: stmt + ';' }),
      })
      if (!res.ok) {
        const text = await res.text()
        const msg = (text || '').substring(0, 200)
        // expected: "already exists", "duplicate key" — skip silently
        if (!msg.includes('already exists') && !msg.includes('duplicate key')) {
          failed++
          errors.push(`${stmt.substring(0, 80).replace(/\s+/g, ' ')} → ${msg}`)
        }
        continue
      }
      ok++
    } catch (e: any) {
      failed++
      errors.push(`${stmt.substring(0, 80).replace(/\s+/g, ' ')} → ${e.message}`)
    }
  }
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
  // Read the migration SQL file from disk (only works if it's bundled with
  // the deployment — it is, since supabase/migrations/ is in the repo).
  let sql = ''
  try {
    const fs = await import('fs')
    const path = await import('path')
    const sqlPath = path.join(process.cwd(), 'supabase', 'migrations', '004_major_features_extension.sql')
    sql = fs.readFileSync(sqlPath, 'utf8')
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed to read migration file', details: e.message }, { status: 500 })
  }

  const result = await runSqlViaPgMeta(sql)
  const existing = await listNewTables()

  return NextResponse.json({
    ok: result.ok,
    failed: result.failed,
    errors: result.errors.slice(0, 10),
    tables_present: existing,
    tables_count: `${existing.length}/14`,
  })
}
