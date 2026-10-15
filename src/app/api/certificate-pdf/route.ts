import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'

async function generateArtifacts(cert: any, issueDate: string) {
  const outDir = '/home/z/my-project/download/certificates'
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
  const verifyUrl = `https://fia.edu/verify?number=${cert.certificate_number}`

  const pdfPath = path.join(outDir, `${cert.certificate_number}.pdf`)
  const pngPath = path.join(outDir, `${cert.certificate_number}.png`)

  const runPy = (script: string, args: string[]) =>
    new Promise<void>((resolve, reject) => {
      const py = spawn('python3', [script, ...args])
      let stderr = ''
      py.stderr.on('data', (d) => (stderr += d.toString()))
      py.on('close', (code) => (code === 0 ? resolve() : reject(new Error(stderr))))
    })

  await Promise.all([
    runPy('/home/z/my-project/scripts/generate_certificate.py', [
      cert.student_name || 'طالب',
      cert.course_title || 'دورة معتمدة',
      cert.certificate_number,
      issueDate,
      pdfPath,
      verifyUrl,
    ]),
    runPy('/home/z/my-project/scripts/generate_certificate_png.py', [
      cert.student_name || 'طالب',
      cert.course_title || 'دورة معتمدة',
      cert.certificate_number,
      issueDate,
      pngPath,
      verifyUrl,
    ]),
  ])

  return { pdfPath, pngPath, verifyUrl }
}

export async function GET(req: NextRequest) {
  try {
    const certNum = req.nextUrl.searchParams.get('number')
    const certId = req.nextUrl.searchParams.get('id')
    const format = req.nextUrl.searchParams.get('format') || 'pdf' // pdf | png

    if (!certNum && !certId) {
      return NextResponse.json({ error: 'رقم الشهادة أو المعرّف مطلوب' }, { status: 400 })
    }

    let query = supabaseAdmin.from('certificates').select('*')
    if (certNum) query = query.eq('certificate_number', certNum)
    else if (certId) query = query.eq('id', certId)

    const { data: cert, error } = await query.single()
    if (error || !cert) {
      return NextResponse.json({ error: 'الشهادة غير موجودة' }, { status: 404 })
    }

    const issueDate = cert.issued_at
      ? new Date(cert.issued_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })
      : new Date().toLocaleDateString('ar-EG')

    const { pdfPath, pngPath } = await generateArtifacts(cert, issueDate)
    const filePath = format === 'png' ? pngPath : pdfPath

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'فشل توليد الشهادة' }, { status: 500 })
    }

    const fileBytes = fs.readFileSync(filePath)
    const headers = new Headers()
    headers.set('Content-Type', format === 'png' ? 'image/png' : 'application/pdf')
    headers.set('Content-Disposition', `inline; filename="FIA-Certificate-${cert.certificate_number}.${format}"`)
    headers.set('Cache-Control', 'public, max-age=3600')
    return new NextResponse(fileBytes, { status: 200, headers })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
