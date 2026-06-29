'use client'
import Header from '@/components/layout/Header'
import MasterPage from '@/components/ui/MasterPage'
import { Landmark } from 'lucide-react'

export default function BanksPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header title="الحسابات البنكية" />
      <MasterPage
        title="الحسابات البنكية"
        apiUrl="/api/masters/banks"
        emptyIcon={Landmark}
        fields={[
          { key: 'bankName', label: 'اسم البنك (EN)', required: true, placeholder: 'Bank Muscat' },
          { key: 'bankNameAr', label: 'اسم البنك (AR)', placeholder: 'بنك مسقط' },
          { key: 'accountName', label: 'اسم الحساب', placeholder: 'United Securities LLC' },
          { key: 'currency', label: 'العملة', type: 'select', options: [{ value: 'OMR', label: 'OMR — ريال عماني' }, { value: 'USD', label: 'USD — دولار أمريكي' }, { value: 'EUR', label: 'EUR — يورو' }, { value: 'SAR', label: 'SAR — ريال سعودي' }] },
          { key: 'swiftCode', label: 'رمز Swift', placeholder: 'BMUSOMRX' },
          { key: 'accountNumber', label: 'رقم الحساب', placeholder: '0123456789' },
          { key: 'iban', label: 'رقم IBAN', placeholder: 'OM210123456789' },
          { key: 'notes', label: 'ملاحظات', type: 'textarea', colSpan: true },
        ]}
        columns={[
          { key: 'bankName', label: 'اسم البنك' },
          { key: 'accountName', label: 'اسم الحساب' },
          { key: 'currency', label: 'العملة' },
          { key: 'swiftCode', label: 'Swift' },
          { key: 'accountNumber', label: 'رقم الحساب' },
          { key: 'iban', label: 'IBAN' },
        ]}
      />
    </div>
  )
}
