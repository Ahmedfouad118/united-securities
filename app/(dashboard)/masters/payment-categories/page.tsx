'use client'
import Header from '@/components/layout/Header'
import MasterPage from '@/components/ui/MasterPage'
import { Wallet } from 'lucide-react'

export default function PaymentCategoriesPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header title="أنواع الدفعات" />
      <MasterPage
        title="أنواع الدفعات"
        apiUrl="/api/masters/payment-categories"
        emptyIcon={Wallet}
        fields={[
          { key: 'name', label: 'النوع (EN)', required: true, placeholder: 'Full Payment' },
          { key: 'nameAr', label: 'النوع (AR)', placeholder: 'سداد كامل' },
          { key: 'notes', label: 'ملاحظات', type: 'textarea', colSpan: true },
        ]}
        columns={[
          { key: 'name', label: 'النوع (EN)' },
          { key: 'nameAr', label: 'النوع (AR)' },
          { key: 'notes', label: 'ملاحظات' },
        ]}
      />
    </div>
  )
}
