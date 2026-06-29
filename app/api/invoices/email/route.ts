import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { renderInvoiceHtml } from '@/lib/invoiceHtml'
import nodemailer from 'nodemailer'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { ids } = await req.json()
  if (!Array.isArray(ids) || !ids.length) return NextResponse.json({ error: 'لم يتم اختيار فواتير' }, { status: 400 })

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
    const inv = await prisma.invoice.findUnique({
      where: { id },
      include: { customer: true, bankAccount: true, items: true },
    })
    if (!inv) { skipped.push(`${id}: غير موجودة`); continue }
    if (!inv.customer?.email) { skipped.push(`${inv.invoiceNumber}: لا يوجد إيميل للعميل`); continue }

    const html = renderInvoiceHtml(inv, company)
    const subject = `فاتورة رقم ${inv.invoiceNumber} — ${company.nameAr || company.nameEn}`
    const greeting = `<div dir="rtl" style="font-family:Arial;font-size:14px;margin-bottom:14px">
      عزيزنا ${inv.customer.name}،<br/><br/>
      إليك مرفق الفاتورة رقم <b>${inv.invoiceNumber}</b> بتاريخ ${new Date(inv.date).toLocaleDateString('en-GB')}، برجاء الاطلاع.<br/><br/>
      مع خالص التحية،<br/>${company.nameAr || company.nameEn}
    </div><hr/>`

    try {
      await transporter.sendMail({
        from, to: inv.customer.email,
        cc: company.smtpCc ? company.smtpCc.split(',').map(s => s.trim()).filter(Boolean) : undefined,
        subject,
        html: greeting + html,
        attachments: [{ filename: `Invoice-${inv.invoiceNumber}.html`, content: html, contentType: 'text/html' }],
      })
      sent++
    } catch (e: any) {
      skipped.push(`${inv.invoiceNumber}: ${e.message}`)
    }
  }

  return NextResponse.json({ sent, skipped })
}
