'use client'
import { Bell } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { Role } from '@/types'
import { useI18n } from '@/lib/i18n'

const ROLE_LABELS_AR: Record<string, string> = { ADMIN: 'مدير النظام', ACCOUNTANT: 'محاسب', SALES: 'مبيعات', VIEWER: 'مشاهد' }
const ROLE_LABELS_EN: Record<string, string> = { ADMIN: 'Admin', ACCOUNTANT: 'Accountant', SALES: 'Sales', VIEWER: 'Viewer' }

interface HeaderProps { title: string }

export default function Header({ title }: HeaderProps) {
  const { data: session } = useSession()
  const role = (session?.user as any)?.role as Role
  const { lang } = useI18n()

  const roleLabel = lang === 'en'
    ? (ROLE_LABELS_EN[role] || role)
    : (ROLE_LABELS_AR[role] || role)

  return (
    <header className="no-print bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-20">
      <h1 className="text-xl font-bold text-gray-800">{title}</h1>
      <div className="flex items-center gap-4">
        <span className="text-xs bg-primary-50 text-primary-700 px-3 py-1 rounded-full font-medium">
          {roleLabel}
        </span>
        <button className="text-gray-400 hover:text-gray-600 transition-colors">
          <Bell size={20} />
        </button>
      </div>
    </header>
  )
}
