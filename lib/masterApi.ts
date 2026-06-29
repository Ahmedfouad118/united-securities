import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from './auth'
import { prisma } from './db'

type ModelName = 'invoiceCategory' | 'bankAccount' | 'serviceType' | 'paymentCategory'

export async function masterGET(model: ModelName) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const rows = await (prisma[model] as any).findMany({ orderBy: { createdAt: 'asc' } })
  return NextResponse.json(rows)
}

export async function masterPOST(req: NextRequest, model: ModelName) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const row = await (prisma[model] as any).create({ data: body })
  return NextResponse.json(row, { status: 201 })
}

export async function masterPUT(req: NextRequest, model: ModelName, id: string) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const row = await (prisma[model] as any).update({ where: { id }, data: body })
  return NextResponse.json(row)
}

export async function masterDELETE(model: ModelName, id: string) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await (prisma[model] as any).delete({ where: { id } })
  return NextResponse.json({ success: true })
}
