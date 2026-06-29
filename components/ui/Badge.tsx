'use client'
import { cn } from '@/lib/utils'
import { InvoiceStatus, STATUS_COLORS } from '@/types'
import { useI18n } from '@/lib/i18n'

const LABELS_AR: Record<string, string> = { UNPAID: 'غير مدفوعة', PARTIAL: 'مدفوعة جزئياً', PAID: 'مدفوعة', CANCELED: 'ملغاة' }
const LABELS_EN: Record<string, string> = { UNPAID: 'Unpaid', PARTIAL: 'Partial', PAID: 'Paid', CANCELED: 'Canceled' }

export function StatusBadge({ status }: { status: InvoiceStatus }) {
  const { lang } = useI18n()
  const labels = lang === 'en' ? LABELS_EN : LABELS_AR
  return (
    <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-semibold', STATUS_COLORS[status])}>
      {labels[status] || status}
    </span>
  )
}
