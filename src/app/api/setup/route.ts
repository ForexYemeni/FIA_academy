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
    { name: 'course_modules', required: false },
    { name: 'course_lessons', required: false },
    { name: 'enrollments', required: false },
    { name: 'team_members', required: false },
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

  const missingOptional = results.filter((r) => !r.exists && !r.required)
  const missingRequired = results.filter((r) => !r.exists && r.required)
  const allOk = missingRequired.length === 0

  return NextResponse.json({
    status: allOk ? 'ok' : 'missing-required',
    tables: results,
    missing_required: missingRequired,
    missing_optional: missingOptional,
    needs_setup: missingOptional.length > 0,
    sql_file: '/supabase/migrations/002_modules_lessons_enrollments.sql',
  })
}
