import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { ApiAuthBridge } from "@/components/fia/api-auth-bridge";

const cairo = Cairo({
  variable: "--font-cairo",
  // Reduced weight set: 400 (regular) + 700 (bold) + 800 (extra-bold)
  // covers 95% of the UI. The previous set had 7 weights which added
  // ~120KB of unused font files to the bundle.
  subsets: ["arabic", "latin"],
  weight: ["400", "700", "800"],
  display: "swap",
  preload: true,
  adjustFontFallback: true,
});

export const metadata: Metadata = {
  title: "أكاديمية المستقبل الدولية | FIA - التعليم الطبي المعتمد",
  description: "منصة التعليم الطبي المعتمدة الأولى في اليمن. دورات BLS/ACLS، الأمراض المزمنة، التمريض، مكافحة العدوى، طب الطوارئ، صحة الأم والطفل، الصيدلة السريرية وإدارة المنشآت الصحية.",
  keywords: ["أكاديمية المستقبل الدولية", "FIA", "تعليم طبي", "BLS", "ACLS", "تمريض", "طب طوارئ", "شهادات معتمدة", "اليمن", "صنعاء"],
  authors: [{ name: "أكاديمية المستقبل الدولية" }],
  manifest: "/manifest.json",
  icons: {
    icon: "/fia/logo-fia.png",
    apple: "/fia/logo-fia.png",
  },
  openGraph: {
    title: "أكاديمية المستقبل الدولية (FIA)",
    description: "منصة التعليم الطبي المعتمدة في اليمن",
    siteName: "أكاديمية المستقبل الدولية",
    type: "website",
    locale: "ar_YE",
  },
  appleWebApp: {
    capable: true,
    title: "FIA Academy",
    statusBarStyle: "black-translucent",
  },
  // Reduce DNS lookup time by preconnecting to the external origins
  // we use most: Supabase (DB + Realtime), Telegram (image storage),
  // OneSignal (push). Without preconnect, the browser does a DNS
  // lookup + TCP handshake on first use, adding 100-300ms latency.
  other: {
    preconnect: [
      "https://fiaacademy.vercel.app",
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#0A1F44",
  // viewport-fit=cover lets the web app extend into the device's
  // notch area (Android 12+ "edge-to-edge" / iPhone "safe area").
  // Without this, the app shows a black/white bar around the notch
  // on modern phones — looks unprofessional.
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
};

// Service worker registration + affiliate tracking — browser-only, safe IIFE
const SW_REGISTER = `
(function() {
  if (typeof window === 'undefined') return
  var ua = navigator.userAgent || ''
  // WebView الأكاديمية: علامة wv الخاصة بـ WebView أو بصمة تطبيقنا FIAAcademyApp
  var isFiaWebView = /Android/i.test(ua) && (/;\\s*wv\\)/i.test(ua) || /FIAAcademyApp/i.test(ua))
  if (isFiaWebView) {
    // v2.6: داخل تطبيق الأكاديمية لا نستخدم Service Worker إطلاقاً:
    // كان يخدم نسخة مخزنة قديمة من الصفحة الرئيسية (دون أيقونات الشعار)
    // ثم يعيد تحميل الصفحة عند controllerchange — فتظهر الرئيسية «كأنها
    // تتحمل مرتين». الإشعارات في التطبيق تديرها الخدمة الأصلية، والحذف
    // هنا آمن ومتكرر بلا كلفة.
    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.getRegistrations) {
        navigator.serviceWorker.getRegistrations().then(function(rs) {
          rs.forEach(function(r) { try { r.unregister() } catch (e) {} })
        }).catch(function() {})
      }
      if (window.caches && caches.keys) {
        caches.keys().then(function(ks) {
          ks.forEach(function(k) { try { caches.delete(k) } catch (e) {} })
        }).catch(function() {})
      }
    } catch (e) {}
  } else if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js', { scope: '/' })
        .then(function (reg) {
          if (reg.waiting) reg.waiting.postMessage('SKIP_WAITING')
          setInterval(function() {
            reg.update().catch(function() {})
          }, 5 * 60 * 1000)
        })
        .catch(function (err) {
          console.warn('SW registration failed:', err)
        })
    })
    // v2.6: أُزيل reload عند controllerchange — كان يعيد تحميل الصفحة
    // فجأة أثناء الاستخدام وبعد أي نشر جديد للموقع. تحديث الأصول يعمل
    // تلقائياً مع أول تنقل جديد بلا أي مقاطعة للمستخدم.
  }
  // Affiliate tracking — capture ?ref= on first visit and stash in localStorage
  try {
    var params = new URLSearchParams(window.location.search)
    var ref = params.get('ref')
    if (ref) {
      fetch('/api/affiliates?code=' + encodeURIComponent(ref))
        .then(function(r) { return r.json() })
        .then(function(d) {
          if (d && d.valid && d.affiliate) {
            localStorage.setItem('fia_ref_code', ref)
            localStorage.setItem('fia_ref_id', d.affiliate.id)
            fetch('/api/affiliate-track?code=' + encodeURIComponent(ref), { method: 'POST' }).catch(function() {})
          }
        })
        .catch(function() {})
    }
  } catch (e) {}
})()
`

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body
        className={`${cairo.variable} font-sans antialiased bg-background text-foreground`}
      >
        <ApiAuthBridge />
        {children}
        <Toaster />
        <SonnerToaster position="top-center" richColors />
        <script
          dangerouslySetInnerHTML={{ __html: SW_REGISTER }}
        />
      </body>
    </html>
  );
}
