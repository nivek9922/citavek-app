// Seed de demostración — 1 barbería de prueba + super admin.
// Idempotente: upsert por slug/teléfono.

import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma/client'
import type { AppointmentStatus, AppointmentSource } from '../generated/prisma/client'
import { auth } from '../server/auth.config'

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
})

// ── Usuarios de prueba ─────────────────────────────────────────────────────

const TEST_USERS = [
  {
    name:     'Kevin Rodríguez (Admin)',
    email:    process.env.SUPER_ADMIN_EMAIL ?? 'nivek9922@gmail.com',
    password: process.env.SUPER_ADMIN_PASSWORD ?? 'Admin2024!',
    slug:     null, // super-admin, no pertenece a ninguna barbería
  },
  {
    name:     'Carlos Mosquera (San Fernando)',
    email:    'owner@sanfernando.demo',
    password: 'Demo2024!',
    slug:     'san-fernando-cali',
  },
]

async function seedUsers() {
  console.log('\n👤 Creando usuarios de prueba...')
  for (const u of TEST_USERS) {
    // Verificar si ya existe
    const exists = await db.user.findUnique({ where: { email: u.email } })
    if (!exists) {
      try {
        await auth.api.signUpEmail({ body: { email: u.email, password: u.password, name: u.name } })
        console.log(`   ✓ Usuario creado: ${u.email}`)
      } catch {
        console.log(`   ⚠ No se pudo crear ${u.email} (puede que ya exista)`)
      }
    } else {
      console.log(`   · Ya existe: ${u.email}`)
    }

    // Vincular al tenant si tiene slug
    if (u.slug) {
      const org    = await db.organization.findUnique({ where: { slug: u.slug } })
      const user   = await db.user.findUnique({ where: { email: u.email } })
      if (org && user) {
        const member = await db.member.findFirst({ where: { organizationId: org.id, userId: user.id } })
        if (!member) {
          await db.member.create({
            data: { id: crypto.randomUUID(), organizationId: org.id, userId: user.id, role: 'owner', createdAt: new Date() },
          })
          console.log(`   ✓ Vinculado a ${u.slug} como owner`)
        }
      }
    }
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

// Horarios estándar Lun–Sáb 9:00–20:00
const STANDARD_HOURS = [1, 2, 3, 4, 5, 6].map((day) => ({
  dayOfWeek: day,
  startMin: 540,  // 09:00
  endMin: 1200,   // 20:00
}))

function genAppointments(params: {
  orgId: string
  barberIds: string[]
  services: Array<{ id: string; priceCop: number; durationMin: number }>
}) {
  const names = [
    'Andrés Rodríguez', 'Camilo Ramírez', 'Juan Felipe López', 'Sebastián Vargas',
    'Mateo González', 'Daniel Quintero', 'Esteban Mejía', 'Tomás Henao',
    'Nicolás Ospina', 'Samuel Restrepo',
  ]
  const phones = [
    '+573104567890', '+573158889911', '+573205557788', '+573019997766',
    '+573142223344', '+573187776655', '+573013334455', '+573174445566',
    '+573128889900', '+573056667788',
  ]

  const now = new Date()
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)

  const appointments: Array<{
    organizationId: string
    services: Array<{ serviceId: string; priceCop: number; durationMin: number }>
    barberId: string
    customerName: string
    customerPhone: string
    startAt: Date
    endAt: Date
    durationMin: number
    priceCop: number
    status: AppointmentStatus
    source: AppointmentSource
    cancelledAt: Date | null
  }> = []

  let i = 0
  for (let dayOffset = -2; dayOffset <= 6; dayOffset++) {
    const slotsToday = dayOffset === 0 ? 6 : dayOffset === 1 ? 5 : 3
    for (let s = 0; s < slotsToday; s++) {
      const svc      = params.services[i % params.services.length]
      const barberId = params.barberIds[i % params.barberIds.length]
      const name     = names[i % names.length]
      const phone    = phones[i % phones.length]
      if (!svc || !barberId || !name || !phone) { i++; continue }

      const hour = 9 + s * 2
      const startAt = new Date(today)
      startAt.setDate(today.getDate() + dayOffset)
      startAt.setHours(hour, (i % 2) * 30, 0, 0)
      const endAt = new Date(startAt.getTime() + svc.durationMin * 60_000)

      let status: AppointmentStatus
      let cancelledAt: Date | null = null
      if (dayOffset < 0) {
        if (i % 5 === 0) { status = 'cancelled'; cancelledAt = startAt }
        else status = 'completed'
      } else if (dayOffset === 0 && hour < now.getHours()) {
        status = 'completed'
      } else {
        status = 'confirmed'
      }

      appointments.push({
        organizationId: params.orgId,
        services: [{ serviceId: svc.id, priceCop: svc.priceCop, durationMin: svc.durationMin }],
        barberId,
        customerName: name,
        customerPhone: phone,
        startAt,
        endAt,
        durationMin: svc.durationMin, // total = suma de las líneas
        priceCop: svc.priceCop,       // total = suma de las líneas
        status,
        source: 'online',
        cancelledAt,
      })
      i++
    }
  }
  return appointments
}

// ── Barberías de demo ─────────────────────────────────────────────────────────

const ORGS = [
  {
    slug: 'san-fernando-cali',
    name: 'San Fernando Barber Club',
    city: 'Cali, Valle',
    address: 'Cra 39 #5-12, San Fernando',
    phone: '+573187654321',
    timezone: 'America/Bogota',
    branding: {
      primaryColor: '#E0A300',
      tagline: 'El estilo del Valle, en tus manos.',
    },
    services: [
      { key: 'c1', name: 'Corte Clásico', description: 'Corte tradicional con tijera y máquina, incluye lavado.', durationMin: 30, priceCop: 25000, category: 'corte' as const },
      { key: 'c2', name: 'Corte + Barba', description: 'Combo más pedido. Corte completo y arreglo de barba con toalla caliente.', durationMin: 60, priceCop: 45000, category: 'combo' as const },
      { key: 'c3', name: 'Diseño de Barba', description: 'Perfilado, recorte y aceite hidratante.', durationMin: 30, priceCop: 22000, category: 'barba' as const },
      { key: 'c4', name: 'Corte Niño', description: 'Para los más pequeños, paciencia incluida.', durationMin: 30, priceCop: 20000, category: 'infantil' as const },
      { key: 'c5', name: 'Mascarilla Negra', description: 'Limpieza profunda de puntos negros.', durationMin: 20, priceCop: 18000, category: 'tratamiento' as const },
      { key: 'c6', name: 'Cejas', description: 'Perfilado de cejas con cera o navaja.', durationMin: 15, priceCop: 8000, category: 'tratamiento' as const },
    ],
    barbers: [
      { key: 'c1', displayName: 'Carlos Andrés Mosquera', nickname: 'El Negro', specialties: ['Fades', 'Diseños'], rating: 4.9, reviewsCount: 248 },
      { key: 'c2', displayName: 'Jhon Jairo Caicedo', nickname: 'JJ', specialties: ['Barba', 'Clásico'], rating: 4.8, reviewsCount: 187 },
      { key: 'c3', displayName: 'Steven Palacios', specialties: ['Niños', 'Texturizado'], rating: 4.7, reviewsCount: 132 },
    ],
  },
]

// ── Main seed ─────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Iniciando seed de demostración...\n')

  for (const orgData of ORGS) {
    console.log(`→ ${orgData.name} (/${orgData.slug})`)

    // 1. Upsert organization
    const org = await db.organization.upsert({
      where: { slug: orgData.slug },
      update: {
        name: orgData.name,
        city: orgData.city,
        address: orgData.address,
        phone: orgData.phone,
      },
      create: {
        name: orgData.name,
        slug: orgData.slug,
        city: orgData.city,
        address: orgData.address,
        phone: orgData.phone,
        timezone: orgData.timezone,
        currency: 'COP',
        status: 'active',
      },
    })

    // 2. Upsert branding
    await db.branding.upsert({
      where: { organizationId: org.id },
      update: orgData.branding,
      create: { organizationId: org.id, ...orgData.branding },
    })

    // 2b. Upsert subscription → org demo "pagada" (active) para ver el flujo completo.
    const now        = new Date()
    const periodStart = new Date(now.getTime() - 5 * 86_400_000)
    const periodEnd   = new Date(now.getTime() + 25 * 86_400_000)
    await db.subscription.upsert({
      where:  { organizationId: org.id },
      update: {},
      create: {
        organizationId:     org.id,
        plan:               'basic',
        status:             'active',
        currentPeriodStart: periodStart,
        currentPeriodEnd:   periodEnd,
        lastPaymentAt:      periodStart,
        lastPaymentAmount:  79_900,
        paymentMethod:      'manual',
      },
    })

    // 3. Upsert services → guardar mapa key→id
    const serviceIds: Record<string, { id: string; priceCop: number; durationMin: number }> = {}
    for (const svc of orgData.services) {
      const existing = await db.service.findFirst({
        where: { organizationId: org.id, name: svc.name },
      })
      const record = existing
        ? await db.service.update({
            where: { id: existing.id },
            data: { description: svc.description, durationMin: svc.durationMin, priceCop: svc.priceCop, category: svc.category },
          })
        : await db.service.create({
            data: { organizationId: org.id, name: svc.name, description: svc.description, durationMin: svc.durationMin, priceCop: svc.priceCop, category: svc.category, active: true },
          })
      serviceIds[svc.key] = { id: record.id, priceCop: record.priceCop, durationMin: record.durationMin }
    }

    // 4. Upsert barbers + working hours → guardar mapa key→id
    const barberIds: string[] = []
    for (const brb of orgData.barbers) {
      const existing = await db.barber.findFirst({
        where: { organizationId: org.id, displayName: brb.displayName },
      })
      const record = existing
        ? await db.barber.update({
            where: { id: existing.id },
            data: { nickname: brb.nickname ?? null, specialties: brb.specialties, rating: brb.rating, reviewsCount: brb.reviewsCount },
          })
        : await db.barber.create({
            data: { organizationId: org.id, displayName: brb.displayName, nickname: brb.nickname ?? null, specialties: brb.specialties, rating: brb.rating, reviewsCount: brb.reviewsCount, active: true },
          })
      barberIds.push(record.id)

      // Working hours: re-crear solo si no existen
      const existingHours = await db.workingHour.count({ where: { barberId: record.id } })
      if (existingHours === 0) {
        await db.workingHour.createMany({
          data: STANDARD_HOURS.map((h) => ({ barberId: record.id, ...h })),
        })
      }
    }

    // 5. Citas de demo: borrar las existentes y recrear para siempre tener fechas frescas
    await db.appointment.deleteMany({ where: { organizationId: org.id } })
    const appts = genAppointments({
      orgId: org.id,
      barberIds,
      services: Object.values(serviceIds),
    })

    // Upsert customers y crear appointments
    for (const appt of appts) {
      const customer = await db.customer.upsert({
        where: { organizationId_phone: { organizationId: org.id, phone: appt.customerPhone } },
        update: {},
        create: { organizationId: org.id, name: appt.customerName, phone: appt.customerPhone },
      })
      const { services, ...apptData } = appt
      await db.appointment.create({
        data: {
          ...apptData,
          customerId: customer.id,
          appointmentServices: { create: services },
        },
      })
    }

    console.log(`   ✓ ${orgData.services.length} servicios · ${orgData.barbers.length} barberos · ${appts.length} citas`)
  }

  // Crear usuarios después de crear las orgs para que los slugs existan
  await seedUsers()

  console.log('\n✅ Seed completado.')
  console.log('\n─── Accesos ────────────────────────────────────────────────')
  console.log(`    Super-admin → /admin  (${process.env.SUPER_ADMIN_EMAIL ?? 'nivek9922@gmail.com'})`)
  console.log(`    Demo owner  → /san-fernando-cali/panel  (owner@sanfernando.demo / Demo2024!)`)
  console.log(`    Demo public → /san-fernando-cali`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())
