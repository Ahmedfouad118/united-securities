'use client'
import { useState, useEffect } from 'react'
import Header from '@/components/layout/Header'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { formatCurrency, formatDate } from '@/lib/utils'
import { FileDown, AlertTriangle, Receipt, Building2, Users, Printer } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import * as XLSX from 'xlsx'

type Tab = 'customers' | 'aging' | 'vat' | 'bank'

const TYPE_AR: Record<string, string> = {
  REGULAR: 'فاتورة عادية', MANAGEMENT_FEE: 'رسوم إدارة',
  PERFORMANCE_FEE: 'رسوم أداء', DEBIT_NOTE: 'مذكرة مدين', CREDIT_NOTE: 'مذكرة دائن',
  RECEIPT: 'سند قبض', Payment: 'دفعة',
}
const TYPE_EN: Record<string, string> = {
  REGULAR: 'Regular', MANAGEMENT_FEE: 'Management Fee',
  PERFORMANCE_FEE: 'Performance Fee', DEBIT_NOTE: 'Debit Note', CREDIT_NOTE: 'Credit Note',
  RECEIPT: 'Receipt', Payment: 'Payment',
}
const TYPE_LABELS = TYPE_AR // fallback for any remaining references

function AgingReport() {
  const { lang } = useI18n()
  const L = (ar: string, en: string) => lang === 'en' ? en : ar
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try { const res = await fetch('/api/reports/aging'); setData(await res.json()) }
    finally { setLoading(false) }
  }

  function exportExcel() {
    if (!data) return
    const rows: any[] = []
    const bucketNames: Record<string, string> = {
      current: 'حالي', days30: '1-30 يوم', days60: '31-60 يوم',
      days90: '61-90 يوم', days180: '91-180 يوم', over180: 'أكثر من 180 يوم',
    }
    for (const [key, label] of Object.entries(bucketNames)) {
      for (const inv of data.details[key] || []) {
        rows.push({ 'الفترة': label, 'رقم الفاتورة': inv.invoiceNumber, 'العميل': inv.customer, 'تاريخ الفاتورة': formatDate(inv.date), 'أيام': inv.daysOld, 'المتبقي': Number(inv.remaining) })
      }
    }
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'التقادم')
    XLSX.writeFile(wb, `تقرير-تقادم-${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const buckets = [
    { key: 'current', label: L('حالي', 'Current'), color: 'bg-green-50 border-green-200 text-green-800' },
    { key: 'days30', label: L('1–30 يوم', '1–30 days'), color: 'bg-yellow-50 border-yellow-200 text-yellow-800' },
    { key: 'days60', label: L('31–60 يوم', '31–60 days'), color: 'bg-orange-50 border-orange-200 text-orange-800' },
    { key: 'days90', label: L('61–90 يوم', '61–90 days'), color: 'bg-red-50 border-red-200 text-red-700' },
    { key: 'days180', label: L('91–180 يوم', '91–180 days'), color: 'bg-red-100 border-red-300 text-red-800' },
    { key: 'over180', label: L('+180 يوم', '+180 days'), color: 'bg-red-200 border-red-400 text-red-900' },
  ]

  return (
    <div className="print-area">
      <div className="no-print flex gap-3 mb-5">
        <button onClick={load} disabled={loading} className="btn-primary">{loading ? L('جاري التحميل...', 'Loading...') : L('تشغيل التقرير', 'Run Report')}</button>
        {data && <button onClick={exportExcel} className="btn-secondary"><FileDown size={14} /> {L('تصدير Excel', 'Export Excel')}</button>}
        {data && <button onClick={() => window.print()} className="btn-secondary"><Printer size={14} /> {L('طباعة', 'Print')}</button>}
      </div>
      {loading && <LoadingSpinner />}
      {data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            {buckets.map(b => (
              <div key={b.key} className={`border rounded-lg p-4 cursor-pointer transition-all ${b.color} ${expanded === b.key ? 'ring-2 ring-offset-1 ring-blue-400' : ''}`} onClick={() => setExpanded(expanded === b.key ? null : b.key)}>
                <p className="text-xs font-semibold opacity-70">{b.label}</p>
                <p className="text-lg font-bold mt-1" dir="ltr">{formatCurrency(data.summary[b.key]?.total || 0, lang)}</p>
                <p className="text-xs mt-0.5 opacity-60">{data.summary[b.key]?.count || 0} {L('فاتورة', 'invoices')}</p>
              </div>
            ))}
          </div>
          {expanded && data.details[expanded]?.length > 0 && (
            <div className="card p-0 overflow-hidden">
              <div className="p-3 bg-gray-50 border-b font-semibold text-sm">{buckets.find(b => b.key === expanded)?.label}</div>
              <table className="w-full text-sm">
                <thead><tr>{[L('رقم الفاتورة', 'Invoice No'), L('العميل', 'Customer'), L('التاريخ', 'Date'), L('الأيام', 'Days'), L('المتبقي', 'Remaining')].map(h => <th key={h} className="table-header text-start">{h}</th>)}</tr></thead>
                <tbody>
                  {data.details[expanded].map((inv: any) => (
                    <tr key={inv.id} className="hover:bg-gray-50">
                      <td className="table-cell font-mono text-xs font-bold">{inv.invoiceNumber}</td>
                      <td className="table-cell font-medium">{inv.customer}</td>
                      <td className="table-cell text-gray-500">{formatDate(inv.date, lang)}</td>
                      <td className="table-cell text-center"><span className="text-red-600 font-bold">{inv.daysOld}</span></td>
                      <td className="table-cell font-bold text-red-600" dir="ltr">{formatCurrency(inv.remaining, lang)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function VatReport() {
  const { lang } = useI18n()
  const L = (ar: string, en: string) => lang === 'en' ? en : ar
  const TYPE_LABELS = lang === 'en' ? TYPE_EN : TYPE_AR
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  async function load() {
    setLoading(true)
    try {
      const p = new URLSearchParams()
      if (dateFrom) p.set('dateFrom', dateFrom)
      if (dateTo) p.set('dateTo', dateTo)
      setData(await (await fetch(`/api/reports/vat?${p}`)).json())
    } finally { setLoading(false) }
  }

  function exportExcel() {
    if (!data) return
    const rows = data.invoices.map((inv: any) => ({
      'رقم الفاتورة': inv.invoiceNumber, 'النوع': TYPE_LABELS[inv.invoiceType] || inv.invoiceType,
      'العميل': inv.customer, 'التاريخ': formatDate(inv.date),
      'المجموع الفرعي': Number(inv.subtotal), 'الضريبة%': `${inv.vatRate}%`,
      'قيمة الضريبة': Number(inv.vatAmount), 'الإجمالي': Number(inv.totalAmount),
    }))
    const ws = XLSX.utils.json_to_sheet(rows); const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'تقرير الضريبة')
    XLSX.writeFile(wb, `تقرير-ضريبة-${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  return (
    <div>
      <div className="no-print flex flex-wrap gap-3 mb-5">
        <input type="date" className="input text-sm w-36" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        <input type="date" className="input text-sm w-36" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        <button onClick={load} disabled={loading} className="btn-primary">{loading ? L('جاري...', 'Loading...') : L('تشغيل', 'Run')}</button>
        {data && <button onClick={exportExcel} className="btn-secondary"><FileDown size={14} /> Excel</button>}
        {data && <button onClick={() => window.print()} className="btn-secondary"><Printer size={14} /> {L('طباعة', 'Print')}</button>}
      </div>
      {loading && <LoadingSpinner />}
      {data && (
        <div className="print-area">
          <div className="grid grid-cols-3 gap-4 mb-5">
            <div className="card p-4 text-center"><p className="text-sm text-gray-500">{L('المجموع الفرعي', 'Subtotal')}</p><p className="text-xl font-bold text-gray-800" dir="ltr">{formatCurrency(data.totals.subtotal, lang)}</p></div>
            <div className="card p-4 text-center bg-blue-50"><p className="text-sm text-gray-500">{L('إجمالي الضريبة', 'Total VAT')}</p><p className="text-xl font-bold text-blue-700" dir="ltr">{formatCurrency(data.totals.vatAmount, lang)}</p></div>
            <div className="card p-4 text-center bg-green-50"><p className="text-sm text-gray-500">{L('الإجمالي الكلي', 'Grand Total')}</p><p className="text-xl font-bold text-green-700" dir="ltr">{formatCurrency(data.totals.totalAmount, lang)}</p></div>
          </div>
          <div className="card p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr>{[L('رقم الفاتورة', 'Invoice No'), L('النوع', 'Type'), L('العميل', 'Customer'), L('التاريخ', 'Date'), L('المجموع الفرعي', 'Subtotal'), L('الضريبة%', 'VAT%'), L('قيمة الضريبة', 'VAT Amount'), L('الإجمالي', 'Total')].map(h => <th key={h} className="table-header text-start">{h}</th>)}</tr></thead>
              <tbody>
                {data.invoices.map((inv: any, i: number) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="table-cell font-mono text-xs font-bold">{inv.invoiceNumber}</td>
                    <td className="table-cell text-xs">{TYPE_LABELS[inv.invoiceType] || inv.invoiceType}</td>
                    <td className="table-cell font-medium">{inv.customer}</td>
                    <td className="table-cell text-gray-500">{formatDate(inv.date, lang)}</td>
                    <td className="table-cell" dir="ltr">{formatCurrency(inv.subtotal, lang)}</td>
                    <td className="table-cell text-center">{inv.vatRate}%</td>
                    <td className="table-cell text-blue-700 font-semibold" dir="ltr">{formatCurrency(inv.vatAmount, lang)}</td>
                    <td className="table-cell font-bold" dir="ltr">{formatCurrency(inv.totalAmount, lang)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function BankReport() {
  const { lang } = useI18n()
  const L = (ar: string, en: string) => lang === 'en' ? en : ar
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  async function load() {
    setLoading(true)
    try {
      const p = new URLSearchParams()
      if (dateFrom) p.set('dateFrom', dateFrom)
      if (dateTo) p.set('dateTo', dateTo)
      setData(await (await fetch(`/api/reports/bank?${p}`)).json())
    } finally { setLoading(false) }
  }

  function exportExcel() {
    if (!data) return
    const rows = data.receipts.map((r: any) => ({
      'رقم السند': r.receiptNumber, 'العميل': r.customer?.name,
      'البنك': r.bankAccount?.bankName || '', 'المبلغ': Number(r.amount),
      'التاريخ': formatDate(r.date), 'طريقة الدفع': r.paymentMethod,
    }))
    const ws = XLSX.utils.json_to_sheet(rows); const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'تقرير البنوك')
    XLSX.writeFile(wb, `تقرير-بنوك-${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  return (
    <div>
      <div className="no-print flex flex-wrap gap-3 mb-5">
        <input type="date" className="input text-sm w-36" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        <input type="date" className="input text-sm w-36" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        <button onClick={load} disabled={loading} className="btn-primary">{loading ? L('جاري...', 'Loading...') : L('تشغيل', 'Run')}</button>
        {data && <button onClick={exportExcel} className="btn-secondary"><FileDown size={14} /> Excel</button>}
        {data && <button onClick={() => window.print()} className="btn-secondary"><Printer size={14} /> {L('طباعة', 'Print')}</button>}
      </div>
      {loading && <LoadingSpinner />}
      {data && (
        <div className="print-area">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-5">
            {data.bankSummary?.filter((b: any) => b.count > 0).map((bank: any) => (
              <div key={bank.bankId} className="card p-4">
                <p className="font-semibold text-gray-700 text-sm">{bank.bankName}</p>
                <p className="text-xs text-gray-400 mb-2">{bank.accountNumber}</p>
                <p className="text-xl font-bold text-primary-600" dir="ltr">{formatCurrency(bank.total, lang)}</p>
                <div className="flex gap-2 mt-2 text-xs text-gray-500 flex-wrap">
                  <span>{L('تحويل', 'Transfer')}: {formatCurrency(bank.byMethod.TRANSFER, lang)}</span>
                  <span>{L('شيك', 'Check')}: {formatCurrency(bank.byMethod.CHECK, lang)}</span>
                  <span>{L('نقد', 'Cash')}: {formatCurrency(bank.byMethod.CASH, lang)}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="card p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr>{[L('رقم السند', 'Receipt No'), L('العميل', 'Customer'), L('البنك', 'Bank'), L('المبلغ', 'Amount'), L('التاريخ', 'Date'), L('طريقة الدفع', 'Method'), L('رقم الشيك', 'Check No')].map(h => <th key={h} className="table-header text-start">{h}</th>)}</tr></thead>
              <tbody>
                {data.receipts.map((r: any) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="table-cell font-mono text-xs font-bold">{r.receiptNumber}</td>
                    <td className="table-cell font-medium">{r.customer?.name}</td>
                    <td className="table-cell text-xs">{r.bankAccount?.bankName || '—'}</td>
                    <td className="table-cell font-bold text-green-600" dir="ltr">{formatCurrency(r.amount, lang)}</td>
                    <td className="table-cell text-gray-500">{formatDate(r.date, lang)}</td>
                    <td className="table-cell text-xs">{r.paymentMethod}</td>
                    <td className="table-cell font-mono text-xs">{r.checkNumber || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Customer Report: summary (all) / balances (receivables) / statement (one)
// ─────────────────────────────────────────────────────────────
function CustomerReport() {
  const { lang } = useI18n()
  const L = (ar: string, en: string) => lang === 'en' ? en : ar
  const [mode, setMode] = useState<'summary' | 'balances' | 'statement'>('summary')
  const [customers, setCustomers] = useState<any[]>([])
  const [customerId, setCustomerId] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/customers?limit=1000').then(r => r.json()).then(c => setCustomers(Array.isArray(c) ? c : c.customers || []))
  }, [])

  async function load() {
    setLoading(true); setData(null)
    try {
      const p = new URLSearchParams({ mode })
      if (mode === 'statement') { if (!customerId) { setLoading(false); return } p.set('customerId', customerId) }
      if (dateFrom) p.set('dateFrom', dateFrom)
      if (dateTo) p.set('dateTo', dateTo)
      setData(await (await fetch(`/api/reports/customers?${p}`)).json())
    } finally { setLoading(false) }
  }

  function exportExcel() {
    if (!data) return
    let rows: any[] = []
    if (mode === 'statement') {
      rows = (data.ledger || []).map((e: any) => ({
        [L('التاريخ', 'Date')]: formatDate(e.date, lang), [L('المرجع', 'Reference')]: e.ref,
        [L('البيان', 'Description')]: e.desc, [L('مدين', 'Debit')]: e.debit, [L('دائن', 'Credit')]: e.credit, [L('الرصيد', 'Balance')]: e.balance,
      }))
    } else {
      rows = (data.rows || []).map((r: any) => ({
        [L('العميل', 'Customer')]: r.name, [L('رقم العميل', 'Client No')]: r.clientNumber || '',
        [L('رصيد افتتاحي', 'Opening')]: r.openingBalance, [L('إجمالي الفواتير', 'Invoiced')]: r.invoiced,
        [L('إشعارات دائنة', 'Credit Notes')]: r.creditNotes, [L('المدفوع', 'Paid')]: r.paid, [L('الرصيد', 'Balance')]: r.balance,
      }))
    }
    const ws = XLSX.utils.json_to_sheet(rows); const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Customers')
    XLSX.writeFile(wb, `customer-report-${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const MODES = [
    { key: 'summary', ar: 'مجمّع (كل العملاء)', en: 'Summary (All)' },
    { key: 'balances', ar: 'الأرصدة / الذمم', en: 'Balances / Receivables' },
    { key: 'statement', ar: 'كشف حساب عميل', en: 'Customer Statement' },
  ]

  return (
    <div>
      <div className="no-print flex flex-wrap gap-2 mb-4">
        {MODES.map(m => (
          <button key={m.key} onClick={() => { setMode(m.key as any); setData(null) }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${mode === m.key ? 'bg-primary-50 border-primary-300 text-primary-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {L(m.ar, m.en)}
          </button>
        ))}
      </div>

      <div className="no-print flex flex-wrap gap-3 mb-5 items-end">
        {mode === 'statement' && (
          <div>
            <label className="label text-xs">{L('العميل', 'Customer')}</label>
            <select className="input text-sm w-64" value={customerId} onChange={e => setCustomerId(e.target.value)}>
              <option value="">{L('— اختر العميل —', '— Select customer —')}</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}{c.clientNumber ? ` (${c.clientNumber})` : ''}</option>)}
            </select>
          </div>
        )}
        <div><label className="label text-xs">{L('من تاريخ', 'From')}</label><input type="date" className="input text-sm w-36" value={dateFrom} onChange={e => setDateFrom(e.target.value)} /></div>
        <div><label className="label text-xs">{L('إلى تاريخ', 'To')}</label><input type="date" className="input text-sm w-36" value={dateTo} onChange={e => setDateTo(e.target.value)} /></div>
        <button onClick={load} disabled={loading} className="btn-primary">{loading ? L('جاري...', 'Loading...') : L('تشغيل التقرير', 'Run Report')}</button>
        {data && <button onClick={exportExcel} className="btn-secondary"><FileDown size={14} /> Excel</button>}
        {data && <button onClick={() => window.print()} className="btn-secondary"><Printer size={14} /> {L('طباعة', 'Print')}</button>}
      </div>

      {loading && <LoadingSpinner />}

      {/* STATEMENT */}
      {data && mode === 'statement' && data.customer && (
        <>
          <div className="card mb-4 p-4">
            <h3 className="font-bold text-gray-800">{data.customer.name}</h3>
            <p className="text-xs text-gray-500">{data.customer.clientNumber && `${L('رقم العميل', 'Client No')}: ${data.customer.clientNumber}`}</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="card p-3 text-center"><p className="text-xs text-gray-500">{L('رصيد افتتاحي', 'Opening')}</p><p className="font-bold" dir="ltr">{formatCurrency(data.totals.opening, lang)}</p></div>
            <div className="card p-3 text-center bg-red-50"><p className="text-xs text-gray-500">{L('إجمالي مدين', 'Total Debit')}</p><p className="font-bold text-red-700" dir="ltr">{formatCurrency(data.totals.debit, lang)}</p></div>
            <div className="card p-3 text-center bg-green-50"><p className="text-xs text-gray-500">{L('إجمالي دائن', 'Total Credit')}</p><p className="font-bold text-green-700" dir="ltr">{formatCurrency(data.totals.credit, lang)}</p></div>
            <div className="card p-3 text-center bg-blue-50"><p className="text-xs text-gray-500">{L('الرصيد الختامي', 'Closing')}</p><p className="font-bold text-blue-700" dir="ltr">{formatCurrency(data.totals.closing, lang)}</p></div>
          </div>
          <div className="card p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr>{[L('التاريخ', 'Date'), L('المرجع', 'Reference'), L('البيان', 'Description'), L('مدين', 'Debit'), L('دائن', 'Credit'), L('الرصيد', 'Balance')].map(h => <th key={h} className="table-header text-start">{h}</th>)}</tr></thead>
              <tbody>
                {data.ledger.map((e: any, i: number) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="table-cell text-gray-500">{formatDate(e.date, lang)}</td>
                    <td className="table-cell font-mono text-xs font-bold">{e.ref}</td>
                    <td className="table-cell text-xs">{(lang === 'en' ? TYPE_EN : TYPE_AR)[e.desc] || e.desc}</td>
                    <td className="table-cell text-red-600" dir="ltr">{e.debit ? formatCurrency(e.debit, lang) : '—'}</td>
                    <td className="table-cell text-green-600" dir="ltr">{e.credit ? formatCurrency(e.credit, lang) : '—'}</td>
                    <td className="table-cell font-bold" dir="ltr">{formatCurrency(e.balance, lang)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* SUMMARY / BALANCES */}
      {data && mode !== 'statement' && data.rows && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="card p-3 text-center"><p className="text-xs text-gray-500">{L('إجمالي الفواتير', 'Invoiced')}</p><p className="font-bold" dir="ltr">{formatCurrency(data.totals.invoiced, lang)}</p></div>
            <div className="card p-3 text-center bg-green-50"><p className="text-xs text-gray-500">{L('المدفوع', 'Paid')}</p><p className="font-bold text-green-700" dir="ltr">{formatCurrency(data.totals.paid, lang)}</p></div>
            <div className="card p-3 text-center"><p className="text-xs text-gray-500">{L('إشعارات دائنة', 'Credit Notes')}</p><p className="font-bold" dir="ltr">{formatCurrency(data.totals.creditNotes, lang)}</p></div>
            <div className="card p-3 text-center bg-red-50"><p className="text-xs text-gray-500">{L('إجمالي الذمم', 'Total Balance')}</p><p className="font-bold text-red-700" dir="ltr">{formatCurrency(data.totals.balance, lang)}</p></div>
          </div>
          <div className="card p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr>{[L('العميل', 'Customer'), L('رقم العميل', 'Client No'), L('رصيد افتتاحي', 'Opening'), L('إجمالي الفواتير', 'Invoiced'), L('المدفوع', 'Paid'), L('الرصيد', 'Balance')].map(h => <th key={h} className="table-header text-start">{h}</th>)}</tr></thead>
              <tbody>
                {data.rows.map((r: any) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="table-cell font-medium">{r.name}</td>
                    <td className="table-cell text-xs text-gray-500">{r.clientNumber || '—'}</td>
                    <td className="table-cell" dir="ltr">{formatCurrency(r.openingBalance, lang)}</td>
                    <td className="table-cell" dir="ltr">{formatCurrency(r.invoiced, lang)}</td>
                    <td className="table-cell text-green-600" dir="ltr">{formatCurrency(r.paid, lang)}</td>
                    <td className={`table-cell font-bold ${r.balance > 0 ? 'text-red-600' : 'text-gray-600'}`} dir="ltr">{formatCurrency(r.balance, lang)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

export default function ReportsPage() {
  const { lang } = useI18n()
  const L = (ar: string, en: string) => lang === 'en' ? en : ar
  const [tab, setTab] = useState<Tab>('customers')

  const TABS = [
    { key: 'customers' as Tab, icon: Users, label: L('تقارير العملاء', 'Customer Reports') },
    { key: 'aging' as Tab, icon: AlertTriangle, label: L('تقرير التقادم / المدينون', 'Aging / Receivables') },
    { key: 'vat' as Tab, icon: Receipt, label: L('تقرير الضريبة', 'VAT Report') },
    { key: 'bank' as Tab, icon: Building2, label: L('تقرير البنوك', 'Bank Report') },
  ]

  return (
    <div className="flex flex-col min-h-screen">
      <Header title={L('التقارير', 'Reports')} />
      <div className="p-6">
        <div className="no-print flex gap-2 mb-6 bg-white border rounded-lg p-1 w-fit flex-wrap">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${tab === t.key ? 'bg-primary-600 text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}>
              <t.icon size={15} />
              {t.label}
            </button>
          ))}
        </div>
        {tab === 'customers' && <CustomerReport />}
        {tab === 'aging' && <AgingReport />}
        {tab === 'vat' && <VatReport />}
        {tab === 'bank' && <BankReport />}
      </div>
    </div>
  )
}
