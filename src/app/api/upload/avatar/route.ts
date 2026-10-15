import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const userId = formData.get('user_id') as string
    const role = formData.get('role') as string

    if (!file || !userId) return NextResponse.json({ error: 'ملف ومعرّف مطلوبان' }, { status: 400 })

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
    const fileName = `avatars/${userId}-${Date.now()}.${ext}`
    const contentType = file.type || `image/${ext}`

    const { data: bucketData } = await supabaseAdmin.storage.getBucket('fia-media')
    if (!bucketData) await supabaseAdmin.storage.createBucket('fia-media', { public: true })

    const { error: uploadError } = await supabaseAdmin.storage.from('fia-media').upload(fileName, buffer, { contentType, upsert: false })
    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

    const { data: pub } = supabaseAdmin.storage.from('fia-media').getPublicUrl(fileName)

    if (role === 'trainer' || role === 'team') {
      await supabaseAdmin.from('trainers').update({ avatar: pub.publicUrl }).eq('id', userId)
    } else {
      await supabaseAdmin.from('users').update({ avatar: pub.publicUrl }).eq('id', userId)
    }

    return NextResponse.json({ url: pub.publicUrl, path: fileName })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
