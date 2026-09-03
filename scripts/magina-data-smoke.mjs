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

    // Cooperativas: directorio real, sincronización de tiendas, ficha, aceites, precios, noticias y socios.
    await page.locator('.hub-tabs--primary').getByRole('button', { name: 'Cooperativas', exact: true }).click();
    const coopList = page.locator('.coop-list--verified');
    await coopList.waitFor({ state: 'visible' });
    assert(await page.locator('.coop-card--territorial').count() >= 10, 'Cooperativas: el directorio no contiene el mínimo esperado.');
    await page.locator('.coop-sync-status').waitFor({ state: 'visible', timeout: 10_000 });
    await page.getByText(/precios comprobados automáticamente/i).waitFor({ state: 'visible' });
    await assertNoOverflow(page, 'Cooperativas');

    const search = page.getByRole('textbox', { name: 'Buscar cooperativas' });
    await search.fill('Jódar');
    await page.locator('.coop-card--territorial').first().waitFor({ state: 'visible', timeout: 10_000 });
    assert(await page.locator('.coop-card--territorial').count() >= 1, 'Cooperativas: la búsqueda por municipio no devuelve resultados.');
    await page.locator('.coop-card--territorial').first().getByRole('button', { name: 'Ver ficha', exact: true }).click();
    await page.locator('.coop-detail-view').waitFor({ state: 'visible' });
    await page.getByText('Verificada', { exact: true }).first().waitFor({ state: 'visible' });
    assert(await page.getByRole('link', { name: /D\.O\.P\. Sierra Mágina/i }).count() === 1, 'Cooperativas: falta el enlace a la fuente oficial.');

    const detailTabs = page.locator('.coop-detail-tabs');
    await detailTabs.getByRole('button', { name: 'Aceites', exact: true }).click();
    await page.getByText('La Quinta Esencia Cosecha Temprana', { exact: true }).first().waitFor({ state: 'visible' });
    assert(await page.locator('.coop-product-card').count() >= 3, 'Cooperativas: La Quinta Esencia no muestra los productos verificados esperados.');
    assert(await page.getByText(/Precio de tienda · verificado/i).count() >= 3, 'Cooperativas: faltan fechas de precio de tienda verificadas.');

    await detailTabs.getByRole('button', { name: 'Precios', exact: true }).click();
    await page.locator('.coop-price-panel').waitFor({ state: 'visible' });
    await page.locator('.coop-store-prices > a').first().waitFor({ state: 'visible', timeout: 10_000 });
    assert(await page.locator('.coop-store-prices > a').count() >= 3, 'Cooperativas: no aparecen los precios de tienda publicados.');
    await page.getByText(/Liquidación \/ precio al socio/i).waitFor({ state: 'visible' });
    await page.getByText(/No publicado o no verificado/i).waitFor({ state: 'visible' });
    await page.locator('.coop-market-reference__grid article').first().waitFor({ state: 'visible', timeout: 10_000 });
    assert(await page.locator('.coop-market-reference__grid article').count() === 3, 'Cooperativas: la referencia de mercado no contiene las tres calidades.');
    assert(await page.getByRole('link', { name: /Fuente oficial del mercado/i }).count() === 1, 'Cooperativas: falta la trazabilidad del precio general.');

    await detailTabs.getByRole('button', { name: 'Noticias', exact: true }).click();
    await page.getByText('Noticias relacionadas', { exact: true }).waitFor({ state: 'visible' });
    await page.locator('.coop-direct-news').waitFor({ state: 'visible' });
    assert(await page.getByRole('link', { name: /Noticias oficiales de La Quinta Esencia/i }).count() === 1, 'Cooperativas: falta el acceso a noticias oficiales de La Quinta Esencia.');
    const relatedCount = await page.locator('.coop-related-news a').count();
    const emptyCount = await page.locator('.coop-empty-state').count();
    assert(relatedCount >= 1 || emptyCount === 1, 'Cooperativas: la pestaña Noticias no presenta resultados ni estado vacío válido.');

    await detailTabs.getByRole('button', { name: 'Socios', exact: true }).click();
    const membersPanel = page.locator('.coop-members-panel');
    await membersPanel.waitFor({ state: 'visible' });
    await page.locator('.coop-campaign-status').waitFor({ state: 'visible' });
    await page.getByText(/Los horarios generales de oficina no se usan como horario de recepción de aceituna/i).waitFor({ state: 'visible' });
    await page.locator('.coop-contact-card').waitFor({ state: 'visible' });
    await page.getByText(/Camino del Canónigo/i).waitFor({ state: 'visible' });
    await page.getByText('953 785 031', { exact: true }).waitFor({ state: 'visible' });
    await page.getByText('info@laquintaesencia.com', { exact: true }).waitFor({ state: 'visible' });
    await page.getByText('Horario general publicado', { exact: true }).waitFor({ state: 'visible' });
    assert(await page.getByRole('link', { name: /Fuente oficial de contacto/i }).count() === 1, 'Cooperativas: falta la fuente oficial de contacto en Socios.');
    await assertNoOverflow(page, 'Ficha de cooperativa completa');

    // Mercado: precios oficiales y gráfico seleccionable.
    await nav.getByRole('button', { name: 'Mágina', exact: true }).click();
    await page.locator('.hub-tabs--primary').getByRole('button', { name: 'Mercado', exact: true }).click();
    const marketPanel = page.locator('.market-real');
    await marketPanel.waitFor({ state: 'visible' });
    await page.locator('.market-real__price').first().waitFor({ state: 'visible', timeout: 10_000 });
    assert(await page.locator('.market-real__price').count() === 3, 'Mercado: no aparecen AOVE, Virgen y Lampante.');
    await page.getByText(/Observatorio de Precios/i).first().waitFor({ state: 'visible', timeout: 10_000 });
    await page.getByRole('button', { name: /Virgen/ }).first().click();
    await page.locator('.market-chart-card--real').waitFor({ state: 'visible' });
    await assertNoOverflow(page, 'Mercado');

    // Volver al hub real y entrar en Alertas.
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
    console.log('✓ Smoke Mágina: tiendas, cooperativa, precios, noticias, Socios/Campaña, mercado y alertas funcionan en 390×844 y bajo /magina-olivo/.');
  } finally {
    if (browser) await browser.close();
    await closePreview(previewServer);
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});
