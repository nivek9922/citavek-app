import { describe, it, expect, vi } from 'vitest'
import { createManualAppointment, type CreateManualAppointmentInput } from './create-manual-appointment'
import type {
  SchedulingRepository,
  BookableService,
  NewAppointment,
  WorkingHourInput,
} from '../domain/ports/scheduling-repository'

interface FakeOptions {
  service?:      BookableService | null
  activeBarber?: boolean
  conflict?:     boolean
  workingHours?: WorkingHourInput[]
}

function createFakeRepo(opts: FakeOptions = {}) {
  const created: NewAppointment[] = []
  const service      = opts.service === undefined ? { priceCop: 25000, durationMin: 30 } : opts.service
  const activeBarber = opts.activeBarber ?? true
  const conflict     = opts.conflict ?? false
  const workingHours = opts.workingHours ?? []

  const repo: SchedulingRepository = {
    getBookableService:      vi.fn(async () => service),
    isActiveBarber:          vi.fn(async () => activeBarber),
    listActiveBarberIds:         vi.fn(async () => []),
    findActiveBarberIdByUserId:  vi.fn(async () => null),
    hasConflict:             vi.fn(async () => conflict),
    upsertCustomer:          vi.fn(async () => ({ id: 'cust-1' })),
    createAppointment:       vi.fn(async (data: NewAppointment) => { created.push(data); return { id: 'apt-1' } }),
    getAppointmentForStatusChange: vi.fn(async () => null),
    updateAppointmentStatus: vi.fn(async () => undefined),
    getOrgTimezone:              vi.fn(async () => 'America/Bogota'),
    getBarberWorkingHours:       vi.fn(async () => workingHours),
    getBarberBusySlots:          vi.fn(async () => []),
    getAppointmentForReschedule: vi.fn(async () => null),
    updateAppointmentTime:       vi.fn(async () => undefined),
    isDateBlocked:               vi.fn(async () => false),
    blockDate:                   vi.fn(async () => undefined),
    unblockDate:                 vi.fn(async () => undefined),
    getAppointmentForCustomer:   vi.fn(async () => null),
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

    expect(res).toEqual({ ok: true, appointmentId: 'apt-1', offHours: true })
    const apt = created[0]!
    expect(apt.source).toBe('manual')
    expect(apt.createdByUserId).toBe('user-1')
    expect(apt.notes).toBe('Cliente frecuente')
  })

  it('deriva precio y duración del servicio', async () => {
    const { repo, created } = createFakeRepo({ service: { priceCop: 65000, durationMin: 75 } })

    await createManualAppointment(repo, baseInput)

    const apt = created[0]!
    expect(apt.priceCop).toBe(65000)
    expect(apt.durationMin).toBe(75)
    expect(apt.endAt.getTime()).toBe(baseInput.startAt.getTime() + 75 * 60_000)
  })

  it('rechaza citas en el pasado (más de 5 min antes de ahora)', async () => {
    const { repo, created } = createFakeRepo()

    const res = await createManualAppointment(repo, {
      ...baseInput,
      startAt: new Date(Date.now() - 10 * 60_000),
    })

    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error).toMatch(/pasado/)
    expect(created).toHaveLength(0)
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

  // baseInput.startAt = lunes 09:00 en Bogota (14:00 UTC)
  const mondayHours = [{ dayOfWeek: 1, startMin: 540, endMin: 1200 }] // lun 09:00–20:00

  it('marca isOffHours: false si la cita cae dentro del horario del barbero', async () => {
    const { repo, created } = createFakeRepo({ workingHours: mondayHours })

    const res = await createManualAppointment(repo, baseInput)

    expect(res).toEqual({ ok: true, appointmentId: 'apt-1', offHours: false })
    expect(created[0]!.isOffHours).toBe(false)
  })

  it('permite crear fuera de horario pero marca isOffHours: true', async () => {
    const { repo, created } = createFakeRepo({ workingHours: mondayHours })

    // Lunes 23:00 Bogota = martes 04:00 UTC del día siguiente
    const res = await createManualAppointment(repo, {
      ...baseInput,
      startAt: new Date('2027-06-08T04:00:00.000Z'),
    })

    expect(res.ok).toBe(true)
    if (res.ok) expect(res.offHours).toBe(true)
    expect(created).toHaveLength(1)
    expect(created[0]!.isOffHours).toBe(true)
  })

  it('barbero sin horarios definidos → off-hours', async () => {
    const { repo, created } = createFakeRepo({ workingHours: [] })

    const res = await createManualAppointment(repo, baseInput)

    expect(res.ok).toBe(true)
    if (res.ok) expect(res.offHours).toBe(true)
    expect(created[0]!.isOffHours).toBe(true)
  })
})
