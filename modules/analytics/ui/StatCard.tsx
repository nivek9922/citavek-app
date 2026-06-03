import { cn } from '@/shared/ui/utils'
import type { LucideIcon } from 'lucide-react'

interface Props {
  icon:      LucideIcon
  label:     string
  value:     string
  hint?:     string
  highlight?: boolean
}

export function StatCard({ icon: Icon, label, value, hint, highlight }: Props) {
  return (
    <div className={cn(
      'rounded-2xl border p-4 transition-smooth',
      highlight
        ? 'border-primary/30 bg-primary/5 shadow-elegant'
        : 'border-border bg-card',
    )}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        <div className={cn(
          'flex h-8 w-8 items-center justify-center rounded-xl',
          highlight ? 'bg-gradient-primary' : 'bg-accent',
        )}>
          <Icon className={cn('h-4 w-4', highlight ? 'text-primary-foreground' : 'text-muted-foreground')} />
        </div>
      </div>
      <p className={cn(
        'mt-2 text-2xl font-bold',
        highlight && 'text-primary',
      )}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}
