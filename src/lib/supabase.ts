import { createClient } from '@supabase/supabase-js'

// Pull from env vars at runtime. When not set (e.g. during static build or
// local dev), use a placeholder so the constructor doesn't throw — calls
// will fail at runtime but the build succeeds.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

// Server-side client using service role (bypasses RLS)
export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseKey,
  {
    auth: { persistSession: false, autoRefreshToken: false }
  }
)

// Public client (uses anon key, used for client-side reads)
export const supabasePublic = createClient(
  supabaseUrl,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || supabaseKey,
  {
    auth: { persistSession: true }
  }
)

export type Tables = 'users' | 'courses' | 'trainers' | 'certificates' | 'payments' | 'partners' | 'licenses' | 'payment_methods' | 'site_settings'
