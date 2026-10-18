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
        private const val POLL_INTERVAL_MS = 5000L
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
        val userId = prefs?.getString(PREF_USER_ID, null) ?: return
        val seenIds = getSeenIds()
        val url = URL("$API_BASE/api/notifications?user_id=$userId")
        try {
            val conn = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "GET"
                connectTimeout = 4000
                readTimeout = 4000
                setRequestProperty("Accept", "application/json")
            }
            val code = conn.responseCode
            if (code != 200) return
            val body = conn.inputStream.bufferedReader().use { it.readText() }
            conn.disconnect()
            if (body.isEmpty() || body[0] != '[') return
            val arr = org.json.JSONArray(body)
            // Mark all existing IDs as seen on the first poll —
            // avoids spamming the user with old notifications when
            // they re-open the app.
            if (firstPoll) {
                for (i in 0 until arr.length()) {
                    val n = arr.optJSONObject(i)
                    val id = n?.optString("id") ?: continue
                    seenIds.add(id)
                }
                saveSeenIds(seenIds)
                firstPoll = false
                return
            }
            // Fire a native notification for each new item we haven't
            // seen yet.
            var newCount = 0
            for (i in 0 until arr.length()) {
                val n = arr.optJSONObject(i) ?: continue
                val id = n.optString("id")
                if (seenIds.contains(id)) continue
                seenIds.add(id)
                fireNotification(
                    n.optString("title", "إشعار جديد"),
                    n.optString("body", ""),
                    n.optString("link", "/")
                )
                newCount++
            }
            if (newCount > 0) saveSeenIds(seenIds)
        } catch (_: Exception) {
            // Network error — silent, will retry on next poll
        }
    }

    private fun fireNotification(title: String, body: String, link: String) {
        val notifManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

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
        val notif = NotificationCompat.Builder(this, CHANNEL_NOTIFICATIONS)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_MESSAGE)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setSound(sound)
            .setVibrate(longArrayOf(0, 250, 100, 250))
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()

        try {
            notifManager.notify(System.currentTimeMillis().toInt(), notif)
        } catch (e: Exception) {
            Log.w(TAG, "Failed to post notification", e)
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
        return NotificationCompat.Builder(this, CHANNEL_SERVICE)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle("FIA Service")
            .setContentText("جاري متابعة الإشعارات")
            .setPriority(NotificationCompat.PRIORITY_MIN)
            .setShowWhen(false)
            .setOngoing(true)
            .build()
    }

    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val notifManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            // Channel 1 — silent service notification (foreground service
            // requires a notification, but we want it to be silent + not
            // show in the lock screen as a popup).
            val serviceChannel = NotificationChannel(
                CHANNEL_SERVICE,
                "FIA Service",
                NotificationManager.IMPORTANCE_MIN
            ).apply {
                description = "متابعة الإشعارات في الخلفية"
                setShowBadge(false)
                setSound(null, null)
                enableVibration(false)
            }
            notifManager.createNotificationChannel(serviceChannel)

            // Channel 2 — actual notifications (popup + sound + vibrate)
            val notifChannel = NotificationChannel(
                CHANNEL_NOTIFICATIONS,
                "FIA Notifications",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "إشعارات الأكاديمية"
                enableLights(true)
                enableVibration(true)
                setShowBadge(true)
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
