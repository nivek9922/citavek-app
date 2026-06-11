import 'server-only'
import { cacheTag, cacheLife } from 'next/cache'
import { db } from '@/server/db'

export const listScheduleExceptions = async (organizationId: string) => {
  'use cache'
  cacheTag(`schedule:${organizationId}`)
  cacheLife('max')
  return db.scheduleException.findMany({
    where:   { organizationId },
    orderBy: { date: 'asc' },
    select: {
      id:     true,
      date:   true,
      reason: true,
      barberId: true,
      barber: { select: { displayName: true } },
    },
  })
}

export type ScheduleExceptionDTO = Awaited<ReturnType<typeof listScheduleExceptions>>[number]
