#!/usr/bin/env node
// Migraciones necesitan conexión directa (DIRECT_URL), no la pooled (DATABASE_URL).
// Sustituye DATABASE_URL por DIRECT_URL solo para este proceso, de forma cross-platform
// (el `VAR=valor comando` de bash no funciona en cmd.exe, que es el shell que usa npm en Windows).
import { execSync } from 'node:child_process'
import 'dotenv/config'

const env = { ...process.env, DATABASE_URL: process.env.DIRECT_URL }

execSync('npx prisma migrate deploy', { stdio: 'inherit', env })
execSync('npx prisma generate', { stdio: 'inherit', env })
