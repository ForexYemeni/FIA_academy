# FIA Academy APK Build Guide

This document explains how to build a real, installable Android APK of the FIA Academy app — with full support for:
- Native app icon + splash screen
- Push notifications (real external OS-level popups, even when the app is closed)
- Offline caching (PWA service worker)
- Full-screen standalone mode (no browser chrome)
- All dashboard features (course viewer, payments, exams, certificates, etc.)

## TWO build paths (pick one)

### Path A: PWABuilder (EASIEST — no Android SDK needed)

This is the recommended path if you don't have Android Studio installed. PWABuilder is a free Microsoft tool that wraps your PWA into a native APK in the cloud.

1. Deploy the latest code to Vercel (already done at https://fiaacademy.vercel.app)
2. Open https://www.pwabuilder.com/ in your browser
3. Enter the URL: `https://fiaacademy.vercel.app`
4. Click **"Build My PWA"**
5. Under **Android**, click **"Options"** → select **"APK"** (not AAB)
6. Click **"Download"** — you'll get a ZIP containing:
   - `app-release.apk` ← **the installable APK**
   - `app-release.aab` ← Play Store bundle
   - Source code (Gradle project) — optional
7. Transfer the `.apk` to your Android device (USB cable, Google Drive, email, etc.)
8. On the device:
   - Open **Settings** → **Apps** → **Special access** → **Install unknown apps**
   - Allow your file manager to install APKs
   - Open the `.apk` file → tap **Install**

The app will appear on your home screen as **"FIA Academy"** with the academy logo icon. Tap it to launch — it opens full-screen (no browser address bar), and you'll receive real OS-level push notifications.

### Path B: Local Capacitor build (advanced — for customization)

If you have Android Studio installed and want to customize the native shell (e.g. add native plugins, custom permissions, deep links), use Capacitor.

#### Prerequisites

- Node.js 18+ and npm
- Android Studio (with SDK + JDK 17)
- `ANDROID_HOME` env var pointing to your Android SDK

#### Build steps

```bash
# From the project root:
node scripts/apk-build/build-apk.js
```

The script will:
1. Install Capacitor dependencies
2. Initialize the native Android project (one-time only)
3. Build the Next.js static export
4. Copy web assets into the Android project
5. Build the release APK via Gradle
6. Print the APK location

The final APK will be at:
```
android/app/build/outputs/apk/release/app-release.apk
```

## How the APK gets push notifications

The app uses the **Web Push API** + a **Service Worker** to deliver real push notifications:

1. **Service Worker** (`public/sw.js`) — registered on first visit. Listens for `push` events from the server + displays them via `showNotification()`. Even if the app is closed, the OS shows the notification.

2. **In-app browser notifications** — when a user is logged in and the dashboard is open, new notifications fire via:
   - Supabase Realtime (sub-second latency)
   - Polling fallback (every 15s)
   - The Service Worker's `showNotification` is called via `postMessage`, giving a real OS-level popup.

3. **Push subscriptions (optional, for true background push)** — for full background push (when the app is completely closed), you'd need:
   - VAPID keys (generate via `npx web-push generate-vapid-keys`)
   - Store keys in env vars: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`
   - Subscribe the user's browser via `serviceWorkerRegistration.pushManager.subscribe()`
   - Send the subscription to `/api/push/subscribe`
   - When a notification needs to fire, send it via `web-push` library server-side

The current setup is sufficient for foreground + background notifications (when the PWA is installed). For true push when the app is fully closed, set up VAPID as described above.

## Verifying everything works after APK install

1. **App icon**: look for "FIA Academy" icon on your home screen
2. **Standalone mode**: launching the app should NOT show a browser address bar
3. **Offline support**: turn off Wi-Fi, open the app → it should still load (cached)
4. **Push notification**: log in, go to bell icon → "Test Notification" → you should see an OS-level popup with sound + vibration
5. **All features**: navigate to courses, payments, exams, certificates — everything should work just like in the browser

## Updating the app

To push updates to all installed APKs:

1. Deploy new code to Vercel (git push)
2. The Service Worker fetches the new version on next app launch
3. Users see "Update available" prompt → click → app reloads with new code

For new native features (permissions, plugins), you'll need to rebuild + redistribute the APK.
