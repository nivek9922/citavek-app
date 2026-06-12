import { ImageResponse } from 'next/og'

// Apple touch icon (180×180) de Citavek, mismo diseño que el favicon.

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

const BRAND = '#E0A300'

export default function AppleIcon() {
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
          fontSize: 120,
          fontWeight: 800,
        }}
      >
        C
      </div>
    ),
    size,
  )
}
