import { describe, it, expect, vi } from 'vitest'
import { updateBarber } from './update-barber'
import type { StaffRepository } from '../domain/ports/staff-repository'
import type { Barber, UpdateBarberData } from '../domain/barber'
import { InvalidBarberError } from '../domain/barber'

const BASE_BARBER: Barber = {
  id:             'brb-1',
  organizationId: 'org-1',
  displayName:    'Carlos López',
  nickname:       null,
  specialties:    [],
  active:         true,
  rating:         0,
  reviewsCount:   0,
}

function createFakeRepo(existing: Barber | null = BASE_BARBER) {
  const updated: UpdateBarberData[] = []
  const repo: StaffRepository = {
    findById: vi.fn(async () => existing),
    create:   vi.fn(async () => BASE_BARBER),
    update:   vi.fn(async (_id, _org, data) => { updated.push(data); return { ...BASE_BARBER, ...data } }),
    toggle:   vi.fn(async () => undefined),
  }
  return { repo, updated }
}

describe('updateBarber', () => {
  it('happy path: findById → validar → repo.update', async () => {
    const { repo } = createFakeRepo()

    const result = await updateBarber(repo, 'brb-1', 'org-1', { displayName: 'Carlos Actualizado' })

    expect(repo.findById).toHaveBeenCalledWith('brb-1', 'org-1')
    expect(repo.update).toHaveBeenCalledOnce()
    expect(result.displayName).toBe('Carlos Actualizado')
  })

  it('barbero no encontrado lanza InvalidBarberError', async () => {
    const { repo } = createFakeRepo(null)

    await expect(updateBarber(repo, 'brb-x', 'org-1', { displayName: 'Nuevo' }))
      .rejects.toBeInstanceOf(InvalidBarberError)

    expect(repo.update).not.toHaveBeenCalled()
  })

  it('horarios nuevos solapados lanza y no persiste', async () => {
    const { repo } = createFakeRepo()

    await expect(
      updateBarber(repo, 'brb-1', 'org-1', {
        hours: [
          { dayOfWeek: 1, startMin: 480, endMin: 600 },
          { dayOfWeek: 1, startMin: 540, endMin: 720 },
        ],
      }),
    ).rejects.toBeInstanceOf(InvalidBarberError)

    expect(repo.update).not.toHaveBeenCalled()
  })

  it('hours undefined: no valida horarios (actualización parcial sin horas)', async () => {
    const { repo } = createFakeRepo()

    await updateBarber(repo, 'brb-1', 'org-1', { displayName: 'Carlos' })

    expect(repo.update).toHaveBeenCalledOnce()
  })

  it('displayName undefined: no valida nombre (actualización parcial sin nombre)', async () => {
    const { repo } = createFakeRepo()

    await updateBarber(repo, 'brb-1', 'org-1', {
      hours: [{ dayOfWeek: 1, startMin: 480, endMin: 720 }],
    })

    expect(repo.update).toHaveBeenCalledOnce()
  })

  it('displayName vacío explícito lanza', async () => {
    const { repo } = createFakeRepo()

    await expect(updateBarber(repo, 'brb-1', 'org-1', { displayName: '' }))
      .rejects.toBeInstanceOf(InvalidBarberError)

    expect(repo.update).not.toHaveBeenCalled()
  })
})
