import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { hasPermission } from '@/lib/permissions'
import { Role } from '@/types'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = (session.user as any).role as Role
  if (!hasPermission(role, 'CREATE_PAYMENT'))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { customerId, invoiceId, amount, notes, date } = body

  if (!customerId || !amount || amount <= 0)
    return NextResponse.json({ error: 'بيانات غير مكتملة' }, { status: 400 })

  const paymentAmount = parseFloat(amount)

  await prisma.transaction.create({
    data: {
      customerId,
      invoiceId: invoiceId || null,
      type: 'PAYMENT',
      amount: paymentAmount,
      date: date ? new Date(date) : new Date(),
      notes: notes || null,
    },
  })

  await prisma.customer.update({
    where: { id: customerId },
    data: { currentBalance: { decrement: paymentAmount } },
  })

  if (invoiceId) {
    const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } })
    if (invoice) {
      const newPaid = Number(invoice.paidAmount) + paymentAmount
      const newRemaining = Math.max(0, Number(invoice.totalAmount) - newPaid)
      const status = newRemaining === 0 ? 'PAID' : 'PARTIAL'
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: { paidAmount: newPaid, remaining: newRemaining, status },
      })
    }
  }

  return NextResponse.json({ success: true }, { status: 201 })
}
