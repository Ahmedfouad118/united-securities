'use client'
import Header from '@/components/layout/Header'
import { ArrowRight, UserPlus } from 'lucide-react'
import Link from 'next/link'
import CustomerForm from '@/components/customers/CustomerForm'
import { useI18n } from '@/lib/i18n'

export default function NewCustomerPage() {
  const { lang } = useI18n()
  const L = (ar: string, en: string) => lang === 'en' ? en : ar
  return (
    <div className="flex flex-col min-h-screen">
      <Header title={L('إضافة عميل جديد', 'New Customer')} />
      <div className="p-6 max-w-3xl mx-auto w-full">
        <Link href="/customers" className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm mb-6">
          <ArrowRight size={16} className={lang === 'en' ? 'rotate-180' : ''} /> {L('العودة للعملاء', 'Back to Customers')}
        </Link>
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-primary-50 rounded-xl p-2.5"><UserPlus size={22} className="text-primary-600" /></div>
            <h2 className="text-lg font-bold text-gray-800">{L('بيانات العميل', 'Customer Details')}</h2>
          </div>
          <CustomerForm />
        </div>
      </div>
    </div>
  )
}
