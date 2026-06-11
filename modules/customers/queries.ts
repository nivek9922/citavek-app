import 'server-only'
import { db } from '@/server/db'

// ── Lista de clientes con stats agregadas ───────────────────────────────────
// 2 queries (lista + sumas por groupBy) en vez de N+1.

export async function listCustomers(organizationId: string, q?: string) {
  const term = q?.trim()
  const customers = await db.customer.findMany({
    where: {
      organizationId,
      ...(term
        ? {
            OR: [
              { name:  { contains: term, mode: 'insensitive' as const } },
              { phone: { contains: term } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: {
      id: true, name: true, phone: true, email: true,
      _count: { select: { appointments: true } },
      appointments: {
        where: { status: { not: 'cancelled' } },
        orderBy: { startAt: 'desc' },
        take: 1,
        select: { startAt: true },
      },
    },
  })

  if (customers.length === 0) return []

  const sums = await db.appointment.groupBy({
    by: ['customerId'],
    where: { organizationId, status: 'completed', customerId: { in: customers.map((c) => c.id) } },
    _sum: { priceCop: true },
  })
  const spentBy = new Map(sums.map((s) => [s.customerId, s._sum.priceCop ?? 0]))

  return customers.map((c) => ({
    id:                c.id,
    name:              c.name,
    phone:             c.phone,
    email:             c.email,
    totalAppointments: c._count.appointments,
    lastVisit:         c.appointments[0]?.startAt ?? null,
    totalSpent:        spentBy.get(c.id) ?? 0,
  }))
}

export type CustomerListItem = Awaited<ReturnType<typeof listCustomers>>[number]

// ── Clientes inactivos para re-engagement (horas muertas 5.1) ──────────────
// "Inactivo" = tiene al menos una visita completada Y no tiene cita
// activa/completada desde `inactiveDays` días atrás.

export async function findInactiveCustomers(
  organizationId: string,
  inactiveDays = 30,
  limit = 50,
) {
  const cutoff = new Date(Date.now() - inactiveDays * 24 * 60 * 60_000)

  const customers = await db.customer.findMany({
    where: {
      organizationId,
      appointments: {
        some: { status: 'completed' },
        none: {
          status:  { in: ['pending', 'confirmed', 'completed'] },
          startAt: { gte: cutoff },
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
    take: limit,
    select: {
      id: true, name: true, phone: true,
      appointments: {
        where:   { status: { not: 'cancelled' } },
        orderBy: { startAt: 'desc' },
        take:    1,
        select:  { startAt: true },
      },
    },
  })

  return customers.map((c) => ({
    id:        c.id,
    name:      c.name,
    phone:     c.phone,
    lastVisit: c.appointments[0]?.startAt ?? null,
  }))
}

export type InactiveCustomer = Awaited<ReturnType<typeof findInactiveCustomers>>[number]

// ── Detalle de un cliente con su historial ──────────────────────────────────

export async function getCustomerDetail(organizationId: string, customerId: string) {
  const customer = await db.customer.findFirst({
    where:  { id: customerId, organizationId },
    select: { id: true, name: true, phone: true, email: true, notes: true, createdAt: true },
  })
  if (!customer) return null

  const appointments = await db.appointment.findMany({
    where:   { organizationId, customerId },
    orderBy: { startAt: 'desc' },
    take:    100,
    select: {
      id: true, startAt: true, status: true, priceCop: true,
      service: { select: { name: true } },
      barber:  { select: { displayName: true, nickname: true } },
    },
  })

  const totalSpent = appointments.filter((a) => a.status === 'completed').reduce((s, a) => s + a.priceCop, 0)
  const completed  = appointments.filter((a) => a.status === 'completed').length

  return { customer, appointments, totalSpent, completed }
}
