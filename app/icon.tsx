import { ImageResponse } from 'next/og'

// Favicon de Citavek generado al vuelo (sin binarios). Reemplaza el favicon.ico
// heredado de la plantilla. Next prioriza este icon.tsx sobre cualquier .ico.

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

const BRAND = '#E0A300'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: BRAND,
          color: '#000000',
          fontSize: 24,
          fontWeight: 800,
          borderRadius: 7,
        }}
      >
        C
      </div>
    ),
    size,
  )
}
