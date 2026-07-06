import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const invoice = await prisma.invoice.findUnique({
    where: { id: params.id },
    include: {
      customer: true,
      category: true,
      bankAccount: true,
      createdByUser: { select: { id: true, name: true } },
      approvedBy: { select: { id: true, name: true } },
      items: { include: { serviceType: true } },
      receipts: true,
    },
  })

  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(invoice)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = (session.user as any)?.role
  if (role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 })

  const body = await req.json()
  const existing = await prisma.invoice.findUnique({ where: { id: params.id }, include: { items: true } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const {
    customerId, invoiceType, categoryId, bankAccountId, items, notes, date, dueDate,
    vatRate = existing.vatRate, feeData, periodLabel, invoiceNumber,
  } = body

  // If invoice number is being changed, ensure it's unique
  if (invoiceNumber && invoiceNumber !== existing.invoiceNumber) {
    const dup = await prisma.invoice.findUnique({ where: { invoiceNumber } })
    if (dup) return NextResponse.json({ error: `رقم الفاتورة "${invoiceNumber}" مستخدم بالفعل` }, { status: 400 })
  }

  // Empty string means "cleared" (e.g. bank removed) — must become null, not ''
  const normBank = bankAccountId === undefined ? existing.bankAccountId : (bankAccountId || null)
  const normCategory = categoryId === undefined ? existing.categoryId : (categoryId || null)

  try {
  // If items provided, recompute everything and replace items
  if (Array.isArray(items)) {
    const subtotal = items.reduce((s: number, i: any) => s + i.quantity * i.unitPrice, 0)
    const vatAmount = items.reduce((s: number, i: any) => s + (i.quantity * i.unitPrice * (i.vatRate ?? vatRate) / 100), 0)
    const totalAmount = subtotal + vatAmount
    const newRemaining = totalAmount - existing.paidAmount

    // Reverse old balance effect, apply new
    const oldDelta = existing.invoiceType === 'CREDIT_NOTE' ? -existing.totalAmount : existing.totalAmount
    const newDelta = (invoiceType || existing.invoiceType) === 'CREDIT_NOTE' ? -totalAmount : totalAmount
    await prisma.customer.update({ where: { id: existing.customerId }, data: { currentBalance: { increment: newDelta - oldDelta } } })

    await prisma.invoiceItem.deleteMany({ where: { invoiceId: params.id } })
    const invoice = await prisma.invoice.update({
      where: { id: params.id },
      data: {
        invoiceNumber: invoiceNumber || existing.invoiceNumber,
        customerId: customerId || existing.customerId,
        invoiceType: invoiceType || existing.invoiceType,
        categoryId: normCategory,
        bankAccountId: normBank,
        date: date ? new Date(date) : existing.date,
        dueDate: dueDate ? new Date(dueDate) : existing.dueDate,
        subtotal, vatRate, vatAmount, totalAmount,
        remaining: newRemaining,
        status: newRemaining <= 0 ? 'PAID' : existing.paidAmount > 0 ? 'PARTIAL' : 'UNPAID',
        feeData: feeData ?? existing.feeData,
        periodLabel: periodLabel ?? existing.periodLabel,
        notes: notes ?? existing.notes,
        items: {
          create: items.map((i: any) => {
            const sub = i.quantity * i.unitPrice
            const vr = i.vatRate ?? vatRate
            const vat = sub * vr / 100
            return { serviceTypeId: i.serviceTypeId || null, description: i.description, quantity: i.quantity, unitPrice: i.unitPrice, subtotal: sub, vatRate: vr, vatAmount: vat, total: sub + vat }
          }),
        },
      },
    })
    return NextResponse.json(invoice)
  }

  // Simple field update
  const invoice = await prisma.invoice.update({ where: { id: params.id }, data: body })
  return NextResponse.json(invoice)
  } catch (e: any) {
    return NextResponse.json({ error: e.message?.split('\n').pop() || 'Update failed' }, { status: 400 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = (session.user as any)?.role
  if (role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 })

  const inv = await prisma.invoice.findUnique({ where: { id: params.id }, include: { receipts: true } })
  if (!inv) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (inv.receipts.length) return NextResponse.json({ error: 'لا يمكن حذف فاتورة لها سندات قبض' }, { status: 400 })

  // Reverse balance
  const delta = inv.invoiceType === 'CREDIT_NOTE' ? -inv.totalAmount : inv.totalAmount
  await prisma.customer.update({ where: { id: inv.customerId }, data: { currentBalance: { decrement: delta } } })
  await prisma.transaction.deleteMany({ where: { invoiceId: params.id } })
  await prisma.invoiceItem.deleteMany({ where: { invoiceId: params.id } })
  await prisma.invoice.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
