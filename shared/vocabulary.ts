/**
 * Capa de vocabulario multi-vertical. Fuente única de verdad para la terminología
 * que cambia según el tipo de negocio (`Organization.businessType`).
 *
 * El modelo `Barber` y el campo `barberId` NO se renombran: son nombres técnicos
 * internos que representan "cualquier profesional que atiende citas",
 * independientemente del vertical. Lo único que cambia es el texto que el usuario
 * final lee en pantalla, y ese texto vive aquí.
 *
 * Este archivo lo importan client components → NO debe llevar 'server-only' ni
 * importar nada del servidor. El tipo se declara como unión literal en vez de
 * importarse de @/generated/prisma/client, mismo criterio que ya usa
 * `TenantContext.branding.storefrontTheme` en server/tenant.ts.
 */

export type BusinessType = 'BARBERSHOP' | 'BEAUTY_SALON'

export interface Vocabulary {
  /** Inicio de frase o etiqueta suelta: "Barbero" / "Profesional". */
  professionalSingular: string
  /** "Barberos" / "Profesionales". */
  professionalPlural: string
  /** Dentro de una frase: "Añadir barbero" / "Añadir profesional". */
  professionalSingularLower: string
  /** Dentro de una frase: "No tienes barberos activos". */
  professionalPluralLower: string
  /** "Elige tu barbero" / "Elige tu profesional". */
  professionalPossessive: string
  /** "barbería" / "salón de belleza". */
  businessNoun: string
  /** Completa "Tus clientes eligen ___" en el onboarding. */
  bookingChoiceHint: string
  /**
   * Frases completas — el español concuerda en género con el sustantivo del
   * negocio ("barbería" es femenino, "salón" masculino), así que no se pueden
   * componer interpolando `businessNoun` en una plantilla fija.
   */
  /** Alcance de un bloqueo de agenda: "Toda la barbería" / "Todo el salón". */
  businessScopeAll: string
  /** "Tu barbería está lista" / "Tu salón de belleza está listo". */
  businessReadyPhrase: string
}

const VOCABULARY: Record<BusinessType, Vocabulary> = {
  BARBERSHOP: {
    professionalSingular:      'Barbero',
    professionalPlural:        'Barberos',
    professionalSingularLower: 'barbero',
    professionalPluralLower:   'barberos',
    professionalPossessive:    'tu barbero',
    businessNoun:              'barbería',
    bookingChoiceHint:         'con quién se van a cortar',
    businessScopeAll:          'Toda la barbería',
    businessReadyPhrase:       'Tu barbería está lista',
  },
  BEAUTY_SALON: {
    professionalSingular:      'Profesional',
    professionalPlural:        'Profesionales',
    professionalSingularLower: 'profesional',
    professionalPluralLower:   'profesionales',
    professionalPossessive:    'tu profesional',
    businessNoun:              'salón de belleza',
    bookingChoiceHint:         'con quién se van a atender',
    businessScopeAll:          'Todo el salón',
    businessReadyPhrase:       'Tu salón de belleza está listo',
  },
}

/** Vocabulario por defecto: preserva el texto histórico si falta el contexto. */
export const DEFAULT_BUSINESS_TYPE: BusinessType = 'BARBERSHOP'

export function getVocabulary(businessType: BusinessType): Vocabulary {
  return VOCABULARY[businessType] ?? VOCABULARY[DEFAULT_BUSINESS_TYPE]
}
