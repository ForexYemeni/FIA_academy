'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Shield, Award, Users, FileText, RefreshCw, LifeBuoy, Eye, Target, Heart, Mail,
} from 'lucide-react'

export function QuickLinkCard({ cardId, onClose, settings }: { cardId: string | null; onClose: () => void; settings: any }) {
  if (!cardId) return null

  const meta: Record<string, { title: string; icon: any }> = {
    about: { title: 'من نحن', icon: Award },
    privacy: { title: 'سياسة الخصوصية', icon: Shield },
    terms: { title: 'شروط الاستخدام', icon: FileText },
    refund: { title: 'سياسة الاسترداد', icon: RefreshCw },
    support: { title: 'الدعم والمساعدة', icon: LifeBuoy },
    social: { title: 'تابعنا', icon: Users },
  }

  const m = meta[cardId]
  if (!m) return null
  const Icon = m.icon

  const getContent = () => {
    if (cardId === 'about') {
      return (
        <div className="space-y-3">
          {[
            { icon: Eye, title: 'رؤيتنا', text: settings.about_vision || 'لم تتم إضافة رؤيتنا بعد.' },
            { icon: Target, title: 'رسالتنا', text: settings.about_mission || 'لم تتم إضافة رسالتنا بعد.' },
            { icon: Heart, title: 'قيمنا', text: settings.about_values || 'لم تتم إضافة قيمنا بعد.' },
            { icon: Users, title: 'فريقنا', text: settings.about_team || 'لم تتم إضافة فريقنا بعد.' },
          ].map((item, i) => {
            const ItemIcon = item.icon
            return (
              <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="w-10 h-10 rounded-xl bg-[#0A1F44] flex items-center justify-center flex-shrink-0">
                  <ItemIcon className="w-5 h-5 text-[#C9A961]" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-[#0A1F44] text-sm mb-1">{item.title}</h4>
                  <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">{item.text}</p>
                </div>
              </div>
            )
          })}
        </div>
      )
    }
    if (cardId === 'social') {
      const socials = [
        { key: 'facebook', name: 'فيسبوك', enabled: settings.social_facebook_enabled, url: settings.social_facebook, color: '#1877F2',
          icon: <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg> },
        { key: 'telegram', name: 'تيليجرام', enabled: settings.social_telegram_enabled, url: settings.social_telegram, color: '#0088cc',
          icon: <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z"/></svg> },
        { key: 'whatsapp', name: 'واتساب', enabled: settings.social_whatsapp_enabled, url: settings.social_whatsapp, color: '#25D366',
          icon: <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297.149-1.255.362-1.255.362l-.02.02c-.297-.149-1.255-.362-1.255-.362-.49.139-.614.471-.021.789.595.316 1.123.767 1.437 1.387.314.62.349 1.392.07 2.068-.279.676-.84 1.215-1.55 1.508-.71.293-1.523.335-2.282.124-.76-.211-1.443-.67-1.962-1.295-.52-.625-.852-1.392-.955-2.21-.103-.818.021-1.646.356-2.388.335-.742.873-1.375 1.547-1.817.674-.442 1.465-.672 2.27-.66.805.012 1.602.264 2.27.715.674.442 1.215 1.083 1.547 1.817.335.742.459 1.571.356 2.388-.103.818-.435 1.585-.955 2.21-.52.625-1.202 1.084-1.962 1.295-.76.211-1.573.169-2.282-.124-.71-.293-1.271-.832-1.55-1.508-.279-.676-.244-1.448.07-2.068.314-.62.842-1.071 1.437-1.387.593-.318 1.459-.127 1.95-.421z M12.02 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12.02 0zm.01 21.82c-5.42 0-9.82-4.4-9.82-9.82S6.6 2.18 12.02 2.18s9.82 4.4 9.82 9.82-4.4 9.82-9.82 9.82z"/></svg> },
        { key: 'sms', name: 'رسائل نصية', enabled: settings.social_sms_enabled, url: settings.social_sms, color: '#34A853',
          icon: <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V8h16v10zm-2-5c0 .55-.45 1-1 1h-2c-.55 0-1-.45-1-1s.45-1 1-1h2c.55 0 1 .45 1 1zm-6 0c0 .55-.45 1-1 1H7c-.55 0-1-.45-1-1s.45-1 1-1h4c.55 0 1 .45 1 1z"/></svg> },
      ]

      const activeSocials = socials.filter((s) => s.enabled && s.url)
      if (activeSocials.length === 0) {
        return <p className="text-sm text-gray-500 text-center py-8">لم تتم إضافة روابط التواصل بعد.</p>
      }

      return (
        <div className="grid grid-cols-2 gap-3">
          {activeSocials.map((s) => {
            const href = s.key === 'telegram'
              ? (s.url.startsWith('http') ? s.url : `https://t.me/${s.url.replace('@', '')}`)
              : s.key === 'whatsapp'
              ? (s.url.startsWith('http') ? s.url : `https://wa.me/${s.url.replace(/[^0-9]/g, '')}`)
              : s.key === 'sms'
              ? `sms:${s.url}`
              : s.url
            return (
              <a key={s.key} href={href} target="_blank" rel="noopener noreferrer"
                className="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all hover:shadow-md"
                style={{ borderColor: s.color + '40', backgroundColor: s.color + '08' }}>
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: s.color }}>
                  {s.icon}
                </div>
                <span className="text-xs font-semibold text-gray-700">{s.name}</span>
              </a>
            )
          })}
        </div>
      )
    }

    const fieldMap: Record<string, string> = { privacy: 'policy_privacy', terms: 'policy_terms', refund: 'policy_refund', support: 'policy_support' }
    const content = settings[fieldMap[cardId]] || 'هذا المحتوى قيد التحضير. سيتم تحديثه قريباً.'

    return (
      <div className="p-4 bg-gray-50 rounded-xl">
        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{content}</p>
      </div>
    )
  }

  return (
    <Dialog open={!!cardId} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-[#0A1F44] flex items-center justify-center">
              <Icon className="w-5 h-5 text-[#C9A961]" />
            </div>
            <DialogTitle className="text-lg font-bold text-[#0A1F44]">{m.title}</DialogTitle>
          </div>
        </DialogHeader>
        {getContent()}
        {['privacy', 'terms', 'refund', 'support'].includes(cardId) && settings.email && (
          <div className="mt-4 pt-4 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-500 mb-2">لأي استفسار بخصوص {m.title}</p>
            <a href={`mailto:${settings.email}`} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0A1F44]/5 border border-[#C9A961]/20 text-sm font-medium text-[#0A1F44] hover:bg-[#0A1F44]/10 transition-colors">
              <Mail className="w-4 h-4 text-[#C9A961]" /> راسلنا
            </a>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
