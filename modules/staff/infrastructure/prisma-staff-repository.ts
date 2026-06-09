import { db } from '@/server/db'
import type { StaffRepository } from '../domain/ports/staff-repository'
import type { CreateBarberData, UpdateBarberData } from '../domain/barber'

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

  async update(id, _organizationId, data: UpdateBarberData) {
    return db.$transaction(async (tx) => {
      const barber = await tx.barber.update({
        where: { id },
        data: {
          ...(data.displayName !== undefined && { displayName: data.displayName }),
          ...(data.nickname    !== undefined && { nickname:    data.nickname }),
          ...(data.specialties !== undefined && { specialties: data.specialties }),
          ...(data.avatarUrl   !== undefined && { avatarUrl:   data.avatarUrl }),
        },
      })
      if (data.hours !== undefined) {
        await tx.workingHour.deleteMany({ where: { barberId: id } })
        if (data.hours.length > 0) {
          await tx.workingHour.createMany({
            data: data.hours.map((h) => ({ barberId: id, ...h })),
          })
        }
      }
      return barber
    })
  },

  async toggle(id, _organizationId, active) {
    await db.barber.update({ where: { id }, data: { active } })
  },
}
