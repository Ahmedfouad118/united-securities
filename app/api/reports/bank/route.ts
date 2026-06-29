import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const bankAccountId = searchParams.get('bankAccountId') || ''
  const dateFrom = searchParams.get('dateFrom')
  const dateTo = searchParams.get('dateTo')

  const where: any = {}
  if (bankAccountId) where.bankAccountId = bankAccountId
  if (dateFrom || dateTo) {
    where.date = {}
    if (dateFrom) where.date.gte = new Date(dateFrom)
    if (dateTo) where.date.lte = new Date(dateTo + 'T23:59:59')
  }

  const receipts = await prisma.receipt.findMany({
    where,
    include: { customer: true, invoice: true, bankAccount: true },
    orderBy: { date: 'desc' },
  })

  const banks = await prisma.bankAccount.findMany({ where: { active: true } })

  const bankSummary = banks.map(bank => {
    const bankReceipts = receipts.filter(r => r.bankAccountId === bank.id)
    return {
      bankId: bank.id,
      bankName: bank.bankName,
      accountNumber: bank.accountNumber,
      total: bankReceipts.reduce((s, r) => s + Number(r.amount), 0),
      count: bankReceipts.length,
      byMethod: {
        CHECK: bankReceipts.filter(r => r.paymentMethod === 'CHECK').reduce((s, r) => s + Number(r.amount), 0),
        TRANSFER: bankReceipts.filter(r => r.paymentMethod === 'TRANSFER').reduce((s, r) => s + Number(r.amount), 0),
        CASH: bankReceipts.filter(r => r.paymentMethod === 'CASH').reduce((s, r) => s + Number(r.amount), 0),
      },
    }
  })

  return NextResponse.json({ receipts, bankSummary })
}
