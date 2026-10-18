package academy.fia.future

import android.app.Application
import com.onesignal.OneSignal

/**
 * Application class — initializes OneSignal SDK with the appId from
 * the live site (957cba56-ba48-479e-9e43-1e506d30dc10).
 *
 * OneSignal provides instant external OS-level push notifications
 * even when the app is force-killed. We use the OneSignal "external
 * user ID" feature to target notifications per-user (the web side
 * sends the user.id from the auth store as the external_id).
 *
 * CRITICAL: In OneSignal 5.x SDK, the proper flow is:
 *   1. initWithContext(appId) — initializes the SDK
 *   2. login(externalId) — registers the device with the user's
 *      external ID, so the server can target pushes to this user
 *
 * Step 2 happens when FIANativeBridge.setUserId(userId) is called
 * by the web side after the user logs in. Without step 2, pushes
 * sent with `external_user_id` from the web server never reach
 * this device — they have no OneSignal subscription to deliver to.
 */
class FIAApp : Application() {
    companion object {
        private const val ONESIGNAL_APP_ID = "957cba56-ba48-479e-9e43-1e506d30dc10"
        private const val TAG = "FIAApp"
    }

    override fun onCreate() {
        super.onCreate()
        try {
            // Initialize OneSignal. We use the latest 5.x SDK which
            // requires initWithContext + appId.
            OneSignal.initWithContext(this, ONESIGNAL_APP_ID)
            // Verbose logging is disabled in production builds.
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
            } catch (_: Throwable) {
                // Logging setup is optional — the SDK works without it.
            }
        } catch (e: Exception) {
            android.util.Log.w(TAG, "OneSignal init failed", e)
        }
    }
}
