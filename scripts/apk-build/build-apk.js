#!/usr/bin/env node
/**
 * APK Builder for FIA Academy
 * ============================================
 *
 * This script generates a real Android APK from the deployed web app.
 * It uses Capacitor (https://capacitorjs.com/) to wrap the Next.js
 * PWA in a native Android shell. The resulting APK is installable on
 * any Android device — users install it like any other app.
 *
 * PREREQUISITES (one-time setup on the build machine):
 *   - Node.js 18+ and npm
 *   - Android Studio (provides the Android SDK + JDK 17)
 *   - ANDROID_HOME env var pointing to the Android SDK
 *
 * USAGE:
 *   1. Run the script from the project root:
 *        node scripts/apk-build/build-apk.js
 *   2. The script will:
 *      a) Install Capacitor dependencies
 *      b) Initialize the native Android project (one-time)
 *      c) Copy web assets (Next.js static export) into the Android app
 *      d) Build the release APK via Gradle
 *   3. The final APK will be at:
 *        android/app/build/outputs/apk/release/app-release.apk
 *
 * ALTERNATIVE (NO ANDROID SDK REQUIRED):
 *   If you don't have Android Studio installed, use Microsoft's
 *   PWABuilder (https://www.pwabuilder.com/):
 *   1. Open https://www.pwabuilder.com/
 *   2. Enter: https://fiaacademy.vercel.app
 *   3. Click "Build My PWA" → Download "Android" package
 *   4. The downloaded ZIP contains a pre-built .apk + .aab files
 *      ready to install on any Android device.
 */

const { execSync } from 'child_process'
const fs = require('fs')
const path = require('path')

const APP_URL = process.env.APP_URL || 'https://fiaacademy.vercel.app'
const APP_NAME = 'FIA Academy'
const APP_ID = 'academy.fia.future'

function log(msg) {
  console.log(`\x1b[36m[APK Builder]\x1b[0m ${msg}`)
}

function run(cmd, opts = {}) {
  log(`$ ${cmd}`)
  execSync(cmd, { stdio: 'inherit', ...opts })
}

async function main() {
  log(`Building APK for: ${APP_URL}`)

  // === Step 1: Check prerequisites ===
  log('\n=== Step 1: Checking prerequisites ===')
  const hasNode = !!process.versions.node
  log(`Node.js: ${hasNode ? '✓' : '✗'} (${process.versions.node || 'missing'})`)

  let hasAndroid = false
  try {
    run('which android 2>&1 || which adb 2>&1', { stdio: 'pipe' })
    hasAndroid = true
  } catch { hasAndroid = false }
  log(`Android SDK: ${hasAndroid ? '✓' : '✗ — see PWABuilder alternative below'}`)

  if (!hasAndroid) {
    console.log(`
\x1b[33m
╔══════════════════════════════════════════════════════════════════╗
║  ANDROID SDK NOT FOUND                                          ║
║  ==============                                                  ║
║                                                                  ║
║  This machine doesn't have the Android SDK installed.            ║
║  To build the APK, use Microsoft PWABuilder (no SDK needed):      ║
║                                                                  ║
║  1. Open this URL in your browser:                                ║
║     https://www.pwabuilder.com/                                   ║
║                                                                  ║
║  2. Enter the app URL:                                            ║
║     ${APP_URL}                                                    ║
║                                                                  ║
║  3. Click "Build My PWA"                                          ║
║                                                                  ║
║  4. Under "Android", click "Options" → select "APK"              ║
║                                                                  ║
║  5. Click "Download" → you'll get a ZIP with:                     ║
║     - app-release.apk (the installable APK)                      ║
║     - app-release.aab (Play Store bundle)                         ║
║                                                                  ║
║  6. The APK is ready to install on any Android device:             ║
║     - Transfer the .apk to your phone                             ║
║     - Enable "Install from unknown sources" in Settings            ║
║     - Tap the .apk file to install                                ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
\x1b[0m
`)
    process.exit(0)
  }

  // === Step 2: Install Capacitor ===
  log('\n=== Step 2: Installing Capacitor ===')
  run('npm install --save @capacitor/core @capacitor/cli @capacitor/android')

  // === Step 3: Initialize Android project (one-time) ===
  const androidDir = path.join(process.cwd(), 'android')
  if (!fs.existsSync(androidDir)) {
    log('\n=== Step 3: Initializing native Android project ===')
    run(`npx cap init "${APP_NAME}" "${APP_ID}" --web-dir=out`)
    run('npx cap add android')
  } else {
    log('\n=== Step 3: Android project already initialized ✓ ===')
  }

  // === Step 4: Build Next.js static export ===
  log('\n=== Step 4: Building Next.js static export ===')
  log('Note: requires "output: 'export'" in next.config.ts')
  run('npm run build')

  // === Step 5: Copy web assets to native project ===
  log('\n=== Step 5: Syncing web assets into Android project ===')
  run('npx cap copy android')

  // === Step 6: Build the release APK via Gradle ===
  log('\n=== Step 6: Building release APK via Gradle ===')
  process.chdir(path.join(process.cwd(), 'android'))
  run('./gradlew assembleRelease')
  process.chdir('..')

  // === Step 7: Locate the APK ===
  const apkPath = path.join(process.cwd(), 'android', 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk')
  if (fs.existsSync(apkPath)) {
    const sizeMB = (fs.statSync(apkPath).size / 1024 / 1024).toFixed(2)
    console.log(`
\x1b[32m
╔══════════════════════════════════════════════════════════════════╗
║  ✅  APK BUILD SUCCESSFUL                                       ║
║                                                                  ║
║  APK location:                                                   ║
║  ${apkPath}                                                       ║
║                                                                  ║
║  Size: ${sizeMB} MB                                                ║
║                                                                  ║
║  Install on Android:                                              ║
║  1. Transfer the .apk file to your Android device                 ║
║  2. Enable "Install from unknown sources"                         ║
║  3. Tap the file in any file manager → install                    ║
║                                                                  ║
║  The app icon will appear as "FIA Academy" on the home screen,    ║
║  with full PWA + push notification support.                       ║
╚══════════════════════════════════════════════════════════════════╝
\x1b[0m
`)
  } else {
    console.log('\x1b[31mAPK not found at expected location\x1b[0m')
    process.exit(1)
  }
}

main().catch((e) => {
  console.error('\x1b[31mBuild failed:\x1b[0m', e)
  process.exit(1)
})
