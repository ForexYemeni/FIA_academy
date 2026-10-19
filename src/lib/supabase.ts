import { createClient } from '@supabase/supabase-js'

// Pull from env vars at runtime. When not set (e.g. during static build or
// local dev), use a placeholder so the constructor doesn't throw — calls
// will fail at runtime but the build succeeds.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'https://placeholder.supabase.co'

// === KEYS ===
// We use TWO different keys for different security contexts:
//   - anon key (NEXT_PUBLIC_SUPABASE_ANON_KEY): safe to expose in the browser,
//     respects RLS policies, used for client-side reads + Realtime subscriptions.
//     WITHOUT this, Realtime will NOT work in the browser.
//   - service_role key (SUPABASE_SERVICE_KEY): server-only, bypasses RLS,
//     used by API routes for admin operations. NEVER expose to the browser.

const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

// Server-side client using service role (bypasses RLS)
// Used by API routes only — never import this in client components!
export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceKey || supabaseAnonKey || 'placeholder-key',
  {
    auth: { persistSession: false, autoRefreshToken: false }
  }
)

// Public client (uses anon key, used for client-side reads + Realtime subscriptions)
// This client respects RLS policies. Realtime events only fire if the anon key
// has access to the row (via RLS policies).
//
// ⚠️  CRITICAL: NEXT_PUBLIC_SUPABASE_ANON_KEY must be set in Vercel env vars,
// otherwise this falls back to the service role key which DOES NOT WORK
// for Realtime in the browser (security restriction).
export const supabasePublic = createClient(
  supabaseUrl,
  supabaseAnonKey || 'placeholder-key',
  {
    // Don't persist Supabase Auth session — the app uses its own custom
    // JWT auth stored in localStorage via auth-store.ts. Disabling Supabase
    // Auth session prevents conflicts and unnecessary localStorage usage.
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { params: { eventsPerSecond: 10 } },
  }
)

export type Tables = 'users' | 'courses' | 'trainers' | 'certificates' | 'payments' | 'partners' | 'licenses' | 'payment_methods' | 'site_settings'
