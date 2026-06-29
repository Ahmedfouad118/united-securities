import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const receipt = await prisma.receipt.findUnique({
    where: { id: params.id },
    include: { customer: true, invoice: true, bankAccount: true, category: true, createdByUser: { select: { name: true } } },
  })
  if (!receipt) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(receipt)
}

// Edit a receipt (admin) — adjusts invoice paid & customer balance by the delta
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = (session.user as any)?.role
  if (role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 })

  const old = await prisma.receipt.findUnique({ where: { id: params.id } })
  if (!old) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const { categoryId, bankAccountId, paymentType, paymentMethod, checkNumber, checkDate, amount, date, notes, invoiceId } = body
  const newAmount = Number(amount ?? old.amount)
  const delta = newAmount - Number(old.amount)

  // Adjust customer balance (payment decrements balance)
  if (delta !== 0) await prisma.customer.update({ where: { id: old.customerId }, data: { currentBalance: { decrement: delta } } })

  // Adjust linked invoice paid amount
  const linkedInvoiceId = invoiceId ?? old.invoiceId
  if (old.invoiceId && old.invoiceId !== linkedInvoiceId) {
    // moved off old invoice — reverse old
    const oldInv = await prisma.invoice.findUnique({ where: { id: old.invoiceId } })
    if (oldInv) {
      const paid = Math.max(0, Number(oldInv.paidAmount) - Number(old.amount))
      const rem = Number(oldInv.totalAmount) - paid
      await prisma.invoice.update({ where: { id: oldInv.id }, data: { paidAmount: paid, remaining: Math.max(0, rem), status: rem <= 0.001 ? 'PAID' : paid > 0 ? 'PARTIAL' : 'UNPAID' } })
    }
  }
  if (linkedInvoiceId) {
    const inv = await prisma.invoice.findUnique({ where: { id: linkedInvoiceId } })
    if (inv) {
      const base = (old.invoiceId === linkedInvoiceId) ? Number(inv.paidAmount) - Number(old.amount) : Number(inv.paidAmount)
      const paid = Math.max(0, base + newAmount)
      const rem = Number(inv.totalAmount) - paid
      await prisma.invoice.update({ where: { id: inv.id }, data: { paidAmount: paid, remaining: Math.max(0, rem), status: rem <= 0.001 ? 'PAID' : paid > 0 ? 'PARTIAL' : 'UNPAID' } })
    }
  }

  const receipt = await prisma.receipt.update({
    where: { id: params.id },
    data: {
      categoryId: categoryId || null, bankAccountId: bankAccountId || null,
      paymentType: paymentType ?? old.paymentType, paymentMethod: paymentMethod ?? old.paymentMethod,
      checkNumber: checkNumber || null, checkDate: checkDate ? new Date(checkDate) : null,
      amount: newAmount, date: date ? new Date(date) : old.date, notes: notes || null,
      invoiceId: linkedInvoiceId || null,
    },
  })
  return NextResponse.json(receipt)
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = (session.user as any)?.role
  if (role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 })

  const receipt = await prisma.receipt.findUnique({ where: { id: params.id } })
  if (!receipt) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Reverse invoice paid amount if linked
  if (receipt.invoiceId) {
    const invoice = await prisma.invoice.findUnique({ where: { id: receipt.invoiceId } })
    if (invoice) {
      const newPaid = Math.max(0, Number(invoice.paidAmount) - Number(receipt.amount))
      const newRemaining = Number(invoice.totalAmount) - newPaid
      const newStatus = newRemaining <= 0.001 ? 'PAID' : newPaid > 0 ? 'PARTIAL' : 'UNPAID'
      await prisma.invoice.update({ where: { id: invoice.id }, data: { paidAmount: newPaid, remaining: Math.max(0, newRemaining), status: newStatus } })
    }
  }

  // Reverse customer balance (payment had decremented it)
  await prisma.customer.update({ where: { id: receipt.customerId }, data: { currentBalance: { increment: Number(receipt.amount) } } })
  await prisma.receipt.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
