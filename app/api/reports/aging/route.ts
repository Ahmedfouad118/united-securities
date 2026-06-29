import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = new Date()

  const invoices = await prisma.invoice.findMany({
    where: { status: { in: ['UNPAID', 'PARTIAL'] }, isCanceled: false },
    include: { customer: true },
    orderBy: { date: 'asc' },
  })

  const buckets = { current: [] as any[], days30: [] as any[], days60: [] as any[], days90: [] as any[], days180: [] as any[], over180: [] as any[] }

  for (const inv of invoices) {
    const daysOld = Math.floor((now.getTime() - new Date(inv.date).getTime()) / (1000 * 60 * 60 * 24))
    const item = {
      id: inv.id, invoiceNumber: inv.invoiceNumber, invoiceType: inv.invoiceType,
      customer: inv.customer?.name, customerId: inv.customerId,
      date: inv.date, daysOld, remaining: inv.remaining,
    }
    if (daysOld <= 0) buckets.current.push(item)
    else if (daysOld <= 30) buckets.days30.push(item)
    else if (daysOld <= 60) buckets.days60.push(item)
    else if (daysOld <= 90) buckets.days90.push(item)
    else if (daysOld <= 180) buckets.days180.push(item)
    else buckets.over180.push(item)
  }

  const sum = (arr: any[]) => arr.reduce((s, i) => s + Number(i.remaining), 0)

  return NextResponse.json({
    summary: {
      current: { count: buckets.current.length, total: sum(buckets.current) },
      days30: { count: buckets.days30.length, total: sum(buckets.days30) },
      days60: { count: buckets.days60.length, total: sum(buckets.days60) },
      days90: { count: buckets.days90.length, total: sum(buckets.days90) },
      days180: { count: buckets.days180.length, total: sum(buckets.days180) },
      over180: { count: buckets.over180.length, total: sum(buckets.over180) },
    },
    details: buckets,
  })
}
