import 'server-only'
import { db } from '@/server/db'
import type { IdentityRepository, NewOrganizationData } from '../domain/ports/identity-repository'

export const prismaIdentityRepository: IdentityRepository = {
  async isSlugTaken(slug) {
    const org = await db.organization.findUnique({
      where:  { slug },
      select: { id: true },
    })
    return org !== null
  },

  async createOrganization(data: NewOrganizationData) {
    return db.organization.create({
      data: {
        name:     data.name,
        slug:     data.slug,
        city:     data.city,
        phone:    data.phone,
        timezone: data.timezone,
        currency: data.currency,
        status:   'active',
      },
      select: { id: true, slug: true },
    })
  },

  async createBranding(organizationId, primaryColor) {
    await db.branding.create({
      data: { organizationId, primaryColor },
    })
  },

  async createOwnerMembership(organizationId, userId) {
    await db.member.create({
      data: {
        id:             crypto.randomUUID(),
        organizationId,
        userId,
        role:           'owner',
        createdAt:      new Date(),
      },
    })
  },

  async findAccessCode(code) {
    return db.accessCode.findUnique({ where: { code } })
  },

  async consumeAccessCode(code, usedBy) {
    await db.accessCode.update({
      where: { code },
      data:  { isUsed: true, usedBy, usedAt: new Date() },
    })
  },

  async createAccessCode(code, expiresAt, createdBy) {
    return db.accessCode.create({
      data: { code, expiresAt, createdBy },
    })
  },

  async listAccessCodes() {
    return db.accessCode.findMany({ orderBy: { createdAt: 'desc' } })
  },
}
