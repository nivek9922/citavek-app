import 'server-only'
import { db } from '@/server/db'
import type {
  LoyaltyRepository,
  LoyaltyProgramRecord,
  LoyaltyCardRecord,
  UpsertLoyaltyProgramData,
  SaveCardData,
  RecordVisitInput,
  ConsumeRewardInput,
  LoyaltyOwnerStats,
} from '../domain/ports/loyalty-repository'

export const prismaLoyaltyRepository: LoyaltyRepository = {
  async getProgram(organizationId): Promise<LoyaltyProgramRecord | null> {
    const p = await db.loyaltyProgram.findUnique({
      where:  { organizationId },
      select: {
        isActive:       true,
        requiredVisits: true,
        rewardType:     true,
        discountPct:    true,
        discountAmount: true,
        freeServiceId:  true,
        freeService:    { select: { name: true } },
      },
    })
    if (!p) return null
    return {
      isActive:        p.isActive,
      requiredVisits:  p.requiredVisits,
      rewardType:      p.rewardType,
      discountPct:     p.discountPct,
      discountAmount:  p.discountAmount,
      freeServiceId:   p.freeServiceId,
      freeServiceName: p.freeService?.name ?? null,
    }
  },

  async upsertProgram(organizationId, data: UpsertLoyaltyProgramData) {
    await db.loyaltyProgram.upsert({
      where:  { organizationId },
      create: { organizationId, ...data },
      update: data,
    })
  },

  async getCard(organizationId, customerPhone): Promise<LoyaltyCardRecord | null> {
    const c = await db.loyaltyCard.findUnique({
      where:  { organizationId_customerPhone: { organizationId, customerPhone } },
      select: {
        customerName:    true,
        completedVisits: true,
        totalVisits:     true,
        rewardsEarned:   true,
        rewardPending:   true,
        lastVisitAt:     true,
      },
    })
    return c
  },

  async saveCard(organizationId, customerPhone, data: SaveCardData) {
    await db.loyaltyCard.upsert({
      where:  { organizationId_customerPhone: { organizationId, customerPhone } },
      create: {
        organizationId,
        customerPhone,
        customerName:    data.customerName,
        completedVisits: data.completedVisits,
        totalVisits:     data.totalVisits,
        rewardsEarned:   data.rewardsEarned,
        rewardPending:   data.rewardPending,
        lastVisitAt:     data.lastVisitAt,
      },
      update: {
        customerName:    data.customerName,
        completedVisits: data.completedVisits,
        totalVisits:     data.totalVisits,
        rewardsEarned:   data.rewardsEarned,
        rewardPending:   data.rewardPending,
        lastVisitAt:     data.lastVisitAt,
      },
    })
  },

  async recordVisit({ organizationId, customerPhone, customerName, requiredVisits }: RecordVisitInput) {
    const now      = new Date()
    const required = Math.max(1, requiredVisits)
    await db.$transaction(async (tx) => {
      const card = await tx.loyaltyCard.upsert({
        where:  { organizationId_customerPhone: { organizationId, customerPhone } },
        create: { organizationId, customerPhone, customerName, completedVisits: 1, totalVisits: 1, lastVisitAt: now },
        update: { customerName, completedVisits: { increment: 1 }, totalVisits: { increment: 1 }, lastVisitAt: now },
        select: { completedVisits: true, rewardPending: true },
      })
      if (card.completedVisits >= required && !card.rewardPending) {
        await tx.loyaltyCard.update({
          where: { organizationId_customerPhone: { organizationId, customerPhone } },
          data:  { rewardPending: true, completedVisits: 0, rewardsEarned: { increment: 1 } },
        })
      }
    })
  },

  async consumeReward(input: ConsumeRewardInput): Promise<boolean> {
    return db.$transaction(async (tx) => {
      // Solo canjea si la tarjeta sigue con recompensa pendiente (idempotencia).
      const res = await tx.loyaltyCard.updateMany({
        where: { organizationId: input.organizationId, customerPhone: input.customerPhone, rewardPending: true },
        data:  { rewardPending: false },
      })
      if (res.count === 0) return false

      await tx.loyaltyRedemption.create({
        data: {
          organizationId: input.organizationId,
          customerPhone:  input.customerPhone,
          rewardType:     input.rewardType,
          discountCop:    input.discountCop,
          appointmentId:  input.appointmentId ?? null,
        },
      })
      return true
    })
  },

  async getOwnerStats(organizationId, monthStart): Promise<LoyaltyOwnerStats> {
    const program = await db.loyaltyProgram.findUnique({
      where:  { organizationId },
      select: { requiredVisits: true },
    })
    const requiredVisits = program?.requiredVisits ?? 0

    const [totalCards, redeemedThisMonth, retainedCards, oneVisitAway] = await Promise.all([
      db.loyaltyCard.count({ where: { organizationId } }),
      db.loyaltyRedemption.count({ where: { organizationId, createdAt: { gte: monthStart } } }),
      db.loyaltyCard.count({ where: { organizationId, totalVisits: { gte: 3 } } }),
      requiredVisits > 1
        ? db.loyaltyCard.count({
            where: { organizationId, rewardPending: false, completedVisits: requiredVisits - 1 },
          })
        : Promise.resolve(0),
    ])

    return {
      totalCards,
      redeemedThisMonth,
      oneVisitAway,
      retentionRate: totalCards === 0 ? 0 : Math.round((retainedCards / totalCards) * 100),
    }
  },

  async isActiveService(organizationId, serviceId): Promise<boolean> {
    const svc = await db.service.findFirst({
      where:  { id: serviceId, organizationId, active: true },
      select: { id: true },
    })
    return svc !== null
  },
}
