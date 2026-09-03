import { readFile, writeFile } from 'node:fs/promises';

const OUTPUT = new URL('../public/data/cooperatives.json', import.meta.url);
const USER_AGENT = 'MaginaOlivoCoopBot/1.0 (+https://github.com/izc05/magina-olivo)';
const CONCURRENCY = 4;

function decodeEntities(value = '') {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&apos;', "'")
    .replaceAll('&nbsp;', ' ')
    .replaceAll('&euro;', '€')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function plainText(html = '') {
  return decodeEntities(html)
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseAmount(label = '') {
  const match = label.match(/(\d{1,4}(?:[.,]\d{1,2})?)/);
  if (!match) return null;
  const value = Number(match[1].replace(',', '.'));
  return Number.isFinite(value) ? value : null;
}

function priceVariants(value) {
  const fixed = value.toFixed(2);
  const compact = Number.isInteger(value) ? String(value) : String(value);
  return new Set([
    fixed,
    fixed.replace('.', ','),
    compact,
    compact.replace('.', ','),
  ]);
}

function pageContainsPrice(html, value) {
  const text = plainText(html);
  return [...priceVariants(value)].some((variant) => (
    text.includes(`${variant} €`) ||
    text.includes(`${variant}€`) ||
    html.includes(`>${variant}<`) ||
    html.includes(`>${variant.replace('.', ',')}<`)
  ));
}

function structuredPrices(html) {
  const values = [];
  const patterns = [
    /["']price["']\s*:\s*["']?(\d{1,4}(?:[.,]\d{1,2})?)/gi,
    /["']lowPrice["']\s*:\s*["']?(\d{1,4}(?:[.,]\d{1,2})?)/gi,
    /itemprop=["']price["'][^>]*content=["'](\d{1,4}(?:[.,]\d{1,2})?)/gi,
    /property=["']product:price:amount["'][^>]*content=["'](\d{1,4}(?:[.,]\d{1,2})?)/gi,
  ];

  for (const pattern of patterns) {
    for (const match of html.matchAll(pattern)) {
      const value = Number(match[1].replace(',', '.'));
      if (Number.isFinite(value) && value > 0 && value < 1000) values.push(value);
    }
  }
  return [...new Set(values)];
}

function replaceAmount(label, value) {
  const original = label.match(/\d{1,4}(?:[.,]\d{1,2})?/)?.[0] ?? '';
  const decimals = original.includes(',') || original.includes('.') ? 2 : (Number.isInteger(value) ? 0 : 2);
  const formatted = value.toLocaleString('es-ES', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return label.replace(/\d{1,4}(?:[.,]\d{1,2})?/, formatted);
}

function isDirectProductUrl(url, productSourceUrl) {
  if (!url || url === productSourceUrl) return false;
  try {
    const { pathname } = new URL(url);
    return /\/(product|producto|productos|aceite-de-oliva|tienda)\//i.test(pathname) && pathname.split('/').filter(Boolean).length >= 2;
  } catch {
    return false;
  }
}

async function fetchHtml(url) {
  const response = await fetch(url, {
    headers: {
      'user-agent': USER_AGENT,
      accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5',
    },
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

async function main() {
  const payload = JSON.parse(await readFile(OUTPUT, 'utf8'));
  const cooperatives = Array.isArray(payload.cooperatives) ? payload.cooperatives : [];

  const targets = [];
  for (const cooperative of cooperatives) {
    for (const product of cooperative.products ?? []) {
      if (!product.storePriceLabel || !product.priceSourceUrl) continue;
      targets.push({ cooperative, product });
    }
  }

  const byUrl = new Map();
  for (const target of targets) {
    const list = byUrl.get(target.product.priceSourceUrl) ?? [];
    list.push(target);
    byUrl.set(target.product.priceSourceUrl, list);
  }

  const urls = [...byUrl.keys()];
  const errors = [];
  let healthySources = 0;
  let verifiedProducts = 0;
  let updatedProducts = 0;
  const today = new Date().toISOString().slice(0, 10);

  async function processUrl(url) {
    const urlTargets = byUrl.get(url) ?? [];
    let html;
    try {
      html = await fetchHtml(url);
      healthySources += 1;
    } catch (error) {
      errors.push(`${url}: ${error?.message ?? String(error)}`);
      return;
    }

    for (const { cooperative, product } of urlTargets) {
      const current = parseAmount(product.storePriceLabel);
      if (current == null) continue;

      if (pageContainsPrice(html, current)) {
        product.priceCapturedAt = today;
        verifiedProducts += 1;
        continue;
      }

      const direct = isDirectProductUrl(product.priceSourceUrl, cooperative.productSourceUrl);
      const candidates = direct ? structuredPrices(html) : [];
      const plausible = candidates
        .filter((candidate) => candidate >= current * 0.5 && candidate <= current * 2)
        .sort((a, b) => Math.abs(a - current) - Math.abs(b - current));

      if (plausible.length) {
        const next = plausible[0];
        product.storePriceLabel = replaceAmount(product.storePriceLabel, next);
        product.priceCapturedAt = today;
        verifiedProducts += 1;
        if (Math.abs(next - current) > 0.001) updatedProducts += 1;
      } else {
        errors.push(`${cooperative.brand}/${product.name}: no se pudo verificar el precio en ${url}`);
      }
    }
  }

  for (let index = 0; index < urls.length; index += CONCURRENCY) {
    const batch = urls.slice(index, index + CONCURRENCY);
    await Promise.all(batch.map(processUrl));
  }

  const generatedAt = new Date().toISOString();
  const nextPayload = {
    ...payload,
    generatedAt,
    shopSync: {
      generatedAt,
      sourceCount: urls.length,
      healthySourceCount: healthySources,
      verifiedProducts,
      updatedProducts,
      collectorErrors: errors,
    },
    cooperatives,
  };

  await writeFile(OUTPUT, `${JSON.stringify(nextPayload, null, 2)}\n`);
  console.log(`Cooperativas sincronizadas: ${verifiedProducts}/${targets.length} precios verificados · ${healthySources}/${urls.length} páginas operativas · ${updatedProducts} precios actualizados.`);
  if (errors.length) console.warn(`Incidencias de sincronización: ${errors.slice(0, 12).join(' | ')}${errors.length > 12 ? ` | +${errors.length - 12} más` : ''}`);
}

await main();
