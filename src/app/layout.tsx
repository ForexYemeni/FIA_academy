import type { Metadata } from "next";
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
  icons: {
    icon: "/fia/favicon.svg",
  },
  openGraph: {
    title: "أكاديمية المستقبل الدولية (FIA)",
    description: "منصة التعليم الطبي المعتمدة في اليمن",
    siteName: "أكاديمية المستقبل الدولية",
    type: "website",
    locale: "ar_YE",
  },
};

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
      </body>
    </html>
  );
}
