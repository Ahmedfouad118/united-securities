import type { ReactNode } from 'react'
import SessionProvider from '@/components/layout/SessionProvider'

export default function PrintLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" dir="ltr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Arial&family=Inter:wght@400;600;700&display=swap" rel="stylesheet" />
        <style>{`* { margin: 0; padding: 0; box-sizing: border-box; } body { background: white; }`}</style>
      </head>
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}
