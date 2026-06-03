// Seed de demostración — 3 barberías listas para demos de venta.
// Porta los datos de barrio-glow-up/src/features/tenant/mockData.ts
// con las convenciones reales del proyecto (priceCop entero, timestamptz UTC).
// Idempotente: upsert por slug/teléfono.

import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma/client'
import type { AppointmentStatus, AppointmentSource } from '../generated/prisma/client'

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
})

// ── Helpers ──────────────────────────────────────────────────────────────────

function minutesToTime(min: number) {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
}

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
    serviceId: string
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
      const svc = params.services[i % params.services.length]
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
        serviceId: svc.id,
        barberId: params.barberIds[i % params.barberIds.length],
        customerName: names[i % names.length],
        customerPhone: phones[i % phones.length],
        startAt,
        endAt,
        durationMin: svc.durationMin,
        priceCop: svc.priceCop,
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
  {
    slug: 'envigado-cuts',
    name: 'Envigado Cuts',
    city: 'Envigado, Antioquia',
    address: 'Cl 37 Sur #43A-22',
    phone: '+573042221188',
    timezone: 'America/Bogota',
    branding: {
      primaryColor: '#22C55E',
      tagline: 'Premium grooming paisa.',
    },
    services: [
      { key: 'm1', name: 'Corte Ejecutivo', description: 'Corte profesional con detalle.', durationMin: 40, priceCop: 35000, category: 'corte' as const },
      { key: 'm2', name: 'Combo Premium', description: 'Corte, barba, mascarilla y masaje capilar.', durationMin: 75, priceCop: 65000, category: 'combo' as const },
      { key: 'm3', name: 'Barba Premium', description: 'Diseño con navaja, toalla caliente y aceites.', durationMin: 40, priceCop: 30000, category: 'barba' as const },
      { key: 'm4', name: 'Color Camuflaje Canas', description: 'Disimula canas naturalmente.', durationMin: 45, priceCop: 50000, category: 'tratamiento' as const },
    ],
    barbers: [
      { key: 'm1', displayName: 'Sebastián Arango', nickname: 'Sebas', specialties: ['Premium', 'Ejecutivo'], rating: 5.0, reviewsCount: 412 },
      { key: 'm2', displayName: 'Andrés Felipe Gómez', specialties: ['Barba', 'Color'], rating: 4.9, reviewsCount: 298 },
    ],
  },
  {
    slug: 'chapinero-shave',
    name: 'Chapinero Shave Co.',
    city: 'Bogotá D.C.',
    address: 'Cra 13 #63-20, Chapinero',
    phone: '+573115559090',
    timezone: 'America/Bogota',
    branding: {
      primaryColor: '#F43F5E',
      tagline: 'Tradición desde el centro de Bogotá.',
    },
    services: [
      { key: 'b1', name: 'Corte Clásico', description: 'Corte tradicional con tijera y máquina.', durationMin: 30, priceCop: 25000, category: 'corte' as const },
      { key: 'b2', name: 'Corte + Barba', description: 'El combo más pedido de la casa.', durationMin: 60, priceCop: 45000, category: 'combo' as const },
      { key: 'b3', name: 'Diseño de Barba', description: 'Perfilado y arreglo con navaja.', durationMin: 30, priceCop: 22000, category: 'barba' as const },
      { key: 'b4', name: 'Corte Niño', description: 'Servicio especial para los más pequeños.', durationMin: 30, priceCop: 20000, category: 'infantil' as const },
    ],
    barbers: [
      { key: 'b1', displayName: 'Carlos Andrés Mosquera', nickname: 'El Negro', specialties: ['Fades', 'Diseños'], rating: 4.9, reviewsCount: 248 },
      { key: 'b2', displayName: 'Diego Peñaloza', specialties: ['Clásico', 'Niños'], rating: 4.6, reviewsCount: 95 },
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
      await db.appointment.create({
        data: { ...appt, customerId: customer.id },
      })
    }

    console.log(`   ✓ ${orgData.services.length} servicios · ${orgData.barbers.length} barberos · ${appts.length} citas`)
  }

  console.log('\n✅ Seed completado.')
  console.log('\nURLs de demo:')
  for (const org of ORGS) {
    console.log(`   http://localhost:3000/${org.slug}`)
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())
