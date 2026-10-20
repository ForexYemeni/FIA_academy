import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'
export const maxDuration = 30

// Returns which of the 14 new feature tables exist in the DB.
// The actual CREATE TABLE statements can only be run via the Supabase SQL
// Editor (https://supabase.com/dashboard/project/<ref>/sql/new) — Vercel's
// serverless network can't reach Supabase's PostgreSQL pooler directly.
// We check table existence by attempting a SELECT — Supabase returns a
// specific error if the table doesn't exist.
async function listNewTables() {
  const tables = [
    'coupons', 'affiliates', 'affiliate_referrals', 'reviews',
    'forum_categories', 'forum_topics', 'forum_posts', 'blog_posts',
    'exam_questions', 'exam_attempts', 'lesson_progress', 'course_progress',
    'contact_messages', 'faqs',
  ]
  const existing: { name: string; exists: boolean }[] = []
  for (const t of tables) {
    const { error } = await supabaseAdmin.from(t).select('*').limit(1)
    const exists = !error || !error.message?.includes('Could not find')
    existing.push({ name: t, exists })
  }
  return existing
}

export async function GET(req: NextRequest) {
  const authError = await requireAdmin(req)
  if (authError) return authError

  const tables = await listNewTables()
  const present = tables.filter((t) => t.exists).map((t) => t.name)
  const missing = tables.filter((t) => !t.exists).map((t) => t.name)

  return NextResponse.json({
    supabase_url: (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace('https://', '').split('.')[0],
    sql_editor_url: `https://supabase.com/dashboard/project/${
      (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace('https://', '').split('.')[0]
    }/sql/new`,
    migration_file: 'supabase/migrations/004_major_features_extension.sql',
    tables_present: present,
    tables_missing: missing,
    tables_count: `${present.length}/14`,
    needs_migration: missing.length > 0,
    instructions: missing.length > 0
      ? `Open the SQL Editor link, paste the contents of supabase/migrations/004_major_features_extension.sql, and click Run.`
      : 'All 14 feature tables are present — features should work end-to-end.',
  })
}
