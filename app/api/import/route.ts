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

  // Accept a JSON batch { rows } (preferred — avoids serverless timeout) or a file upload
  let rows: any[] = []
  const ct = req.headers.get('content-type') || ''
  if (ct.includes('application/json')) {
    const body = await req.json()
    rows = Array.isArray(body.rows) ? body.rows : []
  } else {
    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) return NextResponse.json({ error: 'لم يتم رفع ملف' }, { status: 400 })
    const buffer = Buffer.from(await file.arrayBuffer())
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    rows = XLSX.utils.sheet_to_json(sheet) as any[]
  }

  let created = 0
  let updated = 0
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
    // strip commas so "5,000" parses as 5000, not 5
    const openingBalance = parseFloat(String(g(row, ['الرصيد الافتتاحي', 'opening_balance', 'Opening Balance']) ?? '0').replace(/,/g, '')) || 0

    if (!name) { skipped++; continue }
    const s = (v: any) => v != null && String(v).trim() !== '' ? String(v).trim() : null

    try {
      // Upsert: if the customer already exists (auto-created by invoice import),
      // UPDATE it — filling details and adjusting balances by the opening delta.
      let existing = null
      if (s(clientNumber)) existing = await prisma.customer.findFirst({ where: { clientNumber: s(clientNumber)! } })
      if (!existing) existing = await prisma.customer.findFirst({ where: { name: String(name).trim() } })

      const fields = {
        name: String(name).trim(),
        nameAr: s(nameAr), phone: s(phone), email: s(email),
        vatNumber: s(vatNumber), nin: s(nin), accountNumber: s(accountNumber),
        clientNumber: s(clientNumber), shareholderNumber: s(shareholderNumber), address: s(address),
      }

      if (existing) {
        const delta = openingBalance - Number(existing.openingBalance || 0)
        await prisma.customer.update({
          where: { id: existing.id },
          data: {
            // only overwrite fields that have a value in the sheet
            ...Object.fromEntries(Object.entries(fields).filter(([, v]) => v != null && v !== '')),
            openingBalance,
            currentBalance: Number(existing.currentBalance || 0) + delta,
          },
        })
        updated++
      } else {
        const customer = await prisma.customer.create({
          data: { ...fields, openingBalance, currentBalance: openingBalance },
        })
        if (openingBalance > 0) {
          await prisma.transaction.create({
            data: { customerId: customer.id, type: 'OPENING_BALANCE', amount: openingBalance, notes: 'رصيد افتتاحي مستورد' },
          })
        }
        created++
      }
    } catch (e: any) {
      errors.push(`خطأ في السطر ${created + updated + skipped + 1}: ${e.message}`)
    }
  }

  return NextResponse.json({ created, updated, skipped, errors })
}
