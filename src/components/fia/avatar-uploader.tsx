'use client'

import { useState, useRef } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Camera, Loader2 } from 'lucide-react'

interface AvatarUploaderProps {
  userId: string
  role: 'student' | 'trainer' | 'team'
  initialUrl?: string | null
  name: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  onUploaded?: (url: string) => void
}

const SIZE_MAP = {
  sm: 'w-16 h-16',
  md: 'w-24 h-24',
  lg: 'w-32 h-32',
  xl: 'w-40 h-40',
}

export function AvatarUploader({
  userId, role, initialUrl, name, size = 'lg', onUploaded,
}: AvatarUploaderProps) {
  const [url, setUrl] = useState<string | null>(initialUrl || null)
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Client-side image compression using Canvas
  const compressImage = (file: File, maxW = 512, maxH = 512, quality = 0.85): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          let { width, height } = img
          if (width > maxW) { height = (height * maxW) / width; width = maxW }
          if (height > maxH) { width = (width * maxH) / height; height = maxH }
          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')!
          ctx.drawImage(img, 0, 0, width, height)
          canvas.toBlob(
            (blob) => {
              if (!blob) { reject(new Error('فشل ضغط الصورة')); return }
              const compressed = new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' })
              resolve(compressed)
            },
            'image/jpeg',
            quality
          )
        }
        img.onerror = () => reject(new Error('فشل تحميل الصورة'))
        img.src = e.target?.result as string
      }
      reader.onerror = () => reject(new Error('فشل قراءة الملف'))
      reader.readAsDataURL(file)
    })
  }

  const handleUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('الرجاء اختيار صورة')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('الصورة كبيرة جداً (حد أقصى 5MB)')
      return
    }
    setUploading(true)
    try {
      // Compress on client first
      const compressed = await compressImage(file)
      const fd = new FormData()
      fd.append('file', compressed)
      fd.append('user_id', userId)
      fd.append('role', role)
      const res = await fetch('/api/upload/avatar', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'فشل رفع الصورة')
        return
      }
      setUrl(data.url)
      onUploaded?.(data.url)
      toast.success('تم تحديث الصورة الشخصية')
    } catch (e) {
      toast.error('خطأ في رفع الصورة')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className={`relative ${SIZE_MAP[size]} group`}>
        <div className={`${SIZE_MAP[size]} rounded-full overflow-hidden border-4 border-gold/40 shadow-xl bg-gradient-to-br from-navy to-navy-light flex items-center justify-center`}>
          {url ? (
            <img
              src={url}
              alt={name || 'avatar'}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="text-gold font-bold" style={{ fontSize: size === 'xl' ? '3rem' : size === 'lg' ? '2.5rem' : size === 'md' ? '2rem' : '1.5rem' }}>
              {name?.charAt(0) || 'U'}
            </div>
          )}
        </div>
        {/* Hover overlay */}
        <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
          <Camera className="w-6 h-6 text-white" />
        </div>
        {/* Upload button */}
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="absolute -bottom-1 -left-1 w-10 h-10 rounded-full bg-gold hover:bg-gold-light text-navy flex items-center justify-center shadow-lg ring-4 ring-white dark:ring-navy-light transition-all hover:scale-110 disabled:opacity-50"
          title="تغيير الصورة"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f) }}
        />
      </div>
      <p className="text-xs text-muted-foreground text-center">JPG أو PNG (حد أقصى 5MB)<br />سيتم ضغط الصورة تلقائياً</p>
    </div>
  )
}
