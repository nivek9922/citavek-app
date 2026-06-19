import { describe, it, expect, vi } from 'vitest'
import { blockBarberDate, type BlockBarberDateInput } from './block-barber-date'
import type { SchedulingRepository } from '../domain/ports/scheduling-repository'

function createFakeRepo(opts: { barberActive?: boolean } = {}) {
  const blocked: Array<{ orgId: string; barberId: string | null; dateStr: string; reason?: string | null }> = []

  const repo: SchedulingRepository = {
    isActiveBarber:  vi.fn(async () => opts.barberActive ?? true),
    listActiveBarberIds:         vi.fn(async () => []),
    findActiveBarberIdByUserId:  vi.fn(async () => null),
    blockDate:       vi.fn(async (orgId, barberId, dateStr, reason) => { blocked.push({ orgId, barberId, dateStr, reason }) }),
    // stubs
    getBookableServices:     vi.fn(async () => []),
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
    unblockDate:                 vi.fn(async () => undefined),
    getAppointmentForCustomer:   vi.fn(async () => null),
    markRedemptionFailed:        vi.fn(async () => undefined),
  }
  return { repo, blocked }
}

const base: BlockBarberDateInput = {
  organizationId: 'org-1',
  barberId:       'brb-1',
  dateStr:        '2025-12-25',
}

describe('blockBarberDate', () => {
  it('bloquea un día para un barbero activo', async () => {
    const { repo, blocked } = createFakeRepo()

    const res = await blockBarberDate(repo, base)

    expect(res.ok).toBe(true)
    expect(blocked).toHaveLength(1)
    expect(blocked[0]!).toMatchObject({ dateStr: '2025-12-25', barberId: 'brb-1' })
  })

  it('bloquea un día para toda la organización (barberId = null)', async () => {
    const { repo, blocked } = createFakeRepo()

    const res = await blockBarberDate(repo, { ...base, barberId: null })

    expect(res.ok).toBe(true)
    expect(blocked[0]!.barberId).toBeNull()
    // no debe verificar si hay barbero activo cuando es bloqueo de org
    expect(repo.isActiveBarber).not.toHaveBeenCalled()
  })

  it('guarda el motivo cuando se proporciona', async () => {
    const { repo, blocked } = createFakeRepo()

    await blockBarberDate(repo, { ...base, reason: 'Festivo nacional' })

    expect(blocked[0]!.reason).toBe('Festivo nacional')
  })

  it('rechaza si el barbero no pertenece a la org', async () => {
    const { repo, blocked } = createFakeRepo({ barberActive: false })

    const res = await blockBarberDate(repo, base)

    expect(res.ok).toBe(false)
    expect((res as { ok: false; error: string }).error).toContain('barbero')
    expect(blocked).toHaveLength(0)
  })

  it('rechaza formato de fecha inválido', async () => {
    const { repo, blocked } = createFakeRepo()

    const res = await blockBarberDate(repo, { ...base, dateStr: '25/12/2025' })

    expect(res.ok).toBe(false)
    expect((res as { ok: false; error: string }).error).toContain('YYYY-MM-DD')
    expect(blocked).toHaveLength(0)
  })
})
