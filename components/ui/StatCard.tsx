import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string
  icon: LucideIcon
  color: 'blue' | 'green' | 'red' | 'yellow'
  subtitle?: string
}

const colorMap = {
  blue:   { bg: 'bg-blue-50',   icon: 'bg-blue-500',   text: 'text-blue-600' },
  green:  { bg: 'bg-green-50',  icon: 'bg-green-500',  text: 'text-green-600' },
  red:    { bg: 'bg-red-50',    icon: 'bg-red-500',    text: 'text-red-600' },
  yellow: { bg: 'bg-yellow-50', icon: 'bg-yellow-500', text: 'text-yellow-600' },
}

export default function StatCard({ title, value, icon: Icon, color, subtitle }: StatCardProps) {
  const c = colorMap[color]
  return (
    <div className="card flex items-center gap-4">
      <div className={cn('rounded-2xl p-3', c.bg)}>
        <div className={cn('rounded-xl p-2.5', c.icon)}>
          <Icon size={22} className="text-white" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-500 font-medium">{title}</p>
        <p className={cn('text-2xl font-bold mt-0.5', c.text)}>{value}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  )
}
