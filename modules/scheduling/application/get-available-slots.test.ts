import { describe, it, expect, vi } from 'vitest'
import { getAvailableSlots, type GetAvailableSlotsInput } from './get-available-slots'
import type {
  SchedulingRepository,
  WorkingHourInput,
  BusySlot,
} from '../domain/ports/scheduling-repository'

// ── Jornada completa (lunes–domingo, 09:00–20:00) ───────────────────────────
const fullWeek: WorkingHourInput[] = [0, 1, 2, 3, 4, 5, 6].map((d) => ({
  dayOfWeek: d,
  startMin:  540,  // 09:00
  endMin:    1200, // 20:00
}))

// 30 días adelante → ningún slot queda en el pasado (filtro nowPlusBuffer).
const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60_000)

// ── Fake repo ────────────────────────────────────────────────────────────────

interface FakeOptions {
  serviceExists?: boolean
  durationMin?:   number
  barberActive?:  boolean
  timezone?:      string
  workingHours?:  WorkingHourInput[]
  busySlots?:     BusySlot[]
  dateBlocked?:   boolean
}

function createFakeRepo(opts: FakeOptions = {}): SchedulingRepository {
  const {
    serviceExists = true,
    durationMin   = 30,
    barberActive  = true,
    timezone      = 'America/Bogota',
    workingHours  = fullWeek,
    busySlots     = [],
    dateBlocked   = false,
  } = opts

  return {
    getBookableService:      vi.fn(async () => serviceExists ? { priceCop: 25000, durationMin } : null),
    isActiveBarber:          vi.fn(async () => barberActive),
    getOrgTimezone:          vi.fn(async () => timezone),
    getBarberWorkingHours:   vi.fn(async () => workingHours),
    getBarberBusySlots:      vi.fn(async () => busySlots),
    isDateBlocked:           vi.fn(async () => dateBlocked),
    // métodos no ejercidos por este use case
    hasConflict:                 vi.fn(async () => false),
    upsertCustomer:              vi.fn(async () => ({ id: 'c' })),
    createAppointment:           vi.fn(async () => ({ id: 'a' })),
    getAppointmentStatus:        vi.fn(async () => null),
    updateAppointmentStatus:     vi.fn(async () => undefined),
    getAppointmentForReschedule: vi.fn(async () => null),
    updateAppointmentTime:       vi.fn(async () => undefined),
    blockDate:                   vi.fn(async () => undefined),
    unblockDate:                 vi.fn(async () => undefined),
    getAppointmentForCustomer:   vi.fn(async () => null),
  }
}

const baseInput: GetAvailableSlotsInput = {
  organizationId: 'org-1',
  barberId:       'brb-1',
  serviceId:      'svc-1',
  date:           futureDate,
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('getAvailableSlots', () => {
  it('happy path: devuelve 22 slots de 30 min para jornada 9:00–20:00', async () => {
    const repo = createFakeRepo()
    const res = await getAvailableSlots(repo, baseInput)

    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.slots).toHaveLength(22)
    // cada slot separado exactamente 30 minutos del siguiente
    for (let i = 1; i < res.slots.length; i++) {
      expect(res.slots[i]!.getTime() - res.slots[i - 1]!.getTime()).toBe(30 * 60_000)
    }
  })

  it('toma la duración del SERVICIO para calcular los slots (no un campo del input)', async () => {
    const repo = createFakeRepo({ durationMin: 60 })
    const res = await getAvailableSlots(repo, baseInput)

    // 60 min: 09:00 … 19:00 → 21 slots
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.slots).toHaveLength(21)
  })

  it('servicio no disponible → ok: false', async () => {
    const repo = createFakeRepo({ serviceExists: false })
    const res  = await getAvailableSlots(repo, baseInput)

    expect(res.ok).toBe(false)
    expect((res as { ok: false; error: string }).error).toContain('servicio')
  })

  it('barbero inactivo → ok: false', async () => {
    const repo = createFakeRepo({ barberActive: false })
    const res  = await getAvailableSlots(repo, baseInput)

    expect(res.ok).toBe(false)
    expect((res as { ok: false; error: string }).error).toContain('barbero')
  })

  it('sin horario laboral ese día → ok: true con slots vacíos', async () => {
    const repo = createFakeRepo({ workingHours: [] })
    const res  = await getAvailableSlots(repo, baseInput)

    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.slots).toHaveLength(0)
  })

  it('cita existente bloquea exactamente su slot', async () => {
    const repo = createFakeRepo()
    // obtenemos primero los slots limpios para sacar la fecha exacta del slot 5
    const clean = await getAvailableSlots(repo, baseInput)
    if (!clean.ok) throw new Error('setup failed')
    const target = clean.slots[5]!

    const busySlots: BusySlot[] = [
      { startAt: target, endAt: new Date(target.getTime() + 30 * 60_000) },
    ]
    const repoWithBusy = createFakeRepo({ busySlots })
    const res = await getAvailableSlots(repoWithBusy, baseInput)

    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.slots).toHaveLength(21)
    expect(res.slots.some((s) => s.getTime() === target.getTime())).toBe(false)
  })

  it('lanza todas las consultas al repo en paralelo (un solo batch de promesas)', async () => {
    const repo = createFakeRepo()
    await getAvailableSlots(repo, baseInput)

    // cada método del repo debe haberse llamado exactamente una vez
    expect(repo.getBookableService).toHaveBeenCalledTimes(1)
    expect(repo.isActiveBarber).toHaveBeenCalledTimes(1)
    expect(repo.getOrgTimezone).toHaveBeenCalledTimes(1)
    expect(repo.getBarberWorkingHours).toHaveBeenCalledTimes(1)
    expect(repo.getBarberBusySlots).toHaveBeenCalledTimes(1)
    // métodos ajenos al use case no deben tocarse
    expect(repo.hasConflict).not.toHaveBeenCalled()
    expect(repo.createAppointment).not.toHaveBeenCalled()
  })

  it('día bloqueado → ok: true con slots vacíos (no es un error de negocio)', async () => {
    const repo = createFakeRepo({ dateBlocked: true })
    const res  = await getAvailableSlots(repo, baseInput)

    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.slots).toHaveLength(0)
  })

  it('día bloqueado → no se llama a computeAvailableSlots (no lee working hours)', async () => {
    const repo = createFakeRepo({ dateBlocked: true })
    await getAvailableSlots(repo, baseInput)

    // isDateBlocked debe haberse consultado
    expect(repo.isDateBlocked).toHaveBeenCalledOnce()
    // working hours y busy slots SÍ se consultan (en paralelo con isDateBlocked)
    expect(repo.getBarberWorkingHours).toHaveBeenCalledOnce()
    expect(repo.getBarberBusySlots).toHaveBeenCalledOnce()
  })

  it('servicio inválido no llega al round 2 (isDateBlocked no se llama)', async () => {
    const repo = createFakeRepo({ serviceExists: false })
    await getAvailableSlots(repo, baseInput)

    // early return tras round 1 → round 2 no debe ejecutarse
    expect(repo.isDateBlocked).not.toHaveBeenCalled()
    expect(repo.getBarberWorkingHours).not.toHaveBeenCalled()
  })
})
