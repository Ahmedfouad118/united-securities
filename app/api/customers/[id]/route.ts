import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { hasPermission } from '@/lib/permissions'
import { Role } from '@/types'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const customer = await prisma.customer.findUnique({
    where: { id: params.id },
    include: {
      invoices: { orderBy: { date: 'desc' }, take: 20 },
      transactions: { orderBy: { date: 'desc' }, take: 50 },
    },
  })

  if (!customer) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(customer)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = (session.user as any).role as Role
  if (!hasPermission(role, 'EDIT_CUSTOMER'))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { name, nameAr, phone, email, vatNumber, nin, accountNumber, clientNumber, shareholderNumber, address, openingBalance } = body

  const data: any = {
    name, nameAr: nameAr || null, phone: phone || null, email: email || null,
    vatNumber: vatNumber || null, nin: nin || null, accountNumber: accountNumber || null,
    clientNumber: clientNumber || null, shareholderNumber: shareholderNumber || null, address: address || null,
  }
  if (openingBalance !== undefined && openingBalance !== '') {
    const existing = await prisma.customer.findUnique({ where: { id: params.id } })
    const newOpening = parseFloat(openingBalance)
    if (existing && !isNaN(newOpening)) {
      // adjust currentBalance by the delta in opening balance
      data.openingBalance = newOpening
      data.currentBalance = Number(existing.currentBalance) + (newOpening - Number(existing.openingBalance))
    }
  }

  const customer = await prisma.customer.update({ where: { id: params.id }, data })
  return NextResponse.json(customer)
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = (session.user as any).role as Role
  if (!hasPermission(role, 'DELETE_CUSTOMER'))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await prisma.customer.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
