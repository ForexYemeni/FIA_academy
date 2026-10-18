/**
 * Certificate download helper — works in regular browsers AND in the
 * FIA Academy Android APK (which wraps the site in a WebView).
 *
 * THE PROBLEM
 * ==========
 * The previous flow used `window.open(pngUrl, '_blank')`. In a browser
 * this opens a new tab where the user can long-press → save. In the
 * Android WebView, however, `window.open()` opens a separate WebView
 * window — there's no "save to gallery" affordance and the user is
 * stuck with no way to actually keep the certificate file.
 *
 * THE FIX (multi-layered)
 * =======================
 * 1. Server side (`/api/certificate-pdf?...&download=1`):
 *    Sets `Content-Disposition: attachment` instead of `inline`.
 *    This triggers the Android WebView's `DownloadListener` (if the
 *    APK registered one — the FIA APK does, via MainActivity) which
 *    funnels the request through `android.app.DownloadManager` →
 *    the file lands in the public Downloads folder + gets indexed
 *    into MediaStore → shows up in the Gallery app.
 *
 * 2. Client side (this helper):
 *    Three-tier download attempt, with graceful degradation:
 *      (a) Fetch + Blob + `<a download>` click — works in modern
 *          Chromium-based WebViews (Android 8+) where blob: URLs are
 *          intercepted by the DownloadListener. Most reliable.
 *      (b) Fallback: same URL with `&download=1` via `window.open()`.
 *          The server response has `Content-Disposition: attachment`
 *          which forces the WebView to download (not navigate).
 *      (c) Last resort: open without `download=1` (legacy inline
 *          behavior) and toast-instruct the user to long-press →
 *          save manually.
 *
 * 3. APK toast bridge:
 *    The FIA APK exposes `window.FIANativeBridge.showToast(msg)` via
 *    `@JavascriptInterface`. We call it (when available) to give the
 *    user an instant in-app confirmation that the download started —
 *    this is especially important in the WebView because there's no
 *    visible "Downloads" UI otherwise.
 */

/**
 * Detects if we're running inside the FIA Android WebView.
 * The Android WebView user agent contains `Android` AND `wv` (for
 * "WebView version marker"). See:
 * https://developer.chrome.com/docs/multidevice/user-agent#webview_user_agent
 */
export function isAndroidWebView(): boolean {
  if (typeof window === 'undefined') return false
  const ua = window.navigator.userAgent || ''
  return /Android/i.test(ua) && /wv|WebView/i.test(ua)
}

/**
 * Calls the FIA APK's native toast (if available) — silently ignored
 * in regular browsers. The bridge is exposed via `addJavascriptInterface`
 * in MainActivity.kt as `window.FIANativeBridge`.
 */
function showNativeToast(message: string, duration: 'short' | 'long' = 'long'): void {
  if (typeof window === 'undefined') return
  try {
    const bridge = (window as any).FIANativeBridge
    if (bridge && typeof bridge.showToast === 'function') {
      // Android-side signature: showToast(message: String, duration: String)
      bridge.showToast(message, duration)
    }
  } catch {
    // Silently ignore — bridge may not be available (regular browser)
  }
}

/**
 * Triggers a small vibration via the APK bridge (if available) to
 * give haptic feedback when the download starts. No-op in browsers.
 */
function vibrateNative(): void {
  if (typeof window === 'undefined') return
  try {
    const bridge = (window as any).FIANativeBridge
    if (bridge && typeof bridge.vibrate === 'function') {
      // 50ms short vibration — pattern of one element
      bridge.vibrate('[50]')
    }
  } catch {}
}

export interface DownloadCertificateOptions {
  /** The certificate number (e.g. "FIA-2026-12345"). Required. */
  certificateNumber: string
  /** 'png' (default) or 'pdf'. */
  format?: 'png' | 'pdf'
  /** Optional callback for status toasts (used by the UI layer). */
  onStatus?: (msg: string, kind: 'info' | 'success' | 'error') => void
}

/**
 * Downloads a certificate file to the device. In the FIA APK this
 * triggers the Android DownloadManager → file appears in Gallery /
 * Downloads. In a regular browser it triggers the standard browser
 * download UI.
 *
 * Returns the chosen strategy so the caller can show a more specific
 * toast if needed.
 */
export async function downloadCertificateFile(
  opts: DownloadCertificateOptions
): Promise<'blob' | 'open-attachment' | 'open-inline'> {
  const { certificateNumber, format = 'png' } = opts
  const onStatus = opts.onStatus ?? (() => {})
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://fiaacademy.vercel.app'
  // Inline URL (for fallback c): just viewable, no forced download
  const inlineUrl = `${baseUrl}/api/certificate-pdf?number=${encodeURIComponent(certificateNumber)}&format=${format}`
  // Attachment URL (for fallback b): forces Content-Disposition: attachment
  const attachmentUrl = `${inlineUrl}&download=1`
  // Filename for the `a.download` attribute
  const filename = `FIA-Certificate-${certificateNumber}.${format}`

  // ===== Strategy (a): fetch + blob + a.download =====
  try {
    const res = await fetch(attachmentUrl, { credentials: 'omit' })
    if (res.ok) {
      const blob = await res.blob()
      // Sanity check: ensure the response is actually an image/pdf,
      // not an HTML error page (which would be `text/html`)
      const mime = blob.type
      if ((format === 'png' && mime.startsWith('image/')) ||
          (format === 'pdf' && mime === 'application/pdf')) {
        const blobUrl = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = blobUrl
        a.download = filename
        a.rel = 'noopener noreferrer'
        a.style.display = 'none'
        document.body.appendChild(a)
        a.click()
        // Give the WebView a tick to start the download before we
        // revoke the blob URL (revoking too early cancels the download
        // on some Android versions).
        setTimeout(() => {
          try { URL.revokeObjectURL(blobUrl) } catch {}
          try { document.body.removeChild(a) } catch {}
        }, 2000)

        vibrateNative()
        showNativeToast(format === 'png'
          ? 'تم تنزيل الشهادة إلى المعرض ✓'
          : 'تم تنزيل ملف PDF إلى مجلد التنزيلات ✓')
        onStatus('تم تنزيل الشهادة', 'success')
        return 'blob'
      }
      console.warn('[FIA] certificate-pdf returned wrong MIME:', mime)
    } else {
      console.warn('[FIA] certificate-pdf fetch failed:', res.status, res.statusText)
    }
  } catch (e: any) {
    // Likely a network error or CORS issue — fall through to strategy (b)
    console.warn('[FIA] blob download failed, falling back to window.open:', e?.message)
  }

  // ===== Strategy (b): window.open with attachment disposition =====
  try {
    // Some Android WebViews block multiple windows — use _top to
    // replace the current view if popup fails.
    const w = window.open(attachmentUrl, '_blank')
    if (w) {
      // A new view opened — the server's Content-Disposition: attachment
      // should make the WebView's DownloadListener fire automatically
      // and trigger a system download to the Gallery.
      vibrateNative()
      showNativeToast('جاري تنزيل الشهادة إلى المعرض...')
      onStatus('جاري التنزيل — قد يظهر في "التنزيلات" أو "المعرض"', 'info')
      return 'open-attachment'
    }
  } catch (e: any) {
    console.warn('[FIA] window.open(attachment) failed:', e?.message)
  }

  // ===== Strategy (c): last resort — inline view + manual save =====
  try {
    const w = window.open(inlineUrl, '_blank')
    if (w) {
      showNativeToast('اضغط مطولاً على الصورة ثم اختر "حفظ الصورة"')
      onStatus('افتح الصورة مطولاً واحفظها يدوياً', 'info')
      return 'open-inline'
    }
  } catch (e: any) {
    console.warn('[FIA] window.open(inline) failed:', e?.message)
  }

  // Total failure — couldn't even open a window
  onStatus('فشل تحميل الشهادة — تحقق من اتصالك بالإنترنت', 'error')
  showNativeToast('فشل تنزيل الشهادة')
  return 'open-inline'
}
