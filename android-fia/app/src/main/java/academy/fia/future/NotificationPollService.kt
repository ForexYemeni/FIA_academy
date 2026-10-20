package academy.fia.future

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.media.RingtoneManager
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import android.util.Log
import androidx.core.app.NotificationCompat
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

/**
 * Foreground service that polls /api/notifications every 5 seconds
 * for new items, then fires a native OS notification for each new one.
 *
 * Why polling instead of FCM/OneSignal realtime?
 * - The web backend doesn't support FCM topics per user reliably yet
 * - Polling is more reliable for low-volume notification needs
 * - 5s interval is light on the server (one HTTP call per user every
 *   5s; for ~100 users that's 20 req/s which Supabase handles easily)
 *
 * The service is START_STICKY so Android restarts it if killed. The
 * first poll after start marks ALL existing notification IDs as
 * "seen" so the user doesn't get spammed with old notifications when
 * they re-open the app.
 */
class NotificationPollService : Service() {

    companion object {
        private const val TAG = "FIA-PollService"
        private const val CHANNEL_SERVICE = "fia-service"
        private const val CHANNEL_NOTIFICATIONS = "fia-notifications"
        private const val NOTIF_SERVICE_ID = 1
        private const val POLL_INTERVAL_MS = 30000L  // 30 seconds — balance between responsiveness and battery
        private const val PREFS_NAME = "fia-prefs"
        private const val PREF_USER_ID = "user_id"
        private const val PREF_SEEN_IDS = "notif_seen_ids"
        private const val API_BASE = "https://fiaacademy.vercel.app"
    }

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var wakeLock: PowerManager.WakeLock? = null
    private var prefs: SharedPreferences? = null
    private var firstPoll = true

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        createNotificationChannels()
        // Acquire a partial wake lock so the service keeps polling
        // even when the device screen is off (and the CPU would
        // otherwise sleep). We DON'T keep the device awake indefinitely
        // — the wake lock is held only while we're actively polling,
        // which is a few hundred ms every 5s.
        val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
        wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "FIA:poller")
        wakeLock?.acquire(10 * 60 * 1000L) // 10 minutes, then re-acquire
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        try {
            // Start foreground IMMEDIATELY — required by Android 14+
            // for dataSync services. Otherwise the system kills the
            // service within 5 seconds.
            val notif = buildServiceNotification()
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                startForeground(NOTIF_SERVICE_ID, notif, android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
            } else {
                startForeground(NOTIF_SERVICE_ID, notif)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start foreground", e)
        }

        // Launch the polling loop
        scope.launch {
            while (true) {
                try {
                    pollOnce()
                } catch (e: Exception) {
                    Log.w(TAG, "Poll error", e)
                }
                delay(POLL_INTERVAL_MS)
            }
        }

        // START_STICKY — Android restarts the service if killed
        return START_STICKY
    }

    private fun pollOnce() {
        val userId = prefs?.getString(PREF_USER_ID, null) ?: run {
            Log.d(TAG, "No user_id in prefs — skipping poll (user not logged in)")
            return
        }
        val seenIds = getSeenIds()
        val url = URL("$API_BASE/api/notifications?user_id=$userId")
        try {
            val conn = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "GET"
                connectTimeout = 8000
                readTimeout = 8000
                setRequestProperty("Accept", "application/json")
                setRequestProperty("Cache-Control", "no-cache")
            }
            val code = conn.responseCode
            if (code != 200) {
                Log.w(TAG, "Poll returned HTTP $code — will retry on next poll")
                return
            }
            val body = conn.inputStream.bufferedReader().use { it.readText() }
            conn.disconnect()
            if (body.isEmpty() || body[0] != '[') {
                Log.d(TAG, "Poll body is not a JSON array — skipping")
                return
            }
            val arr = org.json.JSONArray(body)
            // ⚡ Mark only OLD notifications (older than 5 minutes) as
            // seen on the first poll. This avoids spamming the user
            // with all the backlog of old chat messages when they re-
            // open the app, BUT still fires a notification for any
            // notification that was created within the last 5 minutes
            // (e.g. an admin just approved a payment 1 minute ago).
            //
            // The previous logic (mark ALL as seen on first poll) was
            // too aggressive — it meant if the admin created a
            // notification while the user's app was closed, and the
            // user reopened the app later, the notification would be
            // silently swallowed without ever being shown to the
            // user. This was the root cause of "لايوصل اي اشعارات
            // منبثقة خارج التطبيق ابدا".
            if (firstPoll) {
                Log.d(TAG, "First poll: marking notifications older than 5 min as seen")
                val fiveMinAgo = System.currentTimeMillis() - (5 * 60 * 1000)
                for (i in 0 until arr.length()) {
                    val n = arr.optJSONObject(i)
                    val id = n?.optString("id") ?: continue
                    val createdAt = n.optString("created_at", "")
                    // Try to parse the ISO timestamp
                    val createdAtMs = try {
                        // Parse "2026-10-21T12:34:56.789+00:00" format
                        val cleaned = createdAt.replace("Z", "+00:00").substring(0, 19)
                        val sdf = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", java.util.Locale.US)
                        sdf.timeZone = java.util.TimeZone.getTimeZone("UTC")
                        sdf.parse(cleaned)?.time ?: 0L
                    } catch (_: Exception) { 0L }
                    if (createdAtMs > 0 && createdAtMs < fiveMinAgo) {
                        seenIds.add(id)
                    }
                }
                saveSeenIds(seenIds)
                firstPoll = false
                // ⚡ Don't return — continue to fire notifications for
                // any new (recent) items not in seenIds.
            }
            // Fire a native notification for each new item we haven't
            // seen yet.
            var newCount = 0
            for (i in 0 until arr.length()) {
                val n = arr.optJSONObject(i) ?: continue
                val id = n.optString("id")
                if (id.isEmpty() || seenIds.contains(id)) continue
                seenIds.add(id)
                val title = n.optString("title", "إشعار جديد")
                val body = n.optString("body", "")
                val link = n.optString("link", "/")
                Log.d(TAG, "🔔 Firing native notification: $title")
                fireNotification(title, body, link)
                newCount++
            }
            if (newCount > 0) {
                saveSeenIds(seenIds)
                Log.d(TAG, "Fired $newCount new notifications")
            } else {
                Log.d(TAG, "No new notifications this poll (already seen all)")
            }
        } catch (e: Exception) {
            Log.w(TAG, "Poll network error: ${e.message}")
            // Network error — silent, will retry on next poll
        }
    }

    private fun fireNotification(title: String, body: String, link: String) {
        val notifManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        // ⚡ USER REQUESTED: NO in-app toasts. ONLY external native OS
        // notifications. We ALWAYS fire the native notification, even
        // when the app is in the foreground or fully closed.
        //
        // We also DON'T broadcast to MainActivity anymore — the
        // notifications-bell component no longer shows an in-app toast
        // (per user's explicit request). So the broadcast would just
        // be wasted work + could cause UI jitter (the bell counter
        // updates from Realtime subscription already).

        // Deep-link intent — opens MainActivity with the hash URL
        val intent = Intent(this, MainActivity::class.java).apply {
            data = android.net.Uri.parse("$API_BASE$link")
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            this, System.currentTimeMillis().toInt(), intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val sound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
        // ⚡ Premium custom notification with custom layout —
        // matches the magical navy/gold theme of the in-app toast.
        // We use a RemoteViews with a custom layout (notification_fia.xml)
        // to render the icon with a gradient + the title + body in a
        // beautiful card-style layout, instead of the default Android
        // notification style.
        val customLayout = try {
            android.widget.RemoteViews(packageName, R.layout.notification_fia)
        } catch (e: Exception) {
            null
        }

        val notif = NotificationCompat.Builder(this, CHANNEL_NOTIFICATIONS)
            .setSmallIcon(R.drawable.ic_notification)  // white bell — proper Android notification icon
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_MESSAGE)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setSound(sound)
            .setVibrate(longArrayOf(0, 250, 100, 250))
            .setAutoCancel(true)
            .setColor(0xFFD4AF37.toInt())  // gold accent for the small icon background
            .setColorized(true)
            .setContentIntent(pendingIntent)
            .apply {
                if (customLayout != null) {
                    setCustomContentView(customLayout)
                    setCustomBigContentView(customLayout)
                    // ⚡ Set the title + body into the custom layout
                    customLayout.setTextViewText(R.id.notif_title, title)
                    customLayout.setTextViewText(R.id.notif_body, body)
                    customLayout.setTextViewText(R.id.notif_app_name, "أكاديمية المستقبل الدولية")
                    // Set the icon — use a colored version of the bell icon
                    customLayout.setImageViewResource(R.id.notif_icon, R.drawable.ic_notification)
                    // Apply gold tint to the icon
                    customLayout.setInt(R.id.notif_icon_container, "setBackgroundColor", 0xFFD4AF37.toInt())
                }
            }
            .build()

        try {
            notifManager.notify(System.currentTimeMillis().toInt(), notif)
        } catch (e: Exception) {
            Log.w(TAG, "Failed to post notification", e)
        }
    }

    /**
     * ⚡ Checks if the app is currently in the foreground (visible to
     * the user). Used to decide whether to fire a native OS notification
     * — if the app is visible, the in-app toast is enough (we don't
     * want both firing, causing duplicates).
     */
    private fun isAppInForeground(): Boolean {
        return try {
            val activityManager = getSystemService(Context.ACTIVITY_SERVICE) as android.app.ActivityManager
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val processes = activityManager.runningAppProcesses
                val myPid = android.os.Process.myPid()
                processes?.any {
                    it.pid == myPid && it.importance == android.app.ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND
                } ?: false
            } else {
                // Fallback for old Android: check the top running task
                @Suppress("DEPRECATION")
                val tasks = activityManager.getRunningTasks(1)
                tasks?.isNotEmpty() == true && tasks[0].topActivity?.packageName == packageName
            }
        } catch (e: Exception) {
            // If anything fails, assume background (safer — we'd rather
            // show a duplicate than miss a notification)
            false
        }
    }

    private fun getSeenIds(): MutableSet<String> {
        val raw = prefs?.getString(PREF_SEEN_IDS, "") ?: ""
        return raw.split(",").filter { it.isNotEmpty() }.toMutableSet()
    }

    private fun saveSeenIds(ids: Set<String>) {
        // Cap at the last 200 IDs to avoid unbounded growth
        val truncated = if (ids.size > 200) ids.toList().subList(ids.size - 200, ids.size) else ids.toList()
        prefs?.edit()?.putString(PREF_SEEN_IDS, truncated.joinToString(","))?.apply()
    }

    private fun buildServiceNotification(): Notification {
        // Foreground service notification — Android 14+ requires a
        // notification for dataSync services. We make it MIN priority
        // so it doesn't make a sound, doesn't show in the lock screen
        // as a popup, and just sits quietly in the notification shade.
        //
        // The icon is a small white bell (ic_notification vector drawable)
        // instead of the full-color launcher icon — Android tints small
        // notification icons to white-on-transparent automatically, so
        // using the launcher icon (which has gold + navy + cream colors)
        // looked pixelated and broken in the status bar.
        return NotificationCompat.Builder(this, CHANNEL_SERVICE)
            .setSmallIcon(R.drawable.ic_notification)  // white bell — proper Android notification icon
            .setContentTitle("FIA Academy")
            .setContentText("الإشعارات مُفعّلة")
            .setPriority(NotificationCompat.PRIORITY_MIN)
            .setShowWhen(false)
            .setOngoing(true)
            .setColor(0xFFD4AF37.toInt())  // gold accent for the small icon background
            .setColorized(false)
            .build()
    }

    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val notifManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            // Channel 1 — silent foreground service notification.
            // Required by Android 14+ for dataSync services but should
            // be invisible to the user (no sound, no popup, just sits
            // quietly in the shade).
            val serviceChannel = NotificationChannel(
                CHANNEL_SERVICE,
                "خدمة الإشعارات",
                NotificationManager.IMPORTANCE_MIN
            ).apply {
                description = "تبقيك على اطلاع بتحديثات الأكاديمية في الخلفية"
                setShowBadge(false)
                setSound(null, null)
                enableVibration(false)
                lockscreenVisibility = NotificationCompat.VISIBILITY_SECRET
            }
            notifManager.createNotificationChannel(serviceChannel)

            // Channel 2 — actual notifications (popup + sound + vibrate).
            // This is what users see when they get a new notification.
            val notifChannel = NotificationChannel(
                CHANNEL_NOTIFICATIONS,
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
            notifManager.createNotificationChannel(notifChannel)
        }
    }

    override fun onDestroy() {
        try { wakeLock?.release() } catch (_: Exception) {}
        scope.cancel()
        super.onDestroy()
    }
}
