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
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import org.json.JSONArray
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.TimeZone

/**
 * ============================================================================
 * FIA ACADEMY — RELIABLE BACKGROUND NOTIFICATION SERVICE
 * ============================================================================
 *
 * Foreground service that polls /api/notifications every 30 seconds for new
 * items, then fires a native OS notification for each new one.
 *
 * RELIABILITY FEATURES (the key fix):
 * ===================================
 * 1. onTaskRemoved — restarts the service when the user swipes the app
 *    away from the recents list. This is the #1 reason notifications
 *    stop working — Android kills the foreground service when the task
 *    is removed.
 *
 * 2. START_STICKY — Android restarts the service if the system kills
 *    it for memory pressure. The OS will recreate it with a null intent.
 *
 * 3. Wake lock with periodic re-acquire — keeps the CPU awake during
 *    polling even when the screen is off. We re-acquire every 5 minutes
 *    to prevent Android from complaining about long-held wake locks.
 *
 * 4. BootReceiver — restarts the service after device reboot.
 *
 * 5. WorkManager fallback (NotificationFallbackWorker) — schedules a
 *    periodic 15-minute check that re-starts the foreground service
 *    if it's not running. This catches cases where the OS has killed
 *    both the service AND the app process.
 *
 * 6. First-poll grace period — only marks notifications older than 30s
 *    as "seen" so the user doesn't get spammed with old items, but
 *    real new ones (that arrived while the app was closed) DO fire.
 *
 * NOTIFICATION BEHAVIOR:
 * =======================
 * - ALWAYS fires the native OS notification (popup + sound + vibrate),
 *   even when the app is in the foreground.
 * - No in-app toast duplication (the bell counter updates via Supabase
 *   Realtime separately).
 * - Custom layout (notification_fia.xml) for premium look matching the
 *   navy/gold theme.
 * - Deep-link via PendingIntent — opens the notification's link in
 *   MainActivity when tapped.
 * ============================================================================
 */
class NotificationPollService : Service() {

    companion object {
        private const val TAG = "FIA-PollService"
        private const val CHANNEL_SERVICE = "fia-service"
        private const val CHANNEL_NOTIFICATIONS = "fia-notifications-v5"  // 🔥 v2.6.1: aligned with FIAFirebaseMessagingService
        private const val NOTIF_SERVICE_ID = 1
        private const val POLL_INTERVAL_MS = 10_000L  // 10 seconds (was 30s — faster delivery)
        private const val WAKELOCK_TIMEOUT_MS = 5 * 60 * 1000L  // 5 minutes, then re-acquire
        private const val PREFS_NAME = "fia-prefs"
        private const val PREF_USER_ID = "user_id"
        private const val PREF_SEEN_IDS = "notif_seen_ids"
        private const val API_BASE = "https://fiaacademy.vercel.app"

        /**
         * Checks whether the service is currently running. Used by
         * NotificationFallbackWorker to decide whether to restart it.
         */
        fun isRunning(context: Context): Boolean {
            return try {
                val am = context.getSystemService(Context.ACTIVITY_SERVICE) as android.app.ActivityManager
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    // Use getRunningServices (deprecated but still works for own app)
                    // Fallback to checking our own process importance
                    val myPid = android.os.Process.myPid()
                    am.runningAppProcesses?.any {
                        it.pid == myPid && it.importance <= android.app.ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND_SERVICE
                    } ?: false
                } else {
                    @Suppress("DEPRECATION")
                    am.getRunningServices(Int.MAX_VALUE)?.any {
                        it.service.className == NotificationPollService::class.java.name
                    } ?: false
                }
            } catch (_: Exception) {
                false
            }
        }
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
        // otherwise sleep). We re-acquire periodically (see onStartCommand).
        val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
        wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "FIA:poller")
        try {
            wakeLock?.acquire(WAKELOCK_TIMEOUT_MS)
        } catch (e: Exception) {
            Log.w(TAG, "Wake lock acquire failed", e)
        }
        Log.i(TAG, "✅ NotificationPollService created")
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
            // If startForeground fails, the service will be killed —
            // return START_STICKY so Android tries to restart it.
            return START_STICKY
        }

        // Re-acquire wake lock if expired
        try {
            if (wakeLock?.isHeld != true) {
                wakeLock?.acquire(WAKELOCK_TIMEOUT_MS)
            }
        } catch (_: Exception) {}

        // Launch the polling loop
        scope.launch {
            // Fire the first poll IMMEDIATELY — catches any notifications
            // that arrived while the app was closed.
            try {
                pollOnce()
            } catch (e: Exception) {
                Log.w(TAG, "First poll error", e)
            }
            // Continuous polling loop
            while (true) {
                try {
                    // Re-acquire wake lock periodically
                    try {
                        if (wakeLock?.isHeld != true) {
                            wakeLock?.acquire(WAKELOCK_TIMEOUT_MS)
                        }
                    } catch (_: Exception) {}
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

    /**
     * 🔥 KEY FIX: Called when the user swipes the app away from recents.
     * Android kills the foreground service when the task is removed.
     * We restart the service after a short delay so notifications keep
     * working even after the user swipes the app away.
     */
    override fun onTaskRemoved(rootIntent: Intent?) {
        Log.i(TAG, "🔄 Task removed — scheduling service restart")
        val restartIntent = Intent(applicationContext, NotificationPollService::class.java)
        restartIntent.action = "RESTART_SERVICE"
        val pendingIntent = PendingIntent.getService(
            applicationContext, 1, restartIntent,
            PendingIntent.FLAG_ONE_SHOT or PendingIntent.FLAG_IMMUTABLE
        )
        val alarmManager = getSystemService(Context.ALARM_SERVICE) as android.app.AlarmManager
        val triggerAt = System.currentTimeMillis() + 1000  // 1 second delay
        try {
            alarmManager.set(
                android.app.AlarmManager.ELAPSED_REALTIME_WAKEUP,
                triggerAt,
                pendingIntent
            )
        } catch (e: Exception) {
            Log.w(TAG, "AlarmManager set failed", e)
        }
        super.onTaskRemoved(rootIntent)
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
            val arr = JSONArray(body)
            // Mark OLD notifications as seen on first poll (so the user
            // doesn't get spammed with backlog when they re-open the app).
            // 30 seconds grace period — real new notifications (arrived
            // while app was closed) WILL fire.
            if (firstPoll) {
                Log.d(TAG, "First poll: marking notifications older than 30s as seen")
                val thirtySecAgo = System.currentTimeMillis() - (30 * 1000)
                for (i in 0 until arr.length()) {
                    val n = arr.optJSONObject(i) ?: continue
                    val id = n.optString("id")
                    if (id.isEmpty()) continue
                    val createdAt = n.optString("created_at", "")
                    val createdAtMs = try {
                        val cleaned = createdAt.replace("Z", "+00:00").substring(0, 19)
                        val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US)
                        sdf.timeZone = TimeZone.getTimeZone("UTC")
                        sdf.parse(cleaned)?.time ?: 0L
                    } catch (_: Exception) { 0L }
                    if (createdAtMs > 0 && createdAtMs < thirtySecAgo) {
                        seenIds.add(id)
                    }
                }
                saveSeenIds(seenIds)
                firstPoll = false
            }
            // Fire a native notification for each new item we haven't seen
            var newCount = 0
            for (i in 0 until arr.length()) {
                val n = arr.optJSONObject(i) ?: continue
                val id = n.optString("id")
                if (id.isEmpty() || seenIds.contains(id)) continue
                seenIds.add(id)
                val title = n.optString("title", "إشعار جديد")
                val notifBody = n.optString("body", "")
                val link = n.optString("link", "/")
                Log.d(TAG, "🔔 Firing native notification: $title")
                fireNotification(title, notifBody, link)
                newCount++
            }
            if (newCount > 0) {
                saveSeenIds(seenIds)
                Log.d(TAG, "Fired $newCount new notifications")
            }
        } catch (e: Exception) {
            Log.w(TAG, "Poll network error: ${e.message}")
        }
    }

    private fun fireNotification(title: String, body: String, link: String) {
        val notifManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        // Deep-link intent — opens MainActivity with the notification URL
        val intent = Intent(this, MainActivity::class.java).apply {
            data = android.net.Uri.parse("$API_BASE$link")
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            this, System.currentTimeMillis().toInt(), intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val sound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
        // Premium custom notification with custom layout
        val customLayout = try {
            android.widget.RemoteViews(packageName, R.layout.notification_fia)
        } catch (_: Exception) {
            null
        }

        val builder = NotificationCompat.Builder(this, CHANNEL_NOTIFICATIONS)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            // 🔥 PRIORITY_MAX for heads-up popup
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_MESSAGE)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setSound(sound)
            .setVibrate(longArrayOf(0, 500, 200, 500))
            // 🔥 DEFAULT_ALL = sound + lights + vibrate
            .setDefaults(NotificationCompat.DEFAULT_ALL)
            .setAutoCancel(true)
            .setColor(0xFFD4AF37.toInt())
            .setColorized(true)
            .setContentIntent(pendingIntent)
            // 🔥 Full-screen intent forces popup above other apps
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
            notifManager.notify(System.currentTimeMillis().toInt(), builder.build())
        } catch (e: Exception) {
            Log.w(TAG, "Failed to post notification", e)
        }
    }

    private fun getSeenIds(): MutableSet<String> {
        val raw = prefs?.getString(PREF_SEEN_IDS, "") ?: ""
        return raw.split(",").filter { it.isNotEmpty() }.toMutableSet()
    }

    private fun saveSeenIds(ids: Set<String>) {
        // Cap at last 200 IDs to avoid unbounded growth
        val truncated = if (ids.size > 200) ids.toList().subList(ids.size - 200, ids.size) else ids.toList()
        prefs?.edit()?.putString(PREF_SEEN_IDS, truncated.joinToString(","))?.apply()
    }

    private fun buildServiceNotification(): Notification {
        return NotificationCompat.Builder(this, CHANNEL_SERVICE)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle("FIA Academy")
            .setContentText("الإشعارات مُفعّلة")
            .setPriority(NotificationCompat.PRIORITY_MIN)
            .setShowWhen(false)
            .setOngoing(true)
            .setColor(0xFFD4AF37.toInt())
            .setColorized(false)
            .build()
    }

    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val notifManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            // Channel 1 — silent foreground service notification
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

            // Channel 2 — actual notifications (popup + sound + vibrate)
            val notifChannel = NotificationChannel(
                CHANNEL_NOTIFICATIONS,
                "إشعارات أكاديمية المستقبل الدولية",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "إشعارات الدفع، طلبات الشهادات، المواضيع، وأحداث الأكاديمية"
                enableLights(true)
                lightColor = 0xFFD4AF37.toInt()
                enableVibration(true)
                setShowBadge(true)
                lockscreenVisibility = NotificationCompat.VISIBILITY_PUBLIC
            }
            notifManager.createNotificationChannel(notifChannel)
        }
    }

    override fun onDestroy() {
        Log.i(TAG, "⚠️ NotificationPollService destroyed")
        try { wakeLock?.release() } catch (_: Exception) {}
        scope.cancel()
        super.onDestroy()
    }
}
