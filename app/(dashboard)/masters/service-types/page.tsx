'use client'
import Header from '@/components/layout/Header'
import MasterPage from '@/components/ui/MasterPage'
import { Briefcase } from 'lucide-react'

export default function ServiceTypesPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header title="أنواع الخدمات" />
      <MasterPage
        title="أنواع الخدمات"
        apiUrl="/api/masters/service-types"
        emptyIcon={Briefcase}
        fields={[
          { key: 'name', label: 'اسم الخدمة (EN)', required: true, placeholder: 'Company Commission' },
          { key: 'nameAr', label: 'اسم الخدمة (AR)', placeholder: 'عمولة الشركة' },
          { key: 'vatRate', label: 'نسبة الضريبة %', type: 'number', placeholder: '5' },
          { key: 'description', label: 'الوصف', type: 'textarea', colSpan: true },
        ]}
        columns={[
          { key: 'name', label: 'الخدمة (EN)' },
          { key: 'nameAr', label: 'الخدمة (AR)' },
          { key: 'vatRate', label: 'نسبة الضريبة %', render: (r) => `${r.vatRate}%` },
          { key: 'description', label: 'الوصف' },
        ]}
      />
    </div>
  )
}
