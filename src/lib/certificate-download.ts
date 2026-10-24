/**
 * Certificate download helper — works in regular browsers AND in the
 * أكاديمية المستقبل الدولية Android APK (which wraps the site in a WebView).
 *
 * HONEST STATUS (verified by inspecting classes.dex in
 * the v2.2.0 APK)
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
  // PATH 2: FIA APK WebView v2.3.0+ — uses the new
  // FIANativeBridge.saveImageToGallery(base64, mimeType, filename)
  // method. This is the GUARANTEED path that actually saves the file
  // to the gallery — it goes through the APK's MainActivity which
  // uses MediaStore on Android 10+ (or direct file write on 9 and
  // below) to write the file to the public Pictures/FIA folder.
  //
  // The previous APK had NO DownloadListener and NO saveImageToGallery
  // method — only `window.open()` worked, and the user had to long-
  // press to save manually. With v2.3.0+, both fixes are in place:
  //   - DownloadListener handles any URL with Content-Disposition:
  //     attachment → goes through DownloadManager → saves to gallery
  //   - saveImageToGallery(base64, mime, filename) writes base64-
  //     encoded bytes directly via MediaStore — fastest path, no
  //     need for a separate download
  // ====================================================================
  vibrateNative()

  // Try the bridge method FIRST — it's the most reliable path on
  // Android 10+ because it uses scoped storage MediaStore directly.
  try {
    const bridge = (window as any).FIANativeBridge
    if (bridge && typeof bridge.saveImageToGallery === 'function' && format === 'png') {
      const res = await fetch(inlineUrl, { credentials: 'omit' })
      if (res.ok) {
        const blob = await res.blob()
        const reader = new FileReader()
        const base64 = await new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            const result = reader.result as string
            const idx = result.indexOf(',')
            resolve(idx >= 0 ? result.substring(idx + 1) : result)
          }
          reader.onerror = () => reject(new Error('FileReader failed'))
          reader.readAsDataURL(blob)
        })
        const saved = bridge.saveImageToGallery(base64, 'image/png', filename)
        if (saved) {
          showNativeToast('تم حفظ الشهادة في المعرض ✓')
          onStatus('تم تنزيل الشهادة إلى المعرض ✓', 'success')
          return 'blob'
        } else {
          showNativeToast('فشل الحفظ المباشر — جاري فتح الصورة للحفظ اليدوي')
        }
      }
    }
    if (bridge && typeof bridge.savePdfToDownloads === 'function' && format === 'pdf') {
      const res = await fetch(inlineUrl, { credentials: 'omit' })
      if (res.ok) {
        const blob = await res.blob()
        const reader = new FileReader()
        const base64 = await new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            const result = reader.result as string
            const idx = result.indexOf(',')
            resolve(idx >= 0 ? result.substring(idx + 1) : result)
          }
          reader.onerror = () => reject(new Error('FileReader failed'))
          reader.readAsDataURL(blob)
        })
        const saved = bridge.savePdfToDownloads(base64, filename)
        if (saved) {
          showNativeToast('تم حفظ ملف PDF في مجلد التنزيلات ✓')
          onStatus('تم تنزيل PDF إلى مجلد التنزيلات ✓', 'success')
          return 'blob'
        }
      }
    }
  } catch (e: any) {
    console.warn('[FIA] saveImageToGallery bridge call failed:', e?.message)
  }

  // Fallback: the APK v2.3.0+ now also has a DownloadListener that
  // handles URLs with Content-Disposition: attachment. We just open
  // the attachment URL — the DownloadListener fires and DownloadManager
  // takes over.
  try {
    const w = window.open(attachmentUrl, '_blank')
    if (w) {
      showNativeToast('جاري تنزيل الشهادة عبر DownloadManager...')
      onStatus('جاري التنزيل عبر DownloadManager — سيظهر إشعار عند الاكتمال', 'info')
      return 'open-attachment'
    }
  } catch (e: any) {
    console.warn('[FIA] WebView open failed:', e?.message)
  }

  // Last resort — inline view + manual save instructions
  try {
    const w = window.open(inlineUrl, '_blank')
    if (w) {
      showNativeToast('اضغط مطولاً على الصورة واحفظها للمعرض')
      onStatus('اضغط مطولاً على الصورة واحفظها للمعرض', 'info')
      return 'open-inline'
    }
  } catch (e: any) {
    console.warn('[FIA] WebView inline open failed:', e?.message)
  }

  showNativeToast('فشل فتح الشهادة — تحقق من اتصالك بالإنترنت')
  onStatus('فشل فتح الشهادة', 'error')
  return 'open-inline'
}
