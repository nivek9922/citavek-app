// Dominio puro — sin dependencias de framework, Prisma ni React.

export class InvalidCustomerError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidCustomerError'
  }
}
