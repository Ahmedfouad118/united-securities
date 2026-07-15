import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { amountToWords } from '@/lib/letterHtml'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const letter = await prisma.letter.findUnique({
    where: { id: params.id },
    include: { customer: true, supplier: true, type: true, createdByUser: { select: { name: true } } },
  })
  if (!letter) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(letter)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const existing = await prisma.letter.findUnique({ where: { id: params.id } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const b = await req.json()

    if (b.refNumber && b.refNumber !== existing.refNumber) {
      const dup = await prisma.letter.findUnique({ where: { refNumber: b.refNumber } })
      if (dup) return NextResponse.json({ error: `رقم المرجع "${b.refNumber}" مستخدم بالفعل` }, { status: 400 })
    }

    const nz = (v: any) => (v === '' || v === undefined) ? null : v
    const letter = await prisma.letter.update({
      where: { id: params.id },
      data: {
        refNumber: b.refNumber || existing.refNumber,
        typeId: nz(b.typeId),
        date: b.date ? new Date(b.date) : existing.date,
        toBankName: nz(b.toBankName), toBankBranch: nz(b.toBankBranch),
        fromAccountName: nz(b.fromAccountName), fromAccountNo: nz(b.fromAccountNo),
        customerId: nz(b.customerId), supplierId: nz(b.supplierId),
        amount: Number(b.amount) || 0,
        currency: b.currency || existing.currency,
        amountWords: b.amountWords || amountToWords(Number(b.amount) || 0, b.currency || existing.currency),
        benAccountName: nz(b.benAccountName), benAccountNo: nz(b.benAccountNo),
        benBankName: nz(b.benBankName), benBranch: nz(b.benBranch),
        benIban: nz(b.benIban), benSwift: nz(b.benSwift), benCurrency: nz(b.benCurrency),
        corrBank: nz(b.corrBank), corrSwift: nz(b.corrSwift),
        refLine: nz(b.refLine), purpose: nz(b.purpose),
        settlementDate: b.settlementDate ? new Date(b.settlementDate) : null,
        invoiceData: nz(b.invoiceData),
        chargesNote: b.chargesNote ?? existing.chargesNote,
        extraNote: nz(b.extraNote),
        online: !!b.online,
      },
    })
    return NextResponse.json(letter)
  } catch (e: any) {
    return NextResponse.json({ error: e.message?.split('\n').pop() || 'Update failed' }, { status: 400 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = (session.user as any)?.role
  if (role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 })
  await prisma.letter.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
