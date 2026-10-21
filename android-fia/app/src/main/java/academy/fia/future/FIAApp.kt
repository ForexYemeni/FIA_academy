package academy.fia.future

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import android.util.Log
import androidx.work.Configuration
import androidx.work.WorkManager
import com.onesignal.OneSignal

/**
 * ============================================================================
 * FIA ACADEMY — APPLICATION CLASS (RELIABLE NOTIFICATIONS EDITION)
 * ============================================================================
 *
 * Initializes:
 * 1. OneSignal SDK for instant push notifications (even when app is killed)
 * 2. WorkManager for the NotificationFallbackWorker
 * 3. Notification channels
 * 4. Schedules the fallback worker so it runs every 15 minutes to restart
 *    the polling service if it's been killed
 *
 * The fallback worker is THE KEY FIX that makes notifications reliable
 * even when:
 * - User swipes the app away from recents
 * - Manufacturer's battery optimizer kills the service
 * - OS kills the service for memory pressure
 * - App is force-stopped and then reopened
 * ============================================================================
 */
class FIAApp : Application(), Configuration.Provider {

    companion object {
        private const val ONESIGNAL_APP_ID = "957cba56-ba48-479e-9e43-1e506d30dc10"
        private const val TAG = "FIAApp"
    }

    /**
     * WorkManager Configuration — make FIAApp the work manager
     * configuration provider so we control initialization.
     */
    override val workManagerConfiguration: Configuration
        get() = Configuration.Builder()
            .setMinimumLoggingLevel(android.util.Log.INFO)
            .build()

    override fun onCreate() {
        super.onCreate()
        try {
            // Initialize WorkManager (using our custom Configuration).
            // In Application class, WorkManager.initialize is called
            // automatically when Configuration.Provider is implemented.
            Log.i(TAG, "🚀 FIAApp onCreate — initializing notification systems")

            // Create notification channels early so they exist when
            // the service starts.
            createNotificationChannels()

            // Initialize OneSignal
            try {
                OneSignal.initWithContext(this, ONESIGNAL_APP_ID)
                // Verbose logging disabled in production
                try {
                    val logClass = Class.forName("com.onesignal.Debug")
                    val logLevelEnum = Class.forName("com.onesignal.Debug\$LogLevel")
                    val noneVal = logLevelEnum.enumConstants?.firstOrNull {
                        (it as Enum<*>).name == "NONE"
                    }
                    if (noneVal != null) {
                        val field = logClass.getDeclaredField("logLevel")
                        field.isAccessible = true
                        field.set(null, noneVal)
                    }
                } catch (_: Throwable) {}
                Log.i(TAG, "✅ OneSignal initialized with appId: $ONESIGNAL_APP_ID")
            } catch (e: Exception) {
                Log.w(TAG, "OneSignal init failed", e)
            }

            // Schedule the fallback worker — runs every 15 min to check
            // if the polling service is alive, restarts it if not.
            try {
                NotificationFallbackWorker.schedule(this)
                Log.i(TAG, "✅ Notification fallback worker scheduled")
            } catch (e: Exception) {
                Log.w(TAG, "Failed to schedule fallback worker", e)
            }

            // Try to start the polling service immediately on app launch.
            // The service will check if a user_id is set in SharedPreferences
            // and only poll if logged in.
            try {
                val prefs = getSharedPreferences("fia-prefs", Context.MODE_PRIVATE)
                val userId = prefs.getString("user_id", null)
                if (!userId.isNullOrBlank()) {
                    val serviceIntent = android.content.Intent(this, NotificationPollService::class.java)
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        startForegroundService(serviceIntent)
                    } else {
                        startService(serviceIntent)
                    }
                    Log.i(TAG, "✅ Notification poll service started on app launch (user_id=$userId)")
                } else {
                    Log.d(TAG, "No user_id in prefs — service will start after login")
                }
            } catch (e: Exception) {
                Log.w(TAG, "Failed to start polling service on launch", e)
            }
        } catch (e: Exception) {
            Log.e(TAG, "FIAApp onCreate failed", e)
        }
    }

    /**
     * Creates the notification channels early so they exist when the
     * service or any notification poster needs them.
     */
    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        try {
            val notifManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            // Channel 1 — silent foreground service notification
            val serviceChannel = NotificationChannel(
                "fia-service",
                "خدمة الإشعارات",
                NotificationManager.IMPORTANCE_MIN
            ).apply {
                description = "تبقيك على اطلاع بتحديثات الأكاديمية في الخلفية"
                setShowBadge(false)
                setSound(null, null)
                enableVibration(false)
                lockscreenVisibility = android.app.Notification.VISIBILITY_SECRET
            }
            notifManager.createNotificationChannel(serviceChannel)

            // Channel 2 — actual notifications (popup + sound + vibrate)
            val notifChannel = NotificationChannel(
                "fia-notifications-v3",
                "إشعارات أكاديمية المستقبل الدولية",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "إشعارات الدفع، طلبات الشهادات، المواضيع، وأحداث الأكاديمية"
                enableLights(true)
                lightColor = 0xFFD4AF37.toInt()
                enableVibration(true)
                setShowBadge(true)
                lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
            }
            notifManager.createNotificationChannel(notifChannel)
        } catch (e: Exception) {
            Log.w(TAG, "createNotificationChannels failed", e)
        }
    }
}
