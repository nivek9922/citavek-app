import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { Building2 } from 'lucide-react'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/shared/ui/table'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { EmptyState } from '@/shared/ui/empty-state'
import { formatCop } from '@/shared/format'
import type { TenantPerformanceRow } from '@/modules/analytics/queries'
import type { ChurnResult, ChurnTrend } from '@/modules/tenancy/domain/churn-score'
import { ClickableRow } from './ClickableRow'

const CHURN_BADGE: Record<ChurnTrend, { label: string; cls: string }> = {
  growing:   { label: 'Creciendo', cls: 'bg-green-500/10 text-green-400 border-green-500/20' },
  stable:    { label: 'Estable',   cls: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  declining: { label: 'Cayendo',   cls: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  dormant:   { label: 'Dormido',   cls: 'bg-destructive/10 text-destructive border-destructive/20' },
}

/**
 * Data Table de rendimiento por tenant (Super Admin). Presentación pura — Server
 * Component. Cada fila es navegable (`ClickableRow`) hacia el drill-down de la
 * barbería. El orden lo decide la página (volumen de citas o churn).
 */
export function TenantsPerformanceTable({
  rows,
  churnByOrg,
}: {
  rows:       TenantPerformanceRow[]
  churnByOrg: Map<string, ChurnResult>
}) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<Building2 />}
        title="Aún no hay negocios"
        description="Cuando se registren barberías en la plataforma aparecerán aquí con su rendimiento."
      />
    )
  }

  return (
    <>
      {/* Móvil: cards (la tabla de 7 columnas es ilegible < 640px) */}
      <div className="space-y-2 sm:hidden">
        {rows.map((row) => {
          const churn = churnByOrg.get(row.id)
          const badge = churn ? CHURN_BADGE[churn.trend] : null
          return (
            <Link
              key={row.id}
              href={`/admin/negocios/${row.id}`}
              className="block rounded-2xl border border-border bg-card p-4 transition-smooth hover:border-primary/40"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium wrap-break-word">{row.name}</p>
                  <span className="text-xs text-muted-foreground">/{row.slug}</span>
                </div>
                {row.status === 'suspended'
                  ? <Badge variant="destructive" className="shrink-0">Suspendida</Badge>
                  : <span className="shrink-0 text-xs text-muted-foreground">
                      {formatDistanceToNow(row.createdAt, { locale: es })}
                    </span>}
              </div>
              <p className="mt-2 text-sm tabular-nums text-muted-foreground">
                {row.appointments30d} citas · {formatCop(row.revenue30dCop)} · {row.barberCount} {row.barberCount === 1 ? 'barbero' : 'barberos'}
              </p>
              <div className="mt-2 flex items-center justify-between">
                {badge
                  ? <Badge variant="outline" className={`text-[10px] font-medium px-2 py-0 ${badge.cls}`}>{badge.label}</Badge>
                  : <span />}
                <span className="text-xs font-medium text-primary">Ver detalle →</span>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Desktop: data table completa */}
      <div className="hidden rounded-2xl border border-border bg-card sm:block">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Negocio</TableHead>
            <TableHead>Antigüedad</TableHead>
            <TableHead className="text-right">Citas (30d)</TableHead>
            <TableHead className="text-right">Facturación (30d)</TableHead>
            <TableHead className="text-right">Equipo</TableHead>
            <TableHead>Churn</TableHead>
            <TableHead className="text-right">Detalle</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const churn = churnByOrg.get(row.id)
            const badge = churn ? CHURN_BADGE[churn.trend] : null
            return (
              <ClickableRow key={row.id} href={`/admin/negocios/${row.id}`}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{row.name}</span>
                    {row.status === 'suspended' && (
                      <Badge variant="destructive">Suspendida</Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">/{row.slug}</span>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDistanceToNow(row.createdAt, { locale: es })}
                </TableCell>
                <TableCell className="text-right tabular-nums">{row.appointments30d}</TableCell>
                <TableCell className="text-right tabular-nums">{formatCop(row.revenue30dCop)}</TableCell>
                <TableCell className="text-right tabular-nums">{row.barberCount}</TableCell>
                <TableCell>
                  {badge && (
                    <Badge variant="outline" className={`text-[10px] font-medium px-2 py-0 ${badge.cls}`}>
                      {badge.label}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/admin/negocios/${row.id}`}>Ver detalle</Link>
                  </Button>
                </TableCell>
              </ClickableRow>
            )
          })}
        </TableBody>
      </Table>
      </div>
    </>
  )
}
