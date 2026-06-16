/**
 * Tenant Isolation Contract Test
 *
 * Verifica que el adaptador Prisma SIEMPRE incluye organizationId en sus
 * cláusulas WHERE. Ninguna query puede devolver datos de otro tenant.
 *
 * Estrategia: vi.hoisted + vi.mock interceptan las llamadas a Prisma sin DB real.
 * Nota sobre hoisting: vi.mock() se eleva al tope del archivo en tiempo de compilación;
 * por eso las variables del mock deben declararse con vi.hoisted() para ser accesibles
 * tanto en la factory de vi.mock como en los propios tests.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SlotConflictError } from '../domain/appointment'
import type { NewAppointment } from '../domain/ports/scheduling-repository'

// ── Mock de Prisma (vi.hoisted garantiza que mockDb existe cuando vi.mock se ejecuta) ──
const mockDb = vi.hoisted(() => ({
  service: {
    findFirst: vi.fn(async () => null),
    findMany:  vi.fn(async () => []),
  },
  barber: {
    findFirst: vi.fn(async () => null),
    findMany:  vi.fn(async () => []),
  },
  appointment: {
    findFirst:  vi.fn(async (): Promise<Record<string, unknown> | null> => null),
    findMany:   vi.fn(async () => []),
    create:     vi.fn(async () => ({ id: 'apt-new' })),
    updateMany: vi.fn(async () => ({ count: 1 })),
  },
  customer: {
    upsert: vi.fn(async () => ({ id: 'cust-1' })),
  },
  organization: {
    findUnique: vi.fn(async () => ({ timezone: 'America/Bogota' })),
  },
  workingHour: {
    findMany: vi.fn(async () => []),
  },
  scheduleException: {
    findFirst:   vi.fn(async () => null),
    upsert:      vi.fn(async () => ({ id: 'exc-1' })),
    create:      vi.fn(async () => ({ id: 'exc-new' })),
    update:      vi.fn(async () => ({ id: 'exc-1' })),
    deleteMany:  vi.fn(async () => ({ count: 0 })),
  },
  // createAppointment / updateAppointmentTime corren en una transacción interactiva
  // con advisory lock; el mock ejecuta el callback pasando el propio mockDb como tx.
  $executeRaw:  vi.fn(async () => 0),
  $transaction: vi.fn(async (cb: (tx: unknown) => unknown) => cb(mockDb)),
}))

vi.mock('@/server/db', () => ({ db: mockDb }))

// Importar el adaptador DESPUÉS del mock (dynamic import para respetar el orden)
const { prismaSchedulingRepository: repo } =
  await import('./prisma-scheduling-repository')

const ORG_A = 'org-a-uuid'
const ORG_B = 'org-b-uuid'

type MockCall = Record<string, unknown>

function lastWhere(mockFn: ReturnType<typeof vi.fn>): Record<string, unknown> | undefined {
  const calls = mockFn.mock.calls as unknown as [MockCall, ...unknown[]][]
  return calls.at(-1)?.[0]?.where as Record<string, unknown> | undefined
}

function lastCallWhere(mockFn: ReturnType<typeof vi.fn>): Record<string, unknown> | undefined {
  const calls = mockFn.mock.calls as unknown as [MockCall, ...unknown[]][]
  return calls.at(-1)?.[0]?.where as Record<string, unknown> | undefined
}

beforeEach(() => { vi.clearAllMocks() })

// ── Tests ────────────────────────────────────────────────────────────────────

describe('PrismaSchedulingRepository — tenant isolation', () => {

  it('getBookableServices filtra por organizationId', async () => {
    await repo.getBookableServices(ORG_A, ['svc-1'])
    const where = lastWhere(mockDb.service.findMany)
    expect(where).toMatchObject({ organizationId: ORG_A })
    expect(where?.organizationId).not.toBe(ORG_B)
  })

  it('isActiveBarber filtra por organizationId', async () => {
    await repo.isActiveBarber(ORG_A, 'brb-1')
    const where = lastWhere(mockDb.barber.findFirst)
    expect(where).toMatchObject({ organizationId: ORG_A })
  })

  it('listActiveBarberIds filtra por organizationId', async () => {
    await repo.listActiveBarberIds(ORG_A)
    const where = lastWhere(mockDb.barber.findMany)
    expect(where).toMatchObject({ organizationId: ORG_A, active: true })
  })

  it('hasConflict filtra por organizationId', async () => {
    const start = new Date()
    const end   = new Date(start.getTime() + 30 * 60_000)
    await repo.hasConflict(ORG_A, 'brb-1', start, end)
    const where = lastWhere(mockDb.appointment.findFirst)
    expect(where).toMatchObject({ organizationId: ORG_A })
  })

  it('hasConflict con excludeId NO omite el organizationId', async () => {
    const start = new Date()
    const end   = new Date(start.getTime() + 30 * 60_000)
    await repo.hasConflict(ORG_A, 'brb-1', start, end, 'apt-exclude')
    const where = lastWhere(mockDb.appointment.findFirst)
    expect(where).toMatchObject({ organizationId: ORG_A })
  })

  it('getAppointmentForStatusChange filtra por organizationId', async () => {
    await repo.getAppointmentForStatusChange(ORG_A, 'apt-1')
    const where = lastWhere(mockDb.appointment.findFirst)
    expect(where).toMatchObject({ organizationId: ORG_A })
  })

  it('updateAppointmentStatus filtra por organizationId', async () => {
    await repo.updateAppointmentStatus(ORG_A, 'apt-1', 'confirmed', null)
    const where = lastCallWhere(mockDb.appointment.updateMany)
    expect(where).toMatchObject({ organizationId: ORG_A })
  })

  it('getOrgTimezone busca por id de organización', async () => {
    await repo.getOrgTimezone(ORG_A)
    const calls = mockDb.organization.findUnique.mock.calls as unknown as [{ where: Record<string, unknown> }][]
    const where = calls.at(-1)?.[0]?.where
    expect(where).toMatchObject({ id: ORG_A })
  })

  it('getBarberWorkingHours filtra por barber.organizationId (relación)', async () => {
    await repo.getBarberWorkingHours(ORG_A, 'brb-1')
    const where = lastCallWhere(mockDb.workingHour.findMany)
    expect(where).toMatchObject({ barber: { organizationId: ORG_A } })
  })

  it('getAppointmentForReschedule filtra por organizationId', async () => {
    await repo.getAppointmentForReschedule(ORG_A, 'apt-1')
    const where = lastWhere(mockDb.appointment.findFirst)
    expect(where).toMatchObject({ organizationId: ORG_A })
  })

  it('updateAppointmentTime filtra por organizationId', async () => {
    // 1ª findFirst = lookup de la cita (devuelve barberId); 2ª = re-chequeo de solape (sin conflicto)
    mockDb.appointment.findFirst
      .mockResolvedValueOnce({ barberId: 'brb-1' })
      .mockResolvedValueOnce(null)
    await repo.updateAppointmentTime(ORG_A, 'apt-1', new Date(), new Date())
    const where = lastCallWhere(mockDb.appointment.updateMany)
    expect(where).toMatchObject({ organizationId: ORG_A })
  })

  it('getBarberBusySlots filtra por organizationId', async () => {
    await repo.getBarberBusySlots(ORG_A, 'brb-1', new Date())
    const where = lastCallWhere(mockDb.appointment.findMany)
    expect(where).toMatchObject({ organizationId: ORG_A })
  })

  it('dos orgs diferentes no comparten queries — ORG_A y ORG_B producen wheres distintos', async () => {
    await repo.getBookableServices(ORG_A, ['svc-x'])
    const whereA = lastWhere(mockDb.service.findMany)?.organizationId

    await repo.getBookableServices(ORG_B, ['svc-x'])
    const whereB = lastWhere(mockDb.service.findMany)?.organizationId

    expect(whereA).toBe(ORG_A)
    expect(whereB).toBe(ORG_B)
    expect(whereA).not.toBe(whereB)
  })

  it('isDateBlocked filtra por organizationId', async () => {
    await repo.isDateBlocked(ORG_A, 'brb-1', '2025-12-25')
    const where = lastWhere(mockDb.scheduleException.findFirst)
    expect(where).toMatchObject({ organizationId: ORG_A })
  })

  it('blockDate incluye organizationId al crear la excepción', async () => {
    // findFirst (default null) → no existe → camino create
    await repo.blockDate(ORG_A, 'brb-1', '2025-12-25', null)
    const call = (mockDb.scheduleException.create.mock.calls as unknown as [{ data: Record<string, unknown> }][]).at(-1)?.[0]
    expect(call?.data).toMatchObject({ organizationId: ORG_A })
  })

  it('unblockDate filtra por organizationId', async () => {
    await repo.unblockDate(ORG_A, 'brb-1', '2025-12-25')
    const where = lastCallWhere(mockDb.scheduleException.deleteMany)
    expect(where).toMatchObject({ organizationId: ORG_A })
  })
})

// ── Atomicidad anti doble-booking (C-1) ───────────────────────────────────────

describe('PrismaSchedulingRepository — atomicidad de reservas', () => {
  const baseAppointment: NewAppointment = {
    organizationId: ORG_A,
    services:       [{ serviceId: 'svc-1', priceCop: 25000, durationMin: 30 }],
    barberId:       'brb-1',
    customerId:     'cust-1',
    customerName:   'Ana',
    customerPhone:  '+573001112233',
    startAt:        new Date('2026-07-01T14:00:00Z'),
    endAt:          new Date('2026-07-01T14:30:00Z'),
    durationMin:    30,
    priceCop:       25000,
    status:         'confirmed',
    source:         'online',
  }

  it('createAppointment corre dentro de una transacción con advisory lock', async () => {
    mockDb.appointment.findFirst.mockResolvedValueOnce(null) // re-chequeo: sin solape
    await repo.createAppointment(baseAppointment)
    expect(mockDb.$transaction).toHaveBeenCalledOnce()
    expect(mockDb.$executeRaw).toHaveBeenCalled() // pg_advisory_xact_lock
    expect(mockDb.appointment.create).toHaveBeenCalledOnce()
  })

  it('createAppointment lanza SlotConflictError si la re-verificación detecta solape', async () => {
    mockDb.appointment.findFirst.mockResolvedValueOnce({ id: 'apt-existing' }) // solape
    await expect(repo.createAppointment(baseAppointment)).rejects.toBeInstanceOf(SlotConflictError)
    expect(mockDb.appointment.create).not.toHaveBeenCalled() // no insertó la segunda cita
  })

  it('updateAppointmentTime lanza SlotConflictError si el nuevo horario se solapa', async () => {
    mockDb.appointment.findFirst
      .mockResolvedValueOnce({ barberId: 'brb-1' }) // lookup de la cita
      .mockResolvedValueOnce({ id: 'apt-other' })   // re-chequeo: solape
    await expect(
      repo.updateAppointmentTime(ORG_A, 'apt-1', new Date(), new Date()),
    ).rejects.toBeInstanceOf(SlotConflictError)
    expect(mockDb.appointment.updateMany).not.toHaveBeenCalled()
  })
})
