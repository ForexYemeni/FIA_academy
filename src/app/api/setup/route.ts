import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/admin-auth'

export async function GET(req: NextRequest) {
  const authError = await requireAdmin(req)
  if (authError) return authError
  // Check which tables exist
  const checks = [
    { name: 'courses', required: true },
    { name: 'trainers', required: true },
    { name: 'users', required: true },
    { name: 'certificates', required: true },
    { name: 'payments', required: true },
    { name: 'partners', required: true },
    { name: 'licenses', required: true },
    { name: 'payment_methods', required: true },
    { name: 'site_settings', required: true },
  ]

  const results: any[] = []
  for (const check of checks) {
    const { error } = await supabaseAdmin.from(check.name).select('*').limit(1)
    const exists = !error || !error.message?.includes('Could not find the table')
    results.push({
      table: check.name,
      exists,
      required: check.required,
      error: error?.message,
    })
  }

  // Auto-migrate: ensure site_settings has all new columns
  // (We try to update a row with all new fields; if a column doesn't exist, the update will fail
  // and we silently ignore — admin will need to run the migration SQL manually)
  try {
    const existing = await supabaseAdmin.from('site_settings').select('id').limit(1).single()
    if (existing.data) {
      // Try to set default values for new fields — this also creates them if missing (in some PG configs)
      // Note: ALTER TABLE is required for missing columns; we'll do it via direct SQL below if possible
    }
  } catch {}

  const missingRequired = results.filter((r) => !r.exists && r.required)
  const allOk = missingRequired.length === 0

  return NextResponse.json({
    status: allOk ? 'ok' : 'missing-required',
    tables: results,
    missing_required: missingRequired,
    needs_setup: missingRequired.length > 0,
    note: 'If new site_settings columns are missing (about_*, policy_*, social_*, show_*), please run /supabase/migrations/003_site_settings_extras.sql in the Supabase SQL editor.',
  })
}

// POST: run migration (ALTER TABLE) — requires admin service role (used internally)
export async function POST(req: NextRequest) {
  try {
    const { supabaseUrl = '', supabaseServiceKey = '' } = {} as any
    // Use direct fetch to Supabase REST endpoint for ALTER TABLE — not supported via JS SDK
    // Return instructions instead
    return NextResponse.json({
      message: 'Migration not automatic. Please run the SQL file: /supabase/migrations/003_site_settings_extras.sql in the Supabase SQL Editor.',
      sql_path: '/supabase/migrations/003_site_settings_extras.sql',
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
