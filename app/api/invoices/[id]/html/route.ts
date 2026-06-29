import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { renderInvoiceHtml } from '@/lib/invoiceHtml'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const inv = await prisma.invoice.findUnique({
    where: { id: params.id },
    include: { customer: true, bankAccount: true, items: true },
  })
  if (!inv) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const company = await prisma.companySettings.findFirst()
  const html = renderInvoiceHtml(inv, company)
  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}
