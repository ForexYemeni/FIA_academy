package academy.fia.future

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build

/**
 * Restart the NotificationPollService after device reboot or app
 * update. Without this, the user would silently stop getting
 * notifications until they manually open the app.
 */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        when (intent.action) {
            Intent.ACTION_BOOT_COMPLETED,
            Intent.ACTION_MY_PACKAGE_REPLACED -> {
                try {
                    val serviceIntent = Intent(context, NotificationPollService::class.java)
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        context.startForegroundService(serviceIntent)
                    } else {
                        context.startService(serviceIntent)
                    }
                } catch (_: Exception) {
                    // Boot completed may arrive before the system
                    // is ready to start foreground services. The user
                    // opening the app will trigger the service anyway.
                }
            }
        }
    }
}
