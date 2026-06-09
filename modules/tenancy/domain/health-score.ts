// Dominio puro — sin dependencias de framework ni DB.

/** Umbrales del score (citas creadas − canceladas en la ventana de 7 días). */
export const HEALTH_GREEN_MIN  = 5
export const HEALTH_YELLOW_MIN = 1

export type HealthLevel = 'green' | 'yellow' | 'red'

export interface OrgHealth {
  created:   number
  cancelled: number
  score:     number
  level:     HealthLevel
}

/**
 * Salud del tenant: score = creadas − canceladas (últimos 7 días).
 * ≥5 verde (uso real), 1–4 amarillo (actividad marginal),
 * ≤0 rojo (sin actividad neta o más cancelaciones que altas).
 */
export function computeHealthScore(created: number, cancelled: number): OrgHealth {
  const score = created - cancelled
  const level: HealthLevel =
    score >= HEALTH_GREEN_MIN  ? 'green'  :
    score >= HEALTH_YELLOW_MIN ? 'yellow' :
    'red'
  return { created, cancelled, score, level }
}
