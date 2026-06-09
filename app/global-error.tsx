'use client'

// Captura errores que escapan del layout raíz. Reemplaza por completo el árbol,
// así que debe renderizar <html>/<body> y NO hereda globals.css → estilos inline.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="es">
      <body
        style={{
          display: 'flex', minHeight: '100vh', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: '1rem',
          padding: '1rem', textAlign: 'center',
          fontFamily: 'system-ui, sans-serif', background: '#0a0a0a', color: '#fafafa',
        }}
      >
        <div style={{ fontSize: '3rem' }}>⚠️</div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Algo salió mal</h2>
        <p style={{ maxWidth: '24rem', fontSize: '0.875rem', opacity: 0.7 }}>
          {error.message || 'Ocurrió un error inesperado. Vuelve a intentarlo.'}
        </p>
        <button
          onClick={reset}
          style={{
            borderRadius: '0.75rem', background: '#E0A300', color: '#1a1a1a',
            padding: '0.625rem 1.5rem', fontSize: '0.875rem', fontWeight: 600,
            border: 'none', cursor: 'pointer',
          }}
        >
          Intentar de nuevo
        </button>
      </body>
    </html>
  )
}
