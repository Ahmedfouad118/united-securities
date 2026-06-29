'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Header from '@/components/layout/Header'
import { ArrowRight, UserCog } from 'lucide-react'
import Link from 'next/link'
import CustomerForm from '@/components/customers/CustomerForm'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { useI18n } from '@/lib/i18n'

export default function EditCustomerPage() {
  const { id } = useParams() as { id: string }
  const { lang } = useI18n()
  const L = (ar: string, en: string) => lang === 'en' ? en : ar
  const [customer, setCustomer] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/customers/${id}`).then(r => r.json()).then(d => { setCustomer(d); setLoading(false) })
  }, [id])

  return (
    <div className="flex flex-col min-h-screen">
      <Header title={L('تعديل العميل', 'Edit Customer')} />
      <div className="p-6 max-w-3xl mx-auto w-full">
        <Link href="/customers" className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm mb-6">
          <ArrowRight size={16} className={lang === 'en' ? 'rotate-180' : ''} /> {L('العودة للعملاء', 'Back to Customers')}
        </Link>
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-primary-50 rounded-xl p-2.5"><UserCog size={22} className="text-primary-600" /></div>
            <h2 className="text-lg font-bold text-gray-800">{L('تعديل بيانات العميل', 'Edit Customer Details')}</h2>
          </div>
          {loading ? <LoadingSpinner /> : (
            <CustomerForm customerId={id} initial={{
              name: customer?.name, nameAr: customer?.nameAr, phone: customer?.phone, email: customer?.email,
              vatNumber: customer?.vatNumber, nin: customer?.nin, accountNumber: customer?.accountNumber,
              clientNumber: customer?.clientNumber, shareholderNumber: customer?.shareholderNumber,
              address: customer?.address, openingBalance: customer?.openingBalance,
            }} />
          )}
        </div>
      </div>
    </div>
  )
}
