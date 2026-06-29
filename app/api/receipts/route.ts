import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

async function genReceiptNumber() {
  const count = await prisma.receipt.count()
  const now = new Date()
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
  return `RCV-${ym}-${String(count + 1).padStart(4, '0')}`
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const customerId = searchParams.get('customerId') || ''
  const invoiceId = searchParams.get('invoiceId') || ''
  const dateFrom = searchParams.get('dateFrom')
  const dateTo = searchParams.get('dateTo')
  const paymentMethod = searchParams.get('paymentMethod') || ''
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '50')

  const where: any = {}
  if (customerId) where.customerId = customerId
  if (invoiceId) where.invoiceId = invoiceId
  if (paymentMethod) where.paymentMethod = paymentMethod
  if (dateFrom || dateTo) {
    where.date = {}
    if (dateFrom) where.date.gte = new Date(dateFrom)
    if (dateTo) where.date.lte = new Date(dateTo + 'T23:59:59')
  }

  const [receipts, total] = await Promise.all([
    prisma.receipt.findMany({
      where,
      include: {
        customer: true,
        invoice: true,
        bankAccount: true,
        category: true,
        createdByUser: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.receipt.count({ where }),
  ])

  return NextResponse.json({ receipts, total, page, limit })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const {
    customerId, invoiceId, categoryId, bankAccountId,
    paymentType = 'FULL', paymentMethod = 'TRANSFER',
    checkNumber, checkDate, amount, date, notes,
  } = body

  if (!customerId || !amount || Number(amount) <= 0)
    return NextResponse.json({ error: 'بيانات غير مكتملة' }, { status: 400 })

  const receipt = await prisma.receipt.create({
    data: {
      receiptNumber: await genReceiptNumber(),
      customerId,
      invoiceId: invoiceId || null,
      categoryId: categoryId || null,
      bankAccountId: bankAccountId || null,
      paymentType,
      paymentMethod,
      checkNumber: checkNumber || null,
      checkDate: checkDate ? new Date(checkDate) : null,
      amount: Number(amount),
      date: date ? new Date(date) : new Date(),
      notes: notes || null,
      status: 'ACTIVE',
      createdById: (session.user as any).id,
    },
  })

  // Update invoice paid amount if linked
  if (invoiceId) {
    const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } })
    if (invoice && !invoice.isCanceled) {
      const newPaid = Number(invoice.paidAmount) + Number(amount)
      const newRemaining = Number(invoice.totalAmount) - newPaid
      const newStatus = newRemaining <= 0.001 ? 'PAID' : newPaid > 0 ? 'PARTIAL' : 'UNPAID'
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: { paidAmount: newPaid, remaining: Math.max(0, newRemaining), status: newStatus },
      })
    }
  }

  await prisma.customer.update({
    where: { id: customerId },
    data: { currentBalance: { decrement: Number(amount) } },
  })

  await prisma.transaction.create({
    data: {
      customerId,
      invoiceId: invoiceId || null,
      type: 'PAYMENT',
      amount: Number(amount),
      notes: `سند قبض ${receipt.receiptNumber}${notes ? ' — ' + notes : ''}`,
    },
  })

  return NextResponse.json(receipt, { status: 201 })
}
