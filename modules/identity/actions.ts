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
import { validateAccessCode } from './application/validate-access-code'
import { getPrimaryMembership } from './queries'

// ── Sign out ──────────────────────────────────────────────────────────────

export async function signOutAction() {
  await auth.api.signOut({ headers: await headers() })
  redirect('/login')
}

// ── Pre-validación del código de acceso (sin consumirlo) ─────────────────
// Se llama ANTES de crear el usuario para evitar registros huérfanos.

export async function checkAccessCodeAction(
  code: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!code || !code.trim()) return { ok: false, error: 'El código de acceso es obligatorio.' }
  return validateAccessCode(repo, code)
}

// ── Registro self-service: owner crea su propia barbería ─────────────────

const selfRegisterSchema = z.object({
  name:         z.string().min(2).max(80),
  slug:         z.string().min(2).max(60).regex(/^[a-z0-9-]+$/, 'Solo letras minúsculas, números y guiones'),
  city:         z.enum(COLOMBIA_CITIES),
  phone:        z.string().regex(/^\d{10}$/, 'Ingresa 10 dígitos sin +57 (ej. 3187654321)'),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#E0A300'),
  accessCode:   z.string().min(1, 'El código de acceso es obligatorio'),
  // userId enviado por el cliente como fallback si la cookie aún no propagó al SA.
  _userId:      z.string().optional(),
})

export type SelfRegisterInput = z.infer<typeof selfRegisterSchema>

export async function createBarberiaForSelfAction(
  input: SelfRegisterInput,
): Promise<{ ok: true; slug: string; id: string } | { ok: false; error: string }> {
  try {
    const data = selfRegisterSchema.parse(input)

    // Validar código de acceso antes de crear cualquier recurso.
    const codeCheck = await validateAccessCode(repo, data.accessCode)
    if (!codeCheck.ok) return codeCheck

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

    const result = await createOrganization(repo, {
      userId,
      name:         data.name,
      slug:         data.slug,
      city:         data.city,
      phone:        data.phone,
      primaryColor: data.primaryColor,
    })

    // Consumir el código solo si la org se creó con éxito.
    if (result.ok) {
      const email = session?.user.email ?? data._userId ?? 'unknown'
      await repo.consumeAccessCode(data.accessCode.trim().toUpperCase(), email)
    }

    return result
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

// ── Generar código de acceso (solo super-admin) ───────────────────────────

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let part1 = ''
  let part2 = ''
  for (let i = 0; i < 4; i++) part1 += chars[Math.floor(Math.random() * chars.length)]
  for (let i = 0; i < 4; i++) part2 += chars[Math.floor(Math.random() * chars.length)]
  return `BOKR-${part1}-${part2}`
}

const generateCodeSchema = z.object({
  expiryDays: z.coerce.number().int().min(1).max(365).default(30),
})

export async function generateAccessCodeAction(
  input: { expiryDays?: number },
): Promise<{ ok: true; code: string } | { ok: false; error: string }> {
  const session = await requireSuperAdmin()
  try {
    const { expiryDays } = generateCodeSchema.parse(input)
    const expiresAt = new Date(Date.now() + expiryDays * 86_400_000)
    const code = generateCode()
    await repo.createAccessCode(code, expiresAt, session.user.email)
    revalidatePath('/admin')
    return { ok: true, code }
  } catch (err) {
    return { ok: false, error: handlePrismaError(err) }
  }
}

export async function listAccessCodesAction() {
  await requireSuperAdmin()
  return repo.listAccessCodes()
}

// ── Cambiar contraseña (usuario logueado) ─────────────────────────────────

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword:     z.string().min(8, 'La nueva contraseña debe tener al menos 8 caracteres'),
})

export async function changePasswordAction(
  input: { currentPassword: string; newPassword: string },
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const data = changePasswordSchema.parse(input)
    const res = await auth.api.changePassword({
      body:    { currentPassword: data.currentPassword, newPassword: data.newPassword, revokeOtherSessions: false },
      headers: await headers(),
    })
    if (!res) return { ok: false, error: 'No se pudo cambiar la contraseña.' }
    return { ok: true }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al cambiar la contraseña.'
    if (msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('incorrect')) {
      return { ok: false, error: 'La contraseña actual es incorrecta.' }
    }
    return { ok: false, error: msg }
  }
}
