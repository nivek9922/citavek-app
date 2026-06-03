#!/usr/bin/env node
const [major] = process.version.slice(1).split('.').map(Number)
if (major < 20) {
  console.error(`
  ❌ Node ${process.version} detectado. Se requiere Node >=20.

  Ejecuta:  nvm use 22
  Luego:    npm run dev
  `)
  process.exit(1)
}
console.log(`✓ Node ${process.version}`)
