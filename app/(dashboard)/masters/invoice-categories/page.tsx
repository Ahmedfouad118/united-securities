'use client'
import Header from '@/components/layout/Header'
import MasterPage from '@/components/ui/MasterPage'
import { Tag } from 'lucide-react'

const TYPES = [
  { value: 'REGULAR', label: 'فاتورة عادية' },
  { value: 'MANAGEMENT_FEE', label: 'رسوم الإدارة' },
  { value: 'PERFORMANCE_FEE', label: 'رسوم الأداء' },
  { value: 'DEBIT_NOTE', label: 'مذكرة مدين' },
  { value: 'CREDIT_NOTE', label: 'مذكرة دائن' },
]

const typeLabel = (v: string) => TYPES.find(t => t.value === v)?.label || v

export default function InvoiceCategoriesPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header title="أنواع الفواتير" />
      <MasterPage
        title="أنواع الفواتير"
        apiUrl="/api/masters/invoice-categories"
        emptyIcon={Tag}
        fields={[
          { key: 'name', label: 'الاسم (English)', required: true, placeholder: 'Regular Invoice' },
          { key: 'nameAr', label: 'الاسم (عربي)', placeholder: 'فاتورة عادية' },
          { key: 'type', label: 'النوع', type: 'select', options: TYPES, required: true },
          { key: 'notes', label: 'ملاحظات', type: 'textarea', colSpan: true },
        ]}
        columns={[
          { key: 'name', label: 'الاسم (EN)' },
          { key: 'nameAr', label: 'الاسم (AR)' },
          { key: 'type', label: 'النوع', render: (r) => <span className="badge bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-xs">{typeLabel(r.type)}</span> },
          { key: 'notes', label: 'ملاحظات' },
        ]}
      />
    </div>
  )
}
