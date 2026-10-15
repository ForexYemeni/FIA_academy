import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const folder = (formData.get('folder') as string) || 'images'
    if (!file) {
      return NextResponse.json({ error: 'لم يتم رفع ملف' }, { status: 400 })
    }

    // Convert to base64
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Compress image if it's larger than 500KB using Sharp-less approach (canvas in browser)
    // Server-side: just upload as-is (compression happens client-side before upload)
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const contentType = file.type || `image/${ext}`

    // Upload to Supabase Storage (bucket: fia-media — create if missing)
    const { data: bucketData } = await supabaseAdmin.storage.getBucket('fia-media')
    if (!bucketData) {
      await supabaseAdmin.storage.createBucket('fia-media', { public: true })
    }

    const { data, error } = await supabaseAdmin.storage
      .from('fia-media')
      .upload(fileName, buffer, { contentType, upsert: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const { data: pub } = supabaseAdmin.storage.from('fia-media').getPublicUrl(fileName)
    return NextResponse.json({ url: pub.publicUrl, path: fileName })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
