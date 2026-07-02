import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// Customer reports:
//   ?mode=summary             → one row per customer: invoiced / paid / balance
//   ?mode=statement&customerId=… → full ledger (invoices + receipts) for one customer
//   ?mode=balances            → only customers with non-zero balance (receivables summary)
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('mode') || 'summary'
  const customerId = searchParams.get('customerId') || ''
  const dateFrom = searchParams.get('dateFrom')
  const dateTo = searchParams.get('dateTo')

  const dateFilter: any = {}
  if (dateFrom) dateFilter.gte = new Date(dateFrom)
  if (dateTo) dateFilter.lte = new Date(dateTo + 'T23:59:59')
  const hasDate = dateFrom || dateTo

  // ---- STATEMENT: ledger for a single customer ----
  if (mode === 'statement') {
    if (!customerId) return NextResponse.json({ error: 'customerId required' }, { status: 400 })
    const customer = await prisma.customer.findUnique({ where: { id: customerId } })
    if (!customer) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const invoices = await prisma.invoice.findMany({
      where: { customerId, isCanceled: false, ...(hasDate ? { date: dateFilter } : {}) },
      orderBy: { date: 'asc' },
    })
    const receipts = await prisma.receipt.findMany({
      where: { customerId, ...(hasDate ? { date: dateFilter } : {}) },
      orderBy: { date: 'asc' },
    })

    // Build chronological ledger with running balance
    const entries: any[] = []
    for (const inv of invoices) {
      const debit = inv.invoiceType === 'CREDIT_NOTE' ? 0 : Number(inv.totalAmount)
      const credit = inv.invoiceType === 'CREDIT_NOTE' ? Number(inv.totalAmount) : 0
      entries.push({ date: inv.date, ref: inv.invoiceNumber, type: inv.invoiceType, desc: inv.invoiceType, debit, credit })
    }
    for (const r of receipts) {
      entries.push({ date: r.date, ref: r.receiptNumber, type: 'RECEIPT', desc: 'Payment', debit: 0, credit: Number(r.amount) })
    }
    entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    let running = Number(customer.openingBalance || 0)
    const ledger = entries.map(e => { running += e.debit - e.credit; return { ...e, balance: running } })

    const totalDebit = entries.reduce((s, e) => s + e.debit, 0)
    const totalCredit = entries.reduce((s, e) => s + e.credit, 0)

    return NextResponse.json({
      customer, ledger,
      totals: { opening: Number(customer.openingBalance || 0), debit: totalDebit, credit: totalCredit, closing: running },
    })
  }

  // ---- SUMMARY / BALANCES: one row per customer ----
  // Bulk-fetch everything in 3 queries (robust on pooled connections), then aggregate in memory.
  const [customers, invoices, receipts] = await Promise.all([
    prisma.customer.findMany({ orderBy: { name: 'asc' } }),
    prisma.invoice.findMany({
      where: { isCanceled: false, ...(hasDate ? { date: dateFilter } : {}) },
      select: { customerId: true, invoiceType: true, totalAmount: true },
    }),
    prisma.receipt.findMany({
      where: { ...(hasDate ? { date: dateFilter } : {}) },
      select: { customerId: true, amount: true },
    }),
  ])

  const invByCust: Record<string, number> = {}
  const creditByCust: Record<string, number> = {}
  for (const i of invoices) {
    if (i.invoiceType === 'CREDIT_NOTE') creditByCust[i.customerId] = (creditByCust[i.customerId] || 0) + Number(i.totalAmount)
    else invByCust[i.customerId] = (invByCust[i.customerId] || 0) + Number(i.totalAmount)
  }
  const paidByCust: Record<string, number> = {}
  for (const r of receipts) paidByCust[r.customerId] = (paidByCust[r.customerId] || 0) + Number(r.amount)

  const rows = customers.map(c => ({
    id: c.id, name: c.name, clientNumber: c.clientNumber, accountNumber: c.accountNumber,
    openingBalance: Number(c.openingBalance || 0),
    invoiced: invByCust[c.id] || 0,
    creditNotes: creditByCust[c.id] || 0,
    paid: paidByCust[c.id] || 0,
    balance: Number(c.currentBalance || 0),
  }))

  const filtered = mode === 'balances' ? rows.filter(r => Math.abs(r.balance) > 0.001) : rows
  const totals = {
    invoiced: filtered.reduce((s, r) => s + r.invoiced, 0),
    creditNotes: filtered.reduce((s, r) => s + r.creditNotes, 0),
    paid: filtered.reduce((s, r) => s + r.paid, 0),
    balance: filtered.reduce((s, r) => s + r.balance, 0),
  }
  return NextResponse.json({ rows: filtered, totals })
}
