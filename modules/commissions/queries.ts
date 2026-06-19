import 'server-only'
import { cacheTag, cacheLife } from 'next/cache'
import { localDayBoundsUTC, currentWeekBoundsUTC, tenantToday } from '@/modules/analytics/domain/date-utils'
import { computeSettlementPeriod } from './domain/commission'
import { prismaCommissionsRepository as repo } from './infrastructure/prisma-commissions-repository'
import { getDailyClosing as computeDailyClosing, type DailyClosing } from './application/get-daily-closing'
import { getBarberEarnings as computeBarberEarnings, type BarberEarnings } from './application/get-barber-earnings'
import { getSettlementHistory as fetchSettlementHistory } from './application/get-settlement-history'
import type { BarberCommissionRecord, SettlementRecord } from './domain/ports/commissions-repository'

/** Config de comisión de todos los barberos activos. Tag commissions-config:${orgId}. */
export async function getCommissionConfigs(organizationId: string): Promise<BarberCommissionRecord[]> {
  'use cache'
  cacheTag(`commissions-config:${organizationId}`)
  cacheLife('max')
  return repo.listConfigs(organizationId)
}

/**
 * Cierre de caja de un día. Live (sin 'use cache'), igual que la agenda: ya se
 * refresca al completar citas (revalidatePath en scheduling). dateStr = 'yyyy-MM-dd'.
 */
export async function getDailyClosingForDate(
  organizationId: string,
  timezone: string,
  dateStr: string,
): Promise<DailyClosing> {
  const { start, end } = localDayBoundsUTC(dateStr, timezone)
  return computeDailyClosing(repo, { organizationId, start, end })
}

export interface BarberEarningsSummary {
  today: BarberEarnings
  week:  BarberEarnings
  month: BarberEarnings
}

/** Ganancias del barbero (hoy / semana / mes). Live. El `barberId` debe venir resuelto server-side. */
export async function getBarberEarningsSummary(
  organizationId: string,
  timezone: string,
  barberId: string,
): Promise<BarberEarningsSummary> {
  const day   = localDayBoundsUTC(tenantToday(timezone), timezone)
  const week  = currentWeekBoundsUTC(timezone)
  const month = computeSettlementPeriod('month', timezone)

  const [today, weekEarnings, monthEarnings] = await Promise.all([
    computeBarberEarnings(repo, { organizationId, barberId, start: day.start, end: day.end }),
    computeBarberEarnings(repo, { organizationId, barberId, start: week.weekStart, end: week.weekEnd }),
    computeBarberEarnings(repo, { organizationId, barberId, start: month.start, end: month.end }),
  ])
  return { today, week: weekEarnings, month: monthEarnings }
}

/** Historial de liquidaciones (opcionalmente de un barbero). Tag settlements:${orgId}. */
export async function getSettlementHistory(
  organizationId: string,
  barberId?: string,
): Promise<SettlementRecord[]> {
  'use cache'
  cacheTag(`settlements:${organizationId}`)
  cacheLife('minutes')
  return fetchSettlementHistory(repo, organizationId, barberId)
}
