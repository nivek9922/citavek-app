'use server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { z } from 'zod'
import { auth } from '@/server/auth'
import { db } from '@/server/db'
import { requireSuperAdmin } from '@/server/super-admin'

// ── Sign out ──────────────────────────────────────────────────────────────

export async function signOutAction() {
  await auth.api.signOut({ headers: await headers() })
  redirect('/login')
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

    // Verificar slug único
    const exists = await db.organization.findUnique({ where: { slug: data.slug } })
    if (exists) return { ok: false, error: `El slug "${data.slug}" ya está en uso.` }

    // Crear usuario owner (o reutilizar si ya existe)
    let ownerUser = await db.user.findUnique({ where: { email: data.ownerEmail } })
    if (!ownerUser) {
      // Crear via better-auth API
      const created = await auth.api.signUpEmail({
        body: {
          email:    data.ownerEmail,
          password: data.ownerPassword,
          name:     data.ownerName,
        },
      })
      if (!created?.user) return { ok: false, error: 'No se pudo crear el usuario owner.' }
      ownerUser = await db.user.findUnique({ where: { email: data.ownerEmail } })
      if (!ownerUser) return { ok: false, error: 'Error al recuperar el usuario creado.' }
    }

    // Crear organización
    const org = await db.organization.create({
      data: {
        name:     data.name,
        slug:     data.slug,
        city:     data.city,
        address:  data.address,
        phone:    data.phone,
        timezone: 'America/Bogota',
        currency: 'COP',
        status:   'active',
      },
    })

    // Crear branding
    await db.branding.create({
      data: { organizationId: org.id, primaryColor: data.primaryColor },
    })

    // Añadir owner como miembro
    await db.member.create({
      data: {
        id:             crypto.randomUUID(),
        organizationId: org.id,
        userId:         ownerUser.id,
        role:           'owner',
        createdAt:      new Date(),
      },
    })

    return { ok: true, slug: org.slug }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error inesperado'
    return { ok: false, error: msg }
  }
}
