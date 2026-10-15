'use client'

import { useEffect, useState } from 'react'

export function Footer() {
  const [settings, setSettings] = useState<any>(null)

  useEffect(() => {
    fetch('/api/site-settings')
      .then((r) => r.json())
      .then(setSettings)
      .catch(() => {})
  }, [])

  return (
    <footer className="bg-navy text-white mt-20">
      <div className="container mx-auto px-4 lg:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <img src="/fia/logo-official.png" alt="FIA" className="h-12 w-auto object-contain" />
              <div>
                <div className="font-bold text-lg">أكاديمية المستقبل الدولية</div>
                <div className="text-gold text-xs font-semibold tracking-wider">FIA</div>
              </div>
            </div>
            <p className="text-white/70 text-sm leading-relaxed">
              منصة التعليم الطبي المعتمدة الأولى في اليمن. نُقدّم دورات تدريبية احترافية في المجالات الصحية بشهادات معتمدة وقابلة للتحقق.
            </p>
          </div>

          <div>
            <h3 className="font-bold text-gold mb-3">روابط سريعة</h3>
            <ul className="space-y-2 text-sm text-white/70">
              <li><a href="#about" className="hover:text-gold transition-colors">من نحن</a></li>
              <li><a href="#courses" className="hover:text-gold transition-colors">الدورات</a></li>
              <li><a href="#trainers" className="hover:text-gold transition-colors">المدربون</a></li>
              <li><a href="#partners" className="hover:text-gold transition-colors">الشركاء</a></li>
              <li><a href="#verify" className="hover:text-gold transition-colors">تحقق من شهادة</a></li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-gold mb-3">تواصل معنا</h3>
            <ul className="space-y-2 text-sm text-white/70">
              <li className="flex items-center gap-2">
                <span>📞</span>
                <span dir="ltr">{settings?.phone || '+967 700 000 000'}</span>
              </li>
              <li className="flex items-center gap-2">
                <span>✉️</span>
                <span dir="ltr">{settings?.email || 'info@fia.edu'}</span>
              </li>
              <li className="flex items-center gap-2">
                <span>📍</span>
                <span>{settings?.address || 'صنعاء، الجمهورية اليمنية'}</span>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-gold mb-3">سياسات</h3>
            <ul className="space-y-2 text-sm text-white/70">
              <li><a href="#privacy" className="hover:text-gold transition-colors">سياسة الخصوصية</a></li>
              <li><a href="#terms" className="hover:text-gold transition-colors">شروط الاستخدام</a></li>
              <li><a href="#refund" className="hover:text-gold transition-colors">سياسة الاسترداد</a></li>
              <li><a href="#support" className="hover:text-gold transition-colors">الدعم</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-white/60 text-xs">
            © {new Date().getFullYear()} أكاديمية المستقبل الدولية (FIA). جميع الحقوق محفوظة.
          </div>
          <div className="flex items-center gap-3">
            <a href="https://t.me/" target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-gold">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z"/></svg>
            </a>
            <a href="#" className="text-white/60 hover:text-gold">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z"/></svg>
            </a>
            <a href="#" className="text-white/60 hover:text-gold">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.04c-5.5 0-9.96 4.46-9.96 9.96 0 4.41 2.87 8.14 6.84 9.46.5.08.66-.23.66-.5v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.89 1.52 2.34 1.08 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.67.92.67 1.85V21.5c0 .27.16.59.67.5 3.97-1.32 6.83-5.05 6.83-9.46 0-5.5-4.46-9.96-9.96-9.96z"/></svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
