import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
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
    // These are no longer required — we use creative fallbacks
    // - team_members → stored in trainers table (with password marker)
    // - course_modules + course_lessons → stored as JSON in courses.description
    // - enrollments → uses payments table creatively
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

  const missingRequired = results.filter((r) => !r.exists && r.required)
  const allOk = missingRequired.length === 0

  return NextResponse.json({
    status: allOk ? 'ok' : 'missing-required',
    tables: results,
    missing_required: missingRequired,
    needs_setup: missingRequired.length > 0,
    note: 'team_members, course_modules, course_lessons, enrollments are no longer required — they use creative fallbacks on the existing tables (trainers, courses, payments).',
  })
}
