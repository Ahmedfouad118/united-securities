'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Mail, Plus, Search, FileDown, FileUp, X, Printer, FileText as FileWord, Download, Trash2 } from 'lucide-react'
import Header from '@/components/layout/Header'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import EmptyState from '@/components/ui/EmptyState'
import { formatDate, cn } from '@/lib/utils'
import { Role } from '@/types'
import { useI18n } from '@/lib/i18n'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'

export default function LettersPage() {
  const { data: session } = useSession()
  const role = (session?.user as any)?.role as Role
  const { lang } = useI18n()
  const L = (ar: string, en: string) => lang === 'en' ? en : ar

  const [letters, setLetters] = useState<any[]>([])
  const [types, setTypes] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeId, setTypeId] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [fromSeq, setFromSeq] = useState('')
  const [toSeq, setToSeq] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<string[]>([])
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [importing, setImporting] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)

  function toggleSort(key: string) {
    if (!key) return
    if (sortBy === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(key); setSortDir('asc') }
    setPage(1)
  }

  const fetchLetters = useCallback(async () => {
    setLoading(true)
    try {
      const p = new URLSearchParams({ search, typeId, page: String(page), limit: '20', sortBy, sortDir })
      if (dateFrom) p.set('dateFrom', dateFrom)
      if (dateTo) p.set('dateTo', dateTo)
      if (fromSeq) p.set('fromSeq', fromSeq)
      if (toSeq) p.set('toSeq', toSeq)
      const res = await fetch(`/api/letters?${p}`)
      const data = await res.json()
      setLetters(data.letters || [])
      setTotal(data.total || 0)
    } finally { setLoading(false) }
  }, [search, typeId, page, dateFrom, dateTo, fromSeq, toSeq, sortBy, sortDir])

  useEffect(() => { fetchLetters() }, [fetchLetters])
  useEffect(() => {
    fetch('/api/masters/letter-types').then(r => r.json()).then((t: any[]) => setTypes(Array.isArray(t) ? t : [])).catch(() => {})
  }, [])

  function clearFilters() {
    setSearch(''); setTypeId(''); setDateFrom(''); setDateTo(''); setFromSeq(''); setToSeq(''); setPage(1)
  }
  function toggleSelect(id: string) { setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]) }
  function toggleSelectAll() { setSelected(prev => prev.length === letters.length ? [] : letters.map(l => l.id)) }

  async function fetchAllMatchingIds(): Promise<string[]> {
    const p = new URLSearchParams({ search, typeId, page: '1', limit: '2000', sortBy, sortDir })
    if (dateFrom) p.set('dateFrom', dateFrom)
    if (dateTo) p.set('dateTo', dateTo)
    if (fromSeq) p.set('fromSeq', fromSeq)
    if (toSeq) p.set('toSeq', toSeq)
    const res = await fetch(`/api/letters?${p}`)
    const data = await res.json()
    return (data.letters || []).map((l: any) => l.id)
  }

  async function printSelected() {
    let ids = selected
    if (!ids.length) ids = await fetchAllMatchingIds()
    if (!ids.length) return toast.error(L('لا توجد رسائل', 'No letters'))
    window.open(`/letters/bulk?ids=${ids.join(',')}`, '_blank')
  }

  async function bulkDelete() {
    if (!selected.length) return
    if (!confirm(L(`حذف ${selected.length} رسالة محددة؟`, `Delete ${selected.length} selected letter(s)?`))) return
    const res = await fetch('/api/letters/bulk-delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: selected }) })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return toast.error(data.error || L('فشل الحذف', 'Delete failed'))
    toast.success(L(`تم حذف ${data.deleted}`, `Deleted ${data.deleted}`))
    setSelected([]); fetchLetters()
  }

  async function deleteOne(id: string, ref: string) {
    if (!confirm(L(`حذف الرسالة "${ref}"؟`, `Delete letter "${ref}"?`))) return
    const res = await fetch(`/api/letters/${id}`, { method: 'DELETE' })
    if (res.ok) { toast.success(L('تم الحذف', 'Deleted')); setSelected(s => s.filter(x => x !== id)); fetchLetters() }
    else toast.error(L('فشل الحذف', 'Delete failed'))
  }

  async function emailSelected() {
    if (!selected.length) return toast.error(L('اختر الرسائل أولاً', 'Select letters first'))
    if (!confirm(L(`إرسال ${selected.length} رسالة بالإيميل؟`, `Email ${selected.length} letter(s)?`))) return
    setSendingEmail(true)
    try {
      const res = await fetch('/api/letters/email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: selected }) })
      const data = await res.json()
      if (!res.ok) return toast.error(data.error || L('فشل', 'Failed'))
      if (data.sent > 0) toast.success(L(`تم إرسال ${data.sent}`, `Sent ${data.sent}`))
      if (data.skipped?.length) toast.error(data.skipped.join('\n'), { duration: 7000, style: { whiteSpace: 'pre-line', maxWidth: 500 } })
    } finally { setSendingEmail(false) }
  }

  function exportExcel() {
    const rows = letters.map(l => ({
      [L('المرجع', 'Ref')]: l.refNumber,
      [L('النوع', 'Type')]: l.type ? (lang === 'en' ? l.type.name : (l.type.nameAr || l.type.name)) : '',
      [L('التاريخ', 'Date')]: formatDate(l.date, lang),
      [L('البنك', 'To Bank')]: l.toBankName || '',
      [L('المستفيد', 'Beneficiary')]: l.benAccountName || l.customer?.name || l.supplier?.name || '',
      [L('المبلغ', 'Amount')]: Number(l.amount),
      [L('العملة', 'Currency')]: l.currency,
      [L('الغرض', 'Purpose')]: l.purpose || '',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Letters')
    XLSX.writeFile(wb, `letters-${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  async function exportWord() {
    const list = selected.length ? letters.filter(l => selected.includes(l.id)) : letters
    if (!list.length) return toast.error(L('لا توجد رسائل', 'No letters'))
    const t = toast.loading(L(`جاري تجهيز ${list.length}...`, `Preparing ${list.length}...`))
    try {
      const parts: string[] = []
      for (const l of list) {
        const res = await fetch(`/api/letters/${l.id}/html`)
        if (!res.ok) continue
        const html = await res.text()
        const m = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)
        parts.push(m ? m[1] : html)
      }
      if (!parts.length) return toast.error(L('فشل', 'Failed'), { id: t })
      const doc = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word'>
        <head><meta charset='utf-8'><style>@page{size:A4;margin:15mm} body{font-family:Arial}</style></head>
        <body>${parts.join(`<br clear=all style='page-break-before:always'>`)}</body></html>`
      const blob = new Blob(['﻿', doc], { type: 'application/msword' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `letters-${new Date().toISOString().split('T')[0]}.doc`; a.click()
      URL.revokeObjectURL(url)
      toast.success(L(`تم تنزيل ${parts.length} رسالة Word`, `Downloaded ${parts.length} letter(s)`), { id: t })
    } catch { toast.error(L('فشل', 'Failed'), { id: t }) }
  }

  function downloadTemplate() {
    const cols = {
      'Ref Number': '', 'Date': '', 'Client Number': '', 'Client Name': '', 'Supplier Name': '',
      'To Bank': 'Bank Muscat', 'To Branch': '', 'From Account No': '', 'Amount': 0, 'Currency': 'OMR',
      'Beneficiary Name': '', 'Beneficiary Account No': '', 'Beneficiary Bank': '', 'IBAN': '', 'Swift': '', 'Purpose': '',
    }
    const ws = XLSX.utils.json_to_sheet([cols])
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Letters')
    XLSX.writeFile(wb, 'template-letters.xlsx')
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    const pt = toast.loading(L('جاري قراءة الملف...', 'Reading file...'))
    try {
      const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const allRows: any[] = XLSX.utils.sheet_to_json(ws, { raw: true, defval: '' })
      if (!allRows.length) return toast.error(L('الملف فارغ', 'File is empty'), { id: pt })
      const BATCH = 15
      let created = 0, skipped = 0
      const errors: string[] = []
      for (let i = 0; i < allRows.length; i += BATCH) {
        toast.loading(L(`جاري الرفع ${Math.min(i + BATCH, allRows.length)} / ${allRows.length}...`, `Uploading ${Math.min(i + BATCH, allRows.length)} / ${allRows.length}...`), { id: pt })
        const res = await fetch('/api/letters/import', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ typeId: typeId || null, rows: allRows.slice(i, i + BATCH) }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) { errors.push(data.error || 'batch failed'); continue }
        created += data.created || 0; skipped += data.skipped || 0
        if (data.errors?.length) errors.push(...data.errors)
      }
      toast.success(L(`تم إنشاء ${created}، تخطّي ${skipped}`, `Created ${created}, skipped ${skipped}`), { id: pt, duration: 6000 })
      if (errors.length) console.warn(errors)
      fetchLetters()
    } catch (err: any) {
      toast.error(err?.message || L('فشل', 'Failed'), { id: pt })
    } finally { setImporting(false); e.target.value = '' }
  }

  const totalPages = Math.ceil(total / 20)
  const headers = [
    { label: L('المرجع', 'Ref No.'), key: 'refNumber' },
    { label: L('النوع', 'Type'), key: '' },
    { label: L('التاريخ', 'Date'), key: 'date' },
    { label: L('البنك', 'To Bank'), key: '' },
    { label: L('المستفيد', 'Beneficiary'), key: '' },
    { label: L('المبلغ', 'Amount'), key: 'amount' },
    { label: L('إجراءات', 'Actions'), key: '' },
  ]

  return (
    <div className="flex flex-col min-h-screen">
      <Header title={L('الرسائل', 'Letters')} />
      <div className="p-6 flex-1">
        <div className="card mb-5 p-4 space-y-3">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-48">
              <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input className="input pr-8 text-sm" placeholder={L('المرجع أو العميل أو رقم العميل...', 'Ref, customer, or client no...')} value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
            </div>
            {selected.length > 0 && (
              <>
                <button onClick={emailSelected} disabled={sendingEmail} className="btn-primary text-sm py-2 bg-green-600 hover:bg-green-700">
                  <Mail size={14} /> {sendingEmail ? L('جاري...', 'Sending...') : `SMTP (${selected.length})`}
                </button>
                {role === 'ADMIN' && (
                  <button onClick={bulkDelete} className="btn-primary text-sm py-2 bg-red-600 hover:bg-red-700">
                    <Trash2 size={14} /> {L(`حذف (${selected.length})`, `Delete (${selected.length})`)}
                  </button>
                )}
              </>
            )}
            <select className="input text-sm w-44" value={typeId} onChange={e => { setTypeId(e.target.value); setPage(1) }}>
              <option value="">{L('كل الأنواع', 'All Types')}</option>
              {types.map(t => <option key={t.id} value={t.id}>{lang === 'en' ? t.name : (t.nameAr || t.name)}</option>)}
            </select>
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>{L('التاريخ', 'Date')}:</span>
              <input type="date" className="input text-sm w-36" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              <span>—</span>
              <input type="date" className="input text-sm w-36" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>{L('رقم', 'No.')}:</span>
              <input className="input text-sm w-24" placeholder={L('من', 'From')} value={fromSeq} onChange={e => setFromSeq(e.target.value)} />
              <span>—</span>
              <input className="input text-sm w-24" placeholder={L('إلى', 'To')} value={toSeq} onChange={e => setToSeq(e.target.value)} />
              {(fromSeq || toSeq || dateFrom || dateTo || search || typeId) && (
                <span className="bg-primary-50 text-primary-700 px-2 py-1 rounded-lg text-xs font-semibold whitespace-nowrap">{total} {L('مطابقة', 'matched')}</span>
              )}
            </div>
            <button onClick={clearFilters} className="btn-secondary text-sm py-2"><X size={14} /> {L('مسح البحث', 'Clear')}</button>
            <div className="flex gap-2 mr-auto">
              <Link href="/letters/new" className="btn-primary text-sm py-2"><Plus size={14} /> {L('رسالة جديدة', 'New Letter')}</Link>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 items-center border-t pt-3">
            <button onClick={printSelected} className="btn-secondary text-sm py-2"><Printer size={14} /> {L('طباعة', 'Print')}{selected.length ? ` (${selected.length})` : ''}</button>
            <button onClick={printSelected} className="btn-secondary text-sm py-2 text-red-600"><Download size={14} /> PDF{selected.length ? ` (${selected.length})` : ''}</button>
            <button onClick={exportExcel} className="btn-secondary text-sm py-2"><FileDown size={14} /> Excel</button>
            <button onClick={exportWord} className="btn-secondary text-sm py-2"><FileWord size={14} /> Word</button>
            <div className="flex items-center gap-2 mr-auto bg-gray-50 rounded-lg p-1.5">
              <button onClick={downloadTemplate} className="btn-secondary text-xs py-1.5"><Download size={13} /> {L('نموذج', 'Template')}</button>
              <label className="btn-primary text-xs py-1.5 cursor-pointer">
                <FileUp size={13} /> {importing ? L('جاري الرفع...', 'Uploading...') : L('رفع', 'Upload')}
                <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} disabled={importing} />
              </label>
            </div>
          </div>
        </div>

        <div className="mb-3 text-sm text-gray-500">{L('إجمالي:', 'Total:')} <span className="font-bold text-gray-800">{total}</span> {L('رسالة', 'letters')}</div>

        <div className="card p-0 overflow-hidden">
          {loading ? <LoadingSpinner /> : letters.length === 0 ? (
            <EmptyState icon={Mail} title={L('لا توجد رسائل', 'No letters')} action={<Link href="/letters/new" className="btn-primary"><Plus size={15} /> {L('جديد', 'New')}</Link>} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="table-header w-10 text-center">
                      <input type="checkbox" className="accent-primary-600" checked={letters.length > 0 && selected.length === letters.length} onChange={toggleSelectAll} />
                    </th>
                    {headers.map(h => (
                      <th key={h.label} className={`table-header text-start ${h.key ? 'cursor-pointer select-none hover:text-primary-600' : ''}`} onClick={() => toggleSort(h.key)}>
                        {h.label}{h.key && sortBy === h.key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {letters.map(l => (
                    <tr key={l.id} className={cn('hover:bg-gray-50 transition-colors', selected.includes(l.id) && 'bg-primary-50/40')}>
                      <td className="table-cell text-center">
                        <input type="checkbox" className="accent-primary-600" checked={selected.includes(l.id)} onChange={() => toggleSelect(l.id)} />
                      </td>
                      <td className="table-cell font-mono text-xs font-bold text-primary-600">{l.refNumber}</td>
                      <td className="table-cell text-xs">
                        {l.type ? <span className="px-2 py-0.5 rounded-full text-xs bg-indigo-50 text-indigo-700">{lang === 'en' ? l.type.name : (l.type.nameAr || l.type.name)}</span> : '—'}
                        {l.online && <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-blue-50 text-blue-600">Online</span>}
                      </td>
                      <td className="table-cell text-gray-500">{formatDate(l.date, lang)}</td>
                      <td className="table-cell text-xs">{l.toBankName || '—'}</td>
                      <td className="table-cell font-medium">{l.benAccountName || l.customer?.name || l.supplier?.name || '—'}</td>
                      <td className="table-cell font-semibold" dir="ltr">{l.currency} {Number(l.amount).toLocaleString('en-US', { minimumFractionDigits: l.currency === 'OMR' ? 3 : 2 })}</td>
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                          <a href={`/letters/${l.id}/print`} target="_blank" rel="noopener" className="text-blue-400 hover:text-blue-600 text-xs">{L('عرض', 'View')}</a>
                          <Link href={`/letters/${l.id}/edit`} className="text-amber-500 hover:text-amber-700 text-xs">{L('تعديل', 'Edit')}</Link>
                          <a href={`/letters/${l.id}/print`} target="_blank" rel="noopener" className="text-gray-400 hover:text-gray-600 text-xs">{L('طباعة', 'Print')}</a>
                          {role === 'ADMIN' && (
                            <button onClick={() => deleteOne(l.id, l.refNumber)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
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
          <div className="flex items-center justify-center gap-1.5 mt-4 flex-wrap">
            <button onClick={() => setPage(1)} disabled={page === 1} className="btn-secondary px-2.5 py-1.5 text-xs">«</button>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary px-3 py-1.5 text-xs">{L('السابق', 'Prev')}</button>
            {(() => {
              const win = 5
              let start = Math.max(1, page - Math.floor(win / 2))
              const end = Math.min(totalPages, start + win - 1)
              start = Math.max(1, end - win + 1)
              const nums = []
              for (let i = start; i <= end; i++) nums.push(i)
              return nums.map(n => (
                <button key={n} onClick={() => setPage(n)} className={`px-3 py-1.5 text-xs rounded-lg font-medium ${n === page ? 'bg-primary-600 text-white' : 'btn-secondary'}`}>{n}</button>
              ))
            })()}
            <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages} className="btn-secondary px-3 py-1.5 text-xs">{L('التالي', 'Next')}</button>
            <button onClick={() => setPage(totalPages)} disabled={page >= totalPages} className="btn-secondary px-2.5 py-1.5 text-xs">»</button>
          </div>
        )}
      </div>
    </div>
  )
}
