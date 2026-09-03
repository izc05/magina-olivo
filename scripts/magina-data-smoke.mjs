import { chromium } from 'playwright';
import { preview } from 'vite';

const baseUrl = 'http://127.0.0.1:4174/magina-olivo/';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function assertNoOverflow(page, label) {
  const metrics = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  assert(metrics.scrollWidth <= metrics.clientWidth + 1, `${label}: overflow horizontal (${metrics.scrollWidth}px > ${metrics.clientWidth}px).`);
}

async function closePreview(previewServer) {
  const httpServer = previewServer?.httpServer;
  if (!httpServer) return;
  httpServer.closeAllConnections?.();
  if (!httpServer.listening) return;
  await new Promise((resolve, reject) => httpServer.close((error) => error ? reject(error) : resolve()));
}

async function run() {
  const previewServer = await preview({
    base: '/magina-olivo/',
    preview: { host: '127.0.0.1', port: 4174, strictPort: true },
  });

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await page.goto(baseUrl, { waitUntil: 'networkidle' });

    const nav = page.locator('nav.bottom-nav');
    await nav.waitFor({ state: 'visible' });
    await nav.getByRole('button', { name: 'Mágina', exact: true }).click();
    await page.locator('.hub-tabs--primary').waitFor({ state: 'visible' });

    // Cooperativas: directorio real, búsqueda y ficha verificada.
    await page.locator('.hub-tabs--primary').getByRole('button', { name: 'Cooperativas', exact: true }).click();
    const coopList = page.locator('.coop-list--verified');
    await coopList.waitFor({ state: 'visible' });
    assert(await page.locator('.coop-card--territorial').count() >= 10, 'Cooperativas: el directorio no contiene el mínimo esperado.');
    await assertNoOverflow(page, 'Cooperativas');

    const search = page.getByRole('textbox', { name: 'Buscar cooperativas' });
    await search.fill('Bedmar');
    await page.locator('.coop-card--territorial').first().waitFor({ state: 'visible', timeout: 10_000 });
    assert(await page.locator('.coop-card--territorial').count() >= 1, 'Cooperativas: la búsqueda por municipio no devuelve resultados.');
    await page.locator('.coop-card--territorial').first().getByRole('button', { name: 'Ver ficha', exact: true }).click();
    await page.locator('.coop-detail-view').waitFor({ state: 'visible' });
    await page.getByText('Verificada', { exact: true }).first().waitFor({ state: 'visible' });
    assert(await page.getByRole('link', { name: /D\.O\.P\. Sierra Mágina/i }).count() === 1, 'Cooperativas: falta el enlace a la fuente oficial.');
    await assertNoOverflow(page, 'Ficha de cooperativa');

    // Volver al hub real y entrar en Alertas.
    await page.getByRole('button', { name: 'Cooperativas', exact: true }).first().click();
    await nav.getByRole('button', { name: 'Mágina', exact: true }).click();
    await page.getByRole('button', { name: 'Alertas', exact: true }).click();
    const alertsPanel = page.locator('.alerts-real');
    await alertsPanel.waitFor({ state: 'visible' });
    const firstAlert = page.locator('.alerts-real__card').first();
    await firstAlert.waitFor({ state: 'visible', timeout: 10_000 });
    assert(await page.locator('.alerts-real__card').count() >= 1, 'Alertas: el feed oficial no muestra avisos.');
    await page.getByText('Oficial', { exact: true }).first().waitFor({ state: 'visible', timeout: 10_000 });
    assert(await page.getByText('Oficial', { exact: true }).count() >= 1, 'Alertas: no aparece la trazabilidad oficial.');
    await assertNoOverflow(page, 'Alertas');

    await context.close();
    console.log('✓ Smoke Mágina: directorio, búsqueda, ficha verificada y alertas oficiales funcionan en 390×844 y bajo /magina-olivo/.');
  } finally {
    if (browser) await browser.close();
    await closePreview(previewServer);
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});
