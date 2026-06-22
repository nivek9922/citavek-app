'use server'
import { updateTag } from 'next/cache'
import { z } from 'zod'
import { getTenantContext } from '@/server/tenant'
import { requirePermission } from '@/server/auth-guards'
import log from '@/server/logger'
import { computeSettlementPeriod } from './domain/commission'
import { prismaCommissionsRepository as repo } from './infrastructure/prisma-commissions-repository'
import { upsertBarberCommission } from './application/upsert-barber-commission'
import { getBarberEarnings, type BarberEarnings } from './application/get-barber-earnings'
import { createSettlement } from './application/create-settlement'

// ── Configuración de comisión por barbero ─────────────────────────────────────

const upsertSchema = z.object({
  barberId:       z.string().min(1),
  commissionType: z.enum(['PERCENTAGE', 'FIXED_PER_SERVICE']),
  percentage:     z.number().int().min(1).max(100).nullable(),
  fixedAmount:    z.number().int().positive().nullable(),
})

export type UpsertBarberCommissionInput = z.infer<typeof upsertSchema>

export async function upsertBarberCommissionAction(
  slug: string,
  input: UpsertBarberCommissionInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await getTenantContext(slug)
  await requirePermission(ctx.id, 'commission:configure')

  try {
    const parsed = upsertSchema.parse(input)
    const result = await upsertBarberCommission(repo, { organizationId: ctx.id, ...parsed })
    if (result.ok) updateTag(`commissions-config:${ctx.id}`)
    return result
  } catch (err) {
    log.error('upsertBarberCommissionAction', { err: String(err) })
    return { ok: false, error: 'No se pudo guardar la comisión del barbero.' }
  }
}

// ── Liquidaciones (owner) ──────────────────────────────────────────────────────

const periodSchema = z.object({
  barberId: z.string().min(1),
  kind:     z.enum(['week', 'month', 'custom']),
  startStr: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endStr:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

export type PreviewSettlementInput = z.infer<typeof periodSchema>

export type PreviewSettlementData = BarberEarnings & {
  periodStart: Date
  periodEnd:   Date
}

/** Calcula (sin persistir) el facturado/comisión de un barbero en un período. Owner-only. */
export async function previewSettlementAction(
  slug: string,
  input: PreviewSettlementInput,
): Promise<{ ok: true; data: PreviewSettlementData } | { ok: false; error: string }> {
  const ctx = await getTenantContext(slug)
  await requirePermission(ctx.id, 'commission:read:all')

  try {
    const parsed         = periodSchema.parse(input)
    const { start, end } = computeSettlementPeriod(parsed.kind, ctx.timezone, parsed.startStr, parsed.endStr)
    const data           = await getBarberEarnings(repo, { organizationId: ctx.id, barberId: parsed.barberId, start, end })
    return { ok: true, data: { ...data, periodStart: start, periodEnd: end } }
  } catch (err) {
    log.error('previewSettlementAction', { err: String(err) })
    return { ok: false, error: 'No se pudo calcular la liquidación.' }
  }
}

const settleSchema = periodSchema.extend({
  paid:  z.boolean(),
  notes: z.string().max(200).nullable(),
})

export type CreateSettlementInput = z.infer<typeof settleSchema>

export async function createSettlementAction(
  slug: string,
  input: CreateSettlementInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await getTenantContext(slug)
  await requirePermission(ctx.id, 'commission:settle')

  try {
    const parsed         = settleSchema.parse(input)
    const { start, end } = computeSettlementPeriod(parsed.kind, ctx.timezone, parsed.startStr, parsed.endStr)
    const result = await createSettlement(repo, {
      organizationId: ctx.id,
      barberId:       parsed.barberId,
      start,
      end,
      paid:           parsed.paid,
      notes:          parsed.notes,
    })
    if (result.ok) updateTag(`settlements:${ctx.id}`)
    return result.ok ? { ok: true } : result
  } catch (err) {
    log.error('createSettlementAction', { err: String(err) })
    return { ok: false, error: 'No se pudo registrar la liquidación.' }
  }
}
