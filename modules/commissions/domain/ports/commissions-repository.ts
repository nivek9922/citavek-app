// Port (interface) del dominio de comisiones. La implementa un Adapter en
// infrastructure/. No conoce Prisma ni ninguna tecnología concreta.

import type { CommissionTypeValue, CommissionConfig } from '../commission'

/** Configuración de comisión de un barbero + datos de presentación. `config` null = sin configurar. */
export interface BarberCommissionRecord {
  barberId:    string
  displayName: string
  nickname:    string | null
  config:      CommissionConfig | null
}

/** Config normalizada para persistir (campo irrelevante ya en null). */
export interface UpsertCommissionData {
  commissionType: CommissionTypeValue
  percentage:     number | null
  fixedAmount:    number | null
}

/** Agregado de citas `completed` de un barbero en un rango (todo agregado en la BD). */
export interface BarberAggregate {
  barberId:         string
  appointmentCount: number
  grossRevenueCop:  number
  serviceCount:     number
}

/** Barbero básico (el cierre lista todos los activos, incl. los de 0 citas). */
export interface BarberBasic {
  id:          string
  displayName: string
  nickname:    string | null
}

/** Datos para congelar una liquidación en el histórico. */
export interface CreateSettlementData {
  barberId:         string
  periodStart:      Date
  periodEnd:        Date
  grossRevenueCop:  number
  commissionCop:    number
  appointmentCount: number
  paid:             boolean
  paidAt:           Date | null
  notes:            string | null
}

/** Liquidación tal como la lee el histórico, con el nombre del barbero. */
export interface SettlementRecord {
  id:               string
  barberId:         string
  barberName:       string
  periodStart:      Date
  periodEnd:        Date
  grossRevenueCop:  number
  commissionCop:    number
  appointmentCount: number
  paid:             boolean
  paidAt:           Date | null
  notes:            string | null
  createdAt:        Date
}

export interface CommissionsRepository {
  /** Config + datos del barbero. null si el barbero no existe en la org. */
  getConfig(organizationId: string, barberId: string): Promise<BarberCommissionRecord | null>

  /** Config de todos los barberos activos (los sin configurar → config: null). */
  listConfigs(organizationId: string): Promise<BarberCommissionRecord[]>

  /** Upsert por barberId. Valida que el barbero pertenezca a la org;
   *  retorna false si no pertenece (no escribe). */
  upsertConfig(organizationId: string, barberId: string, data: UpsertCommissionData): Promise<boolean>

  /** Agregados de citas `completed` en [start, end). Si `barberId`, filtra a ese barbero. */
  getAggregates(organizationId: string, start: Date, end: Date, barberId?: string): Promise<BarberAggregate[]>

  /** Barberos activos del tenant (para el cierre: incluye los de 0 citas). */
  listActiveBarbers(organizationId: string): Promise<BarberBasic[]>

  /** Crea una liquidación. Valida barbero ∈ org; retorna false si no pertenece. */
  createSettlement(organizationId: string, data: CreateSettlementData): Promise<boolean>

  /** Historial de liquidaciones (desc por createdAt, limitado). Si `barberId`, filtra. */
  listSettlements(organizationId: string, barberId?: string): Promise<SettlementRecord[]>

  /** Primera liquidación cuyo período [periodStart, periodEnd) se solape con el rango dado.
   *  Condición: existente.start < newEnd AND existente.end > newStart. */
  findOverlappingSettlement(
    organizationId: string,
    barberId:       string,
    periodStart:    Date,
    periodEnd:      Date,
  ): Promise<SettlementRecord | null>
}
