import { describe, it, expect, vi } from 'vitest'
import { recordCompletedVisit, type RecordCompletedVisitInput } from './record-completed-visit'
import type { LoyaltyRepository, RecordVisitInput } from '../domain/ports/loyalty-repository'

const BASE_PROGRAM: RecordCompletedVisitInput['program'] = {
  isActive:       true,
  requiredVisits: 5,
  rewardType:     'FREE_NEXT_VISIT',
  discountPct:    null,
  discountAmount: null,
  freeServiceId:  null,
}

function createFakeRepo() {
  const calls: RecordVisitInput[] = []
  const repo = {
    recordVisit: vi.fn(async (input: RecordVisitInput) => { calls.push(input) }),
  } as unknown as LoyaltyRepository

  return { repo, calls }
}

describe('recordCompletedVisit', () => {
  it('delega a repo.recordVisit con los parámetros correctos', async () => {
    const { repo, calls } = createFakeRepo()
    await recordCompletedVisit(repo, {
      organizationId: 'org-1',
      customerPhone:  '+573001112233',
      customerName:   'Juan Pérez',
      program:        BASE_PROGRAM,
    })

    expect(calls).toHaveLength(1)
    expect(calls[0]).toMatchObject({
      organizationId: 'org-1',
      customerPhone:  '+573001112233',
      customerName:   'Juan Pérez',
      requiredVisits: 5,
    })
  })

  it('pasa requiredVisits del programa al repositorio', async () => {
    const { repo, calls } = createFakeRepo()
    await recordCompletedVisit(repo, {
      organizationId: 'org-2',
      customerPhone:  '+573009998877',
      customerName:   'María López',
      program:        { ...BASE_PROGRAM, requiredVisits: 10 },
    })

    expect(calls[0]!.requiredVisits).toBe(10)
  })
})
