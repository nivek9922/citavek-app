/**
 * Construye la URL de un icono PWA a partir de una secure URL de Cloudinary,
 * insertando transformaciones tras "/upload/".
 *
 * - `c_pad` ajusta el logo a un cuadrado sin recortarlo.
 * - `b_rgb:<color>` rellena con un fondo OPACO (el color de marca): iOS rechaza
 *   los iconos con transparencia para el apple-touch-icon.
 * - `f_png` fuerza PNG, el formato que esperan los manifiestos/iOS.
 *
 * Devuelve `null` si la URL no es una imagen de Cloudinary (entonces el
 * manifiesto recurre al fallback generado con ImageResponse).
 *
 * Ejemplo:
 *   https://res.cloudinary.com/x/image/upload/v1/bookingflow/slug/brand/abc.jpg
 *   → https://res.cloudinary.com/x/image/upload/f_png,c_pad,b_rgb:E0A300,w_192,h_192/v1/bookingflow/slug/brand/abc.jpg
 */
export function buildCloudinaryIconUrl(
  secureUrl: string,
  size: number,
  bgHex: string,
): string | null {
  if (!secureUrl.includes('/image/upload/')) return null
  const bg = bgHex.replace('#', '')
  const transform = `f_png,c_pad,b_rgb:${bg},w_${size},h_${size}`
  return secureUrl.replace('/upload/', `/upload/${transform}/`)
}
