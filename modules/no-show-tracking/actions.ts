'use server'
import { updateTag } from 'next/cache'
import { z } from 'zod'
import { getTenantContext } from '@/server/tenant'
import { requirePermission } from '@/server/auth-guards'
import log from '@/server/logger'
import { prismaNoShowRepository as repo } from './infrastructure/prisma-no-show-repository'
import { upsertNoShowPolicy } from './application/upsert-no-show-policy'
import { forgiveStrike } from './application/forgive-strike'
import type { StrikeRecord } from './domain/no-show'

// ── Configurar política (owner) ───────────────────────────────────────────────

const policySchema = z.object({
  isActive: z.boolean(),
  strikeThreshold: z.number().int().min(1).max(10),
})

export type UpsertNoShowPolicyInput = z.infer<typeof policySchema>

export async function upsertNoShowPolicyAction(
  slug: string,
  input: UpsertNoShowPolicyInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await getTenantContext(slug)
  await requirePermission(ctx.id, 'settings:update')
  try {
    const parsed = policySchema.parse(input)
    const result = await upsertNoShowPolicy(repo, { organizationId: ctx.id, ...parsed })
    if (result.ok) {
      updateTag(`no-show-policy:${ctx.id}`)
      updateTag(`no-show-risk:${ctx.id}`)
      updateTag(`no-show-stats:${ctx.id}`)
    }
    return result
  } catch (err) {
    log.error('upsertNoShowPolicyAction', { err: String(err) })
    return { ok: false, error: 'No se pudo guardar la política de no-shows.' }
  }
}

// ── Perdonar un strike puntual (owner) ───────────────────────────────────────

const forgiveSchema = z.object({
  strikeId: z.string().min(1),
  note: z.string().max(500).nullable(),
})

export async function forgiveStrikeAction(
  slug: string,
  input: z.infer<typeof forgiveSchema>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await getTenantContext(slug)
  await requirePermission(ctx.id, 'appointment:update')
  try {
    const parsed = forgiveSchema.parse(input)
    await forgiveStrike(repo, ctx.id, parsed.strikeId, parsed.note)
    updateTag(`no-show-risk:${ctx.id}`)
    updateTag(`no-show-stats:${ctx.id}`)
    return { ok: true }
  } catch (err) {
    log.error('forgiveStrikeAction', { err: String(err) })
    return { ok: false, error: 'No se pudo perdonar el strike.' }
  }
}

// ── Strikes de un cliente (owner, para el sheet de detalle) ──────────────────

const customerStrikesSchema = z.object({
  customerPhone: z.string().min(1),
})

export async function getCustomerStrikesAction(
  slug: string,
  customerPhone: string,
): Promise<StrikeRecord[]> {
  const ctx = await getTenantContext(slug)
  await requirePermission(ctx.id, 'appointment:update')
  try {
    customerStrikesSchema.parse({ customerPhone })
    return await repo.getStrikes(ctx.id, customerPhone)
  } catch (err) {
    log.error('getCustomerStrikesAction', { err: String(err) })
    return []
  }
}
