import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { amountToWords } from '@/lib/letterHtml'

function pick(row: any, keys: string[]): any {
  for (const k of keys) for (const rk of Object.keys(row)) if (rk.trim().toLowerCase() === k.trim().toLowerCase()) return row[rk]
  return undefined
}
function num(v: any): number { const n = parseFloat(String(v ?? '').replace(/,/g, '')); return isNaN(n) ? 0 : n }
function s(v: any): string | null { return v != null && String(v).trim() !== '' ? String(v).trim() : null }

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const typeId: string | null = body.typeId || null
  const rows: any[] = Array.isArray(body.rows) ? body.rows : []

  const last = await prisma.letter.findFirst({ orderBy: { seq: 'desc' }, select: { seq: true } })
  let nextSeq = (last?.seq || 0) + 1
  const year = new Date().getFullYear()

  let created = 0, skipped = 0
  const errors: string[] = []
  const noonUTC = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d, 12, 0, 0))

  for (let idx = 0; idx < rows.length; idx++) {
    const row = rows[idx]
    try {
      const amount = num(pick(row, ['Amount', 'المبلغ']))
      if (amount <= 0) { skipped++; errors.push(`Row ${idx + 2}: zero amount`); continue }
      const currency = s(pick(row, ['Currency', 'العملة'])) || 'OMR'

      // Optional customer match by number or name
      let customerId: string | null = null
      const clientNo = s(pick(row, ['Client Number', 'رقم العميل']))
      const clientName = s(pick(row, ['Client Name', 'اسم العميل']))
      if (clientNo) customerId = (await prisma.customer.findFirst({ where: { clientNumber: clientNo } }))?.id || null
      if (!customerId && clientName) customerId = (await prisma.customer.findFirst({ where: { name: clientName } }))?.id || null

      // Optional supplier match by name
      let supplierId: string | null = null
      const supName = s(pick(row, ['Supplier Name', 'اسم المورد']))
      if (supName) supplierId = (await prisma.supplier.findFirst({ where: { name: supName } }))?.id || null

      // Ref: keep provided or auto
      let ref = s(pick(row, ['Ref Number', 'Ref', 'المرجع']))
      let seq = nextSeq
      if (ref) {
        if (await prisma.letter.findUnique({ where: { refNumber: ref } })) { skipped++; errors.push(`Row ${idx + 2}: ref "${ref}" exists`); continue }
        const nums = ref.split('/').map((p: string) => parseInt(p)).filter((n: number) => !isNaN(n) && n < 100000)
        if (nums.length) seq = nums[0]
      } else {
        ref = `US/IM/${nextSeq}/${year}`
      }
      nextSeq++

      const dateRaw = pick(row, ['Date', 'التاريخ'])
      let date = new Date()
      if (typeof dateRaw === 'number') {
        const base = new Date(Math.round((dateRaw - 25569) * 86400 * 1000))
        date = noonUTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate())
      } else if (dateRaw) {
        const m = String(dateRaw).trim().match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/)
        if (m) date = noonUTC(m[3].length === 2 ? 2000 + +m[3] : +m[3], +m[2] - 1, +m[1])
      }

      await prisma.letter.create({
        data: {
          refNumber: ref, seq, typeId, date,
          customerId, supplierId,
          toBankName: s(pick(row, ['To Bank', 'البنك المرسل إليه'])),
          toBankBranch: s(pick(row, ['To Branch', 'الفرع'])),
          fromAccountName: s(pick(row, ['From Account Name'])) || 'United Securities LLC',
          fromAccountNo: s(pick(row, ['From Account No', 'رقم حسابنا'])),
          amount, currency,
          amountWords: amountToWords(amount, currency),
          benAccountName: s(pick(row, ['Beneficiary Name', 'اسم المستفيد'])),
          benAccountNo: s(pick(row, ['Beneficiary Account No', 'حساب المستفيد'])),
          benBankName: s(pick(row, ['Beneficiary Bank', 'بنك المستفيد'])),
          benBranch: s(pick(row, ['Beneficiary Branch'])),
          benIban: s(pick(row, ['IBAN'])),
          benSwift: s(pick(row, ['Swift', 'Swift Code'])),
          purpose: s(pick(row, ['Purpose', 'الغرض'])),
          chargesNote: 'Please note that all charges related to the transfer will be borne by us.',
          createdById: (session.user as any).id,
        },
      })
      created++
    } catch (e: any) {
      skipped++; errors.push(`Row ${idx + 2}: ${e.message?.split('\n').pop()}`)
    }
  }
  return NextResponse.json({ created, skipped, errors: errors.slice(0, 15) })
}
