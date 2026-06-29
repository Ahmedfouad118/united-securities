export type Role = 'ADMIN' | 'ACCOUNTANT' | 'SALES' | 'VIEWER'
export type InvoiceStatus = 'UNPAID' | 'PARTIAL' | 'PAID'
export type TransactionType = 'OPENING_BALANCE' | 'INVOICE' | 'PAYMENT'

export interface Customer {
  id: string
  name: string
  phone?: string | null
  email?: string | null
  openingBalance: number
  currentBalance: number
  createdAt: string
}

export interface InvoiceItem {
  id?: string
  description: string
  quantity: number
  unitPrice: number
  total: number
}

export interface Invoice {
  id: string
  invoiceNumber: string
  customerId: string
  customer?: Customer
  date: string
  totalAmount: number
  paidAmount: number
  remaining: number
  status: InvoiceStatus
  notes?: string | null
  items?: InvoiceItem[]
}

export interface Transaction {
  id: string
  customerId: string
  customer?: Customer
  invoiceId?: string | null
  type: TransactionType
  date: string
  amount: number
  notes?: string | null
}

export interface DashboardStats {
  totalInvoices: number
  totalOutstanding: number
  totalCollected: number
  topInvoices: Invoice[]
  topDebtors: { customer: Customer; balance: number }[]
  monthlySales: { month: string; sales: number; collections: number }[]
}

export interface User {
  id: string
  name: string
  email: string
  role: Role
  active: boolean
}

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'مدير',
  ACCOUNTANT: 'محاسب',
  SALES: 'موظف مبيعات',
  VIEWER: 'قراءة فقط',
}

export const STATUS_LABELS: Record<InvoiceStatus, string> = {
  UNPAID: 'غير مدفوعة',
  PARTIAL: 'مدفوعة جزئياً',
  PAID: 'مدفوعة',
}

export const STATUS_COLORS: Record<InvoiceStatus, string> = {
  UNPAID: 'bg-red-100 text-red-700',
  PARTIAL: 'bg-yellow-100 text-yellow-700',
  PAID: 'bg-green-100 text-green-700',
}
