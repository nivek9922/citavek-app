'use server'
import { updateTag } from 'next/cache'
import { headers } from 'next/headers'
import { z } from 'zod'
import { getTenantContext }   from '@/server/tenant'
import { requirePermission }  from '@/server/auth-guards'
import { rateLimit, clientIpFrom } from '@/server/rate-limit'
import log from '@/server/logger'
import { listActiveServices } from '@/modules/catalog/queries'
import { prismaLoyaltyRepository as repo } from './infrastructure/prisma-loyalty-repository'
import { upsertLoyaltyProgram } from './application/upsert-loyalty-program'
import { getLoyaltyStatus, type LoyaltyStatusView } from './application/get-loyalty-status'

// ── Configurar el programa (owner) ───────────────────────────────────────────

const upsertSchema = z.object({
  isActive:       z.boolean(),
  requiredVisits: z.number().int().min(1).max(20),
  rewardType:     z.enum(['FREE_NEXT_VISIT', 'DISCOUNT_PCT', 'DISCOUNT_AMOUNT', 'FREE_SERVICE']),
  discountPct:    z.number().int().min(1).max(100).nullable(),
  discountAmount: z.number().int().positive().nullable(),
  freeServiceId:  z.string().min(1).nullable(),
})

export type UpsertLoyaltyProgramInput = z.infer<typeof upsertSchema>

export async function upsertLoyaltyProgramAction(
  slug: string,
  input: UpsertLoyaltyProgramInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await getTenantContext(slug)
  await requirePermission(ctx.id, 'settings:update')
  try {
    const parsed = upsertSchema.parse(input)
    const result = await upsertLoyaltyProgram(repo, { organizationId: ctx.id, ...parsed })
    if (result.ok) {
      updateTag(`loyalty-program:${ctx.id}`)
      updateTag(`loyalty-stats:${ctx.id}`)
      updateTag(`org-stats:${ctx.id}`)
      updateTag('loyalty-adoption')
    }
    return result
  } catch (err) {
    log.error('upsertLoyaltyProgramAction', { err: String(err) })
    return { ok: false, error: 'No se pudo guardar el programa de fidelidad.' }
  }
}

// ── Estado de lealtad del cliente (público — storefront) ─────────────────────

const statusSchema = z.object({
  phone:      z.string().regex(/^\+\d{7,15}$/),
  serviceIds: z.array(z.string().min(1)).max(20).optional(),
})

/**
 * Lookup público del progreso del cliente para el badge del booking. Resuelve la org
 * del slug (nunca del cliente) y aplica rate-limit por IP para frenar la enumeración
 * de teléfonos. Retorna `null` cuando no hay nada que mostrar.
 */
export async function getLoyaltyStatusAction(
  slug: string,
  input: z.infer<typeof statusSchema>,
): Promise<LoyaltyStatusView | null> {
  const ctx = await getTenantContext(slug)
  try {
    const ip = clientIpFrom(await headers())
    if (!(await rateLimit(`loyalty:${ip}`, 20, 60_000))) return null

    const parsed = statusSchema.parse(input)

    // Precios de los servicios seleccionados (server-side) para estimar el descuento.
    let lines: { serviceId: string; priceCop: number }[] = []
    if (parsed.serviceIds?.length) {
      const services = await listActiveServices(ctx.id)
      const wanted   = new Set(parsed.serviceIds)
      lines = services.filter((s) => wanted.has(s.id)).map((s) => ({ serviceId: s.id, priceCop: s.priceCop }))
    }

    return await getLoyaltyStatus(repo, { organizationId: ctx.id, customerPhone: parsed.phone, lines })
  } catch (err) {
    log.error('getLoyaltyStatusAction', { err: String(err) })
    return null
  }
}
