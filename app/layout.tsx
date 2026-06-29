import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import SessionProvider from '@/components/layout/SessionProvider'

export const metadata: Metadata = {
  title: 'United Securities — Invoice Management',
  description: 'Customer and invoice management system',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <SessionProvider>
          {children}
          <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
        </SessionProvider>
      </body>
    </html>
  )
}
