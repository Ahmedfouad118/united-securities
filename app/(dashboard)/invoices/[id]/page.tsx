'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Header from '@/components/layout/Header'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import Link from 'next/link'
import { ArrowRight, Printer, Ban, CheckCircle, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import Modal from '@/components/ui/Modal'
import { Role } from '@/types'

const TYPE_LABELS: Record<string, string> = {
  REGULAR: 'فاتورة عادية', MANAGEMENT_FEE: 'رسوم إدارة',
  PERFORMANCE_FEE: 'رسوم أداء', DEBIT_NOTE: 'مذكرة مدين', CREDIT_NOTE: 'مذكرة دائن',
}
const STATUS_LABELS: Record<string, string> = { UNPAID: 'غير مدفوعة', PARTIAL: 'جزئية', PAID: 'مدفوعة', CANCELED: 'ملغاة' }
const STATUS_COLORS: Record<string, string> = {
  UNPAID: 'bg-red-50 text-red-700', PARTIAL: 'bg-yellow-50 text-yellow-700',
  PAID: 'bg-green-50 text-green-700', CANCELED: 'bg-gray-100 text-gray-500',
}
const APPROVAL_COLORS: Record<string, string> = { PENDING: 'text-yellow-600', APPROVED: 'text-green-600', REJECTED: 'text-red-600' }
const APPROVAL_LABELS: Record<string, string> = { PENDING: 'في انتظار الموافقة', APPROVED: 'مُوافق عليها', REJECTED: 'مرفوضة' }

export default function InvoiceDetailPage() {
  const { id } = useParams() as { id: string }
  const router = useRouter()
  const { data: session } = useSession()
  const role = (session?.user as any)?.role as Role

  const [invoice, setInvoice] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [cancelModal, setCancelModal] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [saving, setSaving] = useState(false)

  async function fetchInvoice() {
    setLoading(true)
    try {
      const res = await fetch(`/api/invoices/${id}`)
      if (res.ok) setInvoice(await res.json())
      else router.push('/invoices')
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchInvoice() }, [id])

  async function handleApprove(action: 'approve' | 'reject') {
    const res = await fetch(`/api/invoices/${id}/approve`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) })
    if (res.ok) { toast.success(action === 'approve' ? 'تمت الموافقة' : 'تم الرفض'); fetchInvoice() }
    else toast.error('فشل')
  }

  async function handleCancel() {
    setSaving(true)
    try {
      const res = await fetch(`/api/invoices/${id}/cancel`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cancelReason }) })
      if (res.ok) { toast.success('تم إلغاء الفاتورة'); setCancelModal(false); fetchInvoice() }
      else { const e = await res.json(); toast.error(e.error || 'فشل') }
    } finally { setSaving(false) }
  }

  if (loading) return <div className="flex flex-col min-h-screen"><Header title="تفاصيل الفاتورة" /><LoadingSpinner /></div>
  if (!invoice) return null

  return (
    <div className="flex flex-col min-h-screen">
      <Header title={`فاتورة ${invoice.invoiceNumber}`} />
      <div className="p-6">
        <div className="flex items-center justify-between mb-5">
          <Link href="/invoices" className="flex items-center gap-1 text-sm text-gray-500 hover:text-primary-600">
            <ArrowRight size={14} /> العودة للفواتير
          </Link>
          <div className="flex gap-2">
            <Link href={`/invoices/${id}/print`} className="btn-secondary text-sm py-2"><Printer size={14} /> طباعة</Link>
            {role === 'ADMIN' && !invoice.isCanceled && (
              <button onClick={() => setCancelModal(true)} className="btn-danger text-sm py-2"><Ban size={14} /> إلغاء الفاتورة</button>
            )}
            {(role === 'ADMIN' || role === 'ACCOUNTANT') && invoice.approvalStatus === 'PENDING' && !invoice.isCanceled && (
              <>
                <button onClick={() => handleApprove('approve')} className="btn-primary text-sm py-2 bg-green-600 hover:bg-green-700"><CheckCircle size={14} /> موافقة</button>
                <button onClick={() => handleApprove('reject')} className="btn-danger text-sm py-2"><XCircle size={14} /> رفض</button>
              </>
            )}
          </div>
        </div>

        <div className={cn('max-w-4xl space-y-5', invoice.isCanceled && 'opacity-75')}>
          {invoice.isCanceled && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
              <Ban className="text-red-500" size={20} />
              <div>
                <p className="font-semibold text-red-700">هذه الفاتورة ملغاة</p>
                {invoice.cancelReason && <p className="text-sm text-red-600 mt-1">السبب: {invoice.cancelReason}</p>}
                <p className="text-xs text-red-500 mt-1">تم الإلغاء بواسطة: {invoice.canceledBy} — {formatDate(invoice.canceledAt)}</p>
              </div>
            </div>
          )}

          {invoice.approvalStatus === 'PENDING' && !invoice.isCanceled && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-700 text-sm flex items-center gap-2">
              <span className="font-semibold">⏳ في انتظار الموافقة</span>
              <span>— هذه الفاتورة تحتاج إلى موافقة المحاسب أو المدير</span>
            </div>
          )}

          {/* Header info */}
          <div className="card p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-800 font-mono">{invoice.invoiceNumber}</h2>
                <p className="text-gray-500 text-sm mt-1">{TYPE_LABELS[invoice.invoiceType] || invoice.invoiceType}</p>
              </div>
              <div className="text-left flex flex-col gap-2 items-end">
                <span className={cn('px-3 py-1 rounded-full text-sm font-medium', STATUS_COLORS[invoice.status] || 'bg-gray-100 text-gray-600')}>
                  {STATUS_LABELS[invoice.status]}
                </span>
                <span className={cn('text-sm font-semibold', APPROVAL_COLORS[invoice.approvalStatus])}>
                  {APPROVAL_LABELS[invoice.approvalStatus]}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div><p className="text-gray-500">العميل</p><p className="font-semibold mt-1">{invoice.customer?.name}</p></div>
              <div><p className="text-gray-500">التاريخ</p><p className="font-semibold mt-1">{formatDate(invoice.date)}</p></div>
              {invoice.dueDate && <div><p className="text-gray-500">تاريخ الاستحقاق</p><p className="font-semibold mt-1 text-red-600">{formatDate(invoice.dueDate)}</p></div>}
              {invoice.category && <div><p className="text-gray-500">التصنيف</p><p className="font-semibold mt-1">{invoice.category.nameAr || invoice.category.name}</p></div>}
              {invoice.bankAccount && <div><p className="text-gray-500">البنك</p><p className="font-semibold mt-1">{invoice.bankAccount.bankName}</p></div>}
              {invoice.customer?.nin && <div><p className="text-gray-500">رقم التعريف</p><p className="font-semibold mt-1 font-mono">{invoice.customer.nin}</p></div>}
              {invoice.customer?.accountNumber && <div><p className="text-gray-500">رقم الحساب</p><p className="font-semibold mt-1 font-mono">{invoice.customer.accountNumber}</p></div>}
              {invoice.notes && <div className="col-span-full"><p className="text-gray-500">ملاحظات</p><p className="font-medium mt-1">{invoice.notes}</p></div>}
            </div>
          </div>

          {/* Items table */}
          {invoice.items?.length > 0 && (
            <div className="card p-5">
              <h3 className="font-semibold text-gray-700 mb-4 border-b pb-2">بنود الفاتورة</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    {['الخدمة / الوصف', 'الكمية', 'سعر الوحدة', 'الضريبة %', 'قيمة الضريبة', 'الإجمالي'].map(h =>
                      <th key={h} className="table-header text-right">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((item: any) => (
                    <tr key={item.id} className="border-b hover:bg-gray-50">
                      <td className="table-cell">
                        <p className="font-medium">{item.description}</p>
                        {item.serviceType && <p className="text-xs text-gray-400">{item.serviceType.name}</p>}
                      </td>
                      <td className="table-cell text-center">{item.quantity}</td>
                      <td className="table-cell text-center">{formatCurrency(item.unitPrice)}</td>
                      <td className="table-cell text-center">{item.vatRate}%</td>
                      <td className="table-cell text-center">{formatCurrency(item.vatAmount)}</td>
                      <td className="table-cell text-center font-bold">{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-4 flex justify-end">
                <div className="w-64 space-y-2 text-sm">
                  <div className="flex justify-between text-gray-600"><span>المجموع الفرعي:</span><span>{formatCurrency(invoice.subtotal)}</span></div>
                  <div className="flex justify-between text-gray-600"><span>الضريبة ({invoice.vatRate}%):</span><span>{formatCurrency(invoice.vatAmount)}</span></div>
                  <div className="flex justify-between font-bold text-gray-800 text-base border-t pt-2"><span>الإجمالي:</span><span className="text-primary-600">{formatCurrency(invoice.totalAmount)}</span></div>
                  <div className="flex justify-between text-green-600"><span>المدفوع:</span><span>{formatCurrency(invoice.paidAmount)}</span></div>
                  <div className="flex justify-between font-bold text-red-600 border-t pt-2"><span>المتبقي:</span><span>{formatCurrency(invoice.remaining)}</span></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal open={cancelModal} onClose={() => setCancelModal(false)} title="إلغاء الفاتورة">
        <div className="space-y-4">
          <p className="text-gray-600 text-sm">هل أنت متأكد من إلغاء الفاتورة <strong>{invoice.invoiceNumber}</strong>؟ سيتم التراجع عن تأثيرها على رصيد العميل.</p>
          <div>
            <label className="label">سبب الإلغاء</label>
            <textarea className="input resize-none h-20" value={cancelReason} onChange={e => setCancelReason(e.target.value)} placeholder="اكتب سبب الإلغاء..." />
          </div>
          <div className="flex gap-3">
            <button onClick={handleCancel} disabled={saving} className="btn-danger flex-1 justify-center">{saving ? 'جاري الإلغاء...' : 'تأكيد الإلغاء'}</button>
            <button onClick={() => setCancelModal(false)} className="btn-secondary">تراجع</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
