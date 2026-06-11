'use server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getTenantContext }  from '@/server/tenant'
import { requirePermission } from '@/server/auth-guards'
import { updateCustomerNotes } from './application/update-customer-notes'
import { prismaCustomerRepository as repo } from './infrastructure/prisma-customer-repository'

const notesSchema = z.string().trim().max(500)

export async function updateCustomerNotesAction(
  slug: string,
  customerId: string,
  notes: string,
): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getTenantContext(slug)
  await requirePermission(ctx.id, 'customer:update')
  try {
    const value = notesSchema.parse(notes)
    await updateCustomerNotes(repo, customerId, ctx.id, value)
    revalidatePath(`/${slug}/panel/clientes/${customerId}`)
    return { ok: true }
  } catch {
    return { ok: false, error: 'No se pudo guardar la nota.' }
  }
}
