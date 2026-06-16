// Lista de países para el selector de teléfono (Bloque B).
// Prioritarios primero (mercado de Citavek), luego el resto alfabético por nombre.
// `dial` es el código sin '+'. Banderas vía emoji unicode (sin dependencias).

export interface Country {
  code: string // ISO 3166-1 alpha-2 (clave única del <SelectItem>)
  name: string
  dial: string // sin '+', solo dígitos
  flag: string
}

const PRIORITY: Country[] = [
  { code: 'CO', name: 'Colombia',       dial: '57',  flag: '🇨🇴' },
  { code: 'VE', name: 'Venezuela',      dial: '58',  flag: '🇻🇪' },
  { code: 'EC', name: 'Ecuador',        dial: '593', flag: '🇪🇨' },
  { code: 'PE', name: 'Perú',           dial: '51',  flag: '🇵🇪' },
  { code: 'MX', name: 'México',         dial: '52',  flag: '🇲🇽' },
  { code: 'US', name: 'Estados Unidos', dial: '1',   flag: '🇺🇸' },
  { code: 'ES', name: 'España',         dial: '34',  flag: '🇪🇸' },
]

const REST: Country[] = [
  { code: 'DE', name: 'Alemania',            dial: '49',  flag: '🇩🇪' },
  { code: 'AR', name: 'Argentina',           dial: '54',  flag: '🇦🇷' },
  { code: 'BO', name: 'Bolivia',             dial: '591', flag: '🇧🇴' },
  { code: 'BR', name: 'Brasil',              dial: '55',  flag: '🇧🇷' },
  { code: 'CA', name: 'Canadá',              dial: '1',   flag: '🇨🇦' },
  { code: 'CL', name: 'Chile',               dial: '56',  flag: '🇨🇱' },
  { code: 'CR', name: 'Costa Rica',          dial: '506', flag: '🇨🇷' },
  { code: 'CU', name: 'Cuba',                dial: '53',  flag: '🇨🇺' },
  { code: 'SV', name: 'El Salvador',         dial: '503', flag: '🇸🇻' },
  { code: 'FR', name: 'Francia',             dial: '33',  flag: '🇫🇷' },
  { code: 'GT', name: 'Guatemala',           dial: '502', flag: '🇬🇹' },
  { code: 'HN', name: 'Honduras',            dial: '504', flag: '🇭🇳' },
  { code: 'IT', name: 'Italia',              dial: '39',  flag: '🇮🇹' },
  { code: 'NI', name: 'Nicaragua',           dial: '505', flag: '🇳🇮' },
  { code: 'PA', name: 'Panamá',              dial: '507', flag: '🇵🇦' },
  { code: 'PY', name: 'Paraguay',            dial: '595', flag: '🇵🇾' },
  { code: 'PT', name: 'Portugal',            dial: '351', flag: '🇵🇹' },
  { code: 'GB', name: 'Reino Unido',         dial: '44',  flag: '🇬🇧' },
  { code: 'DO', name: 'República Dominicana', dial: '1',  flag: '🇩🇴' },
  { code: 'UY', name: 'Uruguay',             dial: '598', flag: '🇺🇾' },
].sort((a, b) => a.name.localeCompare(b.name, 'es'))

export const COUNTRIES: Country[] = [...PRIORITY, ...REST]

export const DEFAULT_COUNTRY = PRIORITY[0]! // Colombia (+57)

/**
 * Separa un E.164 ("+573001234567") en código de país y número local, eligiendo
 * el dial más largo que haga prefijo. Si no matchea ninguno, asume el default.
 */
export function splitE164(value: string): { country: Country; local: string } {
  const digits = value.replace(/\D/g, '')
  const byLongestDial = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length)
  const country = byLongestDial.find((c) => digits.startsWith(c.dial))
  if (country) return { country, local: digits.slice(country.dial.length) }
  return { country: DEFAULT_COUNTRY, local: digits }
}
