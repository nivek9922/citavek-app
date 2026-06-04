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
  service?:      BookableService | null
  activeBarber?: boolean
  conflict?:     boolean
}

function createFakeRepo(opts: FakeOptions = {}) {
  const created: NewAppointment[] = []
  const service      = opts.service === undefined ? { priceCop: 25000, durationMin: 30 } : opts.service
  const activeBarber = opts.activeBarber ?? true
  const conflict     = opts.conflict ?? false

  const repo: SchedulingRepository = {
    getBookableService:      vi.fn(async () => service),
    isActiveBarber:          vi.fn(async () => activeBarber),
    hasConflict:             vi.fn(async () => conflict),
    upsertCustomer:          vi.fn(async () => ({ id: 'cust-1' })),
    createAppointment:       vi.fn(async (data: NewAppointment) => { created.push(data); return { id: 'apt-1' } }),
    getAppointmentStatus:    vi.fn(async () => null),
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
  }
  return { repo, created }
}

const inFuture = () => new Date(Date.now() + 24 * 60 * 60_000)

const baseInput: BookAppointmentInput = {
  organizationId: 'org-1',
  serviceId:      'svc-1',
  barberId:       'brb-1',
  startAt:        inFuture(),
  customerName:   'Juan Pérez',
  customerPhone:  '+573104567890',
}

describe('bookAppointment', () => {
  it('crea la cita en el happy path y devuelve el id', async () => {
    const { repo, created } = createFakeRepo()

    const res = await bookAppointment(repo, { ...baseInput, startAt: inFuture() })

    expect(res).toEqual({ ok: true, appointmentId: 'apt-1' })
    expect(created).toHaveLength(1)
  })

  it('deriva precio y duración del SERVICIO, nunca del input (seguridad)', async () => {
    const { repo, created } = createFakeRepo({ service: { priceCop: 45000, durationMin: 60 } })
    const startAt = inFuture()

    await bookAppointment(repo, { ...baseInput, startAt })

    const apt = created[0]
    expect(apt.priceCop).toBe(45000)
    expect(apt.durationMin).toBe(60)
    expect(apt.endAt.getTime()).toBe(startAt.getTime() + 60 * 60_000)
    expect(apt.status).toBe('confirmed')
    expect(apt.source).toBe('online')
  })

  it('rechaza si el servicio no existe (y no crea nada)', async () => {
    const { repo, created } = createFakeRepo({ service: null })

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
