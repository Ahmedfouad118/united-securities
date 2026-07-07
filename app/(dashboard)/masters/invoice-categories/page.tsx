'use client'
import Header from '@/components/layout/Header'
import MasterPage from '@/components/ui/MasterPage'
import { Tag } from 'lucide-react'
import { useI18n } from '@/lib/i18n'

const TYPES_AR = [
  { value: 'REGULAR', label: 'فاتورة عادية' },
  { value: 'MANAGEMENT_FEE', label: 'رسوم الإدارة' },
  { value: 'PERFORMANCE_FEE', label: 'رسوم الأداء' },
  { value: 'DEBIT_NOTE', label: 'مذكرة مدين' },
  { value: 'CREDIT_NOTE', label: 'مذكرة دائن' },
]
const TYPES_EN = [
  { value: 'REGULAR', label: 'Regular Invoice' },
  { value: 'MANAGEMENT_FEE', label: 'Management Fee' },
  { value: 'PERFORMANCE_FEE', label: 'Performance Fee' },
  { value: 'DEBIT_NOTE', label: 'Debit Note' },
  { value: 'CREDIT_NOTE', label: 'Credit Note' },
]

export default function InvoiceCategoriesPage() {
  const { lang } = useI18n()
  const L = (ar: string, en: string) => lang === 'en' ? en : ar
  const TYPES = lang === 'en' ? TYPES_EN : TYPES_AR
  const typeLabel = (v: string) => TYPES.find(t => t.value === v)?.label || v
  const title = L('أنواع الفواتير', 'Invoice Types')

  return (
    <div className="flex flex-col min-h-screen">
      <Header title={title} />
      <MasterPage
        title={title}
        apiUrl="/api/masters/invoice-categories"
        emptyIcon={Tag}
        fields={[
          { key: 'name', label: L('الاسم (إنجليزي)', 'Name (EN)'), required: true, placeholder: 'Regular Invoice' },
          { key: 'nameAr', label: L('الاسم (عربي)', 'Name (AR)'), placeholder: 'فاتورة عادية' },
          { key: 'type', label: L('النوع', 'Type'), type: 'select', options: TYPES, required: true },
          { key: 'bodyText', label: L('نص الفاتورة (يظهر في الطباعة تحت العنوان)', 'Invoice body text (shown on print under the title)'), type: 'textarea', colSpan: true },
          { key: 'notes', label: L('ملاحظات داخلية', 'Internal notes'), type: 'textarea', colSpan: true },
        ]}
        columns={[
          { key: 'name', label: L('الاسم (EN)', 'Name (EN)') },
          { key: 'nameAr', label: L('الاسم (AR)', 'Name (AR)') },
          { key: 'type', label: L('النوع', 'Type'), render: (r) => <span className="badge bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-xs">{typeLabel(r.type)}</span> },
          { key: 'bodyText', label: L('نص الفاتورة', 'Body text'), render: (r) => <span className="text-xs text-gray-500 line-clamp-1">{r.bodyText || '—'}</span> },
        ]}
      />
    </div>
  )
}
