import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { preview } from 'vite';

const baseUrl = 'http://127.0.0.1:4173';
const outputDir = path.resolve('artifacts/responsive');

const viewports = [
  { name: '360x800', width: 360, height: 800 },
  { name: '390x844', width: 390, height: 844 },
  { name: '430x932', width: 430, height: 932 },
  { name: '768x1024', width: 768, height: 1024 },
  { name: '1366x768', width: 1366, height: 768 },
];

const deepViewportNames = new Set(['360x800', '1366x768']);

const sections = [
  { label: 'Inicio', slug: 'inicio', marker: '.hero-photo--home', expectsFab: true },
  { label: 'Mi Campo', slug: 'mi-campo', marker: '.farm-hero', expectsFab: true },
  { label: 'Mágina', slug: 'magina', marker: '.magina-heading', expectsFab: false },
  { label: 'Descubre', slug: 'descubre', marker: '.discover-main-hero', expectsFab: false },
  { label: 'Perfil', slug: 'perfil', marker: '.profile-hero', expectsFab: false },
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function assertNoGlobalOverflow(page, viewportName, sectionLabel) {
  const metrics = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  assert(
    metrics.scrollWidth <= metrics.clientWidth + 1,
    `${viewportName} · ${sectionLabel}: overflow horizontal global (${metrics.scrollWidth}px > ${metrics.clientWidth}px).`,
  );
}

async function assertTapTargets(page, viewportName) {
  const navBoxes = await page.locator('.bottom-nav__item').evaluateAll((elements) =>
    elements.map((element) => {
      const rect = element.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    }),
  );

  for (const [index, box] of navBoxes.entries()) {
    assert(box.height >= 44, `${viewportName}: destino ${index + 1} de la barra mide ${box.height}px de alto (<44px).`);
    assert(box.width >= 44, `${viewportName}: destino ${index + 1} de la barra mide ${box.width}px de ancho (<44px).`);
  }
}

async function assertSecondaryNavigationVisible(page, selector, expectedCount, viewportName, sectionLabel) {
  const result = await page.locator(selector).evaluateAll((elements) => ({
    viewportWidth: document.documentElement.clientWidth,
    boxes: elements.map((element) => {
      const rect = element.getBoundingClientRect();
      return { left: rect.left, right: rect.right, width: rect.width, height: rect.height };
    }),
  }));

  assert(
    result.boxes.length === expectedCount,
    `${viewportName} · ${sectionLabel}: se esperaban ${expectedCount} pestañas secundarias y hay ${result.boxes.length}.`,
  );

  for (const [index, box] of result.boxes.entries()) {
    assert(box.width > 0 && box.height >= 40, `${viewportName} · ${sectionLabel}: pestaña secundaria ${index + 1} sin tamaño útil.`);
    assert(box.left >= -1, `${viewportName} · ${sectionLabel}: pestaña secundaria ${index + 1} queda fuera por la izquierda.`);
    assert(
      box.right <= result.viewportWidth + 1,
      `${viewportName} · ${sectionLabel}: pestaña secundaria ${index + 1} queda fuera por la derecha (${box.right}px > ${result.viewportWidth}px).`,
    );
  }
}

async function assertHomeMarketGraphicScale(page, viewportName) {
  const trendIconBox = await page.locator('.home-market-card__copy > small svg').boundingBox();
  const chartBox = await page.locator('.home-market-card > svg').boundingBox();

  assert(Boolean(trendIconBox), `${viewportName} · Inicio: no se encontró el icono de tendencia del mercado.`);
  assert(Boolean(chartBox), `${viewportName} · Inicio: no se encontró el minigráfico del mercado.`);

  assert(
    trendIconBox.width <= 20 && trendIconBox.height <= 20,
    `${viewportName} · Inicio: el icono de tendencia se expandió (${trendIconBox.width}×${trendIconBox.height}px).`,
  );
  assert(
    chartBox.width >= 80 && chartBox.height <= 90,
    `${viewportName} · Inicio: escala inesperada del minigráfico (${chartBox.width}×${chartBox.height}px).`,
  );
}

async function captureDeepState(page, viewportName, slug, label, marker) {
  const target = page.locator(marker).first();
  await target.waitFor({ state: 'visible' });
  await assertNoGlobalOverflow(page, viewportName, label);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: path.join(outputDir, `${viewportName}-deep-${slug}.png`),
    fullPage: true,
  });
}

async function captureDeepStates(page, nav, viewportName) {
  let count = 0;

  // Mi Campo: Cuaderno, Campaña y los dos modos de Gestión.
  await nav.getByRole('button', { name: 'Mi Campo', exact: true }).click();
  await page.locator('.field-tabs').waitFor({ state: 'visible' });
  const fieldTabs = page.locator('.field-tabs');

  await fieldTabs.getByRole('button', { name: 'Cuaderno', exact: true }).click();
  await captureDeepState(page, viewportName, 'mi-campo-cuaderno', 'Mi Campo · Cuaderno', '.journal-list');
  count += 1;

  await fieldTabs.getByRole('button', { name: 'Campaña', exact: true }).click();
  await captureDeepState(page, viewportName, 'mi-campo-campana', 'Mi Campo · Campaña', '.campaign-chart-card');
  count += 1;

  await fieldTabs.getByRole('button', { name: 'Gestión', exact: true }).click();
  const managementSwitch = page.locator('.field-management-switch');
  await managementSwitch.waitFor({ state: 'visible' });
  await managementSwitch.getByRole('button', { name: 'Costes y rentabilidad', exact: true }).click();
  await captureDeepState(page, viewportName, 'mi-campo-costes', 'Mi Campo · Costes', '.profit-summary-grid');
  count += 1;

  await managementSwitch.getByRole('button', { name: 'Maquinaria', exact: true }).click();
  await captureDeepState(page, viewportName, 'mi-campo-maquinaria', 'Mi Campo · Maquinaria', '.machine-overview-card');
  count += 1;

  // Mágina: cooperativas, mercado, descubre interno y hub Más.
  await nav.getByRole('button', { name: 'Mágina', exact: true }).click();
  await page.locator('.hub-tabs--primary').waitFor({ state: 'visible' });
  const hubTabs = page.locator('.hub-tabs--primary');

  await hubTabs.getByRole('button', { name: 'Cooperativas', exact: true }).click();
  await captureDeepState(page, viewportName, 'magina-cooperativas', 'Mágina · Cooperativas', '.coop-list');
  count += 1;

  await hubTabs.getByRole('button', { name: 'Mercado', exact: true }).click();
  await captureDeepState(page, viewportName, 'magina-mercado', 'Mágina · Mercado', '.market-chart-card');
  count += 1;

  await hubTabs.getByRole('button', { name: 'Descubre', exact: true }).click();
  await captureDeepState(page, viewportName, 'magina-descubre', 'Mágina · Descubre', '.discover-main-hero');
  count += 1;

  await hubTabs.getByRole('button', { name: 'Más', exact: true }).click();
  await captureDeepState(page, viewportName, 'magina-mas', 'Mágina · Más', '.magina-more-menu');
  count += 1;

  // Perfil: guardados, documentos y ajustes.
  await nav.getByRole('button', { name: 'Perfil', exact: true }).click();
  await page.locator('.profile-tabs').waitFor({ state: 'visible' });
  const profileTabs = page.locator('.profile-tabs');

  await profileTabs.getByRole('button', { name: 'Guardados', exact: true }).click();
  await captureDeepState(page, viewportName, 'perfil-guardados', 'Perfil · Guardados', '.saved-list');
  count += 1;

  await profileTabs.getByRole('button', { name: 'Documentos', exact: true }).click();
  await captureDeepState(page, viewportName, 'perfil-documentos', 'Perfil · Documentos', '.document-list');
  count += 1;

  await profileTabs.getByRole('button', { name: 'Ajustes', exact: true }).click();
  await captureDeepState(page, viewportName, 'perfil-ajustes', 'Perfil · Ajustes', '.settings-list');
  count += 1;

  // Descubre principal: detalle de una ruta.
  await nav.getByRole('button', { name: 'Descubre', exact: true }).click();
  await page.locator('.discover-route-list').waitFor({ state: 'visible' });
  await page.locator('.discover-route-card').first().click();
  await captureDeepState(page, viewportName, 'descubre-ruta', 'Descubre · Detalle de ruta', '.discover-route-detail');
  count += 1;

  return count;
}

async function closePreview(previewServer) {
  const httpServer = previewServer?.httpServer;
  if (!httpServer) return;

  httpServer.closeAllConnections?.();
  if (!httpServer.listening) return;

  await new Promise((resolve, reject) => {
    httpServer.close((error) => error ? reject(error) : resolve());
  });
}

async function run() {
  await mkdir(outputDir, { recursive: true });

  const previewServer = await preview({
    preview: {
      host: '127.0.0.1',
      port: 4173,
      strictPort: true,
    },
  });

  let browser;
  let deepCaptureCount = 0;

  try {
    browser = await chromium.launch({ headless: true });

    for (const viewport of viewports) {
      const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
      const page = await context.newPage();
      await page.goto(baseUrl, { waitUntil: 'networkidle' });

      const nav = page.locator('nav.bottom-nav');
      await nav.waitFor({ state: 'visible' });

      const navItems = nav.locator('button.bottom-nav__item');
      assert(await navItems.count() === 5, `${viewport.name}: la barra inferior no tiene exactamente 5 destinos.`);
      await assertTapTargets(page, viewport.name);

      for (const section of sections) {
        const button = nav.getByRole('button', { name: section.label, exact: true });
        await button.click();
        await page.locator(section.marker).first().waitFor({ state: 'visible' });

        assert(
          (await button.getAttribute('aria-current')) === 'page',
          `${viewport.name} · ${section.label}: el destino activo no expone aria-current="page".`,
        );

        const fab = page.locator('.context-fab');
        const fabCount = await fab.count();
        assert(
          section.expectsFab ? fabCount === 1 : fabCount === 0,
          `${viewport.name} · ${section.label}: estado inesperado del botón contextual +.`,
        );

        if (fabCount === 1) {
          const fabBox = await fab.boundingBox();
          assert(Boolean(fabBox) && fabBox.height >= 44 && fabBox.width >= 44, `${viewport.name} · ${section.label}: FAB menor de 44px.`);
        }

        if (section.slug === 'inicio') {
          await assertHomeMarketGraphicScale(page, viewport.name);
        }

        if (section.slug === 'mi-campo') {
          await assertSecondaryNavigationVisible(page, '.field-tabs .field-tab', 4, viewport.name, section.label);
        }

        if (section.slug === 'magina') {
          await assertSecondaryNavigationVisible(page, '.hub-tabs--primary .hub-tab', 5, viewport.name, section.label);
        }

        if (section.slug === 'perfil') {
          await assertSecondaryNavigationVisible(page, '.profile-tabs .profile-tab', 4, viewport.name, section.label);
        }

        await assertNoGlobalOverflow(page, viewport.name, section.label);

        await page.screenshot({
          path: path.join(outputDir, `${viewport.name}-${section.slug}.png`),
          fullPage: true,
        });
      }

      if (deepViewportNames.has(viewport.name)) {
        const captured = await captureDeepStates(page, nav, viewport.name);
        deepCaptureCount += captured;
        console.log(`✓ ${viewport.name}: ${captured} estados internos capturados y validados.`);
      }

      await context.close();
      console.log(`✓ ${viewport.name}: navegación, subnavegación, mercado, tap targets, FAB y overflow validados.`);
    }

    const primaryCaptureCount = viewports.length * sections.length;
    console.log(`✓ Smoke responsive completado: ${primaryCaptureCount} capturas principales + ${deepCaptureCount} internas = ${primaryCaptureCount + deepCaptureCount}.`);
  } finally {
    if (browser) await browser.close();
    await closePreview(previewServer);
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});
