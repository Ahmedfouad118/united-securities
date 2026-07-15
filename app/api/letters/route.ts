import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { amountToWords } from '@/lib/letterHtml'

// Ref pattern: US/{initials}/{seq}/{year}
function initialsOf(name: string | null | undefined): string {
  if (!name) return 'US'
  const latin = name.split(/\s+/).map(w => w.match(/[A-Za-z]/)?.[0] || '').join('').toUpperCase()
  return latin.slice(0, 3) || 'US'
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') || ''
  const typeId = searchParams.get('typeId') || ''
  const dateFrom = searchParams.get('dateFrom')
  const dateTo = searchParams.get('dateTo')
  const fromSeq = parseInt(searchParams.get('fromSeq') || '')
  const toSeq = parseInt(searchParams.get('toSeq') || '')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const sortBy = searchParams.get('sortBy') || 'createdAt'
  const sortDir = (searchParams.get('sortDir') || 'desc') === 'asc' ? 'asc' : 'desc'

  const where: any = {}
  if (typeId) where.typeId = typeId
  if (search) where.OR = [
    { refNumber: { contains: search, mode: 'insensitive' } },
    { benAccountName: { contains: search, mode: 'insensitive' } },
    { toBankName: { contains: search, mode: 'insensitive' } },
    { customer: { name: { contains: search, mode: 'insensitive' } } },
    { customer: { clientNumber: { contains: search } } },
    { supplier: { name: { contains: search, mode: 'insensitive' } } },
  ]
  if (dateFrom || dateTo) {
    where.date = {}
    if (dateFrom) where.date.gte = new Date(dateFrom)
    if (dateTo) where.date.lte = new Date(dateTo + 'T23:59:59')
  }
  if (!isNaN(fromSeq)) where.seq = { ...(where.seq || {}), gte: fromSeq }
  if (!isNaN(toSeq)) where.seq = { ...(where.seq || {}), lte: toSeq }

  const SORTABLE = ['refNumber', 'seq', 'date', 'amount', 'currency', 'createdAt']
  const orderBy: any = sortBy === 'customer' ? { customer: { name: sortDir } }
    : SORTABLE.includes(sortBy) ? { [sortBy]: sortDir } : { createdAt: 'desc' }

  const [letters, total] = await Promise.all([
    prisma.letter.findMany({
      where,
      include: { customer: true, supplier: true, type: true, createdByUser: { select: { name: true } } },
      orderBy, skip: (page - 1) * limit, take: limit,
    }),
    prisma.letter.count({ where }),
  ])
  return NextResponse.json({ letters, total, page, limit })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const {
      refNumber, typeId, date, toBankName, toBankBranch, fromAccountName, fromAccountNo,
      customerId, supplierId, amount, currency = 'OMR', amountWords,
      benAccountName, benAccountNo, benBankName, benBranch, benIban, benSwift, benCurrency,
      corrBank, corrSwift, refLine, purpose, settlementDate, invoiceData,
      chargesNote, extraNote, online = false,
    } = body

    // next sequence (global)
    const last = await prisma.letter.findFirst({ orderBy: { seq: 'desc' }, select: { seq: true } })
    const nextSeq = (last?.seq || 0) + 1
    const year = date ? new Date(date).getFullYear() : new Date().getFullYear()

    let ref = (refNumber || '').trim()
    let seq = nextSeq
    if (ref) {
      const dup = await prisma.letter.findUnique({ where: { refNumber: ref } })
      if (dup) return NextResponse.json({ error: `رقم المرجع "${ref}" مستخدم بالفعل` }, { status: 400 })
      const nums = ref.split('/').map((p: string) => parseInt(p)).filter((n: number) => !isNaN(n) && n < 100000)
      if (nums.length) seq = nums[0]
    } else {
      ref = `US/${initialsOf((session.user as any)?.name)}/${nextSeq}/${year}`
    }

    const letter = await prisma.letter.create({
      data: {
        refNumber: ref, seq,
        typeId: typeId || null,
        date: date ? new Date(date) : new Date(),
        toBankName: toBankName || null, toBankBranch: toBankBranch || null,
        fromAccountName: fromAccountName || null, fromAccountNo: fromAccountNo || null,
        customerId: customerId || null, supplierId: supplierId || null,
        amount: Number(amount) || 0, currency,
        amountWords: amountWords || amountToWords(Number(amount) || 0, currency),
        benAccountName: benAccountName || null, benAccountNo: benAccountNo || null,
        benBankName: benBankName || null, benBranch: benBranch || null,
        benIban: benIban || null, benSwift: benSwift || null, benCurrency: benCurrency || null,
        corrBank: corrBank || null, corrSwift: corrSwift || null,
        refLine: refLine || null, purpose: purpose || null,
        settlementDate: settlementDate ? new Date(settlementDate) : null,
        invoiceData: invoiceData || null,
        chargesNote: chargesNote ?? 'Please note that all charges related to the transfer will be borne by us.',
        extraNote: extraNote || null,
        online: !!online,
        createdById: (session.user as any).id,
      },
    })
    return NextResponse.json(letter, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message?.split('\n').pop() || 'Create failed' }, { status: 400 })
  }
}
