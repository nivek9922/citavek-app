// Port (interface) del dominio de lealtad. La implementa un Adapter en
// infrastructure/. No conoce Prisma ni ninguna tecnología concreta.

import type { LoyaltyProgramConfig, LoyaltyCardState, RewardTypeValue } from '../loyalty'

/** Programa tal como lo necesita el dominio + nombre del servicio gratis (para mostrar). */
export interface LoyaltyProgramRecord extends LoyaltyProgramConfig {
  freeServiceName: string | null
}

/** Tarjeta de un cliente, con datos de presentación. */
export interface LoyaltyCardRecord extends LoyaltyCardState {
  customerName: string
  lastVisitAt:  Date | null
}

/** Config normalizada para persistir (campos irrelevantes ya en null). */
export interface UpsertLoyaltyProgramData {
  isActive:       boolean
  requiredVisits: number
  rewardType:     RewardTypeValue
  discountPct:    number | null
  discountAmount: number | null
  freeServiceId:  string | null
}

/** Estado completo de la tarjeta a persistir tras aplicar una visita. */
export interface SaveCardData {
  customerName:    string
  completedVisits: number
  totalVisits:     number
  rewardsEarned:   number
  rewardPending:   boolean
  lastVisitAt:     Date
}

export interface ConsumeRewardInput {
  organizationId: string
  customerPhone:  string
  rewardType:     RewardTypeValue
  discountCop:    number
  appointmentId?: string | null
}

export interface RecordVisitInput {
  organizationId: string
  customerPhone:  string
  customerName:   string
  requiredVisits: number
}

/** Estadísticas para el panel del owner (todo agregado en la BD). */
export interface LoyaltyOwnerStats {
  totalCards:        number
  redeemedThisMonth: number
  oneVisitAway:      number
  retentionRate:     number // 0-100 (% de clientes con 3+ visitas)
}

export interface LoyaltyRepository {
  getProgram(organizationId: string): Promise<LoyaltyProgramRecord | null>
  upsertProgram(organizationId: string, data: UpsertLoyaltyProgramData): Promise<void>

  getCard(organizationId: string, customerPhone: string): Promise<LoyaltyCardRecord | null>
  saveCard(organizationId: string, customerPhone: string, data: SaveCardData): Promise<void>

  /** Registra una visita completada de forma atómica: upsert con increment + actualización
   *  condicional de rewardPending dentro de una transacción. Evita la race condition del
   *  patrón read-compute-write cuando dos citas del mismo cliente completan en paralelo. */
  recordVisit(input: RecordVisitInput): Promise<void>

  /** Marca la recompensa como usada (solo si está pendiente) y registra el canje en
   *  una transacción. Retorna true si efectivamente se canjeó. */
  consumeReward(input: ConsumeRewardInput): Promise<boolean>

  getOwnerStats(organizationId: string, monthStart: Date): Promise<LoyaltyOwnerStats>

  /** Valida que un servicio pertenezca al tenant y esté activo (para FREE_SERVICE). */
  isActiveService(organizationId: string, serviceId: string): Promise<boolean>
}
