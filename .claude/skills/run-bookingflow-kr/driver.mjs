#!/usr/bin/env node
/**
 * Playwright driver for bookingflow-kr.
 *
 * Usage (from repo root):
 *   node .claude/skills/run-bookingflow-kr/driver.mjs <command> [args...]
 *
 * Commands:
 *   screenshot <url> [out]          — screenshot any URL
 *   login-tenant [slug] [out]       — login + panel screenshot (default: chapinero-shave)
 *   login-admin [out]               — login as super-admin + /admin screenshot
 *   public <slug> [out]             — public booking page screenshot
 *   console <url>                   — dump JS console errors for a URL
 *
 * Screenshots land in /tmp/bookingflow-shots/ unless [out] overrides.
 * Requires: playwright npm package, google-chrome at /usr/bin/google-chrome
 */

// Playwright lives in /tmp after `npm install playwright` in /tmp (see Prerequisites).
// Fall back to project node_modules if present.
import { createRequire } from 'module';
const req = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = req('/tmp/node_modules/playwright'));
} catch {
  ({ chromium } = await import('playwright'));
}
import { mkdirSync } from 'fs';
import { resolve } from 'path';

const CHROME = '/usr/bin/google-chrome';
const BASE   = 'http://localhost:3000';
const SHOTS  = '/tmp/bookingflow-shots';

mkdirSync(SHOTS, { recursive: true });

const USERS = {
  tenant: { email: 'owner@chapinero.demo', password: 'Demo2024!' },
  admin:  { email: 'nivek9922@gmail.com',  password: 'Admin2024!' },
};

async function launch() {
  return chromium.launch({
    executablePath: CHROME,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
}

async function screenshot(url, out) {
  const dest = resolve(out ?? `${SHOTS}/shot.png`);
  const browser = await launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(url.startsWith('http') ? url : `${BASE}${url}`);
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: dest, fullPage: false });
  console.log(`screenshot → ${dest}`);
  await browser.close();
}

async function loginAndShot(email, password, afterUrl, out) {
  const dest = resolve(out ?? `${SHOTS}/shot.png`);
  const browser = await launch();
  const ctx  = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  await page.goto(`${BASE}/login`);
  await page.waitForLoadState('networkidle');
  await page.fill('input[type="email"]',    email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2500);

  if (afterUrl) {
    await page.goto(afterUrl.startsWith('http') ? afterUrl : `${BASE}${afterUrl}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
  }

  await page.screenshot({ path: dest });
  console.log(`url=${page.url()}`);
  console.log(`screenshot → ${dest}`);
  await browser.close();
}

async function consoleErrors(url) {
  const browser = await launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  // Vercel analytics 404 in local dev — fulfill with empty response to silence console.
  await page.route('**/_vercel/**', route => route.fulfill({ status: 200, body: '' }));
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push(err.message));
  await page.goto(url.startsWith('http') ? url : `${BASE}${url}`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  if (errors.length === 0) {
    console.log('no console errors');
  } else {
    errors.forEach(e => console.error('ERROR:', e));
    process.exit(1);
  }
  await browser.close();
}

const [,, cmd, arg1, arg2] = process.argv;

switch (cmd) {
  case 'screenshot':
    await screenshot(arg1 ?? '/', arg2 ?? `${SHOTS}/screenshot.png`);
    break;

  case 'login-tenant': {
    const slug = arg1 ?? 'chapinero-shave';
    await loginAndShot(
      USERS.tenant.email, USERS.tenant.password,
      `/${slug}/panel`,
      arg2 ?? `${SHOTS}/tenant-panel.png`,
    );
    break;
  }

  case 'login-admin':
    await loginAndShot(
      USERS.admin.email, USERS.admin.password,
      '/admin',
      arg1 ?? `${SHOTS}/admin.png`,
    );
    break;

  case 'public':
    await screenshot(`/${arg1 ?? 'chapinero-shave'}`, arg2 ?? `${SHOTS}/public.png`);
    break;

  case 'console':
    await consoleErrors(arg1 ?? '/');
    break;

  default:
    console.error(`unknown command: ${cmd}`);
    console.error('commands: screenshot | login-tenant | login-admin | public | console');
    process.exit(1);
}
