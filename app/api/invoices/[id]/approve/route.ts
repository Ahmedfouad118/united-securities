import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role } from '@/types'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = (session.user as any).role as Role
  if (role !== 'ADMIN' && role !== 'ACCOUNTANT')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { action } = body // 'approve' | 'reject'

  const invoice = await prisma.invoice.update({
    where: { id: params.id },
    data: {
      approvalStatus: action === 'approve' ? 'APPROVED' : 'REJECTED',
      approvedById: (session.user as any).id,
      approvedAt: new Date(),
    },
  })

  return NextResponse.json(invoice)
}
