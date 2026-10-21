package academy.fia.future

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import android.util.Log
import androidx.work.Configuration
import com.google.firebase.FirebaseApp
import com.google.firebase.messaging.FirebaseMessaging

/**
 * ============================================================================
 * FIA ACADEMY — APPLICATION CLASS (FIREBASE CLOUD MESSAGING EDITION)
 * ============================================================================
 *
 * Initializes:
 * 1. Firebase App (auto-initializes from google-services.json)
 * 2. Firebase Cloud Messaging — registers the device for FCM push
 *    notifications. The token is delivered via
 *    FIAFirebaseMessagingService.onNewToken().
 * 3. WorkManager for the NotificationFallbackWorker (backup polling)
 * 4. Notification channels (for the FCM service + the polling fallback)
 * 5. Schedules the fallback worker so it runs every 15 minutes to restart
 *    the polling service if it's been killed
 * 6. Auto-starts the polling service on app launch (as a backup to FCM)
 *
 * NO OneSignal — we use Firebase directly. The OneSignal SDK has been
 * completely removed from the dependencies. This eliminates the need
 * for the OneSignal dashboard configuration (which was the root cause
 * of the previous push notification failure).
 *
 * PUSH NOTIFICATION FLOW:
 * =======================
 * 1. App starts → Firebase SDK generates an FCM token
 * 2. FIAFirebaseMessagingService.onNewToken saves the token to
 *    SharedPreferences
 * 3. When the user logs in (MainActivity.FIANativeBridge.setUserId),
 *    the bridge also sends the FCM token to the server via
 *    /api/fcm/register?user_id=...&token=...
 * 4. Server stores the token in the fcm_tokens table
 * 5. When the server wants to notify the user, it calls Firebase Admin
 *    SDK's messaging().send() with the user's token
 * 6. Firebase delivers the push to this device — even if the app is
 *    fully closed/force-killed
 * 7. FIAFirebaseMessagingService.onMessageReceived fires — we show
 *    the native OS notification
 * ============================================================================
 */
class FIAApp : Application(), Configuration.Provider {

    companion object {
        private const val TAG = "FIAApp"
    }

    override val workManagerConfiguration: Configuration
        get() = Configuration.Builder()
            .setMinimumLoggingLevel(Log.INFO)
            .build()

    override fun onCreate() {
        super.onCreate()
        try {
            Log.i(TAG, "🚀 FIAApp onCreate — initializing Firebase + notification systems")

            // 1) Create notification channels early so they exist when
            //    the FCM service or polling service needs them.
            createNotificationChannels()

            // 2) Initialize Firebase (auto via google-services plugin).
            //    FirebaseApp.initializeApp is auto-called by the
            //    google-services plugin's ContentProvider. We just
            //    verify it's ready.
            try {
                FirebaseApp.initializeApp(this)
                Log.i(TAG, "✅ Firebase initialized")
            } catch (e: Exception) {
                Log.w(TAG, "Firebase init failed", e)
            }

            // 3) Schedule the WorkManager fallback — checks every 15 min
            //    if the polling service is alive, restarts if not.
            try {
                NotificationFallbackWorker.schedule(this)
                Log.i(TAG, "✅ Notification fallback worker scheduled")
            } catch (e: Exception) {
                Log.w(TAG, "Failed to schedule fallback worker", e)
            }

            // 4) Try to start the polling service immediately on app
            //    launch as a BACKUP to FCM. The polling service will
            //    check if a user_id is set in SharedPreferences and only
            //    poll if logged in.
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

            // 5) Proactively request the FCM token. This will trigger
            //    onNewToken if it hasn't been generated yet. Otherwise
            //    it returns the existing token.
            try {
                FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
                    if (task.isSuccessful) {
                        val token = task.result
                        Log.i(TAG, "🔥 FCM Token: ${token.take(20)}...")
                        // Save to prefs so MainActivity can send it after login
                        val prefs = getSharedPreferences("fia-prefs", Context.MODE_PRIVATE)
                        prefs.edit().putString("fcm_token", token).apply()
                        // If user is logged in, send the token to the server
                        val userId = prefs.getString("user_id", null)
                        if (!userId.isNullOrBlank()) {
                            sendTokenToServer(userId, token)
                        }
                    } else {
                        Log.w(TAG, "Failed to get FCM token", task.exception)
                    }
                }
            } catch (e: Exception) {
                Log.w(TAG, "Failed to request FCM token", e)
            }
        } catch (e: Exception) {
            Log.e(TAG, "FIAApp onCreate failed", e)
        }
    }

    /**
     * Sends the FCM token to the server via HTTP POST. Done in the
     * background to not block the main thread.
     */
    private fun sendTokenToServer(userId: String, token: String) {
        Thread {
            try {
                val url = java.net.URL("https://fiaacademy.vercel.app/api/fcm/register")
                val conn = (url.openConnection() as java.net.HttpURLConnection).apply {
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
                Log.w(TAG, "sendTokenToServer error", e)
            }
        }.start()
    }

    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        try {
            val notifManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            // Channel 1 — silent foreground service notification (for polling)
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
            // This is the channel used by BOTH:
            //   - FIAFirebaseMessagingService (FCM pushes)
            //   - NotificationPollService (polling fallback)
            val notifChannel = NotificationChannel(
                "fia-notifications-v4",  // NEW channel ID — clean state, fresh IMPORTANCE_HIGH
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
