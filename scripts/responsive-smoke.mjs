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

        await assertNoGlobalOverflow(page, viewport.name, section.label);

        await page.screenshot({
          path: path.join(outputDir, `${viewport.name}-${section.slug}.png`),
          fullPage: true,
        });
      }

      await context.close();
      console.log(`✓ ${viewport.name}: navegación, tap targets, FAB y overflow validados.`);
    }

    console.log(`✓ Smoke responsive completado: ${viewports.length * sections.length} capturas.`);
  } finally {
    if (browser) await browser.close();
    await closePreview(previewServer);
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});
