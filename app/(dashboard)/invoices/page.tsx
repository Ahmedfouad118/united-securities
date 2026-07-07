'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { FileText, Plus, Search, FileDown, FileUp, CheckCircle, XCircle, X, Printer, FileText as FileWord, Download, Mail, Trash2 } from 'lucide-react'
import Header from '@/components/layout/Header'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import EmptyState from '@/components/ui/EmptyState'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { hasPermission } from '@/lib/permissions'
import { Role } from '@/types'
import { useI18n } from '@/lib/i18n'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'

const TYPE_LABELS_AR: Record<string, string> = {
  REGULAR: 'فاتورة عادية', MANAGEMENT_FEE: 'رسوم إدارة',
  PERFORMANCE_FEE: 'رسوم أداء', DEBIT_NOTE: 'مذكرة مدين', CREDIT_NOTE: 'مذكرة دائن',
}
const TYPE_LABELS_EN: Record<string, string> = {
  REGULAR: 'Regular', MANAGEMENT_FEE: 'Management Fee',
  PERFORMANCE_FEE: 'Performance Fee', DEBIT_NOTE: 'Debit Note', CREDIT_NOTE: 'Credit Note',
}
const TYPE_COLORS: Record<string, string> = {
  REGULAR: 'bg-blue-50 text-blue-700', MANAGEMENT_FEE: 'bg-purple-50 text-purple-700',
  PERFORMANCE_FEE: 'bg-indigo-50 text-indigo-700', DEBIT_NOTE: 'bg-orange-50 text-orange-700',
  CREDIT_NOTE: 'bg-pink-50 text-pink-700',
}
const STATUS_COLORS: Record<string, string> = {
  UNPAID: 'bg-red-50 text-red-700', PARTIAL: 'bg-yellow-50 text-yellow-700',
  PAID: 'bg-green-50 text-green-700', CANCELED: 'bg-gray-100 text-gray-500',
}
const STATUS_LABELS_AR: Record<string, string> = { UNPAID: 'غير مدفوعة', PARTIAL: 'جزئية', PAID: 'مدفوعة', CANCELED: 'ملغاة' }
const STATUS_LABELS_EN: Record<string, string> = { UNPAID: 'Unpaid', PARTIAL: 'Partial', PAID: 'Paid', CANCELED: 'Canceled' }
const APPROVAL_COLORS: Record<string, string> = { PENDING: 'text-yellow-600', APPROVED: 'text-green-600', REJECTED: 'text-red-600' }
const APPROVAL_LABELS_AR: Record<string, string> = { PENDING: 'انتظار', APPROVED: 'مُوافق', REJECTED: 'مرفوض' }
const APPROVAL_LABELS_EN: Record<string, string> = { PENDING: 'Pending', APPROVED: 'Approved', REJECTED: 'Rejected' }

export default function InvoicesPage() {
  const { data: session } = useSession()
  const role = (session?.user as any)?.role as Role
  const { t, lang } = useI18n()

  const TYPE_LABELS = lang === 'en' ? TYPE_LABELS_EN : TYPE_LABELS_AR
  const STATUS_LABELS = lang === 'en' ? STATUS_LABELS_EN : STATUS_LABELS_AR
  const APPROVAL_LABELS = lang === 'en' ? APPROVAL_LABELS_EN : APPROVAL_LABELS_AR

  const [invoices, setInvoices] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [invoiceType, setInvoiceType] = useState('')
  const [approvalStatus, setApprovalStatus] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [fromNum, setFromNum] = useState('')
  const [toNum, setToNum] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<string[]>([])
  const [importType, setImportType] = useState('REGULAR')
  const [importing, setImporting] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  function toggleSort(key: string) {
    if (!key) return
    if (sortBy === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(key); setSortDir('asc') }
    setPage(1)
  }

  const fetchInvoices = useCallback(async () => {
    setLoading(true)
    try {
      const p = new URLSearchParams({ search, status, invoiceType, approvalStatus, page: String(page), limit: '20', sortBy, sortDir })
      if (dateFrom) p.set('dateFrom', dateFrom)
      if (dateTo) p.set('dateTo', dateTo)
      if (fromNum) p.set('fromNum', fromNum)
      if (toNum) p.set('toNum', toNum)
      const res = await fetch(`/api/invoices?${p}`)
      const data = await res.json()
      setInvoices(data.invoices || [])
      setTotal(data.total || 0)
    } finally { setLoading(false) }
  }, [search, status, invoiceType, approvalStatus, page, dateFrom, dateTo, fromNum, toNum, sortBy, sortDir])

  useEffect(() => { fetchInvoices() }, [fetchInvoices])

  async function deleteInvoice(id: string, num: string) {
    if (!confirm(lang === 'en' ? `Delete invoice "${num}"? This reverses its effect on the customer balance.` : `حذف الفاتورة "${num}"؟ سيتم عكس أثرها على رصيد العميل.`)) return
    const res = await fetch(`/api/invoices/${id}`, { method: 'DELETE' })
    const data = await res.json().catch(() => ({}))
    if (res.ok) { toast.success(lang === 'en' ? 'Deleted' : 'تم الحذف'); setSelected(s => s.filter(x => x !== id)); fetchInvoices() }
    else toast.error(data.error || (lang === 'en' ? 'Delete failed' : 'فشل الحذف'))
  }

  async function bulkDelete() {
    if (!selected.length) return
    if (!confirm(lang === 'en' ? `Delete ${selected.length} selected invoice(s)? This cannot be undone.` : `حذف ${selected.length} فاتورة محددة؟ لا يمكن التراجع.`)) return
    const res = await fetch('/api/invoices/bulk-delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: selected }) })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) { toast.error(data.error || (lang === 'en' ? 'Delete failed' : 'فشل الحذف')); return }
    toast.success(lang === 'en' ? `Deleted ${data.deleted}${data.skipped?.length ? `, ${data.skipped.length} skipped` : ''}` : `تم حذف ${data.deleted}${data.skipped?.length ? `، تخطّي ${data.skipped.length}` : ''}`)
    if (data.skipped?.length) console.warn('Skipped:', data.skipped)
    setSelected([])
    fetchInvoices()
  }

  async function approveInvoice(id: string, action: 'approve' | 'reject') {
    const res = await fetch(`/api/invoices/${id}/approve`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) })
    if (res.ok) { toast.success(action === 'approve' ? t.common.approve : t.common.reject); fetchInvoices() }
    else toast.error(t.common.error)
  }

  function exportExcel() {
    const rows = invoices.map(inv => ({
      [lang === 'en' ? 'Invoice No.' : 'رقم الفاتورة']: inv.invoiceNumber,
      [lang === 'en' ? 'Type' : 'النوع']: TYPE_LABELS[inv.invoiceType] || inv.invoiceType,
      [lang === 'en' ? 'Customer' : 'العميل']: inv.customer?.name,
      [lang === 'en' ? 'Date' : 'التاريخ']: formatDate(inv.date, lang),
      [lang === 'en' ? 'Subtotal' : 'المجموع الفرعي']: Number(inv.subtotal),
      [lang === 'en' ? 'VAT' : 'الضريبة']: Number(inv.vatAmount),
      [lang === 'en' ? 'Total' : 'الإجمالي']: Number(inv.totalAmount),
      [lang === 'en' ? 'Paid' : 'المدفوع']: Number(inv.paidAmount),
      [lang === 'en' ? 'Remaining' : 'المتبقي']: Number(inv.remaining),
      [lang === 'en' ? 'Status' : 'الحالة']: STATUS_LABELS[inv.status] || inv.status,
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, lang === 'en' ? 'Invoices' : 'الفواتير')
    XLSX.writeFile(wb, `invoices-${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  function clearFilters() {
    setSearch(''); setStatus(''); setInvoiceType(''); setApprovalStatus('')
    setDateFrom(''); setDateTo(''); setFromNum(''); setToNum(''); setPage(1)
  }

  function toggleSelect(id: string) {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }
  function toggleSelectAll() {
    setSelected(prev => prev.length === invoices.length ? [] : invoices.map(i => i.id))
  }

  // Open a draft in the user's logged-in Outlook (no password needed). Downloads the
  // invoice file so they can attach it, then opens an OWA compose window pre-filled.
  async function openInOutlook() {
    if (!selected.length) return toast.error(lang === 'en' ? 'Select invoices first' : 'اختر الفواتير أولاً')
    const list = invoices.filter(i => selected.includes(i.id))
    let opened = 0, noEmail = 0
    for (const inv of list) {
      // Download the invoice HTML so the user can attach it
      try {
        const res = await fetch(`/api/invoices/${inv.id}/html`)
        if (res.ok) {
          const html = await res.text()
          const blob = new Blob([html], { type: 'text/html' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url; a.download = `Invoice-${inv.invoiceNumber}.html`; a.click()
          URL.revokeObjectURL(url)
        }
      } catch {}

      const to = inv.customer?.email || ''
      if (!to) { noEmail++; continue }
      const subject = `Invoice No. ${inv.invoiceNumber}`
      const body = `Dear ${inv.customer?.name || 'Customer'},%0D%0A%0D%0APlease find attached Invoice No. ${inv.invoiceNumber} dated ${formatDate(inv.date, 'en')} for your kind review.%0D%0A%0D%0ABest regards,`
      // OWA (Outlook web) compose deep-link — uses the account already signed in to the browser
      const owa = `https://outlook.office.com/mail/deeplink/compose?to=${encodeURIComponent(to)}&subject=${encodeURIComponent(subject)}&body=${body}`
      window.open(owa, '_blank')
      opened++
    }
    if (opened) toast.success(lang === 'en' ? `Opened ${opened} draft(s) in Outlook — attach the downloaded file & send` : `تم فتح ${opened} رسالة في Outlook — أرفق الملف المُحمّل واضغط Send`)
    if (noEmail) toast.error(lang === 'en' ? `${noEmail} invoice(s) have no customer email` : `${noEmail} فاتورة بدون إيميل للعميل`)
  }

  async function emailSelected() {
    if (!selected.length) return toast.error(lang === 'en' ? 'Select invoices first' : 'اختر الفواتير أولاً')
    if (!confirm(lang === 'en' ? `Send ${selected.length} invoice(s) by email to customers?` : `إرسال ${selected.length} فاتورة بالإيميل للعملاء؟`)) return
    setSendingEmail(true)
    try {
      const res = await fetch('/api/invoices/email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: selected }) })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || (lang === 'en' ? 'Failed' : 'فشل')); return }
      if (data.sent > 0) toast.success(lang === 'en' ? `Sent ${data.sent} email(s)` : `تم إرسال ${data.sent} إيميل`)
      if (data.skipped?.length) {
        toast.error((lang === 'en' ? 'Skipped:\n' : 'تم التخطّي:\n') + data.skipped.join('\n'), { duration: 7000, style: { whiteSpace: 'pre-line', maxWidth: 500 } })
        console.warn('Email skipped:', data.skipped)
      }
    } finally { setSendingEmail(false) }
  }

  function printSelected() {
    const ids = selected.length ? selected : invoices.map(i => i.id)
    if (!ids.length) return toast.error(lang === 'en' ? 'No invoices' : 'لا توجد فواتير')
    window.open(`/invoices/bulk?ids=${ids.join(',')}`, '_blank')
  }

  // Word export — downloads the selected/filtered invoices in the FULL invoice
  // layout (same as print) as an editable .doc, one invoice per page.
  async function exportWord() {
    const list = selected.length ? invoices.filter(i => selected.includes(i.id)) : invoices
    if (!list.length) return toast.error(lang === 'en' ? 'No invoices' : 'لا توجد فواتير')
    const t = toast.loading(lang === 'en' ? `Preparing ${list.length} invoice(s)...` : `جاري تجهيز ${list.length} فاتورة...`)
    try {
      const parts: string[] = []
      for (const inv of list) {
        const res = await fetch(`/api/invoices/${inv.id}/html`)
        if (!res.ok) continue
        let html = await res.text()
        // keep only the body content for embedding
        const m = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)
        parts.push(m ? m[1] : html)
      }
      if (!parts.length) { toast.error(lang === 'en' ? 'Failed' : 'فشل', { id: t }); return }
      const doc = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word'>
        <head><meta charset='utf-8'><style>@page{size:A4;margin:15mm} body{font-family:Arial}</style></head>
        <body>${parts.join(`<br clear=all style='page-break-before:always'>`)}</body></html>`
      const blob = new Blob(['﻿', doc], { type: 'application/msword' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `invoices-${new Date().toISOString().split('T')[0]}.doc`; a.click()
      URL.revokeObjectURL(url)
      toast.success(lang === 'en' ? `Downloaded ${parts.length} invoice(s) as Word` : `تم تنزيل ${parts.length} فاتورة Word`, { id: t })
    } catch {
      toast.error(lang === 'en' ? 'Failed' : 'فشل', { id: t })
    }
  }

  // Download a blank import template for the chosen invoice type
  function downloadTemplate() {
    // "Invoice Number" first column — leave empty to auto-generate, or put your old serial to keep it
    let cols: Record<string, any> = {}
    if (importType === 'MANAGEMENT_FEE') cols = { 'Invoice Number': '', 'Client Number': '', 'Client Name': '', 'Month': 'MAY', 'Days': 31, 'NAV': 0, 'Fees%': 0.5, 'Date': '', 'VAT%': 5, 'Bank Name': '', 'Notes': '' }
    else if (importType === 'PERFORMANCE_FEE') cols = { 'Invoice Number': '', 'Client Number': '', 'Client Name': '', 'Year': '2025', 'Fees': 0, 'Date': '', 'VAT%': 5, 'Bank Name': '', 'Notes': '' }
    else if (importType === 'DEBIT_NOTE' || importType === 'CREDIT_NOTE') cols = { 'Invoice Number': '', 'Client Number': '', 'Client Name': '', 'Invoice No': '', 'Amount': 0, 'Date': '', 'VAT%': 5, 'Notes': '' }
    else cols = { 'Invoice Number': '', 'Client Number': '', 'Client Name': '', 'Description': '', 'Amount': 0, 'Date': '', 'VAT%': 5, 'Bank Name': '', 'Notes': '' }
    const ws = XLSX.utils.json_to_sheet([cols])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, importType)
    XLSX.writeFile(wb, `template-${importType}.xlsx`)
  }

  // Parse the Excel in the browser and upload in small batches — avoids the
  // 10s serverless timeout that made large files hang on "loading" forever.
  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    const progressToast = toast.loading(lang === 'en' ? 'Reading file...' : 'جاري قراءة الملف...')
    try {
      const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true })
      const ws = wb.Sheets[wb.SheetNames[0]]
      // raw:false → dates/numbers come as displayed strings, safe for JSON
      const allRows: any[] = XLSX.utils.sheet_to_json(ws, { raw: false })
      if (!allRows.length) { toast.error(lang === 'en' ? 'File is empty' : 'الملف فارغ', { id: progressToast }); return }

      const BATCH = 15
      let created = 0, skipped = 0
      const errors: string[] = []
      for (let i = 0; i < allRows.length; i += BATCH) {
        const batch = allRows.slice(i, i + BATCH)
        toast.loading(lang === 'en'
          ? `Uploading ${Math.min(i + BATCH, allRows.length)} / ${allRows.length}...`
          : `جاري الرفع ${Math.min(i + BATCH, allRows.length)} / ${allRows.length}...`, { id: progressToast })
        const res = await fetch('/api/invoices/import', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: importType, rows: batch }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) { errors.push(data.error || `Batch ${i / BATCH + 1} failed`); continue }
        created += data.created || 0
        skipped += data.skipped || 0
        if (data.errors?.length) errors.push(...data.errors)
      }
      toast.success(lang === 'en' ? `Created ${created}, skipped ${skipped}` : `تم إنشاء ${created}، تخطّي ${skipped}`, { id: progressToast, duration: 6000 })
      if (errors.length) {
        toast.error(errors.slice(0, 5).join('\n'), { duration: 9000, style: { whiteSpace: 'pre-line', maxWidth: 550 } })
        console.warn('Import errors:', errors)
      }
      fetchInvoices()
    } catch (err: any) {
      toast.error(err?.message || (lang === 'en' ? 'Import failed' : 'فشل الاستيراد'), { id: progressToast })
    } finally { setImporting(false); e.target.value = '' }
  }

  const totalPages = Math.ceil(total / 20)
  const pageTitle = lang === 'en' ? 'Invoices' : 'الفواتير'

  const labels = lang === 'en'
    ? ['Invoice No.', 'Type', 'Customer', 'Date', 'Total', 'Remaining', 'Status', 'Approval', 'Actions']
    : ['رقم الفاتورة', 'النوع', 'العميل', 'التاريخ', 'الإجمالي', 'المتبقي', 'الحالة', 'الموافقة', 'إجراءات']
  const sortKeys = ['invoiceNumber', 'invoiceType', 'customer', 'date', 'totalAmount', 'remaining', 'status', 'approvalStatus', '']
  const tableHeaders = labels.map((label, i) => ({ label, key: sortKeys[i] }))

  return (
    <div className="flex flex-col min-h-screen">
      <Header title={pageTitle} />
      <div className="p-6 flex-1">
        <div className="card mb-5 p-4 space-y-3">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-48">
              <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input className="input pr-8 text-sm" placeholder={lang === 'en' ? 'Customer name or invoice no...' : 'اسم العميل أو رقم الفاتورة...'} value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
            </div>
            {selected.length > 0 && (
              <>
                <button onClick={openInOutlook} className="btn-primary text-sm py-2 bg-blue-600 hover:bg-blue-700" title={lang === 'en' ? 'Open draft in your signed-in Outlook' : 'يفتح رسالة في Outlook المسجّل عندك'}>
                  <Mail size={14} /> Outlook ({selected.length})
                </button>
                <button onClick={emailSelected} disabled={sendingEmail} className="btn-primary text-sm py-2 bg-green-600 hover:bg-green-700" title={lang === 'en' ? 'Send automatically via SMTP' : 'إرسال تلقائي عبر SMTP'}>
                  <Mail size={14} /> {sendingEmail ? (lang === 'en' ? 'Sending...' : 'جاري الإرسال...') : `SMTP (${selected.length})`}
                </button>
                {role === 'ADMIN' && (
                  <button onClick={bulkDelete} className="btn-primary text-sm py-2 bg-red-600 hover:bg-red-700" title={lang === 'en' ? 'Delete selected invoices' : 'حذف الفواتير المحددة'}>
                    <Trash2 size={14} /> {lang === 'en' ? `Delete (${selected.length})` : `حذف (${selected.length})`}
                  </button>
                )}
              </>
            )}
            <select className="input text-sm w-40" value={invoiceType} onChange={e => { setInvoiceType(e.target.value); setPage(1) }}>
              <option value="">{lang === 'en' ? 'All Types' : 'كل الأنواع'}</option>
              {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <select className="input text-sm w-36" value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}>
              <option value="">{lang === 'en' ? 'All Status' : 'كل الحالات'}</option>
              {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <select className="input text-sm w-36" value={approvalStatus} onChange={e => { setApprovalStatus(e.target.value); setPage(1) }}>
              <option value="">{lang === 'en' ? 'All Approvals' : 'كل الموافقات'}</option>
              {Object.entries(APPROVAL_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>{t.common.date}:</span>
              <input type="date" className="input text-sm w-36" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              <span>—</span>
              <input type="date" className="input text-sm w-36" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>{lang === 'en' ? 'No.' : 'رقم'}:</span>
              <input className="input text-sm w-36" placeholder={lang === 'en' ? 'From No.' : 'من رقم'} value={fromNum} onChange={e => setFromNum(e.target.value)} />
              <span>—</span>
              <input className="input text-sm w-36" placeholder={lang === 'en' ? 'To No.' : 'إلى رقم'} value={toNum} onChange={e => setToNum(e.target.value)} />
            </div>
            <button onClick={clearFilters} className="btn-secondary text-sm py-2"><X size={14} /> {lang === 'en' ? 'Clear' : 'مسح البحث'}</button>
            <div className="flex gap-2 mr-auto">
              {hasPermission(role, 'CREATE_INVOICE') && (
                <Link href="/invoices/new" className="btn-primary text-sm py-2"><Plus size={14} /> {lang === 'en' ? 'New Invoice' : 'فاتورة جديدة'}</Link>
              )}
            </div>
          </div>

          {/* Actions row: print / export / import per type */}
          <div className="flex flex-wrap gap-2 items-center border-t pt-3">
            <button onClick={printSelected} className="btn-secondary text-sm py-2"><Printer size={14} /> {lang === 'en' ? 'Print' : 'طباعة'}{selected.length ? ` (${selected.length})` : ''}</button>
            <button onClick={printSelected} className="btn-secondary text-sm py-2 text-red-600"><Download size={14} /> PDF{selected.length ? ` (${selected.length})` : ''}</button>
            <button onClick={exportExcel} className="btn-secondary text-sm py-2"><FileDown size={14} /> Excel</button>
            <button onClick={exportWord} className="btn-secondary text-sm py-2"><FileWord size={14} /> Word</button>
            {hasPermission(role, 'CREATE_INVOICE') && (
              <div className="flex items-center gap-2 mr-auto bg-gray-50 rounded-lg p-1.5">
                <span className="text-xs text-gray-500 px-1">{lang === 'en' ? 'Import:' : 'استيراد:'}</span>
                <select className="input text-xs py-1 w-36" value={importType} onChange={e => setImportType(e.target.value)}>
                  {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <button onClick={downloadTemplate} className="btn-secondary text-xs py-1.5"><Download size={13} /> {lang === 'en' ? 'Template' : 'نموذج'}</button>
                <label className="btn-primary text-xs py-1.5 cursor-pointer">
                  <FileUp size={13} /> {importing ? (lang === 'en' ? 'Uploading...' : 'جاري الرفع...') : (lang === 'en' ? 'Upload' : 'رفع')}
                  <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} disabled={importing} />
                </label>
              </div>
            )}
          </div>
        </div>

        <div className="mb-3 text-sm text-gray-500">
          {lang === 'en' ? 'Total:' : 'إجمالي:'} <span className="font-bold text-gray-800">{total}</span> {lang === 'en' ? 'invoices' : 'فاتورة'}
        </div>

        <div className="card p-0 overflow-hidden">
          {loading ? <LoadingSpinner /> : invoices.length === 0 ? (
            <EmptyState icon={FileText} title={lang === 'en' ? 'No invoices' : 'لا توجد فواتير'}
              action={hasPermission(role, 'CREATE_INVOICE') ? <Link href="/invoices/new" className="btn-primary"><Plus size={15} /> {lang === 'en' ? 'New' : 'جديد'}</Link> : undefined} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="table-header w-10 text-center">
                      <input type="checkbox" className="accent-primary-600" checked={invoices.length > 0 && selected.length === invoices.length} onChange={toggleSelectAll} />
                    </th>
                    {tableHeaders.map(h => (
                      <th key={h.label} className={`table-header text-right ${h.key ? 'cursor-pointer select-none hover:text-primary-600' : ''}`} onClick={() => toggleSort(h.key)}>
                        {h.label}{h.key && sortBy === h.key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(inv => (
                    <tr key={inv.id} className={cn('hover:bg-gray-50 transition-colors', inv.isCanceled && 'line-through opacity-60', selected.includes(inv.id) && 'bg-primary-50/40')}>
                      <td className="table-cell text-center">
                        <input type="checkbox" className="accent-primary-600" checked={selected.includes(inv.id)} onChange={() => toggleSelect(inv.id)} />
                      </td>
                      <td className="table-cell">
                        <Link href={`/invoices/${inv.id}`} className="text-primary-600 hover:underline font-mono font-bold text-xs">{inv.invoiceNumber}</Link>
                      </td>
                      <td className="table-cell">
                        <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', TYPE_COLORS[inv.invoiceType] || 'bg-gray-100 text-gray-600')}>
                          {TYPE_LABELS[inv.invoiceType] || inv.invoiceType}
                        </span>
                      </td>
                      <td className="table-cell font-medium">{inv.customer?.name}</td>
                      <td className="table-cell text-gray-500">{formatDate(inv.date, lang)}</td>
                      <td className="table-cell font-semibold">{formatCurrency(inv.totalAmount, lang)}</td>
                      <td className="table-cell font-bold text-red-600">{formatCurrency(inv.remaining, lang)}</td>
                      <td className="table-cell">
                        <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', STATUS_COLORS[inv.status] || 'bg-gray-100 text-gray-600')}>
                          {STATUS_LABELS[inv.status] || inv.status}
                        </span>
                      </td>
                      <td className="table-cell">
                        <span className={cn('text-xs font-semibold', APPROVAL_COLORS[inv.approvalStatus])}>
                          {APPROVAL_LABELS[inv.approvalStatus]}
                        </span>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                          <Link href={`/invoices/${inv.id}`} className="text-blue-400 hover:text-blue-600 text-xs">{lang === 'en' ? 'View' : 'عرض'}</Link>
                          {role === 'ADMIN' && <Link href={`/invoices/${inv.id}/edit`} className="text-amber-500 hover:text-amber-700 text-xs">{lang === 'en' ? 'Edit' : 'تعديل'}</Link>}
                          <Link href={`/invoices/${inv.id}/print`} className="text-gray-400 hover:text-gray-600 text-xs">{t.common.print}</Link>
                          {(role === 'ADMIN' || role === 'ACCOUNTANT') && inv.approvalStatus === 'PENDING' && !inv.isCanceled && (
                            <>
                              <button onClick={() => approveInvoice(inv.id, 'approve')} className="text-green-500 hover:text-green-700"><CheckCircle size={14} /></button>
                              <button onClick={() => approveInvoice(inv.id, 'reject')} className="text-red-400 hover:text-red-600"><XCircle size={14} /></button>
                            </>
                          )}
                          {role === 'ADMIN' && (
                            <button onClick={() => deleteInvoice(inv.id, inv.invoiceNumber)} className="text-red-400 hover:text-red-600" title={lang === 'en' ? 'Delete' : 'حذف'}><Trash2 size={14} /></button>
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
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary px-3 py-1.5 text-xs">{t.common.prev}</button>
            <span className="text-sm text-gray-600">{t.common.page} {page} {t.common.of} {totalPages}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages} className="btn-secondary px-3 py-1.5 text-xs">{t.common.next}</button>
          </div>
        )}
      </div>
    </div>
  )
}
