// Dominio puro — sin dependencias de framework, Prisma ni React.

export interface WorkingHour {
  dayOfWeek: number  // 0 = lunes … 6 = domingo
  startMin:  number  // minutos desde medianoche, ej. 480 = 08:00
  endMin:    number
}

export interface Barber {
  id:             string
  organizationId: string
  displayName:    string
  nickname:       string | null
  avatarUrl:      string | null
  specialties:    string[]
  active:         boolean
  rating:         number
  reviewsCount:   number
}

export interface CreateBarberData {
  displayName: string
  nickname?:   string
  specialties: string[]
  hours:       WorkingHour[]
  avatarUrl?:  string | null
}

export interface UpdateBarberData {
  displayName?: string
  nickname?:    string | null
  specialties?: string[]
  hours?:       WorkingHour[]
  avatarUrl?:   string | null
}

export class InvalidBarberError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidBarberError'
  }
}

export function validateBarber(data: Pick<CreateBarberData, 'displayName'>): void {
  if (!data.displayName?.trim()) throw new InvalidBarberError('El nombre del barbero es requerido.')
}

/** Detecta: inicio ≥ fin, y solapamiento de franjas en el mismo día. */
export function validateWorkingHours(hours: WorkingHour[]): void {
  for (const h of hours) {
    if (h.startMin >= h.endMin) {
      throw new InvalidBarberError(`Horario inválido: la hora de inicio debe ser anterior a la de fin.`)
    }
  }
  // Detectar solapamiento en el mismo día
  const byDay = new Map<number, WorkingHour[]>()
  for (const h of hours) {
    const list = byDay.get(h.dayOfWeek) ?? []
    list.push(h)
    byDay.set(h.dayOfWeek, list)
  }
  for (const [, list] of byDay) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i]!, b = list[j]!
        if (a.startMin < b.endMin && b.startMin < a.endMin) {
          throw new InvalidBarberError('Los horarios del mismo día no pueden solaparse.')
        }
      }
    }
  }
}
