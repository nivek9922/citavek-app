import { db } from '@/server/db'
import type { TenancyRepository, DeleteResult } from '../domain/ports/tenancy-repository'

export const prismaTenancyRepository: TenancyRepository = {
  async findById(id) {
    return db.organization.findUnique({
      where:  { id },
      select: { id: true, slug: true, name: true, status: true },
    })
  },

  async setStatus(id, status) {
    await db.organization.update({ where: { id }, data: { status } })
  },

  async updateBranding(organizationId, data) {
    await db.branding.upsert({
      where:  { organizationId },
      update: data,
      create: { organizationId, ...data },
    })
  },

  async patchBranding(organizationId, patch) {
    await db.branding.update({ where: { organizationId }, data: patch })
  },

  async updateInfo(id, data) {
    await db.organization.update({ where: { id }, data })
  },

  async deleteWithCascade(id): Promise<DeleteResult> {
    const [org, members] = await Promise.all([
      db.organization.findUnique({ where: { id }, select: { slug: true } }),
      db.member.findMany({ where: { organizationId: id }, select: { userId: true } }),
    ])

    await db.$transaction([
      db.appointment.deleteMany({ where: { organizationId: id } }),
      db.organization.delete({ where: { id } }),
    ])

    return {
      slug:          org?.slug ?? '',
      memberUserIds: members.map((m) => m.userId),
    }
  },
}
