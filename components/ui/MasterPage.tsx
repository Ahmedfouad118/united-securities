'use client'
import { useState, useEffect, useCallback } from 'react'
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight, FileDown } from 'lucide-react'
import Modal from './Modal'
import LoadingSpinner from './LoadingSpinner'
import EmptyState from './EmptyState'
import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/i18n'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'

export interface FieldDef {
  key: string
  label: string
  type?: 'text' | 'textarea' | 'number' | 'select'
  options?: { value: string; label: string }[]
  required?: boolean
  placeholder?: string
  colSpan?: boolean
}

interface MasterPageProps {
  title: string
  apiUrl: string
  fields: FieldDef[]
  columns: { key: string; label: string; render?: (row: any) => React.ReactNode }[]
  canEdit?: boolean
  emptyIcon?: any
}

export default function MasterPage({ title, apiUrl, fields, columns, canEdit = true, emptyIcon }: MasterPageProps) {
  const { lang } = useI18n()
  const L = (ar: string, en: string) => lang === 'en' ? en : ar
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editRow, setEditRow] = useState<any>(null)
  const [form, setForm] = useState<Record<string, any>>({})
  const [saving, setSaving] = useState(false)

  const fetch_ = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(apiUrl)
      setRows(await res.json())
    } finally { setLoading(false) }
  }, [apiUrl])

  useEffect(() => { fetch_() }, [fetch_])

  function openCreate() {
    setEditRow(null)
    const defaults: Record<string, any> = {}
    fields.forEach(f => { defaults[f.key] = f.type === 'number' ? 0 : '' })
    setForm(defaults)
    setModal(true)
  }

  function openEdit(row: any) {
    setEditRow(row)
    const vals: Record<string, any> = {}
    fields.forEach(f => { vals[f.key] = row[f.key] ?? '' })
    setForm(vals)
    setModal(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const url = editRow ? `${apiUrl}/${editRow.id}` : apiUrl
      const method = editRow ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (!res.ok) { const err = await res.json(); return toast.error(err.error || L('فشل', 'Failed')) }
      toast.success(editRow ? L('تم التحديث', 'Updated') : L('تم الإضافة', 'Added'))
      setModal(false)
      fetch_()
    } finally { setSaving(false) }
  }

  async function handleToggle(row: any) {
    await fetch(`${apiUrl}/${row.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: !row.active }) })
    fetch_()
  }

  async function handleDelete(row: any) {
    if (!confirm(L('هل أنت متأكد؟', 'Are you sure?'))) return
    const res = await fetch(`${apiUrl}/${row.id}`, { method: 'DELETE' })
    if (res.ok) { toast.success(L('تم الحذف', 'Deleted')); fetch_() }
    else toast.error(L('فشل الحذف', 'Delete failed'))
  }

  function exportExcel() {
    const data = rows.map(r => {
      const obj: any = {}
      columns.forEach(c => { obj[c.label] = r[c.key] })
      return obj
    })
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, title)
    XLSX.writeFile(wb, `${title}-${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800">{title}</h2>
        <div className="flex gap-2">
          <button onClick={exportExcel} className="btn-secondary"><FileDown size={15} /> Excel</button>
          {canEdit && <button onClick={openCreate} className="btn-primary"><Plus size={15} /> {L('إضافة', 'Add')}</button>}
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? <LoadingSpinner /> : rows.length === 0 ? (
          <EmptyState icon={emptyIcon || Plus} title={L('لا توجد بيانات', 'No data')} description={L('ابدأ بإضافة أول عنصر', 'Start by adding your first item')} action={canEdit ? <button onClick={openCreate} className="btn-primary"><Plus size={15} /> {L('إضافة', 'Add')}</button> : undefined} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  {columns.map(c => <th key={c.key} className="table-header text-start">{c.label}</th>)}
                  <th className="table-header text-start">{L('الحالة', 'Status')}</th>
                  {canEdit && <th className="table-header text-start">{L('إجراءات', 'Actions')}</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.id} className={cn('hover:bg-gray-50 transition-colors', row.active === false && 'opacity-50')}>
                    {columns.map(c => (
                      <td key={c.key} className="table-cell">
                        {c.render ? c.render(row) : row[c.key] ?? '—'}
                      </td>
                    ))}
                    <td className="table-cell">
                      <button onClick={() => handleToggle(row)} className="text-gray-400 hover:text-primary-600">
                        {row.active !== false
                          ? <ToggleRight size={22} className="text-green-500" />
                          : <ToggleLeft size={22} className="text-gray-300" />}
                      </button>
                    </td>
                    {canEdit && (
                      <td className="table-cell">
                        <div className="flex gap-2">
                          <button onClick={() => openEdit(row)} className="text-blue-400 hover:text-blue-600"><Edit2 size={15} /></button>
                          <button onClick={() => handleDelete(row)} className="text-red-400 hover:text-red-600"><Trash2 size={15} /></button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editRow ? `${L('تعديل', 'Edit')} — ${editRow.name || ''}` : `${L('إضافة', 'Add')} — ${title}`} size="lg">
        <form onSubmit={handleSave}>
          <div className="grid grid-cols-2 gap-4">
            {fields.map(f => (
              <div key={f.key} className={f.colSpan ? 'col-span-2' : ''}>
                <label className="label">{f.label}{f.required && <span className="text-red-500 mr-1">*</span>}</label>
                {f.type === 'textarea' ? (
                  <textarea className="input resize-none h-20" placeholder={f.placeholder} value={form[f.key] || ''} onChange={e => setForm(v => ({ ...v, [f.key]: e.target.value }))} />
                ) : f.type === 'select' ? (
                  <select className="input" value={form[f.key] || ''} onChange={e => setForm(v => ({ ...v, [f.key]: e.target.value }))}>
                    <option value="">{L('— اختر —', '— Select —')}</option>
                    {f.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : (
                  <input type={f.type || 'text'} className="input" placeholder={f.placeholder} required={f.required}
                    value={form[f.key] || ''} onChange={e => setForm(v => ({ ...v, [f.key]: e.target.value }))} />
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-5">
            <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">{saving ? L('جاري الحفظ...', 'Saving...') : L('حفظ', 'Save')}</button>
            <button type="button" onClick={() => setModal(false)} className="btn-secondary">{L('إلغاء', 'Cancel')}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
