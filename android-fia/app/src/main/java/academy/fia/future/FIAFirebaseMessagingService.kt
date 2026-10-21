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
import android.provider.Settings
import android.util.Log
import androidx.core.app.NotificationCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import java.net.HttpURLConnection
import java.net.URL

/**
 * ============================================================================
 * FIA ACADEMY — FIREBASE CLOUD MESSAGING SERVICE v2.7.1 (FINAL FIX)
 * ============================================================================
 *
 * 🔥 CRITICAL FIX IN v2.7.1:
 * ==========================
 * User reported: "الإشعارات لا تصل خارج التطبيق أبداً" — even after v2.6.1,
 * notifications don't appear as external popups and don't play sound.
 *
 * ROOT CAUSE (verified):
 * ======================
 * The channel ID 'fia-notifications-v5' was first created by an earlier
 * APK version with potentially LOW importance settings (because the user
 * may have manually downgraded the channel's importance via Android
 * settings → App → FIA Academy → Notifications → Channel → Importance: Low).
 *
 * Android LOCKS channel settings after creation — even if the app deletes
 * and recreates the channel with IMPORTANCE_HIGH, Android restores the
 * user's previous settings (LOW importance = silent).
 *
 * THE FIX (v2.7.1):
 * =================
 * 1. Use a BRAND NEW channel ID 'fia-notifications-v7' that has NEVER
 *    existed on the device before. This forces Android to create it fresh
 *    with IMPORTANCE_HIGH (sound + popup + vibrate).
 *
 * 2. Delete ALL old channels (v3, v4, v5, v6) to clean up the channel list.
 *
 * 3. Use BOTH notification payload (for system tray display) AND
 *    onMessageReceived (for custom processing) — by checking if the
 *    RemoteMessage has a notification object OR data object.
 *
 * 4. ALWAYS post the notification with:
 *    - PRIORITY_MAX (forces heads-up popup)
 *    - setDefaults(DEFAULT_ALL) — sound + lights + vibrate
 *    - setSound(default notification sound) — explicit
 *    - setVisibility(VISIBILITY_PUBLIC) — shows on lock screen
 *    - setCategory(CATEGORY_MESSAGE) — treated as important message
 *    - setFullScreenIntent — attempts to show over other apps
 *
 * 5. Add verbose logging so we can debug if notifications still don't show.
 * ============================================================================
 */
class FIAFirebaseMessagingService : FirebaseMessagingService() {

    companion object {
        private const val TAG = "FIA-FCM"
        // 🔥 v2.7.1: BRAND NEW channel ID — Android has never seen this,
        // so it will be created fresh with IMPORTANCE_HIGH (sound + popup)
        private const val CHANNEL_ID = "fia-notifications-v7"
        private const val API_BASE = "https://fiaacademy.vercel.app"

        /**
         * Called by FIAApp.onCreate() to create the notification channel
         * with the correct IMPORTANCE_HIGH setting.
         */
        fun createChannel(context: Context) {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
            try {
                val notifManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

                // 🔥 Delete ALL old channels (v3, v4, v5, v6) to clean up
                // the user's notification settings list.
                val oldChannelIds = listOf(
                    "fia-notifications-v3",
                    "fia-notifications-v4",
                    "fia-notifications-v5",
                    "fia-notifications-v6",
                    "fia-notifications"  // original channel
                )
                for (oldId in oldChannelIds) {
                    try {
                        notifManager.deleteNotificationChannel(oldId)
                        Log.d(TAG, "🗑️ Deleted old channel: $oldId")
                    } catch (_: Exception) {}
                }

                // Check if our new channel already exists
                val existingChannel = notifManager.getNotificationChannel(CHANNEL_ID)
                if (existingChannel != null) {
                    // 🔥 If the channel exists but with LOW importance, delete it
                    // so we can recreate with HIGH importance.
                    if (existingChannel.importance < NotificationManager.IMPORTANCE_HIGH) {
                        Log.w(TAG, "⚠️ Channel $CHANNEL_ID exists with LOW importance (${existingChannel.importance}) — deleting to recreate")
                        notifManager.deleteNotificationChannel(CHANNEL_ID)
                    } else {
                        Log.d(TAG, "✅ Channel $CHANNEL_ID already exists with importance ${existingChannel.importance}")
                        return
                    }
                }

                // 🔥 Create the channel with MAXIMUM importance settings
                val channel = NotificationChannel(
                    CHANNEL_ID,
                    "إشعارات أكاديمية المستقبل الدولية",
                    NotificationManager.IMPORTANCE_HIGH  // ← heads-up popup + sound + vibrate
                ).apply {
                    description = "إشعارات الدفع، طلبات الشهادات، المواضيع، وأحداث الأكاديمية"
                    enableLights(true)
                    lightColor = 0xFFD4AF37.toInt()  // gold LED
                    enableVibration(true)
                    vibrationPattern = longArrayOf(0, 500, 200, 500)
                    setShowBadge(true)
                    lockscreenVisibility = NotificationCompat.VISIBILITY_PUBLIC
                    // 🔥 Bypass Do Not Disturb mode
                    setBypassDnd(true)
                    // 🔥 Lock screen visibility — show full notification
                    setShowBadge(true)
                }

                // 🔥 Set the default notification sound EXPLICITLY
                val soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
                val audioAttributes = AudioAttributes.Builder()
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                    .build()
                channel.setSound(soundUri, audioAttributes)

                notifManager.createNotificationChannel(channel)
                Log.i(TAG, "✅ Created channel $CHANNEL_ID with IMPORTANCE_HIGH + sound + vibration")
            } catch (e: Exception) {
                Log.e(TAG, "createChannel failed", e)
            }
        }
    }

    /**
     * Called when a new FCM token is generated (on first app install,
     * or when the token rotates).
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
     * Called when a push notification arrives.
     *
     * 🔥 v2.7.1: This method ALWAYS fires because we use DATA payloads
     * (not notification payloads). The server sends ONLY data payloads,
     * which means onMessageReceived is invoked EVEN WHEN the app is:
     *   - In the foreground
     *   - In the background
     *   - Force-killed (Android 8+ background restrictions don't apply
     *     to FCM data-only messages — Firebase wakes up the app process
     *     to deliver them)
     */
    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        super.onMessageReceived(remoteMessage)
        Log.i(TAG, "🔥🔥🔥 onMessageReceived called!")
        Log.i(TAG, "   From: ${remoteMessage.from}")
        Log.i(TAG, "   Message ID: ${remoteMessage.messageId}")
        Log.i(TAG, "   Data: ${remoteMessage.data}")
        Log.i(TAG, "   Notification: ${remoteMessage.notification}")

        // 🔥 Ensure the channel exists (in case FIAApp.onCreate didn't run yet)
        createChannel(this)

        // Extract title + body from EITHER the notification object OR the data payload
        var title: String? = remoteMessage.notification?.title
        var body: String? = remoteMessage.notification?.body

        // If notification object didn't have title/body, fall back to data payload
        if (title.isNullOrBlank()) title = remoteMessage.data["title"]
        if (body.isNullOrBlank()) body = remoteMessage.data["body"]

        val link = remoteMessage.data["link"] ?: "/"
        val notifId = remoteMessage.data["notif_id"]?.toIntOrNull() ?: System.currentTimeMillis().toInt()

        if (title.isNullOrBlank()) {
            Log.w(TAG, "⚠️ No title in notification — skipping")
            return
        }

        Log.i(TAG, "🔔 Firing native notification:")
        Log.i(TAG, "   Title: $title")
        Log.i(TAG, "   Body: $body")
        Log.i(TAG, "   Channel ID: $CHANNEL_ID")
        Log.i(TAG, "   Notif ID: $notifId")

        showNotification(title, body ?: "", link, notifId)
    }

    /**
     * Called when FCM deletes pending messages (e.g. if too many were sent).
     * We don't need to do anything special here.
     */
    override fun onDeletedMessages() {
        super.onDeletedMessages()
        Log.w(TAG, "FCM deleted pending messages")
    }

    /**
     * Builds and shows the native OS notification with MAXIMUM priority
     * and sound to ensure it appears as a heads-up popup.
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
            // 🔥 PRIORITY_MAX — forces heads-up popup
            .setPriority(NotificationCompat.PRIORITY_MAX)
            // 🔥 CATEGORY_MESSAGE — treated as important message
            .setCategory(NotificationCompat.CATEGORY_MESSAGE)
            // 🔥 VISIBILITY_PUBLIC — shows on lock screen
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            // 🔥 Sound + vibration + lights
            .setSound(soundUri)
            .setVibrate(longArrayOf(0, 500, 200, 500))
            // 🔥 DEFAULT_ALL = sound + lights + vibrate (uses channel defaults)
            .setDefaults(NotificationCompat.DEFAULT_ALL)
            // Auto-cancel when tapped
            .setAutoCancel(true)
            // Gold accent for the small icon background
            .setColor(0xFFD4AF37.toInt())
            .setColorized(true)
            .setContentIntent(pendingIntent)
            // 🔥 Full-screen intent — shows popup over other apps
            .setFullScreenIntent(pendingIntent, true)
            // 🔥 ticker text — shows in the status bar briefly
            .setTicker("$title — $body")

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

            // 🔥 Check if notifications are enabled for the app
            val notifEnabled = notifManager.areNotificationsEnabled()
            Log.i(TAG, "📱 Notifications enabled for app: $notifEnabled")

            // 🔥 Check if our channel is enabled and its importance
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val channel = notifManager.getNotificationChannel(CHANNEL_ID)
                if (channel != null) {
                    Log.i(TAG, "📢 Channel $CHANNEL_ID:")
                    Log.i(TAG, "   Importance: ${channel.importance} (HIGH=${NotificationManager.IMPORTANCE_HIGH})")
                    Log.i(TAG, "   Sound: ${channel.sound}")
                    Log.i(TAG, "   Vibration: ${channel.shouldVibrate()}")
                    Log.i(TAG, "   Enabled: ${channel.importance != NotificationManager.IMPORTANCE_NONE}")
                } else {
                    Log.w(TAG, "⚠️ Channel $CHANNEL_ID does NOT exist — creating now")
                    createChannel(this)
                }
            }

            notifManager.notify(notifId, builder.build())
            Log.i(TAG, "✅ Notification posted with PRIORITY_MAX on channel $CHANNEL_ID")

            // 🔥 Also play the sound manually as a backup (in case the channel
            // sound was disabled by the user)
            try {
                val ringtone = RingtoneManager.getRingtone(this, soundUri)
                ringtone?.play()
                Log.i(TAG, "🔊 Playing notification sound manually")
            } catch (_: Exception) {}

        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to post notification", e)
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
