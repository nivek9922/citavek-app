// Dominio del programa de lealtad — funciones puras, sin deps de framework ni DB.
// formatCop usa solo Intl.NumberFormat (JS nativo) — excepción aceptable en dominio.
import { formatCop } from '@/shared/format'

export type RewardTypeValue = 'FREE_NEXT_VISIT' | 'DISCOUNT_PCT' | 'DISCOUNT_AMOUNT' | 'FREE_SERVICE'

/** Configuración del programa (1:1 con Organization). */
export interface LoyaltyProgramConfig {
  isActive:       boolean
  requiredVisits: number
  rewardType:     RewardTypeValue
  discountPct:    number | null
  discountAmount: number | null
  freeServiceId:  string | null
}

/** Estado mínimo de la tarjeta de un cliente para calcular progreso. */
export interface LoyaltyCardState {
  completedVisits: number
  totalVisits:     number
  rewardsEarned:   number
  rewardPending:   boolean
}

/** Lo que necesita la UI del booking para mostrar el progreso. */
export interface LoyaltyProgress {
  completedVisits:   number
  requiredVisits:    number
  remaining:         number
  percentage:        number // 0-100 para la barra
  rewardPending:     boolean
  rewardDescription: string
  isNearReward:      boolean // falta exactamente 1 visita
}

/** Línea de servicio mínima para calcular el descuento de la recompensa. */
export interface RewardLine {
  serviceId: string
  priceCop:  number
}

export class LoyaltyInactiveError extends Error {
  constructor() {
    super('El programa de fidelidad no está activo.')
    this.name = 'LoyaltyInactiveError'
  }
}

/** Texto legible de la recompensa (para el badge y el panel del owner). */
export function describeReward(program: LoyaltyProgramConfig, freeServiceName?: string | null): string {
  switch (program.rewardType) {
    case 'FREE_NEXT_VISIT':
      return 'Próxima cita gratis'
    case 'DISCOUNT_PCT':
      return `${program.discountPct ?? 0}% de descuento`
    case 'DISCOUNT_AMOUNT':
      return `${formatCop(program.discountAmount ?? 0)} de descuento`
    case 'FREE_SERVICE':
      return freeServiceName ? `${freeServiceName} gratis` : 'Un servicio gratis'
  }
}

/**
 * Progreso del cliente dentro del programa. `requiredVisits` se acota a >= 1 para
 * evitar divisiones por cero. `isNearReward` es true solo cuando falta exactamente
 * una visita (mensaje de urgencia distinto al progreso normal).
 */
export function computeProgress(
  card: LoyaltyCardState,
  program: LoyaltyProgramConfig,
  freeServiceName?: string | null,
): LoyaltyProgress {
  const requiredVisits  = Math.max(1, program.requiredVisits)
  const completedVisits = Math.max(0, card.completedVisits)
  const remaining       = Math.max(0, requiredVisits - completedVisits)
  const percentage      = Math.min(100, Math.round((completedVisits / requiredVisits) * 100))

  return {
    completedVisits,
    requiredVisits,
    remaining,
    percentage,
    rewardPending:     card.rewardPending,
    rewardDescription: describeReward(program, freeServiceName),
    isNearReward:      remaining === 1,
  }
}

/**
 * Descuento en COP que aplica la recompensa pendiente sobre las líneas de la cita.
 * Siempre acotado a [0, total]. FREE_SERVICE solo descuenta si el servicio premiado
 * está en el carrito (si no, retorna 0 → la recompensa NO se consume).
 */
export function computeRewardDiscount(program: LoyaltyProgramConfig, lines: RewardLine[]): number {
  const total = lines.reduce((sum, l) => sum + l.priceCop, 0)
  if (total <= 0) return 0

  let discount = 0
  switch (program.rewardType) {
    case 'FREE_NEXT_VISIT':
      discount = total
      break
    case 'DISCOUNT_PCT':
      discount = Math.floor((total * (program.discountPct ?? 0)) / 100)
      break
    case 'DISCOUNT_AMOUNT':
      discount = program.discountAmount ?? 0
      break
    case 'FREE_SERVICE': {
      const line = lines.find((l) => l.serviceId === program.freeServiceId)
      discount = line ? line.priceCop : 0
      break
    }
  }

  return Math.max(0, Math.min(discount, total))
}

/**
 * Aplica una visita completada al estado de la tarjeta. Si alcanza el umbral y no
 * hay ya una recompensa pendiente: marca `rewardPending`, resetea `completedVisits`
 * y suma a `rewardsEarned`. Función pura — el repo persiste el resultado.
 */
export function applyCompletedVisit(
  card: LoyaltyCardState,
  program: LoyaltyProgramConfig,
): LoyaltyCardState {
  const requiredVisits  = Math.max(1, program.requiredVisits)
  const completedVisits = card.completedVisits + 1
  const totalVisits     = card.totalVisits + 1

  if (completedVisits >= requiredVisits && !card.rewardPending) {
    return {
      completedVisits: 0,
      totalVisits,
      rewardsEarned:   card.rewardsEarned + 1,
      rewardPending:   true,
    }
  }

  return { ...card, completedVisits, totalVisits }
}
