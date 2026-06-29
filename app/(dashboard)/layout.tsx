'use client'
import Sidebar from '@/components/layout/Sidebar'
import { useI18n } from '@/lib/i18n'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { lang } = useI18n()
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className={`flex-1 min-h-screen ${lang === 'ar' ? 'mr-64' : 'ml-64'}`}>
        {children}
      </main>
    </div>
  )
}
