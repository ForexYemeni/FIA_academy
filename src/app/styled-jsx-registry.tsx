'use client'

/**
 * ============================================================================
 * FIA ACADEMY — سجل أنماط styled-jsx الملكي (الإصلاح الجذري للوميض الأبيض)
 * ============================================================================
 * المشكلة: في App Router، أنماط styled-jsx داخل مكونات العميل لا تُرسَل من
 * الخادم إطلاقاً ما لم يُهيَّأ StyleRegistry — فكان HTML صفحة /download يصل
 * بلا أي وسم <style> فتُرسَم الصفحة بيضاء عارية (FOUC) ثم تُحقن الأنماط بعد
 * الـ hydration فيظهر الشكل الفاخر — «صفحة سيئة تومض ثم تختفي».
 *
 * الحل: النمط الرسمي الموثق من Next.js — سجل يجمّع الأنماط أثناء الترميز
 * الخادمي ويحقنها في HTML المُرسَل عبر useServerInsertedHTML.
 * يعالج أيضاً: notification-toast.tsx و lesson-preview-modal.tsx.
 * ============================================================================
 */

import { useState } from 'react'
import { useServerInsertedHTML } from 'next/navigation'
import { StyleRegistry, createStyleRegistry } from 'styled-jsx'

export default function StyledJsxRegistry({
  children,
}: {
  children: React.ReactNode
}) {
  // السجل يُنشأ مرة واحدة لكل عمر خادمي للطلب
  const [registry] = useState(() => createStyleRegistry())

  // حقن الأنماط المُجمَّعة في تدفق HTML الخادم ثم تفريغ السجل
  useServerInsertedHTML(() => {
    const styles = registry.styles()
    registry.flush()
    return <>{styles}</>
  })

  return <StyleRegistry registry={registry}>{children}</StyleRegistry>
}
