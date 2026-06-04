#!/usr/bin/env node
// Parche postinstall: agrega constantes de migración que better-auth/kysely-adapter
// referencia pero que kysely >=0.28 removió de sus exports públicos.
// Se ejecuta automáticamente después de cada `npm install`.

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { resolve } from 'path'

const PATCH_MARKER = '// bookingflow-compat-patch'

const JS_FILE  = 'node_modules/better-auth/node_modules/kysely/dist/index.js'
const DTS_FILE = 'node_modules/better-auth/node_modules/kysely/dist/index.d.ts'

// kysely 0.29 usa ESM — patch con `export const`
const jsPatch = `
${PATCH_MARKER}
export const DEFAULT_MIGRATION_TABLE = 'kysely_migration';
export const DEFAULT_MIGRATION_LOCK_TABLE = 'kysely_migration_lock';
export const DEFAULT_ALLOW_UNORDERED_MIGRATIONS = false;
export const MIGRATION_LOCK_ID = 'migration_lock';
export const NO_MIGRATIONS = Symbol('NO_MIGRATIONS');
`

const dtsPatch = `
${PATCH_MARKER}
export declare const DEFAULT_MIGRATION_TABLE: string;
export declare const DEFAULT_MIGRATION_LOCK_TABLE: string;
export declare const DEFAULT_ALLOW_UNORDERED_MIGRATIONS: boolean;
export declare const MIGRATION_LOCK_ID: string;
export declare const NO_MIGRATIONS: unique symbol;
`

function patchFile(file, patch) {
  const path = resolve(file)
  if (!existsSync(path)) return false
  // Eliminar parche anterior (si existía con formato CJS incorrecto)
  let content = readFileSync(path, 'utf-8')
  if (content.includes(PATCH_MARKER)) {
    content = content.slice(0, content.indexOf(PATCH_MARKER)).trimEnd() + '\n'
  }
  writeFileSync(path, content + patch)
  return true
}

const okJs  = patchFile(JS_FILE,  jsPatch)
const okDts = patchFile(DTS_FILE, dtsPatch)
console.log(okJs  ? `✓ Parcheado: ${JS_FILE}`  : `⚠ No encontrado: ${JS_FILE}`)
console.log(okDts ? `✓ Parcheado: ${DTS_FILE}` : `⚠ No encontrado: ${DTS_FILE}`)
