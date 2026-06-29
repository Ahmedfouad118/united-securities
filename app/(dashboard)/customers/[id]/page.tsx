'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Header from '@/components/layout/Header'
import Link from 'next/link'
import { ArrowRight, FileText, CreditCard, TrendingUp, TrendingDown } from 'lucide-react'
import { StatusBadge } from '@/components/ui/Badge'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { formatCurrency, formatDate } from '@/lib/utils'

export default function CustomerDetailPage() {
  const { id } = useParams()
  const [customer, setCustomer] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/customers/${id}`)
      .then(r => r.json())
      .then(setCustomer)
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="flex flex-col min-h-screen"><Header title="ملف العميل" /><LoadingSpinner /></div>
  if (!customer) return <div className="p-6 text-center text-gray-500">العميل غير موجود</div>

  return (
    <div className="flex flex-col min-h-screen">
      <Header title={`ملف العميل — ${customer.name}`} />
      <div className="p-6">
        <Link href="/customers" className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm mb-6">
          <ArrowRight size={16} /> العودة للعملاء
        </Link>

        {/* Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="card md:col-span-2">
            <h2 className="font-bold text-gray-800 text-xl mb-4">{customer.name}</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-gray-400">الهاتف</p><p className="font-medium">{customer.phone || '—'}</p></div>
              <div><p className="text-gray-400">البريد</p><p className="font-medium">{customer.email || '—'}</p></div>
              <div><p className="text-gray-400">الرصيد الافتتاحي</p><p className="font-semibold">{formatCurrency(customer.openingBalance)}</p></div>
              <div>
                <p className="text-gray-400">الرصيد الحالي</p>
                <p className={`font-bold text-lg ${Number(customer.currentBalance) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(customer.currentBalance)}
                </p>
              </div>
            </div>
          </div>
          <div className="card flex flex-col gap-3">
            <Link href={`/invoices/new?customerId=${customer.id}`} className="btn-primary justify-center">
              <FileText size={16} /> فاتورة جديدة
            </Link>
            <Link href={`/payments/new?customerId=${customer.id}`} className="btn-secondary justify-center">
              <CreditCard size={16} /> تسجيل دفعة
            </Link>
          </div>
        </div>

        {/* Invoices */}
        <div className="card mb-6">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <FileText size={18} className="text-primary-600" /> الفواتير ({customer.invoices?.length || 0})
          </h3>
          {customer.invoices?.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">لا توجد فواتير</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    {['رقم الفاتورة', 'التاريخ', 'الإجمالي', 'المدفوع', 'المتبقي', 'الحالة'].map(h => (
                      <th key={h} className="table-header text-right">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {customer.invoices.map((inv: any) => (
                    <tr key={inv.id} className="hover:bg-gray-50">
                      <td className="table-cell">
                        <Link href={`/invoices/${inv.id}`} className="text-primary-600 hover:underline font-medium">{inv.invoiceNumber}</Link>
                      </td>
                      <td className="table-cell">{formatDate(inv.date)}</td>
                      <td className="table-cell font-semibold">{formatCurrency(inv.totalAmount)}</td>
                      <td className="table-cell text-green-600">{formatCurrency(inv.paidAmount)}</td>
                      <td className="table-cell text-red-600 font-semibold">{formatCurrency(inv.remaining)}</td>
                      <td className="table-cell"><StatusBadge status={inv.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Transactions */}
        <div className="card">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <CreditCard size={18} className="text-primary-600" /> كشف الحساب ({customer.transactions?.length || 0})
          </h3>
          <div className="space-y-2">
            {customer.transactions?.map((t: any) => (
              <div key={t.id} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-3">
                  {t.type === 'PAYMENT'
                    ? <TrendingDown size={16} className="text-green-600" />
                    : <TrendingUp size={16} className="text-red-600" />}
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      {t.type === 'OPENING_BALANCE' ? 'رصيد افتتاحي' : t.type === 'INVOICE' ? 'فاتورة' : 'دفعة سداد'}
                    </p>
                    <p className="text-xs text-gray-400">{formatDate(t.date)}{t.notes ? ` — ${t.notes}` : ''}</p>
                  </div>
                </div>
                <span className={`font-bold text-sm ${t.type === 'PAYMENT' ? 'text-green-600' : 'text-red-600'}`}>
                  {t.type === 'PAYMENT' ? '-' : '+'}{formatCurrency(t.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
