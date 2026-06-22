import 'server-only'
import { db } from '@/server/db'
import type { CommissionConfig } from '../domain/commission'
import type {
  CommissionsRepository,
  BarberCommissionRecord,
  UpsertCommissionData,
  BarberAggregate,
  BarberBasic,
  CreateSettlementData,
  SettlementRecord,
} from '../domain/ports/commissions-repository'

// Mapea el registro Prisma de comisión a la config pura del dominio.
function toConfig(c: { commissionType: 'PERCENTAGE' | 'FIXED_PER_SERVICE'; percentage: number | null; fixedAmount: number | null } | null): CommissionConfig | null {
  if (!c) return null
  return { commissionType: c.commissionType, percentage: c.percentage, fixedAmount: c.fixedAmount }
}

export const prismaCommissionsRepository: CommissionsRepository = {
  async getConfig(organizationId, barberId): Promise<BarberCommissionRecord | null> {
    const b = await db.barber.findFirst({
      where:  { id: barberId, organizationId },
      select: {
        id: true, displayName: true, nickname: true,
        commission: { select: { commissionType: true, percentage: true, fixedAmount: true } },
      },
    })
    if (!b) return null
    return { barberId: b.id, displayName: b.displayName, nickname: b.nickname, config: toConfig(b.commission) }
  },

  async listConfigs(organizationId): Promise<BarberCommissionRecord[]> {
    const barbers = await db.barber.findMany({
      where:   { organizationId, active: true },
      orderBy: [{ sortOrder: 'asc' }, { displayName: 'asc' }],
      select:  {
        id: true, displayName: true, nickname: true,
        commission: { select: { commissionType: true, percentage: true, fixedAmount: true } },
      },
    })
    return barbers.map((b) => ({
      barberId: b.id, displayName: b.displayName, nickname: b.nickname, config: toConfig(b.commission),
    }))
  },

  async upsertConfig(organizationId, barberId, data: UpsertCommissionData): Promise<boolean> {
    // Aislamiento multi-tenant: el barbero debe pertenecer a la org antes de escribir.
    const barber = await db.barber.findFirst({ where: { id: barberId, organizationId }, select: { id: true } })
    if (!barber) return false

    await db.barberCommission.upsert({
      where:  { barberId },
      create: { barberId, organizationId, ...data },
      update: data,
    })
    return true
  },

  async getAggregates(organizationId, start, end, barberId): Promise<BarberAggregate[]> {
    const bid = barberId ?? null

    // (a) count + facturado por barbero — agregado en la BD (sin iterar citas en JS).
    const grouped = await db.appointment.groupBy({
      by:     ['barberId'],
      where:  {
        organizationId,
        status:  'completed',
        startAt: { gte: start, lt: end },
        ...(barberId ? { barberId } : {}),
      },
      _count: { _all: true },
      _sum:   { priceCop: true },
    })

    // (b) nº de servicios por barbero — groupBy de Prisma no puede agrupar
    //     appointment_service por a."barberId", así que se usa SQL crudo.
    const serviceRows = await db.$queryRaw<Array<{ barberId: string; serviceCount: number }>>`
      SELECT a."barberId" AS "barberId", COUNT(*)::int AS "serviceCount"
      FROM appointment_service asv
      JOIN appointment a ON a.id = asv."appointmentId"
      WHERE a."organizationId" = ${organizationId}
        AND a.status = 'completed'
        AND a."startAt" >= ${start}
        AND a."startAt" <  ${end}
        AND (${bid}::text IS NULL OR a."barberId" = ${bid})
      GROUP BY a."barberId"
    `
    const serviceCountByBarber = new Map(serviceRows.map((r) => [r.barberId, Number(r.serviceCount)]))

    return grouped.map((g) => ({
      barberId:         g.barberId,
      appointmentCount: g._count._all,
      grossRevenueCop:  g._sum.priceCop ?? 0,
      serviceCount:     serviceCountByBarber.get(g.barberId) ?? 0,
    }))
  },

  async listActiveBarbers(organizationId): Promise<BarberBasic[]> {
    return db.barber.findMany({
      where:   { organizationId, active: true },
      orderBy: [{ sortOrder: 'asc' }, { displayName: 'asc' }],
      select:  { id: true, displayName: true, nickname: true },
    })
  },

  async createSettlement(organizationId, data: CreateSettlementData): Promise<boolean> {
    const barber = await db.barber.findFirst({ where: { id: data.barberId, organizationId }, select: { id: true } })
    if (!barber) return false

    await db.commissionSettlement.create({
      data: {
        organizationId,
        barberId:         data.barberId,
        periodStart:      data.periodStart,
        periodEnd:        data.periodEnd,
        grossRevenueCop:  data.grossRevenueCop,
        commissionCop:    data.commissionCop,
        appointmentCount: data.appointmentCount,
        paid:             data.paid,
        paidAt:           data.paidAt,
        notes:            data.notes,
      },
    })
    return true
  },

  async listSettlements(organizationId, barberId): Promise<SettlementRecord[]> {
    const rows = await db.commissionSettlement.findMany({
      where:   { organizationId, ...(barberId ? { barberId } : {}) },
      orderBy: { createdAt: 'desc' },
      take:    100,
      select:  {
        id: true, barberId: true, periodStart: true, periodEnd: true,
        grossRevenueCop: true, commissionCop: true, appointmentCount: true,
        paid: true, paidAt: true, notes: true, createdAt: true,
        barber: { select: { displayName: true, nickname: true } },
      },
    })
    return rows.map((r) => ({
      id:               r.id,
      barberId:         r.barberId,
      barberName:       r.barber.nickname ?? r.barber.displayName,
      periodStart:      r.periodStart,
      periodEnd:        r.periodEnd,
      grossRevenueCop:  r.grossRevenueCop,
      commissionCop:    r.commissionCop,
      appointmentCount: r.appointmentCount,
      paid:             r.paid,
      paidAt:           r.paidAt,
      notes:            r.notes,
      createdAt:        r.createdAt,
    }))
  },

  async findOverlappingSettlement(organizationId, barberId, periodStart, periodEnd): Promise<SettlementRecord | null> {
    const row = await db.commissionSettlement.findFirst({
      where: {
        organizationId,
        barberId,
        periodStart: { lt: periodEnd },
        periodEnd:   { gt: periodStart },
      },
      orderBy: { createdAt: 'desc' },
      select:  {
        id: true, barberId: true, periodStart: true, periodEnd: true,
        grossRevenueCop: true, commissionCop: true, appointmentCount: true,
        paid: true, paidAt: true, notes: true, createdAt: true,
        barber: { select: { displayName: true, nickname: true } },
      },
    })
    if (!row) return null
    return {
      id:               row.id,
      barberId:         row.barberId,
      barberName:       row.barber.nickname ?? row.barber.displayName,
      periodStart:      row.periodStart,
      periodEnd:        row.periodEnd,
      grossRevenueCop:  row.grossRevenueCop,
      commissionCop:    row.commissionCop,
      appointmentCount: row.appointmentCount,
      paid:             row.paid,
      paidAt:           row.paidAt,
      notes:            row.notes,
      createdAt:        row.createdAt,
    }
  },
}
