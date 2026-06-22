'server-only'
import { db } from '@/server/db'
import type { NoShowRepository, NoShowOwnerStats } from '../domain/ports/no-show-repository'
import type { StrikeRecord } from '../domain/no-show'

const repo: NoShowRepository = {
  async getPolicy(organizationId) {
    const row = await db.noShowPolicy.findUnique({
      where: { organizationId },
      select: { isActive: true, strikeThreshold: true },
    })
    return row
  },

  async upsertPolicy(organizationId, data) {
    await db.noShowPolicy.upsert({
      where: { organizationId },
      create: { organizationId, ...data },
      update: data,
    })
  },

  async recordStrike({ organizationId, customerPhone, customerName, appointmentId }) {
    await db.noShowStrike.upsert({
      where: { appointmentId },
      create: { organizationId, customerPhone, customerName, appointmentId },
      update: {},
    })
  },

  async getStrikes(organizationId, customerPhone) {
    const rows = await db.noShowStrike.findMany({
      where: { organizationId, customerPhone },
      select: { id: true, createdAt: true, forgiven: true, appointmentId: true },
      orderBy: { createdAt: 'desc' },
    })
    return rows as StrikeRecord[]
  },

  async forgiveStrike(organizationId, strikeId, note) {
    await db.noShowStrike.updateMany({
      where: { id: strikeId, organizationId },
      data: { forgiven: true, forgivenAt: new Date(), forgivenNote: note },
    })
  },

  async getAtRiskPhones(organizationId, threshold, since) {
    const groups = await db.noShowStrike.groupBy({
      by: ['customerPhone'],
      where: { organizationId, forgiven: false, createdAt: { gte: since } },
      _count: { id: true },
      having: { id: { _count: { gte: threshold } } },
    })
    return new Set(groups.map((g) => g.customerPhone))
  },

  async getOwnerStats(organizationId, monthStart) {
    const since90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)

    const policy = await db.noShowPolicy.findUnique({
      where: { organizationId },
      select: { strikeThreshold: true },
    })
    const threshold = policy?.strikeThreshold ?? 3

    const [atRiskPhones, noShowsThisMonth, completedThisMonth] = await Promise.all([
      // Clientes actualmente en riesgo (reutiliza la misma lógica groupBy)
      db.noShowStrike.groupBy({
        by: ['customerPhone'],
        where: { organizationId, forgiven: false, createdAt: { gte: since90 } },
        _count: { id: true },
        having: { id: { _count: { gte: threshold } } },
      }),
      db.noShowStrike.count({
        where: { organizationId, createdAt: { gte: monthStart } },
      }),
      db.appointment.count({
        where: {
          organizationId,
          status: { in: ['completed', 'no_show'] },
          startAt: { gte: monthStart },
        },
      }),
    ])

    const noShowRate =
      completedThisMonth > 0
        ? Math.round((noShowsThisMonth / completedThisMonth) * 100)
        : 0

    return {
      atRiskCount: atRiskPhones.length,
      noShowsThisMonth,
      noShowRate,
    } satisfies NoShowOwnerStats
  },
}

export { repo as prismaNoShowRepository }
