'use client'
import Header from '@/components/layout/Header'
import MasterPage from '@/components/ui/MasterPage'
import { MailPlus } from 'lucide-react'
import { useI18n } from '@/lib/i18n'

export default function LetterTypesPage() {
  const { lang } = useI18n()
  const L = (ar: string, en: string) => lang === 'en' ? en : ar
  const title = L('أنواع الرسائل', 'Letter Types')

  const PARTIES = [
    { value: 'COMPANY', label: L('الشركة', 'Company') },
    { value: 'CUSTOMER', label: L('عميل', 'Customer') },
    { value: 'SUPPLIER', label: L('مورد', 'Supplier') },
    { value: 'BANK', label: L('بنك', 'Bank') },
  ]
  const partyLabel = (v: string) => PARTIES.find(p => p.value === v)?.label || v

  return (
    <div className="flex flex-col min-h-screen">
      <Header title={title} />
      <MasterPage
        title={title}
        apiUrl="/api/masters/letter-types"
        emptyIcon={MailPlus}
        fields={[
          { key: 'name', label: L('الاسم (إنجليزي)', 'Name (EN)'), required: true, placeholder: 'Company to Supplier' },
          { key: 'nameAr', label: L('الاسم (عربي)', 'Name (AR)'), placeholder: 'من الشركة إلى مورد' },
          { key: 'fromParty', label: L('من', 'From'), type: 'select', options: PARTIES, required: true },
          { key: 'toParty', label: L('إلى', 'To'), type: 'select', options: PARTIES, required: true },
          { key: 'online', label: L('النوع', 'Mode'), type: 'select', options: [
            { value: 'false', label: L('عادية', 'Normal') },
            { value: 'true', label: L('أونلاين (بختم الموافقة)', 'Online (approval stamp)') },
          ] },
          { key: 'bodyText', label: L('نص الرسالة (اختياري — يستبدل النص الافتراضي، استخدم {amount} و{words} و{account})', 'Body text (optional — replaces default; use {amount}, {words}, {account})'), type: 'textarea', colSpan: true },
        ]}
        columns={[
          { key: 'name', label: L('الاسم', 'Name') },
          { key: 'nameAr', label: L('الاسم (AR)', 'Name (AR)') },
          { key: 'fromParty', label: L('من', 'From'), render: r => <span className="text-xs">{partyLabel(r.fromParty)}</span> },
          { key: 'toParty', label: L('إلى', 'To'), render: r => <span className="text-xs">{partyLabel(r.toParty)}</span> },
          { key: 'online', label: L('أونلاين', 'Online'), render: r => <span className={`px-2 py-0.5 rounded-full text-xs ${r.online ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>{r.online ? L('أونلاين', 'Online') : L('عادية', 'Normal')}</span> },
        ]}
      />
    </div>
  )
}
