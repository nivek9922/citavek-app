---
name: run-bookingflow-kr
description: Build, run, and drive bookingflow-kr. Use when asked to start the app, run the dev server, take a screenshot of the UI, verify a page renders, test a feature in the browser, or interact with the running Next.js app.
---

Multi-tenant SaaS appointment platform built on Next.js 16 + PostgreSQL. Drive it via `.claude/skills/run-bookingflow-kr/driver.mjs` — a Playwright script that takes screenshots and logs in as seeded test users.

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
cd /home/pyt026/PYT/devs/Otros/bookingflow-kr
export PATH="$HOME/.nvm/versions/node/v24.15.0/bin:$PATH"
npm install
```

`.env` is already present at repo root with working local credentials.

## Build

```bash
cd /home/pyt026/PYT/devs/Otros/bookingflow-kr
export PATH="$HOME/.nvm/versions/node/v24.15.0/bin:$PATH"
npm run build
```

A production build is already present in `.next/`.

## Run (agent path)

Launch the server, then use the driver for all browser interactions:

```bash
# Start the production server (already running on port 3000 in this session)
export PATH="$HOME/.nvm/versions/node/v24.15.0/bin:$PATH"
npm run start &
echo $! > /tmp/bookingflow.pid
timeout 30 bash -c 'until curl -sf http://localhost:3000 >/dev/null; do sleep 1; done'
```

Then drive with:

```bash
cd /home/pyt026/PYT/devs/Otros/bookingflow-kr
export PATH="$HOME/.nvm/versions/node/v24.15.0/bin:$PATH"

# Screenshot any URL
node .claude/skills/run-bookingflow-kr/driver.mjs screenshot /login /tmp/shot.png

# Tenant owner login → panel dashboard
node .claude/skills/run-bookingflow-kr/driver.mjs login-tenant chapinero-shave /tmp/panel.png

# Super-admin login → /admin
node .claude/skills/run-bookingflow-kr/driver.mjs login-admin /tmp/admin.png

# Public booking page for a tenant
node .claude/skills/run-bookingflow-kr/driver.mjs public chapinero-shave /tmp/public.png

# Check a page for JS console errors (exits 1 if any found)
node .claude/skills/run-bookingflow-kr/driver.mjs console /chapinero-shave/panel
```

Screenshots land in `/tmp/bookingflow-shots/` unless an explicit `[out]` path is given.

| command | what it does |
|---|---|
| `screenshot <url> [out]` | headless screenshot of any URL |
| `login-tenant [slug] [out]` | login as owner of slug (default: `chapinero-shave`) → panel |
| `login-admin [out]` | login as super-admin → `/admin` |
| `public <slug> [out]` | public booking page without auth |
| `console <url>` | navigate and exit 1 if any JS errors found |

### Seeded test users (from `prisma/seed.ts`)

| email | password | role |
|---|---|---|
| `owner@chapinero.demo` | `Demo2024!` | owner of `chapinero-shave` (active) |
| `owner@envigado.demo` | `Demo2024!` | owner of `envigado-cuts` (suspended) |
| `owner@sanfernando.demo` | `Demo2024!` | owner of `san-fernando-cali` (suspended) |
| `nivek9922@gmail.com` | `Admin2024!` | super-admin |

### Active tenant slugs (use these for panel access)

- `chapinero-shave` — active, full seed data
- `barber-kyzz` — active
- `barber-cachi` — active

## Run (human path)

```bash
npm run dev   # → http://localhost:3000, hot-reload via Turbopack. Ctrl-C to stop.
npm run start # → production server, no hot-reload
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

- **Suspended tenants → 404 on `/panel`** — `san-fernando-cali` and `envigado-cuts` are suspended; their `/panel` routes return 404. Use `chapinero-shave` for panel testing.
- **`/sign-in` does not exist** — the login route is `/login` (under `app/(marketing)/login/`). `/sign-in` returns 404.
- **`chromium-cli` is not installed** — the driver uses Playwright with `/usr/bin/google-chrome`. Install playwright in `/tmp` (not the project) to avoid polluting `package.json`.
- **Playwright must be installed in `/tmp`** — the driver imports from `/tmp/node_modules/playwright`. If it's missing: `cd /tmp && npm install playwright`.
- **`next start` needs a build** — `npm run start` fails without a `.next` build. Run `npm run build` first if `.next` is missing.
- **Vercel analytics scripts 404 locally** — `@vercel/analytics` and `@vercel/speed-insights` request `/_vercel/*` scripts that don't exist in local dev. The driver intercepts and suppresses them; a real browser will show 404 errors in the console which are harmless.
- **DB schema uses lowercase table names** — Prisma migrations generate lowercase table names (`organization`, not `Organization`). psql queries need lowercase names.

## Troubleshooting

- **`Cannot find package 'playwright'`**: run `cd /tmp && npm install playwright`, then retry.
- **Server not responding on port 3000**: check `ps aux | grep next` — if nothing, start with `npm run start &` after verifying `.next/` exists.
- **Port 3000 already in use**: `pkill -f 'next-server'` then restart.
- **Login redirects to `/sin-barberia`** — the user has no linked organization in the DB. Use the seeded credentials above; they were linked by `prisma/seed.ts`.
