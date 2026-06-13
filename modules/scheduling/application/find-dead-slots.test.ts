import { describe, it, expect, vi } from 'vitest'
import { findDeadSlots, DEAD_SLOT_THRESHOLD_MIN } from './find-dead-slots'
import type { SchedulingRepository, WorkingHourInput, BusySlot } from '../domain/ports/scheduling-repository'

// Jornada Lun-Vie 09:00–20:00 (660 min/día)
const weekdayHours: WorkingHourInput[] = [1, 2, 3, 4, 5].map((d) => ({
  dayOfWeek: d,
  startMin:  540,   // 09:00
  endMin:    1200,  // 20:00
}))

// startFrom: domingo 15 Jun 2025 a mediodía UTC.
// addDays(startFrom, 1) → lunes 16 Jun → dow=1 → tiene horario.
const SUNDAY_NOON_UTC = new Date('2025-06-15T12:00:00Z')

// startFrom que produce un domingo como day+1 (sin horario laboral).
// Sábado 21 Jun 2025 mediodía UTC → day+1 = domingo 22 Jun.
const SATURDAY_NOON_UTC = new Date('2025-06-21T12:00:00Z')

// ── Fake repo ────────────────────────────────────────────────────────────────

interface FakeOptions {
  barberIds?:    string[]
  timezone?:     string
  workingHours?: WorkingHourInput[]
  busySlots?:    BusySlot[]
  isBlocked?:    boolean
}

function createFakeRepo(opts: FakeOptions = {}): SchedulingRepository {
  const {
    barberIds    = ['b1'],
    timezone     = 'America/Bogota',
    workingHours = weekdayHours,
    busySlots    = [],
    isBlocked    = false,
  } = opts

  return {
    getOrgTimezone:                vi.fn(async () => timezone),
    listActiveBarberIds:           vi.fn(async () => barberIds),
    findActiveBarberIdByUserId:    vi.fn(async () => null),
    getBarberWorkingHours:         vi.fn(async () => workingHours),
    getBarberBusySlots:            vi.fn(async () => busySlots),
    isDateBlocked:                 vi.fn(async () => isBlocked),
    // métodos no usados por este use case
    getBookableService:            vi.fn(async () => null),
    isActiveBarber:                vi.fn(async () => true),
    hasConflict:                   vi.fn(async () => false),
    upsertCustomer:                vi.fn(async () => ({ id: 'c' })),
    createAppointment:             vi.fn(async () => ({ id: 'a' })),
    getAppointmentForStatusChange: vi.fn(async () => null),
    updateAppointmentStatus:       vi.fn(async () => undefined),
    getAppointmentForReschedule:   vi.fn(async () => null),
    updateAppointmentTime:         vi.fn(async () => undefined),
    blockDate:                     vi.fn(async () => undefined),
    unblockDate:                   vi.fn(async () => undefined),
    getAppointmentForCustomer:     vi.fn(async () => null),
  }
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('findDeadSlots', () => {
  it('sin barberos activos → retorna vacío sin consultar working hours', async () => {
    const repo = createFakeRepo({ barberIds: [] })
    const res  = await findDeadSlots(repo, 'org', 1, SUNDAY_NOON_UTC)

    expect(res).toHaveLength(0)
    expect(repo.getBarberWorkingHours).not.toHaveBeenCalled()
  })

  it('jornada totalmente libre → día incluido con totalFreeMin = 660', async () => {
    const repo = createFakeRepo()
    const res  = await findDeadSlots(repo, 'org', 1, SUNDAY_NOON_UTC)

    expect(res).toHaveLength(1)
    expect(res[0]!.totalFreeMin).toBe(660)
    expect(res[0]!.barbers[0]!.workingMin).toBe(660)
    expect(res[0]!.barbers[0]!.freeMin).toBe(660)
  })

  it('día sin horario laboral (domingo) → no aparece en resultados', async () => {
    // day+1 desde sábado = domingo, dow=0, sin horario en weekdayHours
    const repo = createFakeRepo()
    const res  = await findDeadSlots(repo, 'org', 1, SATURDAY_NOON_UTC)

    expect(res).toHaveLength(0)
  })

  it('día bloqueado → no aparece en resultados', async () => {
    const repo = createFakeRepo({ isBlocked: true })
    const res  = await findDeadSlots(repo, 'org', 1, SUNDAY_NOON_UTC)

    expect(res).toHaveLength(0)
  })

  it('agenda llena (busyMin >= workingMin) → freeMin=0, no aparece', async () => {
    // 660 min de citas cubre toda la jornada
    const busySlots: BusySlot[] = [
      { startAt: new Date(0), endAt: new Date(660 * 60_000) },
    ]
    const repo = createFakeRepo({ busySlots })
    const res  = await findDeadSlots(repo, 'org', 1, SUNDAY_NOON_UTC)

    expect(res).toHaveLength(0)
  })

  it(`freeMin por debajo del threshold (${DEAD_SLOT_THRESHOLD_MIN} min) → barbero excluido`, async () => {
    // 600 min de citas → 60 min libres < 90 threshold
    const busySlots: BusySlot[] = [
      { startAt: new Date(0), endAt: new Date(600 * 60_000) },
    ]
    const repo = createFakeRepo({ busySlots })
    const res  = await findDeadSlots(repo, 'org', 1, SUNDAY_NOON_UTC)

    expect(res).toHaveLength(0)
  })

  it('freeMin en exactamente el threshold → barbero incluido', async () => {
    // 570 min de citas → 90 min libres = threshold exacto
    const busySlots: BusySlot[] = [
      { startAt: new Date(0), endAt: new Date(570 * 60_000) },
    ]
    const repo = createFakeRepo({ busySlots })
    const res  = await findDeadSlots(repo, 'org', 1, SUNDAY_NOON_UTC)

    expect(res).toHaveLength(1)
    expect(res[0]!.barbers[0]!.freeMin).toBe(90)
  })

  it('daysAhead = 5 desde domingo → 5 días laborables (lun–vie)', async () => {
    const repo = createFakeRepo()
    const res  = await findDeadSlots(repo, 'org', 5, SUNDAY_NOON_UTC)

    // Lun, Mar, Mié, Jue, Vie — todos con horario
    expect(res).toHaveLength(5)
    // Las fechas deben ser consecutivas
    const dates = res.map((d) => d.date)
    expect(dates).toEqual(['2025-06-16', '2025-06-17', '2025-06-18', '2025-06-19', '2025-06-20'])
  })

  it('varios barberos: working hours se cargan 1 vez por barbero; busy/blocked por día', async () => {
    const repo = createFakeRepo({ barberIds: ['b1', 'b2', 'b3'] })
    await findDeadSlots(repo, 'org', 2, SUNDAY_NOON_UTC)

    // Working hours son estáticos → 1 fetch por barbero (no por día)
    expect(repo.getBarberWorkingHours).toHaveBeenCalledTimes(3)
    // Busy slots y bloqueos cambian por día → 3 barberos × 2 días = 6 llamadas
    expect(repo.getBarberBusySlots).toHaveBeenCalledTimes(6)
    expect(repo.isDateBlocked).toHaveBeenCalledTimes(6)
  })

  it('totalFreeMin suma solo los barberos con freeMin >= threshold', async () => {
    // b1: libre (660 min), b2: al límite (90 min), b3: < threshold
    const barb3Busy: BusySlot[] = [{ startAt: new Date(0), endAt: new Date(600 * 60_000) }]

    const repo: SchedulingRepository = {
      ...createFakeRepo({ barberIds: ['b1', 'b2', 'b3'] }),
      getBarberBusySlots: vi.fn(async (_org, barberId) => {
        if (barberId === 'b2') return [{ startAt: new Date(0), endAt: new Date(570 * 60_000) }]
        if (barberId === 'b3') return barb3Busy
        return []
      }),
    }

    const res = await findDeadSlots(repo, 'org', 1, SUNDAY_NOON_UTC)
    expect(res).toHaveLength(1)
    // b3 excluido (60 min libres < 90), b1=660, b2=90 → total=750
    expect(res[0]!.barbers).toHaveLength(2)
    expect(res[0]!.totalFreeMin).toBe(750)
  })

  it('dateStr devuelto corresponde al día en TZ del tenant (no UTC)', async () => {
    const repo = createFakeRepo()
    const res  = await findDeadSlots(repo, 'org', 1, SUNDAY_NOON_UTC)

    // Lunes 16 Jun 2025 en Bogota
    expect(res[0]!.date).toBe('2025-06-16')
  })
})
