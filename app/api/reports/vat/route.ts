import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const dateFrom = searchParams.get('dateFrom')
  const dateTo = searchParams.get('dateTo')

  const where: any = { isCanceled: false, approvalStatus: 'APPROVED' }
  if (dateFrom || dateTo) {
    where.date = {}
    if (dateFrom) where.date.gte = new Date(dateFrom)
    if (dateTo) where.date.lte = new Date(dateTo + 'T23:59:59')
  }

  const invoices = await prisma.invoice.findMany({
    where,
    include: { customer: true, items: { include: { serviceType: true } } },
    orderBy: { date: 'desc' },
  })

  const totalSubtotal = invoices.reduce((s, i) => s + Number(i.subtotal), 0)
  const totalVat = invoices.reduce((s, i) => s + Number(i.vatAmount), 0)
  const totalAmount = invoices.reduce((s, i) => s + Number(i.totalAmount), 0)

  return NextResponse.json({
    invoices: invoices.map(inv => ({
      invoiceNumber: inv.invoiceNumber, invoiceType: inv.invoiceType,
      customer: inv.customer?.name, date: inv.date,
      subtotal: inv.subtotal, vatAmount: inv.vatAmount, vatRate: inv.vatRate, totalAmount: inv.totalAmount,
    })),
    totals: { subtotal: totalSubtotal, vatAmount: totalVat, totalAmount },
  })
}
