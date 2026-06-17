/**
 * Estilo visual de las categorías de servicio (corte, barba, combo, tratamiento,
 * infantil). Fuente única de verdad para el storefront — antes estos mapas estaban
 * duplicados en StepService.tsx y page.tsx.
 *
 * Los colores son semánticos pero suaves: tintes a baja opacidad que funcionan tanto
 * sobre la base papel cálida (light) como sobre el near-black cálido (dark). El acento
 * de SELECCIÓN sigue siendo --primary (tenant-aware); esto es solo identificación
 * de tipo de servicio.
 */

export interface CategoryStyle {
  /** Etiqueta completa (listas, página). */
  label: string
  /** Etiqueta corta (chips estrechos en mobile). */
  short: string
  /** Emoji de respaldo cuando el servicio no tiene imagen. */
  emoji: string
  /** Chip de categoría: fondo tenue + texto legible en ambos temas. */
  chip: string
  /** Contenedor del icono/emoji en estado inactivo (tinte de categoría). */
  iconTint: string
}

const FALLBACK: CategoryStyle = {
  label: 'Servicio',
  short: 'Servicio',
  emoji: '✂️',
  chip: 'bg-muted text-muted-foreground',
  iconTint: 'bg-muted',
}

const CATEGORY_STYLE: Record<string, CategoryStyle> = {
  corte: {
    label: 'Corte',
    short: 'Corte',
    emoji: '✂️',
    chip: 'bg-blue-500/10 text-blue-600 dark:text-blue-300',
    iconTint: 'bg-blue-500/10',
  },
  barba: {
    label: 'Barba',
    short: 'Barba',
    emoji: '🪒',
    chip: 'bg-amber-500/12 text-amber-700 dark:text-amber-300',
    iconTint: 'bg-amber-500/12',
  },
  combo: {
    label: 'Combo',
    short: 'Combo',
    emoji: '💈',
    // Teal: matiz distinto de las otras 4 categorías y sin chocar con el rojo
    // --destructive ni con tenants de marca roja (evita el "muro de rojos" en
    // una card de combo seleccionada).
    chip: 'bg-teal-500/12 text-teal-700 dark:text-teal-300',
    iconTint: 'bg-teal-500/12',
  },
  tratamiento: {
    label: 'Tratamiento',
    short: 'Trat.',
    emoji: '✨',
    chip: 'bg-purple-500/10 text-purple-600 dark:text-purple-300',
    iconTint: 'bg-purple-500/10',
  },
  infantil: {
    label: 'Infantil',
    short: 'Niño',
    emoji: '👦',
    chip: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300',
    iconTint: 'bg-emerald-500/12',
  },
}

/** Devuelve el estilo de una categoría, con respaldo seguro para valores desconocidos. */
export function categoryStyle(category: string): CategoryStyle {
  return CATEGORY_STYLE[category] ?? { ...FALLBACK, label: category, short: category }
}
