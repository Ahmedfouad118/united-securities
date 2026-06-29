'use client'
import { useState, useEffect } from 'react'
import Header from '@/components/layout/Header'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { Building2, Save, Upload, X } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import toast from 'react-hot-toast'

const FIELDS: { key: string; ar: string; en: string; full?: boolean }[] = [
  { key: 'nameEn', ar: 'اسم الشركة (إنجليزي)', en: 'Company Name (EN)' },
  { key: 'nameAr', ar: 'اسم الشركة (عربي)', en: 'Company Name (AR)' },
  { key: 'crNumber', ar: 'رقم السجل التجاري', en: 'CR Number' },
  { key: 'vatNumber', ar: 'رقم القيمة المضافة', en: 'VAT Number' },
  { key: 'phone', ar: 'تليفون', en: 'Phone' },
  { key: 'fax', ar: 'فاكس', en: 'Fax' },
  { key: 'email', ar: 'الإيميل', en: 'Email' },
  { key: 'website', ar: 'الموقع الإلكتروني', en: 'Website' },
  { key: 'poBox', ar: 'صندوق البريد', en: 'P.O Box' },
  { key: 'postalCode', ar: 'الرمز البريدي', en: 'Postal Code' },
  { key: 'address', ar: 'العنوان', en: 'Address', full: true },
]

const SMTP_FIELDS: { key: string; ar: string; en: string; type?: string; ph?: string }[] = [
  { key: 'smtpHost', ar: 'خادم SMTP', en: 'SMTP Host', ph: 'smtp.office365.com' },
  { key: 'smtpPort', ar: 'المنفذ', en: 'Port', type: 'number', ph: '587' },
  { key: 'smtpUser', ar: 'إيميل المرسل (المستخدم)', en: 'Sender Email (User)', ph: 'you@usoman.com' },
  { key: 'smtpPass', ar: 'كلمة مرور التطبيق', en: 'App Password', type: 'password', ph: '••••••••' },
  { key: 'smtpFrom', ar: 'يظهر باسم (اختياري)', en: 'From (optional)', ph: 'accounts@usoman.com' },
  { key: 'smtpCc', ar: 'نسخة لـ CC (اختياري)', en: 'CC (optional)', ph: 'manager@usoman.com' },
]

export default function CompanySettingsPage() {
  const { lang } = useI18n()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/masters/company').then(r => r.json()).then(d => { setData(d); setLoading(false) })
  }, [])

  async function save() {
    setSaving(true)
    try {
      const res = await fetch('/api/masters/company', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
      })
      if (res.ok) toast.success(lang === 'en' ? 'Saved' : 'تم الحفظ')
      else toast.error(lang === 'en' ? 'Error' : 'خطأ')
    } finally { setSaving(false) }
  }

  function onLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 500 * 1024) { toast.error(lang === 'en' ? 'Logo must be under 500KB' : 'اللوجو يجب أن يكون أقل من 500 كيلوبايت'); return }
    const reader = new FileReader()
    reader.onload = () => setData({ ...data, logoUrl: reader.result as string })
    reader.readAsDataURL(file)
  }

  const title = lang === 'en' ? 'Company Information' : 'بيانات الشركة'

  return (
    <div className="flex flex-col min-h-screen">
      <Header title={title} />
      <div className="p-6 flex-1">
        {loading ? <LoadingSpinner /> : (
          <div className="card max-w-3xl">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b">
              <div className="w-11 h-11 rounded-xl bg-primary-50 flex items-center justify-center">
                <Building2 className="text-primary-600" size={22} />
              </div>
              <div>
                <h2 className="font-bold text-gray-800">{title}</h2>
                <p className="text-xs text-gray-400">{lang === 'en' ? 'Used in invoice headers' : 'تُستخدم في هيدر الفواتير'}</p>
              </div>
            </div>
            {/* Logo upload */}
            <div className="mb-6">
              <label className="label">{lang === 'en' ? 'Company Logo' : 'شعار الشركة'}</label>
              <div className="flex items-center gap-4">
                <div className="w-28 h-28 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center bg-gray-50 overflow-hidden shrink-0">
                  {data?.logoUrl
                    ? <img src={data.logoUrl} alt="logo" className="max-w-full max-h-full object-contain" />
                    : <Building2 className="text-gray-300" size={32} />}
                </div>
                <div className="flex flex-col gap-2">
                  <label className="btn-secondary text-sm cursor-pointer w-fit">
                    <Upload size={15} /> {lang === 'en' ? 'Upload Logo' : 'رفع الشعار'}
                    <input type="file" accept="image/*" className="hidden" onChange={onLogoChange} />
                  </label>
                  {data?.logoUrl && (
                    <button type="button" onClick={() => setData({ ...data, logoUrl: '' })} className="text-red-500 text-xs flex items-center gap-1 hover:underline">
                      <X size={13} /> {lang === 'en' ? 'Remove logo' : 'إزالة الشعار'}
                    </button>
                  )}
                  <p className="text-xs text-gray-400">{lang === 'en' ? 'PNG/JPG, max 500KB. Appears on invoices.' : 'PNG/JPG، أقصى 500 كيلوبايت. يظهر على الفواتير.'}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {FIELDS.map(f => (
                <div key={f.key} className={f.full ? 'md:col-span-2' : ''}>
                  <label className="label">{lang === 'en' ? f.en : f.ar}</label>
                  <input className="input" value={data?.[f.key] || ''} dir={f.key === 'nameAr' || f.key === 'address' ? undefined : 'ltr'}
                    onChange={e => setData({ ...data, [f.key]: e.target.value })} />
                </div>
              ))}
            </div>
            {/* Email (SMTP) settings */}
            <div className="mt-8 pt-5 border-t">
              <h3 className="font-bold text-gray-800 mb-1">{lang === 'en' ? 'Email Settings (SMTP)' : 'إعدادات الإيميل (SMTP)'}</h3>
              <p className="text-xs text-gray-400 mb-4">{lang === 'en' ? 'Used to email invoices to customers. For Outlook/Office365 use smtp.office365.com port 587 with an App Password.' : 'تُستخدم لإرسال الفواتير للعملاء بالإيميل. لـ Outlook/Office365 استخدم smtp.office365.com منفذ 587 مع App Password.'}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {SMTP_FIELDS.map(f => (
                  <div key={f.key}>
                    <label className="label">{lang === 'en' ? f.en : f.ar}</label>
                    <input className="input" dir="ltr" type={f.type || 'text'} placeholder={f.ph}
                      value={data?.[f.key] ?? ''} onChange={e => setData({ ...data, [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value })} />
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button onClick={save} disabled={saving} className="btn-primary">
                <Save size={16} /> {saving ? (lang === 'en' ? 'Saving...' : 'جاري الحفظ...') : (lang === 'en' ? 'Save' : 'حفظ')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
