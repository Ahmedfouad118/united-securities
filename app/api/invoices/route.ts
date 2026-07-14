import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { hasPermission } from '@/lib/permissions'
import { Role } from '@/types'

const TYPE_PREFIX: Record<string, string> = {
  REGULAR: 'INV',
  MANAGEMENT_FEE: 'MF',
  PERFORMANCE_FEE: 'PF',
  DEBIT_NOTE: 'DN',
  CREDIT_NOTE: 'CN',
}

async function genInvoiceNumber(type: string): Promise<string> {
  const prefix = TYPE_PREFIX[type] || 'INV'
  const now = new Date()
  const ym = `${now.getFullYear()}`

  // Find last invoice of this type to get the last sequence number
  const last = await prisma.invoice.findFirst({
    where: { invoiceType: type },
    orderBy: { createdAt: 'desc' },
    select: { invoiceNumber: true },
  })

  let seq = 1
  if (last?.invoiceNumber) {
    const parts = last.invoiceNumber.split('-')
    const lastSeq = parseInt(parts[parts.length - 1])
    if (!isNaN(lastSeq)) seq = lastSeq + 1
  }

  return `${prefix}-${ym}-${String(seq).padStart(4, '0')}`
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') || ''
  const approvalStatus = searchParams.get('approvalStatus') || ''
  const invoiceType = searchParams.get('invoiceType') || ''
  const search = searchParams.get('search') || ''
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const dateFrom = searchParams.get('dateFrom')
  const dateTo = searchParams.get('dateTo')
  const fromNum = searchParams.get('fromNum') || ''
  const toNum = searchParams.get('toNum') || ''
  const customerId = searchParams.get('customerId') || ''
  const sortBy = searchParams.get('sortBy') || 'createdAt'
  const sortDir = (searchParams.get('sortDir') || 'desc') === 'asc' ? 'asc' : 'desc'

  const categoryId = searchParams.get('categoryId') || ''

  const where: any = {}
  if (status) where.status = status
  if (approvalStatus) where.approvalStatus = approvalStatus
  if (invoiceType) where.invoiceType = invoiceType
  if (categoryId) where.categoryId = categoryId
  if (customerId) where.customerId = customerId
  if (search) where.OR = [
    { customer: { name: { contains: search, mode: 'insensitive' } } },
    { customer: { clientNumber: { contains: search } } },
    { customer: { accountNumber: { contains: search } } },
    { invoiceNumber: { contains: search, mode: 'insensitive' } },
  ]
  if (dateFrom || dateTo) {
    where.date = {}
    if (dateFrom) where.date.gte = new Date(dateFrom)
    if (dateTo) where.date.lte = new Date(dateTo + 'T23:59:59')
  }
  if (fromNum) where.invoiceNumber = { ...where.invoiceNumber, gte: fromNum }
  if (toNum) where.invoiceNumber = { ...where.invoiceNumber, lte: toNum }

  // Column-level sorting (customer name sorts via relation)
  const orderBy: any =
    sortBy === 'customer' ? { customer: { name: sortDir } }
    : ['invoiceNumber', 'invoiceType', 'date', 'totalAmount', 'remaining', 'status', 'approvalStatus', 'createdAt'].includes(sortBy) ? { [sortBy]: sortDir }
    : { createdAt: 'desc' }

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: { customer: true, category: true, bankAccount: true, createdByUser: true },
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.invoice.count({ where }),
  ])

  return NextResponse.json({ invoices, total, page, limit })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = (session.user as any).role as Role
  if (!hasPermission(role, 'CREATE_INVOICE'))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const {
    customerId, invoiceType = 'REGULAR', categoryId, bankAccountId,
    items, notes, date, dueDate, vatRate = 5, referenceInvoiceId,
    feeData, periodLabel, currency = 'OMR', exchangeRate = 1,
    // legacy
    monthData,
  } = body

  // Foreign-currency invoices: amounts arrive in the invoice currency; store the
  // OMR equivalent (rate = OMR per 1 unit) so balances/reports stay in OMR.
  const fxRate = currency !== 'OMR' && Number(exchangeRate) > 0 ? Number(exchangeRate) : 1

  if (!customerId || !items?.length)
    return NextResponse.json({ error: 'بيانات غير مكتملة' }, { status: 400 })

  const subtotal = items.reduce((s: number, i: any) => s + i.quantity * i.unitPrice, 0) * fxRate
  const vatAmount = items.reduce((s: number, i: any) => s + (i.quantity * i.unitPrice * (i.vatRate ?? vatRate) / 100), 0) * fxRate
  const totalAmount = subtotal + vatAmount

  const isAdmin = role === 'ADMIN'
  const approvalStatus = isAdmin ? 'APPROVED' : 'PENDING'

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber: await genInvoiceNumber(invoiceType),
      invoiceType,
      customerId,
      categoryId: categoryId || null,
      bankAccountId: bankAccountId || null,
      date: date ? new Date(date) : new Date(),
      dueDate: dueDate ? new Date(dueDate) : null,
      subtotal,
      vatRate,
      vatAmount,
      totalAmount,
      paidAmount: 0,
      remaining: totalAmount,
      status: 'UNPAID',
      approvalStatus,
      approvedById: isAdmin ? (session.user as any).id : null,
      approvedAt: isAdmin ? new Date() : null,
      referenceInvoiceId: referenceInvoiceId || null,
      feeData: feeData || (monthData ? JSON.stringify(monthData) : null),
      periodLabel: periodLabel || null,
      currency: currency || 'OMR',
      exchangeRate: fxRate,
      notes: notes || null,
      createdById: (session.user as any).id,
      items: {
        create: items.map((i: any) => {
          const itemSubtotal = i.quantity * i.unitPrice * fxRate
          const itemVatRate = i.vatRate ?? vatRate
          const itemVat = itemSubtotal * itemVatRate / 100
          return {
            serviceTypeId: i.serviceTypeId || null,
            description: i.description,
            quantity: i.quantity,
            unitPrice: i.unitPrice * fxRate,
            subtotal: itemSubtotal,
            vatRate: itemVatRate,
            vatAmount: itemVat,
            total: itemSubtotal + itemVat,
          }
        }),
      },
    },
  })

  // Credit note reduces balance, everything else increases
  const balanceDelta = invoiceType === 'CREDIT_NOTE' ? -totalAmount : totalAmount
  await prisma.customer.update({
    where: { id: customerId },
    data: { currentBalance: { increment: balanceDelta } },
  })

  await prisma.transaction.create({
    data: {
      customerId,
      invoiceId: invoice.id,
      type: invoiceType === 'CREDIT_NOTE' ? 'PAYMENT' : 'INVOICE',
      amount: totalAmount,
      notes: invoice.invoiceNumber,
    },
  })

  return NextResponse.json(invoice, { status: 201 })
}
