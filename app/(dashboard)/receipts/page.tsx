'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { Receipt, Plus, FileDown, Upload, FileText, Trash2, Pencil, Printer } from 'lucide-react'
import Header from '@/components/layout/Header'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import EmptyState from '@/components/ui/EmptyState'
import Modal from '@/components/ui/Modal'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useI18n } from '@/lib/i18n'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'

const PM_AR = { CHECK: 'شيك', TRANSFER: 'تحويل', CASH: 'نقد' }
const PM_EN = { CHECK: 'Check', TRANSFER: 'Transfer', CASH: 'Cash' }
const PT_AR = { FULL: 'سداد كامل', PARTIAL: 'سداد جزئي', ADVANCE: 'دفعة مقدمة' }
const PT_EN = { FULL: 'Full', PARTIAL: 'Partial', ADVANCE: 'Advance' }

export default function ReceiptsPage() {
  const { data: session } = useSession()
  const role = (session?.user as any)?.role
  const { lang } = useI18n()
  const L = (ar: string, en: string) => lang === 'en' ? en : ar
  const PAYMENT_METHODS = lang === 'en' ? PM_EN : PM_AR
  const PAYMENT_TYPES = lang === 'en' ? PT_EN : PT_AR

  const [receipts, setReceipts] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [page, setPage] = useState(1)

  const [customers, setCustomers] = useState<any[]>([])
  const [invoices, setInvoices] = useState<any[]>([])
  const [banks, setBanks] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [form, setForm] = useState({
    customerId: '', invoiceId: '', categoryId: '', bankAccountId: '',
    paymentType: 'FULL', paymentMethod: 'TRANSFER',
    checkNumber: '', checkDate: '', amount: '', date: new Date().toISOString().split('T')[0], notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const fetchReceipts = useCallback(async () => {
    setLoading(true)
    try {
      const p = new URLSearchParams({ page: String(page), limit: '20', paymentMethod })
      if (dateFrom) p.set('dateFrom', dateFrom)
      if (dateTo) p.set('dateTo', dateTo)
      const res = await fetch(`/api/receipts?${p}`)
      const data = await res.json()
      setReceipts(data.receipts || [])
      setTotal(data.total || 0)
    } finally { setLoading(false) }
  }, [page, dateFrom, dateTo, paymentMethod])

  useEffect(() => { fetchReceipts() }, [fetchReceipts])

  useEffect(() => {
    Promise.all([
      fetch('/api/customers?limit=500').then(r => r.json()),
      fetch('/api/masters/banks').then(r => r.json()),
      fetch('/api/masters/payment-categories').then(r => r.json()),
    ]).then(([c, b, cat]) => {
      setCustomers(Array.isArray(c) ? c : c.customers || [])
      setBanks(Array.isArray(b) ? b : [])
      setCategories(Array.isArray(cat) ? cat : [])
    })
  }, [])

  useEffect(() => {
    if (!form.customerId) { setInvoices([]); return }
    fetch(`/api/invoices?customerId=${form.customerId}&status=UNPAID&limit=100`).then(r => r.json()).then(d => setInvoices(d.invoices || []))
  }, [form.customerId])

  const blankForm = { customerId: '', invoiceId: '', categoryId: '', bankAccountId: '', paymentType: 'FULL', paymentMethod: 'TRANSFER', checkNumber: '', checkDate: '', amount: '', date: new Date().toISOString().split('T')[0], notes: '' }

  function openNew() { setEditId(null); setForm(blankForm); setModal(true) }
  function openEdit(r: any) {
    setEditId(r.id)
    setForm({
      customerId: r.customerId, invoiceId: r.invoiceId || '', categoryId: r.categoryId || '', bankAccountId: r.bankAccountId || '',
      paymentType: r.paymentType, paymentMethod: r.paymentMethod, checkNumber: r.checkNumber || '',
      checkDate: r.checkDate ? new Date(r.checkDate).toISOString().split('T')[0] : '', amount: String(r.amount),
      date: new Date(r.date).toISOString().split('T')[0], notes: r.notes || '',
    })
    setModal(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.customerId || !form.amount) return toast.error(L('اختر العميل والمبلغ', 'Select customer and amount'))
    setSaving(true)
    try {
      const url = editId ? `/api/receipts/${editId}` : '/api/receipts'
      const method = editId ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, amount: Number(form.amount) }) })
      if (!res.ok) { const err = await res.json(); return toast.error(err.error || L('فشل', 'Failed')) }
      toast.success(editId ? L('تم التحديث', 'Updated') : L('تم إنشاء سند القبض', 'Receipt created'))
      setModal(false); setEditId(null); setForm(blankForm)
      fetchReceipts()
    } finally { setSaving(false) }
  }

  async function deleteReceipt(id: string, num: string) {
    if (!confirm(L(`حذف سند القبض "${num}"؟ سيتم عكس أثره على رصيد العميل والفاتورة.`, `Delete receipt "${num}"? This reverses its effect on the customer balance and invoice.`))) return
    const res = await fetch(`/api/receipts/${id}`, { method: 'DELETE' })
    const data = await res.json()
    if (res.ok) { toast.success(L('تم الحذف', 'Deleted')); fetchReceipts() }
    else toast.error(data.error || L('فشل', 'Failed'))
  }

  async function handleExcelImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const rows: any[] = XLSX.utils.sheet_to_json(ws)
    let ok = 0, fail = 0
    for (const row of rows) {
      const cust = customers.find(c => c.name === (row['اسم العميل'] || row['Customer'] || row['Client Name']))
      if (!cust) { fail++; continue }
      const method = row['طريقة الدفع'] || row['Method'] || ''
      const res = await fetch('/api/receipts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: cust.id, amount: Number(row['المبلغ'] || row['Amount']),
          date: row['التاريخ'] || row['Date'] || new Date().toISOString().split('T')[0],
          paymentMethod: /نقد|cash/i.test(method) ? 'CASH' : /شيك|check/i.test(method) ? 'CHECK' : 'TRANSFER',
          paymentType: 'FULL', notes: row['ملاحظات'] || row['Notes'] || '',
        }),
      })
      res.ok ? ok++ : fail++
    }
    toast.success(L(`تم استيراد ${ok} سند${fail > 0 ? ` (${fail} فشل)` : ''}`, `Imported ${ok}${fail > 0 ? ` (${fail} failed)` : ''}`))
    fetchReceipts()
    if (fileRef.current) fileRef.current.value = ''
  }

  function downloadTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Client Name', 'Amount', 'Date', 'Method', 'Check No', 'Notes'],
      ['Ahmed Mohamed', '1000', '2026-01-15', 'Transfer', '', 'Jan payment'],
    ])
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Receipts')
    XLSX.writeFile(wb, 'template-receipts.xlsx')
  }

  function exportExcel() {
    const rows = receipts.map(r => ({
      [L('رقم السند', 'Receipt No')]: r.receiptNumber, [L('العميل', 'Customer')]: r.customer?.name,
      [L('الفاتورة', 'Invoice')]: r.invoice?.invoiceNumber || '',
      [L('المبلغ', 'Amount')]: Number(r.amount), [L('التاريخ', 'Date')]: formatDate(r.date, lang),
      [L('نوع الدفع', 'Type')]: PAYMENT_TYPES[r.paymentType as keyof typeof PAYMENT_TYPES] || r.paymentType,
      [L('طريقة الدفع', 'Method')]: PAYMENT_METHODS[r.paymentMethod as keyof typeof PAYMENT_METHODS] || r.paymentMethod,
      [L('رقم الشيك', 'Check No')]: r.checkNumber || '', [L('البنك', 'Bank')]: r.bankAccount?.bankName || '', [L('ملاحظات', 'Notes')]: r.notes || '',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Receipts')
    XLSX.writeFile(wb, `receipts-${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const totalPages = Math.ceil(total / 20)

  return (
    <div className="flex flex-col min-h-screen">
      <Header title={L('سندات القبض', 'Receipt Vouchers')} />
      <div className="p-6 flex-1">
        <div className="card mb-5 p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <select className="input text-sm w-36" value={paymentMethod} onChange={e => { setPaymentMethod(e.target.value); setPage(1) }}>
              <option value="">{L('كل الطرق', 'All Methods')}</option>
              {Object.entries(PAYMENT_METHODS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <input type="date" className="input text-sm w-36" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              <span>—</span>
              <input type="date" className="input text-sm w-36" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
            <div className="flex gap-2 mr-auto">
              <button onClick={downloadTemplate} className="btn-secondary text-sm py-2"><FileText size={14} /> {L('قالب Excel', 'Template')}</button>
              <label className="btn-secondary text-sm py-2 cursor-pointer"><Upload size={14} /> {L('استيراد', 'Import')}<input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleExcelImport} /></label>
              <button onClick={exportExcel} className="btn-secondary text-sm py-2"><FileDown size={14} /> {L('تصدير', 'Export')}</button>
              <button onClick={openNew} className="btn-primary text-sm py-2"><Plus size={14} /> {L('سند قبض جديد', 'New Receipt')}</button>
            </div>
          </div>
        </div>

        <div className="mb-3 text-sm text-gray-500">{L('إجمالي:', 'Total:')} <span className="font-bold text-gray-800">{total}</span> {L('سند', 'receipts')}</div>

        <div className="card p-0 overflow-hidden">
          {loading ? <LoadingSpinner /> : receipts.length === 0 ? (
            <EmptyState icon={Receipt} title={L('لا توجد سندات قبض', 'No receipts')} action={<button onClick={() => setModal(true)} className="btn-primary"><Plus size={15} /> {L('جديد', 'New')}</button>} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    {[L('رقم السند', 'Receipt No'), L('العميل', 'Customer'), L('الفاتورة', 'Invoice'), L('المبلغ', 'Amount'), L('التاريخ', 'Date'), L('نوع الدفع', 'Type'), L('طريقة الدفع', 'Method'), L('رقم الشيك', 'Check No'), L('البنك', 'Bank'), L('إجراءات', 'Actions')].map(h =>
                      <th key={h} className="table-header text-start">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {receipts.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                      <td className="table-cell font-mono text-xs font-bold text-primary-600">{r.receiptNumber}</td>
                      <td className="table-cell font-medium">{r.customer?.name}</td>
                      <td className="table-cell text-xs text-gray-500">{r.invoice?.invoiceNumber || '—'}</td>
                      <td className="table-cell font-bold text-green-600" dir="ltr">{formatCurrency(r.amount, lang)}</td>
                      <td className="table-cell text-gray-500">{formatDate(r.date, lang)}</td>
                      <td className="table-cell text-xs">{PAYMENT_TYPES[r.paymentType as keyof typeof PAYMENT_TYPES] || r.paymentType}</td>
                      <td className="table-cell">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.paymentMethod === 'CASH' ? 'bg-green-50 text-green-700' : r.paymentMethod === 'CHECK' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
                          {PAYMENT_METHODS[r.paymentMethod as keyof typeof PAYMENT_METHODS] || r.paymentMethod}
                        </span>
                      </td>
                      <td className="table-cell text-xs font-mono">{r.checkNumber || '—'}</td>
                      <td className="table-cell text-xs">{r.bankAccount?.bankName || '—'}</td>
                      <td className="table-cell">
                        <div className="flex items-center gap-3">
                          <a href={`/receipts/${r.id}/print`} target="_blank" rel="noopener" className="text-blue-500 hover:text-blue-700" title={L('عرض', 'View')}><Receipt size={15} /></a>
                          <a href={`/receipts/${r.id}/print`} target="_blank" rel="noopener" className="text-gray-500 hover:text-gray-700" title={L('طباعة', 'Print')}><Printer size={15} /></a>
                          {role === 'ADMIN' && (
                            <>
                              <button onClick={() => openEdit(r)} className="text-amber-500 hover:text-amber-700" title={L('تعديل', 'Edit')}><Pencil size={15} /></button>
                              <button onClick={() => deleteReceipt(r.id, r.receiptNumber)} className="text-red-400 hover:text-red-600" title={L('حذف', 'Delete')}><Trash2 size={15} /></button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary px-3 py-1.5 text-xs">{L('السابق', 'Prev')}</button>
            <span className="text-sm text-gray-600">{L('صفحة', 'Page')} {page} {L('من', 'of')} {totalPages}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages} className="btn-secondary px-3 py-1.5 text-xs">{L('التالي', 'Next')}</button>
          </div>
        )}
      </div>

      <Modal open={modal} onClose={() => { setModal(false); setEditId(null) }} title={editId ? L('تعديل سند القبض', 'Edit Receipt') : L('سند قبض جديد', 'New Receipt')} size="lg">
        <form onSubmit={handleSave}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">{L('العميل', 'Customer')} <span className="text-red-500">*</span></label>
              <select className="input" value={form.customerId} onChange={e => setForm(f => ({ ...f, customerId: e.target.value, invoiceId: '' }))} required>
                <option value="">{L('— اختر العميل —', '— Select customer —')}</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">{L('الفاتورة (اختياري)', 'Invoice (optional)')}</label>
              <select className="input" value={form.invoiceId} onChange={e => setForm(f => ({ ...f, invoiceId: e.target.value }))}>
                <option value="">{L('— بدون ربط —', '— None —')}</option>
                {invoices.map(inv => <option key={inv.id} value={inv.id}>{inv.invoiceNumber} — {L('متبقي', 'rem.')} {Number(inv.remaining).toFixed(3)} OMR</option>)}
              </select>
            </div>
            <div>
              <label className="label">{L('نوع الدفعة', 'Payment Type')}</label>
              <select className="input" value={form.paymentType} onChange={e => setForm(f => ({ ...f, paymentType: e.target.value }))}>
                {Object.entries(PAYMENT_TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="label">{L('طريقة الدفع', 'Payment Method')}</label>
              <select className="input" value={form.paymentMethod} onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))}>
                {Object.entries(PAYMENT_METHODS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="label">{L('المبلغ', 'Amount')} <span className="text-red-500">*</span></label>
              <input type="number" className="input" min={0.001} step={0.001} value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required placeholder="0.000" />
            </div>
            <div>
              <label className="label">{L('التاريخ', 'Date')}</label>
              <input type="date" className="input" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            {form.paymentMethod === 'CHECK' && (
              <>
                <div>
                  <label className="label">{L('رقم الشيك', 'Check Number')}</label>
                  <input className="input" value={form.checkNumber} onChange={e => setForm(f => ({ ...f, checkNumber: e.target.value }))} placeholder="123456" />
                </div>
                <div>
                  <label className="label">{L('تاريخ الشيك', 'Check Date')}</label>
                  <input type="date" className="input" value={form.checkDate} onChange={e => setForm(f => ({ ...f, checkDate: e.target.value }))} />
                </div>
              </>
            )}
            <div>
              <label className="label">{L('الحساب البنكي', 'Bank Account')}</label>
              <select className="input" value={form.bankAccountId} onChange={e => setForm(f => ({ ...f, bankAccountId: e.target.value }))}>
                <option value="">{L('— لا يوجد —', '— None —')}</option>
                {banks.map(b => <option key={b.id} value={b.id}>{b.bankName} — {b.accountNumber}</option>)}
              </select>
            </div>
            <div>
              <label className="label">{L('التصنيف', 'Category')}</label>
              <select className="input" value={form.categoryId} onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}>
                <option value="">{L('— لا يوجد —', '— None —')}</option>
                {categories.map(c => <option key={c.id} value={c.id}>{lang === 'en' ? c.name : (c.nameAr || c.name)}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="label">{L('ملاحظات', 'Notes')}</label>
              <input className="input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder={L('ملاحظات اختيارية...', 'Optional notes...')} />
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">{saving ? L('جاري الحفظ...', 'Saving...') : editId ? L('حفظ التعديلات', 'Save Changes') : L('إنشاء السند', 'Create Receipt')}</button>
            <button type="button" onClick={() => setModal(false)} className="btn-secondary">{L('إلغاء', 'Cancel')}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
