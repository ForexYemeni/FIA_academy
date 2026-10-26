import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * FIA Academy — Prisma client (dual-runtime, v10.22)
 *
 * مسار مزدوج آمن:
 *  - إذا وُجد DATABASE_URL (Cloudflare Workers / أي بيئة حديثة) → محول pg
 *    الخالص (TCP عبر nodejs_compat) — بلا محرك Rust إطلاقاً.
 *  - إذا غاب DATABASE_URL (Vercel الحالي كما هو) → PrismaClient الافتراضي
 *    الذي يقرأ الرابط من schema.prisma — سلوك الإنتاج الحالي دون أي تغيير.
 *
 * المفتاحان اختياريان (يُضبطان كسِر فقط عند الحاجة):
 *  - PG_SSL_NO_VERIFY=true → تعطيل تحقق شهادة TLS (لبعض بيئات edge)
 */
function createPrismaClient(): PrismaClient {
  const url = process.env.DATABASE_URL

  if (url) {
    const noVerify = process.env.PG_SSL_NO_VERIFY === 'true'
    const adapter = new PrismaPg({
      connectionString: url,
      ssl: noVerify ? { rejectUnauthorized: false } : undefined,
    })
    return new PrismaClient({ adapter, log: ['query'] })
  }

  return new PrismaClient({
    log: ['query'],
  })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
