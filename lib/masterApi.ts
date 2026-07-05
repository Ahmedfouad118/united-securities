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

// Numeric columns per model — form inputs arrive as strings and Prisma rejects
// "5" for a Float column, which silently broke saving service types.
const NUMERIC_FIELDS: Record<string, string[]> = {
  serviceType: ['vatRate'],
  invoiceCategory: [],
  bankAccount: [],
  paymentCategory: [],
}

function sanitize(model: ModelName, body: any) {
  const out: any = {}
  for (const [k, v] of Object.entries(body)) {
    if (v === '') { out[k] = null; continue }
    if (NUMERIC_FIELDS[model]?.includes(k)) { const n = parseFloat(String(v)); out[k] = isNaN(n) ? 0 : n; continue }
    out[k] = v
  }
  return out
}

export async function masterPOST(req: NextRequest, model: ModelName) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await req.json()
    const row = await (prisma[model] as any).create({ data: sanitize(model, body) })
    return NextResponse.json(row, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message?.split('\n').pop() || 'Save failed' }, { status: 400 })
  }
}

export async function masterPUT(req: NextRequest, model: ModelName, id: string) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await req.json()
    const row = await (prisma[model] as any).update({ where: { id }, data: sanitize(model, body) })
    return NextResponse.json(row)
  } catch (e: any) {
    return NextResponse.json({ error: e.message?.split('\n').pop() || 'Save failed' }, { status: 400 })
  }
}

export async function masterDELETE(model: ModelName, id: string) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await (prisma[model] as any).delete({ where: { id } })
  return NextResponse.json({ success: true })
}
