'use client'
import Header from '@/components/layout/Header'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import LetterForm from '@/components/letters/LetterForm'
import { useI18n } from '@/lib/i18n'

export default function NewLetterPage() {
  const { lang } = useI18n()
  const L = (ar: string, en: string) => lang === 'en' ? en : ar
  return (
    <div className="flex flex-col min-h-screen">
      <Header title={L('رسالة جديدة', 'New Letter')} />
      <div className="p-6">
        <Link href="/letters" className="flex items-center gap-1 text-sm text-gray-500 hover:text-primary-600 mb-5">
          <ArrowRight size={14} className={lang === 'en' ? 'rotate-180' : ''} /> {L('العودة للرسائل', 'Back to Letters')}
        </Link>
        <LetterForm />
      </div>
    </div>
  )
}
