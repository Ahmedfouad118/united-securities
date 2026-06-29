'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import { Plus, Trash2, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { useI18n } from '@/lib/i18n'
import toast from 'react-hot-toast'

interface Item { description: string; serviceTypeId: string; quantity: number; unitPrice: number; vatRate: number }
interface FeeRow { period: string; days: number; nav: number; rate: number; fee: number }
interface NoteRow { invoiceNo: string; amount: number }

const TYPE_OPTS = [
  { value: 'REGULAR', ar: 'فاتورة عادية', en: 'Regular Invoice' },
  { value: 'MANAGEMENT_FEE', ar: 'رسوم إدارة', en: 'Management Fees' },
  { value: 'PERFORMANCE_FEE', ar: 'رسوم أداء', en: 'Performance Fees' },
  { value: 'DEBIT_NOTE', ar: 'مذكرة مدين (Debit Note)', en: 'Debit Note' },
  { value: 'CREDIT_NOTE', ar: 'مذكرة دائن (Credit Note)', en: 'Credit Note' },
]
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

function n3(x: number) { return (Math.round((x || 0) * 1000) / 1000) }

export default function NewInvoicePage() {
  const router = useRouter()
  const { lang } = useI18n()
  const L = (ar: string, en: string) => lang === 'en' ? en : ar
  const [customers, setCustomers] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [banks, setBanks] = useState<any[]>([])
  const [serviceTypes, setServiceTypes] = useState<any[]>([])
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    customerId: '', invoiceType: 'REGULAR', categoryId: '', bankAccountId: '',
    date: new Date().toISOString().split('T')[0], dueDate: '', vatRate: 5, notes: '', periodLabel: '',
  })
  const [items, setItems] = useState<Item[]>([{ description: '', serviceTypeId: '', quantity: 1, unitPrice: 0, vatRate: 5 }])
  const [feeRows, setFeeRows] = useState<FeeRow[]>([{ period: 'MAY', days: 31, nav: 0, rate: 0.5, fee: 0 }])
  const [noteRows, setNoteRows] = useState<NoteRow[]>([{ invoiceNo: '', amount: 0 }])

  const isMgmt = form.invoiceType === 'MANAGEMENT_FEE'
  const isPerf = form.invoiceType === 'PERFORMANCE_FEE'
  const isFee = isMgmt || isPerf
  const isNote = form.invoiceType === 'DEBIT_NOTE' || form.invoiceType === 'CREDIT_NOTE'
  const isRegular = !isFee && !isNote

  useEffect(() => {
    Promise.all([
      fetch('/api/customers?limit=500').then(r => r.json()),
      fetch('/api/masters/invoice-categories').then(r => r.json()),
      fetch('/api/masters/banks').then(r => r.json()),
      fetch('/api/masters/service-types').then(r => r.json()),
    ]).then(([c, cat, b, s]) => {
      setCustomers(Array.isArray(c) ? c : c.customers || [])
      setCategories(Array.isArray(cat) ? cat : [])
      setBanks(Array.isArray(b) ? b : [])
      setServiceTypes(Array.isArray(s) ? s : [])
    })
  }, [])

  // ---- Regular items ----
  function addItem() { setItems(prev => [...prev, { description: '', serviceTypeId: '', quantity: 1, unitPrice: 0, vatRate: form.vatRate }]) }
  function removeItem(i: number) { setItems(prev => prev.filter((_, idx) => idx !== i)) }
  function updateItem(i: number, key: keyof Item, val: any) { setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [key]: val } : it)) }
  function onServiceTypeChange(i: number, stId: string) {
    const st = serviceTypes.find(s => s.id === stId)
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, serviceTypeId: stId, description: st?.nameAr || st?.name || it.description, vatRate: st?.vatRate ?? form.vatRate } : it))
  }

  // ---- Fee rows (management = monthly with NAV; performance = yearly amount) ----
  function addFeeRow() { setFeeRows(prev => [...prev, isPerf ? { period: String(new Date().getFullYear()), days: 0, nav: 0, rate: 0, fee: 0 } : { period: 'JUN', days: 30, nav: 0, rate: 0.5, fee: 0 }]) }
  function removeFeeRow(i: number) { setFeeRows(prev => prev.filter((_, idx) => idx !== i)) }
  function updateFeeRow(i: number, key: keyof FeeRow, val: any) {
    setFeeRows(prev => prev.map((r, idx) => {
      if (idx !== i) return r
      const row = { ...r, [key]: val }
      // Management fee formula: fee = NAV * rate% * days/365 ; Performance: fee entered directly
      if (!isPerf && (key === 'nav' || key === 'rate' || key === 'days')) {
        row.fee = n3(Number(row.nav) * Number(row.rate) / 100 * Number(row.days) / 365)
      }
      return row
    }))
  }

  // ---- Note rows (debit/credit) ----
  function addNoteRow() { setNoteRows(prev => [...prev, { invoiceNo: '', amount: 0 }]) }
  function removeNoteRow(i: number) { setNoteRows(prev => prev.filter((_, idx) => idx !== i)) }
  function updateNoteRow(i: number, key: keyof NoteRow, val: any) { setNoteRows(prev => prev.map((r, idx) => idx === i ? { ...r, [key]: val } : r)) }

  // ---- Totals ----
  let subtotal = 0
  if (isFee) subtotal = feeRows.reduce((s, r) => s + Number(r.fee || 0), 0)
  else if (isNote) subtotal = noteRows.reduce((s, r) => s + Number(r.amount || 0), 0)
  else subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0)
  const vatAmount = isRegular
    ? items.reduce((s, i) => s + (i.quantity * i.unitPrice * i.vatRate / 100), 0)
    : subtotal * form.vatRate / 100
  const total = subtotal + vatAmount

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.customerId) return toast.error(L('اختر العميل', 'Select a customer'))

    let payloadItems: any[] = []
    let feeData: any = null
    let periodLabel = form.periodLabel

    if (isFee) {
      const valid = feeRows.filter(r => Number(r.fee) > 0)
      if (!valid.length) return toast.error(L('أضف صفاً واحداً على الأقل بقيمة', 'Add at least one row with a value'))
      feeData = valid.map(r => ({
        month: isPerf ? undefined : r.period, year: isPerf ? r.period : undefined,
        days: r.days, nav: r.nav, fee: n3(r.fee),
        vat: n3(r.fee * form.vatRate / 100), net: n3(r.fee * (1 + form.vatRate / 100)),
      }))
      // one item per row so totals aggregate
      payloadItems = valid.map(r => ({
        description: `${isPerf ? 'Performance' : 'Management'} Fees ${r.period}`,
        serviceTypeId: '', quantity: 1, unitPrice: n3(r.fee), vatRate: form.vatRate,
      }))
      if (!periodLabel) periodLabel = valid.map(r => r.period).join(', ')
    } else if (isNote) {
      const valid = noteRows.filter(r => r.invoiceNo && Number(r.amount) !== 0)
      if (!valid.length) return toast.error(L('أضف صفاً واحداً على الأقل', 'Add at least one row'))
      feeData = valid.map(r => ({ invoiceNo: r.invoiceNo, amount: n3(r.amount) }))
      payloadItems = valid.map(r => ({
        description: `Invoice ${r.invoiceNo}`, serviceTypeId: '', quantity: 1, unitPrice: n3(r.amount), vatRate: form.vatRate,
      }))
    } else {
      if (!items.some(i => i.description && i.quantity > 0 && i.unitPrice > 0)) return toast.error(L('أضف بنداً واحداً على الأقل', 'Add at least one item'))
      payloadItems = items
    }

    setSaving(true)
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form, vatRate: Number(form.vatRate), items: payloadItems,
          feeData: feeData ? JSON.stringify(feeData) : null, periodLabel,
        }),
      })
      if (!res.ok) { const err = await res.json(); toast.error(err.error || L('فشل', 'Failed')); return }
      const inv = await res.json()
      toast.success(L('تم إنشاء الفاتورة', 'Invoice created'))
      router.push(`/invoices/${inv.id}`)
    } finally { setSaving(false) }
  }

  const inp = 'input text-xs py-1.5'

  return (
    <div className="flex flex-col min-h-screen">
      <Header title={L('فاتورة جديدة', 'New Invoice')} />
      <div className="p-6">
        <Link href="/invoices" className="flex items-center gap-1 text-sm text-gray-500 hover:text-primary-600 mb-5">
          <ArrowRight size={14} className={lang === 'en' ? 'rotate-180' : ''} /> {L('العودة للفواتير', 'Back to Invoices')}
        </Link>

        <form onSubmit={handleSubmit} className="max-w-5xl space-y-5">
          {/* Invoice meta */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-700 mb-4 border-b pb-2">{L('بيانات الفاتورة', 'Invoice Details')}</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="label">{L('العميل', 'Customer')} <span className="text-red-500">*</span></label>
                <select className="input" value={form.customerId} onChange={e => setForm(f => ({ ...f, customerId: e.target.value }))} required>
                  <option value="">{L('— اختر العميل —', '— Select customer —')}</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}{c.clientNumber ? ` (${c.clientNumber})` : ''}</option>)}
                </select>
              </div>
              <div>
                <label className="label">{L('نوع الفاتورة', 'Invoice Type')}</label>
                <select className="input" value={form.invoiceType} onChange={e => setForm(f => ({ ...f, invoiceType: e.target.value }))}>
                  {TYPE_OPTS.map(o => <option key={o.value} value={o.value}>{L(o.ar, o.en)}</option>)}
                </select>
              </div>
              <div>
                <label className="label">{L('التصنيف', 'Category')}</label>
                <select className="input" value={form.categoryId} onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}>
                  <option value="">{L('— لا يوجد —', '— None —')}</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{lang === 'en' ? c.name : (c.nameAr || c.name)}</option>)}
                </select>
              </div>
              <div>
                <label className="label">{L('الحساب البنكي', 'Bank Account')}</label>
                <select className="input" value={form.bankAccountId} onChange={e => setForm(f => ({ ...f, bankAccountId: e.target.value }))}>
                  <option value="">{L('— لا يوجد —', '— None —')}</option>
                  {banks.map(b => <option key={b.id} value={b.id}>{b.bankName} — {b.accountNumber}</option>)}
                </select>
              </div>
              <div>
                <label className="label">{L('تاريخ الفاتورة', 'Invoice Date')}</label>
                <input type="date" className="input" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div>
                <label className="label">{L('تاريخ الاستحقاق', 'Due Date')}</label>
                <input type="date" className="input" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
              </div>
              <div>
                <label className="label flex items-center justify-between">
                  <span>{L('نسبة الضريبة %', 'VAT Rate %')}</span>
                  <label className="flex items-center gap-1 text-xs font-normal cursor-pointer">
                    <input type="checkbox" className="accent-primary-600" checked={form.vatRate > 0}
                      onChange={e => { const v = e.target.checked ? 5 : 0; setForm(f => ({ ...f, vatRate: v })); setItems(prev => prev.map(i => ({ ...i, vatRate: v }))) }} />
                    {L('تطبيق الضريبة', 'Apply VAT')}
                  </label>
                </label>
                <input type="number" className="input" min={0} max={100} step={0.01} value={form.vatRate}
                  onChange={e => { const v = Number(e.target.value); setForm(f => ({ ...f, vatRate: v })); setItems(prev => prev.map(i => ({ ...i, vatRate: v }))) }} />
              </div>
              {isFee && (
                <div>
                  <label className="label">{L('وصف الفترة', 'Period Label')}</label>
                  <input className="input" value={form.periodLabel} onChange={e => setForm(f => ({ ...f, periodLabel: e.target.value }))}
                    placeholder={isPerf ? '2025' : 'May 2026'} />
                </div>
              )}
              <div className="col-span-2">
                <label className="label">{L('ملاحظات', 'Notes')}</label>
                <input className="input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder={L('ملاحظات اختيارية...', 'Optional notes...')} />
              </div>
            </div>
          </div>

          {/* ---- REGULAR items ---- */}
          {isRegular && (
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4 border-b pb-2">
                <h3 className="font-semibold text-gray-700">{L('بنود الفاتورة', 'Invoice Items')}</h3>
                <button type="button" onClick={addItem} className="btn-secondary text-xs py-1.5"><Plus size={13} /> {L('إضافة بند', 'Add Item')}</button>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-12 gap-2 text-xs text-gray-500 font-medium px-1">
                  <div className="col-span-3">{L('نوع الخدمة', 'Service Type')}</div>
                  <div className="col-span-3">{L('الوصف', 'Description')}</div>
                  <div className="col-span-1 text-center">{L('الكمية', 'Qty')}</div>
                  <div className="col-span-2 text-center">{L('سعر الوحدة', 'Unit Price')}</div>
                  <div className="col-span-1 text-center">{L('ض%', 'VAT%')}</div>
                  <div className="col-span-1 text-center">{L('الإجمالي', 'Total')}</div>
                  <div className="col-span-1"></div>
                </div>
                {items.map((item, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center bg-gray-50 rounded-lg p-2">
                    <div className="col-span-3">
                      <select className={inp} value={item.serviceTypeId} onChange={e => onServiceTypeChange(i, e.target.value)}>
                        <option value="">{L('— اختر —', '— Select —')}</option>
                        {serviceTypes.map(s => <option key={s.id} value={s.id}>{lang === 'en' ? s.name : (s.nameAr || s.name)}</option>)}
                      </select>
                    </div>
                    <div className="col-span-3"><input className={inp} placeholder={L('الوصف', 'Description')} value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} /></div>
                    <div className="col-span-1"><input type="number" className={inp + ' text-center'} min={1} value={item.quantity} onChange={e => updateItem(i, 'quantity', Number(e.target.value))} /></div>
                    <div className="col-span-2"><input type="number" className={inp + ' text-center'} min={0} step={0.001} value={item.unitPrice} onChange={e => updateItem(i, 'unitPrice', Number(e.target.value))} /></div>
                    <div className="col-span-1"><input type="number" className={inp + ' text-center'} min={0} max={100} value={item.vatRate} onChange={e => updateItem(i, 'vatRate', Number(e.target.value))} /></div>
                    <div className="col-span-1 text-xs font-semibold text-center text-gray-700">{((item.quantity * item.unitPrice) * (1 + item.vatRate / 100)).toFixed(3)}</div>
                    <div className="col-span-1 flex justify-center">{items.length > 1 && <button type="button" onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>}</div>
                  </div>
                ))}
              </div>
              <Totals subtotal={subtotal} vatAmount={vatAmount} total={total} vatRate={form.vatRate} L={L} />
            </div>
          )}

          {/* ---- FEE table (Management / Performance) ---- */}
          {isFee && (
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4 border-b pb-2">
                <h3 className="font-semibold text-gray-700">{isPerf ? L('جدول رسوم الأداء (سنوي)', 'Performance Fees (Yearly)') : L('جدول رسوم الإدارة (شهري)', 'Management Fees (Monthly)')}</h3>
                <button type="button" onClick={addFeeRow} className="btn-secondary text-xs py-1.5"><Plus size={13} /> {L('إضافة صف', 'Add Row')}</button>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-12 gap-2 text-xs text-gray-500 font-medium px-1">
                  <div className="col-span-2">{isPerf ? L('السنة', 'Year') : L('الشهر', 'Month')}</div>
                  {!isPerf && <><div className="col-span-1 text-center">{L('الأيام', 'Days')}</div><div className="col-span-3 text-center">{L('إجمالي NAV', 'Total NAV')}</div><div className="col-span-1 text-center">{L('نسبة%', 'Rate%')}</div></>}
                  <div className={(isPerf ? 'col-span-4' : 'col-span-2') + ' text-center'}>{L('الرسوم', 'Fees')}</div>
                  <div className="col-span-2 text-center">{L('الصافي+ض', 'Net+VAT')}</div>
                  <div className="col-span-1"></div>
                </div>
                {feeRows.map((r, i) => {
                  const vat = n3(Number(r.fee) * form.vatRate / 100)
                  const net = n3(Number(r.fee) + vat)
                  return (
                    <div key={i} className="grid grid-cols-12 gap-2 items-center bg-gray-50 rounded-lg p-2">
                      <div className="col-span-2">
                        {isPerf
                          ? <input className={inp + ' text-center'} value={r.period} onChange={e => updateFeeRow(i, 'period', e.target.value)} placeholder="2025" />
                          : <select className={inp} value={r.period} onChange={e => updateFeeRow(i, 'period', e.target.value)}>{MONTHS.map(m => <option key={m} value={m}>{m}</option>)}</select>}
                      </div>
                      {!isPerf && <>
                        <div className="col-span-1"><input type="number" className={inp + ' text-center'} value={r.days} onChange={e => updateFeeRow(i, 'days', Number(e.target.value))} /></div>
                        <div className="col-span-3"><input type="number" className={inp + ' text-center'} step={0.001} value={r.nav} onChange={e => updateFeeRow(i, 'nav', Number(e.target.value))} /></div>
                        <div className="col-span-1"><input type="number" className={inp + ' text-center'} step={0.01} value={r.rate} onChange={e => updateFeeRow(i, 'rate', Number(e.target.value))} /></div>
                      </>}
                      <div className={isPerf ? 'col-span-4' : 'col-span-2'}>
                        <input type="number" className={inp + ' text-center ' + (isPerf ? '' : 'bg-gray-100')} step={0.001} value={n3(r.fee)} readOnly={!isPerf}
                          onChange={e => isPerf && updateFeeRow(i, 'fee', Number(e.target.value))} />
                      </div>
                      <div className="col-span-2 text-xs font-semibold text-center text-gray-700">{net.toFixed(3)}</div>
                      <div className="col-span-1 flex justify-center">{feeRows.length > 1 && <button type="button" onClick={() => removeFeeRow(i)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>}</div>
                    </div>
                  )
                })}
              </div>
              {!isPerf && <p className="text-xs text-gray-400 mt-2">{L('الرسوم تُحسب تلقائياً: NAV × النسبة% × الأيام ÷ 365', 'Fee auto-calculated: NAV × Rate% × Days ÷ 365')}</p>}
              <Totals subtotal={subtotal} vatAmount={vatAmount} total={total} vatRate={form.vatRate} L={L} />
            </div>
          )}

          {/* ---- NOTE table (Debit / Credit) ---- */}
          {isNote && (
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4 border-b pb-2">
                <h3 className="font-semibold text-gray-700">{L('فواتير التعديل', 'Adjustment Invoices')}</h3>
                <button type="button" onClick={addNoteRow} className="btn-secondary text-xs py-1.5"><Plus size={13} /> {L('إضافة فاتورة', 'Add Invoice')}</button>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-12 gap-2 text-xs text-gray-500 font-medium px-1">
                  <div className="col-span-6">{L('رقم الفاتورة', 'Invoice No')}</div>
                  <div className="col-span-5 text-center">{L('قيمة العمولة/التعديل', 'Commission / Amount')}</div>
                  <div className="col-span-1"></div>
                </div>
                {noteRows.map((r, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center bg-gray-50 rounded-lg p-2">
                    <div className="col-span-6"><input className={inp} value={r.invoiceNo} onChange={e => updateNoteRow(i, 'invoiceNo', e.target.value)} placeholder="3466" /></div>
                    <div className="col-span-5"><input type="number" className={inp + ' text-center'} step={0.001} value={r.amount} onChange={e => updateNoteRow(i, 'amount', Number(e.target.value))} /></div>
                    <div className="col-span-1 flex justify-center">{noteRows.length > 1 && <button type="button" onClick={() => removeNoteRow(i)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>}</div>
                  </div>
                ))}
              </div>
              <Totals subtotal={subtotal} vatAmount={vatAmount} total={total} vatRate={form.vatRate} L={L} />
            </div>
          )}

          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="btn-primary px-8">{saving ? L('جاري الحفظ...', 'Saving...') : L('إنشاء الفاتورة', 'Create Invoice')}</button>
            <Link href="/invoices" className="btn-secondary px-6">{L('إلغاء', 'Cancel')}</Link>
          </div>
        </form>
      </div>
    </div>
  )
}

function Totals({ subtotal, vatAmount, total, vatRate, L }: any) {
  return (
    <div className="mt-5 border-t pt-4 flex justify-end">
      <div className="w-64 space-y-2 text-sm">
        <div className="flex justify-between text-gray-600"><span>{L('المجموع الفرعي:', 'Subtotal:')}</span><span className="font-semibold" dir="ltr">{subtotal.toFixed(3)} OMR</span></div>
        <div className="flex justify-between text-gray-600"><span>{L('الضريبة', 'VAT')} ({vatRate}%):</span><span className="font-semibold" dir="ltr">{vatAmount.toFixed(3)} OMR</span></div>
        <div className="flex justify-between font-bold text-gray-800 text-base border-t pt-2"><span>{L('الإجمالي:', 'Total:')}</span><span className="text-primary-600" dir="ltr">{total.toFixed(3)} OMR</span></div>
      </div>
    </div>
  )
}
