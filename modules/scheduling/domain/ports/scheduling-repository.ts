// Port (interface) del dominio. La implementa un Adapter en infrastructure/.
// No conoce Prisma ni ninguna tecnología concreta.

import type { AppointmentStatusValue, AppointmentSourceValue } from '../appointment'
import type { WorkingHourInput, BusySlot } from '../slot-calculator'

export type { WorkingHourInput, BusySlot }

export interface BookableService {
  id:          string
  priceCop:    number
  durationMin: number
}

export interface ReschedulableAppointment {
  status:      AppointmentStatusValue
  durationMin: number // total snapshot de la cita (suma de sus servicios)
  barberId:    string
}

/** Línea de servicio de una cita (snapshot de precio/duración + nombre del servicio). */
export interface AppointmentServiceLine {
  name:        string
  durationMin: number
  priceCop:    number
}

/** Vista de cita para el portal del cliente (sin datos sensibles del negocio). */
export interface CustomerAppointment {
  id:             string
  organizationId: string  // necesario para mutaciones internas del dominio
  status:         AppointmentStatusValue
  startAt:        Date
  endAt:          Date
  customerName:   string
  services:       AppointmentServiceLine[]
  durationMin:    number // total snapshot
  priceCop:       number // total snapshot
  barber:         { displayName: string; nickname: string | null }
  organization:   { name: string; slug: string; timezone: string; phone: string | null }
  notes?:         string | null
}

/** Línea de servicio a persistir (snapshot tomado en el momento de la reserva). */
export interface NewAppointmentService {
  serviceId:   string
  priceCop:    number
  durationMin: number
}

export interface NewAppointment {
  organizationId:  string
  services:        NewAppointmentService[]
  barberId:        string
  customerId:      string
  customerName:    string
  customerPhone:   string
  startAt:         Date
  endAt:           Date
  durationMin:     number // total (suma de services)
  priceCop:        number // total (suma de services)
  status:          AppointmentStatusValue
  source:          AppointmentSourceValue
  createdByUserId?: string | null
  notes?:           string | null
  isOffHours?:      boolean
}

export interface SchedulingRepository {
  /**
   * Servicios reservables del tenant (precio/duración los manda el servidor).
   * Devuelve solo los activos que existen; el caso de uso compara la cantidad
   * devuelta contra la pedida para detectar servicios inválidos/inactivos.
   */
  getBookableServices(organizationId: string, serviceIds: string[]): Promise<BookableService[]>

  /** ¿El barbero pertenece al tenant y está activo? */
  isActiveBarber(organizationId: string, barberId: string): Promise<boolean>

  /**
   * barberId activo vinculado a un userId dentro del tenant.
   * Permite forzar que un usuario con rol `barber` solo agende en su propia
   * agenda (no se confía en el barberId enviado por el cliente). null si el
   * usuario no tiene un perfil de barbero activo en la org.
   */
  findActiveBarberIdByUserId(organizationId: string, userId: string): Promise<string | null>

  /** IDs de los barberos activos del tenant, ordenados por sortOrder. */
  listActiveBarberIds(organizationId: string): Promise<string[]>

  /**
   * ¿Hay solape con otra cita activa del barbero en ese rango?
   * `excludeAppointmentId` excluye la cita que se está reprogramando para evitar
   * que se detecte a sí misma como conflicto.
   */
  hasConflict(
    organizationId: string,
    barberId: string,
    startAt: Date,
    endAt: Date,
    excludeAppointmentId?: string,
  ): Promise<boolean>

  /** Crea o actualiza el cliente por teléfono dentro del tenant. */
  upsertCustomer(organizationId: string, name: string, phone: string): Promise<{ id: string }>

  createAppointment(data: NewAppointment): Promise<{ id: string }>

  /** Datos mínimos de una cita para validar un cambio de estado. */
  getAppointmentForStatusChange(
    organizationId: string,
    appointmentId: string,
  ): Promise<{ status: AppointmentStatusValue; startAt: Date } | null>

  updateAppointmentStatus(
    organizationId: string,
    appointmentId: string,
    status: AppointmentStatusValue,
    cancelledAt: Date | null,
  ): Promise<void>

  /** Zona horaria IANA del tenant (e.g. "America/Bogota"). */
  getOrgTimezone(organizationId: string): Promise<string>

  /** Horarios laborales del barbero (almacenados en hora local). */
  getBarberWorkingHours(organizationId: string, barberId: string): Promise<WorkingHourInput[]>

  /**
   * Citas activas del barbero que solapan con el día indicado (ventana UTC ±24 h).
   * computeAvailableSlots filtra la ventana exacta por TZ, así que ser sobre-inclusivo es correcto.
   */
  getBarberBusySlots(organizationId: string, barberId: string, forDate: Date): Promise<BusySlot[]>

  /** Datos mínimos de una cita para validar si se puede reprogramar. */
  getAppointmentForReschedule(
    organizationId: string,
    appointmentId: string,
  ): Promise<ReschedulableAppointment | null>

  /** Actualiza el horario de una cita tras validar todas las reglas de negocio. */
  updateAppointmentTime(
    organizationId: string,
    appointmentId: string,
    newStartAt: Date,
    newEndAt: Date,
  ): Promise<void>

  /**
   * ¿Está bloqueado ese día para el barbero?
   * Comprueba también excepciones globales de la org (barberId = null).
   * `dateStr` es YYYY-MM-DD en la zona horaria del tenant.
   */
  isDateBlocked(organizationId: string, barberId: string, dateStr: string): Promise<boolean>

  /** Bloquea un día para un barbero (o para toda la org si barberId es null). */
  blockDate(
    organizationId: string,
    barberId: string | null,
    dateStr: string,
    reason?: string | null,
  ): Promise<void>

  /** Elimina el bloqueo de un día (no falla si no existía). */
  unblockDate(
    organizationId: string,
    barberId: string | null,
    dateStr: string,
  ): Promise<void>

  /**
   * Busca una cita por ID verificando que el teléfono del cliente coincida.
   * Devuelve null tanto si no existe como si el teléfono no coincide —
   * no revela si el ID es válido (privacidad por diseño).
   */
  getAppointmentForCustomer(
    appointmentId: string,
    customerPhone: string,
  ): Promise<CustomerAppointment | null>
}
