'use client'
import { SessionProvider as NextSessionProvider } from 'next-auth/react'
import { I18nProvider } from '@/lib/i18n'

export default function SessionProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextSessionProvider>
      <I18nProvider>
        {children}
      </I18nProvider>
    </NextSessionProvider>
  )
}
