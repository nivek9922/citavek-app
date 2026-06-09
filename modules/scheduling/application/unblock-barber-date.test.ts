import { describe, it, expect, vi } from 'vitest'
import { unblockBarberDate, type UnblockBarberDateInput } from './unblock-barber-date'
import type { SchedulingRepository } from '../domain/ports/scheduling-repository'

function createFakeRepo() {
  const unblocked: Array<{ orgId: string; barberId: string | null; dateStr: string }> = []

  const repo: SchedulingRepository = {
    unblockDate: vi.fn(async (orgId, barberId, dateStr) => { unblocked.push({ orgId, barberId, dateStr }) }),
    // stubs
    isActiveBarber:              vi.fn(async () => true),
    getBookableService:          vi.fn(async () => null),
    hasConflict:                 vi.fn(async () => false),
    upsertCustomer:              vi.fn(async () => ({ id: 'c' })),
    createAppointment:           vi.fn(async () => ({ id: 'a' })),
    getAppointmentForStatusChange: vi.fn(async () => null),
    updateAppointmentStatus:     vi.fn(async () => undefined),
    getOrgTimezone:              vi.fn(async () => 'America/Bogota'),
    getBarberWorkingHours:       vi.fn(async () => []),
    getBarberBusySlots:          vi.fn(async () => []),
    getAppointmentForReschedule: vi.fn(async () => null),
    updateAppointmentTime:       vi.fn(async () => undefined),
    isDateBlocked:               vi.fn(async () => false),
    blockDate:                   vi.fn(async () => undefined),
    getAppointmentForCustomer:   vi.fn(async () => null),
  }
  return { repo, unblocked }
}

const base: UnblockBarberDateInput = {
  organizationId: 'org-1',
  barberId:       'brb-1',
  dateStr:        '2025-12-25',
}

describe('unblockBarberDate', () => {
  it('desbloquea un día para un barbero', async () => {
    const { repo, unblocked } = createFakeRepo()

    const res = await unblockBarberDate(repo, base)

    expect(res.ok).toBe(true)
    expect(unblocked).toHaveLength(1)
    expect(unblocked[0]!).toMatchObject({ orgId: 'org-1', barberId: 'brb-1', dateStr: '2025-12-25' })
  })

  it('desbloquea un día de la organización (barberId = null)', async () => {
    const { repo, unblocked } = createFakeRepo()

    const res = await unblockBarberDate(repo, { ...base, barberId: null })

    expect(res.ok).toBe(true)
    expect(unblocked[0]!.barberId).toBeNull()
  })

  it('no falla si el día no estaba bloqueado (idempotente)', async () => {
    const { repo } = createFakeRepo()

    const res = await unblockBarberDate(repo, base)

    expect(res.ok).toBe(true)
    expect(repo.unblockDate).toHaveBeenCalledOnce()
  })

  it('rechaza formato de fecha inválido', async () => {
    const { repo, unblocked } = createFakeRepo()

    const res = await unblockBarberDate(repo, { ...base, dateStr: '2025/12/25' })

    expect(res.ok).toBe(false)
    expect(unblocked).toHaveLength(0)
  })
})
