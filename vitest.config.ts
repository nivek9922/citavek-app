import { defineConfig } from 'vitest/config'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  test: {
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': root,
      // server-only es un paquete de Next.js que no existe en el entorno de tests
      'server-only': path.join(root, 'test/mocks/server-only.ts'),
    },
  },
})
