import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { hasPermission } from '@/lib/permissions'
import { Role } from '@/types'
import * as XLSX from 'xlsx'

const PREFIX: Record<string, string> = { REGULAR: 'INV', MANAGEMENT_FEE: 'MF', PERFORMANCE_FEE: 'PF', DEBIT_NOTE: 'DN', CREDIT_NOTE: 'CN' }

function pick(row: any, keys: string[]): any {
  for (const k of keys) {
    for (const rk of Object.keys(row)) {
      if (rk.trim().toLowerCase() === k.trim().toLowerCase()) return row[rk]
    }
  }
  return undefined
}
function num(v: any): number { const n = parseFloat(String(v ?? '').replace(/,/g, '')); return isNaN(n) ? 0 : n }

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = (session.user as any).role as Role
  if (!hasPermission(role, 'CREATE_INVOICE')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Accept either a small JSON batch { type, rows } (preferred — avoids serverless timeout)
  // or a legacy multipart file upload.
  let type = 'REGULAR'
  let rows: any[] = []
  const ct = req.headers.get('content-type') || ''
  if (ct.includes('application/json')) {
    const body = await req.json()
    type = body.type || 'REGULAR'
    rows = Array.isArray(body.rows) ? body.rows : []
  } else {
    const formData = await req.formData()
    const file = formData.get('file') as File
    type = (formData.get('type') as string) || 'REGULAR'
    if (!file) return NextResponse.json({ error: 'لم يتم رفع ملف' }, { status: 400 })
    const buffer = Buffer.from(await file.arrayBuffer())
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    rows = XLSX.utils.sheet_to_json(sheet) as any[]
  }

  const isFee = type === 'MANAGEMENT_FEE' || type === 'PERFORMANCE_FEE'
  const isPerf = type === 'PERFORMANCE_FEE'
  const isNote = type === 'DEBIT_NOTE' || type === 'CREDIT_NOTE'

  // Preload banks once (case-insensitive lookup) — avoids a query per row
  const allBanks = await prisma.bankAccount.findMany()
  const bankByName = new Map<string, string>()
  for (const b of allBanks) {
    if (b.bankName) bankByName.set(b.bankName.trim().toLowerCase(), b.id)
    if (b.bankNameAr) bankByName.set(b.bankNameAr.trim().toLowerCase(), b.id)
  }

  // sequence start
  const now = new Date()
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
  const last = await prisma.invoice.findFirst({ where: { invoiceType: type }, orderBy: { createdAt: 'desc' }, select: { invoiceNumber: true } })
  let seq = 1
  if (last?.invoiceNumber) { const p = parseInt(last.invoiceNumber.split('-').pop() || '0'); if (!isNaN(p)) seq = p + 1 }

  let created = 0, skipped = 0
  const errors: string[] = []
  const isAdmin = role === 'ADMIN'

  for (let idx = 0; idx < rows.length; idx++) {
    const row = rows[idx]
    try {
      const clientNo = pick(row, ['Client Number', 'رقم العميل', 'clientNumber'])
      const clientName = pick(row, ['Client Name', 'اسم العميل', 'العميل', 'name', 'Customer'])
      // Match customer
      let customer = null
      if (clientNo) customer = await prisma.customer.findFirst({ where: { OR: [{ clientNumber: String(clientNo).trim() }, { accountNumber: String(clientNo).trim() }] } })
      if (!customer && clientName) customer = await prisma.customer.findFirst({ where: { name: String(clientName).trim() } })
      if (!customer && clientName) {
        // auto-create minimal customer
        customer = await prisma.customer.create({ data: {
          name: String(clientName).trim(),
          clientNumber: clientNo ? String(clientNo).trim() : null,
          phone: pick(row, ['Mobile Number', 'الهاتف', 'phone']) ? String(pick(row, ['Mobile Number', 'الهاتف', 'phone'])) : null,
          email: pick(row, ['Email ID', 'email', 'الإيميل']) ? String(pick(row, ['Email ID', 'email', 'الإيميل'])) : null,
          address: pick(row, ['Address', 'العنوان']) ? String(pick(row, ['Address', 'العنوان'])) : null,
          vatNumber: pick(row, ['VAT Number', 'رقم الضريبة']) ? String(pick(row, ['VAT Number', 'رقم الضريبة'])) : null,
        } })
      }
      if (!customer) { skipped++; errors.push(`Row ${idx + 2}: no customer`); continue }

      const vatRate = num(pick(row, ['VAT%', 'الضريبة%', 'vatRate'])) || 5
      const dateRaw = pick(row, ['Date', 'التاريخ', 'date'])
      let date = now
      if (dateRaw instanceof Date && !isNaN(dateRaw.getTime())) {
        date = dateRaw
      } else if (typeof dateRaw === 'number') {
        // Excel serial date number → JS date (Excel epoch 1899-12-30)
        date = new Date(Math.round((dateRaw - 25569) * 86400 * 1000))
      } else if (dateRaw) {
        const s = String(dateRaw).trim()
        // Handle dd/mm/yyyy and dd-mm-yyyy explicitly (avoid US mm/dd ambiguity)
        const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/)
        if (m) {
          const dd = +m[1], mm = +m[2], yy = m[3].length === 2 ? 2000 + +m[3] : +m[3]
          const d = new Date(yy, mm - 1, dd)
          if (!isNaN(d.getTime())) date = d
        } else {
          const d = new Date(s)
          if (!isNaN(d.getTime())) date = d
        }
      }

      let subtotal = 0, items: any[] = [], feeData: any = null, periodLabel = ''

      if (isFee) {
        const fee = num(pick(row, ['Fees', 'NET FEES', 'الرسوم', 'fee']))
        const navVal = num(pick(row, ['NAV', 'Net NAV', 'Total NAV']))
        const days = num(pick(row, ['Days', 'الأيام']))
        const period = String(pick(row, [isPerf ? 'Year' : 'Month', 'الشهر', 'السنة', 'period']) ?? '')
        const computedFee = fee || (navVal * (num(pick(row, ['Fees%', 'Fee%', 'rate'])) || 0.5) / 100 * (days || 365) / 365)
        subtotal = computedFee
        feeData = [{ month: isPerf ? undefined : period, year: isPerf ? period : undefined, days, nav: navVal, fee: computedFee, vat: computedFee * vatRate / 100, net: computedFee * (1 + vatRate / 100) }]
        periodLabel = period
        items = [{ description: `${isPerf ? 'Performance' : 'Management'} Fees ${period}`, quantity: 1, unitPrice: computedFee, vatRate }]
      } else if (isNote) {
        const amount = num(pick(row, ['Amount', 'القيمة', 'amount', 'Commission']))
        const refNo = String(pick(row, ['Invoice No', 'رقم الفاتورة', 'invoiceNo']) ?? '')
        subtotal = amount
        feeData = [{ invoiceNo: refNo, amount }]
        items = [{ description: `Invoice ${refNo}`, quantity: 1, unitPrice: amount, vatRate }]
      } else {
        const amount = num(pick(row, ['Amount', 'القيمة', 'amount', 'Total']))
        const desc = String(pick(row, ['Description', 'الوصف', 'desc']) ?? 'Service')
        subtotal = amount
        items = [{ description: desc, quantity: 1, unitPrice: amount, vatRate }]
      }

      if (subtotal <= 0) { skipped++; errors.push(`Row ${idx + 2}: zero amount`); continue }

      const vatAmount = subtotal * vatRate / 100
      const totalAmount = subtotal + vatAmount

      // Optional bank (case-insensitive match from preloaded map) + notes
      const bankName = pick(row, ['Bank Name', 'اسم البنك', 'Bank', 'bankName'])
      let bankAccountId: string | null = null
      if (bankName && String(bankName).trim()) {
        bankAccountId = bankByName.get(String(bankName).trim().toLowerCase()) || null
      }
      const notesVal = pick(row, ['Notes', 'ملاحظات', 'notes'])
      const notes = notesVal != null && String(notesVal).trim() !== '' ? String(notesVal).trim() : null

      // Invoice number: use the one from the sheet (old serial) if provided; else auto-generate
      const providedNumber = pick(row, ['Invoice Number', 'رقم الفاتورة', 'Ref Number (Automated)', 'Ref Number', 'invoiceNumber'])
      let invoiceNumber: string
      if (providedNumber && String(providedNumber).trim()) {
        invoiceNumber = String(providedNumber).trim()
        const exists = await prisma.invoice.findUnique({ where: { invoiceNumber } })
        if (exists) { skipped++; errors.push(`Row ${idx + 2}: invoice number "${invoiceNumber}" already exists`); continue }
      } else {
        invoiceNumber = `${PREFIX[type]}-${ym}-${String(seq++).padStart(4, '0')}`
      }

      const invoice = await prisma.invoice.create({
        data: {
          invoiceNumber, invoiceType: type, customerId: customer.id, date,
          bankAccountId, notes,
          subtotal, vatRate, vatAmount, totalAmount, paidAmount: 0, remaining: totalAmount,
          status: 'UNPAID', approvalStatus: isAdmin ? 'APPROVED' : 'PENDING',
          approvedById: isAdmin ? (session.user as any).id : null, approvedAt: isAdmin ? new Date() : null,
          feeData: feeData ? JSON.stringify(feeData) : null, periodLabel: periodLabel || null,
          createdById: (session.user as any).id,
          items: { create: items.map((i: any) => { const sub = i.quantity * i.unitPrice; const vat = sub * i.vatRate / 100; return { description: i.description, quantity: i.quantity, unitPrice: i.unitPrice, subtotal: sub, vatRate: i.vatRate, vatAmount: vat, total: sub + vat } }) },
        },
      })
      const delta = type === 'CREDIT_NOTE' ? -totalAmount : totalAmount
      await prisma.customer.update({ where: { id: customer.id }, data: { currentBalance: { increment: delta } } })
      await prisma.transaction.create({ data: { customerId: customer.id, invoiceId: invoice.id, type: type === 'CREDIT_NOTE' ? 'PAYMENT' : 'INVOICE', amount: totalAmount, notes: invoiceNumber } })
      created++
    } catch (e: any) {
      skipped++; errors.push(`Row ${idx + 2}: ${e.message}`)
    }
  }

  return NextResponse.json({ created, skipped, errors: errors.slice(0, 20) })
}
