import 'server-only'
import { db } from '@/server/db'
import { computeAvailableSlots } from './domain/slot-calculator'

export async function getAvailableSlots(params: {
  organizationId: string
  barberId:       string
  date:           Date
  timezone:       string
  durationMin:    number
}): Promise<Date[]> {
  const { organizationId, barberId, date, timezone, durationMin } = params

  const [barber, appointments] = await Promise.all([
    db.barber.findFirst({
      where: { id: barberId, organizationId, active: true },
      select: { workingHours: { select: { dayOfWeek: true, startMin: true, endMin: true } } },
    }),
    // Solo citas activas del barbero en ese día (rango amplio para cubrir TZ)
    db.appointment.findMany({
      where: {
        organizationId,
        barberId,
        status: { in: ['pending', 'confirmed'] },
        startAt: {
          gte: new Date(date.getTime() - 24 * 60 * 60_000),
          lte: new Date(date.getTime() + 48 * 60 * 60_000),
        },
      },
      select: { startAt: true, endAt: true },
    }),
  ])

  if (!barber) return []

  return computeAvailableSlots({
    date,
    timezone,
    workingHours:  barber.workingHours,
    existingSlots: appointments,
    durationMin,
  })
}
