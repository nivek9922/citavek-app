'use server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { z } from 'zod'
import { auth } from '@/server/auth'
import { db } from '@/server/db'
import { requireSuperAdmin } from '@/server/super-admin'
import { getSession } from '@/server/session'
import { COLOMBIA_CITIES } from '@/shared/constants/colombia-cities'
import { handlePrismaError } from '@/server/prisma-errors'
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
  city:         z.enum(COLOMBIA_CITIES),
  phone:        z.string().min(7).max(20),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#E0A300'),
  // userId enviado por el cliente como fallback si la cookie aún no propagó al SA.
  _userId:      z.string().optional(),
})

export type SelfRegisterInput = z.infer<typeof selfRegisterSchema>

export async function createBarberiaForSelfAction(
  input: SelfRegisterInput,
): Promise<{ ok: true; slug: string; id: string } | { ok: false; error: string }> {
  try {
    const data = selfRegisterSchema.parse(input)

    // Resolver userId: primero desde la sesión del servidor, luego desde el cliente.
    let userId: string | null = null

    const session = await getSession()
    if (session) {
      userId = session.user.id
    } else if (data._userId) {
      // Fallback: verificar que el usuario exista y haya sido creado hace menos de 3 min.
      const user = await db.user.findUnique({
        where:  { id: data._userId },
        select: { id: true, createdAt: true },
      })
      if (user && Date.now() - user.createdAt.getTime() < 3 * 60_000) {
        userId = user.id
      }
    }

    if (!userId) return { ok: false, error: 'Sesión no encontrada. Intenta iniciar sesión.' }

    // Restricción MVP: un owner solo puede tener una barbería.
    const existing = await getPrimaryMembership(userId)
    if (existing) return { ok: false, error: 'Ya tienes una barbería registrada.' }

    return createOrganization(repo, {
      userId,
      name:         data.name,
      slug:         data.slug,
      city:         data.city,
      phone:        data.phone,
      primaryColor: data.primaryColor,
    })
  } catch (err) {
    return { ok: false, error: handlePrismaError(err) }
  }
}

// ── Crear barbería + owner (solo super-admin) ─────────────────────────────

const createBarberiaSchema = z.object({
  name:          z.string().min(2).max(80),
  slug:          z.string().min(2).max(60).regex(/^[a-z0-9-]+$/, 'Solo letras, números y guiones'),
  city:          z.enum(COLOMBIA_CITIES),
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
): Promise<{ ok: true; slug: string; id: string } | { ok: false; error: string }> {
  await requireSuperAdmin()
  try {
    const data = createBarberiaSchema.parse(input)

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

    const result = await createOrganization(repo, {
      userId:       ownerUser.id,
      name:         data.name,
      slug:         data.slug,
      city:         data.city,
      phone:        data.phone,
      primaryColor: data.primaryColor,
    })

    if (result.ok) revalidatePath('/admin')
    return result
  } catch (err) {
    return { ok: false, error: handlePrismaError(err) }
  }
}
