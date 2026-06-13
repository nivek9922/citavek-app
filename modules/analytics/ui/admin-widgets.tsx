// Widgets de presentación reutilizados por el Super Admin: el dashboard global
// (`app/admin/page.tsx`) y el drill-down por barbería (`/admin/negocios/[id]`)
// comparten exactamente la misma barra de funnel y la misma tarjeta de salud.

/** Barra de progreso etiquetada (count/total + %). */
export function FunnelBar({
  label, count, total, color,
}: {
  label: string
  count: number
  total: number
  color: string
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">{count}/{total} <span className="text-muted-foreground">({pct}%)</span></span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted/50">
        <div
          className={`h-1.5 rounded-full ${color} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

/** Tarjeta de conteo de salud (verde/amarillo/rojo/nuevos). */
export function HealthStat({
  count, label, sub, color, bg, border,
}: {
  count: number
  label: string
  sub: string
  color: string
  bg: string
  border: string
}) {
  return (
    <div className={`rounded-xl border ${border} ${bg} p-4`}>
      <p className={`text-2xl font-bold tabular-nums ${color}`}>{count}</p>
      <p className={`mt-0.5 text-sm font-medium ${color}`}>{label}</p>
      <p className="mt-1 text-xs text-muted-foreground/70">{sub}</p>
    </div>
  )
}
