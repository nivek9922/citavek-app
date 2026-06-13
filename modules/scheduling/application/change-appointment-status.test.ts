import { describe, it, expect, vi } from 'vitest'
import { changeAppointmentStatus } from './change-appointment-status'
import { FutureCompletionError, type AppointmentStatusValue } from '../domain/appointment'
import type { SchedulingRepository } from '../domain/ports/scheduling-repository'

const PAST   = new Date(Date.now() - 60 * 60_000) // hace 1 h
const FUTURE = new Date(Date.now() + 60 * 60_000) // dentro de 1 h

function createFakeRepo(currentStatus: AppointmentStatusValue | null, startAt: Date = PAST) {
  const updates: Array<{ id: string; status: AppointmentStatusValue; cancelledAt: Date | null }> = []

  const repo: SchedulingRepository = {
    getBookableService:      vi.fn(async () => null),
    isActiveBarber:          vi.fn(async () => true),
    listActiveBarberIds:         vi.fn(async () => []),
    findActiveBarberIdByUserId:  vi.fn(async () => null),
    hasConflict:             vi.fn(async () => false),
    upsertCustomer:          vi.fn(async () => ({ id: 'c' })),
    createAppointment:       vi.fn(async () => ({ id: 'a' })),
    getAppointmentForStatusChange: vi.fn(async () =>
      currentStatus ? { status: currentStatus, startAt } : null,
    ),
    updateAppointmentStatus: vi.fn(
      async (_org: string, id: string, status: AppointmentStatusValue, cancelledAt: Date | null) => {
        updates.push({ id, status, cancelledAt })
      },
    ),
    getOrgTimezone:              vi.fn(async () => 'America/Bogota'),
    getBarberWorkingHours:       vi.fn(async () => []),
    getBarberBusySlots:          vi.fn(async () => []),
    getAppointmentForReschedule: vi.fn(async () => null),
    updateAppointmentTime:       vi.fn(async () => undefined),
    isDateBlocked:               vi.fn(async () => false),
    blockDate:                   vi.fn(async () => undefined),
    unblockDate:                 vi.fn(async () => undefined),
    getAppointmentForCustomer:   vi.fn(async () => null),
  }
  return { repo, updates }
}

const base = { organizationId: 'org-1', appointmentId: 'apt-1' }

describe('changeAppointmentStatus', () => {
  it('aplica una transición válida (confirmed → completed)', async () => {
    const { repo, updates } = createFakeRepo('confirmed')

    await changeAppointmentStatus(repo, { ...base, newStatus: 'completed' })

    expect(updates).toHaveLength(1)
    expect(updates[0]!.status).toBe('completed')
    expect(updates[0]!.cancelledAt).toBeNull()
  })

  it('al cancelar registra cancelledAt', async () => {
    const { repo, updates } = createFakeRepo('confirmed')

    await changeAppointmentStatus(repo, { ...base, newStatus: 'cancelled' })

    expect(updates[0]!.cancelledAt).toBeInstanceOf(Date)
  })

  it('permite pending → confirmed', async () => {
    const { repo, updates } = createFakeRepo('pending')
    await changeAppointmentStatus(repo, { ...base, newStatus: 'confirmed' })
    expect(updates).toHaveLength(1)
  })

  it('rechaza una transición inválida (completed → confirmed)', async () => {
    const { repo, updates } = createFakeRepo('completed')

    await expect(
      changeAppointmentStatus(repo, { ...base, newStatus: 'confirmed' }),
    ).rejects.toThrow('Transición inválida')

    expect(updates).toHaveLength(0)
  })

  it('lanza si la cita no existe', async () => {
    const { repo } = createFakeRepo(null)

    await expect(
      changeAppointmentStatus(repo, { ...base, newStatus: 'completed' }),
    ).rejects.toThrow('Cita no encontrada')
  })

  it('rechaza completar una cita futura (protección de ingresos)', async () => {
    const { repo, updates } = createFakeRepo('confirmed', FUTURE)

    await expect(
      changeAppointmentStatus(repo, { ...base, newStatus: 'completed' }),
    ).rejects.toThrow(FutureCompletionError)

    expect(updates).toHaveLength(0)
  })

  it('permite cancelar una cita futura', async () => {
    const { repo, updates } = createFakeRepo('confirmed', FUTURE)

    await changeAppointmentStatus(repo, { ...base, newStatus: 'cancelled' })

    expect(updates).toHaveLength(1)
    expect(updates[0]!.status).toBe('cancelled')
  })

  it('permite marcar no_show en una cita futura', async () => {
    const { repo, updates } = createFakeRepo('confirmed', FUTURE)

    await changeAppointmentStatus(repo, { ...base, newStatus: 'no_show' })

    expect(updates).toHaveLength(1)
  })

  it('permite completar una cita cuyo inicio ya pasó', async () => {
    const { repo, updates } = createFakeRepo('confirmed', PAST)

    await changeAppointmentStatus(repo, { ...base, newStatus: 'completed' })

    expect(updates).toHaveLength(1)
    expect(updates[0]!.status).toBe('completed')
  })
})
