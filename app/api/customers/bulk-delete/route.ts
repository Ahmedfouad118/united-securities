import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// Delete many customers in one request. Customers that still have invoices
// or receipts are skipped (delete those first) to protect the ledger.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = (session.user as any)?.role
  if (role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 })

  const { ids } = await req.json()
  if (!Array.isArray(ids) || !ids.length) return NextResponse.json({ error: 'No customers selected' }, { status: 400 })

  let deleted = 0
  const skipped: string[] = []

  for (const id of ids) {
    try {
      const c = await prisma.customer.findUnique({
        where: { id },
        include: { _count: { select: { invoices: true, receipts: true } } },
      })
      if (!c) { skipped.push(`${id}: not found`); continue }
      if (c._count.invoices > 0 || c._count.receipts > 0) {
        skipped.push(`${c.name}: has ${c._count.invoices} invoice(s) / ${c._count.receipts} receipt(s)`)
        continue
      }
      await prisma.transaction.deleteMany({ where: { customerId: id } })
      await prisma.customer.delete({ where: { id } })
      deleted++
    } catch (e: any) {
      skipped.push(`${id}: ${e.message}`)
    }
  }

  return NextResponse.json({ deleted, skipped })
}
