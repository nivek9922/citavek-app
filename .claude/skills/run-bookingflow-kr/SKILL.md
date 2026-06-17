---
name: run-bookingflow-kr
description: Build, run, and drive citavek-app. Use when asked to start the app, run the dev server, take a screenshot of the UI, verify a page renders, test a feature in the browser, or interact with the running Next.js app.
---

Multi-tenant SaaS appointment platform (`citavek-app`) built on Next.js 16 + PostgreSQL. Drive it via `.claude/skills/run-bookingflow-kr/driver.mjs` — a Playwright script that takes screenshots and logs in as seeded test users.

> Nota: el nombre del skill sigue siendo `run-bookingflow-kr` por compatibilidad de invocación, pero el proyecto se llama **citavek-app** (`/home/pyt026/PYT/devs/Otros/citavek-app`).

## Prerequisites

```bash
# Node >=20 required (nvm available on this machine)
export PATH="$HOME/.nvm/versions/node/v24.15.0/bin:$PATH"

# Playwright (install once in /tmp so it doesn't touch the project)
cd /tmp && npm install playwright

# google-chrome is the browser: /usr/bin/google-chrome
# PostgreSQL runs in Docker on port 5436 (already up)
```

## Setup

```bash
cd /home/pyt026/PYT/devs/Otros/citavek-app
export PATH="$HOME/.nvm/versions/node/v24.15.0/bin:$PATH"
npm install
```

`.env` is already present at repo root with working local credentials.

## Build

```bash
cd /home/pyt026/PYT/devs/Otros/citavek-app
export PATH="$HOME/.nvm/versions/node/v24.15.0/bin:$PATH"
npm run build
```

## Run (agent path)

Launch the server, then use the driver for all browser interactions:

```bash
# Start the production server.
# ⚠️ Limpia NODE_OPTIONS: el perfil exporta NODE_OPTIONS=--env-file=… y el worker de
# Next lo rechaza ("--env-file is not allowed in NODE_OPTIONS"). Ver Gotchas.
export PATH="$HOME/.nvm/versions/node/v24.15.0/bin:$PATH"
env -u NODE_OPTIONS npm run start &
echo $! > /tmp/citavek.pid
timeout 30 bash -c 'until curl -sf http://localhost:3000 >/dev/null; do sleep 1; done'
```

Then drive with:

```bash
cd /home/pyt026/PYT/devs/Otros/citavek-app
export PATH="$HOME/.nvm/versions/node/v24.15.0/bin:$PATH"

# Screenshot any URL
node .claude/skills/run-bookingflow-kr/driver.mjs screenshot /login /tmp/shot.png

# Tenant owner login → panel dashboard
node .claude/skills/run-bookingflow-kr/driver.mjs login-tenant chapinero-shave /tmp/panel.png

# Super-admin login → /admin  (lee SUPER_ADMIN_EMAIL/PASSWORD del entorno)
SUPER_ADMIN_EMAIL=… SUPER_ADMIN_PASSWORD=… node .claude/skills/run-bookingflow-kr/driver.mjs login-admin /tmp/admin.png

# Public booking page for a tenant
node .claude/skills/run-bookingflow-kr/driver.mjs public san-fernando-cali /tmp/public.png

# Mobile viewport (no forzado a desktop)
VIEWPORT=mobile node .claude/skills/run-bookingflow-kr/driver.mjs public san-fernando-cali /tmp/public-mobile.png

# Production smoke test (apunta a Vercel en vez de localhost)
BASE_URL=https://citavek-app.vercel.app node .claude/skills/run-bookingflow-kr/driver.mjs public san-fernando-cali /tmp/prod.png

# Check a page for JS console errors (exits 1 if any found)
node .claude/skills/run-bookingflow-kr/driver.mjs console /san-fernando-cali/panel
```

Screenshots land in `/tmp/citavek-shots/` unless an explicit `[out]` path is given.

| command | what it does |
|---|---|
| `screenshot <url> [out]` | headless screenshot of any URL |
| `login-tenant [slug] [out]` | login as owner of slug (default: `chapinero-shave`) → panel |
| `login-admin [out]` | login as super-admin → `/admin` (creds desde env) |
| `public <slug> [out]` | public booking page without auth |
| `console <url>` | navigate and exit 1 if any JS errors found |

Env vars del driver: `BASE_URL` (default localhost:3000), `VIEWPORT` (`mobile` o `desktop`), `VIEWPORT_WIDTH`/`VIEWPORT_HEIGHT` (custom), `SUPER_ADMIN_EMAIL`/`SUPER_ADMIN_PASSWORD` (login-admin).

### Seeded test users (from `prisma/seed.ts` + DB actual)

| email | password | rol / tenant |
|---|---|---|
| `owner@chapinero.demo`   | `Demo2024!` | owner de `chapinero-shave` |
| `owner@envigado.demo`    | `Demo2024!` | owner de `envigado-cuts` |
| `owner@sanfernando.demo` | `Demo2024!` | owner de `san-fernando-cali` |
| (super-admin)            | `SUPER_ADMIN_PASSWORD` de `.env` | super-admin (email = `SUPER_ADMIN_EMAIL`) |

> El super-admin **no** se hardcodea en el skill: el driver toma email y password de las env vars reales. La password `Admin2024!` que aparecía antes era incorrecta.

### Tenant slugs (todos activos en el seed actual)

`chapinero-shave` · `demachos` · `envigado-cuts` · `kyzz-barber` · `san-fernando-cali`

(`demachos` y `kyzz-barber` tienen owners reales — `sala123@gmail.com`, `zuryperez092@gmail.com` — sin password demo; usa los `.demo` para login de owner.)

## Run (human path)

```bash
env -u NODE_OPTIONS npm run dev    # → http://localhost:3000, hot-reload. Ctrl-C to stop.
env -u NODE_OPTIONS npm run start  # → production server, no hot-reload (requiere build)
```

## Test

```bash
export PATH="$HOME/.nvm/versions/node/v24.15.0/bin:$PATH"
npm run test          # vitest run (unit + integration)
npm run typecheck     # tsc --noEmit
npm run lint          # eslint --max-warnings=0
npm run validate      # all three above in sequence
```

## Gotchas

- **`NODE_OPTIONS=--env-file` rompe `next dev`/`next start`** — el perfil de la shell exporta `NODE_OPTIONS=--env-file=…` y el worker de Next aborta con "--env-file is not allowed in NODE_OPTIONS". Arranca siempre con `env -u NODE_OPTIONS …`. Next ya carga `.env` por su cuenta, así que no hace falta `--env-file`.
- **Suscripción / Organization.status como compuertas** — un tenant puede dejar de operar por dos vías: `Organization.status='suspended'` (kill-switch admin; el público muestra "Temporalmente Inactivo" y `/panel` page hace 404) o por suscripción `suspended`/`cancelled`/trial vencido (el público muestra "No disponible temporalmente"). En el seed actual todos los tenants están activos.
- **`/sign-in` no existe** — la ruta de login es `/login`. `/sign-in` devuelve 404.
- **Playwright debe instalarse en `/tmp`** — el driver importa desde `/tmp/node_modules/playwright`. Si falta: `cd /tmp && npm install playwright`.
- **`next start` necesita build** — corre `npm run build` primero si falta `.next/`.
- **Vercel analytics 404 en local** — `@vercel/analytics` pide `/_vercel/*`; el driver los intercepta y silencia.
- **Tablas en minúscula** — las migraciones Prisma generan nombres en minúscula (`organization`, no `Organization`). Las queries psql usan minúsculas.

## Troubleshooting

- **`Cannot find package 'playwright'`**: `cd /tmp && npm install playwright`, luego reintenta.
- **Servidor sin responder en :3000**: revisa `ps aux | grep next`; si no hay, arranca con `env -u NODE_OPTIONS npm run start &` (verifica que exista `.next/`).
- **Puerto 3000 ocupado / no muere**: matar el worker (`lsof -t -i:3000`) NO basta — el padre `npm run dev` lo respawnea. Mata el árbol: `ps -eo pid,args | grep -E 'npm run dev|next dev|next-server' | grep -v grep | awk '{print $1}' | xargs -r kill -9`.
- **No borres `.next` (ni `.next/cache`) con el server corriendo** — corrompe la caché de Turbopack (`Failed to open SST file …`) → 500. Detén el server primero, luego `rm -rf .next`, luego arranca.
- **`use cache` persiste a disco (`cacheLife('max')`)** — para ver un cambio de datos hecho directo en la BD en una página pública, no basta reiniciar: la entrada cacheada solo se invalida con `updateTag('tenant:<slug>')` (lo hace el Server Action) o borrando `.next` con el server detenido y arrancando limpio.
- **Login redirige a `/sin-barberia`**: el usuario no tiene organización vinculada. Usa las credenciales seed de arriba.
