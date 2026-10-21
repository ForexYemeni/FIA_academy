package academy.fia.future

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.app.DownloadManager
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.provider.MediaStore
import android.util.Base64
import android.util.Log
import android.view.Gravity
import android.view.View
import android.webkit.*
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import java.io.File
import java.io.FileOutputStream
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private var loadingOverlay: FrameLayout? = null

    // File picker launcher — registered via the Activity Result API
    // (the deprecated startActivityForResult approach was buggy with
    // the system file picker on Android 13+).
    private lateinit var filePickerLauncher: ActivityResultLauncher<Intent>
    private var pendingFileCallback: ValueCallback<Array<Uri>>? = null
    private var pendingFileAccept: String = "*/*"

    // Permission request launcher — for storage permission (Android 9
    // and below) and POST_NOTIFICATIONS (Android 13+).
    private lateinit var permissionLauncher: ActivityResultLauncher<Array<String>>

    companion object {
        private const val HOME_URL = "https://fiaacademy.vercel.app"
        private const val TAG = "FIA-MainActivity"
        const val PREFS_NAME = "fia-prefs"
        private const val PREF_USER_ID = "user_id"
        private const val PREF_NOTIF_SEEN = "notif_seen_ids"
        // Storage permission code — for legacy Android 9 and below
        // where MediaStore still needs WRITE_EXTERNAL_STORAGE to write
        // to the public Pictures folder.
        private const val PERM_REQUEST_STORAGE = 0xA1

        // ⚡ Broadcast action — sent by NotificationPollService when a new
        // notification arrives. MainActivity listens for this and injects
        // JS into the WebView to instantly update the UI (toasts, badges,
        // payment status changes, enrollment list refresh, etc.).
        const val ACTION_NEW_NOTIFICATION = "academy.fia.future.NEW_NOTIFICATION"
        const val EXTRA_NOTIF_TITLE = "notif_title"
        const val EXTRA_NOTIF_BODY = "notif_body"
        const val EXTRA_NOTIF_LINK = "notif_link"
        const val EXTRA_NOTIF_TYPE = "notif_type"
    }

    /**
     * ⚡ BroadcastReceiver — listens for new notifications from
     * NotificationPollService. When received, injects JS into the WebView
     * to trigger instant UI updates without page reload.
     *
     * This is the bridge between the native Android notification system
     * and the web UI running inside the WebView. Without this, the user
     * sees a system notification but the web UI doesn't update until they
     * manually close and reopen the app.
     */
    private val notificationReceiver = object : android.content.BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            val title = intent?.getStringExtra(EXTRA_NOTIF_TITLE) ?: return
            val body = intent.getStringExtra(EXTRA_NOTIF_BODY) ?: ""
            val link = intent.getStringExtra(EXTRA_NOTIF_LINK) ?: "/"
            val type = intent.getStringExtra(EXTRA_NOTIF_TYPE) ?: "system"

            Log.d(TAG, "⚡ Received notification broadcast: $title")

            // Inject JavaScript into the WebView to update the UI instantly.
            // The JS dispatches a CustomEvent that the web app listens for
            // and triggers instant state refreshes.
            //
            // ⚠️ NOTE: We DON'T call window.__FIA_showToast here anymore.
            // The notifications-bell component already shows a toast + a
            // browser notification + plays a sound when it receives the
            // corresponding notification INSERT via Realtime. Calling
            // __FIA_showToast here too would cause DUPLICATE toasts.
            // We only dispatch the event to trigger data refreshes.
            runOnUiThread {
                try {
                    // Escape strings for safe JS injection
                    val safeTitle = title.replace("\\", "\\\\").replace("'", "\\'").replace("\n", "\\n").replace("\r", "\\r")
                    val safeBody = body.replace("\\", "\\\\").replace("'", "\\'").replace("\n", "\\n").replace("\r", "\\r")
                    val safeLink = link.replace("\\", "\\\\").replace("'", "\\'")
                    val safeType = type.replace("\\", "\\\\").replace("'", "\\'")

                    val js = """
                        (function() {
                          try {
                            var eventData = {
                              title: '$safeTitle',
                              body: '$safeBody',
                              link: '$safeLink',
                              type: '$safeType',
                              timestamp: Date.now()
                            };
                            // ⚡ Dispatch the event so dashboards can refresh
                            // their data INSTANTLY (payments, enrollments, etc.)
                            window.dispatchEvent(new CustomEvent('fia-native-notification', { detail: eventData }));
                            window.dispatchEvent(new Event('storage'));
                            // ⚡ Trigger a data refresh — this is the ONLY
                            // action we take; the notifications-bell handles
                            // showing the toast + browser notification via
                            // its own Realtime subscription.
                            if (window.__FIA_refreshActiveView) {
                                window.__FIA_refreshActiveView();
                            }
                          } catch(e) {
                            console.error('FIA native notification error:', e);
                          }
                        })();
                    """.trimIndent()
                    webView.evaluateJavascript(js, null)
                    Log.d(TAG, "⚡ Injected notification JS into WebView")
                } catch (e: Exception) {
                    Log.w(TAG, "Failed to inject notification JS", e)
                }
            }
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Build the UI programmatically — no layout XML needed, keeps
        // the APK small and the visual structure obvious.
        val root = FrameLayout(this).apply {
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
            setBackgroundColor(0xFF0A1F44.toInt()) // navy
        }

        // WebView — fills the entire screen
        webView = WebView(this).apply {
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
            visibility = View.INVISIBLE // hide until first render
        }
        root.addView(webView)

        // Loading overlay — premium design with REAL ANIMATIONS:
        // - Pulsing gold glow behind the logo (alpha animation)
        // - Rotating outer gold ring (rotating animation)
        // - Animated loading dots ("جاري التحميل" + dots that appear/disappear)
        // - Fade-in academy name
        // - Bottom slogan
        //
        // This is a complete redesign from the static "logo + name + spinner"
        // design that the user called "سيئة جداً جداً جداً جداً جداً جداً".
        // The new design uses:
        // - ObjectAnimator for the pulse + rotation animations
        // - Layered FrameLayouts for the ring + glow + logo stack
        // - A TextView with periodic text updates for the loading dots
        // - Better typography with shadows + letter spacing
        // - A subtle bottom-aligned slogan
        val density = resources.displayMetrics.density
        val dp = { v: Int -> (v * density).toInt() }

        // Root container with the navy gradient background
        val overlay = FrameLayout(this).apply {
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
            // Rich navy gradient — darker at edges, with subtle gold tint at center
            background = android.graphics.drawable.GradientDrawable(
                android.graphics.drawable.GradientDrawable.Orientation.TL_BR,
                intArrayOf(
                    0xFF06122E.toInt(),  // top-left: deep navy
                    0xFF0A1F44.toInt(),  // center: navy (academy color)
                    0xFF060F2E.toInt(),  // bottom-right: deeper navy
                    0xFF081A3C.toInt()   // subtle variation
                )
            )
        }

        // === Center container — holds the logo + rings + glow ===
        val centerContainer = FrameLayout(this).apply {
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT,
                Gravity.CENTER
            )
        }

        // === Layer 1: Pulsing gold glow behind the logo ===
        // A large oval with a radial gradient that pulses (alpha
        // animation 0.3 → 0.7 → 0.3 repeating) — creates a "breathing"
        // effect that makes the loading screen feel alive.
        val glowSize = dp(220)
        val glowView = View(this).apply {
            layoutParams = FrameLayout.LayoutParams(glowSize, glowSize, Gravity.CENTER)
            background = android.graphics.drawable.GradientDrawable().apply {
                shape = android.graphics.drawable.GradientDrawable.OVAL
                colors = intArrayOf(
                    0x40D4AF37.toInt(),  // center: subtle gold
                    0x20D4AF37.toInt(),  // mid
                    0x00D4AF37.toInt()   // edges: transparent
                )
                gradientType = android.graphics.drawable.GradientDrawable.RADIAL_GRADIENT
                gradientRadius = glowSize.toFloat() / 2
            }
            // Pulse animation: alpha 0.3 → 0.8 → 0.3, 1500ms, infinite
            alpha = 0.5f
        }
        centerContainer.addView(glowView)
        // Start the pulse animation
        val pulseAnim = android.animation.ObjectAnimator.ofFloat(glowView, "alpha", 0.3f, 0.85f, 0.3f).apply {
            duration = 1500
            repeatCount = android.animation.ObjectAnimator.INFINITE
            interpolator = android.view.animation.AccelerateDecelerateInterpolator()
            start()
        }

        // === Layer 2: Rotating outer gold ring (with gradient sweep) ===
        // A circle with a thick gold stroke that rotates slowly — creates
        // a "loading ring" effect that's much more engaging than a
        // standard ProgressBar spinner.
        val ringSize = dp(150)
        val rotatingRing = View(this).apply {
            layoutParams = FrameLayout.LayoutParams(ringSize, ringSize, Gravity.CENTER)
            background = android.graphics.drawable.GradientDrawable().apply {
                shape = android.graphics.drawable.GradientDrawable.OVAL
                // Use a sweep gradient via StrokeColor + multiple arcs
                // (we approximate via a single gold stroke — Android's
                // basic GradientDrawable doesn't support sweep gradients
                // directly, but the rotation animation makes it look
                // like a loading ring)
                setStroke(dp(3), 0xFFD4AF37.toInt())
                setColor(0x00000000)
            }
        }
        centerContainer.addView(rotatingRing)
        // Rotate animation: 360° in 2000ms, infinite linear
        val rotateAnim = android.animation.ObjectAnimator.ofFloat(rotatingRing, "rotation", 0f, 360f).apply {
            duration = 2000
            repeatCount = android.animation.ObjectAnimator.INFINITE
            interpolator = android.view.animation.LinearInterpolator()
            start()
        }

        // === Layer 3: Static inner gold ring ===
        // A thinner, brighter gold ring inside the rotating one — adds
        // depth without competing with the rotation.
        val innerRingSize = dp(140)
        val innerRing = View(this).apply {
            layoutParams = FrameLayout.LayoutParams(innerRingSize, innerRingSize, Gravity.CENTER)
            background = android.graphics.drawable.GradientDrawable().apply {
                shape = android.graphics.drawable.GradientDrawable.OVAL
                setStroke(dp(1), 0xFFE5C158.toInt())
                setColor(0x00000000)
            }
            alpha = 0.6f
        }
        centerContainer.addView(innerRing)

        // === Layer 4: A second inner ring (counterclockwise rotation) ===
        // Creates a "twin rings rotating opposite" effect — premium look.
        val ringSize2 = dp(125)
        val counterRing = View(this).apply {
            layoutParams = FrameLayout.LayoutParams(ringSize2, ringSize2, Gravity.CENTER)
            background = android.graphics.drawable.GradientDrawable().apply {
                shape = android.graphics.drawable.GradientDrawable.OVAL
                setStroke(dp(2), 0xFFD4AF37.toInt())
                setColor(0x00000000)
            }
            alpha = 0.4f
        }
        centerContainer.addView(counterRing)
        // Counterclockwise rotation
        val counterRotateAnim = android.animation.ObjectAnimator.ofFloat(counterRing, "rotation", 360f, 0f).apply {
            duration = 3000
            repeatCount = android.animation.ObjectAnimator.INFINITE
            interpolator = android.view.animation.LinearInterpolator()
            start()
        }

        // === Layer 5: The academy logo ===
        // Centered inside the rings, with elevation for depth.
        val logoSize = dp(90)
        val loadingLogo = ImageView(this).apply {
            layoutParams = FrameLayout.LayoutParams(logoSize, logoSize, Gravity.CENTER)
            setImageResource(R.mipmap.ic_launcher)
            scaleType = ImageView.ScaleType.FIT_CENTER
            background = null
            elevation = dp(10).toFloat()
        }
        centerContainer.addView(loadingLogo)
        // Logo fade-in (subtle, 800ms)
        loadingLogo.alpha = 0f
        loadingLogo.animate().alpha(1f).setDuration(800).start()

        overlay.addView(centerContainer)

        // === Layer 6: Text content (academy name + subtitle + loading text + slogan) ===
        val textContainer = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.WRAP_CONTENT,
                Gravity.CENTER_HORIZONTAL or Gravity.BOTTOM
            )
            gravity = Gravity.CENTER_HORIZONTAL
            setPadding(0, 0, 0, dp(80))
        }

        // Academy name in gold
        val nameText = TextView(this).apply {
            text = "أكاديمية المستقبل الدولية"
            textSize = 22f
            setTextColor(0xFFD4AF37.toInt())
            letterSpacing = 0.05f
            typeface = android.graphics.Typeface.create(android.graphics.Typeface.DEFAULT, android.graphics.Typeface.BOLD)
            setShadowLayer(12f, 0f, 3f, 0x66000000.toInt())
            gravity = Gravity.CENTER
            alpha = 0f
        }
        textContainer.addView(nameText)
        // Fade in name after 200ms
        nameText.animate().alpha(1f).setStartDelay(200).setDuration(600).start()

        // English subtitle
        val subText = TextView(this).apply {
            text = "FUTURE INTERNATIONAL ACADEMY"
            textSize = 9f
            setTextColor(0xFF8B7E3A.toInt())
            setPadding(0, dp(6), 0, 0)
            letterSpacing = 0.4f
            typeface = android.graphics.Typeface.create(android.graphics.Typeface.DEFAULT, android.graphics.Typeface.BOLD)
            gravity = Gravity.CENTER
            alpha = 0f
        }
        textContainer.addView(subText)
        subText.animate().alpha(1f).setStartDelay(400).setDuration(600).start()

        // Gold gradient divider
        val divider = View(this).apply {
            layoutParams = LinearLayout.LayoutParams(dp(60), dp(1)).apply {
                topMargin = dp(14)
                bottomMargin = dp(14)
                gravity = Gravity.CENTER
            }
            background = android.graphics.drawable.GradientDrawable(
                android.graphics.drawable.GradientDrawable.Orientation.LEFT_RIGHT,
                intArrayOf(0x00D4AF37.toInt(), 0xFFD4AF37.toInt(), 0x00D4AF37.toInt())
            )
            alpha = 0f
        }
        textContainer.addView(divider)
        divider.animate().alpha(1f).setStartDelay(600).setDuration(500).start()

        // Animated loading text — cycles through "جاري التحميل",
        // "جاري التحميل.", "جاري التحميل..", "جاري التحميل..."
        val loadingText = TextView(this).apply {
            text = "جاري التحميل"
            textSize = 12f
            setTextColor(0xFFD4AF37.toInt())
            setPadding(0, dp(2), 0, 0)
            letterSpacing = 0.1f
            typeface = android.graphics.Typeface.create(android.graphics.Typeface.DEFAULT, android.graphics.Typeface.NORMAL)
            gravity = Gravity.CENTER
            alpha = 0.7f
        }
        textContainer.addView(loadingText)
        // Animate the dots via a Runnable that updates the text every 500ms
        val dotsRunnable = object : Runnable {
            var count = 0
            override fun run() {
                val dots = ".".repeat(count % 4)
                loadingText.text = "جاري التحميل$dots"
                count++
                loadingText.postDelayed(this, 500)
            }
        }
        loadingText.postDelayed(dotsRunnable, 500)

        // Slogan
        val slogan = TextView(this).apply {
            text = "نحو مستقبل أفضل معاً"
            textSize = 11f
            setTextColor(0xFFD4AF37.toInt())
            setPadding(0, dp(20), 0, 0)
            letterSpacing = 0.1f
            typeface = android.graphics.Typeface.create(android.graphics.Typeface.DEFAULT, android.graphics.Typeface.ITALIC)
            gravity = Gravity.CENTER
            alpha = 0f
        }
        textContainer.addView(slogan)
        slogan.animate().alpha(0.85f).setStartDelay(800).setDuration(600).start()

        overlay.addView(textContainer)

        root.addView(overlay)
        loadingOverlay = overlay

        setContentView(root)

        // Register the file picker + permission launchers BEFORE
        // configuring the WebView (they need the activity context).
        filePickerLauncher = registerForActivityResult(
            ActivityResultContracts.StartActivityForResult()
        ) { result ->
            val cb = pendingFileCallback ?: return@registerForActivityResult
            pendingFileCallback = null
            if (result.resultCode == Activity.RESULT_OK && result.data != null) {
                val data = result.data ?: return@registerForActivityResult
                val uris: Array<Uri>? = when {
                    data.clipData != null -> {
                        // Multiple files selected
                        val count = data.clipData!!.itemCount
                        Array(count) { i -> data.clipData!!.getItemAt(i).uri }
                    }
                    data.data != null -> arrayOf(data.data!!)
                    else -> null
                }
                cb.onReceiveValue(uris)
            } else {
                cb.onReceiveValue(null)
            }
        }

        permissionLauncher = registerForActivityResult(
            ActivityResultContracts.RequestMultiplePermissions()
        ) { _ ->
            // Permission result — we don't gate any UX on it; the
            // saveImageToGallery call already toasts an error if it
            // can't save.
        }

        // Setup the WebView + the file picker + download listener
        setupWebView()

        // Handle back button — navigate WebView history instead of
        // exiting the app on every back press.
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) webView.goBack()
                else finish()
            }
        })

        // Start the notification poller (foreground service)
        try {
            val serviceIntent = Intent(this, NotificationPollService::class.java)
            ContextCompat.startForegroundService(this, serviceIntent)
        } catch (e: Exception) {
            Log.w(TAG, "Could not start poller service", e)
        }

        // ⚡ Register the BroadcastReceiver for new notifications.
        // When NotificationPollService detects a new notification, it
        // sends a broadcast that we receive here, then we inject JS
        // into the WebView to update the UI instantly.
        try {
            val filter = android.content.IntentFilter(ACTION_NEW_NOTIFICATION)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                registerReceiver(notificationReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
            } else {
                @Suppress("UnspecifiedRegisterReceiverFlag")
                registerReceiver(notificationReceiver, filter)
            }
            Log.d(TAG, "⚡ Notification receiver registered")
        } catch (e: Exception) {
            Log.w(TAG, "Failed to register notification receiver", e)
        }

        // Request POST_NOTIFICATIONS permission (Android 13+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED) {
                permissionLauncher.launch(arrayOf(Manifest.permission.POST_NOTIFICATIONS))
            }
        }

        // 🔥 KEY FIX: Request battery optimization exemption for reliable
        // background notifications. Without this, manufacturers like
        // Xiaomi/Huawei/Samsung/Oppo will kill the foreground service
        // after a few minutes when the screen is off.
        requestBatteryOptimizationExemption()
    }

    /**
     * 🔥 KEY FIX: Requests permission to ignore battery optimizations.
     *
     * Android 6+ has a feature called "Battery Optimization" that puts
     * apps into a deep sleep when the screen is off and the device is
     * stationary. This kills background services — including our
     * notification poller.
     *
     * To get reliable background notifications, we need the user to
     * whitelist our app from battery optimization. This shows a system
     * dialog asking the user to allow it.
     *
     * The dialog only appears ONCE per app install (we track it in
     * SharedPreferences). If the user denies, we don't ask again —
     * but the notifications will still work, just less reliably.
     */
    private fun requestBatteryOptimizationExemption() {
        try {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return

            val pm = getSystemService(Context.POWER_SERVICE) as android.os.PowerManager
            if (pm.isIgnoringBatteryOptimizations(packageName)) {
                Log.d(TAG, "✅ App already whitelisted from battery optimization")
                return
            }

            // Check if we already asked (don't spam the user)
            val prefs = getSharedPreferences("fia-prefs", Context.MODE_PRIVATE)
            val alreadyAsked = prefs.getBoolean("asked_battery_opt", false)
            if (alreadyAsked) {
                Log.d(TAG, "Already asked for battery opt exemption — skipping")
                return
            }
            prefs.edit().putBoolean("asked_battery_opt", true).apply()

            // Show the system dialog
            val intent = Intent(
                android.provider.Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS
            ).apply {
                data = android.net.Uri.parse("package:$packageName")
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            startActivity(intent)
            Log.i(TAG, "🔔 Requested battery optimization exemption")
        } catch (e: Exception) {
            Log.w(TAG, "Failed to request battery optimization exemption", e)
        }
    }

    /**
     * Local helper to show a toast on the UI thread. (Used by the
     * WebView download listener and the FIANativeBridge.)
     */
    private fun showToast(message: String, duration: String = "long") {
        val dur = if (duration == "long") Toast.LENGTH_LONG else Toast.LENGTH_SHORT
        runOnUiThread {
            Toast.makeText(this, message, dur).show()
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView() {
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = true
            allowContentAccess = true
            cacheMode = WebSettings.LOAD_DEFAULT
            useWideViewPort = true
            loadWithOverviewMode = true
            builtInZoomControls = false
            displayZoomControls = false
            mediaPlaybackRequiresUserGesture = false
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            // ⚡ Disable the text selection action mode (the floating
            // "Copy / Share / Select All" toolbar that appears when
            // the user long-presses any text in the WebView). This is
            // the system ActionMode that appears on top of the page
            // and looks ugly on a custom UI like FIA.
            //
            // Note: We disable it on the WebView level via
            // OnLongClickListener below. We DON'T disable selection
            // entirely (input/textarea still need it for text editing
            // — students need to copy course codes, certificate
            // numbers, etc.). We just hide the floating toolbar so
            // the user can long-press a button without triggering
            // the text selection menu.
        }

        // ⚡ Disable the long-press → text selection menu on the whole
        // WebView. The user reported that long-pressing ANY element
        // (button, label, card) shows the system's "Copy / Share /
        // Select All" floating toolbar. This is the standard Android
        // behavior, but it's confusing in a custom app where the user
        // just wants to tap a button — they don't expect a context
        // menu to appear.
        //
        // Returning true from onLongClick consumes the event,
        // preventing the WebView from firing the default long-press
        // behavior (which shows the text selection menu).
        //
        // For text selection that the user DOES want (e.g. copying
        // a certificate number), the web side has dedicated "Copy"
        // buttons (see certificate-viewer.tsx → copyCertNumber) that
        // use navigator.clipboard.writeText directly — those still
        // work because they're triggered by a normal click, not by
        // long-press.
        webView.setOnLongClickListener {
            // Returning true = consume the event = no default menu
            true
        }
        // Also disable the long-press haptic feedback so the device
        // doesn't vbrate when the user long-presses (gives away that
        // the WebView is consuming the event silently)
        webView.isLongClickable = false
        webView.isHapticFeedbackEnabled = false

        // === FIX 1: PROPER FILE PICKER ===
        // Previous APK used setType("*/*") for ALL file pick requests,
        // which meant the system showed the gallery for everything —
        // even when the user wanted to upload a PDF. The accept
        // attribute was passed but ignored.
        //
        // Fix: Use the accept attribute to set the proper MIME filter.
        // When accept has multiple types, use EXTRA_MIME_TYPES array.
        // Use Intent.ACTION_GET_CONTENT with category OPENABLE so
        // the system shows real file managers — not just the gallery.
        webView.webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                // Cancel any pending callback (the user might have
                // tapped twice in quick succession)
                pendingFileCallback?.onReceiveValue(null)
                pendingFileCallback = filePathCallback

                // Extract accept types from the params. We respect the
                // ACTUAL accept attribute here — this is the fix.
                val acceptTypes = fileChooserParams?.acceptTypes ?: arrayOf("*/*")
                pendingFileAccept = if (acceptTypes.isNotEmpty()) {
                    // Pick the first non-empty accept type. If multiple
                    // are specified, we use EXTRA_MIME_TYPES below.
                    val first = acceptTypes.firstOrNull { it.isNotEmpty() } ?: "*/*"
                    first
                } else "*/*"

                val intent = Intent(Intent.ACTION_GET_CONTENT).apply {
                    addCategory(Intent.CATEGORY_OPENABLE)
                    type = "*/*" // base type, will filter via EXTRA_MIME_TYPES
                    putExtra(Intent.EXTRA_ALLOW_MULTIPLE, fileChooserParams?.mode == FileChooserParams.MODE_OPEN_MULTIPLE)
                }

                // If accept has multiple types, use EXTRA_MIME_TYPES
                // (only the first type is set via setType; the rest go
                // into the extra). Filter out empty strings — the web
                // sometimes passes them.
                val nonEmptyTypes = acceptTypes.filter { it.isNotEmpty() }.toTypedArray()
                if (nonEmptyTypes.size > 1) {
                    intent.putExtra(Intent.EXTRA_MIME_TYPES, nonEmptyTypes)
                } else if (nonEmptyTypes.size == 1) {
                    // Single type — set via setType for the strictest
                    // filtering. The system file picker then shows
                    // only apps that handle this MIME type.
                    intent.type = nonEmptyTypes[0]
                }

                // For image-only accept, we ALSO add the camera capture
                // intent so the chooser shows "Camera" alongside the
                // gallery / file managers. This matches the standard
                // behavior users expect from `<input accept=image/*>`.
                val chooser: Intent
                if (pendingFileAccept.startsWith("image/")) {
                    val cameraIntent = Intent(MediaStore.ACTION_IMAGE_CAPTURE)
                    chooser = Intent.createChooser(intent, "اختر صورة")
                    chooser.putExtra(Intent.EXTRA_INITIAL_INTENTS, arrayOf(cameraIntent))
                } else if (pendingFileAccept.startsWith("video/")) {
                    val cameraIntent = Intent(MediaStore.ACTION_VIDEO_CAPTURE)
                    chooser = Intent.createChooser(intent, "اختر فيديو")
                    chooser.putExtra(Intent.EXTRA_INITIAL_INTENTS, arrayOf(cameraIntent))
                } else {
                    chooser = Intent.createChooser(intent, "اختر ملف")
                }

                try {
                    filePickerLauncher.launch(chooser)
                } catch (e: Exception) {
                    Log.e(TAG, "File picker failed to launch", e)
                    pendingFileCallback?.onReceiveValue(null)
                    pendingFileCallback = null
                    return false
                }
                return true
            }
        }

        // === FIX 2: DOWNLOAD LISTENER ===
        // The previous APK had NO DownloadListener. When the web code
        // called `window.open()` on a URL with Content-Disposition:
        // attachment, the WebView silently ignored it — the file never
        // reached the device's gallery or Downloads folder.
        //
        // Fix: Register a DownloadManager request for any URL the
        // WebView wants to download. This handles:
        // - blob: URLs (we get the bytes via the URL)
        // - data: URLs (we decode the base64)
        // - https: URLs (we pass to DownloadManager directly)
        //
        // DownloadManager is the official Android API for downloading
        // files to the public Downloads/Media folders. It shows a
        // system download notification, fires a notification when done,
        // and indexes the file into MediaStore → it shows up in the
        // Gallery app and the Files/Downloads folder.
        webView.setDownloadListener { url, userAgent, contentDisposition, mimeType, size ->
            try {
                val decodedUrl = url
                val filename = if (contentDisposition.isNotEmpty()) {
                    // Parse filename from Content-Disposition header
                    val regex = Regex("""filename="?([^";\n]+)"?""")
                    val match = regex.find(contentDisposition)
                    match?.groupValues?.get(1)?.trim() ?: generateFilename(mimeType)
                } else {
                    generateFilename(mimeType)
                }

                // For https URLs, use DownloadManager directly — it
                // handles redirects, retries, and downloads to the
                // public Downloads folder.
                if (decodedUrl.startsWith("http://") || decodedUrl.startsWith("https://")) {
                    val request = DownloadManager.Request(Uri.parse(decodedUrl)).apply {
                        setMimeType(mimeType)
                        setTitle(filename)
                        setDescription("FIA Academy download")
                        // Save to the public Downloads folder — on
                        // Android 10+ uses scoped storage via
                        // setDestinationUri to a MediaStore path.
                        // On Android 9 and below, requires
                        // WRITE_EXTERNAL_STORAGE permission.
                        if (mimeType.startsWith("image/")) {
                            // Image — save to Pictures/FIA
                            setDestinationInExternalPublicDir(
                                Environment.DIRECTORY_PICTURES,
                                "FIA/$filename"
                            )
                            // Allow MediaStore to index it into Gallery
                            allowScanningByMediaScanner()
                        } else {
                            // Other files — save to Downloads
                            setDestinationInExternalPublicDir(
                                Environment.DIRECTORY_DOWNLOADS,
                                "FIA/$filename"
                            )
                        }
                        setNotificationVisibility(
                            DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED
                        )
                    }
                    val dm = getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
                    dm.enqueue(request)
                    showToast("جاري تنزيل $filename ...", "long")
                } else if (decodedUrl.startsWith("data:")) {
                    // Data URL — decode base64 and save via MediaStore
                    saveDataUrlToGallery(decodedUrl, mimeType, filename)
                } else if (decodedUrl.startsWith("blob:")) {
                    // Blob URLs can't be opened by DownloadManager.
                    // Instead, the web side should call
                    // FIANativeBridge.saveImageToGallery(base64, filename)
                    // for blob data. For now, fall back to opening the
                    // blob URL in the system browser.
                    showToast("لا يمكن تنزيل هذا الملف مباشرة — جاري الفتح في المتصفح", "long")
                    try {
                        val browserIntent = Intent(Intent.ACTION_VIEW, Uri.parse(decodedUrl))
                        startActivity(browserIntent)
                    } catch (e: Exception) {
                        showToast("فشل فتح الملف", "long")
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Download failed", e)
                showToast("فشل التنزيل: ${e.message}", "long")
            }
        }

        // WebViewClient — handles page lifecycle + deep-link navigation
        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                // Hide the loading overlay once the first page renders
                val overlay = loadingOverlay
                if (overlay != null && overlay.visibility == View.VISIBLE) {
                    overlay.animate()
                        .alpha(0f)
                        .setDuration(400)
                        .withEndAction {
                            overlay.visibility = View.GONE
                            webView.visibility = View.VISIBLE
                        }
                        .start()
                }

                // Deep link handling — if the URL has a hash (#courses,
                // #payments, etc.), inject JS that clicks the matching
                // nav button after the page settles.
                url?.let {
                    if (it.contains("#")) {
                        val hash = it.substringAfter("#", "")
                        if (hash.isNotEmpty()) {
                            webView.postDelayed({
                                webView.evaluateJavascript(
                                    """
                                    (function() {
                                      try {
                                        var labels = {
                                          'overview': ['نظرة عامة', 'الإحصائيات'],
                                          'courses': ['دوراتي', 'الدورات'],
                                          'payments': ['مدفوعاتي', 'المدفوعات'],
                                          'profile': ['ملفي الشخصي', 'الحساب'],
                                          'notifications': ['الإشعارات'],
                                          'forum': ['المنتدى'],
                                          'blog': ['المدونة'],
                                          'faqs': ['الأسئلة الشائعة'],
                                          'affiliate': ['برنامج العمولة', 'المسوّقون'],
                                          'founder': ['المؤسس والفريق']
                                        };
                                        var hashParts = hash.split('?')[0].split('&');
                                        var target = hashParts[0];
                                        var candidates = labels[target] || [target];
                                        var btns = document.querySelectorAll('nav button, button');
                                        for (var i = 0; i < btns.length; i++) {
                                          var t = btns[i].textContent.trim();
                                          for (var j = 0; j < candidates.length; j++) {
                                            if (t.indexOf(candidates[j]) === 0 || t === candidates[j]) {
                                              btns[i].click();
                                              return;
                                            }
                                          }
                                        }
                                      } catch(e) {}
                                    })();
                                    """.trimIndent(),
                                    null
                                )
                            }, 2500)
                        }
                    }
                }
            }

            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val url = request?.url ?: return false
                // Keep all FIA URLs in the WebView
                if (url.toString().contains("fiaacademy.vercel.app")) return false
                // External URLs → open in system browser
                try {
                    val browserIntent = Intent(Intent.ACTION_VIEW, url)
                    startActivity(browserIntent)
                } catch (_: Exception) {}
                return true
            }
        }

        // Inject the JS bridge so the web can call showToast, vibrate,
        // getDeviceId, getAppVersionName, getAppVersionCode, AND the
        // new saveImageToGallery / savePdfToDownloads methods.
        webView.addJavascriptInterface(FIANativeBridge(this), "FIANativeBridge")

        // Load the home URL
        webView.loadUrl(HOME_URL)
    }

    private fun generateFilename(mimeType: String): String {
        val ext = when {
            mimeType.contains("png") -> "png"
            mimeType.contains("jpeg") || mimeType.contains("jpg") -> "jpg"
            mimeType.contains("webp") -> "webp"
            mimeType.contains("pdf") -> "pdf"
            mimeType.contains("mp4") -> "mp4"
            mimeType.isEmpty() -> "bin"
            else -> "bin"
        }
        val timestamp = SimpleDateFormat("yyyyMMdd-HHmmss", Locale.US).format(Date())
        return "FIA-$timestamp.$ext"
    }

    /**
     * Saves a data: URL (base64-encoded file) to the public Pictures
     * gallery using MediaStore. Works on Android 10+ via scoped storage
     * and on Android 9 and below via direct file write.
     */
    private fun saveDataUrlToGallery(dataUrl: String, mimeType: String, filename: String) {
        try {
            // Parse data URL: "data:image/png;base64,<base64-bytes>"
            val commaIdx = dataUrl.indexOf(',')
            if (commaIdx < 0) {
                showToast("رابط البيانات غير صالح", "long")
                return
            }
            val header = dataUrl.substring(0, commaIdx)
            val base64Data = dataUrl.substring(commaIdx + 1)
            val detectedMime = if (header.contains(":")) {
                header.substringAfter(":").substringBefore(";")
            } else mimeType
            val bytes = Base64.decode(base64Data, Base64.DEFAULT)

            val resolver = contentResolver
            val finalFilename = filename.ifEmpty { generateFilename(detectedMime) }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                // Android 10+ — use MediaStore via scoped storage
                val collection = MediaStore.Images.Media.EXTERNAL_CONTENT_URI
                val values = ContentValues().apply {
                    put(MediaStore.Images.Media.DISPLAY_NAME, finalFilename)
                    put(MediaStore.Images.Media.MIME_TYPE, detectedMime)
                    put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/FIA")
                    put(MediaStore.Images.Media.IS_PENDING, 1)
                }
                val uri = resolver.insert(collection, values)
                if (uri != null) {
                    resolver.openOutputStream(uri)?.use { os ->
                        os.write(bytes)
                        os.flush()
                    }
                    values.clear()
                    values.put(MediaStore.Images.Media.IS_PENDING, 0)
                    resolver.update(uri, values, null, null)
                    showToast("تم حفظ الصورة في المعرض ✓", "long")
                } else {
                    showToast("فشل حفظ الصورة", "long")
                }
            } else {
                // Android 9 and below — direct file write (needs
                // WRITE_EXTERNAL_STORAGE permission)
                if (ContextCompat.checkSelfPermission(this, Manifest.permission.WRITE_EXTERNAL_STORAGE)
                    != PackageManager.PERMISSION_GRANTED) {
                    ActivityCompat.requestPermissions(this,
                        arrayOf(Manifest.permission.WRITE_EXTERNAL_STORAGE),
                        PERM_REQUEST_STORAGE)
                    showToast("يلزم إذن التخزين — أعد المحاولة بعد الموافقة", "long")
                    return
                }
                val picturesDir = File(
                    Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES),
                    "FIA"
                ).apply { mkdirs() }
                val file = File(picturesDir, finalFilename)
                FileOutputStream(file).use { fos ->
                    fos.write(bytes)
                    fos.flush()
                }
                // Trigger MediaScanner so the image appears in gallery
                val scanIntent = Intent(Intent.ACTION_MEDIA_SCANNER_SCAN_FILE)
                scanIntent.data = Uri.fromFile(file)
                sendBroadcast(scanIntent)
                showToast("تم حفظ الصورة في المعرض ✓", "long")
            }
        } catch (e: Exception) {
            Log.e(TAG, "saveDataUrlToGallery failed", e)
            showToast("فشل حفظ الصورة: ${e.message}", "long")
        }
    }

    /**
     * Public accessor so the FIANativeBridge can call back into this
     * activity to save base64-encoded images to the gallery.
     */
    fun saveBase64ImageToGallery(base64Data: String, mimeType: String, filename: String): Boolean {
        try {
            val bytes = Base64.decode(base64Data, Base64.DEFAULT)
            val resolver = contentResolver
            val finalFilename = filename.ifEmpty { generateFilename(mimeType) }
            val isImage = mimeType.startsWith("image/")

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                val collection = if (isImage) {
                    MediaStore.Images.Media.EXTERNAL_CONTENT_URI
                } else {
                    MediaStore.Files.getContentUri("external")
                }
                val values = ContentValues().apply {
                    put(MediaStore.MediaColumns.DISPLAY_NAME, finalFilename)
                    put(MediaStore.MediaColumns.MIME_TYPE, mimeType)
                    if (isImage) {
                        put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/FIA")
                    } else {
                        put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/FIA")
                    }
                    put(MediaStore.MediaColumns.IS_PENDING, 1)
                }
                val uri = resolver.insert(collection, values)
                if (uri != null) {
                    resolver.openOutputStream(uri)?.use { os ->
                        os.write(bytes)
                        os.flush()
                    }
                    values.clear()
                    values.put(MediaStore.MediaColumns.IS_PENDING, 0)
                    resolver.update(uri, values, null, null)
                    return true
                }
                return false
            } else {
                if (ContextCompat.checkSelfPermission(this, Manifest.permission.WRITE_EXTERNAL_STORAGE)
                    != PackageManager.PERMISSION_GRANTED) {
                    ActivityCompat.requestPermissions(this,
                        arrayOf(Manifest.permission.WRITE_EXTERNAL_STORAGE),
                        PERM_REQUEST_STORAGE)
                    return false
                }
                val dir = if (isImage) {
                    File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES), "FIA")
                } else {
                    File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), "FIA")
                }
                dir.mkdirs()
                val file = File(dir, finalFilename)
                FileOutputStream(file).use { fos ->
                    fos.write(bytes)
                    fos.flush()
                }
                val scanIntent = Intent(Intent.ACTION_MEDIA_SCANNER_SCAN_FILE)
                scanIntent.data = Uri.fromFile(file)
                sendBroadcast(scanIntent)
                return true
            }
        } catch (e: Exception) {
            Log.e(TAG, "saveBase64ImageToGallery failed", e)
            return false
        }
    }

    override fun onResume() {
        super.onResume()
        // Resume the WebView (paused in onPause)
        webView.onResume()
    }

    override fun onPause() {
        webView.onPause()
        super.onPause()
    }

    override fun onDestroy() {
        // ⚡ Unregister the notification receiver to prevent leaks
        try {
            unregisterReceiver(notificationReceiver)
        } catch (_: Exception) {}

        // Clean up the WebView — important to prevent memory leaks
        // (WebView can hold references and leak the activity)
        try {
            webView.removeAllViews()
            webView.destroy()
        } catch (_: Exception) {}
        super.onDestroy()
    }
}

/**
 * JS bridge exposed as window.FIANativeBridge inside the WebView.
 *
 * Methods (all annotated @JavascriptInterface so they're callable from JS):
 * - showToast(message, duration) — native Android Toast
 * - vibrate(pattern) — small vibration for haptic feedback
 * - getDeviceId() — unique device ID (for push notif targeting)
 * - getAppVersionName() — "2.3.3"
 * - getAppVersionCode() — 15
 * - saveImageToGallery(base64, mimeType, filename) — saves a base64-
 *   encoded image directly to the public Pictures/FIA folder via
 *   MediaStore. Returns true on success, false on failure.
 * - savePdfToDownloads(base64, filename) — saves a base64-encoded PDF
 *   to the Downloads/FIA folder.
 */
class FIANativeBridge(private val activity: MainActivity) {

    @JavascriptInterface
    fun showToast(message: String, duration: String) {
        val dur = if (duration == "long") Toast.LENGTH_LONG else Toast.LENGTH_SHORT
        activity.runOnUiThread {
            Toast.makeText(activity, message, dur).show()
        }
    }

    @JavascriptInterface
    fun vibrate(pattern: String) {
        try {
            val v = activity.getSystemService(Context.VIBRATOR_SERVICE) as android.os.Vibrator
            // Simple 50ms single vibration. The pattern argument is
            // currently unused but kept for forward compatibility.
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                v.vibrate(android.os.VibrationEffect.createOneShot(50, android.os.VibrationEffect.DEFAULT_AMPLITUDE))
            } else {
                @Suppress("DEPRECATION")
                v.vibrate(50)
            }
        } catch (_: Exception) {}
    }

    @JavascriptInterface
    fun getDeviceId(): String {
        // Stable per-app device ID — based on the ANDROID_ID which
        // resets only on factory reset. Used as the OneSignal external
        // user ID for targeted push.
        return try {
            val prefs = activity.getSharedPreferences(MainActivity.PREFS_NAME, Context.MODE_PRIVATE)
            val cached = prefs.getString("device_id", null)
            if (cached != null) cached
            else {
                val androidId = android.provider.Settings.Secure.getString(
                    activity.contentResolver,
                    android.provider.Settings.Secure.ANDROID_ID
                ) ?: "fia-" + System.currentTimeMillis()
                prefs.edit().putString("device_id", androidId).apply()
                androidId
            }
        } catch (_: Exception) { "fia-unknown" }
    }

    @JavascriptInterface
    fun getAppVersionName(): String {
        return try {
            val pInfo = activity.packageManager.getPackageInfo(activity.packageName, 0)
            pInfo.versionName ?: "2.3.3"
        } catch (_: Exception) { "2.3.3" }
    }

    @JavascriptInterface
    fun getAppVersionCode(): Int {
        return try {
            val pInfo = activity.packageManager.getPackageInfo(activity.packageName, 0)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) pInfo.longVersionCode.toInt()
            else @Suppress("DEPRECATION") pInfo.versionCode
        } catch (_: Exception) { 18 }
    }

    /**
     * Saves a base64-encoded image to the device's gallery (Pictures/FIA).
     * Called from JS as:
     *   window.FIANativeBridge.saveImageToGallery(b64, 'image/png', 'FIA-cert.png')
     * Returns true on success, false on failure.
     */
    @JavascriptInterface
    fun saveImageToGallery(base64Data: String, mimeType: String, filename: String): Boolean {
        return activity.saveBase64ImageToGallery(base64Data, mimeType, filename)
    }

    /**
     * ⚡ Chunked save for large images/PDFs. Android's
     * @JavascriptInterface has a practical limit on String argument
     * size (~1-2MB). Large PNG files (>3MB base64) can be truncated
     * or fail silently. This method receives the data as a JSON
     * array of base64 chunks, concatenates them, then saves the
     * full base64 string.
     *
     * Called from JS as:
     *   bridge.saveImageToGalleryChunked(JSON.stringify(chunks), 'image/png', filename)
     */
    @JavascriptInterface
    fun saveImageToGalleryChunked(chunksJson: String, mimeType: String, filename: String): Boolean {
        try {
            val chunks = org.json.JSONArray(chunksJson)
            val sb = StringBuilder()
            for (i in 0 until chunks.length()) {
                sb.append(chunks.getString(i))
            }
            return activity.saveBase64ImageToGallery(sb.toString(), mimeType, filename)
        } catch (e: Exception) {
            android.util.Log.e("FIA-Bridge", "saveImageToGalleryChunked failed", e)
            return false
        }
    }

    /**
     * Saves a base64-encoded PDF to the device's Downloads folder.
     */
    @JavascriptInterface
    fun savePdfToDownloads(base64Data: String, filename: String): Boolean {
        return activity.saveBase64ImageToGallery(base64Data, "application/pdf", filename)
    }

    /**
     * ⚡ Chunked save for large PDFs.
     * Same concept as saveImageToGalleryChunked.
     */
    @JavascriptInterface
    fun savePdfToDownloadsChunked(chunksJson: String, filename: String): Boolean {
        try {
            val chunks = org.json.JSONArray(chunksJson)
            val sb = StringBuilder()
            for (i in 0 until chunks.length()) {
                sb.append(chunks.getString(i))
            }
            return activity.saveBase64ImageToGallery(sb.toString(), "application/pdf", filename)
        } catch (e: Exception) {
            android.util.Log.e("FIA-Bridge", "savePdfToDownloadsChunked failed", e)
            return false
        }
    }

    /**
     * Called from JS when the user logs in (or app starts and the
     * user is already logged in via the web's localStorage auth
     * store). Sets the OneSignal external_id so the server-side
     * sendPushNotification(userId, ...) call (from the web's
     * /api/notifications and notifyX helpers) actually reaches
     * THIS device.
     *
     * Also writes the user_id to SharedPreferences so the
     * NotificationPollService can fetch notifications for this
     * user (the polling fallback that fires native OS notifications
     * even when OneSignal push isn't configured).
     *
     * Called from JS as:
     *   window.FIANativeBridge.setUserId(user.id)
     */
    @JavascriptInterface
    fun setUserId(userId: String) {
        try {
            // 1. Write to SharedPreferences so the polling service
            //    (NotificationPollService) can read it on the next
            //    poll cycle (within 5 seconds).
            val prefs = activity.getSharedPreferences(MainActivity.PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit().putString("user_id", userId).apply()

            // 2. Login to OneSignal with the user's external_id.
            //    This is the CRITICAL step that links this device's
            //    OneSignal subscription to the user_id on the server.
            //    Without this, the server-side call to
            //    OneSignal's API with `external_user_id: userId`
            //    never reaches this device — the push has no
            //    subscription to deliver to.
            //
            // OneSignal 5.x SDK: OneSignal.login(externalId) is
            // the recommended way. It creates a OneSignal user
            // (if not exists) and links this device's subscription
            // to that user. Subsequent pushes with external_user_id
            // will reach this device even if the app is force-killed.
            com.onesignal.OneSignal.login(userId)
            android.util.Log.i("FIA-Bridge", "OneSignal login successful for user: $userId")
        } catch (e: Exception) {
            android.util.Log.w("FIA-Bridge", "setUserId failed", e)
        }
    }

    /**
     * Called from JS when the user logs out. Clears the user_id
     * from SharedPreferences and logs out of OneSignal so the
     * device stops receiving notifications for the previous user.
     */
    @JavascriptInterface
    fun clearUserId() {
        try {
            val prefs = activity.getSharedPreferences(MainActivity.PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit().remove("user_id").apply()
            // OneSignal 5.x: logout() removes the external_id
            // association. The device keeps its subscription but
            // no longer receives pushes targeted to the previous
            // external_id.
            com.onesignal.OneSignal.logout()
            android.util.Log.i("FIA-Bridge", "OneSignal logout successful")
        } catch (e: Exception) {
            android.util.Log.w("FIA-Bridge", "clearUserId failed", e)
        }
    }
}
