import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { renderLetterHtml } from '@/lib/letterHtml'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const letter = await prisma.letter.findUnique({
    where: { id: params.id },
    include: { customer: true, supplier: true, type: true },
  })
  if (!letter) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const company = await prisma.companySettings.findFirst()
  const html = renderLetterHtml(letter, company)
  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}
