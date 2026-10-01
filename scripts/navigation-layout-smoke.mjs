import { chromium } from 'playwright';
import { preview } from 'vite';

const baseUrl = 'http://127.0.0.1:4174';
const welcomeTourKey = 'magina-olivo:welcome-tour:v1';

function assert(condition, message) {
  if (!condition) throw new Error(message);
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
    preview: { host: '127.0.0.1', port: 4174, strictPort: true },
  });

  let browser;
  try {
    browser = await chromium.launch({ headless: true });

    for (const viewport of [
      { name: '360x800', width: 360, height: 800, expectedPosition: 'fixed' },
      { name: '1366x768', width: 1366, height: 768, expectedPosition: 'static' },
    ]) {
      const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
      await context.addInitScript((key) => window.localStorage.setItem(key, 'seen'), welcomeTourKey);
      const page = await context.newPage();
      await page.goto(baseUrl, { waitUntil: 'networkidle' });
      const nav = page.locator('nav.bottom-nav');
      await nav.waitFor({ state: 'visible' });

      const layout = await page.evaluate(() => {
        const nav = document.querySelector('nav.bottom-nav');
        const main = document.querySelector('main.mobile-page');
        if (!nav || !main) return null;
        const navRect = nav.getBoundingClientRect();
        const mainRect = main.getBoundingClientRect();
        return {
          position: getComputedStyle(nav).position,
          navTop: navRect.top,
          navBottom: navRect.bottom,
          mainBottom: mainRect.bottom,
          viewportHeight: window.innerHeight,
        };
      });

      assert(layout, `${viewport.name}: no se pudo medir la navegación.`);
      assert(
        layout.position === viewport.expectedPosition,
        `${viewport.name}: posición de navegación inesperada (${layout.position}, esperado ${viewport.expectedPosition}).`,
      );

      if (viewport.expectedPosition === 'fixed') {
        assert(
          layout.viewportHeight - layout.navBottom <= 20,
          `${viewport.name}: la barra móvil no está anclada al borde inferior.`,
        );
      } else {
        assert(
          layout.navTop >= layout.mainBottom - 1,
          `${viewport.name}: la navegación de escritorio invade el contenido principal.`,
        );
      }

      await context.close();
      console.log(`✓ ${viewport.name}: navegación ${viewport.expectedPosition} validada.`);
    }
  } finally {
    if (browser) await browser.close();
    await closePreview(previewServer);
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});