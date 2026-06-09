import { describe, it, expect, vi } from 'vitest'
import { toggleBarber } from './toggle-barber'
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
  const toggled: boolean[] = []
  const repo: StaffRepository = {
    findById: vi.fn(async () => existing),
    create:   vi.fn(async () => BASE_BARBER),
    update:   vi.fn(async (_id, _org, _data: UpdateBarberData) => BASE_BARBER),
    toggle:   vi.fn(async (_id, _org, active) => { toggled.push(active) }),
  }
  return { repo, toggled }
}

describe('toggleBarber', () => {
  it('toggle a inactivo llama repo.toggle con active=false', async () => {
    const { repo, toggled } = createFakeRepo()

    await toggleBarber(repo, 'brb-1', 'org-1', false)

    expect(repo.toggle).toHaveBeenCalledWith('brb-1', 'org-1', false)
    expect(toggled).toEqual([false])
  })

  it('toggle a activo llama repo.toggle con active=true', async () => {
    const { repo, toggled } = createFakeRepo({ ...BASE_BARBER, active: false })

    await toggleBarber(repo, 'brb-1', 'org-1', true)

    expect(toggled).toEqual([true])
  })

  it('barbero no encontrado lanza y repo.toggle no es llamado', async () => {
    const { repo } = createFakeRepo(null)

    await expect(toggleBarber(repo, 'brb-x', 'org-1', false))
      .rejects.toBeInstanceOf(InvalidBarberError)

    expect(repo.toggle).not.toHaveBeenCalled()
  })
})
