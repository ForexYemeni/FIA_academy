package academy.fia.future

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import java.net.HttpURLConnection
import java.net.URL

/**
 * ============================================================================
 * FIA ACADEMY — FIREBASE CLOUD MESSAGING SERVICE v2.6.1
 * ============================================================================
 *
 * 🔥 CRITICAL FIX IN v2.6.1:
 * ==========================
 * Previous versions used channel ID "fia-notifications-v4" which had
 * been previously created with IMPORTANCE_LOW (silent). Android LOCKS
 * channel settings once created — even if the code changes IMPORTANCE
 * to HIGH later, Android ignores the change and keeps the channel at
 * the original importance level.
 *
 * The fix: use a BRAND NEW channel ID ("fia-notifications-v5") that
 * Android has never seen before. This forces Android to create it
 * fresh with IMPORTANCE_HIGH — which gives us:
 *   - Heads-up popup notification (slides down from the top)
 *   - Sound playback
 *   - Vibration
 *   - Full-screen intent capability (lock screen popup)
 *
 * PUSH NOTIFICATION FLOW:
 * =======================
 * 1. FCM token generated on app install
 * 2. onNewToken() saves token to SharedPreferences
 * 3. When user logs in, token is sent to /api/fcm/register
 * 4. Server stores token in fcm_tokens table
 * 5. When server wants to notify user, calls sendFcmPush(userId, title, body)
 * 6. Firebase delivers push to the device — even if app is force-killed
 * 7. onMessageReceived() fires — we build a native OS notification
 * ============================================================================
 */
class FIAFirebaseMessagingService : FirebaseMessagingService() {

    companion object {
        private const val TAG = "FIA-FCM"
        // 🔥 NEW channel ID — v5 forces Android to create it fresh with IMPORTANCE_HIGH
        // (Android locks channel settings after first creation, so we need a new ID
        // to change the importance level)
        private const val CHANNEL_ID = "fia-notifications-v5"
        private const val API_BASE = "https://fiaacademy.vercel.app"

        /**
         * Called by FIAApp.onCreate() to ensure the notification channel
         * exists from the start with the correct IMPORTANCE_HIGH level.
         */
        fun createChannel(context: Context) {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
            try {
                val notifManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

                // Delete the OLD channel (v4) so the user doesn't have a confusing
                // duplicate channel in their notification settings. We can delete
                // it because it was created by our app — Android allows self-deletion.
                try {
                    notifManager.deleteNotificationChannel("fia-notifications-v4")
                    notifManager.deleteNotificationChannel("fia-notifications-v3")
                    Log.d(TAG, "🗑️ Deleted old notification channels (v3, v4)")
                } catch (_: Exception) {}

                // Create the NEW channel with IMPORTANCE_HIGH
                // Android will respect this because the channel ID is brand new
                val channel = NotificationChannel(
                    CHANNEL_ID,
                    "إشعارات أكاديمية المستقبل الدولية",
                    NotificationManager.IMPORTANCE_HIGH  // ← heads-up popup + sound + vibrate
                ).apply {
                    description = "إشعارات الدفع، طلبات الشهادات، المواضيع، وأحداث الأكاديمية"
                    enableLights(true)
                    lightColor = 0xFFD4AF37.toInt()  // gold LED
                    enableVibration(true)
                    vibrationPattern = longArrayOf(0, 500, 200, 500)  // strong vibration
                    setShowBadge(true)
                    lockscreenVisibility = NotificationCompat.VISIBILITY_PUBLIC
                    // Bypass Do Not Disturb mode
                    setBypassDnd(true)
                    // Lockscreen visibility — show on lock screen
                    setShowBadge(true)
                }

                // Set the default notification sound for this channel
                val soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
                val audioAttributes = AudioAttributes.Builder()
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                    .build()
                channel.setSound(soundUri, audioAttributes)

                notifManager.createNotificationChannel(channel)
                Log.d(TAG, "✅ Notification channel v5 created with IMPORTANCE_HIGH + sound + vibration")
            } catch (e: Exception) {
                Log.w(TAG, "createChannel failed", e)
            }
        }
    }

    /**
     * Called when a new FCM token is generated (on first app install,
     * or when the token rotates). We POST it to our server so the
     * server can later target pushes to this device.
     */
    override fun onNewToken(token: String) {
        super.onNewToken(token)
        Log.i(TAG, "🔥 FCM Token generated: ${token.take(20)}...")
        val prefs = getSharedPreferences("fia-prefs", Context.MODE_PRIVATE)
        prefs.edit().putString("fcm_token", token).apply()
        val userId = prefs.getString("user_id", null)
        if (!userId.isNullOrBlank()) {
            registerTokenWithServer(userId, token)
        } else {
            Log.d(TAG, "No user_id yet — token will be registered after login")
        }
    }

    /**
     * Called when a push notification arrives. ALWAYS fires, even when
     * the app is in background or killed — because we use data payloads.
     */
    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        super.onMessageReceived(remoteMessage)
        Log.i(TAG, "🔥 Push received from: ${remoteMessage.from}")

        val data = remoteMessage.data
        val title = data["title"] ?: "إشعار جديد"
        val body = data["body"] ?: ""
        val link = data["link"] ?: "/"
        val notifId = data["notif_id"]?.toIntOrNull() ?: System.currentTimeMillis().toInt()

        Log.i(TAG, "🔔 Firing native notification: $title / $body")

        showNotification(title, body, link, notifId)
    }

    /**
     * Builds and shows the native OS notification.
     * 🔥 KEY FIX: PRIORITY_MAX + category=calls + setFullScreenIntent
     * These three things together force Android to show a heads-up popup
     * (slides down from the top) even on devices that suppress regular
     * notifications.
     */
    private fun showNotification(title: String, body: String, link: String, notifId: Int) {
        val intent = Intent(this, MainActivity::class.java).apply {
            data = Uri.parse("$API_BASE$link")
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            this, notifId, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)

        // Premium custom notification with custom layout
        val customLayout = try {
            android.widget.RemoteViews(packageName, R.layout.notification_fia)
        } catch (_: Exception) { null }

        val builder = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            // 🔥 CRITICAL: PRIORITY_MAX forces heads-up popup
            .setPriority(NotificationCompat.PRIORITY_MAX)
            // 🔥 CATEGORY_MESSAGE makes it appear above other notifications
            .setCategory(NotificationCompat.CATEGORY_MESSAGE)
            // 🔥 VISIBILITY_PUBLIC shows on lock screen
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            // 🔥 Sound + vibration
            .setSound(soundUri)
            .setVibrate(longArrayOf(0, 500, 200, 500))
            // 🔥 Default notifications: sound + lights + vibrate
            .setDefaults(NotificationCompat.DEFAULT_ALL)
            // Auto-cancel when tapped
            .setAutoCancel(true)
            // Gold accent for the small icon background
            .setColor(0xFFD4AF37.toInt())
            .setColorized(true)
            .setContentIntent(pendingIntent)
            // 🔥 Full-screen intent — makes the notification appear as a popup
            // (above other apps) when the screen is on. Falls back to heads-up
            // if the app is not granted the SYSTEM_ALERT_WINDOW permission.
            .setFullScreenIntent(pendingIntent, true)

        if (customLayout != null) {
            try {
                customLayout.setTextViewText(R.id.notif_title, title)
                customLayout.setTextViewText(R.id.notif_body, body)
                customLayout.setTextViewText(R.id.notif_app_name, "أكاديمية المستقبل الدولية")
                customLayout.setImageViewResource(R.id.notif_icon, R.drawable.ic_notification)
                customLayout.setInt(R.id.notif_icon_container, "setBackgroundColor", 0xFFD4AF37.toInt())
                builder.setCustomContentView(customLayout)
                builder.setCustomBigContentView(customLayout)
            } catch (_: Exception) {}
        }

        try {
            val notifManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notifManager.notify(notifId, builder.build())
            Log.i(TAG, "✅ Notification posted to channel $CHANNEL_ID with PRIORITY_MAX")
        } catch (e: Exception) {
            Log.w(TAG, "Failed to post notification", e)
        }
    }

    /**
     * POSTs the FCM token to our server so the server can later
     * target pushes to this user.
     */
    private fun registerTokenWithServer(userId: String, token: String) {
        Thread {
            try {
                val url = URL("$API_BASE/api/fcm/register")
                val conn = (url.openConnection() as HttpURLConnection).apply {
                    requestMethod = "POST"
                    connectTimeout = 10000
                    readTimeout = 10000
                    setRequestProperty("Content-Type", "application/json")
                    doOutput = true
                }
                val jsonBody = """{"user_id":"$userId","token":"$token"}"""
                conn.outputStream.use { it.write(jsonBody.toByteArray()) }
                val code = conn.responseCode
                if (code in 200..299) {
                    Log.i(TAG, "✅ FCM token registered with server for user $userId")
                } else {
                    Log.w(TAG, "Failed to register FCM token: HTTP $code")
                }
                conn.disconnect()
            } catch (e: Exception) {
                Log.w(TAG, "registerTokenWithServer error", e)
            }
        }.start()
    }
}
