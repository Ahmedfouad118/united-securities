'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { Plus, Trash2, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { useI18n } from '@/lib/i18n'
import toast from 'react-hot-toast'

interface Item { description: string; quantity: number; unitPrice: number; vatRate: number }

export default function EditInvoicePage() {
  const { id } = useParams() as { id: string }
  const router = useRouter()
  const { lang } = useI18n()
  const L = (ar: string, en: string) => lang === 'en' ? en : ar
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [customers, setCustomers] = useState<any[]>([])
  const [banks, setBanks] = useState<any[]>([])
  const [inv, setInv] = useState<any>(null)
  const [items, setItems] = useState<Item[]>([])

  useEffect(() => {
    Promise.all([
      fetch(`/api/invoices/${id}`).then(r => r.json()),
      fetch('/api/customers?limit=1000').then(r => r.json()),
      fetch('/api/masters/banks').then(r => r.json()),
    ]).then(([data, c, b]) => {
      setInv({
        invoiceNumber: data.invoiceNumber, customerId: data.customerId, bankAccountId: data.bankAccountId || '',
        date: data.date ? new Date(data.date).toISOString().split('T')[0] : '',
        dueDate: data.dueDate ? new Date(data.dueDate).toISOString().split('T')[0] : '',
        vatRate: data.vatRate, notes: data.notes || '', invoiceType: data.invoiceType,
      })
      setItems((data.items || []).map((i: any) => ({ description: i.description, quantity: i.quantity, unitPrice: i.unitPrice, vatRate: i.vatRate })))
      setCustomers(Array.isArray(c) ? c : c.customers || [])
      setBanks(Array.isArray(b) ? b : [])
      setLoading(false)
    })
  }, [id])

  function updateItem(i: number, k: keyof Item, v: any) { setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [k]: v } : it)) }
  function addItem() { setItems(prev => [...prev, { description: '', quantity: 1, unitPrice: 0, vatRate: inv?.vatRate ?? 5 }]) }
  function removeItem(i: number) { setItems(prev => prev.filter((_, idx) => idx !== i)) }

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0)
  const vatAmount = items.reduce((s, i) => s + (i.quantity * i.unitPrice * i.vatRate / 100), 0)
  const total = subtotal + vatAmount

  async function save() {
    if (!inv.invoiceNumber?.trim()) return toast.error(L('رقم الفاتورة مطلوب', 'Invoice number required'))
    setSaving(true)
    try {
      const res = await fetch(`/api/invoices/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...inv, vatRate: Number(inv.vatRate), items }),
      })
      if (!res.ok) { const e = await res.json(); return toast.error(e.error || L('فشل', 'Failed')) }
      toast.success(L('تم حفظ التعديلات', 'Saved'))
      router.push(`/invoices/${id}`)
    } finally { setSaving(false) }
  }

  const inp = 'input text-xs py-1.5'

  return (
    <div className="flex flex-col min-h-screen">
      <Header title={L('تعديل الفاتورة', 'Edit Invoice')} />
      <div className="p-6">
        <Link href={`/invoices/${id}`} className="flex items-center gap-1 text-sm text-gray-500 hover:text-primary-600 mb-5">
          <ArrowRight size={14} className={lang === 'en' ? 'rotate-180' : ''} /> {L('رجوع', 'Back')}
        </Link>
        {loading || !inv ? <LoadingSpinner /> : (
          <div className="max-w-5xl space-y-5">
            <div className="card p-5">
              <h3 className="font-semibold text-gray-700 mb-4 border-b pb-2">{L('بيانات الفاتورة', 'Invoice Details')}</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="label">{L('رقم الفاتورة', 'Invoice Number')} <span className="text-red-500">*</span></label>
                  <input className="input font-mono" value={inv.invoiceNumber} onChange={e => setInv({ ...inv, invoiceNumber: e.target.value })} />
                </div>
                <div>
                  <label className="label">{L('العميل', 'Customer')}</label>
                  <select className="input" value={inv.customerId} onChange={e => setInv({ ...inv, customerId: e.target.value })}>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}{c.clientNumber ? ` (${c.clientNumber})` : ''}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">{L('الحساب البنكي', 'Bank Account')}</label>
                  <select className="input" value={inv.bankAccountId} onChange={e => setInv({ ...inv, bankAccountId: e.target.value })}>
                    <option value="">{L('— لا يوجد —', '— None —')}</option>
                    {banks.map(b => <option key={b.id} value={b.id}>{b.bankName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">{L('تاريخ الفاتورة', 'Invoice Date')}</label>
                  <input type="date" className="input" value={inv.date} onChange={e => setInv({ ...inv, date: e.target.value })} />
                </div>
                <div>
                  <label className="label">{L('تاريخ الاستحقاق', 'Due Date')}</label>
                  <input type="date" className="input" value={inv.dueDate} onChange={e => setInv({ ...inv, dueDate: e.target.value })} />
                </div>
                <div>
                  <label className="label flex items-center justify-between">
                    <span>{L('نسبة الضريبة %', 'VAT Rate %')}</span>
                    <label className="flex items-center gap-1 text-xs font-normal cursor-pointer">
                      <input type="checkbox" className="accent-primary-600" checked={inv.vatRate > 0}
                        onChange={e => { const v = e.target.checked ? 5 : 0; setInv({ ...inv, vatRate: v }); setItems(prev => prev.map(i => ({ ...i, vatRate: v }))) }} />
                      {L('تطبيق الضريبة', 'Apply VAT')}
                    </label>
                  </label>
                  <input type="number" className="input" min={0} max={100} step={0.01} value={inv.vatRate}
                    onChange={e => { const v = Number(e.target.value); setInv({ ...inv, vatRate: v }); setItems(prev => prev.map(i => ({ ...i, vatRate: v }))) }} />
                </div>
                <div className="col-span-2">
                  <label className="label">{L('ملاحظات', 'Notes')}</label>
                  <input className="input" value={inv.notes} onChange={e => setInv({ ...inv, notes: e.target.value })} />
                </div>
              </div>
            </div>

            <div className="card p-5">
              <div className="flex items-center justify-between mb-4 border-b pb-2">
                <h3 className="font-semibold text-gray-700">{L('البنود', 'Items')}</h3>
                <button type="button" onClick={addItem} className="btn-secondary text-xs py-1.5"><Plus size={13} /> {L('إضافة', 'Add')}</button>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-12 gap-2 text-xs text-gray-500 font-medium px-1">
                  <div className="col-span-6">{L('الوصف', 'Description')}</div>
                  <div className="col-span-1 text-center">{L('كمية', 'Qty')}</div>
                  <div className="col-span-2 text-center">{L('السعر', 'Price')}</div>
                  <div className="col-span-1 text-center">{L('ض%', 'VAT%')}</div>
                  <div className="col-span-2 text-center">{L('الإجمالي', 'Total')}</div>
                </div>
                {items.map((item, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center bg-gray-50 rounded-lg p-2">
                    <div className="col-span-6"><input className={inp} value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} /></div>
                    <div className="col-span-1"><input type="number" className={inp + ' text-center'} value={item.quantity} onChange={e => updateItem(i, 'quantity', Number(e.target.value))} /></div>
                    <div className="col-span-2"><input type="number" className={inp + ' text-center'} step={0.001} value={item.unitPrice} onChange={e => updateItem(i, 'unitPrice', Number(e.target.value))} /></div>
                    <div className="col-span-1"><input type="number" className={inp + ' text-center'} value={item.vatRate} onChange={e => updateItem(i, 'vatRate', Number(e.target.value))} /></div>
                    <div className="col-span-1 text-xs font-semibold text-center">{((item.quantity * item.unitPrice) * (1 + item.vatRate / 100)).toFixed(3)}</div>
                    <div className="col-span-1 flex justify-center">{items.length > 1 && <button onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>}</div>
                  </div>
                ))}
              </div>
              <div className="mt-5 border-t pt-4 flex justify-end">
                <div className="w-64 space-y-2 text-sm">
                  <div className="flex justify-between text-gray-600"><span>{L('المجموع الفرعي', 'Subtotal')}:</span><span className="font-semibold" dir="ltr">{subtotal.toFixed(3)} OMR</span></div>
                  <div className="flex justify-between text-gray-600"><span>{L('الضريبة', 'VAT')}:</span><span className="font-semibold" dir="ltr">{vatAmount.toFixed(3)} OMR</span></div>
                  <div className="flex justify-between font-bold text-gray-800 text-base border-t pt-2"><span>{L('الإجمالي', 'Total')}:</span><span className="text-primary-600" dir="ltr">{total.toFixed(3)} OMR</span></div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={save} disabled={saving} className="btn-primary px-8">{saving ? L('جاري الحفظ...', 'Saving...') : L('حفظ التعديلات', 'Save Changes')}</button>
              <Link href={`/invoices/${id}`} className="btn-secondary px-6">{L('إلغاء', 'Cancel')}</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
