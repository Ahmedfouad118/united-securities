'use client'
import Header from '@/components/layout/Header'
import MasterPage from '@/components/ui/MasterPage'
import { Truck } from 'lucide-react'
import { useI18n } from '@/lib/i18n'

export default function SuppliersPage() {
  const { lang } = useI18n()
  const L = (ar: string, en: string) => lang === 'en' ? en : ar
  const title = L('الموردين', 'Suppliers')

  return (
    <div className="flex flex-col min-h-screen">
      <Header title={title} />
      <MasterPage
        title={title}
        apiUrl="/api/masters/suppliers"
        emptyIcon={Truck}
        fields={[
          { key: 'name', label: L('الاسم (إنجليزي)', 'Name (EN)'), required: true, placeholder: 'REFINTIV MIDDLE EAST FZ-LLC' },
          { key: 'nameAr', label: L('الاسم (عربي)', 'Name (AR)') },
          { key: 'phone', label: L('الهاتف', 'Phone') },
          { key: 'email', label: L('الإيميل', 'Email') },
          { key: 'bankName', label: L('اسم البنك', 'Bank Name'), placeholder: 'Citibank, Dubai, UAE' },
          { key: 'branch', label: L('الفرع', 'Branch') },
          { key: 'accountNumber', label: L('رقم الحساب', 'Account No.') },
          { key: 'iban', label: 'IBAN' },
          { key: 'swiftCode', label: L('رمز السويفت', 'Swift Code') },
          { key: 'address', label: L('العنوان', 'Address'), colSpan: true },
          { key: 'notes', label: L('ملاحظات', 'Notes'), type: 'textarea', colSpan: true },
        ]}
        columns={[
          { key: 'name', label: L('الاسم', 'Name') },
          { key: 'bankName', label: L('البنك', 'Bank') },
          { key: 'accountNumber', label: L('رقم الحساب', 'Account No.') },
          { key: 'iban', label: 'IBAN' },
          { key: 'swiftCode', label: 'Swift' },
          { key: 'email', label: L('الإيميل', 'Email') },
        ]}
      />
    </div>
  )
}
