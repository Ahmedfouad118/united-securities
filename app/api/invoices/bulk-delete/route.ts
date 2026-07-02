import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// Delete many invoices in one request (robust on serverless/pooled connections).
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = (session.user as any)?.role
  if (role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 })

  const { ids } = await req.json()
  if (!Array.isArray(ids) || !ids.length) return NextResponse.json({ error: 'No invoices selected' }, { status: 400 })

  let deleted = 0
  const skipped: string[] = []

  for (const id of ids) {
    try {
      const inv = await prisma.invoice.findUnique({ where: { id }, include: { receipts: true } })
      if (!inv) { skipped.push(`${id}: not found`); continue }
      if (inv.receipts.length) { skipped.push(`${inv.invoiceNumber}: has receipts`); continue }

      const delta = inv.invoiceType === 'CREDIT_NOTE' ? -inv.totalAmount : inv.totalAmount
      await prisma.customer.update({ where: { id: inv.customerId }, data: { currentBalance: { decrement: delta } } })
      await prisma.transaction.deleteMany({ where: { invoiceId: id } })
      await prisma.invoiceItem.deleteMany({ where: { invoiceId: id } })
      await prisma.invoice.delete({ where: { id } })
      deleted++
    } catch (e: any) {
      skipped.push(`${id}: ${e.message}`)
    }
  }

  return NextResponse.json({ deleted, skipped })
}
