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
            // requires initWithContext + appId. Verbose logging is
            // disabled in production builds.
            OneSignal.initWithContext(this, ONESIGNAL_APP_ID)
            // Set log level to NONE in production. The OneSignal 5.x
            // SDK exposes log level via the `logLevel` property on the
            // `OneSignal.Log` companion (sometimes referenced as
            // `OneSignal.Debug.logLevel` in older 5.x versions). We
            // use a defensive try since the API has shifted across
            // minor versions.
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
