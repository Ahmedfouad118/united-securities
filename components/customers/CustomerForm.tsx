'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useI18n } from '@/lib/i18n'
import toast from 'react-hot-toast'

export interface CustomerData {
  name?: string; nameAr?: string; phone?: string; email?: string
  vatNumber?: string; nin?: string; accountNumber?: string; clientNumber?: string
  shareholderNumber?: string; address?: string; openingBalance?: any
}

const FIELDS: { key: keyof CustomerData; ar: string; en: string; type?: string; full?: boolean }[] = [
  { key: 'name', ar: 'الاسم (إنجليزي)', en: 'Name (EN)' },
  { key: 'nameAr', ar: 'الاسم (عربي)', en: 'Name (AR)' },
  { key: 'clientNumber', ar: 'رقم العميل', en: 'Client Number' },
  { key: 'shareholderNumber', ar: 'رقم المساهم', en: 'Shareholder Number' },
  { key: 'accountNumber', ar: 'رقم الحساب', en: 'Account Number' },
  { key: 'nin', ar: 'الرقم المدني (NIN)', en: 'NIN' },
  { key: 'vatNumber', ar: 'رقم القيمة المضافة', en: 'VAT Number' },
  { key: 'phone', ar: 'رقم الهاتف', en: 'Phone' },
  { key: 'email', ar: 'البريد الإلكتروني', en: 'Email', type: 'email' },
  { key: 'openingBalance', ar: 'الرصيد الافتتاحي', en: 'Opening Balance', type: 'number' },
  { key: 'address', ar: 'العنوان', en: 'Address', full: true },
]

export default function CustomerForm({ initial, customerId }: { initial?: CustomerData; customerId?: string }) {
  const router = useRouter()
  const { lang } = useI18n()
  const L = (ar: string, en: string) => lang === 'en' ? en : ar
  const [form, setForm] = useState<CustomerData>(initial || {})
  const [loading, setLoading] = useState(false)
  const isEdit = !!customerId

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name?.trim()) return toast.error(L('الاسم مطلوب', 'Name required'))
    setLoading(true)
    try {
      const res = await fetch(isEdit ? `/api/customers/${customerId}` : '/api/customers', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, openingBalance: form.openingBalance ?? 0 }),
      })
      if (!res.ok) { const err = await res.json(); return toast.error(err.error || L('فشل', 'Failed')) }
      toast.success(isEdit ? L('تم تحديث العميل', 'Customer updated') : L('تم إضافة العميل', 'Customer added'))
      router.push('/customers')
    } finally { setLoading(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {FIELDS.map(f => (
          <div key={f.key} className={f.full ? 'md:col-span-2' : ''}>
            <label className="label">{L(f.ar, f.en)}{f.key === 'name' && <span className="text-red-500"> *</span>}</label>
            <input className="input" type={f.type || 'text'}
              dir={f.key === 'nameAr' || f.key === 'address' ? undefined : 'ltr'}
              step={f.type === 'number' ? '0.001' : undefined}
              value={(form[f.key] as any) ?? ''}
              onChange={e => setForm(prev => ({ ...prev, [f.key]: f.type === 'number' ? e.target.value : e.target.value }))} />
          </div>
        ))}
      </div>
      <div className="flex gap-3">
        <button type="submit" disabled={loading} className="btn-primary px-8">{loading ? L('جاري الحفظ...', 'Saving...') : isEdit ? L('حفظ التعديلات', 'Save Changes') : L('حفظ العميل', 'Save Customer')}</button>
        <button type="button" onClick={() => router.push('/customers')} className="btn-secondary px-6">{L('إلغاء', 'Cancel')}</button>
      </div>
    </form>
  )
}
