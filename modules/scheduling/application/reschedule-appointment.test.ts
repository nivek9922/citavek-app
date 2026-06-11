import { describe, it, expect, vi } from 'vitest'
import { rescheduleAppointment, type RescheduleAppointmentInput } from './reschedule-appointment'
import type {
  SchedulingRepository,
  ReschedulableAppointment,
} from '../domain/ports/scheduling-repository'

// ── Fake repo ────────────────────────────────────────────────────────────────

interface FakeOptions {
  appointment?:  ReschedulableAppointment | null
  serviceExists?: boolean
  barberActive?:  boolean
  conflict?:      boolean
}

function createFakeRepo(opts: FakeOptions = {}) {
  const {
    appointment  = { status: 'confirmed', serviceId: 'svc-1', barberId: 'brb-1' },
    serviceExists = true,
    barberActive  = true,
    conflict      = false,
  } = opts

  const updates: Array<{ id: string; startAt: Date; endAt: Date }> = []

  const repo: SchedulingRepository = {
    getAppointmentForReschedule: vi.fn(async () => appointment),
    getBookableService:          vi.fn(async () => serviceExists ? { priceCop: 30000, durationMin: 45 } : null),
    isActiveBarber:              vi.fn(async () => barberActive),
    listActiveBarberIds:         vi.fn(async () => []),
    hasConflict:                 vi.fn(async () => conflict),
    updateAppointmentTime:       vi.fn(async (_org, id, startAt, endAt) => {
      updates.push({ id, startAt, endAt })
    }),
    // métodos no ejercidos por este use case
    upsertCustomer:              vi.fn(async () => ({ id: 'c' })),
    createAppointment:           vi.fn(async () => ({ id: 'a' })),
    getAppointmentForStatusChange: vi.fn(async () => null),
    updateAppointmentStatus:     vi.fn(async () => undefined),
    getOrgTimezone:              vi.fn(async () => 'America/Bogota'),
    getBarberWorkingHours:       vi.fn(async () => []),
    getBarberBusySlots:          vi.fn(async () => []),
    isDateBlocked:               vi.fn(async () => false),
    blockDate:                   vi.fn(async () => undefined),
    unblockDate:                 vi.fn(async () => undefined),
    getAppointmentForCustomer:   vi.fn(async () => null),
  }
  return { repo, updates }
}

const inFuture = (offsetMs = 24 * 60 * 60_000) => new Date(Date.now() + offsetMs)

const baseInput: RescheduleAppointmentInput = {
  organizationId: 'org-1',
  appointmentId:  'apt-1',
  newStartAt:     inFuture(),
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('rescheduleAppointment', () => {
  it('reprograma con éxito una cita confirmed', async () => {
    const { repo, updates } = createFakeRepo()
    const newStartAt = inFuture()

    const res = await rescheduleAppointment(repo, { ...baseInput, newStartAt })

    expect(res.ok).toBe(true)
    expect(updates).toHaveLength(1)
    expect(updates[0]!.startAt).toBe(newStartAt)
  })

  it('reprograma con éxito una cita pending', async () => {
    const { repo } = createFakeRepo({ appointment: { status: 'pending', serviceId: 'svc-1', barberId: 'brb-1' } })

    const res = await rescheduleAppointment(repo, baseInput)

    expect(res.ok).toBe(true)
  })

  it('deriva el nuevo endAt desde la duración del SERVICIO (no del input)', async () => {
    const { repo, updates } = createFakeRepo() // durationMin: 45
    const newStartAt = inFuture()

    await rescheduleAppointment(repo, { ...baseInput, newStartAt })

    const expectedEnd = new Date(newStartAt.getTime() + 45 * 60_000)
    expect(updates[0]!.endAt.getTime()).toBe(expectedEnd.getTime())
  })

  it('excluye la propia cita del chequeo de conflictos', async () => {
    const { repo } = createFakeRepo()
    await rescheduleAppointment(repo, baseInput)

    // El 5° argumento de hasConflict debe ser el appointmentId
    expect(repo.hasConflict).toHaveBeenCalledWith(
      'org-1', 'brb-1', expect.any(Date), expect.any(Date), 'apt-1',
    )
  })

  it('rechaza si la cita no existe', async () => {
    const { repo, updates } = createFakeRepo({ appointment: null })

    const res = await rescheduleAppointment(repo, baseInput)

    expect(res.ok).toBe(false)
    expect((res as { ok: false; error: string }).error).toContain('no encontrada')
    expect(updates).toHaveLength(0)
  })

  it('rechaza si la cita está completed (estado no reprogramable)', async () => {
    const { repo, updates } = createFakeRepo({
      appointment: { status: 'completed', serviceId: 'svc-1', barberId: 'brb-1' },
    })

    const res = await rescheduleAppointment(repo, baseInput)

    expect(res.ok).toBe(false)
    expect((res as { ok: false; error: string }).error).toContain('completed')
    expect(updates).toHaveLength(0)
  })

  it('rechaza si la cita está cancelled (estado no reprogramable)', async () => {
    const { repo } = createFakeRepo({
      appointment: { status: 'cancelled', serviceId: 'svc-1', barberId: 'brb-1' },
    })

    const res = await rescheduleAppointment(repo, baseInput)

    expect(res.ok).toBe(false)
  })

  it('rechaza si el nuevo horario ya pasó', async () => {
    const { repo, updates } = createFakeRepo()

    const res = await rescheduleAppointment(repo, {
      ...baseInput,
      newStartAt: new Date(Date.now() - 60 * 60_000), // 1 hora en el pasado
    })

    expect(res.ok).toBe(false)
    expect((res as { ok: false; error: string }).error).toContain('pasó')
    expect(updates).toHaveLength(0)
  })

  it('rechaza si el servicio ya fue desactivado', async () => {
    const { repo, updates } = createFakeRepo({ serviceExists: false })

    const res = await rescheduleAppointment(repo, baseInput)

    expect(res.ok).toBe(false)
    expect((res as { ok: false; error: string }).error).toContain('servicio')
    expect(updates).toHaveLength(0)
  })

  it('rechaza si el barbero ya no está activo', async () => {
    const { repo, updates } = createFakeRepo({ barberActive: false })

    const res = await rescheduleAppointment(repo, baseInput)

    expect(res.ok).toBe(false)
    expect((res as { ok: false; error: string }).error).toContain('barbero')
    expect(updates).toHaveLength(0)
  })

  it('rechaza si hay conflicto con otra cita en el nuevo horario', async () => {
    const { repo, updates } = createFakeRepo({ conflict: true })

    const res = await rescheduleAppointment(repo, baseInput)

    expect(res.ok).toBe(false)
    expect((res as { ok: false; error: string }).error).toContain('horario')
    expect(updates).toHaveLength(0)
  })
})
