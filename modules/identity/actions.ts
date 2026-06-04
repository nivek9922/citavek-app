'use server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { z } from 'zod'
import { auth } from '@/server/auth'
import { db } from '@/server/db'
import { requireSuperAdmin } from '@/server/super-admin'
import { getSession } from '@/server/session'
import { prismaIdentityRepository as repo } from './infrastructure/prisma-identity-repository'
import { createOrganization } from './application/create-organization'
import { getPrimaryMembership } from './queries'

// ── Sign out ──────────────────────────────────────────────────────────────

export async function signOutAction() {
  await auth.api.signOut({ headers: await headers() })
  redirect('/login')
}

// ── Registro self-service: owner crea su propia barbería ─────────────────

const selfRegisterSchema = z.object({
  name:         z.string().min(2).max(80),
  slug:         z.string().min(2).max(60).regex(/^[a-z0-9-]+$/, 'Solo letras minúsculas, números y guiones'),
  city:         z.string().min(2).max(60),
  phone:        z.string().min(7).max(20),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#E0A300'),
})

export type SelfRegisterInput = z.infer<typeof selfRegisterSchema>

export async function createBarberiaForSelfAction(
  input: SelfRegisterInput,
): Promise<{ ok: true; slug: string } | { ok: false; error: string }> {
  try {
    const session = await getSession()
    if (!session) return { ok: false, error: 'Sesión no encontrada. Intenta de nuevo.' }

    const data = selfRegisterSchema.parse(input)

    // Restricción MVP: un owner solo puede tener una barbería (delivery-level).
    const existing = await getPrimaryMembership(session.user.id)
    if (existing) return { ok: false, error: 'Ya tienes una barbería registrada.' }

    return createOrganization(repo, {
      userId:       session.user.id,
      name:         data.name,
      slug:         data.slug,
      city:         data.city,
      phone:        data.phone,
      primaryColor: data.primaryColor,
    })
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Error inesperado.' }
  }
}

// ── Crear barbería + owner (solo super-admin) ─────────────────────────────

const createBarberiaSchema = z.object({
  name:          z.string().min(2).max(80),
  slug:          z.string().min(2).max(60).regex(/^[a-z0-9-]+$/, 'Solo letras, números y guiones'),
  city:          z.string().min(2).max(60),
  address:       z.string().min(2).max(120),
  phone:         z.string().min(7).max(20),
  primaryColor:  z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  ownerEmail:    z.string().email(),
  ownerPassword: z.string().min(8),
  ownerName:     z.string().min(2).max(80),
})

export type CreateBarberiaInput = z.infer<typeof createBarberiaSchema>

export async function createBarberiaAction(
  input: CreateBarberiaInput,
): Promise<{ ok: true; slug: string } | { ok: false; error: string }> {
  try {
    await requireSuperAdmin()
    const data = createBarberiaSchema.parse(input)

    // Crear usuario owner vía better-auth (o reutilizar si ya existe).
    // Los headers se pasan para que better-auth procese el request inline,
    // evitando un loop HTTP interno que causa memory pressure en dev.
    let ownerUser = await db.user.findUnique({ where: { email: data.ownerEmail } })
    if (!ownerUser) {
      const created = await auth.api.signUpEmail({
        body:    { email: data.ownerEmail, password: data.ownerPassword, name: data.ownerName },
        headers: await headers(),
      })
      if (!created?.user) return { ok: false, error: 'No se pudo crear el usuario owner.' }
      ownerUser = await db.user.findUnique({ where: { email: data.ownerEmail } })
      if (!ownerUser) return { ok: false, error: 'Error al recuperar el usuario creado.' }
    }

    return createOrganization(repo, {
      userId:       ownerUser.id,
      name:         data.name,
      slug:         data.slug,
      city:         data.city,
      phone:        data.phone,
      primaryColor: data.primaryColor,
    })
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Error inesperado.' }
  }
}
