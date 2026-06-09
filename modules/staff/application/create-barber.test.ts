import { describe, it, expect, vi } from 'vitest'
import { createBarber } from './create-barber'
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

function createFakeRepo() {
  const created: Parameters<StaffRepository['create']>[] = []
  const repo: StaffRepository = {
    findById: vi.fn(async () => BASE_BARBER),
    create:   vi.fn(async (orgId, data) => { created.push([orgId, data]); return BASE_BARBER }),
    update:   vi.fn(async (_id, _org, _data: UpdateBarberData) => BASE_BARBER),
    toggle:   vi.fn(async () => undefined),
  }
  return { repo, created }
}

describe('createBarber', () => {
  it('happy path: crea barbero con horarios válidos', async () => {
    const { repo } = createFakeRepo()

    const result = await createBarber(repo, 'org-1', {
      displayName: 'Carlos', specialties: [], hours: [{ dayOfWeek: 1, startMin: 480, endMin: 720 }],
    })

    expect(repo.create).toHaveBeenCalledOnce()
    expect(result).toEqual(BASE_BARBER)
  })

  it('displayName vacío lanza, repo.create no es llamado', async () => {
    const { repo } = createFakeRepo()

    await expect(
      createBarber(repo, 'org-1', { displayName: '', specialties: [], hours: [] }),
    ).rejects.toBeInstanceOf(InvalidBarberError)

    expect(repo.create).not.toHaveBeenCalled()
  })

  it('horarios solapados lanza, repo.create no es llamado', async () => {
    const { repo } = createFakeRepo()

    await expect(
      createBarber(repo, 'org-1', {
        displayName: 'Carlos',
        specialties: [],
        hours: [
          { dayOfWeek: 1, startMin: 480, endMin: 600 },
          { dayOfWeek: 1, startMin: 540, endMin: 720 },
        ],
      }),
    ).rejects.toBeInstanceOf(InvalidBarberError)

    expect(repo.create).not.toHaveBeenCalled()
  })

  it('horario inicio >= fin lanza', async () => {
    const { repo } = createFakeRepo()

    await expect(
      createBarber(repo, 'org-1', {
        displayName: 'Carlos',
        specialties: [],
        hours: [{ dayOfWeek: 1, startMin: 720, endMin: 480 }],
      }),
    ).rejects.toBeInstanceOf(InvalidBarberError)

    expect(repo.create).not.toHaveBeenCalled()
  })

  it('sin horarios (lista vacía) es válido: crea sin horarios', async () => {
    const { repo, created } = createFakeRepo()

    await createBarber(repo, 'org-1', { displayName: 'Carlos', specialties: [], hours: [] })

    expect(repo.create).toHaveBeenCalledOnce()
    expect(created[0]?.[1].hours).toHaveLength(0)
  })

  it('pasa organizationId correcto al repo.create', async () => {
    const { repo, created } = createFakeRepo()

    await createBarber(repo, 'org-99', { displayName: 'Ana', specialties: ['colorista'], hours: [] })

    expect(created[0]?.[0]).toBe('org-99')
  })
})
