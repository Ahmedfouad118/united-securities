import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { renderLetterHtml } from '@/lib/letterHtml'
import nodemailer from 'nodemailer'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { ids } = await req.json()
  if (!Array.isArray(ids) || !ids.length) return NextResponse.json({ error: 'لم يتم اختيار رسائل' }, { status: 400 })

  const company = await prisma.companySettings.findFirst()
  if (!company?.smtpUser || !company?.smtpPass) {
    return NextResponse.json({ error: 'لم يتم ضبط إعدادات الإيميل (SMTP) في بيانات الشركة' }, { status: 400 })
  }

  const transporter = nodemailer.createTransport({
    host: company.smtpHost || 'smtp.office365.com',
    port: company.smtpPort || 587,
    secure: (company.smtpPort || 587) === 465,
    auth: { user: company.smtpUser, pass: company.smtpPass },
    tls: { ciphers: 'SSLv3' },
  })

  const from = company.smtpFrom || company.smtpUser
  let sent = 0
  const skipped: string[] = []

  for (const id of ids) {
    const letter = await prisma.letter.findUnique({
      where: { id },
      include: { customer: true, supplier: true, type: true },
    })
    if (!letter) { skipped.push(`${id}: not found`); continue }
    const to = letter.customer?.email || letter.supplier?.email
    if (!to) { skipped.push(`${letter.refNumber}: لا يوجد إيميل`); continue }

    const html = renderLetterHtml(letter, company)
    try {
      await transporter.sendMail({
        from, to,
        cc: company.smtpCc ? company.smtpCc.split(',').map(s => s.trim()).filter(Boolean) : undefined,
        subject: `Transfer Letter — Ref ${letter.refNumber}`,
        html,
        attachments: [{ filename: `Letter-${letter.refNumber.replace(/\//g, '-')}.html`, content: html, contentType: 'text/html' }],
      })
      sent++
    } catch (e: any) {
      skipped.push(`${letter.refNumber}: ${e.message}`)
    }
  }
  return NextResponse.json({ sent, skipped })
}
