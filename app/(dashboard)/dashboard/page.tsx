'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line,
} from 'recharts'
import { FileText, TrendingDown, TrendingUp, Users, Plus, Upload, Search, X } from 'lucide-react'
import Header from '@/components/layout/Header'
import StatCard from '@/components/ui/StatCard'
import { StatusBadge } from '@/components/ui/Badge'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { formatCurrency, formatDate } from '@/lib/utils'
import { hasPermission } from '@/lib/permissions'
import { Role } from '@/types'
import { useI18n } from '@/lib/i18n'

export default function DashboardPage() {
  const { data: session } = useSession()
  const role = (session?.user as any)?.role as Role
  const { lang } = useI18n()
  const L = (ar: string, en: string) => lang === 'en' ? en : ar

  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const fetchDashboard = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (dateFrom) params.set('dateFrom', dateFrom)
      if (dateTo) params.set('dateTo', dateTo)
      const res = await fetch(`/api/dashboard?${params}`)
      setData(await res.json())
    } finally {
      setLoading(false)
    }
  }, [dateFrom, dateTo])

  useEffect(() => { fetchDashboard() }, [fetchDashboard])

  function clearFilters() { setDateFrom(''); setDateTo('') }

  const salesKey = L('المبيعات', 'Sales')
  const collKey = L('التحصيلات', 'Collections')
  const monthlyChartData = (data?.monthlyData || []).map((d: any) => ({
    month: d.month,
    [salesKey]: Number(d.sales),
    [collKey]: Number(d.collections),
  }))

  return (
    <div className="flex flex-col min-h-screen">
      <Header title={L('لوحة التحكم', 'Dashboard')} />
      <div className="p-6 flex-1">
        {/* Filters */}
        <div className="card mb-6 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-gray-600 font-medium">
              <Search size={15} /> {L('تصفية البيانات', 'Filter Data')}
            </div>
            <div className="flex items-center gap-2">
              <input type="date" className="input text-sm w-36" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              <span className="text-gray-400">—</span>
              <input type="date" className="input text-sm w-36" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
            {(dateFrom || dateTo) && (
              <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700">
                <X size={13} /> {L('مسح الفلتر', 'Clear')}
              </button>
            )}
            <div className="flex gap-2 mr-auto">
              {hasPermission(role, 'CREATE_INVOICE') && (
                <Link href="/invoices/new" className="btn-primary text-sm py-2">
                  <Plus size={14} /> {L('فاتورة جديدة', 'New Invoice')}
                </Link>
              )}
              {hasPermission(role, 'IMPORT_CUSTOMERS') && (
                <Link href="/customers/import" className="btn-secondary text-sm py-2">
                  <Upload size={14} /> {L('استيراد عملاء', 'Import Customers')}
                </Link>
              )}
            </div>
          </div>
        </div>

        {loading ? <LoadingSpinner size="lg" /> : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              <StatCard title={L('إجمالي الفواتير الصادرة', 'Total Invoices')} value={String(data?.totalInvoices || 0)} icon={FileText} color="blue" subtitle={L('عدد الفواتير', 'Invoice count')} />
              <StatCard title={L('إجمالي المبالغ المستحقة', 'Total Outstanding')} value={formatCurrency(data?.totalOutstanding || 0, lang)} icon={TrendingDown} color="red" subtitle={L('الديون الخارجية', 'Receivables')} />
              <StatCard title={L('إجمالي التحصيلات', 'Total Collected')} value={formatCurrency(data?.totalCollected || 0, lang)} icon={TrendingUp} color="green" subtitle={L('الدفعات المستلمة', 'Payments received')} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Top 10 Invoices */}
              <div className="card">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <FileText size={18} className="text-primary-600" /> {L('أعلى 10 فواتير قيمةً', 'Top 10 Invoices')}
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr>
                        <th className="table-header text-start">{L('الفاتورة', 'Invoice')}</th>
                        <th className="table-header text-start">{L('العميل', 'Customer')}</th>
                        <th className="table-header text-start">{L('المبلغ', 'Amount')}</th>
                        <th className="table-header text-start">{L('الحالة', 'Status')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data?.topInvoices?.map((inv: any) => (
                        <tr key={inv.id} className="hover:bg-gray-50">
                          <td className="table-cell">
                            <Link href={`/invoices/${inv.id}`} className="text-primary-600 hover:underline font-mono text-xs">{inv.invoiceNumber}</Link>
                          </td>
                          <td className="table-cell font-medium">{inv.customer?.name}</td>
                          <td className="table-cell font-bold" dir="ltr">{formatCurrency(inv.totalAmount, lang)}</td>
                          <td className="table-cell"><StatusBadge status={inv.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Top Debtors */}
              <div className="card">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Users size={18} className="text-red-500" /> {L('أكبر العملاء مديونيةً', 'Top Debtors')}
                </h3>
                <div className="space-y-2">
                  {data?.topDebtors?.map((c: any, i: number) => (
                    <div key={c.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-red-50 transition-colors">
                      <span className="text-xs font-bold text-gray-400 w-5 text-center">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <Link href={`/customers/${c.id}`} className="font-semibold text-gray-800 hover:text-primary-600 text-sm block truncate">{c.name}</Link>
                        {c.phone && <p className="text-xs text-gray-400">{c.phone}</p>}
                      </div>
                      <span className="font-bold text-red-600 text-sm whitespace-nowrap" dir="ltr">{formatCurrency(c.currentBalance, lang)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Monthly Chart */}
            {monthlyChartData.length > 0 && (
              <div className="card">
                <h3 className="font-bold text-gray-800 mb-4">{L('حركة المبيعات والتحصيلات (آخر 12 شهر)', 'Sales & Collections (Last 12 Months)')}</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={monthlyChartData} margin={{ top: 5, right: 5, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fontFamily: 'Cairo' }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => formatCurrency(v, lang)} />
                    <Tooltip formatter={(v: any) => formatCurrency(v, lang)} labelStyle={{ fontFamily: 'Cairo' }} />
                    <Legend wrapperStyle={{ fontFamily: 'Cairo', fontSize: 13 }} />
                    <Bar dataKey={salesKey} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey={collKey} fill="#22c55e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
