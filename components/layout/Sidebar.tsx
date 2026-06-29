'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useState } from 'react'
import {
  LayoutDashboard, Users, FileText, Receipt, BarChart3,
  Settings, LogOut, Building2, Tag, Landmark, Briefcase,
  Wallet, ChevronDown, ChevronLeft,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { hasPermission } from '@/lib/permissions'
import { Role } from '@/types'
import { signOut } from 'next-auth/react'
import LanguageSwitcher from './LanguageSwitcher'
import { useI18n } from '@/lib/i18n'

export default function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const role = (session?.user as any)?.role as Role
  const [mastersOpen, setMastersOpen] = useState(pathname.includes('/masters'))
  const { t, lang } = useI18n()

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  const mainNav = [
    { href: '/dashboard', label: t.nav.dashboard, icon: LayoutDashboard, permission: 'VIEW_DASHBOARD' as const },
    { href: '/customers', label: t.nav.customers, icon: Users, permission: 'VIEW_CUSTOMERS' as const },
    { href: '/invoices', label: t.nav.invoices, icon: FileText, permission: 'VIEW_INVOICES' as const },
    { href: '/receipts', label: t.nav.receipts, icon: Receipt, permission: 'CREATE_PAYMENT' as const },
    { href: '/reports', label: t.nav.reports, icon: BarChart3, permission: 'VIEW_REPORTS' as const },
  ]

  const mastersNav = [
    { href: '/masters/company', label: lang === 'en' ? 'Company Info' : 'بيانات الشركة', icon: Building2 },
    { href: '/masters/invoice-categories', label: t.nav.invoiceCategories, icon: Tag },
    { href: '/masters/banks', label: t.nav.banks, icon: Landmark },
    { href: '/masters/service-types', label: t.nav.serviceTypes, icon: Briefcase },
    { href: '/masters/payment-categories', label: t.nav.paymentCategories, icon: Wallet },
  ]

  return (
    <aside className={cn('fixed top-0 h-full w-64 bg-primary-900 text-white flex flex-col z-30', lang === 'ar' ? 'right-0' : 'left-0')}>
      {/* Logo */}
      <div className="p-5 border-b border-primary-700">
        <div className="flex items-center gap-3">
          <div className="bg-primary-500 rounded-xl p-2">
            <Building2 size={20} />
          </div>
          <div>
            <p className="font-bold text-sm leading-tight">{lang === 'ar' ? 'نظام الإدارة' : 'Management System'}</p>
            <p className="text-primary-300 text-xs">{lang === 'ar' ? 'المالية والعملاء' : 'Finance & Clients'}</p>
          </div>
          <div className="mr-auto ml-auto">
            <LanguageSwitcher compact />
          </div>
        </div>
      </div>

      {/* User info */}
      <div className="px-4 py-2.5 border-b border-primary-700">
        <p className="text-sm font-semibold truncate">{session?.user?.name}</p>
        <p className="text-primary-300 text-xs truncate">{session?.user?.email}</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {mainNav.map((item) => {
          if (role && !hasPermission(role, item.permission)) return null
          return (
            <Link key={item.href} href={item.href}
              className={cn('flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium',
                isActive(item.href) ? 'bg-primary-500 text-white shadow-md' : 'text-primary-200 hover:bg-primary-800 hover:text-white')}>
              <item.icon size={17} />
              {item.label}
            </Link>
          )
        })}

        {/* Masters submenu */}
        {(role === 'ADMIN' || role === 'ACCOUNTANT') && (
          <div>
            <button onClick={() => setMastersOpen(v => !v)}
              className={cn('flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium w-full',
                pathname.includes('/masters') ? 'bg-primary-500 text-white shadow-md' : 'text-primary-200 hover:bg-primary-800 hover:text-white')}>
              <Settings size={17} />
              <span className="flex-1 text-right">{t.nav.masters}</span>
              {mastersOpen ? <ChevronDown size={14} /> : <ChevronLeft size={14} />}
            </button>
            {mastersOpen && (
              <div className="mr-4 mt-0.5 space-y-0.5 border-r border-primary-700 pr-2">
                {mastersNav.map(item => (
                  <Link key={item.href} href={item.href}
                    className={cn('flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all text-xs font-medium',
                      isActive(item.href) ? 'bg-primary-600 text-white' : 'text-primary-300 hover:bg-primary-800 hover:text-white')}>
                    <item.icon size={14} />
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {role === 'ADMIN' && (
          <Link href="/users"
            className={cn('flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium',
              isActive('/users') ? 'bg-primary-500 text-white shadow-md' : 'text-primary-200 hover:bg-primary-800 hover:text-white')}>
            <Users size={17} />
            {t.nav.users}
          </Link>
        )}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-primary-700">
        <button onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-primary-200 hover:bg-red-600 hover:text-white w-full transition-all text-sm font-medium">
          <LogOut size={17} />
          {t.nav.logout}
        </button>
      </div>
    </aside>
  )
}
