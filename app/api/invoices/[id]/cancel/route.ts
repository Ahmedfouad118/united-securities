import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role } from '@/types'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = (session.user as any).role as Role
  if (role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { cancelReason } = body

  const invoice = await prisma.invoice.findUnique({ where: { id: params.id } })
  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (invoice.isCanceled) return NextResponse.json({ error: 'الفاتورة ملغاة بالفعل' }, { status: 400 })

  await prisma.invoice.update({
    where: { id: params.id },
    data: {
      isCanceled: true,
      canceledAt: new Date(),
      canceledBy: (session.user as any).name,
      cancelReason: cancelReason || null,
      status: 'CANCELED',
    },
  })

  // Reverse the customer balance effect
  const balanceChange = invoice.invoiceType === 'CREDIT_NOTE'
    ? invoice.remaining  // credit note was reducing balance, restore it
    : -invoice.remaining // regular invoice was increasing balance, reduce it

  await prisma.customer.update({
    where: { id: invoice.customerId },
    data: { currentBalance: { increment: balanceChange } },
  })

  await prisma.transaction.create({
    data: {
      customerId: invoice.customerId,
      invoiceId: invoice.id,
      type: 'PAYMENT',
      amount: invoice.remaining,
      notes: `إلغاء فاتورة ${invoice.invoiceNumber}`,
    },
  })

  return NextResponse.json({ success: true })
}
