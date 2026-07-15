import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = (session.user as any)?.role
  if (role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 })

  const { ids } = await req.json()
  if (!Array.isArray(ids) || !ids.length) return NextResponse.json({ error: 'No letters selected' }, { status: 400 })

  let deleted = 0
  const skipped: string[] = []
  for (const id of ids) {
    try { await prisma.letter.delete({ where: { id } }); deleted++ }
    catch (e: any) { skipped.push(`${id}: ${e.message}`) }
  }
  return NextResponse.json({ deleted, skipped })
}
