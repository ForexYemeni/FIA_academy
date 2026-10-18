// OneSignal push notification helper.
// Sends instant push messages to the user's device(s) — works even
// when the app is force-killed. The Android app uses the OneSignal
// SDK which registers the device with OneSignal's servers and tags
// it with the user's ID (setExternalUserId). When the server needs
// to send a push, it tells OneSignal "send to user ID X" and
// OneSignal delivers it instantly via FCM (managed by OneSignal,
// the user never interacts with Firebase directly).

// OneSignal credentials — read from environment variables for security.
// Set these in .env or Vercel dashboard:
//   ONESIGNAL_APP_ID=957cba56-ba48-479e-9e43-1e506d30dc10
//   ONESIGNAL_API_KEY=os_v2_app_...
const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID || ''
const ONESIGNAL_API_KEY = process.env.ONESIGNAL_API_KEY || ''

/**
 * Send a push notification to a specific user via OneSignal.
 * The user's device must have the OneSignal SDK installed and
 * must have called OneSignal.setExternalUserId(userId).
 *
 * @param userId - the user's ID in our system (used as external_user_id)
 * @param title - notification title (Arabic)
 * @param body - notification body (Arabic)
 * @param data - optional data payload (e.g., { link: '/courses' })
 */
export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<boolean> {
  // Skip if credentials not configured
  if (!ONESIGNAL_APP_ID || !ONESIGNAL_API_KEY) {
    return false
  }
  try {
    const res = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${ONESIGNAL_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        include_external_user_ids: [userId],
        headings: { en: title, ar: title },
        contents: { en: body, ar: body },
        data: {
          ...data,
          userId,
        },
        // Android-specific settings
        android_channel_id: 'fia_notifications',
        small_icon: 'ic_notification',
        large_icon: 'https://fiaacademy.vercel.app/fia/logo-fia.png',
        // Make it a heads-up notification
        priority: 10,
        // Vibration + sound
        android_sound: 'fia_chime',
        // Don't group — each notification is separate
        android_group: null,
        // TTL: 24 hours (notification is stored on OneSignal's server
        // and delivered when the device comes online within 24h)
        ttl: 86400,
        // Delivery timezone
        deliver_after: null,
      }),
    })
    const result = await res.json().catch(() => null)
    if (!res.ok) {
      console.warn('OneSignal push failed:', result)
      return false
    }
    return true
  } catch (e) {
    console.warn('OneSignal push error:', e)
    return false
  }
}

/**
 * Send a push to ALL users (broadcast). Used for blog posts,
 announcements, etc.
 */
export async function broadcastPushNotification(
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<boolean> {
  if (!ONESIGNAL_APP_ID || !ONESIGNAL_API_KEY) return false
  try {
    const res = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${ONESIGNAL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        included_segments: ['All'],
        headings: { en: title, ar: title },
        contents: { en: body, ar: body },
        data: data || {},
        priority: 10,
        ttl: 86400,
      }),
    })
    return res.ok
  } catch (e) {
    return false
  }
}
