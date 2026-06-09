import type { IdentityRepository } from '../domain/ports/identity-repository'

export interface CreateOrganizationInput {
  userId:       string
  name:         string
  slug:         string
  city:         string
  phone:        string
  primaryColor: string
  timezone?:    string   // default: 'America/Bogota'
  currency?:    string   // default: 'COP'
}

export type CreateOrganizationResult =
  | { ok: true;  slug: string; id: string }
  | { ok: false; error: string }

/**
 * Use case: crear una organización (barbería) con su branding inicial
 * y vincular al usuario como owner.
 *
 * Invariante de dominio: el slug debe ser único en la plataforma.
 * La restricción "un owner solo puede tener una org" es un límite de producto
 * aplicado en la capa de delivery (actions.ts), no aquí.
 */
export async function createOrganization(
  repo: IdentityRepository,
  input: CreateOrganizationInput,
): Promise<CreateOrganizationResult> {
  if (await repo.isSlugTaken(input.slug)) {
    return { ok: false, error: `El slug "${input.slug}" ya está en uso. Elige otro.` }
  }

  const org = await repo.createOrganization({
    name:     input.name,
    slug:     input.slug,
    city:     input.city,
    phone:    input.phone,
    timezone: input.timezone ?? 'America/Bogota',
    currency: input.currency ?? 'COP',
  })

  await repo.createBranding(org.id, input.primaryColor)
  await repo.createOwnerMembership(org.id, input.userId)

  return { ok: true, slug: org.slug, id: org.id }
}
