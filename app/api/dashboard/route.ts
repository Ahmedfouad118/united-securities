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
  const customerId = searchParams.get('customerId')

  const invoiceWhere: any = {}
  if (dateFrom) invoiceWhere.date = { ...(invoiceWhere.date || {}), gte: new Date(dateFrom) }
  if (dateTo) invoiceWhere.date = { ...(invoiceWhere.date || {}), lte: new Date(dateTo + 'T23:59:59') }
  if (customerId) invoiceWhere.customerId = customerId

  const txWhere: any = { type: 'PAYMENT' }
  if (dateFrom) txWhere.date = { ...(txWhere.date || {}), gte: new Date(dateFrom) }
  if (dateTo) txWhere.date = { ...(txWhere.date || {}), lte: new Date(dateTo + 'T23:59:59') }
  if (customerId) txWhere.customerId = customerId

  const twelveMonthsAgo = new Date()
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)

  const [totalInvoices, invoices, payments, topInvoices, topDebtors, recentTransactions] = await Promise.all([
    prisma.invoice.count({ where: invoiceWhere }),

    prisma.invoice.findMany({ where: invoiceWhere, select: { remaining: true } }),

    prisma.transaction.findMany({ where: txWhere, select: { amount: true } }),

    prisma.invoice.findMany({
      where: invoiceWhere,
      include: { customer: true },
      orderBy: { totalAmount: 'desc' },
      take: 10,
    }),

    prisma.customer.findMany({
      where: { currentBalance: { gt: 0 } },
      orderBy: { currentBalance: 'desc' },
      take: 10,
    }),

    prisma.transaction.findMany({
      where: { date: { gte: twelveMonthsAgo } },
      select: { type: true, amount: true, date: true },
    }),
  ])

  const totalOutstanding = invoices.reduce((s, i) => s + i.remaining, 0)
  const totalCollected = payments.reduce((s, p) => s + p.amount, 0)

  // Build monthly data from transactions (SQLite-compatible)
  const monthlyMap: Record<string, { sales: number; collections: number }> = {}
  recentTransactions.forEach((t) => {
    const d = new Date(t.date)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!monthlyMap[key]) monthlyMap[key] = { sales: 0, collections: 0 }
    if (t.type === 'INVOICE') monthlyMap[key].sales += t.amount
    if (t.type === 'PAYMENT') monthlyMap[key].collections += t.amount
  })
  const monthlyData = Object.entries(monthlyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({ month, ...v }))

  return NextResponse.json({
    totalInvoices,
    totalOutstanding,
    totalCollected,
    topInvoices,
    topDebtors,
    monthlyData,
  })
}
