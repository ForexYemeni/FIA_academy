import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'الصفحة غير موجودة | أكاديمية المستقبل الدولية',
  robots: { index: false },
}

/**
 * 👑 صفحة 404 الملكية — أي زائر ضائع يصل إلى قاعة أنيقة بدلاً من شاشة
 *    الخطأ الجافة، مع بوابتين: العودة إلى العرش الرئيسي أو استعراض
 *    الدورات. ترتفع بجودة SEO الأكاديمية وتمنح انطباعاً فاخراً.
 *    (تُعرض داخل التخطيط الجذري — بلا html/body)
 */
export default function NotFound() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #04102b 0%, #0a1f4d 50%, #04102b 100%)',
        position: 'relative',
        overflow: 'hidden',
        padding: '24px',
      }}
    >
      {/* هالات ذهبية */}
      <div
        style={{
          position: 'absolute',
          top: '-80px',
          right: '-80px',
          width: '260px',
          height: '260px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(212,175,55,0.18), transparent 70%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-60px',
          left: '-60px',
          width: '220px',
          height: '220px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(212,175,55,0.14), transparent 70%)',
        }}
      />
      <div
        style={{
          position: 'relative',
          textAlign: 'center',
          maxWidth: '480px',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(212,175,55,0.35)',
          borderRadius: '28px',
          padding: '48px 32px',
          backdropFilter: 'blur(8px)',
        }}
      >
        <div
          style={{
            width: '84px',
            height: '84px',
            margin: '0 auto 20px',
            borderRadius: '24px',
            background: 'linear-gradient(135deg, rgba(212,175,55,0.25), rgba(212,175,55,0.08))',
            border: '2px solid rgba(212,175,55,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '40px',
            fontWeight: 800,
            color: '#D4AF37',
            boxShadow: '0 8px 40px rgba(212,175,55,0.25)',
          }}
        >
          ٤٠٤
        </div>
        <h1 style={{ color: '#ffffff', fontSize: '26px', fontWeight: 800, margin: '0 0 10px' }}>
          هذه الصفحة ليست من قاعات القصر
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', lineHeight: 1.9, margin: '0 0 28px' }}>
          يبدو أنك وصلت إلى ممر مظلم لا يؤدي إلى مكان — لا تقلق، أبواب الأكاديمية الكبرى مفتوحة أمامك.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link
            href="/"
            style={{
              display: 'inline-block',
              padding: '12px 28px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #04102b, #0a1f4d)',
              border: '1.5px solid rgba(212,175,55,0.55)',
              color: '#D4AF37',
              fontWeight: 700,
              fontSize: '14px',
              textDecoration: 'none',
              boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
            }}
          >
            🏛️ العودة إلى القصر الرئيسي
          </Link>
          <Link
            href="/#courses"
            style={{
              display: 'inline-block',
              padding: '12px 28px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #D4AF37, #b8942e)',
              color: '#04102b',
              fontWeight: 800,
              fontSize: '14px',
              textDecoration: 'none',
              boxShadow: '0 4px 20px rgba(212,175,55,0.35)',
            }}
          >
            🎓 استعرض الدورات
          </Link>
        </div>
        <p style={{ color: 'rgba(212,175,55,0.55)', fontSize: '11px', marginTop: '26px', marginBottom: 0 }}>
          أكاديمية المستقبل الدولية — حيث يُبنى المستقبل باحتراف
        </p>
      </div>
    </div>
  )
}
