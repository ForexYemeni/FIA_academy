'use client'

/**
 * ============================================================================
 * 🌙👑 v7.0 — مبدّل الوضع الليلي الملكي (Royal Theme Toggle)
 * ============================================================================
 * زر ذهبي عائم يتنقل بين «ليل الأكاديمية» الكحلي و«نهارها» الفاتح.
 * • الاختيار يُحفظ في localStorage (مفتاح fia-theme) ويُطبق قبل الرسم
 *   عبر سكربت التهيئة في layout — فلا وميض أبيض عند فتح الصفحة
 * • الافتراضي: الليل الملكي (هوية الأكاديمية الكحلية بأبهى صورها)
 * • موضع الزر أسفل اليسار — بعيد عن زر الدردشة (أسفل اليمين)
 * • لا يمس أي منظومة إشعارات ولا sw.js — مكوّن عرضي مستقل تماماً
 * ============================================================================
 */

import { useEffect, useState, useCallback } from 'react'

const THEME_KEY = 'fia-theme'

function applyTheme(mode: 'dark' | 'light', animate: boolean) {
  const root = document.documentElement
  if (animate) {
    root.classList.add('theme-transitioning')
    window.setTimeout(() => root.classList.remove('theme-transitioning'), 500)
  }
  if (mode === 'dark') root.classList.add('dark')
  else root.classList.remove('dark')
}

export function ThemeToggle() {
  const [mode, setMode] = useState<'dark' | 'light' | null>(null)

  useEffect(() => {
    // مزامنة مع سكربت التهيئة (بعد الرسم الأول لا حاجة للحركة)
    try {
      const t = (localStorage.getItem(THEME_KEY) as 'dark' | 'light') || 'dark'
      setMode(t)
      applyTheme(t, false)
    } catch {
      setMode('dark')
    }
  }, [])

  const toggle = useCallback(() => {
    setMode((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark'
      try { localStorage.setItem(THEME_KEY, next) } catch {}
      applyTheme(next, true)
      return next
    })
  }, [])

  const isDark = mode !== 'light'

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? 'التحويل إلى الوضع النهاري' : 'التحويل إلى الوضع الليلي'}
      title={isDark ? 'الوضع النهاري ☀️' : 'الوضع الليلي 🌙'}
      className="fixed bottom-6 left-6 z-[60] w-12 h-12 rounded-full bg-gradient-to-br from-navy via-navy-light to-navy text-gold shadow-xl flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 ring-2 ring-gold/30 hover:ring-gold/60 hover:shadow-[0_0_24px_rgba(212,175,55,0.45)]"
    >
      {/* قرص توهج ذهبي نابض بهدوء */}
      <span
        aria-hidden
        className="absolute inset-0 rounded-full bg-gold/10 animate-pulse"
        style={{ animationDuration: '3.5s' }}
      />
      {isDark ? (
        /* هلال ملكي */
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="relative transition-transform duration-500">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          <path d="M17 5.5c.5 1.5 1 2 2.5 2.5-1.5.5-2 1-2.5 2.5-.5-1.5-1-2-2.5-2.5 1.5-.5 2-1 2.5-2.5z" fill="currentColor" stroke="none" opacity="0.9" />
        </svg>
      ) : (
        /* شمس ملكية */
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="relative transition-transform duration-500 rotate-0">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      )}
    </button>
  )
}

export default ThemeToggle
