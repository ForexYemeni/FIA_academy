import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
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
};

export const viewport: Viewport = {
  themeColor: "#0A1F44",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

// Service worker registration + affiliate tracking — browser-only, safe IIFE
const SW_REGISTER = `
(function() {
  if (typeof window === 'undefined') return
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js', { scope: '/' })
        .then(function (reg) {
          // Force the new SW to take over immediately (so push events
          // work on first session without requiring a page reload).
          if (reg.waiting) reg.waiting.postMessage('SKIP_WAITING')
        })
        .catch(function (err) {
          console.warn('SW registration failed:', err)
        })
    })
    // When a new SW takes over, reload the page once so the user
    // gets the latest version.
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (!window.__fiaReloaded) {
        window.__fiaReloaded = true
        window.location.reload()
      }
    })
  }
  // Affiliate tracking — capture ?ref= on first visit and stash in localStorage
  try {
    var params = new URLSearchParams(window.location.search)
    var ref = params.get('ref')
    if (ref) {
      fetch('/api/affiliates?code=' + encodeURIComponent(ref))
        .then(function (r) { return r.json() })
        .then(function (d) {
          if (d && d.valid && d.affiliate) {
            localStorage.setItem('fia_ref_code', ref)
            localStorage.setItem('fia_ref_id', d.affiliate.id)
            // Fire-and-forget — record the click (server stores by IP + UA)
            fetch('/api/affiliate-track?code=' + encodeURIComponent(ref), { method: 'POST' }).catch(function () {})
          }
        })
        .catch(function () {})
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
