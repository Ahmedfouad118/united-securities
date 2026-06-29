import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { hasPermission } from '@/lib/permissions'
import { Role } from '@/types'
import * as XLSX from 'xlsx'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = (session.user as any).role as Role
  if (!hasPermission(role, 'IMPORT_CUSTOMERS'))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const formData = await req.formData()
  const file = formData.get('file') as File
  if (!file) return NextResponse.json({ error: 'لم يتم رفع ملف' }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(sheet) as any[]

  let created = 0
  let skipped = 0
  const errors: string[] = []

  const g = (row: any, keys: string[]) => {
    for (const k of keys) for (const rk of Object.keys(row)) if (rk.trim().toLowerCase() === k.toLowerCase()) return row[rk]
    return undefined
  }

  for (const row of rows) {
    const name = g(row, ['الاسم', 'name', 'Name', 'Client Name', 'اسم العميل'])
    const nameAr = g(row, ['الاسم بالعربي', 'nameAr', 'الاسم عربي'])
    const phone = g(row, ['الهاتف', 'phone', 'Phone', 'Mobile Number', 'الجوال'])
    const email = g(row, ['الإيميل', 'email', 'Email', 'Email ID', 'البريد'])
    const vatNumber = g(row, ['رقم الضريبة', 'VAT Number', 'vatNumber', 'الرقم الضريبي'])
    const nin = g(row, ['الرقم المدني', 'NIN', 'nin'])
    const accountNumber = g(row, ['رقم الحساب', 'Account Number', 'accountNumber'])
    const clientNumber = g(row, ['رقم العميل', 'Client Number', 'clientNumber'])
    const shareholderNumber = g(row, ['رقم المساهم', 'Shareholder Number', 'shareholderNumber'])
    const address = g(row, ['العنوان', 'Address', 'address'])
    const openingBalance = parseFloat(String(g(row, ['الرصيد الافتتاحي', 'opening_balance', 'Opening Balance']) ?? '0')) || 0

    if (!name) { skipped++; continue }
    const s = (v: any) => v != null && String(v).trim() !== '' ? String(v).trim() : null

    try {
      const customer = await prisma.customer.create({
        data: {
          name: String(name).trim(),
          nameAr: s(nameAr), phone: s(phone), email: s(email),
          vatNumber: s(vatNumber), nin: s(nin), accountNumber: s(accountNumber),
          clientNumber: s(clientNumber), shareholderNumber: s(shareholderNumber), address: s(address),
          openingBalance,
          currentBalance: openingBalance,
        },
      })

      if (openingBalance > 0) {
        await prisma.transaction.create({
          data: {
            customerId: customer.id,
            type: 'OPENING_BALANCE',
            amount: openingBalance,
            notes: 'رصيد افتتاحي مستورد',
          },
        })
      }
      created++
    } catch (e: any) {
      errors.push(`خطأ في السطر ${created + skipped + 1}: ${e.message}`)
    }
  }

  return NextResponse.json({ created, skipped, errors })
}
