import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function read(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, import.meta.url), 'utf8');
}

test('all public Mágina pages share the base-aware Visual V2 header', async () => {
  const [navigation, hub, weather, directory, field, news, market] = await Promise.all([
    read('./publicNavigation.tsx'),
    read('./MaginaHubPage.tsx'),
    read('./MaginaWeatherPage.tsx'),
    read('./MaginaDirectoryPage.tsx'),
    read('./MaginaFieldAlertsPage.tsx'),
    read('./MaginaNewsPage.tsx'),
    read('./MaginaMarketPage.tsx'),
  ]);

  assert.match(navigation, /import\.meta\.env\.BASE_URL/);
  assert.match(navigation, /brandLogoSrc/);
  assert.match(navigation, /PublicHeader/);

  for (const source of [hub, weather, directory, field, news, market]) {
    assert.match(source, /PublicHeader/);
    assert.doesNotMatch(source, /src="\/brand\/magina-olivo-mark\.svg"/);
  }
});

test('nested public pages keep an explicit path back to Mágina when appropriate', async () => {
  const [field, news, market] = await Promise.all([
    read('./MaginaFieldAlertsPage.tsx'),
    read('./MaginaNewsPage.tsx'),
    read('./MaginaMarketPage.tsx'),
  ]);

  for (const source of [field, news, market]) {
    assert.match(source, /backHref="\/magina"/);
  }
});
