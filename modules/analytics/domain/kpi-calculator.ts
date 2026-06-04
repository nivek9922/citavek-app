// Tipos de datos que llegan desde el DAL (queries.ts).
// Sin dependencias de Prisma ni de Next.js — función pura y testeable.

export interface AppointmentSummary {
  status:   string
  priceCop: number
  barberId: string
}

export interface BarberSummary {
  id:          string
  displayName: string
  nickname:    string | null
}

export interface KPIResult {
  earningsToday: number  // COP, solo citas completadas hoy
  pendingToday:  number  // citas confirmadas pendientes hoy
  cutsToday:     number  // citas completadas hoy
  earningsWeek:  number  // COP, citas completadas esta semana
  topBarber:     BarberSummary | null  // barbero con más citas hoy
}

/**
 * Calcula los KPIs del dashboard a partir de datos crudos de la DB.
 * Función pura: sin efectos secundarios ni llamadas a Prisma.
 */
export function computeKPIs(
  todayApts: AppointmentSummary[],
  weekApts:  { priceCop: number }[],
  barbers:   BarberSummary[],
): KPIResult {
  const completed    = todayApts.filter((a) => a.status === 'completed')
  const earningsToday = completed.reduce((s, a) => s + a.priceCop, 0)
  const cutsToday     = completed.length
  const pendingToday  = todayApts.filter((a) => a.status === 'confirmed').length
  const earningsWeek  = weekApts.reduce((s, a) => s + a.priceCop, 0)

  // Barbero con mayor número de citas hoy (cualquier estado no cancelado)
  const countByBarber: Record<string, number> = {}
  for (const a of todayApts) {
    countByBarber[a.barberId] = (countByBarber[a.barberId] ?? 0) + 1
  }
  const topBarberId = Object.entries(countByBarber).sort((a, b) => b[1] - a[1])[0]?.[0]
  const topBarber   = barbers.find((b) => b.id === topBarberId) ?? null

  return { earningsToday, pendingToday, cutsToday, earningsWeek, topBarber }
}
