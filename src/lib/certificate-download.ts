/**
 * Certificate download helper — works in regular browsers AND in the
 * FIA Academy Android APK (which wraps the site in a WebView).
 *
 * HONEST STATUS (verified by inspecting classes.dex in
 * FIA-Academy-v2.2.0.apk)
 * =========================================================
 * The APK has WebViewClient + WebChromeClient (with
 * onShowFileChooser for file uploads), but NO DownloadListener.
 *
 * What this means:
 * - File UPLOADS via `<input type="file">` work — the WebChromeClient
 *   intercepts the chooser and shows the system file picker.
 * - File DOWNLOADS via clicking links/blobs do NOT work — without
 *   a DownloadListener registered, the WebView silently ignores the
 *   download request. The blob+anchor approach also fails because
 *   there's no listener to catch the blob URL navigation.
 *
 * Until the APK is upgraded to add `webView.setDownloadListener { ... }`
 * (or a JS bridge method like `FIANativeBridge.saveImage(base64,
 * filename)`), the only path for the user is:
 *   1. Open the PNG in a new window via `window.open(inlineUrl)`
 *   2. The user long-presses the image and selects "Save image"
 *   3. The image is then saved to the gallery by the system's
 *      long-press save handler (this IS built into Android).
 *
 * This helper implements the realistic behavior:
 * - In a regular browser: try blob+anchor first (works for modern
 *   Chrome/Firefox/Safari), fall back to window.open.
 * - In the FIA APK WebView: skip the blob attempt (we know it won't
 *   work without a DownloadListener), go straight to window.open +
 *   show an honest "long-press to save" toast. The user gets the
 *   image OPENED in a separate view where the system's long-press
 *   → save context menu works.
 *
 * The previous version of this helper lied — it called
 * `FIANativeBridge.showToast('تم التنزيل إلى المعرض ✓')` even when
 * the download silently failed in the WebView. That was misleading
 * and is fixed here.
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
  // The 'wv' marker is the most reliable signal — Chrome on Android
  // (used as the system browser) does NOT include 'wv'; only the
  // embedded WebView does.
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
      bridge.showToast(message, duration)
    }
  } catch {}
}

/**
 * Triggers a small vibration via the APK bridge (if available). No-op
 * in browsers.
 */
function vibrateNative(): void {
  if (typeof window === 'undefined') return
  try {
    const bridge = (window as any).FIANativeBridge
    if (bridge && typeof bridge.vibrate === 'function') {
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
 * Downloads a certificate file to the device.
 *
 * BEHAVIOR:
 * - In a regular browser: tries blob+anchor first (gives instant
 *   download with the requested filename), falls back to window.open
 *   with attachment disposition, finally to inline view.
 * - In the FIA APK WebView (no DownloadListener): goes straight to
 *   window.open + shows an honest toast telling the user to long-press
 *   to save manually. Does NOT claim "downloaded to gallery".
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
  const filename = `FIA-Certificate-${certificateNumber}.${format}`
  const inWebView = isAndroidWebView()

  // ====================================================================
  // PATH 1: Regular browser — try blob + <a download>.click() first.
  // This is the modern way to trigger a real file download with a
  // custom filename. Works in Chrome / Firefox / Safari / Edge.
  // ====================================================================
  if (!inWebView) {
    try {
      const res = await fetch(attachmentUrl, { credentials: 'omit' })
      if (res.ok) {
        const blob = await res.blob()
        const mime = blob.type
        if ((format === 'png' && mime.startsWith('image/')) ||
            (format === 'pdf' && (mime === 'application/pdf' || mime === 'application/octet-stream'))) {
          const blobUrl = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = blobUrl
          a.download = filename
          a.rel = 'noopener noreferrer'
          a.style.display = 'none'
          document.body.appendChild(a)
          a.click()
          setTimeout(() => {
            try { URL.revokeObjectURL(blobUrl) } catch {}
            try { document.body.removeChild(a) } catch {}
          }, 2000)
          onStatus('تم تنزيل الشهادة', 'success')
          return 'blob'
        }
      }
    } catch (e: any) {
      console.warn('[FIA] blob download failed:', e?.message)
    }

    // Fallback b: window.open with attachment disposition
    try {
      const w = window.open(attachmentUrl, '_blank')
      if (w) {
        onStatus('تم فتح نافذة التنزيل', 'info')
        return 'open-attachment'
      }
    } catch {}

    // Fallback c: inline view
    try {
      const w = window.open(inlineUrl, '_blank')
      if (w) {
        onStatus('تم فتح الشهادة — احفظها يدوياً', 'info')
        return 'open-inline'
      }
    } catch {}

    onStatus('فشل فتح الشهادة — تحقق من إعدادات المتصفح', 'error')
    return 'open-inline'
  }

  // ====================================================================
  // PATH 2: FIA APK WebView — NO DownloadListener registered. The
  // blob+anchor approach silently fails (the WebView just ignores the
  // navigation). The only honest path is to OPEN the image in a new
  // view and tell the user to long-press → save manually. The system's
  // long-press context menu IS built into Android and works in any
  // WebView window — that's how users save images from any webview-
  // based app.
  // ====================================================================
  vibrateNative()
  // Use the inline URL — no point adding &download=1 since the
  // WebView has no listener to honor the Content-Disposition header.
  // The image just needs to be VIEWABLE for long-press → save to work.
  try {
    const w = window.open(inlineUrl, '_blank')
    if (w) {
      // Honest toast — the user needs to manually save.
      showNativeToast('افتح الصورة واضغط مطولاً عليها ثم اختر "حفظ الصورة"')
      onStatus('اضغط مطولاً على الصورة ثم اختر "حفظ الصورة" للمعرض', 'info')
      return 'open-inline'
    }
    // window.open itself failed (popup blocked) — try attachment URL
    const w2 = window.open(attachmentUrl, '_blank')
    if (w2) {
      showNativeToast('اضغط مطولاً على الصورة واحفظها للمعرض')
      onStatus('اضغط مطولاً على الصورة واحفظها للمعرض', 'info')
      return 'open-attachment'
    }
  } catch (e: any) {
    console.warn('[FIA] WebView open failed:', e?.message)
  }

  // Total failure — couldn't even open a window
  showNativeToast('فشل فتح الشهادة — تحقق من اتصالك بالإنترنت')
  onStatus('فشل فتح الشهادة', 'error')
  return 'open-inline'
}
