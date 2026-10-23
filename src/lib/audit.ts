/**
 * ============================================================================
 * 👑 FIA ACADEMY — سجل التدقيق الملكي (Royal Audit Log)
 * ============================================================================
 * كل قرار حساس في المملكة يُقيد في جدول audit_log: من فعل ماذا، متى، من أي
 * عنوان. الجدول مغلق تماماً على العملاء (RLS بلا سياسات + REVOKE) — تقرأه
 * وتكتبه خدمة الخادم فقط.
 *
 * القاعدة الذهبية: التسجيل لا يُعطّل الطلب أبداً — أي خطأ في التدقيق يُبتلع
 * بصمت (fire-and-forget) فلا تتأثر تجربة المستخدم مهما حدث.
 * ============================================================================
 */

import { supabaseAdmin } from './supabase'

export interface AuditActor {
  id?: string
  email?: string
  role?: string
}

export interface AuditInput {
  action: string
  entity?: string
  entityId?: string | number | null
  actor?: AuditActor | null
  details?: Record<string, unknown> | null
  /** الطلب الأصلي لاستخراج IP ومتوصف المستخدم */
  req?: Request | null
}

function reqMeta(req?: Request | null): { ip: string; ua: string } {
  try {
    const ip =
      req?.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req?.headers.get('x-real-ip') ||
      null
    return { ip: ip || '', ua: req?.headers.get('user-agent') || '' }
  } catch {
    return { ip: '', ua: '' }
  }
}

/** تسجيل حدث تدقيق — لا يرمي أخطاء إطلاقاً (fire-and-forget) */
export function audit(input: AuditInput): void {
  // تُنفَّذ خارج مسار الطلب الحرج — وأي خلل يُبتلع بأدب
  ;(async () => {
    try {
      const { ip, ua } = reqMeta(input.req)
      await supabaseAdmin.from('audit_log').insert({
        action: String(input.action || 'unknown').slice(0, 120),
        entity: input.entity || null,
        entity_id: input.entityId != null ? String(input.entityId).slice(0, 200) : null,
        actor_id: input.actor?.id || null,
        actor_email: input.actor?.email || null,
        actor_role: input.actor?.role || null,
        details: input.details && Object.keys(input.details).length ? input.details : null,
        ip: ip || null,
        user_agent: ua ? ua.slice(0, 400) : null,
      })
    } catch {
      // التدقيق لا يُسقط الطلب — أبداً
    }
  })()
}

/** نسخة تنتظر الكتابة — للاستخدام في مسارات لا يمكن إتمامها قبل التدقيق */
export async function auditAwait(input: AuditInput): Promise<void> {
  try {
    const { ip, ua } = reqMeta(input.req)
    await supabaseAdmin.from('audit_log').insert({
      action: String(input.action || 'unknown').slice(0, 120),
      entity: input.entity || null,
      entity_id: input.entityId != null ? String(input.entityId).slice(0, 200) : null,
      actor_id: input.actor?.id || null,
      actor_email: input.actor?.email || null,
      actor_role: input.actor?.role || null,
      details: input.details && Object.keys(input.details).length ? input.details : null,
      ip: ip || null,
      user_agent: ua ? ua.slice(0, 400) : null,
    })
  } catch {
    // لا يُرمي أبداً
  }
}
