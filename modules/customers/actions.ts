'use server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getTenantContext }  from '@/server/tenant'
import { requirePermission } from '@/server/auth-guards'

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
    const { db } = await import('@/server/db')
    await db.customer.update({
      where: { id: customerId, organizationId: ctx.id },
      data:  { notes: value || null },
    })
    revalidatePath(`/${slug}/panel/clientes/${customerId}`)
    return { ok: true }
  } catch {
    return { ok: false, error: 'No se pudo guardar la nota.' }
  }
}
