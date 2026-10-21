// ============================================================================
// FIA ACADEMY — FIREBASE ADMIN SDK (server-side push notifications)
// ============================================================================
//
// This module initializes the Firebase Admin SDK using credentials from
// environment variables, and provides a `sendFcmPush()` function that
// the rest of the server uses to send push notifications directly to
// user devices (bypassing OneSignal entirely).
//
// ARCHITECTURE:
// ============
// 1. APK generates an FCM token on install (via Firebase SDK)
// 2. APK sends the token to /api/fcm/register?user_id=...&token=...
// 3. Server stores the (user_id, fcm_token) pair in the fcm_tokens table
// 4. When server wants to notify the user, it calls sendFcmPush(userId, title, body, data)
// 5. sendFcmPush fetches all tokens for the user, then calls
//    admin.messaging().send() for each token
// 6. Firebase delivers the push to the device — even if the app is
//    fully closed/force-killed (uses Google Play Services)
//
// CONFIGURATION:
// =============
// Set these env vars on Vercel:
//   FIREBASE_PROJECT_ID=fia-academy-1aa89
//   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@fia-academy-1aa89.iam.gserviceaccount.com
//   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
//
// The private key must include \n escape sequences (real newlines in the JSON
// don't work in env vars). Vercel handles this automatically if you paste the
// key with actual newlines.
//
// ============================================================================

import { initializeApp, getApps, cert, App } from 'firebase-admin/app'
import { getMessaging, Messaging } from 'firebase-admin/messaging'

// ============================================================================
// Initialization — lazy, only when first called
// ============================================================================
let firebaseApp: App | null = null
let messaging: Messaging | null = null

function getFirebaseMessaging(): Messaging | null {
  if (messaging) return messaging

  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (!projectId || !clientEmail || !privateKey) {
    // Don't log on every call — would spam the logs
    return null
  }

  try {
    // Avoid double-initialization during HMR
    if (getApps().length === 0) {
      firebaseApp = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        projectId,
      })
    } else {
      firebaseApp = getApps()[0]
    }
    messaging = getMessaging(firebaseApp)
    return messaging
  } catch (e) {
    console.warn('[FIA-Firebase] Admin SDK init failed:', e)
    return null
  }
}

// ============================================================================
// Public API — sendFcmPush
// ============================================================================

export interface FcmPushOptions {
  /** The user's ID in our system (used to look up FCM tokens) */
  userId: string
  /** Notification title (Arabic) */
  title: string
  /** Notification body (Arabic) */
  body: string
  /** Optional data payload (e.g., { link: '/courses', type: 'enrollment' }) */
  data?: Record<string, string>
  /** Optional URL to deep-link to when the user taps the notification */
  link?: string
}

export interface FcmPushResult {
  success: boolean
  sent: number
  failed: number
  reason?: string
}

/**
 * Sends a push notification to ALL devices registered for the given user.
 * The user may have multiple devices (logged in on phone + tablet).
 *
 * Returns { success: true, sent: N, failed: M } if at least one device
 * received the push. Returns { success: false, reason: '...' } otherwise.
 *
 * This function uses Firebase Admin SDK directly (no OneSignal).
 * It works even when the user's app is fully closed/force-killed —
 * Firebase uses Google Play Services which is whitelisted on all
 * Android devices.
 *
 * NOTE: This function does NOT throw on individual token failures —
 * it logs them and continues. A token can fail if:
 *   - The user uninstalled the app (token is stale)
 *   - The user cleared Google Play Services data
 *   - The token was rotated
 *
 * On failure, we mark the token as invalid in the DB so we don't try
 * to send to it again.
 */
export async function sendFcmPush(opts: FcmPushOptions): Promise<FcmPushResult> {
  const m = getFirebaseMessaging()
  if (!m) {
    return {
      success: false,
      sent: 0,
      failed: 0,
      reason: 'Firebase Admin SDK not configured (missing FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, or FIREBASE_PRIVATE_KEY env vars)',
    }
  }

  // Lazy import to avoid Supabase init issues during module load
  const { supabaseAdmin } = await import('@/lib/supabase')

  // Fetch all FCM tokens for this user
  const { data: tokens, error } = await supabaseAdmin
    .from('fcm_tokens')
    .select('token')
    .eq('user_id', opts.userId)

  if (error) {
    return { success: false, sent: 0, failed: 0, reason: `DB error: ${error.message}` }
  }

  if (!tokens || tokens.length === 0) {
    return {
      success: false,
      sent: 0,
      failed: 0,
      reason: 'No FCM tokens registered for this user (the user has not logged in from the APK, or the APK is not configured with Firebase yet)',
    }
  }

  // Build the FCM message — DATA payload (not notification) so
  // onMessageReceived is ALWAYS called, even in background.
  const dataPayload: Record<string, string> = {
    title: opts.title,
    body: opts.body,
    link: opts.link || '/',
    type: opts.data?.type || 'system',
    notif_id: String(Date.now()),
    ...opts.data,
  }

  // Send to all tokens in parallel
  const results = await Promise.all(
    tokens.map(async (t: { token: string }) => {
      try {
        const message = {
          token: t.token,
          data: dataPayload,
          android: {
            priority: 'high' as const,
            ttl: 86400, // 24 hours
          },
        }
        await m.send(message)
        return { token: t.token, success: true }
      } catch (e: any) {
        // Common errors:
        //   - "Requested entity was not found" = token is stale (app uninstalled)
        //   - "registration-token-not-registered" = token was rotated
        //   - "invalid-registration-token" = malformed token
        // We should remove the token from the DB in any of these cases.
        if (
          e?.errorInfo?.code?.includes('not-found') ||
          e?.errorInfo?.code?.includes('not-registered') ||
          e?.errorInfo?.code?.includes('invalid-registration')
        ) {
          try {
            await supabaseAdmin
              .from('fcm_tokens')
              .delete()
              .eq('token', t.token)
          } catch {}
        }
        return { token: t.token, success: false, error: e?.message }
      }
    })
  )

  const sent = results.filter((r) => r.success).length
  const failed = results.length - sent

  return {
    success: sent > 0,
    sent,
    failed,
    reason: sent === 0 ? `All ${failed} token(s) failed. See server logs.` : undefined,
  }
}
