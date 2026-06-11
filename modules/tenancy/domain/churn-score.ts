// Dominio puro — sin dependencias de framework ni DB.

export type ChurnTrend = 'growing' | 'stable' | 'declining' | 'dormant'

export interface ChurnResult {
  score: number
  trend: ChurnTrend
}

/**
 * Score de riesgo de churn (0-100) basado en velocidad de reservas en 3 ventanas.
 * 0-19  → growing  : velocity 7d ≥ promedio diario 30d (acelerando o estable-alto)
 * 20-59 → stable   : actividad presente en 7d pero por debajo del promedio 30d
 * 60-89 → declining: sin actividad en 7d pero sí en 30d (desaceleración clara)
 * 90-100→ dormant  : sin actividad en 30d pero sí hubo en 90d (ex-cliente activo)
 *
 * Si last90 = 0 → cuenta nueva sin historial, se retorna score 0 / growing.
 */
export function computeChurnScore(
  last7:  number,
  last30: number,
  last90: number,
): ChurnResult {
  // Sin historial: negocio nuevo o sin datos — no marcar como en riesgo.
  if (last90 === 0) return { score: 0, trend: 'growing' }

  // Dormido: tenía actividad en 90d pero desapareció en los últimos 30d.
  if (last30 === 0) return { score: 95, trend: 'dormant' }

  // Sin actividad esta semana pero sí este mes → declinando.
  if (last7 === 0) return { score: 70, trend: 'declining' }

  // Comparar velocity: promedio diario 7d vs promedio diario 30d.
  const velocity7d  = last7  / 7
  const velocity30d = last30 / 30

  if (velocity7d >= velocity30d * 0.8) return { score: 5,  trend: 'growing'  }
  if (velocity7d >= velocity30d * 0.4) return { score: 35, trend: 'stable'   }
  return { score: 65, trend: 'declining' }
}
