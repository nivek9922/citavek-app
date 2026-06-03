// Port del algoritmo hex→OKLCH de barrio-glow-up/src/features/tenant/colorUtils.ts
// Convierte el color primario hex del tenant a variables OKLCH para el design system.

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '')
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean
  const num = parseInt(full, 16)
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255]
}

function srgbToLinear(c: number): number {
  const v = c / 255
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
}

function rgbToOklch(r: number, g: number, b: number): { l: number; c: number; h: number } {
  const lr = srgbToLinear(r)
  const lg = srgbToLinear(g)
  const lb = srgbToLinear(b)

  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb

  const l_ = Math.cbrt(l)
  const m_ = Math.cbrt(m)
  const s_ = Math.cbrt(s)

  const okL = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_
  const okA = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_
  const okB = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_

  const C = Math.sqrt(okA * okA + okB * okB)
  let H = (Math.atan2(okB, okA) * 180) / Math.PI
  if (H < 0) H += 360

  return { l: okL, c: C, h: H }
}

export function hexToOklch(hex: string): { primary: string; glow: string } {
  try {
    const [r, g, b] = hexToRgb(hex)
    const { l, c, h } = rgbToOklch(r, g, b)
    const baseL = Math.min(0.85, Math.max(0.55, l))
    const baseC = Math.min(0.22, c)
    const glowL = Math.min(0.92, baseL + 0.08)
    return {
      primary: `oklch(${baseL.toFixed(3)} ${baseC.toFixed(3)} ${h.toFixed(2)})`,
      glow:    `oklch(${glowL.toFixed(3)} ${baseC.toFixed(3)} ${h.toFixed(2)})`,
    }
  } catch {
    return { primary: 'oklch(0.78 0.16 75)', glow: 'oklch(0.86 0.14 80)' }
  }
}
