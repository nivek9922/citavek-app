import { describe, it, expect, vi } from 'vitest'
import { bookAppointment, type BookAppointmentInput } from './book-appointment'
import type {
  SchedulingRepository,
  BookableService,
  NewAppointment,
} from '../domain/ports/scheduling-repository'

// ── Repositorio en memoria (Adapter falso que implementa el Port) ────────────
// Esto es lo que la arquitectura hexagonal habilita: probar el use case sin DB
// ni framework, simplemente inyectando una implementación del puerto.

interface FakeOptions {
  services?:     BookableService[]
  activeBarber?: boolean
  conflict?:     boolean
}

function createFakeRepo(opts: FakeOptions = {}) {
  const created: NewAppointment[] = []
  const services     = opts.services ?? [{ id: 'svc-1', priceCop: 25000, durationMin: 30 }]
  const activeBarber = opts.activeBarber ?? true
  const conflict     = opts.conflict ?? false

  const repo: SchedulingRepository = {
    getBookableServices:     vi.fn(async () => services),
    isActiveBarber:          vi.fn(async () => activeBarber),
    listActiveBarberIds:         vi.fn(async () => []),
    findActiveBarberIdByUserId:  vi.fn(async () => null),
    hasConflict:             vi.fn(async () => conflict),
    upsertCustomer:          vi.fn(async () => ({ id: 'cust-1' })),
    createAppointment:       vi.fn(async (data: NewAppointment) => { created.push(data); return { id: 'apt-1' } }),
    getAppointmentForStatusChange: vi.fn(async () => null),
    updateAppointmentStatus: vi.fn(async () => undefined),
    getOrgTimezone:                vi.fn(async () => 'America/Bogota'),
    getBarberWorkingHours:         vi.fn(async () => []),
    getBarberBusySlots:            vi.fn(async () => []),
    getAppointmentForReschedule:   vi.fn(async () => null),
    updateAppointmentTime:         vi.fn(async () => undefined),
    isDateBlocked:                 vi.fn(async () => false),
    blockDate:                     vi.fn(async () => undefined),
    unblockDate:                   vi.fn(async () => undefined),
    getAppointmentForCustomer:     vi.fn(async () => null),
    markRedemptionFailed:          vi.fn(async () => undefined),
  }
  return { repo, created }
}

const inFuture = () => new Date(Date.now() + 24 * 60 * 60_000)

const baseInput: BookAppointmentInput = {
  organizationId: 'org-1',
  serviceIds:     ['svc-1'],
  barberId:       'brb-1',
  startAt:        inFuture(),
  customerName:   'Juan Pérez',
  customerPhone:  '+573104567890',
}

describe('bookAppointment', () => {
  it('crea la cita en el happy path y devuelve el id', async () => {
    const { repo, created } = createFakeRepo()

    const res = await bookAppointment(repo, { ...baseInput, startAt: inFuture() })

    expect(res).toEqual({ ok: true, appointmentId: 'apt-1', priceCop: 25000, discountCop: 0, rewardApplied: false })
    expect(created).toHaveLength(1)
  })

  it('aplica el descuento de lealtad inyectado sobre el precio derivado', async () => {
    const { repo, created } = createFakeRepo()

    const res = await bookAppointment(repo, {
      ...baseInput,
      startAt: inFuture(),
      computeRewardDiscount: (lines) => lines.reduce((s, l) => s + l.priceCop, 0), // próxima cita gratis
    })

    expect(res).toEqual({ ok: true, appointmentId: 'apt-1', priceCop: 0, discountCop: 25000, rewardApplied: true })
    expect(created[0]!.priceCop).toBe(0)
  })

  it('no canjea cuando el descuento es 0 (rewardApplied false)', async () => {
    const { repo } = createFakeRepo()

    const res = await bookAppointment(repo, {
      ...baseInput,
      startAt: inFuture(),
      computeRewardDiscount: () => 0, // p.ej. FREE_SERVICE sin el servicio en el carrito
    })

    expect(res).toMatchObject({ ok: true, rewardApplied: false, discountCop: 0, priceCop: 25000 })
  })

  it('deriva precio y duración del SERVICIO, nunca del input (seguridad)', async () => {
    const { repo, created } = createFakeRepo({ services: [{ id: 'svc-1', priceCop: 45000, durationMin: 60 }] })
    const startAt = inFuture()

    await bookAppointment(repo, { ...baseInput, startAt })

    const apt = created[0]!
    expect(apt.priceCop).toBe(45000)
    expect(apt.durationMin).toBe(60)
    expect(apt.endAt.getTime()).toBe(startAt.getTime() + 60 * 60_000)
    expect(apt.status).toBe('confirmed')
    expect(apt.source).toBe('online')
  })

  it('suma precio y duración de VARIOS servicios server-side', async () => {
    const { repo, created } = createFakeRepo({ services: [
      { id: 'svc-1', priceCop: 25000, durationMin: 30 },
      { id: 'svc-2', priceCop: 15000, durationMin: 20 },
    ] })
    const startAt = inFuture()

    await bookAppointment(repo, { ...baseInput, serviceIds: ['svc-1', 'svc-2'], startAt })

    const apt = created[0]!
    expect(apt.priceCop).toBe(40000)
    expect(apt.durationMin).toBe(50)
    expect(apt.endAt.getTime()).toBe(startAt.getTime() + 50 * 60_000)
    expect(apt.services).toHaveLength(2)
  })

  it('rechaza si el servicio no existe (y no crea nada)', async () => {
    const { repo, created } = createFakeRepo({ services: [] })

    const res = await bookAppointment(repo, baseInput)

    expect(res.ok).toBe(false)
    expect(created).toHaveLength(0)
  })

  it('rechaza si el barbero no está activo', async () => {
    const { repo, created } = createFakeRepo({ activeBarber: false })

    const res = await bookAppointment(repo, baseInput)

    expect(res.ok).toBe(false)
    expect(created).toHaveLength(0)
  })

  it('rechaza si el horario ya pasó', async () => {
    const { repo, created } = createFakeRepo()

    const res = await bookAppointment(repo, {
      ...baseInput,
      startAt: new Date(Date.now() - 60 * 60_000),
    })

    expect(res.ok).toBe(false)
    expect(created).toHaveLength(0)
  })

  it('rechaza si hay conflicto de horario (anti-doble-reserva)', async () => {
    const { repo, created } = createFakeRepo({ conflict: true })

    const res = await bookAppointment(repo, baseInput)

    expect(res.ok).toBe(false)
    expect(created).toHaveLength(0)
  })
})
