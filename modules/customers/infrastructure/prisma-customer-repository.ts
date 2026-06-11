import { db } from '@/server/db'
import type { CustomerRepository } from '../domain/ports/customer-repository'
import { InvalidCustomerError } from '../domain/customer'

export const prismaCustomerRepository: CustomerRepository = {
  async updateNotes(customerId, organizationId, notes) {
    const { count } = await db.customer.updateMany({
      where: { id: customerId, organizationId },
      data:  { notes },
    })
    if (count === 0) throw new InvalidCustomerError('Cliente no encontrado.')
  },
}
