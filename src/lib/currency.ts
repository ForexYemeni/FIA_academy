// ============================================================================
// FIA ROYAL CURRENCY — مكتبة العملات الملكية
// تنسيق فاخر موحّد لكل العملات في المنصة (دولار، ريال يمني، سعودي، درهم…)
// تُستخدم في محفظة أرباح المدربين، طلبات السحب، الدفعات، والبطاقات.
// ============================================================================

export interface CurrencyInfo {
  /** الرمز المعروض بجانب المبلغ */
  symbol: string
  /** الاسم الكامل بالعربية */
  label: string
  /** الرمز العالمي المختصر */
  short: string
  /** هل يوضع الرمز قبل المبلغ (مثل $20) أم بعده (مثل 12,500 ر.ي) */
  prefix: boolean
}

/** السجل الملكي للعملات — يغطي كل العملات المستخدمة في الأكاديمية */
const REGISTRY: Record<string, CurrencyInfo> = {
  '$':      { symbol: '$',     label: 'دولار أمريكي',   short: 'USD', prefix: true },
  'USD':    { symbol: '$',     label: 'دولار أمريكي',   short: 'USD', prefix: true },
  'دولار':  { symbol: '$',     label: 'دولار أمريكي',   short: 'USD', prefix: true },
  'usd':    { symbol: '$',     label: 'دولار أمريكي',   short: 'USD', prefix: true },
  'ر.ي':    { symbol: 'ر.ي',   label: 'ريال يمني',      short: 'YER', prefix: false },
  'ر.س':    { symbol: 'ر.س',   label: 'ريال سعودي',     short: 'SAR', prefix: false },
  'د.إ':    { symbol: 'د.إ',   label: 'درهم إماراتي',   short: 'AED', prefix: false },
  'د.ع':    { symbol: 'د.ع',   label: 'دينار عراقي',    short: 'IQD', prefix: false },
  'د.ك':    { symbol: 'د.ك',   label: 'دينار كويتي',    short: 'KWD', prefix: false },
  'د.ب':    { symbol: 'د.ب',   label: 'دينار بحريني',   short: 'BHD', prefix: false },
  'ر.ع':    { symbol: 'ر.ع',   label: 'ريال عماني',     short: 'OMR', prefix: false },
  'د.ق':    { symbol: 'د.ق',   label: 'ريال قطري',      short: 'QAR', prefix: false },
  'ج.م':    { symbol: 'ج.م',   label: 'جنيه مصري',      short: 'EGP', prefix: false },
  'د.أ':    { symbol: 'د.أ',   label: 'دينار أردني',    short: 'JOD', prefix: false },
  'USDT':   { symbol: 'USDT',  label: 'عملة USDT',      short: 'USDT', prefix: true },
}

const FALLBACK: CurrencyInfo = { symbol: '', label: '', short: '', prefix: false }

/** معلومات عملة — يتعامل مع أي صيغة معروفة وأي قيمة أخرى تُعرض كما هي */
export function currencyInfo(currency?: string | null): CurrencyInfo {
  const c = (currency || '').trim()
  if (!c) return { symbol: 'ر.ي', label: 'ريال يمني', short: 'YER', prefix: false }
  return REGISTRY[c] || REGISTRY[c.toUpperCase()] || { ...FALLBACK, symbol: c, label: c, short: c }
}

/** تنسيق رقم بفواصل الآلاف */
export function fmtNum(n: any): string {
  return (Number(n) || 0).toLocaleString('en-US')
}

/**
 * تنسيق مبلغ فاخر: `$20` للدولار، `12,500 ر.ي` لغيره.
 * يُعرض دائماً داخل عنصر dir="ltr" ليظهر الترتيب صحيحاً.
 */
export function fmtMoney(n: any, currency?: string | null): string {
  const info = currencyInfo(currency)
  const num = fmtNum(n)
  if (info.prefix) return `${info.symbol}${num}`
  return `${num} ${info.symbol}`.trim()
}

/** أسماء العملات المتاحة في المنصة (للاختيارات) */
export const KNOWN_CURRENCIES = ['$' as const, 'ر.ي' as const, 'ر.س' as const, 'د.إ' as const, 'د.ع' as const, 'ج.م' as const, 'USDT' as const]
