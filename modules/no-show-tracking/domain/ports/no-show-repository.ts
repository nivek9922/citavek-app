import type { StrikeRecord } from '../no-show'

export interface NoShowPolicy {
  isActive: boolean
  strikeThreshold: number
}

export interface NoShowOwnerStats {
  atRiskCount: number
  noShowsThisMonth: number
  noShowRate: number
}

export interface NoShowRepository {
  getPolicy(organizationId: string): Promise<NoShowPolicy | null>
  upsertPolicy(organizationId: string, data: NoShowPolicy): Promise<void>
  recordStrike(data: {
    organizationId: string
    customerPhone: string
    customerName: string
    appointmentId: string
  }): Promise<void>
  getStrikes(organizationId: string, customerPhone: string): Promise<StrikeRecord[]>
  forgiveStrike(organizationId: string, strikeId: string, note: string | null): Promise<void>
  getAtRiskPhones(organizationId: string, threshold: number, since: Date): Promise<Set<string>>
  getOwnerStats(organizationId: string, monthStart: Date): Promise<NoShowOwnerStats>
}
