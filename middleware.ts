export { default } from 'next-auth/middleware'

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/customers/:path*',
    '/invoices/:path*',
    '/payments/:path*',
    '/reports/:path*',
  ],
}
