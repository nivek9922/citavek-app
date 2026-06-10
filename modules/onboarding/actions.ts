'use server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { getTenantContext } from '@/server/tenant'
import { requireMembership } from '@/server/auth-guards'

export async function dismissOnboardingAction(slug: string) {
  const ctx = await getTenantContext(slug)
  await requireMembership(ctx.id)

  const jar = await cookies()
  jar.set(`ob-dismissed-${ctx.id}`, '1', {
    maxAge: 60 * 60 * 24 * 365,
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  })

  revalidatePath(`/${slug}/panel`)
}

export async function markWizardSeenAction(slug: string) {
  const ctx = await getTenantContext(slug)
  await requireMembership(ctx.id)

  const jar = await cookies()
  jar.set(`ob-wizard-${ctx.id}`, '1', {
    maxAge: 60 * 60 * 24 * 365 * 5,
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  })

  revalidatePath(`/${slug}/panel`)
}
