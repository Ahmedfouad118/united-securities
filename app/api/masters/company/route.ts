import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// Always operate on a single settings row (singleton)
async function getOrCreate() {
  let s = await prisma.companySettings.findFirst()
  if (!s) s = await prisma.companySettings.create({ data: {} })
  return s
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const s = await getOrCreate()
  return NextResponse.json(s)
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = (session.user as any)?.role
  if (role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const existing = await getOrCreate()
  const { id, updatedAt, ...data } = body
  const s = await prisma.companySettings.update({ where: { id: existing.id }, data })
  return NextResponse.json(s)
}
