'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Header from '@/components/layout/Header'
import Link from 'next/link'
import { ArrowRight, CreditCard } from 'lucide-react'
import { Customer } from '@/types'
import { formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'

function NewPaymentInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const defaultCustomerId = searchParams.get('customerId') || ''
  const defaultInvoiceId = searchParams.get('invoiceId') || ''

  const [customers, setCustomers] = useState<Customer[]>([])
  const [invoices, setInvoices] = useState<any[]>([])
  const [customerId, setCustomerId] = useState(defaultCustomerId)
  const [invoiceId, setInvoiceId] = useState(defaultInvoiceId)
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/customers?limit=200').then(r => r.json()).then(d => setCustomers(d.customers || []))
  }, [])

  useEffect(() => {
    if (!customerId) { setInvoices([]); return }
    fetch(`/api/invoices?status=UNPAID&search=&limit=50`).then(r => r.json()).then(d => {
      setInvoices((d.invoices || []).filter((inv: any) => inv.customerId === customerId))
    })
  }, [customerId])

  const selectedCustomer = customers.find(c => c.id === customerId)
  const selectedInvoice = invoices.find(i => i.id === invoiceId)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!customerId) return toast.error('اختر العميل')
    if (!amount || parseFloat(amount) <= 0) return toast.error('أدخل المبلغ')
    setLoading(true)
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId, invoiceId: invoiceId || null, amount: parseFloat(amount), date, notes }),
      })
      if (!res.ok) { const err = await res.json(); return toast.error(err.error || 'فشل') }
      toast.success('تم تسجيل الدفعة بنجاح')
      router.push(invoiceId ? `/invoices/${invoiceId}` : '/invoices')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="تسجيل دفعة سداد" />
      <div className="p-6 max-w-xl mx-auto w-full">
        <Link href="/invoices" className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm mb-6">
          <ArrowRight size={16} /> العودة
        </Link>

        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-green-50 rounded-xl p-2.5"><CreditCard size={22} className="text-green-600" /></div>
            <h2 className="text-lg font-bold text-gray-800">بيانات الدفعة</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">العميل <span className="text-red-500">*</span></label>
              <select className="input" value={customerId} onChange={e => { setCustomerId(e.target.value); setInvoiceId('') }}>
                <option value="">— اختر العميل —</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name} — مديونية: {formatCurrency(c.currentBalance)}</option>)}
              </select>
            </div>

            {invoices.length > 0 && (
              <div>
                <label className="label">ربط بفاتورة (اختياري)</label>
                <select className="input" value={invoiceId} onChange={e => setInvoiceId(e.target.value)}>
                  <option value="">— بدون فاتورة محددة —</option>
                  {invoices.map(inv => (
                    <option key={inv.id} value={inv.id}>{inv.invoiceNumber} — متبقي: {formatCurrency(inv.remaining)}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="label">المبلغ <span className="text-red-500">*</span></label>
              <input type="number" min="0.01" step="0.01" className="input text-lg font-bold" placeholder="0.00"
                value={amount} onChange={e => setAmount(e.target.value)} />
              {selectedInvoice && (
                <button type="button" onClick={() => setAmount(String(selectedInvoice.remaining))}
                  className="text-xs text-primary-600 hover:underline mt-1">
                  سداد كامل المبلغ المتبقي ({formatCurrency(selectedInvoice.remaining)})
                </button>
              )}
              {!selectedInvoice && selectedCustomer && Number(selectedCustomer.currentBalance) > 0 && (
                <p className="text-xs text-gray-400 mt-1">الرصيد المستحق: {formatCurrency(selectedCustomer.currentBalance)}</p>
              )}
            </div>

            <div>
              <label className="label">التاريخ</label>
              <input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} />
            </div>

            <div>
              <label className="label">ملاحظات</label>
              <input className="input" placeholder="رقم شيك، طريقة الدفع، ..." value={notes} onChange={e => setNotes(e.target.value)} />
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center bg-green-600 hover:bg-green-700">
                {loading ? 'جاري الحفظ...' : 'تسجيل الدفعة'}
              </button>
              <Link href="/invoices" className="btn-secondary justify-center">إلغاء</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function NewPaymentPage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-400">Loading...</div>}>
      <NewPaymentInner />
    </Suspense>
  )
}
