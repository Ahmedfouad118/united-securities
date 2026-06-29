import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Always use Latin (English) numerals everywhere — even in Arabic UI.
export function formatCurrency(amount: number | string, lang?: string): string {
  const num = Number(amount || 0).toLocaleString('en-US', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  })
  // Symbol after for English, before for Arabic — but digits stay Latin
  return lang === 'en' ? `OMR ${num}` : `${num} ر.ع`
}

export function formatNumber(amount: number | string, decimals = 3): string {
  return Number(amount || 0).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

export function formatDate(date: string | Date, lang?: string): string {
  if (!date) return ''
  // en-GB gives Latin digits dd/mm/yyyy; force Latin numbering for Arabic too
  const locale = lang === 'en' ? 'en-GB' : 'ar-OM-u-nu-latn'
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date))
}

export function generateInvoiceNumber(): string {
  const now = new Date()
  const year = now.getFullYear()
  const random = Math.floor(Math.random() * 9000) + 1000
  return `INV-${year}-${random}`
}
