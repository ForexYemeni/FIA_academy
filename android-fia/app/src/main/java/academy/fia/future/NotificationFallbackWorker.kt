package academy.fia.future

import android.app.ActivityManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import java.util.concurrent.TimeUnit

/**
 * ============================================================================
 * NOTIFICATION FALLBACK WORKER (the key reliability fix)
 * ============================================================================
 *
 * WorkManager periodic worker that runs every 15 minutes (Android's minimum
 * interval for periodic work) to check if the NotificationPollService is
 * running. If not, it restarts it.
 *
 * WHY THIS IS NEEDED:
 * ===================
 * Even with START_STICKY + onTaskRemoved restart + BootReceiver, there are
 * scenarios where the foreground service dies and Android doesn't restart
 * it:
 *
 * 1. Battery optimization — some manufacturers (Xiaomi, Huawei, Samsung,
 *    Oppo) aggressively kill background services to save battery. The user
 *    has to manually whitelist the app, but most don't know how.
 *
 * 2. App force-stop via Settings — if the user force-stops the app from
 *    Settings → Apps → FIA Academy → Force Stop, ALL components stop
 *    including the foreground service AND START_STICKY won't restart it
 *    until the user manually opens the app again. (WorkManager also stops
 *    in this case, but at least it resumes when the user reopens the app.)
 *
 * 3. OS memory pressure — Android can kill the service to reclaim memory.
 *    START_STICKY should restart it, but on heavily modified Android
 *    versions (MIUI, EMUI) this doesn't always work.
 *
 * 4. Doze mode — Android 6+ puts the device into Doze mode when the screen
 *    is off and the device is stationary. Foreground services can still
 *    run, but their wake locks may be ignored. WorkManager respects Doze
 *    mode maintenance windows which are more reliable.
 *
 * WorkManager is Google's recommended way to run background work that
 * needs to be reliable. It survives app kills, device reboots, and is
 * optimized for battery. By combining the foreground service (for instant
 * 30-second polling) with WorkManager (for 15-minute fallback checks),
 * we get the best of both worlds.
 *
 * WORK SCHEDULE:
 * ==============
 * - Periodic: every 15 minutes (Android minimum)
 * - Constraints: network connected (we need internet to poll)
 * - Unique work name: "fia-notification-fallback" — only one instance
 *   runs at a time, replacing any existing schedule with the new one.
 * ============================================================================
 */
class NotificationFallbackWorker(
    context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {

    companion object {
        private const val TAG = "FIA-Fallback"
        private const val WORK_NAME = "fia-notification-fallback"

        /**
         * Schedules the periodic fallback worker. Should be called from
         * FIAApp.onCreate() so it's scheduled on every app launch.
         */
        fun schedule(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(androidx.work.NetworkType.CONNECTED)
                .build()
            val request = PeriodicWorkRequestBuilder<NotificationFallbackWorker>(
                15, TimeUnit.MINUTES
            )
                .setConstraints(constraints)
                .setInitialDelay(30, TimeUnit.SECONDS)  // delay first run by 30s
                .build()
            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                WORK_NAME,
                ExistingPeriodicWorkPolicy.UPDATE,  // replace existing schedule
                request
            )
            Log.i(TAG, "📅 Fallback worker scheduled (every 15 min)")
        }
    }

    override suspend fun doWork(): Result {
        return try {
            Log.d(TAG, "🔄 Fallback worker running — checking service status")
            val context = applicationContext

            // Check if user is logged in (don't start service if no user)
            val prefs = context.getSharedPreferences("fia-prefs", Context.MODE_PRIVATE)
            val userId = prefs.getString("user_id", null)
            if (userId.isNullOrBlank()) {
                Log.d(TAG, "No user_id in prefs — skipping service restart")
                return Result.success()
            }

            // Check if the foreground service is running
            if (!isServiceRunning(context, NotificationPollService::class.java)) {
                Log.i(TAG, "⚠️ NotificationPollService NOT running — restarting it")
                startPollingService(context)
            } else {
                Log.d(TAG, "✅ NotificationPollService is running — no action needed")
            }

            Result.success()
        } catch (e: Exception) {
            Log.e(TAG, "Fallback worker error", e)
            Result.retry()
        }
    }

    /**
     * Checks if a service is currently running. Uses getRunningServices
     * which is deprecated for cross-app queries but still works for
     * querying your own app's services.
     */
    @Suppress("DEPRECATION")
    private fun isServiceRunning(context: Context, serviceClass: Class<*>): Boolean {
        return try {
            val am = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
            am.getRunningServices(Int.MAX_VALUE)
                ?.any { it.service.className == serviceClass.name }
                ?: false
        } catch (e: Exception) {
            // If we can't check, assume it's running (safer — avoids
            // starting a duplicate service which would be wasteful but
            // not harmful).
            false
        }
    }

    /**
     * Starts the foreground polling service.
     */
    private fun startPollingService(context: Context) {
        try {
            val serviceIntent = Intent(context, NotificationPollService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent)
            } else {
                context.startService(serviceIntent)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start polling service", e)
            // On Android 12+, starting a foreground service from the
            // background is restricted. WorkManager has a special
            // exemption for "expedited work" but not for regular
            // foreground service starts. We'll retry on the next
            // periodic run.
        }
    }
}
