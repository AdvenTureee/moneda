import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';

const baseURL = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const outDir = process.env.SCREENSHOT_DIR || join(process.cwd(), 'screenshots', 'latest');
const email =
  process.env.SCREENSHOT_EMAIL ||
  process.env.E2E_EMAIL ||
  process.env.TEST_EMAIL;
const password =
  process.env.SCREENSHOT_PASSWORD ||
  process.env.SCREENSHOT_PASS ||
  process.env.E2E_PASSWORD ||
  process.env.TEST_PASSWORD;
const reducedMotion = process.env.SCREENSHOT_REDUCED_MOTION === '1' ? 'reduce' : 'no-preference';
const captureDelayMs = Number.parseInt(process.env.SCREENSHOT_WAIT_MS || '1800', 10);
const themes = (process.env.SCREENSHOT_THEMES || process.env.SCREENSHOT_THEME || 'light,dark')
  .split(',')
  .map((theme) => theme.trim())
  .filter((theme) => theme === 'light' || theme === 'dark');

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
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => null);
  await page
    .getByText('Seu dinheiro finalmente claro.')
    .waitFor({ state: 'hidden', timeout: 5000 })
    .catch(() => null);
  await page.evaluate(async () => {
    await document.fonts?.ready;
    await Promise.all(
      Array.from(document.images)
        .filter((img) => !img.complete)
        .map((img) =>
          new Promise((resolve) => {
            img.addEventListener('load', resolve, { once: true });
            img.addEventListener('error', resolve, { once: true });
          }),
        ),
    );
  });
  await page.waitForTimeout(Number.isFinite(captureDelayMs) ? captureDelayMs : 1800);
}

async function waitForPageReady(page, pageDef) {
  if (pageDef.path === '/login') {
    await page.getByRole('heading', { name: 'Entrar' }).waitFor({ state: 'visible', timeout: 7000 });
    await page.getByLabel('Email').waitFor({ state: 'visible', timeout: 7000 });
    await settle(page);
    return;
  }

  if (pageDef.path === '/signup') {
    await page.getByRole('heading', { name: 'Criar conta' }).waitFor({ state: 'visible', timeout: 7000 });
    await page.getByLabel('Nome').waitFor({ state: 'visible', timeout: 7000 });
    await settle(page);
    return;
  }

  if (pageDef.path === '/app') {
    await page.waitForURL('**/app**', { timeout: 10000 }).catch(() => null);
    await settle(page);
    return;
  }

  await settle(page);
}

function currentPath(page) {
  return new URL(page.url()).pathname;
}

function isLoginPage(page) {
  return currentPath(page) === '/login';
}

async function capturePublic(page, viewportName, theme, pageDef) {
  const url = `${baseURL}${pageDef.path}`;
  const file = join(outDir, `${pageDef.name}--${theme}--${viewportName}.png`);

  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await waitForPageReady(page, pageDef);
  await page.screenshot({ path: file, fullPage: true });
  console.log(`✓ ${pageDef.name}--${theme}--${viewportName}.png`);
}

async function capturePrivate(page, viewportName, theme, pageDef) {
  const url = `${baseURL}${pageDef.path}`;
  const file = join(outDir, `${pageDef.name}--${theme}--${viewportName}.png`);

  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await waitForPageReady(page, pageDef);

  if (isLoginPage(page)) {
    console.log(`↻ Sessao nao estava ativa para ${pageDef.path}; refazendo login...`);
    await login(page, pageDef.path);
    if (currentPath(page) !== pageDef.path) {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await waitForPageReady(page, pageDef);
    }
  }

  if (isLoginPage(page)) {
    throw new Error(`Nao vou salvar ${pageDef.name}--${theme}--${viewportName}.png porque a rota ${pageDef.path} caiu no /login.`);
  }

  await page.screenshot({ path: file, fullPage: true });
  console.log(`✓ ${pageDef.name}--${theme}--${viewportName}.png`);
}

async function login(page, nextPath = '/app') {
  if (!email || !password) {
    const missing = [
      !email ? 'SCREENSHOT_EMAIL' : null,
      !password ? 'SCREENSHOT_PASSWORD' : null,
    ].filter(Boolean).join(' e ');
    console.log(`↷ Login pulado: defina ${missing} no .env para capturar telas privadas.`);
    console.log('  Aliases aceitos: E2E_EMAIL/TEST_EMAIL e SCREENSHOT_PASS/E2E_PASSWORD/TEST_PASSWORD.');
    return false;
  }

  console.log('🔐 Fazendo login...');
  await page.goto(`${baseURL}/login?next=${encodeURIComponent(nextPath)}`, { waitUntil: 'domcontentloaded' });
  await waitForPageReady(page, { name: 'login', path: '/login' });
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: 'Entrar com email' }).click();

  try {
    await page.waitForURL((url) => url.pathname === nextPath, { timeout: 20000 });
  } catch {
    const alertText = await page.getByRole('alert').textContent({ timeout: 1000 }).catch(() => '');
    const detail = alertText ? ` Mensagem na tela: "${alertText.trim()}".` : '';
    throw new Error(`Login nao chegou em ${nextPath}. URL atual: ${page.url()}.${detail}`);
  }

  await waitForPageReady(page, { name: nextPath.replace('/', '') || 'app', path: nextPath });
  return true;
}

async function runViewport(browser, viewport, theme) {
  console.log(`\n📐 Viewport: ${viewport.name} (${viewport.width}x${viewport.height}) · ${theme}`);
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
    colorScheme: theme,
    reducedMotion,
  });
  await context.addInitScript((selectedTheme) => {
    window.localStorage.setItem('moneda-theme', selectedTheme);
    document.documentElement.dataset.theme = selectedTheme;
  }, theme);

  const page = await context.newPage();

  for (const pageDef of publicPages) {
    await capturePublic(page, viewport.name, theme, pageDef);
  }

  const didLogin = await login(page);
  if (didLogin) {
    for (const pageDef of privatePages) {
      await capturePrivate(page, viewport.name, theme, pageDef);
    }
  }

  await context.close();
}

async function main() {
  ensureOutputDir();
  await assertServerIsReachable();
  console.log(`⏱️ Espera antes de cada print: ${Number.isFinite(captureDelayMs) ? captureDelayMs : 1800}ms`);
  console.log(`🎨 Temas: ${themes.join(', ')}`);

  if (themes.length === 0) {
    throw new Error('Nenhum tema valido em SCREENSHOT_THEMES. Use "light", "dark" ou "light,dark".');
  }

  const browser = await chromium.launch();
  try {
    for (const theme of themes) {
      for (const viewport of viewports) {
        await runViewport(browser, viewport, theme);
      }
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
