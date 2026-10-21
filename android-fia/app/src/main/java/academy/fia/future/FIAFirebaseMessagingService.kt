package academy.fia.future

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
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
 * FIA ACADEMY — FIREBASE CLOUD MESSAGING SERVICE (the new push system)
 * ============================================================================
 *
 * This service receives push notifications from Firebase Cloud Messaging
 * (FCM). The server sends pushes via Firebase Admin SDK directly to the
 * user's FCM token — no OneSignal middleman involved.
 *
 * HOW IT WORKS:
 * =============
 * 1. On app install, Firebase SDK generates a unique FCM token for this
 *    device (see onNewToken below).
 * 2. We POST the token to our server /api/fcm/register?user_id=...&token=...
 *    so the server can later target pushes to this specific user.
 * 3. When the server wants to notify the user, it calls Firebase Admin
 *    SDK's messaging().send() with the user's token.
 * 4. Firebase delivers the push to this device — even if the app is
 *    fully closed/force-killed. FCM uses a system-level service that
 *    wakes up the app to deliver the message.
 * 5. onMessageReceived fires — we build a native OS notification with
 *    title, body, sound, vibration, and deep-link.
 *
 * RELIABILITY:
 * ============
 * - FCM works even when the app is force-killed (Android 8+ "background
 *   restricted" apps still receive FCM if the user has notifications
 *   enabled for the app).
 * - FCM does NOT require battery optimization exemption — it uses
 *   Google Play Services which is whitelisted by default on all
 *   manufacturer ROMs (Xiaomi/Huawei/Samsung).
 * - FCM is the SAME mechanism WhatsApp, Telegram, Instagram, etc. use
 *   for instant notifications — it's the industry standard.
 *
 * DATA PAYLOAD vs NOTIFICATION PAYLOAD:
 * =====================================
 * We use DATA payloads (not notification payloads) so onMessageReceived
 * is ALWAYS called — even when the app is in background or killed.
 * Notification payloads are auto-displayed by the system tray without
 * invoking our code, which means we can't customize the notification
 * look (no custom layout, no deep-link, no sound customization).
 *
 * Data payload format (sent from server):
 * {
 *   "title": "...",        // Arabic title
 *   "body": "...",        // Arabic body
 *   "link": "/...",       // Deep-link URL
 *   "type": "...",        // notification type (for sound choice)
 *   "notif_id": "..."     // unique ID for grouping/dedup
 * }
 * ============================================================================
 */
class FIAFirebaseMessagingService : FirebaseMessagingService() {

    companion object {
        private const val TAG = "FIA-FCM"
        private const val CHANNEL_ID = "fia-notifications-v4"  // NEW channel — clean state
        private const val API_BASE = "https://fiaacademy.vercel.app"

        /**
         * Called by FIAApp.onCreate() to ensure the notification channel
         * exists from the start (so it's available even if the first
         * push arrives before the service has a chance to start).
         */
        fun createChannel(context: Context) {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
            try {
                val notifManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                val channel = NotificationChannel(
                    CHANNEL_ID,
                    "إشعارات أكاديمية المستقبل الدولية",
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "إشعارات الدفع، طلبات الشهادات، المواضيع، وأحداث الأكاديمية"
                    enableLights(true)
                    lightColor = 0xFFD4AF37.toInt()  // gold LED
                    enableVibration(true)
                    setShowBadge(true)
                    lockscreenVisibility = NotificationCompat.VISIBILITY_PUBLIC
                }
                notifManager.createNotificationChannel(channel)
                Log.d(TAG, "✅ Notification channel created")
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
        // Save the token to SharedPreferences so MainActivity can send
        // it to the server when the user logs in.
        val prefs = getSharedPreferences("fia-prefs", Context.MODE_PRIVATE)
        prefs.edit().putString("fcm_token", token).apply()
        // Also try to register immediately if we have a user_id
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

        // Extract title + body from data payload
        val data = remoteMessage.data
        val title = data["title"] ?: "إشعار جديد"
        val body = data["body"] ?: ""
        val link = data["link"] ?: "/"
        val notifId = data["notif_id"]?.toIntOrNull() ?: System.currentTimeMillis().toInt()

        Log.i(TAG, "🔔 Firing native notification: $title / $body")

        // Build and show the notification
        showNotification(title, body, link, notifId)
    }

    /**
     * Builds and shows the native OS notification with the premium
     * custom layout.
     */
    private fun showNotification(title: String, body: String, link: String, notifId: Int) {
        // Deep-link intent — opens MainActivity with the notification URL
        val intent = Intent(this, MainActivity::class.java).apply {
            data = Uri.parse("$API_BASE$link")
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            this, notifId, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val sound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)

        // Premium custom notification with custom layout (matches the
        // navy/gold theme of the app)
        val customLayout = try {
            android.widget.RemoteViews(packageName, R.layout.notification_fia)
        } catch (_: Exception) { null }

        val builder = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_MESSAGE)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setSound(sound)
            .setVibrate(longArrayOf(0, 250, 100, 250))
            .setAutoCancel(true)
            .setColor(0xFFD4AF37.toInt())
            .setColorized(true)
            .setContentIntent(pendingIntent)

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
        } catch (e: Exception) {
            Log.w(TAG, "Failed to post notification", e)
        }
    }

    /**
     * POSTs the FCM token to our server so the server can later
     * target pushes to this user.
     */
    private fun registerTokenWithServer(userId: String, token: String) {
        // Run on a background thread — can't do network on main thread
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
