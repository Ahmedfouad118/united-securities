import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { hasPermission } from '@/lib/permissions'
import { Role } from '@/types'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') || ''
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')

  const where = search
    ? { OR: [{ name: { contains: search, mode: 'insensitive' as const } }, { phone: { contains: search } }] }
    : {}

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: { name: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.customer.count({ where }),
  ])

  return NextResponse.json({ customers, total, page, limit })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = (session.user as any).role as Role
  if (!hasPermission(role, 'CREATE_CUSTOMER'))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { name, nameAr, phone, email, vatNumber, nin, accountNumber, clientNumber, shareholderNumber, address, openingBalance } = body

  if (!name) return NextResponse.json({ error: 'الاسم مطلوب' }, { status: 400 })

  const opening = parseFloat(openingBalance || '0')

  const customer = await prisma.customer.create({
    data: {
      name,
      nameAr: nameAr || null,
      phone: phone || null,
      email: email || null,
      vatNumber: vatNumber || null,
      nin: nin || null,
      accountNumber: accountNumber || null,
      clientNumber: clientNumber || null,
      shareholderNumber: shareholderNumber || null,
      address: address || null,
      openingBalance: opening,
      currentBalance: opening,
    },
  })

  if (opening > 0) {
    await prisma.transaction.create({
      data: {
        customerId: customer.id,
        type: 'OPENING_BALANCE',
        amount: opening,
        notes: 'رصيد افتتاحي',
      },
    })
  }

  return NextResponse.json(customer, { status: 201 })
}
