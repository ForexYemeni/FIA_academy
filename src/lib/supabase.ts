import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

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
