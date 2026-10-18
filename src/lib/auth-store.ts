'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/lib/types'

interface AuthState {
  user: User | null
  token: string | null
  setAuth: (user: User, token: string) => void
  logout: () => void
  updateUser: (updates: Partial<User>) => void
}

// Detects if we're running inside the FIA Android APK WebView.
// The APK's user agent contains 'Android' + 'wv' (WebView marker).
// We use this to know whether to call window.FIANativeBridge methods
// (which only exist inside the APK — they're null in a regular browser).
function isAndroidWebView(): boolean {
  if (typeof window === 'undefined') return false
  const ua = window.navigator.userAgent || ''
  return /Android/i.test(ua) && /wv|WebView/i.test(ua)
}

/**
 * Calls the FIA APK's native JS bridge to register the user's ID
 * with OneSignal (so external push notifications reach this device).
 *
 * The APK exposes `window.FIANativeBridge.setUserId(userId)` which:
 * 1. Writes the userId to Android SharedPreferences (so the
 *    NotificationPollService polling loop can fetch notifications
 *    for this user)
 * 2. Calls OneSignal.login(userId) to register the device with the
 *    user's external_id — the CRITICAL step that links pushes
 *    sent from the server (with external_user_id) to THIS device.
 *
 * Without this call, the user gets in-app notifications (via Supabase
 * Realtime + the web's polling), but NOT external push notifications
 * (which require the OneSignal subscription to be linked to the
 * user_id).
 */
function notifyApkOfUserId(userId: string | undefined) {
  if (!userId) return
  if (!isAndroidWebView()) return // Bridge only exists inside the APK
  try {
    const bridge = (window as any).FIANativeBridge
    if (bridge && typeof bridge.setUserId === 'function') {
      bridge.setUserId(userId)
    }
  } catch {
    // Bridge call failed — silent, the in-app notifications still work
  }
}

/**
 * Calls the FIA APK's native JS bridge to log out the user from
 * OneSignal, so the device stops receiving notifications targeted
 * to the previous user's external_id.
 */
function notifyApkOfLogout() {
  if (!isAndroidWebView()) return
  try {
    const bridge = (window as any).FIANativeBridge
    if (bridge && typeof bridge.clearUserId === 'function') {
      bridge.clearUserId()
    }
  } catch {}
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setAuth: (user, token) => {
        set({ user, token })
        // Notify the APK that the user is logged in — this triggers
        // OneSignal.login(userId) + writes the user_id to SharedPreferences
        // (which the NotificationPollService reads on its next poll cycle
        // to fetch this user's notifications).
        notifyApkOfUserId(user.id)
      },
      logout: () => {
        // Notify the APK before clearing the state — once `user` becomes
        // null we lose the ID. (We pass undefined which the bridge ignores.)
        notifyApkOfLogout()
        set({ user: null, token: null })
      },
      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),
    }),
    {
      name: 'fia-auth',
      // After rehydration from localStorage, if a user is present,
      // notify the APK so the OneSignal login happens on app restart
      // (the bridge state is lost when the app process dies).
      onRehydrateStorage: () => (state) => {
        if (state?.user?.id) {
          notifyApkOfUserId(state.user.id)
        }
      },
    }
  )
)
