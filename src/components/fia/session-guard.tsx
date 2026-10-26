'use client'

/**
 * 👑 v8.0 — حرس الجلسة الملكي (Royal Session Guard)
 * ═══════════════════════════════════════════════════════════════════
 * ميزة «الخروج الفوري عند حذف الحساب — في نفس اللحظة»:
 *
 * قبل هذا الحرس كان فحص الحذف يجري عند إعادة فتح التطبيق فقط (إعادة
 * ترطيب auth-store) — فإذا حذفت الإدارة حساب متدرب أو مدرب وكان
 * تطبيقه مفتوحاً تبقى جلسته حية حتى يعيد التحميل بنفسه.
 *
 * الآن: مراقب معزول 100% (نفس نمط RenegotiationAlertWatcher المعتمد):
 * • نبضة كل 15 ثانية على /api/auth/check-deleted — نفس مسار إعادة
 *   الترطيب الرسمي، بلا أي مساس بمنظومة الإشعارات الثلاثية ولا sw.js
 *   ولا أي API قائم — مسار موجود أصلاً يُقرأ فقط
 * • فحص فوري لحظة عودة التبويب للمقدمة (visibilitychange + focus)
 *   فلا ينتظر المستخدم العائد دورة نبضة كاملة
 * • عند اكتشاف حذف الحساب (حذف من الإدارة، منطقة الخطر، أو تسجيل في
 *   force_logout): توست ملكي أنيق ثم logout() في نفس اللحظة —
 *   وlogout() يُبلغ جسر APK أصلاً (clearUserId) فيتطهر OneSignal
 *   وSharedPreferences بلا تحديث APK
 * • عطل الشبكة أو خطأ الخادم = فشل صامت — لا خروج خاطئ أبداً
 *   (fail-open — نفس فلسفة المسار الأصلي)
 * • مكافأة: شفاء حي لشارة دور الفريق (team_role) من الحقيقة الخادمية
 *   بنفس بروتوكول v6.9 — شارة المؤسس تبقى صادقة دائماً
 *
 * 👑 v10.11 — «مرسوم الحظر الملكي»:
 * • النبضة تكشف أيضاً banned من check-deleted → تُرسم بطاقة الحظر
 *   الفاخرة (RoyalBanScreen) فوراً — بلا خروج، ليرى المستخدم سببه
 *   ويتواصل مع الإدارة فوراً
 * • مراقب realtime على صف المستخدم (users + trainers) — الحظر
 *   يظهر في نفس اللحظة التي تضغط فيها الإدارة الزر، حتى لو كان
 *   التطبيق مفتوحاً على درس أو امتحان
 *
 * يُركَّب مرة واحدة في layout.tsx فيعمل على كل المسارات والصفحات
 * (لوحات التحكم + الامتحان + الدفع + صفحات التحقق) لكل الأدوار:
 * admin / trainer / student / team.
 * ═══════════════════════════════════════════════════════════════════
 */

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-store'
import { supabasePublic } from '@/lib/supabase'
import { showNotificationToast } from '@/lib/notification-toast'
import { RoyalBanScreen } from '@/components/fia/royal-ban-screen'

/** نبضة الحرس — كل 15 ثانية (أسنر من نبضة عرض تعديل النسبة 20s، أخف من أن يُثقل الشبكة) */
const GUARD_PULSE_MS = 15_000

/** أول نبضة بعد ركوب الحرس بثانيتين — بعد اكتمال الترطيب والرسوم الأولى */
const FIRST_PULSE_MS = 2_000

export function SessionGuard() {
  const userId = useAuth((s) => s.user?.id)
  const [banReason, setBanReason] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) { setBanReason(null); return } // لا جلسة — لا حرس ولا بطاقة

    let cancelled = false
    const controller = new AbortController()

    const check = async () => {
      try {
        const res = await fetch(
          `/api/auth/check-deleted?user_id=${encodeURIComponent(userId)}`,
          { signal: controller.signal, cache: 'no-store' }
        )
        if (!res.ok) return // خطأ خادم — فشل صامت، لا خروج خاطئ
        const data = await res.json().catch(() => null)
        if (cancelled || !data) return

        // 🔻 لحظة الخروج الفوري — الحساب حُذف (users + trainers + force_logout)
        if (data.deleted) {
          try {
            showNotificationToast({
              type: 'system',
              title: 'تم إنهاء الجلسة',
              body: 'تم حذف هذا الحساب من قِبل الإدارة، وتم تسجيل خروجك تلقائياً.',
            })
          } catch {}
          useAuth.getState().logout() // يُبلغ جسر APK أصلاً (clearUserId)
          return
        }

        // 👑 v10.11 — مرسوم الحظر: بطاقة الحظر الملكية فوراً (بلا خروج)
        if (data.banned) {
          setBanReason(String(data.ban_reason || 'مخالفة سياسات الأكاديمية'))
          return
        }

        // 👑 شفاء حي لشارة دور الفريق — نفس بروتوكول إعادة الترطيب v6.9
        // (لا كتابة إلا عند اختلاف فعلي — صفر إعادة رسم زائدة)
        const current = useAuth.getState().user
        if (!cancelled && current && current.id === userId) {
          const live =
            typeof data.team_role === 'string' && data.team_role
              ? data.team_role
              : undefined
          if ((current.team_role || undefined) !== (live || undefined)) {
            useAuth.getState().updateUser({ team_role: live as string | undefined })
          }
        }
      } catch {
        // انقطاع شبكة/إلغاء — فشل صامت (fail-open مثل المسار الأصلي)
      }
    }

    const onVisible = () => {
      if (document.visibilityState === 'visible') check()
    }

    // 👑 v10.11 — مراقب الحظر اللحظي: الحظر يظهر بنفس لحظة ضغط الإدارة
    // (قناتان خفيفتان: users بمعرف المستخدم + trainers بمعرف المستخدم)
    let channel: any = null
    try {
      channel = supabasePublic
        .channel(`royal-ban-watcher:${userId}`)
        .on('postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${userId}` },
          (payload: any) => {
            if (payload?.new?.banned) {
              setBanReason(String(payload.new.banned_reason || 'مخالفة سياسات الأكاديمية'))
            } else if (payload?.new && payload.new.banned === false) {
              setBanReason(null) // رفع الحظر — عودة الحياة فوراً
            }
          }
        )
        .on('postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'trainers', filter: `id=eq.${userId}` },
          (payload: any) => {
            if (payload?.new?.banned) {
              setBanReason(String(payload.new.banned_reason || 'مخالفة سياسات الأكاديمية'))
            } else if (payload?.new && payload.new.banned === false) {
              setBanReason(null)
            }
          }
        )
        .subscribe()
    } catch {}

    const first = setTimeout(check, FIRST_PULSE_MS)
    const pulse = setInterval(check, GUARD_PULSE_MS)
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)

    return () => {
      cancelled = true
      clearTimeout(first)
      clearInterval(pulse)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
      controller.abort()
      try { if (channel) supabasePublic.removeChannel(channel) } catch {}
    }
  }, [userId])

  // 👑 بطاقة الحظر الملكية — شاشة كاملة فوق كل شيء
  if (banReason && userId) {
    return (
      <RoyalBanScreen
        reason={banReason}
        onLogout={() => {
          setBanReason(null)
          useAuth.getState().logout()
        }}
      />
    )
  }

  return null // حرس بلا وجه — صفر أثر بصري
}
