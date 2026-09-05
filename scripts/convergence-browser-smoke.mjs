import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const baseUrl = process.env.MAGINA_PREVIEW_URL || 'http://127.0.0.1:4173/magina-olivo/';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();
const consoleErrors = [];
const pageErrors = [];
const failedSameOrigin = [];

page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});
page.on('pageerror', (error) => pageErrors.push(error.message));
page.on('response', (response) => {
  const url = new URL(response.url());
  const base = new URL(baseUrl);
  if (url.origin === base.origin && response.status() >= 400) {
    failedSameOrigin.push(`${response.status()} ${url.pathname}`);
  }
});

async function assertFitsViewport(label) {
  const dimensions = await page.evaluate(() => {
    const viewport = window.innerWidth;
    const overflowers = [...document.querySelectorAll('body *')]
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          tag: element.tagName.toLowerCase(),
          id: element.id || '',
          className: typeof element.className === 'string' ? element.className : '',
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
        };
      })
      .filter((item) => item.width > 0 && (item.left < -1 || item.right > viewport + 1))
      .sort((a, b) => b.right - a.right)
      .slice(0, 12);

    return {
      viewport,
      document: document.documentElement.scrollWidth,
      body: document.body.scrollWidth,
      overflowers,
    };
  });
  assert.ok(
    Math.max(dimensions.document, dimensions.body) <= dimensions.viewport + 1,
    `${label}: horizontal overflow ${JSON.stringify(dimensions)}`,
  );
}

async function assertNavCurrent(name) {
  const button = page.getByRole('button', { name, exact: true });
  await button.click();
  await page.waitForTimeout(100);
  assert.equal(await button.getAttribute('aria-current'), 'page', `${name}: navigation state was not selected`);
  await assertFitsViewport(name);
}

async function waitForTour() {
  const tour = page.locator('main.product-tour');
  try {
    await tour.waitFor({ state: 'visible', timeout: 5000 });
  } catch (error) {
    console.error('Smoke diagnostic URL:', page.url());
    console.error('Smoke diagnostic title:', await page.title());
    console.error('Smoke diagnostic body:', (await page.locator('body').innerText()).slice(0, 2000));
    console.error('Smoke diagnostic page errors:', pageErrors);
    console.error('Smoke diagnostic console errors:', consoleErrors);
    console.error('Smoke diagnostic HTTP failures:', failedSameOrigin);
    throw error;
  }
}

try {
  await page.goto(`${baseUrl}?tour=1`, { waitUntil: 'domcontentloaded' });
  await waitForTour();
  await page.getByRole('heading', { name: 'Tu olivar, en un solo lugar' }).waitFor();
  await assertFitsViewport('product tour');

  const logo = page.locator('.product-tour__brand img');
  await logo.waitFor();
  assert.match(await logo.getAttribute('src') || '', /\/magina-olivo\/brand\/magina-olivo-mark\.svg$/);

  await page.getByRole('button', { name: 'Saltar', exact: true }).click();
  await page.getByRole('navigation', { name: 'Navegación principal' }).waitFor();
  assert.equal(await page.getByRole('heading', { name: 'Bienvenido', exact: true }).count(), 0, 'Demo preview unexpectedly fell back to login');

  await assertNavCurrent('Inicio');
  await assertNavCurrent('Mi Campo');
  await assertNavCurrent('Mágina');
  await assertNavCurrent('Mi Mágina');

  const campaignButton = page.getByRole('button', { name: 'Campaña y nueva entrega' });
  await campaignButton.click();
  await page.waitForTimeout(100);
  assert.equal(await campaignButton.getAttribute('aria-current'), 'page', 'Campaign navigation state was not selected');
  await assertFitsViewport('Campaña');

  const deepRoutes = ['magina', 'magina/tiempo', 'magina/campo', 'magina/noticias', 'magina/mercado'];
  for (const route of deepRoutes) {
    await page.goto(new URL(route, baseUrl).toString(), { waitUntil: 'domcontentloaded' });
    await page.locator('main').first().waitFor({ timeout: 5000 });
    assert.ok((await page.locator('body').innerText()).trim().length > 80, `${route}: page rendered too little content`);
    assert.equal(await page.getByRole('heading', { name: 'Bienvenido', exact: true }).count(), 0, `${route}: login rendered unexpectedly`);
    await assertFitsViewport(route);
  }

  assert.deepEqual(pageErrors, [], `Browser page errors: ${pageErrors.join(' | ')}`);
  assert.deepEqual(consoleErrors, [], `Browser console errors: ${consoleErrors.join(' | ')}`);
  assert.deepEqual(failedSameOrigin, [], `Same-origin HTTP failures: ${failedSameOrigin.join(' | ')}`);

  console.log('✓ Convergence browser smoke: demo access, Visual V2 tour, navigation, deep routes and 390x844 overflow checks passed.');
} finally {
  await browser.close();
}
