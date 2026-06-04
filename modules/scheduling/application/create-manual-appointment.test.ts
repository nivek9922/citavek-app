import { describe, it, expect, vi } from 'vitest'
import { createManualAppointment, type CreateManualAppointmentInput } from './create-manual-appointment'
import type {
  SchedulingRepository,
  BookableService,
  NewAppointment,
} from '../domain/ports/scheduling-repository'

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
    getOrgTimezone:              vi.fn(async () => 'America/Bogota'),
    getBarberWorkingHours:       vi.fn(async () => []),
    getBarberBusySlots:          vi.fn(async () => []),
    getAppointmentForReschedule: vi.fn(async () => null),
    updateAppointmentTime:       vi.fn(async () => undefined),
  }
  return { repo, created }
}

const baseInput: CreateManualAppointmentInput = {
  organizationId:  'org-1',
  serviceId:       'svc-1',
  barberId:        'brb-1',
  startAt:         new Date('2027-06-07T14:00:00.000Z'),
  customerName:    'Ana Gómez',
  customerPhone:   '+573104567890',
  createdByUserId: 'user-1',
  notes:           'Cliente frecuente',
}

describe('createManualAppointment', () => {
  it('crea la cita con source "manual" y createdByUserId', async () => {
    const { repo, created } = createFakeRepo()

    const res = await createManualAppointment(repo, baseInput)

    expect(res).toEqual({ ok: true, appointmentId: 'apt-1' })
    const apt = created[0]
    expect(apt.source).toBe('manual')
    expect(apt.createdByUserId).toBe('user-1')
    expect(apt.notes).toBe('Cliente frecuente')
  })

  it('deriva precio y duración del servicio', async () => {
    const { repo, created } = createFakeRepo({ service: { priceCop: 65000, durationMin: 75 } })

    await createManualAppointment(repo, baseInput)

    const apt = created[0]
    expect(apt.priceCop).toBe(65000)
    expect(apt.durationMin).toBe(75)
    expect(apt.endAt.getTime()).toBe(baseInput.startAt.getTime() + 75 * 60_000)
  })

  it('permite horarios en el pasado (a diferencia de la reserva pública)', async () => {
    const { repo, created } = createFakeRepo()

    const res = await createManualAppointment(repo, {
      ...baseInput,
      startAt: new Date(Date.now() - 60 * 60_000),
    })

    expect(res.ok).toBe(true)
    expect(created).toHaveLength(1)
  })

  it('rechaza si el servicio no existe', async () => {
    const { repo, created } = createFakeRepo({ service: null })
    const res = await createManualAppointment(repo, baseInput)
    expect(res.ok).toBe(false)
    expect(created).toHaveLength(0)
  })

  it('rechaza si el barbero no está activo', async () => {
    const { repo, created } = createFakeRepo({ activeBarber: false })
    const res = await createManualAppointment(repo, baseInput)
    expect(res.ok).toBe(false)
    expect(created).toHaveLength(0)
  })

  it('rechaza si hay conflicto de horario', async () => {
    const { repo, created } = createFakeRepo({ conflict: true })
    const res = await createManualAppointment(repo, baseInput)
    expect(res.ok).toBe(false)
    expect(created).toHaveLength(0)
  })
})
