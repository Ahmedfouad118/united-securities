import { Role } from '@/types'

export const PERMISSIONS = {
  // Dashboard
  VIEW_DASHBOARD: ['ADMIN', 'ACCOUNTANT', 'SALES', 'VIEWER'] as Role[],

  // Customers
  VIEW_CUSTOMERS: ['ADMIN', 'ACCOUNTANT', 'SALES', 'VIEWER'] as Role[],
  CREATE_CUSTOMER: ['ADMIN', 'ACCOUNTANT', 'SALES'] as Role[],
  EDIT_CUSTOMER: ['ADMIN', 'ACCOUNTANT'] as Role[],
  DELETE_CUSTOMER: ['ADMIN'] as Role[],
  IMPORT_CUSTOMERS: ['ADMIN', 'ACCOUNTANT'] as Role[],

  // Invoices
  VIEW_INVOICES: ['ADMIN', 'ACCOUNTANT', 'SALES', 'VIEWER'] as Role[],
  CREATE_INVOICE: ['ADMIN', 'ACCOUNTANT', 'SALES'] as Role[],
  EDIT_INVOICE: ['ADMIN', 'ACCOUNTANT'] as Role[],
  DELETE_INVOICE: ['ADMIN'] as Role[],

  // Payments
  VIEW_PAYMENTS: ['ADMIN', 'ACCOUNTANT', 'VIEWER'] as Role[],
  CREATE_PAYMENT: ['ADMIN', 'ACCOUNTANT'] as Role[],

  // Reports
  VIEW_REPORTS: ['ADMIN', 'ACCOUNTANT', 'VIEWER'] as Role[],

  // Users
  MANAGE_USERS: ['ADMIN'] as Role[],
}

export function hasPermission(role: Role, permission: keyof typeof PERMISSIONS): boolean {
  return PERMISSIONS[permission].includes(role)
}
