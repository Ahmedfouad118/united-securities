import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

export async function GET() {
  const headers = [['الاسم', 'الهاتف', 'الإيميل', 'الرصيد الافتتاحي']]
  const sample = [
    ['محمد أحمد', '0501234567', 'mohamed@example.com', '5000'],
    ['شركة النور', '0551234567', '', '12000'],
    ['سارة محمود', '0561234567', 'sara@example.com', '0'],
  ]

  const ws = XLSX.utils.aoa_to_sheet([...headers, ...sample])
  ws['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 25 }, { wch: 18 }]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'العملاء')

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="customer-template.xlsx"',
    },
  })
}
