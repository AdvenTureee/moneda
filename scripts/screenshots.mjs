import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';

const baseURL = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const outDir = process.env.SCREENSHOT_DIR || join(process.cwd(), 'screenshots', 'latest');
const email = process.env.SCREENSHOT_EMAIL;
const password = process.env.SCREENSHOT_PASSWORD;
const reducedMotion = process.env.SCREENSHOT_REDUCED_MOTION === '1' ? 'reduce' : 'no-preference';

const viewports = [
  { name: 'wide', width: 1440, height: 1100 },
  { name: 'mobile', width: 390, height: 844 },
];

const publicPages = [
  { name: 'home', path: '/' },
  { name: 'login', path: '/login' },
  { name: 'signup', path: '/signup' },
];

const privatePages = [
  { name: 'app', path: '/app' },
  { name: 'feed', path: '/feed' },
  { name: 'insights', path: '/insights' },
  { name: 'perfil', path: '/perfil' },
];

function ensureOutputDir() {
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
}

async function assertServerIsReachable() {
  try {
    const response = await fetch(baseURL, { redirect: 'manual' });
    if (response.status >= 500) {
      throw new Error(`server respondeu HTTP ${response.status}`);
    }
  } catch (error) {
    throw new Error(
      `Nao consegui acessar ${baseURL}. Rode "npm run dev" na pasta do projeto, ou ajuste BASE_URL.\n` +
        `Detalhe: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

async function settle(page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(700);
}

async function capture(page, viewportName, pageDef) {
  const url = `${baseURL}${pageDef.path}`;
  const file = join(outDir, `${pageDef.name}--${viewportName}.png`);

  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await settle(page);
  await page.screenshot({ path: file, fullPage: true });
  console.log(`✓ ${pageDef.name}--${viewportName}.png`);
}

async function login(page) {
  if (!email || !password) {
    console.log('↷ Login pulado: defina SCREENSHOT_EMAIL e SCREENSHOT_PASSWORD para capturar telas privadas.');
    return false;
  }

  console.log('🔐 Fazendo login...');
  await page.goto(`${baseURL}/login?next=/app`, { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Senha').fill(password);
  await page.getByRole('button', { name: 'Entrar com email' }).click();
  await page.waitForURL('**/app**', { timeout: 20000 });
  await settle(page);
  return true;
}

async function runViewport(browser, viewport) {
  console.log(`\n📐 Viewport: ${viewport.name} (${viewport.width}x${viewport.height})`);
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
    reducedMotion,
  });
  const page = await context.newPage();

  for (const pageDef of publicPages) {
    await capture(page, viewport.name, pageDef);
  }

  const didLogin = await login(page);
  if (didLogin) {
    for (const pageDef of privatePages) {
      await capture(page, viewport.name, pageDef);
    }
  }

  await context.close();
}

async function main() {
  ensureOutputDir();
  await assertServerIsReachable();

  const browser = await chromium.launch();
  try {
    for (const viewport of viewports) {
      await runViewport(browser, viewport);
    }
  } finally {
    await browser.close();
  }

  console.log(`\n📸 Screenshots salvos em: ${outDir}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
