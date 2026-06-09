import { PrismaClientKnownRequestError } from '@/generated/prisma/internal/prismaNamespace'

export function handlePrismaError(err: unknown): string {
  if (err instanceof PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const fields = (err.meta?.target as string[] | undefined) ?? []
      if (fields.some((f) => f.includes('email')))  return 'Ya existe una cuenta con ese correo electrónico.'
      if (fields.some((f) => f.includes('slug')))   return 'Esa URL ya está en uso. Elige un nombre diferente.'
      if (fields.some((f) => f.includes('phone')))  return 'Ya existe un cliente registrado con ese número.'
      return 'Ya existe un registro con esos datos. Verifica e intenta de nuevo.'
    }
    if (err.code === 'P2025') return 'El recurso solicitado no existe o ya fue eliminado.'
    if (err.code === 'P2003') return 'No se puede completar: un recurso relacionado no existe.'
    return 'Error de base de datos. Intenta de nuevo.'
  }
  if (err instanceof Error) return err.message
  return 'Error inesperado. Intenta de nuevo.'
}
