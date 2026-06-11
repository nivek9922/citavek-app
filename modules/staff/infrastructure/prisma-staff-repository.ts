import { db } from '@/server/db'
import type { StaffRepository } from '../domain/ports/staff-repository'
import type { CreateBarberData, UpdateBarberData } from '../domain/barber'
import { InvalidBarberError } from '../domain/barber'

export const prismaStaffRepository: StaffRepository = {
  async findById(id, organizationId) {
    return db.barber.findFirst({ where: { id, organizationId } })
  },

  async create(organizationId, data: CreateBarberData) {
    return db.$transaction(async (tx) => {
      const barber = await tx.barber.create({
        data: {
          organizationId,
          displayName: data.displayName,
          nickname:    data.nickname ?? null,
          specialties: data.specialties,
          avatarUrl:   data.avatarUrl ?? null,
          active:      true,
        },
      })
      if (data.hours.length > 0) {
        await tx.workingHour.createMany({
          data: data.hours.map((h) => ({ barberId: barber.id, ...h })),
        })
      }
      return barber
    })
  },

  async update(id, organizationId, data: UpdateBarberData) {
    return db.$transaction(async (tx) => {
      // updateMany permite WHERE compuesto: el tenant scoping va en la propia
      // query, no solo en checks previos del use case (defensa en profundidad).
      const { count } = await tx.barber.updateMany({
        where: { id, organizationId },
        data: {
          ...(data.displayName !== undefined && { displayName: data.displayName }),
          ...(data.nickname    !== undefined && { nickname:    data.nickname }),
          ...(data.specialties !== undefined && { specialties: data.specialties }),
          ...(data.avatarUrl   !== undefined && { avatarUrl:   data.avatarUrl }),
        },
      })
      if (count === 0) throw new InvalidBarberError('Barbero no encontrado.')

      if (data.hours !== undefined) {
        await tx.workingHour.deleteMany({ where: { barberId: id } })
        if (data.hours.length > 0) {
          await tx.workingHour.createMany({
            data: data.hours.map((h) => ({ barberId: id, ...h })),
          })
        }
      }
      return tx.barber.findFirstOrThrow({ where: { id, organizationId } })
    })
  },

  async toggle(id, organizationId, active) {
    const { count } = await db.barber.updateMany({
      where: { id, organizationId },
      data:  { active },
    })
    if (count === 0) throw new InvalidBarberError('Barbero no encontrado.')
  },
}
