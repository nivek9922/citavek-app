import { Badge } from '@/shared/ui/badge'
import { PLAN_LABELS } from '@/shared/constants/billing'
import type { PlanType, SubscriptionStatus } from '@/modules/subscriptions/domain/subscription'

const STATUS_STYLE: Record<SubscriptionStatus, { label: string; cls: string }> = {
  trial:     { label: 'Trial',      cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  active:    { label: 'Activo',     cls: 'bg-green-500/10 text-green-400 border-green-500/20' },
  grace:     { label: 'Gracia',     cls: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  suspended: { label: 'Suspendido', cls: 'bg-destructive/10 text-destructive border-destructive/20' },
  cancelled: { label: 'Cancelado',  cls: 'bg-muted text-muted-foreground border-border' },
}

export function SubscriptionStatusBadge({ status, className = '' }: { status: SubscriptionStatus; className?: string }) {
  const s = STATUS_STYLE[status]
  return (
    <Badge variant="outline" className={`text-[10px] font-medium px-2 py-0 ${s.cls} ${className}`}>
      {s.label}
    </Badge>
  )
}

export function PlanBadge({ plan, className = '' }: { plan: PlanType; className?: string }) {
  return (
    <Badge variant="outline" className={`text-[10px] font-medium px-2 py-0 ${className}`}>
      {PLAN_LABELS[plan]}
    </Badge>
  )
}
