import { describe, it, expect, vi } from 'vitest'
import { cancelAppointmentByCustomer, type CancelByCustomerInput } from './cancel-appointment-by-customer'
import type { SchedulingRepository, CustomerAppointment } from '../domain/ports/scheduling-repository'

// ── Fake repo ────────────────────────────────────────────────────────────────

const BASE_APT: CustomerAppointment = {
  id:             'apt-1',
  organizationId: 'org-1',
  status:         'confirmed',
  startAt:        new Date(Date.now() + 3 * 60 * 60_000), // 3h en el futuro
  endAt:          new Date(Date.now() + 3 * 60 * 60_000 + 30 * 60_000),
  customerName:   'Juan Pérez',
  services:       [{ name: 'Corte Clásico', durationMin: 30, priceCop: 25000 }],
  durationMin:    30,
  priceCop:       25000,
  barber:         { displayName: 'Carlos Ramírez', nickname: 'Carlitos' },
  organization:   { name: 'San Fernando', slug: 'san-fernando', timezone: 'America/Bogota', phone: '+573187654321' },
}

function createFakeRepo(apt: CustomerAppointment | null = BASE_APT) {
  const cancelled: string[] = []

  const repo: SchedulingRepository = {
    getAppointmentForCustomer: vi.fn(async () => apt),
    updateAppointmentStatus:   vi.fn(async (_org, id) => { cancelled.push(id) }),
    // stubs
    getBookableServices:     vi.fn(async () => []),
    isActiveBarber:              vi.fn(async () => true),
    listActiveBarberIds:         vi.fn(async () => []),
    findActiveBarberIdByUserId:  vi.fn(async () => null),
    hasConflict:                 vi.fn(async () => false),
    upsertCustomer:              vi.fn(async () => ({ id: 'c' })),
    createAppointment:           vi.fn(async () => ({ id: 'a' })),
    getAppointmentForStatusChange: vi.fn(async () => null),
    getOrgTimezone:              vi.fn(async () => 'America/Bogota'),
    getBarberWorkingHours:       vi.fn(async () => []),
    getBarberBusySlots:          vi.fn(async () => []),
    getAppointmentForReschedule: vi.fn(async () => null),
    updateAppointmentTime:       vi.fn(async () => undefined),
    isDateBlocked:               vi.fn(async () => false),
    blockDate:                   vi.fn(async () => undefined),
    unblockDate:                 vi.fn(async () => undefined),
    markRedemptionFailed:        vi.fn(async () => undefined),
  }
  return { repo, cancelled }
}

const base: CancelByCustomerInput = {
  appointmentId: 'apt-1',
  customerPhone: '+573187654321',
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('cancelAppointmentByCustomer', () => {
  it('cancela una cita confirmed con suficiente antelación', async () => {
    const { repo, cancelled } = createFakeRepo()

    const res = await cancelAppointmentByCustomer(repo, base)

    expect(res.ok).toBe(true)
    expect(cancelled).toContain('apt-1')
    expect(repo.updateAppointmentStatus).toHaveBeenCalledWith(
      'org-1', 'apt-1', 'cancelled', expect.any(Date),
    )
  })

  it('cancela una cita pending', async () => {
    const { repo } = createFakeRepo({ ...BASE_APT, status: 'pending' })

    const res = await cancelAppointmentByCustomer(repo, base)

    expect(res.ok).toBe(true)
  })

  it('rechaza si el teléfono no coincide (getAppointmentForCustomer devuelve null)', async () => {
    const { repo, cancelled } = createFakeRepo(null)

    const res = await cancelAppointmentByCustomer(repo, base)

    expect(res.ok).toBe(false)
    expect((res as { ok: false; error: string }).error).toContain('teléfono')
    expect(cancelled).toHaveLength(0)
  })

  it('rechaza si la cita ya está completada', async () => {
    const { repo, cancelled } = createFakeRepo({ ...BASE_APT, status: 'completed' })

    const res = await cancelAppointmentByCustomer(repo, base)

    expect(res.ok).toBe(false)
    expect((res as { ok: false; error: string }).error).toContain('completada')
    expect(cancelled).toHaveLength(0)
  })

  it('rechaza si la cita ya estaba cancelada', async () => {
    const { repo, cancelled } = createFakeRepo({ ...BASE_APT, status: 'cancelled' })

    const res = await cancelAppointmentByCustomer(repo, base)

    expect(res.ok).toBe(false)
    expect((res as { ok: false; error: string }).error).toContain('cancelada')
    expect(cancelled).toHaveLength(0)
  })

  it('rechaza si quedan menos de 60 minutos para la cita', async () => {
    const { repo, cancelled } = createFakeRepo({
      ...BASE_APT,
      startAt: new Date(Date.now() + 30 * 60_000), // solo 30 min
      endAt:   new Date(Date.now() + 60 * 60_000),
    })

    const res = await cancelAppointmentByCustomer(repo, base)

    expect(res.ok).toBe(false)
    expect((res as { ok: false; error: string }).error).toContain('60 minutos')
    expect(cancelled).toHaveLength(0)
  })

  it('acepta cancelar exactamente con 61 minutos de antelación', async () => {
    const { repo } = createFakeRepo({
      ...BASE_APT,
      startAt: new Date(Date.now() + 61 * 60_000),
      endAt:   new Date(Date.now() + 91 * 60_000),
    })

    const res = await cancelAppointmentByCustomer(repo, base)

    expect(res.ok).toBe(true)
  })
})
