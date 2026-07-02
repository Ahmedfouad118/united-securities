'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Users, Plus, Search, Upload, Eye, Edit2, Trash2, Phone, Mail, FileDown, Download } from 'lucide-react'
import Header from '@/components/layout/Header'
import EmptyState from '@/components/ui/EmptyState'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { hasPermission } from '@/lib/permissions'
import { formatCurrency } from '@/lib/utils'
import { Customer, Role } from '@/types'
import { useI18n } from '@/lib/i18n'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'

export default function CustomersPage() {
  const { data: session } = useSession()
  const role = (session?.user as any)?.role as Role
  const { lang } = useI18n()
  const L = (ar: string, en: string) => lang === 'en' ? en : ar

  function downloadTemplate() {
    const cols = { 'Client Number': '', 'Client Name': '', 'الاسم بالعربي': '', 'Shareholder Number': '', 'Account Number': '', 'NIN': '', 'VAT Number': '', 'Phone': '', 'Email': '', 'Address': '', 'Opening Balance': 0 }
    const ws = XLSX.utils.json_to_sheet([cols])
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Customers')
    XLSX.writeFile(wb, 'customers-template.xlsx')
  }

  async function exportCustomers() {
    const res = await fetch('/api/customers?limit=10000')
    const data = await res.json()
    const list = data.customers || []
    const rows = list.map((c: any) => ({
      'Client Number': c.clientNumber || '', 'Client Name': c.name, 'الاسم بالعربي': c.nameAr || '',
      'Shareholder Number': c.shareholderNumber || '', 'Account Number': c.accountNumber || '', 'NIN': c.nin || '',
      'VAT Number': c.vatNumber || '', 'Phone': c.phone || '', 'Email': c.email || '', 'Address': c.address || '',
      'Opening Balance': Number(c.openingBalance), 'Current Balance': Number(c.currentBalance),
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Customers')
    XLSX.writeFile(wb, `customers-${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const [customers, setCustomers] = useState<Customer[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<string[]>([])

  const fetchCustomers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/customers?search=${search}&page=${page}&limit=20`)
      const data = await res.json()
      setCustomers(data.customers)
      setTotal(data.total)
    } finally {
      setLoading(false)
    }
  }, [search, page])

  useEffect(() => { fetchCustomers() }, [fetchCustomers])

  async function deleteCustomer(id: string, name: string) {
    if (!confirm(L(`هل أنت متأكد من حذف العميل "${name}"؟`, `Delete customer "${name}"?`))) return
    const res = await fetch(`/api/customers/${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success(L('تم حذف العميل', 'Customer deleted'))
      setSelected(s => s.filter(x => x !== id))
      fetchCustomers()
    } else {
      toast.error(L('فشل الحذف', 'Delete failed'))
    }
  }

  function toggleSelect(id: string) {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }
  function toggleSelectAll() {
    setSelected(prev => prev.length === customers.length ? [] : customers.map(c => c.id))
  }

  async function bulkDelete() {
    if (!selected.length) return
    if (!confirm(L(`حذف ${selected.length} عميل محدد؟ لا يمكن التراجع.`, `Delete ${selected.length} selected customer(s)? This cannot be undone.`))) return
    const res = await fetch('/api/customers/bulk-delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: selected }) })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) { toast.error(data.error || L('فشل الحذف', 'Delete failed')); return }
    toast.success(L(`تم حذف ${data.deleted}${data.skipped?.length ? `، تخطّي ${data.skipped.length} (لهم فواتير)` : ''}`, `Deleted ${data.deleted}${data.skipped?.length ? `, ${data.skipped.length} skipped (have invoices)` : ''}`), { duration: 6000 })
    if (data.skipped?.length) console.warn('Skipped:', data.skipped)
    setSelected([])
    fetchCustomers()
  }

  const totalPages = Math.ceil(total / 20)

  return (
    <div className="flex flex-col min-h-screen">
      <Header title={L('العملاء', 'Customers')} />
      <div className="p-6 flex-1">
        {/* Actions bar */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="relative flex-1 min-w-64">
            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="input pr-9"
              placeholder={L('بحث بالاسم أو الهاتف...', 'Search by name or phone...')}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {selected.length > 0 && hasPermission(role, 'DELETE_CUSTOMER') && (
              <button onClick={bulkDelete} className="btn-primary bg-red-600 hover:bg-red-700">
                <Trash2 size={16} /> {L(`حذف (${selected.length})`, `Delete (${selected.length})`)}
              </button>
            )}
            <button onClick={downloadTemplate} className="btn-secondary"><Download size={16} /> {L('نموذج', 'Template')}</button>
            <button onClick={exportCustomers} className="btn-secondary"><FileDown size={16} /> {L('تصدير', 'Export')}</button>
            {hasPermission(role, 'IMPORT_CUSTOMERS') && (
              <Link href="/customers/import" className="btn-secondary">
                <Upload size={16} />
                {L('استيراد Excel', 'Import Excel')}
              </Link>
            )}
            {hasPermission(role, 'CREATE_CUSTOMER') && (
              <Link href="/customers/new" className="btn-primary">
                <Plus size={16} />
                {L('عميل جديد', 'New Customer')}
              </Link>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="mb-4 text-sm text-gray-500">
          {L('إجمالي العملاء:', 'Total customers:')} <span className="font-bold text-gray-800">{total}</span>
        </div>

        {/* Table */}
        <div className="card p-0 overflow-hidden">
          {loading ? (
            <LoadingSpinner />
          ) : customers.length === 0 ? (
            <EmptyState
              icon={Users}
              title={L('لا يوجد عملاء', 'No customers')}
              description={L('ابدأ بإضافة عميل جديد أو استيراد من Excel', 'Add a new customer or import from Excel')}
              action={
                hasPermission(role, 'CREATE_CUSTOMER') ? (
                  <Link href="/customers/new" className="btn-primary">
                    <Plus size={16} /> {L('إضافة عميل', 'Add Customer')}
                  </Link>
                ) : undefined
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="table-header w-10 text-center">
                      <input type="checkbox" className="accent-primary-600" checked={customers.length > 0 && selected.length === customers.length} onChange={toggleSelectAll} />
                    </th>
                    {[L('الاسم', 'Name'), L('الهاتف', 'Phone'), L('البريد الإلكتروني', 'Email'), L('الرصيد الافتتاحي', 'Opening Balance'), L('الرصيد الحالي', 'Current Balance'), L('إجراءات', 'Actions')].map(h => (
                      <th key={h} className="table-header text-start">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => (
                    <tr key={c.id} className={`hover:bg-gray-50 transition-colors ${selected.includes(c.id) ? 'bg-primary-50/40' : ''}`}>
                      <td className="table-cell text-center">
                        <input type="checkbox" className="accent-primary-600" checked={selected.includes(c.id)} onChange={() => toggleSelect(c.id)} />
                      </td>
                      <td className="table-cell font-semibold text-gray-800">{c.name}</td>
                      <td className="table-cell">
                        {c.phone ? (
                          <span className="flex items-center gap-1 text-gray-600">
                            <Phone size={13} /> {c.phone}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="table-cell">
                        {c.email ? (
                          <span className="flex items-center gap-1 text-gray-600">
                            <Mail size={13} /> {c.email}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="table-cell" dir="ltr">{formatCurrency(c.openingBalance, lang)}</td>
                      <td className="table-cell">
                        <span className={Number(c.currentBalance) > 0 ? 'text-red-600 font-bold' : 'text-green-600 font-bold'} dir="ltr">
                          {formatCurrency(c.currentBalance, lang)}
                        </span>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                          <Link href={`/customers/${c.id}`} className="text-blue-500 hover:text-blue-700 transition-colors">
                            <Eye size={16} />
                          </Link>
                          {hasPermission(role, 'EDIT_CUSTOMER') && (
                            <Link href={`/customers/${c.id}/edit`} className="text-gray-400 hover:text-gray-600 transition-colors">
                              <Edit2 size={16} />
                            </Link>
                          )}
                          {hasPermission(role, 'DELETE_CUSTOMER') && (
                            <button onClick={() => deleteCustomer(c.id, c.name)} className="text-red-400 hover:text-red-600 transition-colors">
                              <Trash2 size={16} />
                            </button>
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary px-3 py-1.5 text-xs">
              {L('السابق', 'Prev')}
            </button>
            <span className="text-sm text-gray-600">{L('صفحة', 'Page')} {page} {L('من', 'of')} {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-secondary px-3 py-1.5 text-xs">
              {L('التالي', 'Next')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
