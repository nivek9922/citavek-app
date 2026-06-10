// Dominio puro — sin dependencias de framework ni DB.

/** Umbrales del score (citas creadas − canceladas en la ventana de 7 días). */
export const ONBOARDING_DAYS   = 14
export const HEALTH_GREEN_MIN  = 5
export const HEALTH_YELLOW_MIN = 1

export type HealthLevel = 'green' | 'yellow' | 'red' | 'onboarding'

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
 * Excepción: negocios con ≤14 días de antigüedad y score 0 → 'onboarding'
 * para evitar el falso negativo de marcar cuentas nuevas "en riesgo".
 */
export function computeHealthScore(
  created:   number,
  cancelled: number,
  ageInDays: number,
): OrgHealth {
  const score = created - cancelled
  if (ageInDays <= ONBOARDING_DAYS && score === 0) {
    return { created, cancelled, score, level: 'onboarding' }
  }
  const level: HealthLevel =
    score >= HEALTH_GREEN_MIN  ? 'green'  :
    score >= HEALTH_YELLOW_MIN ? 'yellow' :
    'red'
  return { created, cancelled, score, level }
}
