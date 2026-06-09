// Next.js ejecuta `register()` una vez al arrancar cada runtime del servidor.
// Importar config/env aquí valida (Zod, fail-fast) todas las variables de entorno
// en el arranque: si falta o es inválida alguna, el servidor no levanta en silencio.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('@/config/env')
  }
}
